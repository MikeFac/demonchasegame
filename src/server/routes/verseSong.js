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

    // Try to find existing verse song (first try normalized, then original format for backward compatibility)
    let verseSong = await VerseSong.findOne({ verseReference: normalizedRef });
    if (!verseSong) {
      verseSong = await VerseSong.findOne({ verseReference: ref });
    }

    if (verseSong && verseSong.status === 'active' && verseSong.audioUrl) {
      // Found a completed song—return it
      return res.json({
        verseReference: ref,
        audioUrl: verseSong.audioUrl,
        status: 'ready',
        playCount: verseSong.playCount,
        learnCount: verseSong.learnCount
      });
    }

    if (verseSong && verseSong.generationStatus === 'processing') {
      // Still generating—tell client to use fallback music
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Song is being generated. Using fallback music.'
      });
    }

    if (verseSong && verseSong.generationStatus === 'failed') {
      // Previous generation failed—queue retry
      verseSong.generationStatus = 'pending';
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Retrying generation. Using fallback music.'
      });
    }

    // No record exists—create one and queue generation
    if (!verseSong) {
      verseSong = await createAndQueueVerseSong(ref);
    }

    res.json({
      verseReference: ref,
      status: 'pending_generation',
      message: 'Song queued for generation. Using fallback music.',
      generationStatus: verseSong.generationStatus
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
 */
router.post('/record-play', async (req, res) => {
  try {
    const { verseReference, playDurationMs, wasLearned } = req.body;

    if (!verseReference) {
      return res.status(400).json({ error: 'Missing verseReference' });
    }

    // Normalize reference for lookup
    const normalizedRef = normalizeReference(verseReference);
    let verseSong = await VerseSong.findOne({ verseReference: normalizedRef });
    if (!verseSong) {
      verseSong = await VerseSong.findOne({ verseReference });
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

    verseSong.lastPlayedAt = new Date();
    await verseSong.save();

    res.json({
      verseReference,
      playCount: verseSong.playCount,
      learnCount: verseSong.learnCount,
      averageRetention: verseSong.averageRetention
    });
  } catch (err) {
    console.error('Error recording play:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
