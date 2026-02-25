const Sermon = require('../models/Sermon');

// Configurable — set SERMON_MODEL in .env to override
const DEFAULT_MODEL = 'openrouter/auto';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Generate a short devotional sermon for a Bible verse via OpenRouter.
 * Returns { pages: string[], prayer: string }.
 */
async function generateSermonText(verseReference, verseText, category) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  const model = process.env.SERMON_MODEL || DEFAULT_MODEL;

  const systemPrompt = `You are a warm, practical Bible teacher. You write short devotional messages that help everyday people apply Scripture to their lives. Your tone is encouraging, direct, and conversational — not academic or preachy. Keep language simple.`;

  const userPrompt = `Write a short practical devotional message based on this Bible verse:

"${verseText}" — ${verseReference} (Category: ${category})

Requirements:
- 3 to 5 short paragraphs (each paragraph should be 2-4 sentences)
- Focus on practical, real-life application — how someone can live this verse out today
- End with a short concluding prayer (2-3 sentences, addressed to God)
- Do NOT include the verse text itself in the message (the reader already sees it)
- Do NOT include a title or heading

Return your response as JSON with this exact format:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", ...],
  "prayer": "Dear Lord, ... Amen."
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://dcgame.4you.tel',
      'X-Title': 'VerseBattles Devotional'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error)}`);
  }

  const content = data.choices[0].message.content.trim();

  // Parse JSON — strip markdown fences if present
  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed.paragraphs) || !parsed.prayer) {
    throw new Error('Invalid sermon format from AI: missing paragraphs or prayer');
  }

  return {
    pages: parsed.paragraphs,
    prayer: parsed.prayer,
    model
  };
}

/**
 * Get or generate a sermon for a verse reference.
 * Returns a Sermon document (from DB cache or freshly generated).
 */
async function getOrGenerateSermon(verseReference, verseText, category) {
  // Check for existing completed sermon
  const existing = await Sermon.findOne({
    verseReference,
    generationStatus: 'completed'
  }).sort({ createdAt: -1 });

  if (existing) {
    return existing;
  }

  // Generate new sermon
  const sermon = new Sermon({
    verseReference,
    verseText,
    category,
    generationStatus: 'pending'
  });

  try {
    const result = await generateSermonText(verseReference, verseText, category);
    sermon.pages = result.pages;
    sermon.prayer = result.prayer;
    sermon.model = result.model;
    sermon.generationStatus = 'completed';
  } catch (err) {
    sermon.generationStatus = 'failed';
    sermon.generationError = err.message;
    console.error(`Sermon generation failed for ${verseReference}:`, err.message);
  }

  await sermon.save();
  return sermon;
}

module.exports = { getOrGenerateSermon, generateSermonText };
