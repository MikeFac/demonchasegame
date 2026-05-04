/**
 * Translate bible-verses.js to Luganda using Gemini API
 *
 * Usage: GEMINI_API_KEY=your_key node scripts/translate-verses-to-luganda.js
 *        GEMINI_API_KEY=your_key node scripts/translate-verses-to-luganda.js --all
 *
 * Flags:
 *   (default)  Translate 16 verses per category (enough for 1-page print sheets)
 *   --all      Translate every verse
 *
 * Outputs: bible-verses-lg.js
 * Progress: .translation-progress-lg.json (supports resume)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { loadSelectedVerses } = require('../bible-verses.js');

const TRANSLATE_ALL = process.argv.includes('--all');
const VERSES_PER_CATEGORY = TRANSLATE_ALL ? Infinity : 16;
const BATCH_SIZE = 2;
const OUTPUT_FILE = path.join(__dirname, '..', 'bible-verses-lg.js');
const PROGRESS_FILE = path.join(__dirname, '..', '.translation-progress-lg.json');

function groupByCategory(verses) {
    const groups = {};
    verses.forEach(v => {
        if (!groups[v.Category]) groups[v.Category] = [];
        groups[v.Category].push(v);
    });
    return groups;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(prompt, apiKey) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 16384
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message || JSON.stringify(json.error)));
                        return;
                    }
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function buildTranslationPrompt(verses) {
    const versesJson = JSON.stringify(verses, null, 2);

    return `You are a professional Bible translator fluent in English and Luganda (the major language of Uganda, also spelled Ganda). Translate the following JSON verses from English to Luganda.

BIBLE BOOK NAMES - translate to Luganda equivalents. Use these standard Luganda Bible book names:
- Genesis -> Mu Kitabo kya Gitaleesì
- Exodus -> Mu Kitabo kya Muwanga
- Leviticus -> Mu Kitabo kya Levitikus
- Numbers -> Mu Kitabo kya Enamba
- Deuteronomy -> Mu Kitabo kya Devuteronomii
- Joshua -> Yoswa
- Judges -> Bali isaza
- Ruth -> Rutsi
- Psalms -> Zabbuli
- Proverbs -> Mirimu
- Ecclesiastes -> Omubuulizi
- Isaiah -> Isaya
- Jeremiah -> Yeremiya
- Lamentations -> Okubonaabona
- Ezekiel -> Ezekkieri
- Daniel -> Daniyiri
- Hosea -> Hosea
- Joel -> Yoweri
- Amos -> Amoosi
- Obadiah -> Obadia
- Jonah -> Yunisa
- Micah -> Mika
- Nahum -> Naahuumi
- Habakkuk -> Habakuki
- Zephaniah -> Sefaniya
- Haggai -> Aggayi
- Zechariah -> Zakaliya
- Malachi -> Malaki
- Matthew -> Matayo
- Mark -> Mariko
- Luke -> Luka
- John -> Yokaana
- Acts => Ebikolwa
- Romans -> Abaruumi
- 1 Corinthians -> Abakorinti 1
- 2 Corinthians -> Abakorinti 2
- Galatians -> Abagaratiya
- Ephesians -> Abaefeso
- Philippians -> Abafiripi
- Colossians -> Abakolosayi
- 1 Thessalonians -> Abatesalonika 1
- 2 Thessalonians -> Abatesalonika 2
- 1 Timothy -> Timoseo 1
- 2 Timothy -> Timoseo 2
- Titus -> Titusi
- Philemon -> Filemooni
- Hebrews -> Abaebulaniya
- James -> Yakobo
- 1 Peter -> Peetero 1
- 2 Peter -> Peetero 2
- 1 John -> Yokaana 1
- 2 John -> Yokaana 2
- 3 John -> Yokaana 3
- Jude -> Yuda
- Revelation -> Okulabika

IMPORTANT: The Luganda book names above are approximations. If you know the correct Luganda Bible book names, use those instead. The Luganda Bible is called "Baibuli Yonna" and was translated by the Bible Society of Uganda.

RULES:
1. Translate the Text field into natural, fluent Luganda. Use standard Luganda Bible language (not colloquial).
2. Add an "EnglishRef" field with the original English Reference value.
3. Translate the Reference field using Luganda Bible book names. Keep chapter:verse numbers unchanged.
4. Keep the Category field UNCHANGED (keep the English key exactly as-is, e.g. "Courage", "Faith").
5. Translate quizData fields:
   - missingWord.question: translate the full question sentence to Luganda, keeping the _____ blank
   - missingWord.answer: translate to Luganda
   - missingWord.options: translate all 4 options to Luganda
   - categoryMatch.correctCategory: keep UNCHANGED (same English key as Category)
   - categoryMatch.distractors: keep UNCHANGED (keep as English category keys)
   - trueFalse.falseCategory: keep UNCHANGED (keep as English category key)
   - trueFalse.falseReference: translate the book name to Luganda
6. Keep the Id field unchanged.
7. Return ONLY a valid JSON array. No markdown fences, no explanation, no commentary.

VERSES TO TRANSLATE:
${versesJson}

Return the translated JSON array:`;
}

function parseGeminiResponse(text) {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return tryRepairJson(jsonStr);
    }
}

function tryRepairJson(str) {
    let s = str;

    if (!s.trimStart().startsWith('[')) return null;

    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '[' || c === '{') depth++;
        if (c === ']' || c === '}') depth--;
    }

    if (inStr) {
        s = s + '"';
    }

    let lastObjEnd = -1;
    let d2 = 0;
    let inStr2 = false;
    let esc2 = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (esc2) { esc2 = false; continue; }
        if (c === '\\') { esc2 = true; continue; }
        if (c === '"') { inStr2 = !inStr2; continue; }
        if (inStr2) continue;
        if (c === '[' || c === '{') d2++;
        if (c === ']' || c === '}') { d2--; if (d2 === 1) lastObjEnd = i; }
    }

    if (lastObjEnd > 0) {
        let repaired = s.slice(0, lastObjEnd + 1);
        while (d2 > 0) { repaired += ']'; d2--; }
        try {
            const result = JSON.parse(repaired);
            console.log(`    Repaired truncated JSON: recovered ${result.length} verses`);
            return result;
        } catch (e2) {
            console.log(`    JSON repair failed: ${e2.message}`);
        }
    }

    return null;
}

function writeOutputFile(allVerses) {
    const content = `function loadSelectedVerses() {
  return ${JSON.stringify(allVerses, null, 2)};
}

function organizeByCategory(verses) {
  const categorizedVerses = {};
  verses.forEach((verse) => {
    const category = verse.Category;
    if (!categorizedVerses[category]) {
      categorizedVerses[category] = [];
    }
    categorizedVerses[category].push(verse);
  });
  return categorizedVerses;
}

if (typeof module !== 'undefined') {
  module.exports = { loadSelectedVerses, organizeByCategory };
}
`;
    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
}

function saveProgress(translatedVerses, completedBatches) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        translatedVerses,
        completedBatches,
        timestamp: new Date().toISOString()
    }), 'utf8');
    writeOutputFile(translatedVerses);
}

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            console.log(`Resuming from progress: ${data.completedBatches.length} batches done, ${data.translatedVerses.length} verses`);
            return data;
        } catch (e) {
            console.log('Could not load progress file, starting fresh');
        }
    }
    return { translatedVerses: [], completedBatches: [] };
}

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY environment variable required');
        process.exit(1);
    }

    const allVerses = loadSelectedVerses();
    console.log(`Loaded ${allVerses.length} total verses`);
    console.log(`Mode: ${TRANSLATE_ALL ? 'ALL verses' : `${VERSES_PER_CATEGORY} per category (print sheets)`}`);

    const grouped = groupByCategory(allVerses);
    const categories = Object.keys(grouped).sort();
    console.log(`Found ${categories.length} categories`);

    const selectedVerses = [];
    for (const cat of categories) {
        const limit = VERSES_PER_CATEGORY === Infinity ? grouped[cat].length : VERSES_PER_CATEGORY;
        const catVerses = grouped[cat].slice(0, limit);
        selectedVerses.push(...catVerses);
        console.log(`  ${cat}: ${catVerses.length} verses`);
    }
    console.log(`Total selected: ${selectedVerses.length} verses`);

    const batches = [];
    for (let i = 0; i < selectedVerses.length; i += BATCH_SIZE) {
        batches.push(selectedVerses.slice(i, i + BATCH_SIZE));
    }
    console.log(`\nProcessing ${batches.length} batches of up to ${BATCH_SIZE} verses each...`);

    const progress = loadProgress();
    const translatedVerses = progress.translatedVerses;
    const completedBatches = new Set(progress.completedBatches);

    for (let i = 0; i < batches.length; i++) {
        if (completedBatches.has(i)) {
            console.log(`\nBatch ${i + 1}/${batches.length} - already completed, skipping`);
            continue;
        }

        const batch = batches[i];
        const batchNum = i + 1;
        console.log(`\nBatch ${batchNum}/${batches.length} (${batch.length} verses)...`);

        const batchCategories = [...new Set(batch.map(v => v.Category))];
        console.log(`  Categories: ${batchCategories.join(', ')}`);

        const prompt = buildTranslationPrompt(batch);

        let attempts = 0;
        let translated = null;

        while (attempts < 3 && !translated) {
            attempts++;
            try {
                const response = await callGemini(prompt, apiKey);
                translated = parseGeminiResponse(response);
                console.log(`  Success on attempt ${attempts} (${translated.length} verses)`);
            } catch (err) {
                console.log(`  Attempt ${attempts} failed: ${err.message}`);
                if (attempts < 3) {
                    console.log('  Retrying in 3 seconds...');
                    await sleep(3000);
                } else {
                    console.error(`  Failed after 3 attempts, skipping batch ${batchNum}`);
                }
            }
        }

        if (translated) {
            translatedVerses.push(...translated);
            completedBatches.add(i);
            saveProgress(translatedVerses, [...completedBatches]);
            console.log(`  Saved progress (${translatedVerses.length} verses total)`);
        }

        if (i < batches.length - 1) {
            await sleep(500);
        }
    }

    console.log(`\nDone! Translated ${translatedVerses.length} verses total`);
    writeOutputFile(translatedVerses);
    console.log(`Output written to ${OUTPUT_FILE}`);
    if (fs.existsSync(PROGRESS_FILE)) {
        console.log(`Clean up progress file when satisfied: rm ${PROGRESS_FILE}`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
