/**
 * Translate bible-verses.js to natural Japanese using the OpenRouter API.
 *
 * Usage:
 *   OPENROUTER_API_KEY=your_key node scripts/translate-verses-to-japanese.js
 *   OPENROUTER_API_KEY=your_key node scripts/translate-verses-to-japanese.js --per-category=12
 *
 * Default:
 *   Translates up to 10 verses per category, or 20 for Good News, with
 *   adaptive batching so the output can be compared cleanly against the
 *   OpenAI-generated Japanese bundle.
 *
 * Outputs: bible-verses-deepseek-v4-pro.ja.js
 * Progress: .translation-progress-deepseek-v4-pro.ja.json (supports resume)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { loadSelectedVerses } = require('../bible-verses.js');

const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-pro';
const REASONING_EFFORT = process.env.OPENROUTER_REASONING_EFFORT || 'high';
const perCategoryArg = process.argv.find(arg => arg.startsWith('--per-category='));
const goodNewsArg = process.argv.find(arg => arg.startsWith('--good-news='));
const targetPromptCharsArg = process.argv.find(arg => arg.startsWith('--target-prompt-chars='));
const hardPromptCharsArg = process.argv.find(arg => arg.startsWith('--hard-prompt-chars='));
const maxBatchVersesArg = process.argv.find(arg => arg.startsWith('--max-batch-verses='));
const DEFAULT_VERSES_PER_CATEGORY = 10;
const DEFAULT_GOOD_NEWS_LIMIT = 20;
const VERSES_PER_CATEGORY = perCategoryArg ? Number.parseInt(perCategoryArg.split('=')[1], 10) : DEFAULT_VERSES_PER_CATEGORY;
const GOOD_NEWS_VERSES = goodNewsArg ? Number.parseInt(goodNewsArg.split('=')[1], 10) : DEFAULT_GOOD_NEWS_LIMIT;
const TARGET_PROMPT_CHARS = targetPromptCharsArg ? Number.parseInt(targetPromptCharsArg.split('=')[1], 10) : 14000;
const HARD_PROMPT_CHARS = hardPromptCharsArg ? Number.parseInt(hardPromptCharsArg.split('=')[1], 10) : 18000;
const MAX_BATCH_VERSES = maxBatchVersesArg ? Number.parseInt(maxBatchVersesArg.split('=')[1], 10) : 8;
function slugifyModel(model) {
    return String(model || 'translation')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const MODEL_TAG = MODEL.includes('/') ? MODEL.split('/').slice(1).join('-') : MODEL;
const MODEL_SLUG = slugifyModel(MODEL_TAG);
const OUTPUT_BASENAME = process.env.TRANSLATION_OUTPUT_BASENAME || `bible-verses-${MODEL_SLUG}.ja`;
const OUTPUT_FILE = path.join(__dirname, '..', `${OUTPUT_BASENAME}.js`);
const PROGRESS_FILE = path.join(__dirname, '..', `.translation-progress-${MODEL_SLUG}.ja.json`);
const STANDARD_RETRY_LIMIT = 3;
const MIN_BACKOFF_MS = 8000;
const MAX_BACKOFF_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 180000;
const OPENROUTER_TRANSLATION_GUIDANCE = 'Translate these World English Bible verses into natural, reverent, modern Japanese suitable for Japanese young people. Preserve biblical meaning, avoid paraphrase, avoid copying copyrighted Japanese Bible translations, and use 口語訳1955 only as a public-domain reference for meaning and terminology.';
const JAPANESE_GLOSSARY = [
    ['God', '神'],
    ['Lord', '主'],
    ['Holy Spirit', '聖霊'],
    ['disciple', '弟子'],
    ['kingdom of God', '神の国'],
    ['repent', '悔い改める'],
    ['sin', '罪'],
    ['salvation', '救い'],
    ['eternal life', '永遠の命']
];

function loadEnvFromDotenv() {
    const dotenvPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(dotenvPath)) {
        if (process.env.OPENROUTER_API_KEY) {
            process.env.OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY).trim();
        }
        return;
    }

    const lines = fs.readFileSync(dotenvPath, 'utf8').replace(/\r/g, '').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex <= 0) {
            continue;
        }

        const key = trimmed.slice(0, equalsIndex).trim();
        let value = trimmed.slice(equalsIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }

    if (process.env.OPENROUTER_API_KEY) {
        process.env.OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY).trim();
    }
}

loadEnvFromDotenv();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function limitVersesPerCategory(verses) {
    const counts = new Map();
    const selected = [];
    for (const verse of verses) {
        const category = verse && verse.Category ? verse.Category : '';
        const seen = counts.get(category) || 0;
        const limit = category === 'Good News' ? GOOD_NEWS_VERSES : VERSES_PER_CATEGORY;
        if (seen < limit) {
            selected.push(verse);
            counts.set(category, seen + 1);
        }
    }
    return selected;
}

function buildJapaneseBookName(reference) {
    const match = String(reference || '').trim().match(/^(.+?)\s+(\d+:\d+(?:-\d+(?::\d+)?)?)$/);
    if (!match) {
        return String(reference || '').trim();
    }

    const book = match[1];
    const chapter = match[2];
    const verse = match[3];

    const bookMap = {
        Genesis: '創世記',
        Exodus: '出エジプト記',
        Leviticus: 'レビ記',
        Numbers: '民数記',
        Deuteronomy: '申命記',
        Joshua: 'ヨシュア記',
        Judges: '士師記',
        Ruth: 'ルツ記',
        '1 Samuel': 'サムエル記上',
        '2 Samuel': 'サムエル記下',
        '1 Kings': '列王記上',
        '2 Kings': '列王記下',
        '1 Chronicles': '歴代誌上',
        '2 Chronicles': '歴代誌下',
        Ezra: 'エズラ記',
        Nehemiah: 'ネヘミヤ記',
        Esther: 'エステル記',
        Job: 'ヨブ記',
        Psalms: '詩篇',
        Proverbs: '箴言',
        Ecclesiastes: '伝道者の書',
        'Song of Solomon': '雅歌',
        Isaiah: 'イザヤ書',
        Jeremiah: 'エレミヤ書',
        Lamentations: '哀歌',
        Ezekiel: 'エゼキエル書',
        Daniel: 'ダニエル書',
        Hosea: 'ホセア書',
        Joel: 'ヨエル書',
        Amos: 'アモス書',
        Obadiah: 'オバデヤ書',
        Jonah: 'ヨナ書',
        Micah: 'ミカ書',
        Nahum: 'ナホム書',
        Habakkuk: 'ハバクク書',
        Zephaniah: 'ゼパニヤ書',
        Haggai: 'ハガイ書',
        Zechariah: 'ゼカリヤ書',
        Malachi: 'マラキ書',
        Matthew: 'マタイの福音書',
        Mark: 'マルコの福音書',
        Luke: 'ルカの福音書',
        John: 'ヨハネの福音書',
        Acts: '使徒の働き',
        Romans: 'ローマ人への手紙',
        '1 Corinthians': 'コリント人への手紙第一',
        '2 Corinthians': 'コリント人への手紙第二',
        Galatians: 'ガラテヤ人への手紙',
        Ephesians: 'エペソ人への手紙',
        Philippians: 'ピリピ人への手紙',
        Colossians: 'コロサイ人への手紙',
        '1 Thessalonians': 'テサロニケ人への手紙第一',
        '2 Thessalonians': 'テサロニケ人への手紙第二',
        '1 Timothy': 'テモテへの手紙第一',
        '2 Timothy': 'テモテへの手紙第二',
        Titus: 'テトスへの手紙',
        Philemon: 'ピレモンへの手紙',
        Hebrews: 'ヘブル人への手紙',
        James: 'ヤコブの手紙',
        '1 Peter': 'ペテロの手紙第一',
        '2 Peter': 'ペテロの手紙第二',
        '1 John': 'ヨハネの手紙第一',
        '2 John': 'ヨハネの手紙第二',
        '3 John': 'ヨハネの手紙第三',
        Jude: 'ユダの手紙',
        Revelation: 'ヨハネの黙示録'
    };

    const japaneseBook = bookMap[book] || book;
    return `${japaneseBook} ${chapter}:${verse}`;
}

function buildTranslationPrompt(verses) {
    const versesJson = JSON.stringify(verses, null, 2);
    const glossaryLines = JAPANESE_GLOSSARY
        .map(([source, target]) => `- ${source} -> ${target}`)
        .join('\n');

    return `${OPENROUTER_TRANSLATION_GUIDANCE}

Translate the following JSON verses from English into Japanese.

GLOSSARY - use these preferred renderings consistently whenever the English source matches the concept:
${glossaryLines}

Glossary usage rules:
- Treat these as canonical renderings throughout Text, Reference-adjacent terminology, and quizData.
- Keep the same base term whenever possible rather than swapping in near-synonyms.
- Inflect naturally for Japanese grammar when needed, but do not change the underlying glossary term.
- Example: use 主よ, 神の, and 聖霊の when grammar requires a suffix, but do not replace 主 with different words.

BOOK NAME GUIDANCE - use standard Japanese Bible book names:
- Genesis -> 創世記
- Exodus -> 出エジプト記
- Leviticus -> レビ記
- Numbers -> 民数記
- Deuteronomy -> 申命記
- Joshua -> ヨシュア記
- Judges -> 士師記
- Ruth -> ルツ記
- 1 Samuel -> サムエル記上
- 2 Samuel -> サムエル記下
- 1 Kings -> 列王記上
- 2 Kings -> 列王記下
- 1 Chronicles -> 歴代誌上
- 2 Chronicles -> 歴代誌下
- Ezra -> エズラ記
- Nehemiah -> ネヘミヤ記
- Esther -> エステル記
- Job -> ヨブ記
- Psalms -> 詩篇
- Proverbs -> 箴言
- Ecclesiastes -> 伝道者の書
- Song of Solomon -> 雅歌
- Isaiah -> イザヤ書
- Jeremiah -> エレミヤ書
- Lamentations -> 哀歌
- Ezekiel -> エゼキエル書
- Daniel -> ダニエル書
- Hosea -> ホセア書
- Joel -> ヨエル書
- Amos -> アモス書
- Obadiah -> オバデヤ書
- Jonah -> ヨナ書
- Micah -> ミカ書
- Nahum -> ナホム書
- Habakkuk -> ハバクク書
- Zephaniah -> ゼパニヤ書
- Haggai -> ハガイ書
- Zechariah -> ゼカリヤ書
- Malachi -> マラキ書
- Matthew -> マタイの福音書
- Mark -> マルコの福音書
- Luke -> ルカの福音書
- John -> ヨハネの福音書
- Acts -> 使徒の働き
- Romans -> ローマ人への手紙
- 1 Corinthians -> コリント人への手紙第一
- 2 Corinthians -> コリント人への手紙第二
- Galatians -> ガラテヤ人への手紙
- Ephesians -> エペソ人への手紙
- Philippians -> ピリピ人への手紙
- Colossians -> コロサイ人への手紙
- 1 Thessalonians -> テサロニケ人への手紙第一
- 2 Thessalonians -> テサロニケ人への手紙第二
- 1 Timothy -> テモテへの手紙第一
- 2 Timothy -> テモテへの手紙第二
- Titus -> テトスへの手紙
- Philemon -> ピレモンへの手紙
- Hebrews -> ヘブル人への手紙
- James -> ヤコブの手紙
- 1 Peter -> ペテロの手紙第一
- 2 Peter -> ペテロの手紙第二
- 1 John -> ヨハネの手紙第一
- 2 John -> ヨハネの手紙第二
- 3 John -> ヨハネの手紙第三
- Jude -> ユダの手紙
- Revelation -> ヨハネの黙示録

DATA RULES:
1. Translate the Text field into natural Japanese.
2. Add an "EnglishRef" field by copying the original English Reference value exactly.
3. Translate the Reference field using Japanese Bible book names, but keep the chapter:verse digits unchanged and never swap in a nearby verse.
4. Keep the Category field UNCHANGED. Preserve the English category key exactly as-is.
5. Translate quizData fields:
   - missingWord.question: translate the full sentence into Japanese, keeping the _____ blank exactly as-is
   - missingWord.answer: translate into Japanese
   - missingWord.options: translate all options into Japanese
   - categoryMatch.correctCategory: keep UNCHANGED
   - categoryMatch.distractors: keep UNCHANGED
   - trueFalse.falseCategory: keep UNCHANGED
   - trueFalse.falseReference: preserve the chapter and verse exactly; translate only the book name to Japanese
6. Keep the Id field unchanged.
7. Preserve item order and return the same number of verses as input.
8. Return ONLY a valid JSON array. No markdown fences, no explanation, no commentary.

QUALITY BAR:
- The output should read like a modern Japanese Bible app, not machine translation.
- Prefer natural, reverent Japanese over literal word-for-word English syntax.
- Avoid paraphrase.
- Avoid copying any copyrighted Japanese Bible translation verbatim.
- If a standard biblical term exists in 口語訳1955, use it as a public-domain reference for meaning and terminology, but still write the sentence naturally.
- Keep the glossary terms stable across the entire batch.
- Do not invent, fix, or paraphrase any verse references. If a field contains a verse reference, preserve the chapter and verse digits exactly as provided in the source.
- There are two reference forms in the final bundle: EnglishRef is the original English reference copied from source, and Reference is the translated Japanese reference for the same verse.
- Do not create any other reference-like fields or alter the verse numbers in either reference field.

VERSES TO TRANSLATE:
${versesJson}

Return the translated JSON array:`;
}

function stripCodeFences(text) {
    let jsonStr = String(text || '').trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
    }
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

function estimatePromptChars(verses) {
    return buildTranslationPrompt(verses).length;
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
    if (typeof err.message === 'string' && err.message.trim()) {
        return err.message.trim();
    }
    if (typeof err.code === 'string' && err.code.trim()) {
        return err.code.trim();
    }
    if (typeof err.name === 'string' && err.name.trim()) {
        return err.name.trim();
    }
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

async function callOpenRouter(prompt, apiKey) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a careful Bible translation editor. Follow the user instructions exactly. Return only valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            reasoning: {
                effort: REASONING_EFFORT
            },
            max_completion_tokens: 16384
        });

        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        if (process.env.OPENROUTER_HTTP_REFERER) {
            options.headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
        }
        if (process.env.OPENROUTER_X_TITLE) {
            options.headers['X-Title'] = process.env.OPENROUTER_X_TITLE;
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        const error = new Error(json.error?.message || `OpenRouter API error ${res.statusCode}`);
                        error.statusCode = res.statusCode || 500;
                        error.details = json;
                        reject(error);
                        return;
                    }

                    const text = json.choices?.[0]?.message?.content || '';
                    resolve(text);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.setTimeout(REQUEST_TIMEOUT_MS, () => {
            const timeoutError = new Error('OpenRouter request timed out');
            timeoutError.code = 'ETIMEDOUT';
            req.destroy(timeoutError);
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function translateBatch(batch, apiKey, label) {
    const prompt = buildTranslationPrompt(batch);
    let lastError = null;

    for (let attempt = 1; attempt <= STANDARD_RETRY_LIMIT; attempt++) {
        try {
            const text = await callOpenRouter(prompt, apiKey);
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
            if (!retryable || attempt === STANDARD_RETRY_LIMIT) {
                break;
            }
            await sleep(backoffMs(attempt));
        }
    }

    throw lastError || new Error(`Batch ${label} failed`);
}

function normalizeTranslatedVerse(sourceVerse, translatedVerse) {
    const sourceQuiz = sourceVerse.quizData && typeof sourceVerse.quizData === 'object'
        ? sourceVerse.quizData
        : undefined;
    const translatedQuiz = translatedVerse.quizData && typeof translatedVerse.quizData === 'object'
        ? translatedVerse.quizData
        : undefined;
    const quizData = translatedQuiz || sourceQuiz
        ? JSON.parse(JSON.stringify(translatedQuiz || sourceQuiz))
        : undefined;
    if (quizData && quizData.trueFalse && sourceQuiz && sourceQuiz.trueFalse && sourceQuiz.trueFalse.falseReference) {
        quizData.trueFalse = {
            ...quizData.trueFalse,
            falseReference: buildJapaneseBookName(sourceQuiz.trueFalse.falseReference)
        };
    }

    return {
        ...sourceVerse,
        ...translatedVerse,
        Id: sourceVerse.Id,
        Category: sourceVerse.Category,
        EnglishRef: sourceVerse.Reference,
        Reference: translatedVerse.Reference || buildJapaneseBookName(sourceVerse.Reference),
        Text: translatedVerse.Text || sourceVerse.Text,
        quizData
    };
}

function indexTranslatedVerses(translatedVerses) {
    const map = new Map();
    for (const verse of translatedVerses || []) {
        if (verse && typeof verse.Id !== 'undefined' && verse.Id !== null) {
            map.set(String(verse.Id), verse);
        }
    }
    return map;
}

function orderTranslatedVerses(selectedVerses, translatedById) {
    return selectedVerses
        .map(function(verse) {
            return translatedById.get(String(verse.Id));
        })
        .filter(Boolean);
}

function assignCategoryFalseReferences(verses) {
    const grouped = new Map();
    const categories = [...new Set(verses.map(verse => verse && verse.Category ? verse.Category : ''))].filter(Boolean).sort();

    verses.forEach((verse, index) => {
        const category = verse && verse.Category ? verse.Category : '';
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category).push({ verse, index });
    });

    const output = verses.map(verse => JSON.parse(JSON.stringify(verse)));

    for (const entries of grouped.values()) {
        if (entries.length < 2) {
            continue;
        }

        for (let i = 0; i < entries.length; i++) {
            const current = entries[i];
            const next = entries[(i + 1) % entries.length];
            const currentVerse = output[current.index];
            const nextVerse = output[next.index];
            const fallbackCategory = categories.find(cat => cat !== currentVerse.Category) || currentVerse.Category;

            if (!currentVerse.quizData || typeof currentVerse.quizData !== 'object') {
                currentVerse.quizData = {
                    trueFalse: {
                        falseCategory: fallbackCategory,
                        falseReference: nextVerse.Reference
                    }
                };
                continue;
            }
            if (!currentVerse.quizData.trueFalse || typeof currentVerse.quizData.trueFalse !== 'object') {
                currentVerse.quizData.trueFalse = {
                    falseCategory: fallbackCategory,
                    falseReference: nextVerse.Reference
                };
                continue;
            }

            currentVerse.quizData.trueFalse = {
                ...currentVerse.quizData.trueFalse,
                falseReference: nextVerse.Reference
            };
        }
    }

    return output;
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
            translatedById: {},
            timestamp: null
        };
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        return {
            translatedById: parsed.translatedById && typeof parsed.translatedById === 'object' ? parsed.translatedById : {},
            timestamp: parsed.timestamp || null
        };
    } catch (err) {
        console.warn('Could not load progress file, starting fresh:', getErrorSummary(err));
        return {
            translatedById: {},
            timestamp: null
        };
    }
}

function markProgress(translatedById) {
    saveProgress({
        translatedById,
        timestamp: new Date().toISOString()
    });
}

async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is required');
    }

    const allVerses = loadSelectedVerses();
    const selectedVerses = limitVersesPerCategory(allVerses);
    const progress = loadProgress();
    const translatedById = progress.translatedById;
    const translatedMap = indexTranslatedVerses(Object.values(translatedById));
    const translatedIds = new Set(Object.keys(translatedById || {}));
    const remainingVerses = selectedVerses.filter(function(verse) {
        return !translatedIds.has(String(verse.Id));
    });

    const batches = createAdaptiveBatches(remainingVerses);
    console.log(`Loaded ${selectedVerses.length} verses; ${remainingVerses.length} remaining in ${batches.length} batches`);
    console.log(`Model: ${MODEL} (reasoning effort: ${REASONING_EFFORT})`);
    console.log(`Selected output: ${OUTPUT_FILE}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const label = `batch-${String(batchIndex + 1).padStart(3, '0')}`;
        console.log(`Translating ${label} (${batch.length} verses, ~${estimatePromptChars(batch)} prompt chars)`);

        const translatedBatch = await translateBatch(batch, apiKey, label);

        for (let i = 0; i < batch.length; i++) {
            const sourceVerse = batch[i];
            const translatedVerse = translatedBatch[i];
            const normalized = normalizeTranslatedVerse(sourceVerse, translatedVerse);
            translatedById[String(sourceVerse.Id)] = normalized;
            translatedMap.set(String(sourceVerse.Id), normalized);
        }

        markProgress(translatedById);
        writeOutputFile(orderTranslatedVerses(selectedVerses, translatedMap));
    }

    const ordered = orderTranslatedVerses(selectedVerses, translatedMap);
    if (ordered.length !== selectedVerses.length) {
        throw new Error(`Translation incomplete: expected ${selectedVerses.length} verses but only have ${ordered.length}`);
    }

    const finalized = assignCategoryFalseReferences(ordered);
    writeOutputFile(finalized);
    saveProgress({
        translatedById,
        timestamp: new Date().toISOString()
    });
    console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('Japanese translation failed:', getErrorSummary(err));
    process.exit(1);
});
