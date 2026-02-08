#!/usr/bin/env node

/**
 * generate_ai_quizzes.js
 *
 * Generates high-quality quiz data for bible verses using AI via OpenRouter.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... node scripts/generate_ai_quizzes.js [options]
 *
 * Options:
 *   --count N        Process only N verses (for testing quality). Default: all
 *   --batch N        Verses per API call (default: 20)
 *   --model NAME     OpenRouter model ID (default: anthropic/claude-sonnet-4-5-20250929)
 *   --delay MS       Delay between batches in ms (default: 1000)
 *   --resume         Resume from last saved progress
 *   --dry-run        Show what would be sent without calling API
 */

const fs = require('fs');
const path = require('path');

// --- Config from CLI args ---
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
    const idx = args.indexOf('--' + name);
    if (idx === -1) return defaultVal;
    return args[idx + 1] || defaultVal;
}
function hasFlag(name) {
    return args.includes('--' + name);
}

const MAX_COUNT = parseInt(getArg('count', '0'), 10) || Infinity;
const BATCH_SIZE = parseInt(getArg('batch', '20'), 10);
const MODEL = getArg('model', 'anthropic/claude-sonnet-4.5');
const DELAY_MS = parseInt(getArg('delay', '1000'), 10);
const RESUME = hasFlag('resume');
const DRY_RUN = hasFlag('dry-run');

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY && !DRY_RUN) {
    console.error('Error: Set OPENROUTER_API_KEY environment variable');
    console.error('  Get one at https://openrouter.ai/keys');
    process.exit(1);
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROGRESS_FILE = path.join(__dirname, '.quiz_progress.json');
const ROOT = path.join(__dirname, '..');
const VERSES_FILE = path.join(ROOT, 'bible-verses.js');

// Fake ungodly categories used as distractors for categoryMatch quiz.
// These obviously don't apply to any godly verse, so there's no ambiguity.
const UNGODLY_CATEGORIES = [
    'Fear', 'Doubt', 'Greed', 'Pride', 'Jealousy', 'Hatred',
    'Selfishness', 'Despair', 'Anger', 'Lust', 'Deception',
    'Bitterness', 'Laziness', 'Vanity', 'Cowardice'
];

// --- Verse loading/saving (same pattern as generate_quizzes.js) ---

function loadVerses() {
    const content = fs.readFileSync(VERSES_FILE, 'utf8');
    const loader = new Function(content + '; return loadSelectedVerses();');
    return loader();
}

function saveVerses(verses) {
    const newContent = `function loadSelectedVerses() {
  return ${JSON.stringify(verses, null, 2)};
}

function organizeByCategory(verses) {
  const categorizedVerses = {};
  verses.forEach((verse) => {
    // Use Category field (standardized)
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
    fs.writeFileSync(VERSES_FILE, newContent);
}

// --- Progress tracking ---

function loadProgress() {
    if (!RESUME || !fs.existsSync(PROGRESS_FILE)) return new Set();
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Resuming: ${data.processedIds.length} verses already done`);
    return new Set(data.processedIds);
}

function saveProgress(processedIds) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        processedIds: [...processedIds],
        timestamp: new Date().toISOString(),
        model: MODEL
    }, null, 2));
}

// --- API call ---

async function callOpenRouter(prompt) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dcgame.4you.tel',
            'X-Title': 'DC Game Quiz Generator'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a Bible scholar and quiz designer. You generate quiz data in valid JSON format. Return ONLY the JSON array, no markdown fences, no extra text.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 8192
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

    const choice = data.choices[0];
    if (choice.finish_reason && choice.finish_reason !== 'stop') {
        console.warn(`  Warning: finish_reason=${choice.finish_reason}`);
    }

    return choice.message.content;
}

// --- Prompt builder ---

function buildBatchPrompt(verseBatch, allCategories) {
    const versesJson = verseBatch.map((v, i) => ({
        index: i,
        id: v.Id,
        text: v.Text,
        reference: v.Reference,
        category: v.Category
    }));

    return `Generate quiz data for these ${verseBatch.length} Bible verses.

ALL CATEGORIES: ${JSON.stringify(allCategories)}

VERSES:
${JSON.stringify(versesJson, null, 2)}

For EACH verse, generate a JSON object with these 2 quiz types:

1. "missingWord": Pick ONE significant word (noun, verb, or adjective — not articles, prepositions, or pronouns). Generate 3 distractors that:
   - Are the same part of speech as the correct word
   - Fit grammatically in the sentence
   - Are plausible in a biblical context but WRONG for this specific verse
   - Are single words of similar length
   Format: { "word": "<correct word>", "wordIndex": <0-based index in split text>, "distractors": ["word1", "word2", "word3"] }

2. "trueFalse": Generate a plausible but wrong Bible reference (same book style, different chapter/verse) AND a plausible but wrong category. The falseCategory MUST be one of the categories from the list above — do NOT invent new categories.
   Format: { "falseReference": "Book X:Y", "falseCategory": "WrongCat" }

Return a JSON array of ${verseBatch.length} objects in the SAME ORDER as the input, each with:
{ "index": <verse index from input>, "missingWord": {...}, "trueFalse": {...} }

Return ONLY the JSON array. No markdown, no explanation.`;
}

// --- Parse AI response ---

function parseResponse(responseText) {
    // Strip markdown fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Try to find JSON array in the response
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        // Dump raw response for debugging
        const debugFile = path.join(__dirname, '.last_response.txt');
        fs.writeFileSync(debugFile, responseText);
        throw new Error(`Failed to parse JSON response: ${e.message}\nRaw response saved to ${debugFile}\nFirst 500 chars: ${cleaned.substring(0, 500)}`);
    }
}

// --- Apply quiz data to verse ---

// Pick N random unique items from an array
function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function applyQuizData(verse, aiData, allCategories) {
    const words = verse.Text.split(/\s+/);
    const catSet = new Set(allCategories);

    // Build missingWord quiz
    const mw = aiData.missingWord;
    let wordIndex = mw.wordIndex;
    let correctWord = mw.word;

    // Validate wordIndex — find the word if index is wrong
    const clean = w => w.replace(/[.,;:!?'"()]/g, '');
    const wordLower = correctWord.toLowerCase();

    if (wordIndex < 0 || wordIndex >= words.length || !clean(words[wordIndex]).toLowerCase().includes(wordLower)) {
        // Exact match
        wordIndex = words.findIndex(w => clean(w) === correctWord);
        if (wordIndex === -1) {
            // Case-insensitive exact
            wordIndex = words.findIndex(w => clean(w).toLowerCase() === wordLower);
        }
        if (wordIndex === -1) {
            // Substring match: AI said "faith" but verse has "faithful"
            // Pick the word that starts with the AI's word (longest match preferred)
            let bestIdx = -1, bestLen = 0;
            words.forEach((w, i) => {
                const cw = clean(w).toLowerCase();
                if (cw.startsWith(wordLower) && cw.length > bestLen) {
                    bestIdx = i;
                    bestLen = cw.length;
                }
            });
            if (bestIdx >= 0) {
                wordIndex = bestIdx;
                correctWord = clean(words[bestIdx]); // use the actual word from the verse
            }
        }
    }

    // Helper: pick a valid category for trueFalse falseCategory
    function pickValidCategory(candidate) {
        if (catSet.has(candidate) && candidate !== verse.Category) return candidate;
        const others = allCategories.filter(c => c !== verse.Category);
        return others[Math.floor(Math.random() * others.length)];
    }

    if (wordIndex >= 0) {
        const pre = words.slice(0, wordIndex).join(' ');
        const post = words.slice(wordIndex + 1).join(' ');
        const cleanWord = words[wordIndex].replace(/[.,;:!?'"()]/g, '');

        const options = [...mw.distractors.slice(0, 3), cleanWord].sort(() => Math.random() - 0.5);

        // CategoryMatch: use fake ungodly categories as distractors (no AI needed)
        const fakeDistractors = pickRandom(UNGODLY_CATEGORIES, 3);

        verse.quizData = {
            missingWord: {
                question: `${pre} _____ ${post}`.trim(),
                answer: cleanWord,
                options: options
            },
            categoryMatch: {
                correctCategory: verse.Category,
                distractors: fakeDistractors
            },
            trueFalse: {
                falseCategory: pickValidCategory(aiData.trueFalse.falseCategory),
                falseReference: aiData.trueFalse.falseReference
            }
        };
        return true;
    }

    console.warn(`  Warning: Could not locate word "${correctWord}" in verse ${verse.Id}, keeping old quizData`);
    return false;
}

// --- Main ---

async function main() {
    console.log(`Quiz Generator — Model: ${MODEL}`);
    console.log(`Batch size: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms`);
    if (DRY_RUN) console.log('DRY RUN — no API calls will be made\n');

    const verses = loadVerses();
    const allCategories = [...new Set(verses.map(v => v.Category))].sort();
    const processedIds = loadProgress();

    // Filter to unprocessed verses, apply count limit
    const toProcess = verses.filter(v => !processedIds.has(v.Id));
    const limited = toProcess.slice(0, Math.min(MAX_COUNT, toProcess.length));

    console.log(`Total verses: ${verses.length}`);
    console.log(`Already processed: ${processedIds.size}`);
    console.log(`To process this run: ${limited.length}\n`);

    if (limited.length === 0) {
        console.log('Nothing to do!');
        return;
    }

    // Build batches
    const batches = [];
    for (let i = 0; i < limited.length; i += BATCH_SIZE) {
        batches.push(limited.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failCount = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const batchIds = batch.map(v => v.Id);
        console.log(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} verses, IDs: ${batchIds[0]}..${batchIds[batchIds.length - 1]})`);

        const prompt = buildBatchPrompt(batch, allCategories);

        if (DRY_RUN) {
            console.log(`  Prompt length: ${prompt.length} chars`);
            console.log(`  First verse: "${batch[0].Text.substring(0, 60)}..."\n`);
            batchIds.forEach(id => processedIds.add(id));
            continue;
        }

        try {
            const responseText = await callOpenRouter(prompt);
            const results = parseResponse(responseText);

            if (!Array.isArray(results)) {
                throw new Error('Response is not an array');
            }

            // Match results to verses by index (IDs aren't unique across categories)
            const resultMap = new Map();
            results.forEach((r, i) => resultMap.set(r.index !== undefined ? r.index : i, r));

            let batchSuccess = 0;
            for (let vi = 0; vi < batch.length; vi++) {
                const verse = batch[vi];
                const aiData = resultMap.get(vi);
                if (!aiData) {
                    console.warn(`  No result for verse index ${vi} (${verse.Reference}), skipping`);
                    failCount++;
                    continue;
                }

                if (applyQuizData(verse, aiData, allCategories)) {
                    batchSuccess++;
                    successCount++;
                } else {
                    failCount++;
                }
                processedIds.add(verse.Id);
            }

            console.log(`  ✓ ${batchSuccess}/${batch.length} verses updated`);

            // Save progress after each batch
            saveProgress(processedIds);
            saveVerses(verses);

        } catch (err) {
            console.error(`  ✗ Batch failed: ${err.message}`);
            failCount += batch.length;
            // Still save progress for successfully processed verses
            saveProgress(processedIds);
        }

        // Rate limit delay between batches
        if (batchIdx < batches.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    // Final save
    saveVerses(verses);

    console.log(`\nDone! Success: ${successCount}, Failed: ${failCount}`);
    console.log(`Output: ${VERSES_FILE}`);

    // Clean up progress file on full completion
    if (failCount === 0 && MAX_COUNT === Infinity) {
        if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
        console.log('Progress file cleaned up (all verses done)');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
