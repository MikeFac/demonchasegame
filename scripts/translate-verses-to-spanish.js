/**
 * Translate bible-verses.js to Spanish using Gemini API
 * 
 * Usage: GEMINI_API_KEY=your_key node scripts/translate-verses-to-spanish.js
 * 
 * Outputs: bible-verses-es.js (first 10 verses per category)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { loadSelectedVerses } = require('../bible-verses.js');

const VERSES_PER_CATEGORY = 10;
const BATCH_SIZE = 10;
const OUTPUT_FILE = path.join(__dirname, '..', 'bible-verses-es.js');
const PROGRESS_FILE = path.join(__dirname, '..', '.translation-progress.json');

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
                maxOutputTokens: 8192
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

    return `You are a Bible verse translator. Translate the following JSON verses from English to Spanish.

BIBLE BOOK NAMES - translate to Spanish equivalents:
- Genesis -> Genesis
- Exodus -> Exodo
- Leviticus -> Levitico
- Numbers -> Numeros
- Deuteronomy -> Deuteronomio
- Joshua -> Josue
- Judges -> Jueces
- Ruth -> Rut
- Psalms -> Salmos
- Proverbs -> Proverbios
- Ecclesiastes -> Eclesiastes
- Isaiah -> Isaias
- Jeremiah -> Jeremias
- Lamentations -> Lamentaciones
- Ezekiel -> Ezequiel
- Daniel -> Daniel
- Hosea -> Oseas
- Joel -> Joel
- Amos -> Amos
- Obadiah -> Abdias
- Jonah -> Jonas
- Micah -> Miqueas
- Nahum -> Nahum
- Habakkuk -> Habacuc
- Zephaniah -> Sofonias
- Haggai -> Hageo
- Zechariah -> Zacarias
- Malachi -> Malaquias
- Matthew -> Mateo
- Mark -> Marcos
- Luke -> Lucas
- John -> Juan
- Acts -> Hechos
- Romans -> Romanos
- 1 Corinthians -> 1 Corintios
- 2 Corinthians -> 2 Corintios
- Galatians -> Galatas
- Ephesians -> Efesios
- Philippians -> Filipenses
- Colossians -> Colosenses
- 1 Thessalonians -> 1 Tesalonicenses
- 2 Thessalonians -> 2 Tesalonicenses
- 1 Timothy -> 1 Timoteo
- 2 Timothy -> 2 Timoteo
- Titus -> Tito
- Philemon -> Filemon
- Hebrews -> Hebreos
- James -> Santiago
- 1 Peter -> 1 Pedro
- 2 Peter -> 2 Pedro
- 1 John -> 1 Juan
- 2 John -> 2 Juan
- 3 John -> 3 Juan
- Jude -> Judas
- Revelation -> Apocalipsis

RULES:
1. Translate Text field naturally into Spanish (no specific version, just natural translation)
2. Add "EnglishRef" field with the original Reference value
3. Translate Reference using Spanish book names
4. Keep Category field UNCHANGED (keep the English key exactly as-is)
5. Translate quizData fields:
   - missingWord.question, answer, options (translate to Spanish)
   - categoryMatch.correctCategory: keep UNCHANGED (same English key as Category)
   - categoryMatch.distractors: keep UNCHANGED (keep as English category keys)
   - trueFalse.falseCategory: keep UNCHANGED (keep as English category key)
   - trueFalse.falseReference: translate book name to Spanish
6. Keep Id field unchanged
7. Return ONLY valid JSON array, no markdown, no explanation

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
    return JSON.parse(jsonStr);
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

    const grouped = groupByCategory(allVerses);
    const categories = Object.keys(grouped).sort();
    console.log(`Found ${categories.length} categories`);

    const selectedVerses = [];
    for (const cat of categories) {
        const catVerses = grouped[cat].slice(0, VERSES_PER_CATEGORY);
        selectedVerses.push(...catVerses);
        console.log(`  ${cat}: ${catVerses.length} verses`);
    }
    console.log(`Total selected: ${selectedVerses.length} verses`);

    const batches = [];
    for (let i = 0; i < selectedVerses.length; i += BATCH_SIZE) {
        batches.push(selectedVerses.slice(i, i + BATCH_SIZE));
    }
    console.log(`\nProcessing ${batches.length} batches...`);

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

        const categories = [...new Set(batch.map(v => v.Category))];
        console.log(`  Categories: ${categories.join(', ')}`);

        const prompt = buildTranslationPrompt(batch);

        let attempts = 0;
        let translated = null;

        while (attempts < 3 && !translated) {
            attempts++;
            try {
                const response = await callGemini(prompt, apiKey);
                translated = parseGeminiResponse(response);
                console.log(`  Success on attempt ${attempts}`);
            } catch (err) {
                console.log(`  Attempt ${attempts} failed: ${err.message}`);
                if (attempts < 3) {
                    console.log('  Retrying in 2 seconds...');
                    await sleep(2000);
                } else {
                    console.error(`  Failed after 3 attempts, skipping batch`);
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

    console.log(`\nTranslated ${translatedVerses.length} verses total`);
    writeOutputFile(translatedVerses);
    console.log(`Output written to bible-verses-es.js`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
