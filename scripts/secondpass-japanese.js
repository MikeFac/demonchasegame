/**
 * Add hiragana reading annotations to the Japanese verse bundle.
 *
 * This is a second pass over bible-verses-ja.js. It does not re-translate the
 * verses. Instead, it adds quizData.firstKana.candidates entries that can be
 * used later for a Japanese first-kana quiz.
 *
 * Usage:
 *   OPENAI_API_KEY=your_key node scripts/secondpass-japanese.js
 *   OPENAI_API_KEY=your_key node scripts/secondpass-japanese.js --max-batch-verses=4
 *
 * Default input:  bible-verses-ja.js
 * Default output: bible-verses-ja-kana.js
 * Progress file:  .secondpass-progress-ja-kana.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const perCategoryArg = process.argv.find(arg => arg.startsWith('--per-category='));
const inputFileArg = process.argv.find(arg => arg.startsWith('--input-file='));
const outputFileArg = process.argv.find(arg => arg.startsWith('--output-file='));
const targetPromptCharsArg = process.argv.find(arg => arg.startsWith('--target-prompt-chars='));
const hardPromptCharsArg = process.argv.find(arg => arg.startsWith('--hard-prompt-chars='));
const maxBatchVersesArg = process.argv.find(arg => arg.startsWith('--max-batch-verses='));

const VERSES_PER_CATEGORY = perCategoryArg ? Number.parseInt(perCategoryArg.split('=')[1], 10) : Infinity;
const TARGET_PROMPT_CHARS = targetPromptCharsArg ? Number.parseInt(targetPromptCharsArg.split('=')[1], 10) : 9000;
const HARD_PROMPT_CHARS = hardPromptCharsArg ? Number.parseInt(hardPromptCharsArg.split('=')[1], 10) : 11000;
const MAX_BATCH_VERSES = maxBatchVersesArg ? Number.parseInt(maxBatchVersesArg.split('=')[1], 10) : 4;
const INPUT_FILE = path.resolve(inputFileArg ? inputFileArg.split('=')[1] : path.join(__dirname, '..', 'bible-verses-ja.js'));
const OUTPUT_FILE = path.resolve(outputFileArg ? outputFileArg.split('=')[1] : path.join(__dirname, '..', 'bible-verses-ja-kana.js'));
const PROGRESS_FILE = path.resolve(path.join(__dirname, '..', '.secondpass-progress-ja-kana.json'));
const STANDARD_RETRY_LIMIT = 3;
const MIN_BACKOFF_MS = 8000;
const MAX_BACKOFF_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 180000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'high';

const JAPANESE_GLOSSARY = [
    ['神', 'かみ'],
    ['主', 'しゅ'],
    ['聖霊', 'せいれい'],
    ['弟子', 'でし'],
    ['神の国', 'かみのくに'],
    ['悔い改める', 'くいあらためる'],
    ['罪', 'つみ'],
    ['救い', 'すくい'],
    ['永遠の命', 'えいえんのいのち']
];

function loadEnvFromDotenv() {
    if (process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = String(process.env.OPENAI_API_KEY).trim();
        return;
    }

    const dotenvPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(dotenvPath)) {
        return;
    }

    const lines = fs.readFileSync(dotenvPath, 'utf8').replace(/\r/g, '').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex <= 0) continue;

        const key = trimmed.slice(0, equalsIndex).trim();
        let value = trimmed.slice(equalsIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }

    if (process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = String(process.env.OPENAI_API_KEY).trim();
    }
}

loadEnvFromDotenv();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function limitVersesPerCategory(verses) {
    if (!Number.isFinite(VERSES_PER_CATEGORY)) {
        return verses.slice();
    }

    const counts = new Map();
    const selected = [];
    for (const verse of verses) {
        const category = verse && verse.Category ? verse.Category : '';
        const seen = counts.get(category) || 0;
        if (seen < VERSES_PER_CATEGORY) {
            selected.push(verse);
            counts.set(category, seen + 1);
        }
    }
    return selected;
}

function clearRequireCache(filePath) {
    try {
        const resolved = require.resolve(filePath);
        delete require.cache[resolved];
    } catch (_) {
        // Ignore cache misses.
    }
}

function loadJapaneseVerses(filePath) {
    clearRequireCache(filePath);
    const loaded = require(filePath);
    if (loaded && typeof loaded.loadSelectedVersesJA === 'function') {
        return loaded.loadSelectedVersesJA();
    }
    if (loaded && typeof loaded.loadSelectedVerses === 'function') {
        return loaded.loadSelectedVerses();
    }
    if (Array.isArray(loaded)) {
        return loaded;
    }
    throw new Error(`Could not load verses from ${filePath}`);
}

function normalizeHiragana(text) {
    return String(text || '')
        .replace(/[ァ-ヶ]/g, function(ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        })
        .replace(/\s+/g, '')
        .trim();
}

function isHiraganaReading(text) {
    return /^[ぁ-ゖゝゞー]+$/.test(text);
}

function buildPrompt(batch) {
    const versesJson = JSON.stringify(batch, null, 2);
    const glossaryLines = JAPANESE_GLOSSARY.map(([surface, reading]) => `- ${surface} -> ${reading}`).join('\n');

    return `You are annotating already-translated Japanese Bible verses for a future first-kana quiz.

Important:
- Do NOT translate or rewrite the verses.
- Do NOT change Text, Reference, EnglishRef, Category, or any existing quizData fields.
- Only add quizData.firstKana when the verse has strong candidates for a first-kana quiz.
- firstKana is a reading annotation, not a new translation.

Glossary readings to keep consistent when you annotate candidates:
${glossaryLines}

Target selection rules:
1. Choose 2 to 4 strong content words or short phrases from the verse.
2. Prefer nouns, verbs, adjectives, and theological terms.
3. Avoid particles, auxiliaries, and tiny function words unless they are part of a meaningful phrase.
4. Use hiragana only for readings.
5. Surface text must match the verse text exactly as it appears there.
6. If the verse is not a good fit, return quizData: null.

Return a JSON array with the same length and order as the input. Each item must look like:
{
  "Id": 1,
  "quizData": {
    "firstKana": {
      "candidates": [
        { "surface": "神", "reading": "かみ" },
        { "surface": "国", "reading": "くに" }
      ]
    }
  }
}

If a verse has no good candidates, use:
{
  "Id": 1,
  "quizData": null
}

VERSES TO ANNOTATE:
${versesJson}

Return ONLY valid JSON array. No markdown fences, no explanation.`;
}

function stripCodeFences(text) {
    let jsonStr = String(text || '').trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    return jsonStr.trim();
}

function parseOpenAIResponse(text) {
    let jsonStr = stripCodeFences(text);
    const start = jsonStr.indexOf('[');
    const end = jsonStr.lastIndexOf(']');
    if (start >= 0 && end > start) {
        jsonStr = jsonStr.slice(start, end + 1);
    }
    return JSON.parse(jsonStr);
}

function estimatePromptChars(batch) {
    return buildPrompt(batch).length;
}

function createAdaptiveBatches(verses) {
    const batches = [];
    let currentBatch = [];

    for (const verse of verses) {
        const candidateBatch = currentBatch.concat([verse]);
        const candidatePromptChars = estimatePromptChars(candidateBatch);
        const shouldStartNewBatch = currentBatch.length > 0 && (
            candidateBatch.length > MAX_BATCH_VERSES ||
            candidatePromptChars > TARGET_PROMPT_CHARS
        );

        if (shouldStartNewBatch) {
            batches.push(currentBatch);
            currentBatch = [verse];
        } else {
            currentBatch = candidateBatch;
        }

        if (estimatePromptChars(currentBatch) > HARD_PROMPT_CHARS && currentBatch.length > 1) {
            const overflowVerse = currentBatch.pop();
            batches.push(currentBatch);
            currentBatch = [overflowVerse];
        }
    }

    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    return batches;
}

function getErrorSummary(err) {
    if (!err) return 'Unknown error';
    if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    if (typeof err.code === 'string' && err.code.trim()) return err.code.trim();
    if (typeof err.name === 'string' && err.name.trim()) return err.name.trim();
    return String(err || 'Unknown error').trim() || 'Unknown error';
}

function isRetryableError(err) {
    const code = String(err && err.code ? err.code : '').toUpperCase();
    const status = err && typeof err.statusCode === 'number' ? err.statusCode : null;
    const message = getErrorSummary(err).toLowerCase();
    return (
        ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE'].includes(code) ||
        status === 429 ||
        (status !== null && status >= 500) ||
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('timed out') ||
        message.includes('socket hang up') ||
        message.includes('fetch failed')
    );
}

function backoffMs(attempt) {
    return Math.min(MAX_BACKOFF_MS, Math.round(MIN_BACKOFF_MS * Math.pow(1.8, Math.max(0, attempt - 1))));
}

async function callOpenAI(prompt, apiKey) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You annotate Japanese Scripture text with compact kana reading metadata. Return only valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            reasoning_effort: REASONING_EFFORT,
            max_completion_tokens: 8192
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        const error = new Error(json.error?.message || `OpenAI API error ${res.statusCode}`);
                        error.statusCode = res.statusCode || 500;
                        error.details = json;
                        reject(error);
                        return;
                    }
                    resolve(json.choices?.[0]?.message?.content || '');
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.setTimeout(REQUEST_TIMEOUT_MS, () => {
            const timeoutError = new Error('OpenAI request timed out');
            timeoutError.code = 'ETIMEDOUT';
            req.destroy(timeoutError);
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function annotateBatch(batch, apiKey, label) {
    const prompt = buildPrompt(batch);
    let lastError = null;

    for (let attempt = 1; attempt <= STANDARD_RETRY_LIMIT; attempt++) {
        try {
            const text = await callOpenAI(prompt, apiKey);
            const parsed = parseOpenAIResponse(text);
            if (!Array.isArray(parsed)) {
                throw new Error(`Batch ${label}: model did not return a JSON array`);
            }
            if (parsed.length !== batch.length) {
                throw new Error(`Batch ${label}: expected ${batch.length} verses but got ${parsed.length}`);
            }
            return parsed;
        } catch (err) {
            lastError = err;
            const retryable = isRetryableError(err);
            console.warn(`Batch ${label} attempt ${attempt} failed: ${getErrorSummary(err)}`);
            if (!retryable || attempt === STANDARD_RETRY_LIMIT) break;
            await sleep(backoffMs(attempt));
        }
    }

    throw lastError || new Error(`Batch ${label} failed`);
}

function normalizeCandidate(candidate) {
    if (!candidate || typeof candidate !== 'object') return null;
    const surface = typeof candidate.surface === 'string' ? candidate.surface.trim() : '';
    const reading = normalizeHiragana(candidate.reading);
    if (!surface || !reading || !isHiraganaReading(reading)) return null;
    return { surface, reading };
}

function mergeAnnotation(sourceVerse, annotationVerse) {
    const baseQuizData = sourceVerse.quizData && typeof sourceVerse.quizData === 'object'
        ? sourceVerse.quizData
        : {};
    const annotationQuizData = annotationVerse && annotationVerse.quizData && typeof annotationVerse.quizData === 'object'
        ? annotationVerse.quizData
        : null;

    let mergedQuizData = baseQuizData;
    if (annotationQuizData && annotationQuizData.firstKana && annotationQuizData.firstKana.candidates) {
        const candidates = annotationQuizData.firstKana.candidates
            .map(normalizeCandidate)
            .filter(Boolean);
        if (candidates.length > 0) {
            mergedQuizData = {
                ...baseQuizData,
                firstKana: {
                    candidates
                }
            };
        }
    }

    return {
        ...sourceVerse,
        quizData: mergedQuizData
    };
}

function indexVersesById(verses) {
    const map = new Map();
    for (const verse of verses || []) {
        if (verse && typeof verse.Id !== 'undefined') {
            map.set(String(verse.Id), verse);
        }
    }
    return map;
}

function orderAnnotatedVerses(selectedVerses, annotatedById) {
    return selectedVerses
        .map(verse => annotatedById.get(String(verse.Id)))
        .filter(Boolean);
}

function writeOutputFile(allVerses) {
    const content = `function loadSelectedVersesJA() {
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
  module.exports = { loadSelectedVersesJA, organizeByCategory };
}
`;
    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

function loadProgress() {
    if (!fs.existsSync(PROGRESS_FILE)) {
        return {
            annotatedById: {},
            timestamp: null
        };
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        return {
            annotatedById: parsed.annotatedById && typeof parsed.annotatedById === 'object' ? parsed.annotatedById : {},
            timestamp: parsed.timestamp || null
        };
    } catch (err) {
        console.warn('Could not load progress file, starting fresh:', getErrorSummary(err));
        return {
            annotatedById: {},
            timestamp: null
        };
    }
}

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required');
    }

    const inputVerses = loadJapaneseVerses(INPUT_FILE);
    const selectedVerses = limitVersesPerCategory(inputVerses);
    const progress = loadProgress();
    const annotatedById = progress.annotatedById;
    const annotatedMap = indexVersesById(Object.values(annotatedById));
    const annotatedIds = new Set(Object.keys(annotatedById || {}));
    const remainingVerses = selectedVerses.filter(verse => !annotatedIds.has(String(verse.Id)));

    const batches = createAdaptiveBatches(remainingVerses);
    console.log(`Loaded ${selectedVerses.length} verses; ${remainingVerses.length} remaining in ${batches.length} batches`);
    console.log(`Model: ${MODEL} (reasoning effort: ${REASONING_EFFORT})`);
    console.log(`Input: ${INPUT_FILE}`);
    console.log(`Output: ${OUTPUT_FILE}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const label = `batch-${String(batchIndex + 1).padStart(3, '0')}`;
        console.log(`Annotating ${label} (${batch.length} verses, ~${estimatePromptChars(batch)} prompt chars)`);

        const annotatedBatch = await annotateBatch(batch, apiKey, label);

        for (let i = 0; i < batch.length; i++) {
            const sourceVerse = batch[i];
            const annotationVerse = annotatedBatch[i];
            const merged = mergeAnnotation(sourceVerse, annotationVerse);
            annotatedById[String(sourceVerse.Id)] = merged;
            annotatedMap.set(String(sourceVerse.Id), merged);
        }

        saveProgress({
            annotatedById,
            timestamp: new Date().toISOString()
        });

        writeOutputFile(orderAnnotatedVerses(selectedVerses, annotatedMap));
    }

    const ordered = orderAnnotatedVerses(selectedVerses, annotatedMap);
    if (ordered.length !== selectedVerses.length) {
        throw new Error(`Annotation incomplete: expected ${selectedVerses.length} verses but only have ${ordered.length}`);
    }

    writeOutputFile(ordered);
    saveProgress({
        annotatedById,
        timestamp: new Date().toISOString()
    });
    console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('Japanese second pass failed:', getErrorSummary(err));
    process.exit(1);
});
