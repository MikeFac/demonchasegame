/**
 * Translate bible-verses.js to modern Hindi using Gemini API.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/translate-verses-to-hindi.js
 *   GEMINI_API_KEY=your_key node scripts/translate-verses-to-hindi.js --per-category=16
 *
 * Default:
 *   Translates the full verse set so Hindi gameplay has complete content coverage.
 *
 * Outputs: bible-verses-hi.js
 * Progress: .translation-progress-hi.json (supports resume)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { loadSelectedVerses } = require('../bible-verses.js');
const { romanizeHindiText, toAsciiRomanized } = require('./lib/hindiRomanize');

const perCategoryArg = process.argv.find(arg => arg.startsWith('--per-category='));
const targetPromptCharsArg = process.argv.find(arg => arg.startsWith('--target-prompt-chars='));
const hardPromptCharsArg = process.argv.find(arg => arg.startsWith('--hard-prompt-chars='));
const maxBatchVersesArg = process.argv.find(arg => arg.startsWith('--max-batch-verses='));
const romanizedOnly = process.argv.includes('--romanized-only');
const rewriteExisting = process.argv.includes('--rewrite-existing');
const repairCorrupted = process.argv.includes('--repair-corrupted');
const VERSES_PER_CATEGORY = perCategoryArg ? Number.parseInt(perCategoryArg.split('=')[1], 10) : Infinity;
const TARGET_PROMPT_CHARS = targetPromptCharsArg ? Number.parseInt(targetPromptCharsArg.split('=')[1], 10) : 14000;
const HARD_PROMPT_CHARS = hardPromptCharsArg ? Number.parseInt(hardPromptCharsArg.split('=')[1], 10) : 18000;
const MAX_BATCH_VERSES = maxBatchVersesArg ? Number.parseInt(maxBatchVersesArg.split('=')[1], 10) : 8;
const STANDARD_RETRY_LIMIT = 3;
const CAPACITY_RETRY_LIMIT = 24;
const MIN_CAPACITY_BACKOFF_MS = 15000;
const MAX_CAPACITY_BACKOFF_MS = 5 * 60 * 1000;
const CAPACITY_COOLDOWN_RESET_MS = 15 * 60 * 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'bible-verses-hi.js');
const ROMANIZED_OUTPUT_FILE = path.join(__dirname, '..', 'bible-verses-hi-rom.js');
const PROGRESS_FILE = path.join(__dirname, '..', '.translation-progress-hi.json');
const REPAIR_PROGRESS_FILE = path.join(__dirname, '..', '.translation-progress-hi-repair.json');

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
                temperature: 0.25,
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

        req.setTimeout(180000, () => {
            const timeoutError = new Error('Gemini request timed out after 180s');
            timeoutError.code = 'ETIMEDOUT';
            req.destroy(timeoutError);
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function buildTranslationPrompt(verses) {
    const versesJson = JSON.stringify(verses, null, 2);

    return `You are a professional Bible translator fluent in English and Hindi.

Translate the following JSON verses from English into modern standard Hindi in Devanagari script.

BOOK NAME GUIDANCE - use standard Hindi Bible book names in Devanagari:
- Genesis -> उत्पत्ति
- Exodus -> निर्गमन
- Leviticus -> लैव्यव्यवस्था
- Numbers -> गिनती
- Deuteronomy -> व्यवस्थाविवरण
- Joshua -> यहोशू
- Judges -> न्यायियों
- Ruth -> रूत
- Psalms -> भजन संहिता
- Proverbs -> नीतिवचन
- Ecclesiastes -> सभोपदेशक
- Isaiah -> यशायाह
- Jeremiah -> यिर्मयाह
- Lamentations -> विलापगीत
- Ezekiel -> यहेजकेल
- Daniel -> दानिय्येल
- Hosea -> होशे
- Joel -> योएल
- Amos -> आमोस
- Obadiah -> ओबद्याह
- Jonah -> योना
- Micah -> मीका
- Nahum -> नहूम
- Habakkuk -> हबक्कूक
- Zephaniah -> सपन्याह
- Haggai -> हाग्गै
- Zechariah -> जकर्याह
- Malachi -> मलाकी
- Matthew -> मत्ती
- Mark -> मरकुस
- Luke -> लूका
- John -> यूहन्ना
- Acts -> प्रेरितों के काम
- Romans -> रोमियों
- 1 Corinthians -> 1 कुरिन्थियों
- 2 Corinthians -> 2 कुरिन्थियों
- Galatians -> गलतियों
- Ephesians -> इफिसियों
- Philippians -> फिलिप्पियों
- Colossians -> कुलुस्सियों
- 1 Thessalonians -> 1 थिस्सलुनीकियों
- 2 Thessalonians -> 2 थिस्सलुनीकियों
- 1 Timothy -> 1 तीमुथियुस
- 2 Timothy -> 2 तीमुथियुस
- Titus -> तीतुस
- Philemon -> फिलेमोन
- Hebrews -> इब्रानियों
- James -> याकूब
- 1 Peter -> 1 पतरस
- 2 Peter -> 2 पतरस
- 1 John -> 1 यूहन्ना
- 2 John -> 2 यूहन्ना
- 3 John -> 3 यूहन्ना
- Jude -> यहूदा
- Revelation -> प्रकाशितवाक्य

STYLE RULES:
1. Use natural, contemporary Hindi suitable for Indian Christian readers.
2. Use Devanagari script only. Do not use Romanized Hindi.
3. Do not sound archaic or overly Sanskritized unless the verse clearly requires formal gravity.
4. Preserve the meaning closely, but express it as smooth modern Hindi rather than a wooden literal gloss.
5. Also provide a Romanized Hindi transliteration that matches the final Hindi wording closely and is easy for an Indian English-reader to sound out.

DATA RULES:
1. Translate the Text field into Hindi.
2. Add an "EnglishRef" field with the original English Reference value.
3. Translate the Reference field using Hindi Bible book names. Keep chapter:verse numbers unchanged.
4. Add "RomanizedText" with a readable Romanized Hindi transliteration of the final Hindi Text.
5. Add "RomanizedReference" with a Romanized Hindi transliteration of the final Hindi Reference.
6. Keep the Category field UNCHANGED (keep the English key exactly as-is, e.g. "Courage", "Faith").
7. Translate quizData fields:
   - missingWord.question: translate the full sentence into Hindi, keeping the _____ blank exactly as-is
   - missingWord.answer: translate into Hindi
   - missingWord.options: translate all 4 options into Hindi
   - categoryMatch.correctCategory: keep UNCHANGED
   - categoryMatch.distractors: keep UNCHANGED
   - trueFalse.falseCategory: keep UNCHANGED
   - trueFalse.falseReference: translate the book name to Hindi
8. Add a "romanizedQuizData" object:
   - romanizedQuizData.missingWord.question: Romanized Hindi version of the Hindi missing-word question, keeping the _____ blank exactly as-is
   - romanizedQuizData.missingWord.answer: Romanized Hindi version of the Hindi missing-word answer
   - romanizedQuizData.missingWord.options: Romanized Hindi versions of the Hindi missing-word options
   - romanizedQuizData.categoryMatch.correctCategory: keep UNCHANGED
   - romanizedQuizData.categoryMatch.distractors: keep UNCHANGED
   - romanizedQuizData.trueFalse.falseCategory: keep UNCHANGED
   - romanizedQuizData.trueFalse.falseReference: Romanized Hindi version of the Hindi false reference
9. Keep the Id field unchanged.
10. Return ONLY a valid JSON array. No markdown fences, no explanation, no commentary.

QUALITY BAR:
- The output should read like a modern Hindi Bible app, not machine-translated classroom Hindi.
- Prefer widely understandable Hindi vocabulary over niche ecclesiastical jargon.
- Romanization should be practical and readable, not academic transliteration with diacritics.

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
        s += '"';
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

function isCapacityOrQuotaError(err) {
    const message = getErrorSummary(err).toLowerCase();
    return (
        message.includes('quota') ||
        message.includes('rate limit') ||
        message.includes('rate-limit') ||
        message.includes('exceeded your current quota') ||
        message.includes('high demand') ||
        message.includes('resource exhausted') ||
        message.includes('429')
    );
}

function isTransientNetworkError(err) {
    const code = String(err && err.code ? err.code : '').toUpperCase();
    const message = getErrorSummary(err).toLowerCase();
    return (
        ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNABORTED', 'EPIPE', 'ECONNREFUSED'].includes(code) ||
        message.includes('timed out') ||
        message.includes('etimedout') ||
        message.includes('socket hang up') ||
        message.includes('econnreset') ||
        message.includes('eai_again') ||
        message.includes('network') ||
        message.includes('fetch failed')
    );
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
    const fallback = String(err || '').trim();
    return fallback || 'Unknown error';
}

function parseRetryAfterMs(err) {
    const message = String(err && err.message ? err.message : err);
    const retryMatch = message.match(/Please retry in\s+([0-9.]+)\s*(ms|millisecond|milliseconds|s|sec|secs|second|seconds)/i);
    if (retryMatch) {
        const value = Number.parseFloat(retryMatch[1]);
        if (Number.isFinite(value)) {
            const unit = retryMatch[2].toLowerCase();
            return unit.startsWith('ms') ? Math.ceil(value) : Math.ceil(value * 1000);
        }
    }

    const genericSecondsMatch = message.match(/retry in\s+([0-9.]+)s\b/i);
    if (genericSecondsMatch) {
        const value = Number.parseFloat(genericSecondsMatch[1]);
        if (Number.isFinite(value)) {
            return Math.ceil(value * 1000);
        }
    }

    return null;
}

function computeCapacityBackoffMs(err, capacityRetryCount) {
    const hinted = parseRetryAfterMs(err);
    if (hinted !== null) {
        return Math.min(MAX_CAPACITY_BACKOFF_MS, Math.max(MIN_CAPACITY_BACKOFF_MS, hinted + 2000));
    }

    const exponential = MIN_CAPACITY_BACKOFF_MS * Math.pow(1.6, Math.max(0, capacityRetryCount - 1));
    return Math.min(MAX_CAPACITY_BACKOFF_MS, Math.round(exponential));
}

function computeNetworkBackoffMs(networkRetryCount) {
    const exponential = 10000 * Math.pow(1.7, Math.max(0, networkRetryCount - 1));
    return Math.min(2 * 60 * 1000, Math.max(10000, Math.round(exponential)));
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

function indexTranslatedVerses(translatedVerses) {
    const byId = new Map();
    for (const verse of translatedVerses || []) {
        if (verse && typeof verse.Id !== 'undefined') {
            byId.set(verse.Id, verse);
        }
    }
    return byId;
}

function orderTranslatedVerses(selectedVerses, translatedById) {
    return selectedVerses
        .map(function(verse) { return translatedById.get(verse.Id); })
        .filter(Boolean);
}

function hasDevanagari(text) {
    return /[\u0900-\u097F]/.test(String(text || ''));
}

function normalizeRomanizedString(primaryValue, fallbackValue) {
    const primary = typeof primaryValue === 'string' ? primaryValue : '';
    const fallback = typeof fallbackValue === 'string' ? fallbackValue : '';
    const chosen = primary.includes('\uFFFD') ? fallback : (primary || fallback);
    if (!chosen) return chosen;
    return hasDevanagari(chosen)
        ? romanizeHindiText(chosen)
        : toAsciiRomanized(chosen);
}

function normalizeRomanizedArray(primaryValues, fallbackValues) {
    if (Array.isArray(primaryValues) && primaryValues.length > 0) {
        return primaryValues.map(function(value) {
            return normalizeRomanizedString(value, '');
        });
    }
    if (Array.isArray(fallbackValues)) {
        return fallbackValues.map(function(value) {
            return normalizeRomanizedString('', value);
        });
    }
    return fallbackValues;
}

function toHindiVerse(verse) {
    return {
        ...verse,
        // Keep category keys canonical in quiz payloads; localize them at render time.
        quizData: verse.quizData || {},
        romanizedQuizData: verse.romanizedQuizData || {}
    };
}

function writeOutputFile(allVerses) {
    const localizedVerses = allVerses.map(toHindiVerse);
    const content = `function loadSelectedVersesHI() {
  return ${JSON.stringify(localizedVerses, null, 2)};
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
  module.exports = { loadSelectedVersesHI, organizeByCategory };
}
`;
    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
    writeRomanizedOutputFile(localizedVerses);
}

function toRomanizedVerse(verse) {
    const romanizedQuizData = verse.romanizedQuizData || {};
    const romanizedMissingWord = romanizedQuizData.missingWord || {};
    const romanizedCategoryMatch = romanizedQuizData.categoryMatch || {};
    const romanizedTrueFalse = romanizedQuizData.trueFalse || {};
    const quizData = verse.quizData || {};
    const missingWord = quizData.missingWord || null;
    const categoryMatch = quizData.categoryMatch || null;
    const trueFalse = quizData.trueFalse || null;
    const normalizedReference = normalizeRomanizedString(verse.RomanizedReference, verse.Reference);
    const normalizedText = normalizeRomanizedString(verse.RomanizedText, verse.Text);
    const normalizedMissingWord = missingWord
        ? {
            ...missingWord,
            question: normalizeRomanizedString(romanizedMissingWord.question, missingWord.question),
            answer: normalizeRomanizedString(romanizedMissingWord.answer, missingWord.answer),
            options: normalizeRomanizedArray(romanizedMissingWord.options, missingWord.options)
        }
        : missingWord;
    const normalizedCategoryMatch = categoryMatch
        ? {
            ...categoryMatch,
            correctCategory: romanizedCategoryMatch.correctCategory || categoryMatch.correctCategory,
            distractors: Array.isArray(romanizedCategoryMatch.distractors) && romanizedCategoryMatch.distractors.length > 0
                ? romanizedCategoryMatch.distractors
                : categoryMatch.distractors
        }
        : categoryMatch;
    const normalizedTrueFalse = trueFalse
        ? {
            ...trueFalse,
            falseCategory: romanizedTrueFalse.falseCategory || trueFalse.falseCategory,
            falseReference: normalizeRomanizedString(romanizedTrueFalse.falseReference, trueFalse.falseReference)
        }
        : trueFalse;

    const romanizedQuizPayload = {
        missingWord: normalizedMissingWord
            ? {
                question: normalizedMissingWord.question,
                answer: normalizedMissingWord.answer,
                options: normalizedMissingWord.options
            }
            : undefined,
        categoryMatch: normalizedCategoryMatch
            ? {
                correctCategory: normalizedCategoryMatch.correctCategory,
                distractors: normalizedCategoryMatch.distractors
            }
            : undefined,
        trueFalse: normalizedTrueFalse
            ? {
                falseCategory: normalizedTrueFalse.falseCategory,
                falseReference: normalizedTrueFalse.falseReference
            }
            : undefined
    };

    return {
        ...verse,
        Reference: normalizedReference,
        Text: normalizedText,
        RomanizedReference: normalizedReference,
        RomanizedText: normalizedText,
        romanizedQuizData: romanizedQuizPayload,
        quizData: {
            ...quizData,
            missingWord: normalizedMissingWord,
            categoryMatch: normalizedCategoryMatch,
            trueFalse: normalizedTrueFalse
        }
    };
}

function writeRomanizedOutputFile(allVerses) {
    const romanizedVerses = allVerses.map(toRomanizedVerse);
    const content = `function loadSelectedVersesHIRom() {
  return ${JSON.stringify(romanizedVerses, null, 2)};
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
  module.exports = { loadSelectedVersesHIRom, organizeByCategory };
}
`;
    fs.writeFileSync(ROMANIZED_OUTPUT_FILE, content, 'utf8');
}

function saveProgress(selectedVerses, translatedById, options) {
    const progressFile = options && options.progressFile ? options.progressFile : PROGRESS_FILE;
    const writeVerses = options && Array.isArray(options.writeVerses) ? options.writeVerses : null;
    const translatedVerses = orderTranslatedVerses(selectedVerses, translatedById);
    fs.writeFileSync(progressFile, JSON.stringify({
        translatedVerses,
        completedVerseIds: translatedVerses.map(function(verse) { return verse.Id; }),
        timestamp: new Date().toISOString()
    }, null, 2), 'utf8');
    writeOutputFile(writeVerses || translatedVerses);
}

function loadProgress(progressFile) {
    const file = progressFile || PROGRESS_FILE;
    if (fs.existsSync(file)) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            const completedVerseIds = Array.isArray(data.completedVerseIds)
                ? data.completedVerseIds
                : Array.isArray(data.translatedVerses)
                    ? data.translatedVerses.map(function(verse) { return verse.Id; })
                    : [];
            console.log(`Resuming from progress file ${path.basename(file)}: ${completedVerseIds.length} verses done`);
            return data;
        } catch (e) {
            console.log(`Could not load progress file ${path.basename(file)}, starting fresh`);
        }
    }
    return { translatedVerses: [], completedVerseIds: [] };
}

function loadExistingHindiBundle() {
    if (!fs.existsSync(OUTPUT_FILE)) {
        throw new Error(`Cannot rebuild Romanized bundle because ${OUTPUT_FILE} does not exist`);
    }

    delete require.cache[require.resolve(OUTPUT_FILE)];
    const loaded = require(OUTPUT_FILE);
    if (!loaded || typeof loaded.loadSelectedVersesHI !== 'function') {
        throw new Error(`Could not load loadSelectedVersesHI() from ${OUTPUT_FILE}`);
    }
    return loaded.loadSelectedVersesHI();
}

async function translateBatch(batch, apiKey, batchLabel) {
    const prompt = buildTranslationPrompt(batch);
    let translated = null;
    let standardAttempt = 0;
    let capacityRetryCount = 0;
    let networkRetryCount = 0;

    while (standardAttempt < STANDARD_RETRY_LIMIT) {
        try {
            const response = await callGemini(prompt, apiKey);
            translated = parseGeminiResponse(response);
            if (!Array.isArray(translated) || translated.length !== batch.length) {
                throw new Error(`Model returned ${Array.isArray(translated) ? translated.length : 0} verses for a ${batch.length}-verse batch`);
            }
            return translated;
        } catch (err) {
            const errorSummary = getErrorSummary(err);
            if (isCapacityOrQuotaError(err)) {
                capacityRetryCount++;
                const backoffMs = computeCapacityBackoffMs(err, capacityRetryCount);
                console.error(`  Capacity retry ${capacityRetryCount}/${CAPACITY_RETRY_LIMIT} for ${batchLabel}: ${errorSummary}`);
                if (capacityRetryCount >= CAPACITY_RETRY_LIMIT) {
                    console.log(`  Capacity retries exhausted for ${batchLabel}. Cooling down for ${Math.ceil(CAPACITY_COOLDOWN_RESET_MS / 60000)} minutes, then retrying the same batch.`);
                    await sleep(CAPACITY_COOLDOWN_RESET_MS);
                    capacityRetryCount = 0;
                    continue;
                }
                console.log(`  Waiting ${Math.ceil(backoffMs / 1000)}s before retrying ${batchLabel} without splitting`);
                await sleep(backoffMs);
                continue;
            }
            if (isTransientNetworkError(err)) {
                networkRetryCount++;
                const backoffMs = computeNetworkBackoffMs(networkRetryCount);
                console.error(`  Network retry ${networkRetryCount}/${CAPACITY_RETRY_LIMIT} for ${batchLabel}: ${errorSummary}`);
                if (networkRetryCount >= CAPACITY_RETRY_LIMIT) {
                    console.log(`  Network retries exhausted for ${batchLabel}. Cooling down for ${Math.ceil(CAPACITY_COOLDOWN_RESET_MS / 60000)} minutes, then retrying the same batch.`);
                    await sleep(CAPACITY_COOLDOWN_RESET_MS);
                    networkRetryCount = 0;
                    continue;
                }
                console.log(`  Waiting ${Math.ceil(backoffMs / 1000)}s before retrying ${batchLabel} without splitting`);
                await sleep(backoffMs);
                continue;
            }

            standardAttempt++;
            console.error(`  Attempt ${standardAttempt}/${STANDARD_RETRY_LIMIT} failed for ${batchLabel}: ${errorSummary}`);
            if (standardAttempt >= STANDARD_RETRY_LIMIT) {
                break;
            }
            await sleep(3000 * standardAttempt);
        }
    }

    if (batch.length === 1) {
        throw new Error(`Single-verse batch failed for ${batchLabel}`);
    }

    const midpoint = Math.ceil(batch.length / 2);
    const left = batch.slice(0, midpoint);
    const right = batch.slice(midpoint);
    console.log(`  Splitting ${batchLabel} into ${left.length} + ${right.length} verses for retry`);

    const leftTranslated = await translateBatch(left, apiKey, `${batchLabel}a`);
    await sleep(1200);
    const rightTranslated = await translateBatch(right, apiKey, `${batchLabel}b`);
    return leftTranslated.concat(rightTranslated);
}

async function main() {
    if (rewriteExisting) {
        const existingHindiVerses = loadExistingHindiBundle();
        writeOutputFile(existingHindiVerses);
        console.log(`Rewrote Hindi and Romanized Hindi bundles from ${OUTPUT_FILE}`);
        console.log(`Wrote ${existingHindiVerses.length} verses to ${OUTPUT_FILE}`);
        console.log(`Wrote ${existingHindiVerses.length} verses to ${ROMANIZED_OUTPUT_FILE}`);
        return;
    }

    if (romanizedOnly) {
        const existingHindiVerses = loadExistingHindiBundle();
        writeRomanizedOutputFile(existingHindiVerses);
        console.log(`Rebuilt Romanized Hindi bundle from ${OUTPUT_FILE}`);
        console.log(`Wrote ${existingHindiVerses.length} verses to ${ROMANIZED_OUTPUT_FILE}`);
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY environment variable required');
        process.exit(1);
    }

    if (perCategoryArg && (!Number.isFinite(VERSES_PER_CATEGORY) || VERSES_PER_CATEGORY <= 0)) {
        console.error('Error: --per-category must be a positive integer');
        process.exit(1);
    }
    if (!Number.isFinite(TARGET_PROMPT_CHARS) || TARGET_PROMPT_CHARS < 4000) {
        console.error('Error: --target-prompt-chars must be an integer >= 4000');
        process.exit(1);
    }
    if (!Number.isFinite(HARD_PROMPT_CHARS) || HARD_PROMPT_CHARS < TARGET_PROMPT_CHARS) {
        console.error('Error: --hard-prompt-chars must be an integer >= target prompt chars');
        process.exit(1);
    }
    if (!Number.isFinite(MAX_BATCH_VERSES) || MAX_BATCH_VERSES < 1) {
        console.error('Error: --max-batch-verses must be a positive integer');
        process.exit(1);
    }

    const allVerses = loadSelectedVerses();
    console.log(`Loaded ${allVerses.length} total verses`);
    console.log(`Using model: gemini-2.5-flash`);

    let selectedVerses = [];
    let translatedById = null;
    let progressTranslatedById = null;
    let progress = null;
    let completedVerseIds = null;
    let remainingVerses = [];
    let progressFile = PROGRESS_FILE;
    let writeVersesResolver = null;

    if (repairCorrupted) {
        const existingHindiVerses = loadExistingHindiBundle();
        const existingById = indexTranslatedVerses(existingHindiVerses);
        const corruptedIds = new Set(
            existingHindiVerses
                .filter(function(verse) { return JSON.stringify(verse).includes('\uFFFD'); })
                .map(function(verse) { return verse.Id; })
        );
        selectedVerses = allVerses.filter(function(verse) {
            return corruptedIds.has(verse.Id);
        });
        progressFile = REPAIR_PROGRESS_FILE;
        progress = loadProgress(progressFile);
        translatedById = existingById;
        progressTranslatedById = new Map();
        completedVerseIds = new Set();
        remainingVerses = selectedVerses.slice();
        writeVersesResolver = function() {
            return allVerses.map(function(verse) { return translatedById.get(verse.Id); }).filter(Boolean);
        };

        console.log(`Repair mode: found ${selectedVerses.length} corrupted verses in ${OUTPUT_FILE}`);
        if (progress.translatedVerses && progress.translatedVerses.length > 0) {
            console.log(`Repair history file contains ${progress.translatedVerses.length} previously attempted verses; retry selection is based on current bundle corruption only.`);
        }
    } else {
        const grouped = groupByCategory(allVerses);
        const categories = Object.keys(grouped).sort();
        console.log(`Found ${categories.length} categories`);

        for (const cat of categories) {
            const catVerses = grouped[cat].slice(0, VERSES_PER_CATEGORY);
            selectedVerses.push(...catVerses);
            console.log(`  ${cat}: ${catVerses.length} verses`);
        }

        progress = loadProgress(progressFile);
        translatedById = indexTranslatedVerses(progress.translatedVerses || []);
        progressTranslatedById = translatedById;
        completedVerseIds = new Set(
            Array.isArray(progress.completedVerseIds)
                ? progress.completedVerseIds
                : Array.from(translatedById.keys())
        );
        remainingVerses = selectedVerses.filter(function(verse) {
            return !completedVerseIds.has(verse.Id);
        });
        writeVersesResolver = function() {
            return orderTranslatedVerses(selectedVerses, translatedById);
        };
    }

    const batches = createAdaptiveBatches(remainingVerses);

    console.log(`Adaptive batching: ${batches.length} batches for ${remainingVerses.length} remaining verses`);
    console.log(`Batch constraints: target=${TARGET_PROMPT_CHARS} chars, hard=${HARD_PROMPT_CHARS} chars, maxVerses=${MAX_BATCH_VERSES}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const promptChars = estimatePromptChars(batch);
        const batchLabel = `batch ${batchIndex + 1}/${batches.length}`;

        console.log(`Translating ${batchLabel}: ${batch.length} verses, prompt ~${promptChars} chars`);
        console.log(`  ${batch.map(v => v.Reference).join('; ')}`);

        const translated = await translateBatch(batch, apiKey, batchLabel);

        for (const verse of translated) {
            translatedById.set(verse.Id, verse);
            progressTranslatedById.set(verse.Id, verse);
            completedVerseIds.add(verse.Id);
        }
        saveProgress(
            selectedVerses,
            progressTranslatedById,
            {
                progressFile,
                writeVerses: writeVersesResolver()
            }
        );
        console.log(`  Saved progress: ${completedVerseIds.size}/${selectedVerses.length} verses translated`);

        await sleep(1500);
    }

    console.log(`Done. Wrote ${writeVersesResolver().length} translated verses to ${OUTPUT_FILE}`);
    console.log(`Also wrote Romanized Hindi bundle to ${ROMANIZED_OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
