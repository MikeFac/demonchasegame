/**
 * Translate en.json locale to Luganda (lg.json) using Gemini API.
 *
 * Usage: GEMINI_API_KEY=your_key node scripts/translate-locale-to-luganda.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'public', 'locales', 'en.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'locales', 'lg.json');

function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 16384 }
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(apiKey),
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

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY required');
    process.exit(1);
  }

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

  const prompt = `You are a professional translator fluent in English and Luganda (the major language of Uganda).

Translate the following JSON locale file from English to Luganda. This is for a Bible verse quiz game called "VerseBattles: Demon Chase" (Oluyimba lwa VerseBattles: Okusinga Obuwangwa).

RULES:
1. Translate ALL string values to Luganda. Keep the JSON keys exactly as they are (do NOT translate keys).
2. Preserve {0}, {1}, etc. parameter placeholders exactly as-is.
3. Preserve HTML tags like <h3>, <p>, <span class="highlight">, <ul>, <li>, <strong> exactly as-is. Only translate the text content between tags.
4. Preserve emoji characters exactly as-is (📖, 🎮, etc.).
5. For the "meta" section, set: "language": "Luganda", "code": "lg", "direction": "ltr"
6. For "demons" section: translate demon names to Luganda (e.g., Fear → Okutya, Doubt → Okubuusabuusa, Pride → Ekyekango, etc.)
7. For "categories" section: translate category names. Also ADD these additional categories that the Luganda verse bundle uses: "Prayer": "Okusaba", "Purity": "Obutukuvu", "Prosperity": "Obulungi", "Humility": "Obwombeefu", "Joy": "Essanyu", "Deliverance": "Okununulibwa", "Praise": "Okutendereza"
8. Use natural, fluent Luganda suitable for a Christian game audience in Uganda.
9. Return ONLY valid JSON. No markdown fences, no explanation.

JSON TO TRANSLATE:
${JSON.stringify(sections, null, 2)}`;

  console.log('Calling Gemini to translate locale...');

  let response = await callGemini(prompt, apiKey);
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let translated;
  try {
    translated = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse response. Saving raw output for inspection.');
    fs.writeFileSync(OUTPUT_FILE + '.raw', response, 'utf8');
    console.error(`Saved raw output to ${OUTPUT_FILE}.raw`);
    process.exit(1);
  }

  const tutorial = en.tutorial;
  if (tutorial) {
    const tutorialPrompt = `You are a professional translator fluent in English and Luganda (Uganda).

Translate the following tutorial pages JSON array from English to Luganda. This is for a Bible verse quiz game called "VerseBattles: Demon Chase".

RULES:
1. Translate "title" fields to Luganda.
2. Translate the HTML "content" fields to Luganda. Preserve ALL HTML tags exactly as-is (<h3>, <p>, <span class="highlight">, <ul>, <li>, <strong>). Only translate text content between tags.
3. Keep emoji characters exactly as-is.
4. Use natural, fluent Luganda suitable for a Christian game audience.
5. Return ONLY a valid JSON array. No markdown fences, no explanation.

TUTORIAL PAGES:
${JSON.stringify(tutorial.pages, null, 2)}`;

    console.log('Translating tutorial pages...');
    let tutResponse = await callGemini(tutorialPrompt, apiKey);
    let tutStr = tutResponse.trim();
    if (tutStr.startsWith('```json')) tutStr = tutStr.slice(7);
    if (tutStr.startsWith('```')) tutStr = tutStr.slice(3);
    if (tutStr.endsWith('```')) tutStr = tutStr.slice(0, -3);
    tutStr = tutStr.trim();

    try {
      translated.tutorial = {
        next: translated.tutorial?.next || tutorial.next,
        back: translated.tutorial?.back || tutorial.back,
        close: translated.tutorial?.close || tutorial.close,
        startPlaying: translated.tutorial?.startPlaying || tutorial.startPlaying,
        pages: JSON.parse(tutStr)
      };
    } catch (e) {
      console.error('Tutorial translation parse failed, using English tutorial');
      fs.writeFileSync(OUTPUT_FILE + '.tutorial.raw', tutResponse, 'utf8');
      translated.tutorial = tutorial;
    }
  }

  const lg = { ...translated };
  if (!lg.meta) lg.meta = { language: 'Luganda', code: 'lg', direction: 'ltr' };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(lg, null, 2) + '\n', 'utf8');

  let stringCount = 0;
  const countStrings = (obj) => {
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') stringCount++;
      else if (typeof v === 'object' && v !== null) countStrings(v);
    }
  };
  countStrings(lg);

  console.log(`Done! Translated ${stringCount} strings to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
