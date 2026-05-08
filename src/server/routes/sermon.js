const express = require('express');
const router = express.Router();
const { getOrGenerateSermon, regenerateSermon } = require('../services/SermonService');

/**
 * GET /api/sermon?ref=John+3:16&text=For+God+so+loved...&category=Love
 *
 * Returns cached sermon or generates a new one.
 * The verse text and category are passed from the client (which already has them).
 */
router.get('/', async (req, res) => {
  try {
    const { ref, text, category, lang } = req.query;

    if (!ref || !text) {
      return res.status(400).json({ error: 'Missing ref or text parameter' });
    }

    const sermon = await getOrGenerateSermon(ref, text, category || 'General', lang || 'en');

    if (sermon.generationStatus === 'completed') {
      return res.json({
        verseReference: ref,
        lang: sermon.lang,
        status: 'ready',
        pages: sermon.pages,
        prayer: sermon.prayer,
        model: sermon.model,
        createdAt: sermon.createdAt
      });
    }

    if (sermon.generationStatus === 'pending') {
      return res.status(202).json({
        verseReference: ref,
        lang: sermon.lang,
        status: 'pending'
      });
    }

    // Generation failed
    res.status(502).json({
      verseReference: ref,
      status: 'failed',
      error: sermon.generationError || 'Generation failed'
    });
  } catch (err) {
    console.error('Error in /api/sermon:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/sermon/regenerate
 * Body: { ref, text, category }
 *
 * Force regenerate a sermon (ignores cache).
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { ref, text, category, lang } = req.body;

    if (!ref || !text) {
      return res.status(400).json({ error: 'Missing ref or text' });
    }

    const sermon = await regenerateSermon(ref, text, category || 'General', lang || 'en');

    if (sermon.generationStatus === 'completed') {
      return res.json({
        verseReference: ref,
        lang: sermon.lang,
        status: 'ready',
        pages: sermon.pages,
        prayer: sermon.prayer,
        model: sermon.model,
        createdAt: sermon.createdAt
      });
    }

    if (sermon.generationStatus === 'pending') {
      return res.status(202).json({
        verseReference: ref,
        lang: sermon.lang,
        status: 'pending'
      });
    }

    res.status(502).json({
      verseReference: ref,
      status: 'failed',
      error: sermon.generationError || 'Generation failed'
    });
  } catch (err) {
    console.error('Error in /api/sermon/regenerate:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
