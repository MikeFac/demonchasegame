const DEFAULT_MODEL = 'openrouter/auto';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ENGLISH_PROMPT_VERSION = 'study-plan-english-v1';
const TRANSLATION_PROMPT_VERSION = 'study-plan-translation-v1';

const QUESTION_SPEC = [
  { id: 'what-does-it-say', prompt: 'What does this verse say?', help: 'Paraphrase the main idea in your own words.' },
  { id: 'what-does-it-mean', prompt: 'What does this verse mean?', help: 'What is the author saying to the original audience?' },
  { id: 'about-god', prompt: 'What does this verse tell us about God?', help: "Look for God's character, actions, or promises." },
  { id: 'about-people', prompt: 'What does this verse tell us about people?', help: 'Look for our condition, motives, or needs.' },
  { id: 'command', prompt: 'Is there a command to obey?', help: 'Is there something to do, avoid, or practice?' },
  { id: 'promise', prompt: 'Is there a promise to believe?', help: 'Is there something God says He will do?' },
  { id: 'who-to-teach', prompt: 'Who can I teach this to in the next week?', help: 'Name one person or situation where you could share it.' }
];

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
    case 'zw':
      return 'Swahili';
    case 'ja':
      return 'Japanese';
    default:
      return 'English';
  }
}

async function runStudyPlanPrompt(systemPrompt, userPrompt) {
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
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dcgame.4you.tel',
        'X-Title': 'VerseBattles Study Plan'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500
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
    throw new Error('OpenRouter returned an empty study plan response');
  }

  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed.questions) || !parsed.summary || !parsed.application || !parsed.prayer) {
    throw new Error('Invalid study plan format from AI: missing required fields');
  }

  return {
    ...parsed,
    model
  };
}

function normalizeQuestion(question) {
  if (!question || typeof question !== 'object') return null;
  const id = String(question.id || '').trim();
  const prompt = String(question.prompt || '').trim();
  const help = String(question.help || '').trim();
  if (!id || !prompt) return null;
  return { id, prompt, help };
}

function validateQuestionOrder(questions) {
  if (!Array.isArray(questions) || questions.length !== QUESTION_SPEC.length) {
    return false;
  }
  for (let i = 0; i < QUESTION_SPEC.length; i++) {
    if (!questions[i] || questions[i].id !== QUESTION_SPEC[i].id) {
      return false;
    }
  }
  return true;
}

function buildQuestionSpecBlock() {
  return QUESTION_SPEC.map((item, index) => `${index + 1}. ${item.id}: ${item.prompt} | ${item.help}`).join('\n');
}

async function generateEnglishStudyPlan(verseReference, verseText, devotionalText, category) {
  const systemPrompt = 'You are a careful Bible study guide writer. You produce short, practical, question-driven study plans in structured JSON. Keep the language simple, direct, and usable in a game UI.';
  const userPrompt = `Write a short Bible study plan based on this verse, category, and devotional.

Verse reference: ${verseReference}
Category: ${category || 'General'}

Verse text:
"${verseText}"

Devotional text:
"${devotionalText}"

Requirements:
- Write in natural, clear English.
- Keep the tone practical and reflective.
- Use EXACTLY the following question IDs and prompts in this exact order:
${buildQuestionSpecBlock()}
- For each question, add a short help line that is 1 sentence and directly supports the prompt.
- Include a short title.
- Include a short summary of the verse and devotional focus.
- Include one short application step for the next 7 days.
- End with a short prayer addressed to God.
- Do NOT add any extra questions.
- Do NOT add markdown.
- Do NOT include the verse text inside the study plan except as context for your reasoning.

Return your response as JSON with this exact format:
{
  "title": "Study Plan",
  "summary": "Short summary",
  "questions": [
    {"id": "what-does-it-say", "prompt": "What does this verse say?", "help": "Short help"},
    {"id": "what-does-it-mean", "prompt": "What does this verse mean?", "help": "Short help"}
  ],
  "application": "One short action step for the next 7 days",
  "prayer": "Short prayer addressed to God"
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const result = await runStudyPlanPrompt(systemPrompt, userPrompt);
  const questions = (result.questions || []).map(normalizeQuestion).filter(Boolean);
  if (!validateQuestionOrder(questions)) {
    throw new Error('Invalid study plan format from AI: unexpected question order');
  }
  return {
    ...result,
    questions,
    promptVersion: ENGLISH_PROMPT_VERSION
  };
}

async function translateStudyPlanToLanguage(sourceDoc, verseText, devotionalText, lang) {
  const targetLanguage = getLanguageName(lang);
  const systemPrompt = 'You are a careful Bible study guide translator. Preserve meaning, order, and structure faithfully while writing naturally in the target language.';
  const userPrompt = `Translate this English study plan into ${targetLanguage}.

Verse reference: ${sourceDoc.verseReference}
Verse text in the target language:
"${verseText}"

Devotional text in the target language context:
"${devotionalText}"

Requirements:
- Preserve the title, summary, question order, and application meaning.
- Preserve the question IDs exactly as written.
- Translate each question prompt and help line naturally for ${targetLanguage}.
- Keep the output short and usable in a game UI.
- Do NOT add extra questions.
- Do NOT change the JSON shape.

English study plan JSON:
${JSON.stringify({
  title: sourceDoc.title,
  summary: sourceDoc.summary,
  questions: sourceDoc.questions,
  application: sourceDoc.application,
  prayer: sourceDoc.prayer
}, null, 2)}

Return your response as JSON with this exact format:
{
  "title": "Translated title",
  "summary": "Translated summary",
  "questions": [
    {"id": "what-does-it-say", "prompt": "Translated prompt", "help": "Translated help"}
  ],
  "application": "Translated action step",
  "prayer": "Translated prayer"
}

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const result = await runStudyPlanPrompt(systemPrompt, userPrompt);
  const questions = (result.questions || []).map(normalizeQuestion).filter(Boolean);
  if (!validateQuestionOrder(questions)) {
    throw new Error('Invalid translated study plan format: unexpected question order');
  }
  return {
    ...result,
    questions,
    promptVersion: TRANSLATION_PROMPT_VERSION
  };
}

module.exports = {
  DEFAULT_MODEL,
  ENGLISH_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION,
  QUESTION_SPEC,
  generateEnglishStudyPlan,
  translateStudyPlanToLanguage
};
