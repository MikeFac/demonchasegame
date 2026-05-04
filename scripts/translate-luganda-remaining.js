/**
 * Translate the 5 remaining categories (Prayer, Prophecy, Prosperity, Purity, Wisdom)
 * from bible-verses.js into Luganda and append to bible-verses-lg.js
 *
 * Usage: GEMINI_API_KEY=your_key node scripts/translate-luganda-remaining.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 2;
const MISSING_CATEGORIES = ['Prayer', 'Prophecy', 'Prosperity', 'Purity', 'Wisdom'];
const OUTPUT_FILE = path.join(__dirname, '..', 'bible-verses-lg.js');
const PROGRESS_FILE = path.join(__dirname, '..', '.translation-progress-lg-remaining.json');

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
- Acts -> Ebikolwa
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

function writeOutputFile(existingVerses, newVerses) {
    const allVerses = [...existingVerses, ...newVerses];
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

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            console.log(`Resuming from progress: ${data.completedBatches.length} batches done, ${data.translatedVerses.length} new verses`);
            return data;
        } catch (e) {
            console.log('Could not load progress file, starting fresh');
        }
    }
    return { translatedVerses: [], completedBatches: [] };
}

function saveProgress(translatedVerses, completedBatches) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        translatedVerses,
        completedBatches,
        timestamp: new Date().toISOString()
    }), 'utf8');
}

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY environment variable required');
        process.exit(1);
    }

    const content = fs.readFileSync(path.join(__dirname, '..', 'bible-verses.js'), 'utf8');
    const match = content.match(/return\s*\[([\s\S]*)\];\s*\n\}/);
    const allEnglishVerses = eval('[' + match[1] + ']');

    const versesToTranslate = allEnglishVerses.filter(v => MISSING_CATEGORIES.includes(v.Category));

    const byCategory = {};
    versesToTranslate.forEach(v => {
        if (!byCategory[v.Category]) byCategory[v.Category] = 0;
        byCategory[v.Category]++;
    });

    console.log(`Total verses to translate: ${versesToTranslate.length}`);
    for (const [cat, count] of Object.entries(byCategory)) {
        console.log(`  ${cat}: ${count} verses`);
    }

    const batches = [];
    for (let i = 0; i < versesToTranslate.length; i += BATCH_SIZE) {
        batches.push(versesToTranslate.slice(i, i + BATCH_SIZE));
    }
    console.log(`\nProcessing ${batches.length} batches of up to ${BATCH_SIZE} verses each...`);

    const { loadSelectedVerses } = require(OUTPUT_FILE);
    const existingVerses = loadSelectedVerses();
    console.log(`Existing Luganda verses: ${existingVerses.length}`);

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
                if (translated) {
                    console.log(`  Success on attempt ${attempts} (${translated.length} verses)`);
                }
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
            writeOutputFile(existingVerses, translatedVerses);
            console.log(`  Saved progress (${translatedVerses.length} new verses, ${existingVerses.length + translatedVerses.length} total in file)`);
        }

        if (i < batches.length - 1) {
            await sleep(500);
        }
    }

    writeOutputFile(existingVerses, translatedVerses);
    console.log(`\nDone! Translated ${translatedVerses.length} new verses`);
    console.log(`Total Luganda verses: ${existingVerses.length + translatedVerses.length}`);
    console.log(`Output written to ${OUTPUT_FILE}`);
    if (fs.existsSync(PROGRESS_FILE)) {
        console.log(`Clean up progress file when satisfied: rm ${PROGRESS_FILE}`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
