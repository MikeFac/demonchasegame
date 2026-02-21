#!/usr/bin/env node

/**
 * generate_content.js
 *
 * Generates Bible verse content by topic using AI via OpenRouter.
 * Outputs CSV or JSON suitable for the Custom Game Content tab.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... node scripts/generate_content.js [options]
 *
 * Options:
 *   --topics "topic1,topic2,..."  Categories to generate (required)
 *   --count N                     Verses per topic (default: 10)
 *   --seed path/to/seed.csv       Optional CSV of existing verses to build on
 *   --output path                 Output file (default: stdout)
 *   --model NAME                  OpenRouter model (default: google/gemini-2.0-flash-001)
 *   --format csv|json             Output format (default: csv)
 *   --dry-run                     Show prompts without calling API
 */

const fs = require('fs');
const path = require('path');

// --- CLI arg parsing (reused from generate_ai_quizzes.js) ---
const args = process.argv.slice(2);

function getArg(name, defaultVal) {
    const idx = args.indexOf('--' + name);
    if (idx === -1) return defaultVal;
    return args[idx + 1] || defaultVal;
}

function hasFlag(name) {
    return args.includes('--' + name);
}

const TOPICS = getArg('topics', '');
const COUNT = parseInt(getArg('count', '10'), 10);
const SEED_FILE = getArg('seed', '');
const OUTPUT_FILE = getArg('output', '');
const MODEL = getArg('model', 'google/gemini-2.0-flash-001');
const FORMAT = getArg('format', 'csv');
const DRY_RUN = hasFlag('dry-run');

if (!TOPICS) {
    console.error('Error: --topics is required');
    console.error('Usage: node scripts/generate_content.js --topics "anxiety,marriage,finances" [--count 10]');
    process.exit(1);
}

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY && !DRY_RUN) {
    console.error('Error: Set OPENROUTER_API_KEY environment variable');
    console.error('  Get one at https://openrouter.ai/keys');
    process.exit(1);
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// --- API call (reused pattern from generate_ai_quizzes.js) ---
async function callOpenRouter(prompt) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dcgame.4you.tel',
            'X-Title': 'DC Game Content Generator'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a Bible scholar. You provide real, accurate Bible verses. Return ONLY the JSON array, no markdown fences, no extra text.'
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

// --- Response parsing (reused from generate_ai_quizzes.js) ---
function parseResponse(responseText) {
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error(`Failed to parse JSON response: ${e.message}\nFirst 500 chars: ${cleaned.substring(0, 500)}`);
    }
}

// --- Seed file loading ---
function loadSeedVerses(seedPath) {
    if (!seedPath || !fs.existsSync(seedPath)) return [];

    const content = fs.readFileSync(seedPath, 'utf8');
    const ext = path.extname(seedPath).toLowerCase();

    if (ext === '.json') {
        return JSON.parse(content);
    }

    // Parse CSV
    return parseCSV(content);
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const verses = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = values[idx]; });
        if (row.Reference && row.Text && row.Category) {
            verses.push(row);
        }
    }

    return verses;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                values.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    values.push(current.trim());
    return values;
}

// --- Prompt builder ---
function buildPrompt(topic, count, seedVerses) {
    let seedContext = '';
    if (seedVerses.length > 0) {
        const examples = seedVerses.slice(0, 5).map(v =>
            `  - ${v.Reference}: "${v.Text}" (${v.Category})`
        ).join('\n');
        seedContext = `\nHere are example verses showing the format and style desired:\n${examples}\n`;
    }

    return `Provide ${count} real, accurate Bible verses about the topic "${topic}".
${seedContext}
Requirements:
- Each verse must be a REAL Bible verse (KJV, NKJV, or NIV translation)
- Do NOT fabricate or paraphrase verses — use actual scripture text
- Include the full verse text, not abbreviated
- Use "${topic}" as the Category value

Return a JSON array of objects, each with:
{ "Reference": "Book Chapter:Verse", "Text": "Full verse text", "Category": "${topic}" }

Return ONLY the JSON array. No markdown, no explanation.`;
}

// --- Output formatting ---
function escapeCSVField(value) {
    const str = String(value).replace(/[\r\n]+/g, ' ').trim();
    if (str.includes(',') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function versesToCSV(verses) {
    const header = 'Reference,Text,Category';
    const rows = verses.map(v =>
        [v.Reference, v.Text, v.Category].map(escapeCSVField).join(',')
    );
    return header + '\n' + rows.join('\n') + '\n';
}

// --- Main ---
async function main() {
    const topics = TOPICS.split(',').map(t => t.trim()).filter(Boolean);

    console.error(`Content Generator — Model: ${MODEL}`);
    console.error(`Topics: ${topics.join(', ')}`);
    console.error(`Verses per topic: ${COUNT}`);
    if (DRY_RUN) console.error('DRY RUN — no API calls will be made\n');

    const seedVerses = SEED_FILE ? loadSeedVerses(SEED_FILE) : [];
    if (seedVerses.length > 0) {
        console.error(`Loaded ${seedVerses.length} seed verses from ${SEED_FILE}`);
    }

    const allVerses = [];

    for (const topic of topics) {
        console.error(`\nGenerating ${COUNT} verses for "${topic}"...`);
        const prompt = buildPrompt(topic, COUNT, seedVerses);

        if (DRY_RUN) {
            console.error(`  Prompt length: ${prompt.length} chars`);
            console.error(`  First 200 chars: ${prompt.substring(0, 200)}...`);
            continue;
        }

        try {
            const responseText = await callOpenRouter(prompt);
            const verses = parseResponse(responseText);

            if (!Array.isArray(verses)) {
                throw new Error('Response is not an array');
            }

            // Validate and normalize
            const valid = verses.filter(v => v.Reference && v.Text && v.Category);
            console.error(`  Got ${valid.length}/${verses.length} valid verses`);
            allVerses.push(...valid);
        } catch (err) {
            console.error(`  Failed: ${err.message}`);
        }

        // Rate limit between topics
        if (topics.indexOf(topic) < topics.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (DRY_RUN) {
        console.error('\nDry run complete.');
        return;
    }

    // Format output
    const output = FORMAT === 'json'
        ? JSON.stringify(allVerses, null, 2)
        : versesToCSV(allVerses);

    // Write output
    if (OUTPUT_FILE) {
        fs.writeFileSync(OUTPUT_FILE, output);
        console.error(`\nWrote ${allVerses.length} verses to ${OUTPUT_FILE}`);
    } else {
        process.stdout.write(output);
        console.error(`\nGenerated ${allVerses.length} verses total`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
