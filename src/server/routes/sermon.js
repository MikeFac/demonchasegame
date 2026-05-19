const express = require('express');
const router = express.Router();
const { getOrGenerateSermon, regenerateSermon } = require('../services/SermonService');
const { getOrGenerateStudyPlan, regenerateStudyPlan } = require('../services/StudyPlanService');

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

async function handleStudyPlanRequest(req, res, isRegenerate) {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const { ref, text, category, lang } = payload;

    if (!ref || !text) {
      return res.status(400).json({ error: 'Missing ref or text parameter' });
    }

    const studyPlan = isRegenerate
      ? await regenerateStudyPlan(ref, text, category || 'General', lang || 'en')
      : await getOrGenerateStudyPlan(ref, text, category || 'General', lang || 'en');

    if (studyPlan.generationStatus === 'completed') {
      return res.json({
        verseReference: ref,
        lang: studyPlan.lang || lang || 'en',
        status: 'ready',
        title: studyPlan.title,
        summary: studyPlan.summary,
        questions: studyPlan.questions,
        application: studyPlan.application,
        prayer: studyPlan.prayer,
        model: studyPlan.model,
        createdAt: studyPlan.createdAt
      });
    }

    if (studyPlan.generationStatus === 'pending') {
      return res.status(202).json({
        verseReference: ref,
        lang: studyPlan.lang || lang || 'en',
        status: 'pending'
      });
    }

    return res.status(502).json({
      verseReference: ref,
      status: 'failed',
      error: studyPlan.generationError || 'Generation failed'
    });
  } catch (err) {
    console.error('Error in /api/sermon/study-plan:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.all('/study-plan', async (req, res) => {
  return handleStudyPlanRequest(req, res, false);
});

router.post('/study-plan/regenerate', async (req, res) => {
  return handleStudyPlanRequest(req, res, true);
});

module.exports = router;
