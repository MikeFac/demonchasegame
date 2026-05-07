/**
 * Translate en.json locale to modern Hindi (hi.json) using Gemini API.
 *
 * Usage: GEMINI_API_KEY=your_key node scripts/translate-locale-to-hindi.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { deepRomanizeValue } = require('./lib/hindiRomanize');

const INPUT_FILE = path.join(__dirname, '..', 'public', 'locales', 'en.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'locales', 'hi.json');
const ROMANIZED_OUTPUT_FILE = path.join(__dirname, '..', 'public', 'locales', 'hi-rom.json');
const ROMANIZED_ONLY = process.argv.includes('--romanized-only');

function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 16384 }
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function stripMarkdownFences(text) {
  let value = text.trim();
  if (value.startsWith('```json')) value = value.slice(7);
  if (value.startsWith('```')) value = value.slice(3);
  if (value.endsWith('```')) value = value.slice(0, -3);
  return value.trim();
}

function tryRepairJson(str) {
  let s = stripMarkdownFences(str);

  if (!s.trimStart().startsWith('{') && !s.trimStart().startsWith('[')) {
    const firstBrace = s.indexOf('{');
    const firstBracket = s.indexOf('[');
    const firstIndex = [firstBrace, firstBracket].filter(i => i >= 0).sort((a, b) => a - b)[0];
    if (typeof firstIndex === 'number') {
      s = s.slice(firstIndex);
    }
  }

  let lastCurly = s.lastIndexOf('}');
  let lastSquare = s.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);
  if (lastIndex >= 0) {
    s = s.slice(0, lastIndex + 1);
  }

  return JSON.parse(s);
}

function parseJsonResponseOrSave(text, rawFile) {
  const cleaned = stripMarkdownFences(text);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      return tryRepairJson(cleaned);
    } catch (repairErr) {
      fs.writeFileSync(rawFile, text, 'utf8');
      throw new Error(`Failed to parse model JSON. Saved raw output to ${rawFile}. Parser error: ${repairErr.message}`);
    }
  }
}

async function buildRomanizedLocale(hiLocale) {
  console.log('Generating Romanized Hindi locale locally...');
  return deepRomanizeValue(hiLocale);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY required');
    process.exit(1);
  }

  let hi = null;

  if (!ROMANIZED_ONLY) {
    const en = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

    const sections = {
      meta: en.meta,
      ui: en.ui,
      stats: en.stats,
      menu: en.menu,
      review: en.review,
      overland: en.overland,
      votd: en.votd,
      verseTest: en.verseTest,
      buffs: en.buffs,
      items: en.items,
      demons: en.demons,
      categories: en.categories,
      lobby: en.lobby,
      config: en.config,
      mapStyles: en.mapStyles,
      toasts: en.toasts,
      quickStart: en.quickStart
    };

    const prompt = `You are a professional translator fluent in English and Hindi.

Translate the following JSON locale file from English into modern standard Hindi in Devanagari script.
This is for a Bible verse quiz game called "VerseBattles: Demon Chase".

RULES:
1. Translate ALL string values to Hindi. Keep JSON keys exactly as they are.
2. Preserve {0}, {1}, etc. placeholders exactly as-is.
3. Preserve HTML tags like <h3>, <p>, <span class="highlight">, <ul>, <li>, <strong> exactly as-is. Only translate the text content between tags.
4. Preserve emoji exactly as-is.
5. Use natural, contemporary Hindi suitable for Indian Christian users. Do not use Romanized Hindi.
6. For the "meta" section, set:
   - "language": "हिन्दी"
   - "code": "hi"
   - "direction": "ltr"
7. For "demons" section: translate demon names naturally into Hindi.
8. For "categories" section: translate category names into clear Hindi.
9. Return ONLY valid JSON. No markdown fences, no explanation.

JSON TO TRANSLATE:
${JSON.stringify(sections, null, 2)}`;

    console.log('Calling Gemini to translate Hindi locale...');

    let response = await callGemini(prompt, apiKey);

    const translated = parseJsonResponseOrSave(response, OUTPUT_FILE + '.raw');

    const tutorial = en.tutorial;
    if (tutorial) {
      const tutorialPrompt = `You are a professional translator fluent in English and Hindi.

Translate the following tutorial pages JSON array into modern Hindi in Devanagari script.

RULES:
1. Translate "title" fields to Hindi.
2. Translate the HTML "content" fields to Hindi. Preserve ALL HTML tags exactly as-is.
3. Keep emoji exactly as-is.
4. Use natural, modern Hindi suitable for a Christian game audience in India.
5. Return ONLY a valid JSON array. No markdown fences, no explanation.

TUTORIAL PAGES:
${JSON.stringify(tutorial.pages, null, 2)}`;

      console.log('Translating tutorial pages...');
      let tutResponse = await callGemini(tutorialPrompt, apiKey);

      try {
        const parsedTutorialPages = parseJsonResponseOrSave(tutResponse, OUTPUT_FILE + '.tutorial.raw');
        translated.tutorial = {
          next: translated.tutorial?.next || tutorial.next,
          back: translated.tutorial?.back || tutorial.back,
          close: translated.tutorial?.close || tutorial.close,
          startPlaying: translated.tutorial?.startPlaying || tutorial.startPlaying,
          pages: parsedTutorialPages
        };
      } catch (e) {
        console.error('Tutorial translation parse failed, using English tutorial');
        translated.tutorial = tutorial;
      }
    }

    hi = { ...translated };
    hi.meta = {
      ...(hi.meta || {}),
      language: 'हिन्दी',
      code: 'hi',
      direction: 'ltr',
      quizCapabilities: {
        scriptType: 'abugida',
        supportsRomanizedDisplay: true,
        supportsFirstLetterQuiz: false,
        supportsAutoMissingWord: false,
        supportsAutoCloze: false,
        supportedQuizModes: {
          first_letter: false,
          missing_word: true,
          category_match: true,
          true_false: true,
          cloze: false
        }
      }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(hi, null, 2) + '\n', 'utf8');
  } else {
    if (!fs.existsSync(OUTPUT_FILE)) {
      console.error(`Cannot use --romanized-only because ${OUTPUT_FILE} does not exist`);
      process.exit(1);
    }
    hi = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  const hiRom = await buildRomanizedLocale(hi);
  hiRom.meta = {
    ...(hiRom.meta || {}),
    language: 'Romanized Hindi',
    code: 'hi-rom',
    direction: 'ltr',
    quizCapabilities: {
      scriptType: 'romanized-abugida',
      supportsRomanizedDisplay: true,
      supportsFirstLetterQuiz: false,
      supportsAutoMissingWord: false,
      supportsAutoCloze: false,
      supportedQuizModes: {
        first_letter: false,
        missing_word: true,
        category_match: true,
        true_false: true,
        cloze: false
      }
    }
  };

  fs.writeFileSync(ROMANIZED_OUTPUT_FILE, JSON.stringify(hiRom, null, 2) + '\n', 'utf8');

  let stringCount = 0;
  const countStrings = (obj) => {
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') stringCount++;
      else if (typeof v === 'object' && v !== null) countStrings(v);
    }
  };
  countStrings(hi);

  if (!ROMANIZED_ONLY) {
    console.log(`Done! Translated ${stringCount} strings to ${OUTPUT_FILE}`);
  } else {
    console.log(`Reused existing Hindi locale from ${OUTPUT_FILE}`);
  }
  console.log(`Done! Wrote Romanized Hindi locale to ${ROMANIZED_OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
