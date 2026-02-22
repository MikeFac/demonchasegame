const https = require('https');
const fs = require('fs');
const { loadSelectedVerses } = require('../bible-verses.js');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY required');
    process.exit(1);
}

const all = loadSelectedVerses();
const enduranceVerses = all.filter(v => v.Category === 'Endurance').slice(0, 10);

async function callGemini(verses) {
    const prompt = `Translate these Bible verses to Spanish. Return ONLY valid JSON array, no markdown code blocks.

CATEGORY MAPPING: Endurance -> Perseverancia

BIBLE BOOKS: Romans->Romanos, James->Santiago, Hebrews->Hebreos, 1 Corinthians->1 Corintios, 2 Timothy->2 Timoteo, Colossians->Colosenses, Revelation->Apocalipsis

RULES:
1. Add EnglishRef with original Reference value
2. Translate Reference with Spanish book names
3. Translate Category using mapping
4. Translate Text naturally
5. Translate quizData fields
6. Return ONLY valid JSON array

VERSES:
${JSON.stringify(verses, null, 2)}`;

    const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    let text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    text = text.trim();
                    if (text.startsWith('```')) {
                        text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
                    }
                    resolve(JSON.parse(text));
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

async function main() {
    const existing = require('../bible-verses-es.js').loadSelectedVerses();
    console.log(`Existing: ${existing.length} verses`);

    const batch1 = enduranceVerses.slice(0, 5);
    const batch2 = enduranceVerses.slice(5, 10);

    console.log('Translating batch 1 (5 verses)...');
    const translated1 = await callGemini(batch1);
    console.log(`  Got ${translated1.length} verses`);

    console.log('Translating batch 2 (5 verses)...');
    const translated2 = await callGemini(batch2);
    console.log(`  Got ${translated2.length} verses`);

    const allTranslated = [...existing, ...translated1, ...translated2];
    console.log(`Total: ${allTranslated.length} verses`);

    const content = `function loadSelectedVerses() {
  return ${JSON.stringify(allTranslated, null, 2)};
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
    fs.writeFileSync(require('path').join(__dirname, '..', 'bible-verses-es.js'), content);
    console.log('Updated bible-verses-es.js');
}

main().catch(e => console.error('Error:', e));
