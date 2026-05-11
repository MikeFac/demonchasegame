const DEFAULT_MODEL = 'openrouter/auto';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ENGLISH_PROMPT_VERSION = 'english-v1';
const TRANSLATION_PROMPT_VERSION = 'translation-v1';
const ROMANIZATION_PROMPT_VERSION = 'romanization-v1';

function getLanguageName(lang) {
  switch ((lang || 'en').toLowerCase()) {
    case 'hi':
      return 'Hindi written in Devanagari script';
    case 'hi-rom':
      return 'Romanized Hindi written in Latin script';
    case 'lg':
      return 'Luganda';
    case 'es':
      return 'Spanish';
    case 'kr':
      return 'Korean';
    case 'id':
      return 'Bahasa Indonesia';
    default:
      return 'English';
  }
}

async function runDevotionalPrompt(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  const model = process.env.SERMON_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
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
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error)}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenRouter returned an empty devotional response');
  }

  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed.paragraphs) || !parsed.prayer) {
    throw new Error('Invalid devotional format from AI: missing paragraphs or prayer');
  }

  return {
    pages: parsed.paragraphs,
    prayer: parsed.prayer,
    model
  };
}

async function generateEnglishDevotional(verseReference, verseText, category) {
  const systemPrompt = 'You are a warm, practical Bible teacher. You write short devotional messages that help everyday people apply Scripture to their lives. Your tone is encouraging, direct, and conversational, not academic or preachy. Keep language simple.';
  const userPrompt = `Write a short practical devotional message based on this Bible verse:

"${verseText}" — ${verseReference} (Category: ${category})

Requirements:
- Write in natural, clear English.
- 3 to 5 short paragraphs (each paragraph should be 2-4 sentences).
- Focus on practical, real-life application: how someone can live this verse out today.
- End with a short concluding prayer (2-3 sentences, addressed to God).
- Do NOT include the verse text itself in the message.
- Do NOT include a title or heading.

Return your response as JSON with this exact format:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text"],
  "prayer": "Dear Lord, ... Amen."
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const result = await runDevotionalPrompt(systemPrompt, userPrompt);
  return {
    ...result,
    promptVersion: ENGLISH_PROMPT_VERSION
  };
}

async function translateDevotionalToLanguage(sourceDoc, verseText, lang) {
  const targetLanguage = getLanguageName(lang);
  const systemPrompt = 'You are a careful devotional translator. Preserve meaning, tone, and practical application faithfully while writing naturally in the target language.';
  const userPrompt = `Translate this English devotional into ${targetLanguage}.

Verse reference: ${sourceDoc.verseReference}
Verse text in the target language:
"${verseText}"

Requirements:
- Preserve the original meaning, tone, and pastoral warmth.
- Preserve the number of paragraphs.
- Preserve the prayer as a short prayer addressed to God.
- Do NOT add a title or heading.
- Do NOT repeat the verse text inside the devotional.
- Write naturally for readers of ${targetLanguage}.

English devotional paragraphs:
${sourceDoc.pages.map((page, index) => `${index + 1}. ${page}`).join('\n')}

English prayer:
${sourceDoc.prayer}

Return your response as JSON with this exact format:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text"],
  "prayer": "Dear Lord, ... Amen."
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const result = await runDevotionalPrompt(systemPrompt, userPrompt);
  return {
    ...result,
    promptVersion: TRANSLATION_PROMPT_VERSION
  };
}

async function transliterateHindiDevotionalToRomanized(hindiVariant, verseText) {
  const systemPrompt = 'You transliterate Hindi devotional text from Devanagari into clear Romanized Hindi using Latin letters only. Preserve meaning, tone, paragraph boundaries, and punctuation.';
  const userPrompt = `Transliterate this Hindi devotional into Romanized Hindi.

Verse reference: ${hindiVariant.verseReference}
Romanized Hindi verse text for reference:
"${verseText}"

Requirements:
- Use only Latin letters, standard punctuation, and spaces.
- Preserve the number of paragraphs.
- Preserve the meaning and prayer tone exactly.
- Do NOT add a title or heading.
- Do NOT rewrite the content into English.

Hindi devotional paragraphs:
${hindiVariant.pages.map((page, index) => `${index + 1}. ${page}`).join('\n')}

Hindi prayer:
${hindiVariant.prayer}

Return your response as JSON with this exact format:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text"],
  "prayer": "He Prabhu, ... Amen."
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const result = await runDevotionalPrompt(systemPrompt, userPrompt);
  return {
    ...result,
    promptVersion: ROMANIZATION_PROMPT_VERSION
  };
}

module.exports = {
  DEFAULT_MODEL,
  ENGLISH_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION,
  ROMANIZATION_PROMPT_VERSION,
  generateEnglishDevotional,
  translateDevotionalToLanguage,
  transliterateHindiDevotionalToRomanized
};
