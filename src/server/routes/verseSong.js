const express = require('express');
const router = express.Router();
const VerseSong = require('../models/VerseSong');
const CategoryStyle = require('../models/CategoryStyle');
const { generateVerseSong } = require('../services/SunoService');
const { normalizeReference } = require('../utils/ReferenceNormalizer');

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
  const parts = verseReference.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
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
