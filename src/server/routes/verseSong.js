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
const localizedVerseBundleCache = {};
const STALE_PROCESSING_MS = 30 * 60 * 1000;

function getLocalizedVerseBundle(lang) {
  const code = String(lang || 'en').toLowerCase();
  if (localizedVerseBundleCache[code]) {
    return localizedVerseBundleCache[code];
  }

  let verses = [];
  try {
    if (code === 'es') {
      verses = require('../../../bible-verses-es').loadSelectedVersesES();
    } else if (code === 'lg') {
      verses = require('../../../bible-verses-lg').loadSelectedVersesLG();
    } else if (code === 'hi') {
      verses = require('../../../bible-verses-hi').loadSelectedVersesHI();
    } else if (code === 'hi-rom') {
      verses = require('../../../bible-verses-hi-rom').loadSelectedVersesHIRom();
    } else if (code === 'zw') {
      verses = require('../../../bible-verses-zw').loadSelectedVersesZW();
    } else if (code === 'kr') {
      verses = require('../../../bible-verses-kr').loadSelectedVersesKR();
    } else if (code === 'ja') {
      verses = require('../../../bible-verses-deepseek-v4-pro.ja-kana').loadSelectedVersesJA();
    } else if (code === 'id') {
      verses = require('../../../bible-verses-id').loadSelectedVersesID();
    } else {
      verses = require('../../../bible-verses').loadSelectedVerses();
    }
  } catch (err) {
    console.warn(`Could not load verse bundle for ${code}:`, err.message);
    verses = [];
  }

  localizedVerseBundleCache[code] = Array.isArray(verses) ? verses : [];
  return localizedVerseBundleCache[code];
}

function resolveReferenceCandidates(reference, lang) {
  const rawRef = String(reference || '').trim();
  const candidates = new Set();
  if (!rawRef) {
    return { rawRef: '', candidates: [], verseObj: null, canonicalRef: '' };
  }

  const normalizedRawRef = normalizeReference(rawRef);
  const hyphenatedRawRef = normalizeReferenceWithHyphens(rawRef);
  candidates.add(rawRef);
  candidates.add(normalizedRawRef);
  candidates.add(hyphenatedRawRef);

  const verses = getLocalizedVerseBundle(lang);
  const verseObj = verses.find((verse) =>
    verse && (
      verse.Reference === rawRef ||
      verse.EnglishRef === rawRef
    )
  ) || null;

  const canonicalRef = verseObj && verseObj.EnglishRef
    ? String(verseObj.EnglishRef).trim()
    : rawRef;

  if (canonicalRef) {
    candidates.add(canonicalRef);
    candidates.add(normalizeReference(canonicalRef));
    candidates.add(normalizeReferenceWithHyphens(canonicalRef));
  }

  return {
    rawRef,
    candidates: [...candidates].filter(Boolean),
    verseObj,
    canonicalRef
  };
}

function normalizeReferenceWithHyphens(reference) {
  if (!reference) return '';

  return String(reference)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/:/g, '-')
    .replace(/[^\w-]/g, '');
}

function buildReferenceQuery(reference, lang) {
  const resolved = resolveReferenceCandidates(reference, lang);
  const orClauses = resolved.candidates.map((candidate) => ({ verseReference: candidate }));

  return {
    resolved,
    query: {
      $or: orClauses
    }
  };
}

function buildLanguageQuery(lang) {
  const code = String(lang || 'en').toLowerCase();
  if (code === 'en') {
    return {
      $or: [
        { language: 'en' },
        { language: null },
        { language: { $exists: false } }
      ]
    };
  }

  return { language: code };
}

function combineFilters(...filters) {
  const clauses = filters.filter(Boolean);
  if (clauses.length === 0) {
    return {};
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return { $and: clauses };
}

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
    const lang = req.query.lang || 'en';

    if (req.auth?.userId) {
      const user = await User.findOne({ clerkId: req.auth.userId }).select('email').lean();
      const authorizedEmail = await getAuthorizedEmail(req, user);
      isSongAdmin = authorizedEmail === SONG_ADMIN_EMAIL;
    }

    const songs = await VerseSong.find(combineFilters(
      buildLanguageQuery(lang),
      {
        status: 'active',
        isActiveVersion: true,
        generationStatus: 'completed',
        audioUrl: { $exists: true, $ne: null }
      }
    ))
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
    const lang = req.query.lang || 'en';
    const allowGeneration = req.query.generate !== 'false';

    if (!ref) {
      return res.status(400).json({ error: 'Missing ref parameter' });
    }

    const referenceQuery = buildReferenceQuery(ref, lang);

    const verseSongs = await VerseSong.find(combineFilters(
      buildLanguageQuery(lang),
      referenceQuery.query,
      {
        status: 'active',
        isActiveVersion: true,
        audioUrl: { $exists: true }
      }
    )).sort({ qualityScore: -1, playCount: 1 });

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

    // Players can opt out of automatic generation. Existing completed songs
    // were handled above; this prevents all creation/retry writes for misses.
    if (!allowGeneration) {
      return res.json({
        verseReference: ref,
        status: 'unavailable',
        message: 'No generated song is available for this verse.'
      });
    }

    // No completed songs found—check if any are processing
    const processingSong = await VerseSong.findOne(combineFilters(
      buildLanguageQuery(lang),
      referenceQuery.query,
      { generationStatus: 'processing' }
    ));

    if (processingSong) {
      const processingAge = Date.now() - new Date(processingSong.updatedAt || processingSong.createdAt || 0).getTime();
      if (Number.isFinite(processingAge) && processingAge > STALE_PROCESSING_MS) {
        processingSong.generationStatus = 'pending';
        processingSong.generationAttempts = (processingSong.generationAttempts || 0) + 1;
        await processingSong.save();
        setImmediate(() => {
          generateVerseSong(processingSong._id).catch(err => {
            console.error(`Error retrying stale song generation for ${ref}:`, err);
          });
        });
        return res.json({
          verseReference: ref,
          status: 'pending_generation',
          message: 'A stale song generation was requeued. Using fallback music.',
          version: processingSong.version || 1
        });
      }
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Song is being generated. Using fallback music.',
        version: processingSong.version || 1
      });
    }

    // Check for failed generations
    const failedSong = await VerseSong.findOne(combineFilters(
      buildLanguageQuery(lang),
      referenceQuery.query,
      { generationStatus: 'failed' }
    ));

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
    const verseSong = await createAndQueueVerseSong(ref, lang);

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
async function createAndQueueVerseSong(verseReference, lang = 'en') {
  const resolved = resolveReferenceCandidates(verseReference, lang);
  const canonicalReference = resolved.canonicalRef || verseReference;
  const parts = canonicalReference.match(/^([1-3]?\s*[A-Za-z][A-Za-z\s]*)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) {
    throw new Error(`Invalid verse reference format: ${verseReference}`);
  }

  const book = parts[1].trim();
  const chapter = parseInt(parts[2], 10);
  const startVerse = parseInt(parts[3], 10);
  const endVerse = parts[4] ? parseInt(parts[4], 10) : undefined;

  const normalizedRef = normalizeReference(canonicalReference);

  const existing = await VerseSong.findOne(combineFilters(
    buildLanguageQuery(lang),
    buildReferenceQuery(verseReference, lang).query
  ));
  if (existing) return existing;

  let verseText = `[Verse: ${canonicalReference}]`;
  let category = 'General';
  const verseObj = resolved.verseObj;

  if (verseObj) {
    verseText = verseObj.Text;
    category = verseObj.Category;
  } else {
    try {
      const bibleVersesModule = require('../../../bible-verses');
      const globalVerses = bibleVersesModule.loadSelectedVerses();
      const globalVerseObj = globalVerses.find(v => v.Reference === canonicalReference || v.EnglishRef === canonicalReference);
      if (globalVerseObj) {
        verseText = globalVerseObj.Text;
        category = globalVerseObj.Category;
      }
    } catch (e) {
      console.warn('Could not load bible-verses for song creation:', e.message);
    }
  }

  const categoryStyle = await CategoryStyle.findOne({ category });
  const style = categoryStyle?.generationStyle || 'pop';

  const language = String(lang || 'en').toLowerCase();
  const verseSong = new VerseSong({
    verseReference: normalizedRef,
    version: 1,
    verseReferenceFull: verseObj ? (verseObj.Reference || canonicalReference) : canonicalReference,
    book,
    chapter,
    startVerse,
    endVerse,
    category,
    verseText,
    generationStyle: style,
    generationStatus: 'pending',
    generationAttempts: 0,
    language
  });

  try {
    await verseSong.save();
  } catch (err) {
    // Two clients can reach this point together after both miss the initial
    // lookup. The compound unique index is the authoritative race guard.
    if (err && err.code === 11000) {
      const duplicate = await VerseSong.findOne({
        verseReference: normalizedRef,
        version: 1,
        language
      });
      if (duplicate) return duplicate;
    }
    throw err;
  }

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
    const { verseReference, playDurationMs, wasLearned, version, lang } = req.body;
    const songLang = lang || 'en';

    if (!verseReference) {
      return res.status(400).json({ error: 'Missing verseReference' });
    }

    const referenceQuery = buildReferenceQuery(verseReference, songLang);
    let query = combineFilters(
      buildLanguageQuery(songLang),
      referenceQuery.query,
      {
        status: 'active',
        isActiveVersion: true
      }
    );

    
    if (version) {
      // Find specific version
      query = combineFilters(query, { version });
    }

    let verseSong = await VerseSong.findOne(query);

    if (!verseSong) {
      // Try to find any version if specific one not found
      verseSong = await VerseSong.findOne(combineFilters(
        buildLanguageQuery(songLang),
        referenceQuery.query,
        {
          status: 'active',
          isActiveVersion: true
        }
      ));
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

    // Do not save the hydrated document here. Legacy English records can omit
    // `language`; Mongoose would apply the schema default (`en`) on save and
    // collide with a separately stored explicit English version of the same
    // verse. Analytics updates must never rewrite the compound identity.
    const lastPlayedAt = new Date();
    await VerseSong.updateOne(
      { _id: verseSong._id },
      {
        $set: {
          playCount: verseSong.playCount,
          learnCount: verseSong.learnCount,
          averageRetention: verseSong.averageRetention,
          qualityScore: verseSong.qualityScore,
          lastPlayedAt
        }
      }
    );
    verseSong.lastPlayedAt = lastPlayedAt;

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
