const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createClerkClient } = require('@clerk/backend');
const VerseSong = require('../models/VerseSong');
const CategoryStyle = require('../models/CategoryStyle');
const User = require('../models/User');
const { generateVerseSong } = require('../services/SunoService');
const { normalizeReference } = require('../utils/ReferenceNormalizer');
const { requireAuth, optionalAuth } = require('../middleware/clerkAuth');

const SONG_ADMIN_EMAIL = 'michaelfackerell@gmail.com';
const APP_ROOT = path.resolve(__dirname, '../../..');
const ARCHIVE_ROOT = path.join(APP_ROOT, 'archived', 'deleted-songs');
const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

function sortVerseDisplay(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function resolveSongAudioPath(song) {
  if (song.audioPath && fs.existsSync(song.audioPath)) {
    return song.audioPath;
  }

  if (!song.audioUrl) {
    return null;
  }

  if (song.audioUrl.startsWith('/audio/')) {
    const filePath = path.join(APP_ROOT, 'public', song.audioUrl.replace(/^\//, ''));
    return fs.existsSync(filePath) ? filePath : null;
  }

  if (song.audioUrl.startsWith('/public/audio/')) {
    const filePath = path.join(APP_ROOT, song.audioUrl.replace(/^\//, ''));
    return fs.existsSync(filePath) ? filePath : null;
  }

  return null;
}

function buildArchivePaths(song) {
  const now = new Date();
  const dateDir = now.toISOString().slice(0, 10);
  const archiveDir = path.join(ARCHIVE_ROOT, dateDir);
  fs.mkdirSync(archiveDir, { recursive: true });

  const basename = song.audioUrl ? path.basename(song.audioUrl) : `${song.verseReference}-v${song.version || 1}.mp3`;
  const archiveAudioPath = path.join(archiveDir, `${Date.now()}-${basename}`);
  const manifestPath = path.join(archiveDir, `${String(song._id)}.json`);
  const logPath = path.join(ARCHIVE_ROOT, 'deletion-log.jsonl');

  return {
    archiveDir,
    archiveAudioPath,
    manifestPath,
    logPath
  };
}

async function getAuthorizedEmail(req, user) {
  const dbEmail = user?.email ? String(user.email).toLowerCase() : null;
  if (dbEmail) {
    return dbEmail;
  }

  const sessionEmail = req.auth?.session?.email ? String(req.auth.session.email).toLowerCase() : null;
  if (sessionEmail) {
    return sessionEmail;
  }

  if (clerkClient && req.auth?.userId) {
    try {
      const clerkUser = await clerkClient.users.getUser(req.auth.userId);
      const primaryEmailId = clerkUser?.primaryEmailAddressId || null;
      const primary = Array.isArray(clerkUser?.emailAddresses)
        ? clerkUser.emailAddresses.find((entry) => entry.id === primaryEmailId) || clerkUser.emailAddresses[0]
        : null;
      if (primary?.emailAddress) {
        return String(primary.emailAddress).toLowerCase();
      }
    } catch (err) {
      console.warn('Could not resolve Clerk user email for song admin check:', err.message);
    }
  }

  return null;
}

router.get('/library', optionalAuth, async (req, res) => {
  try {
    let isSongAdmin = false;

    if (req.auth?.userId) {
      const user = await User.findOne({ clerkId: req.auth.userId }).select('email').lean();
      const authorizedEmail = await getAuthorizedEmail(req, user);
      isSongAdmin = authorizedEmail === SONG_ADMIN_EMAIL;
    }

    const songs = await VerseSong.find({
      status: 'active',
      isActiveVersion: true,
      generationStatus: 'completed',
      audioUrl: { $exists: true, $ne: null }
    })
      .select('category verseReference verseReferenceFull version audioUrl duration generationStyle createdAt')
      .sort({ category: 1, verseReferenceFull: 1, verseReference: 1, version: 1 })
      .lean();

    const categoryMap = new Map();

    for (const song of songs) {
      const category = song.category || 'General';
      const verseDisplay = song.verseReferenceFull || song.verseReference;
      const verseKey = normalizeReference(verseDisplay || song.verseReference);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const verseMap = categoryMap.get(category);
      if (!verseMap.has(verseKey)) {
        verseMap.set(verseKey, {
          verseReference: song.verseReference,
          verseReferenceFull: song.verseReferenceFull || null,
          displayReference: verseDisplay,
          songs: []
        });
      }

      verseMap.get(verseKey).songs.push({
        id: String(song._id),
        version: song.version || 1,
        audioUrl: song.audioUrl,
        duration: song.duration || null,
        generationStyle: song.generationStyle || null,
        createdAt: song.createdAt || null
      });
    }

    const categories = [...categoryMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([category, verseMap]) => ({
        category,
        verses: [...verseMap.values()]
          .sort((a, b) => sortVerseDisplay(a.displayReference, b.displayReference))
          .map(verse => ({
            ...verse,
            songs: verse.songs.sort((a, b) => a.version - b.version)
          }))
      }));

    res.json({
      isSongAdmin,
      totalCategories: categories.length,
      totalSongs: songs.length,
      categories
    });
  } catch (err) {
    console.error('❌ Error in /api/verse-song/library:', err.message);
    res.status(500).json({ error: 'Failed to load song library' });
  }
});

router.post('/:id/archive-delete', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.auth.userId }).select('email username').lean();
    const userEmail = await getAuthorizedEmail(req, user);

    if (userEmail !== SONG_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Not authorized to archive/delete songs' });
    }

    const song = await VerseSong.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const sourceAudioPath = resolveSongAudioPath(song);
    if (!sourceAudioPath) {
      return res.status(400).json({ error: 'Song audio file could not be found for archiving' });
    }

    const archivePaths = buildArchivePaths(song);
    const archivedAt = new Date().toISOString();

    fs.copyFileSync(sourceAudioPath, archivePaths.archiveAudioPath);

    const manifest = {
      archivedAt,
      deletedBy: {
        email: user.email || null,
        username: user.username || null,
        clerkId: req.auth.userId
      },
      sourceAudioPath,
      archivedAudioPath: archivePaths.archiveAudioPath,
      song: song.toObject()
    };

    fs.writeFileSync(archivePaths.manifestPath, JSON.stringify(manifest, null, 2));
    fs.appendFileSync(archivePaths.logPath, `${JSON.stringify({
      archivedAt,
      songId: String(song._id),
      verseReference: song.verseReference,
      verseReferenceFull: song.verseReferenceFull || null,
      version: song.version || 1,
      sourceAudioPath,
      archivedAudioPath: archivePaths.archiveAudioPath,
      deletedByEmail: user.email || null
    })}\n`);

    await VerseSong.deleteOne({ _id: song._id });
    fs.unlinkSync(sourceAudioPath);

    return res.json({
      success: true,
      deletedSongId: String(song._id),
      archivedAudioPath: archivePaths.archiveAudioPath,
      manifestPath: archivePaths.manifestPath
    });
  } catch (err) {
    console.error('❌ Error in archive-delete:', err.message);
    return res.status(500).json({ error: 'Failed to archive/delete song' });
  }
});

/**
 * GET /api/verse-song?ref=John+3:16
 *
 * Returns song for a verse, or triggers generation if missing.
 * Supports multiple versions per verse with random selection for variety.
 * Does NOT block on generation—returns immediately with status.
 */
router.get('/', async (req, res) => {
  try {
    const { ref } = req.query;

    if (!ref) {
      return res.status(400).json({ error: 'Missing ref parameter' });
    }

    // Normalize reference for database lookup (e.g., "Psalms 118:6" → "psalms118-6")
    const normalizedRef = normalizeReference(ref);

    // Find ALL active versions for this verse
    const verseSongs = await VerseSong.find({
      $or: [
        { verseReference: normalizedRef },
        { verseReference: ref }
      ],
      status: 'active',
      isActiveVersion: true,
      audioUrl: { $exists: true }
    }).sort({ qualityScore: -1, playCount: 1 }); // Best quality, rotate through less-played

    if (verseSongs.length > 0) {
      // Random selection for variety (can change to weighted by qualityScore later)
      const selectedIndex = Math.floor(Math.random() * verseSongs.length);
      const selectedSong = verseSongs[selectedIndex];

      return res.json({
        verseReference: ref,
        audioUrl: selectedSong.audioUrl,
        status: 'ready',
        version: selectedSong.version || 1,
        totalVersions: verseSongs.length,
        playCount: selectedSong.playCount,
        learnCount: selectedSong.learnCount,
        qualityScore: selectedSong.qualityScore
      });
    }

    // No completed songs found—check if any are processing
    const processingSong = await VerseSong.findOne({
      $or: [
        { verseReference: normalizedRef },
        { verseReference: ref }
      ],
      generationStatus: 'processing'
    });

    if (processingSong) {
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Song is being generated. Using fallback music.',
        version: processingSong.version || 1
      });
    }

    // Check for failed generations
    const failedSong = await VerseSong.findOne({
      $or: [
        { verseReference: normalizedRef },
        { verseReference: ref }
      ],
      generationStatus: 'failed'
    });

    if (failedSong) {
      // Queue retry
      failedSong.generationStatus = 'pending';
      failedSong.generationAttempts = (failedSong.generationAttempts || 0) + 1;
      await failedSong.save();

      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Retrying generation. Using fallback music.',
        version: failedSong.version || 1
      });
    }

    // No record exists—create one and queue generation
    const verseSong = await createAndQueueVerseSong(ref);

    res.json({
      verseReference: ref,
      status: 'pending_generation',
      message: 'Song queued for generation. Using fallback music.',
      generationStatus: verseSong.generationStatus,
      version: verseSong.version || 1
    });
  } catch (err) {
    console.error('❌ Error in /api/verse-song for', req.query.ref, ':', err.message);
    // Return graceful response that triggers song generation retry
    res.json({
      verseReference: req.query.ref,
      status: 'pending_generation',
      message: 'Song queued for generation (error retry). Using fallback music.'
    });
  }
});

/**
 * Helper: Create VerseSong record and queue generation
 */
async function createAndQueueVerseSong(verseReference) {
  // Parse reference (e.g., "John 3:16" → book: "John", chapter: 3, startVerse: 16)
  const parts = verseReference.match(/^([1-3]?\s*[A-Za-z][A-Za-z\s]*)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) {
    throw new Error(`Invalid verse reference format: ${verseReference}`);
  }

  const book = parts[1].trim();
  const chapter = parseInt(parts[2], 10);
  const startVerse = parseInt(parts[3], 10);
  const endVerse = parts[4] ? parseInt(parts[4], 10) : undefined;

  // Get verse text from bible-verses.js (loaded in server)
  const bibleVersesModule = require('../../bible-verses');
  const globalVerses = bibleVersesModule.loadSelectedVerses();
  const verseObj = globalVerses.find(v => v.Reference === verseReference);
  const verseText = verseObj?.Text || `[Verse: ${verseReference}]`;
  const category = verseObj?.Category || 'General';

  // Get generation style for this category
  const categoryStyle = await CategoryStyle.findOne({ category });
  const style = categoryStyle?.generationStyle || 'pop';

  // Create verse song record with normalized reference
  const normalizedVerseRef = normalizeReference(verseReference);
  const verseSong = new VerseSong({
    verseReference: normalizedVerseRef,
    verseReferenceFull: verseReference, // Keep full format for reference
    book,
    chapter,
    startVerse,
    endVerse,
    category,
    verseText,
    generationStyle: style,
    generationStatus: 'pending',
    generationAttempts: 0
  });

  await verseSong.save();

  // Queue generation (asynchronous, non-blocking)
  setImmediate(() => {
    generateVerseSong(verseSong._id).catch(err => {
      console.error(`Error generating song for ${verseReference}:`, err);
    });
  });

  return verseSong;
}

/**
 * POST /api/verse-song/record-play
 *
 * Track when a verse song is played and whether player learned the verse.
 * Supports multiple versions - must {version} parameter in request.
 */
router.post('/record-play', async (req, res) => {
  try {
    const { verseReference, playDurationMs, wasLearned, version } = req.body;

    if (!verseReference) {
      return res.status(400).json({ error: 'Missing verseReference' });
    }

    // Find specific version if provided, otherwise find any active version
    const normalizedRef = normalizeReference(verseReference);
    let query = {
      $or: [
        { verseReference: normalizedRef },
        { verseReference: verseReference }
      ],
      status: 'active',
      isActiveVersion: true
    };

    
    if (version) {
      // Find specific version
      query.version = version;
    }

    let verseSong = await VerseSong.findOne(query);

    if (!verseSong) {
      // Try to find any version if specific one not found
      verseSong = await VerseSong.findOne({
        $or: [
          { verseReference: normalizedRef },
          { verseReference: verseReference }
        ],
        status: 'active',
        isActiveVersion: true
      });
    }

    if (!verseSong) {
      return res.status(404).json({ error: 'Verse song not found' });
    }

    // Increment counters
    verseSong.playCount = (verseSong.playCount || 0) + 1;
    if (wasLearned) {
      verseSong.learnCount = (verseSong.learnCount || 0) + 1;
    }

    // Update retention estimate (rolling average)
    const totalPlays = verseSong.playCount;
    const prevRetention = verseSong.averageRetention || 0;
    verseSong.averageRetention =
      (prevRetention * (totalPlays - 1) + (wasLearned ? 1 : 0)) / totalPlays;

    // Calculate quality score (0-100)
    verseSong.qualityScore = Math.round(verseSong.averageRetention * 100);

    verseSong.lastPlayedAt = new Date();
    await verseSong.save();

    res.json({
      verseReference,
      version: verseSong.version || 1,
      playCount: verseSong.playCount,
      learnCount: verseSong.learnCount,
      averageRetention: verseSong.averageRetention,
      qualityScore: verseSong.qualityScore
    });
  } catch (err) {
    console.error('Error recording play:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
