#!/usr/bin/env node

/**
 * generate_need_comparison.js
 *
 * Generates the recognition-tier "need comparison" question table:
 * a felt scenario, four candidate verses, one that speaks most directly.
 *
 * This is a SEPARATE table from bible-verses.js on purpose. A comparison item
 * is relational (a set of four verses plus a judgement), not a property of a
 * single verse, so it cannot be derived from per-verse Category tags.
 *
 * Usage:
 *   node scripts/generate_need_comparison.js --size 60 --dry-run
 *   node scripts/generate_need_comparison.js --verify
 *   node scripts/generate_need_comparison.js --report
 *   node scripts/generate_need_comparison.js --size 80
 *   node scripts/generate_need_comparison.js --size 200 --expand
 *   node scripts/generate_need_comparison.js --size 80 --provider gemini --model gemini-2.5-flash
 *
 * Provider keys are read from the project .env (or the environment):
 *   --provider openrouter  OPENROUTER_API_KEY  (default)
 *   --provider gemini      GEMINI_API_KEY      OpenAI-compatible endpoint
 *   --provider openai      OPENAI_API_KEY
 *   --provider ollama      OLLAMA_API_KEY      ollama.com cloud
 *
 * Options:
 *   --size N        TARGET TOTAL items in the table. The generator works out how
 *                   many are missing and tops the table up to N. Coverage is
 *                   balanced round-robin across needs, so --size 20 with 20 needs
 *                   gives one item each rather than 20 of one theme.
 *                   `--count N` is accepted as an alias.
 *   --expand        When --size exceeds the curated scenario bank, ask the model
 *                   for extra scenarios (cached in .need_comparison_scenarios.json)
 *                   instead of under-delivering.
 *   --needs A,B     Only these needs (case-insensitive). --size then targets that
 *                   subset.
 *   --batch N       Scenarios per API call (default 3)
 *   --pool N        Candidate verses offered per need (default 45)
 *   --model NAME    OpenRouter model ID
 *   --delay MS      Delay between calls (default 1200)
 *   --resume        Skip scenarios already recorded in the progress file
 *   --dry-run       Print the prompt for the first batch, make no API calls
 *   --verify        Validate the existing table, no API calls
 *   --report        Print a quality report on the existing table
 *   --reorder       Re-shuffle option order deterministically (fixes an answer that
 *                   always sits in the same slot). No API calls.
 *   --min-clarity N Reject generated items rated below N (default 3; use 4 for a
 *                   sharper table)
 *   --redo-below N  Drop existing items rated below N and regenerate them. Clears
 *                   the progress file so their scenarios are available again.
 *   --strict        Fail (instead of warn) on keyword-spotting / same-category issues
 *
 * Design invariants enforced by validation (see validateItem):
 *   - The model may only return REFERENCES. Verse text is hydrated from the
 *     verified corpus, so a hallucinated verse is structurally impossible.
 *   - Every reference must exist in the corpus.
 *   - Exactly four options, exactly one correct, four distinct references.
 *   - Every option carries a real reason. The reason is the product.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSES_FILE = path.join(ROOT, 'bible-verses.js');
const TABLE_FILE = path.join(ROOT, 'data', 'need-comparison-items.json');
const PROGRESS_FILE = path.join(__dirname, '.need_comparison_progress.json');
const SCENARIO_CACHE_FILE = path.join(__dirname, '.need_comparison_scenarios.json');

// Fill missing env vars from the project .env so this runs without manual exports.
function loadDotEnv() {
    const p = path.join(ROOT, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (!m) continue;
        const v = m[2].replace(/^["']/, '').replace(/["']$/, '');
        if (!process.env[m[1]]) process.env[m[1]] = v;
    }
}
loadDotEnv();

// All four speak the OpenAI chat-completions dialect, so one request shape covers them.
const PROVIDERS = {
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        keyEnv: 'OPENROUTER_API_KEY',
        defaultModel: 'anthropic/claude-sonnet-4.5',
    },
    gemini: {
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        keyEnv: 'GEMINI_API_KEY',
        defaultModel: 'gemini-2.5-flash',
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        keyEnv: 'OPENAI_API_KEY',
        defaultModel: 'gpt-4.1-mini',
    },
    ollama: {
        url: 'https://ollama.com/v1/chat/completions',
        keyEnv: 'OLLAMA_API_KEY',
        defaultModel: 'gpt-oss:120b',
    },
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        keyEnv: 'DEEPSEEK_API_KEY',
        defaultModel: 'deepseek-v4-pro',
    },
    // OpenCode Go: subscription gateway. Same key also serves Zen.
    'opencode-go': {
        url: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
        keyEnv: 'OPENCODE_GO_API_KEY',
        defaultModel: 'deepseek-v4-pro',
    },
};

// Rough USD per 1M tokens [input, output]. Used only to report spend, not to bill.
const PRICES = {
    'gemini-2.5-flash': [0.30, 2.50],
    'gemini-2.5-pro': [1.25, 10.00],
    'deepseek-chat': [0.27, 1.10],
    'deepseek-reasoner': [0.55, 2.19],
    'gpt-4.1-mini': [0.40, 1.60],
    'gpt-4o-mini': [0.15, 0.60],
    'anthropic/claude-sonnet-4.5': [3.00, 15.00],
};
const USAGE = { calls: 0, in: 0, out: 0 };

// --- CLI ---
const argv = process.argv.slice(2);
const getArg = (name, dflt) => {
    const i = argv.indexOf('--' + name);
    return i === -1 ? dflt : (argv[i + 1] || dflt);
};
const hasFlag = (name) => argv.includes('--' + name);

// --size is the target TOTAL table size; --count is kept as an alias.
const SIZE = parseInt(getArg('size', getArg('count', '0')), 10) || 0;
const EXPAND = hasFlag('expand');
const BATCH_SIZE = parseInt(getArg('batch', '3'), 10);
const POOL_SIZE = parseInt(getArg('pool', '45'), 10);
const DELAY_MS = parseInt(getArg('delay', '1200'), 10);
const NEED_FILTER = String(getArg('needs', '')).split(',').map(s => s.trim()).filter(Boolean);
const RESUME = hasFlag('resume');
const DRY_RUN = hasFlag('dry-run');
const VERIFY = hasFlag('verify');
const REPORT = hasFlag('report');
const REORDER = hasFlag('reorder');
const STRICT = hasFlag('strict');
const REDO_BELOW = parseInt(getArg('redo-below', '0'), 10) || 0;
const PRUNE_BELOW = parseInt(getArg('prune-below', '0'), 10) || 0;
const PRUNE_THRESHOLD = parseInt(getArg('prune-threshold', '3'), 10) || 3;
const PRUNE_BATCH = parseInt(getArg('prune-batch', '8'), 10) || 8;
const PRUNE_DRY = hasFlag('prune-dry-run');
const CRITIC = !hasFlag('no-critic');

const PROVIDER = getArg('provider', 'openrouter');
const P = PROVIDERS[PROVIDER];
if (!P) {
    console.error(`Unknown provider "${PROVIDER}". Choose: ${Object.keys(PROVIDERS).join(', ')}`);
    process.exit(1);
}
const MODEL = getArg('model', P.defaultModel);
const API_KEY = process.env[P.keyEnv];
const MAX_TOKENS = parseInt(getArg('max-tokens', '32768'), 10);
const REASONING_EFFORT = getArg('reasoning-effort', '');
// OpenCode Go routes on a client session id.
const SESSION_ID = require('crypto').randomUUID();

// --- Need profiles -----------------------------------------------------------
// `categories` map onto the 21 existing virtue categories in bible-verses.js.
// `keywords` widen the candidate pool past the category tags, because a felt
// need (Anxiety) is not the inverse of a virtue (Courage) — verses for anxiety
// are scattered across Faith, Hope, Deliverance and Identity.
// `scenarios` are the quality backbone: concrete, second person, one situation.
const NEEDS = [
    {
        need: 'Anxiety', prefix: 'anx',
        categories: ['Faith', 'Courage', 'Hope', 'Deliverance', 'Identity', 'Prayer'],
        keywords: ['anxious', 'afraid', 'fear', 'worry', 'troubled', 'rest', 'peace', 'cast'],
        scenarios: [
            'It is 2am. You are replaying tomorrow\'s meeting, certain it will go badly.',
            'Every symptom sends you back to searching. Every search ends in the worst case.',
            'You keep opening the banking app. Rent is due Friday and the balance is short.',
            'Someone you love is late and not answering. You have already imagined the worst.',
        ],
    },
    {
        need: 'Doubt', prefix: 'dbt',
        categories: ['Faith', 'Knowledge', 'Good News', 'Prophecy'],
        keywords: ['believe', 'faith', 'unbelief', 'doubt', 'know', 'truth', 'hear'],
        scenarios: [
            'You have prayed about the same thing every night for two years. Tonight you almost did not.',
            'You read three chapters and nothing lands. You wonder whether you believe any of it.',
            'A coworker makes a case against your faith that you cannot answer. It rattles you for days.',
            'You used to feel something when you prayed. Now it is only words.',
        ],
    },
    {
        need: 'Shame', prefix: 'shm',
        categories: ['Identity', 'Forgiveness', 'Healing', 'Deliverance'],
        keywords: ['shame', 'ashamed', 'confess', 'forgive', 'cleanse', 'condemn', 'guilt'],
        scenarios: [
            'You have confessed it. You know it is forgiven. You still keep bringing it up.',
            'After a failure you have started hiding from God. You skip prayer because you feel unworthy.',
            'You are certain that if your small group knew what you did last year, they would be done with you.',
            'You cannot accept a compliment because you know what you are really like.',
        ],
    },
    {
        need: 'Grief', prefix: 'grf',
        categories: ['Hope', 'Healing', 'Joy', 'Endurance'],
        keywords: ['mourn', 'grief', 'weep', 'tears', 'comfort', 'sorrow', 'death'],
        scenarios: [
            'Someone you loved died eight months ago and everyone expects you to be fine now.',
            'You are crying in a car park over something small, and you know it is not about that.',
            'A friend is grieving and you have no idea what to say, so you have said nothing.',
            'You miss who you were before the loss.',
        ],
    },
    {
        need: 'Anger', prefix: 'ang',
        categories: ['Forgiveness', 'Love', 'Humility', 'Endurance'],
        keywords: ['anger', 'angry', 'wrath', 'slow to', 'patient', 'quarrel', 'strife'],
        scenarios: [
            'Someone wronged you years ago and you still rehearse the argument in the shower.',
            'You snapped at your child over nothing and you are angrier at yourself than at them.',
            'You are right about this and nobody will listen, and it is eating you.',
            'You keep score in a relationship and the ledger is winning.',
        ],
    },
    {
        need: 'Temptation', prefix: 'tmp',
        categories: ['Purity', 'Focus', 'Endurance', 'Power'],
        keywords: ['tempt', 'flesh', 'lust', 'sin', 'resist', 'flee', 'watch', 'sober'],
        scenarios: [
            'It is late, you are alone, and the thing you swore off is one tap away.',
            'You have been doing well for three weeks and you can feel yourself negotiating.',
            'Nobody would ever know. That is exactly the problem.',
            'You keep asking for strength and keep failing at the same hour of the same day.',
        ],
    },
    {
        need: 'Weariness', prefix: 'wry',
        categories: ['Endurance', 'Joy', 'Hope', 'Prayer'],
        keywords: ['weary', 'rest', 'faint', 'burden', 'labour', 'labor', 'strength', 'renew'],
        scenarios: [
            'You have done everything right for months and you are running on empty.',
            'You are serving in three ministries and cannot remember the last time you were fed.',
            'You want to quit something good because you have nothing left to give it.',
            'Your body is fine and your soul is exhausted.',
        ],
    },
    {
        need: 'Loneliness', prefix: 'lon',
        categories: ['Love', 'Identity', 'Hope', 'Good News'],
        keywords: ['alone', 'forsake', 'with you', 'near', 'fatherless', 'friend', 'abide'],
        scenarios: [
            'It is Saturday night and you have no one to call.',
            'You are in a room full of people who know your name and none of them know you.',
            'You moved cities for a job and the isolation is worse than you admitted.',
            'You have stopped reaching out because you are tired of being the one who asks.',
        ],
    },
    {
        need: 'Despair', prefix: 'dsp',
        categories: ['Hope', 'Joy', 'Endurance', 'Deliverance'],
        keywords: ['hope', 'despair', 'darkness', 'light', 'soul', 'lift', 'pit', 'wait'],
        scenarios: [
            'You cannot see a version of the future you want to live in.',
            'You are not sad exactly. You are flat, and that frightens you more.',
            'You have stopped making plans because they keep collapsing.',
            'Getting out of bed is the whole achievement today.',
        ],
    },
    {
        need: 'Rejection', prefix: 'rej',
        categories: ['Identity', 'Love', 'Healing', 'Courage'],
        keywords: ['reject', 'despise', 'cast out', 'chosen', 'accept', 'beloved', 'adopted'],
        scenarios: [
            'You were passed over for the thing you were most qualified for and everyone knows.',
            'Your father never said he was proud of you and now it is too late to ask.',
            'You have been left before and you are braced for it in every relationship.',
            'You are convinced you are an outsider in the one group you most want in.',
        ],
    },
    {
        need: 'Fear', prefix: 'fer',
        categories: ['Courage', 'Faith', 'Deliverance', 'Power'],
        keywords: ['fear', 'afraid', 'dismayed', 'strong', 'courage', 'refuge', 'deliver'],
        scenarios: [
            'You have to make a decision that could cost you your job and you keep postponing it.',
            'You are about to speak in front of people who intimidate you.',
            'The doctor said they want to run more tests.',
            'You are afraid of failing in front of the people you most want to impress.',
        ],
    },
    {
        need: 'Bitterness', prefix: 'btr',
        categories: ['Forgiveness', 'Love', 'Humility', 'Joy'],
        keywords: ['forgive', 'bitter', 'resent', 'love', 'enemy', 'bless', 'mercy'],
        scenarios: [
            'You have forgiven them in public and kept a copy of the file in private.',
            'You cannot hear their name without your jaw tightening.',
            'They never apologised and everyone has moved on except you.',
            'You are starting to enjoy being the wronged one.',
        ],
    },
    {
        need: 'Pride', prefix: 'prd',
        categories: ['Humility', 'Wisdom', 'Love', 'Knowledge'],
        keywords: ['humble', 'pride', 'proud', 'lowly', 'boast', 'glory', 'serve'],
        scenarios: [
            'You were corrected in front of others and you cannot let it go.',
            'You are better at this than the people around you and you want them to know.',
            'You would rather be right than be in the room.',
            'You have started comparing yourself to people you used to look up to.',
        ],
    },
    {
        need: 'Guilt', prefix: 'glt',
        categories: ['Forgiveness', 'Deliverance', 'Good News', 'Healing'],
        keywords: ['forgive', 'sin', 'cleanse', 'guilt', 'blot', 'remember no more', 'justif'],
        scenarios: [
            'You know God has forgiven you and you have not forgiven yourself.',
            'You keep repenting for something you already repented of.',
            'You are doing penance by being miserable and calling it devotion.',
            'Your conscience will not let you enjoy anything good.',
        ],
    },
    {
        need: 'Confusion', prefix: 'cnf',
        categories: ['Wisdom', 'Focus', 'Knowledge', 'Prophecy'],
        keywords: ['wisdom', 'understand', 'mind', 'peace', 'confus', 'guide', 'path', 'light'],
        scenarios: [
            'Three people gave you three different pieces of advice and you trust all of them.',
            'You have prayed for direction and feel less clear than before you prayed.',
            'You cannot tell whether this is God closing a door or your own fear doing it.',
            'You have too many options and no peace about any of them.',
        ],
    },
    {
        need: 'Envy', prefix: 'env',
        categories: ['Love', 'Humility', 'Prosperity', 'Joy'],
        keywords: ['envy', 'jealous', 'content', 'thanksgiv', 'rejoice', 'covet'],
        scenarios: [
            'Someone you love got the thing you have been praying for.',
            'You can feel your mood drop when you open your phone and see their news.',
            'You want to be happy for them and part of you is not.',
            'You have started measuring your life against a feed.',
        ],
    },
    {
        need: 'Lack', prefix: 'lck',
        categories: ['Prosperity', 'Faith', 'Prayer', 'Good News'],
        keywords: ['supply', 'need', 'provide', 'bread', 'riches', 'seek first', 'give'],
        scenarios: [
            'You cannot afford the repair and the thing you need is not optional.',
            'You have been generous and you are now short yourself.',
            'You are deciding which bill to be late on this month.',
            'You keep calculating and the numbers do not move.',
        ],
    },
    {
        need: 'Sickness', prefix: 'sck',
        categories: ['Healing', 'Faith', 'Endurance', 'Prayer'],
        keywords: ['heal', 'sick', 'infirm', 'restore', 'strength', 'body', 'raise'],
        scenarios: [
            'The treatment is not working and the next option is worse.',
            'You have prayed for healing and the answer so far is no.',
            'You are caring for someone who is not getting better.',
            'You are in pain every day and it is making you a worse version of yourself.',
        ],
    },
];

// --- Corpus loading ----------------------------------------------------------

function loadCorpus() {
    const content = fs.readFileSync(VERSES_FILE, 'utf8');
    const loader = new Function(content + '; return loadSelectedVerses();');
    const verses = loader();
    const byRef = new Map();
    for (const v of verses) {
        if (v && v.Reference && v.Text) byRef.set(v.Reference, v);
    }
    return byRef;
}

// --- Candidate pool ----------------------------------------------------------
// Offer the model a shortlist it must choose from. This is the anti-hallucination
// and anti-irrelevance mechanism: the model never invents a reference, and the
// verses it sees are already topical.

function buildPool(corpus, profile, limit) {
    const scored = [];
    const kw = profile.keywords.map(k => k.toLowerCase());

    for (const verse of corpus.values()) {
        let score = 0;
        if (profile.categories.includes(verse.Category)) score += 3;

        const text = verse.Text.toLowerCase();
        let hits = 0;
        for (const k of kw) {
            if (text.includes(k)) hits++;
        }
        score += Math.min(hits, 4) * 2;

        // Slight preference for verses short enough to sit in a four-way list.
        const words = verse.Text.trim().split(/\s+/).length;
        if (words > 55) score -= 2;
        else if (words > 40) score -= 1;

        if (score > 0) scored.push({ verse, score });
    }

    scored.sort((a, b) => b.score - a.score || a.verse.Reference.localeCompare(b.verse.Reference));

    // Keep category diversity so the model has genuinely different angles to
    // choose distractors from, rather than four verses making the same point.
    const perCategory = Math.max(3, Math.ceil(limit / 8));
    const counts = new Map();
    const picked = [];
    for (const { verse } of scored) {
        const c = counts.get(verse.Category) || 0;
        if (c >= perCategory) continue;
        counts.set(verse.Category, c + 1);
        picked.push(verse);
        if (picked.length >= limit) break;
    }
    // Backfill if the diversity cap left us short.
    for (const { verse } of scored) {
        if (picked.length >= limit) break;
        if (!picked.includes(verse)) picked.push(verse);
    }
    return picked;
}

// --- Prompt ------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a Bible teacher who writes diagnostic questions for a game.
You must return only valid JSON. No markdown fences, no commentary.`;

function buildBatchPrompt(profile, scenarios, pool, usedAnswers) {
    const poolJson = pool.map(v => ({
        reference: v.Reference,
        category: v.Category,
        text: v.Text.length > 160 ? v.Text.slice(0, 160) + '...' : v.Text,
    }));

    return `Write ${scenarios.length} comparison questions on the theme of ${profile.need}.

CANDIDATE VERSES (you MUST choose references only from this list, copied exactly):
${JSON.stringify(poolJson, null, 2)}

SCENARIOS (one question each, in this order):
${JSON.stringify(scenarios, null, 2)}
${(usedAnswers && usedAnswers.length)
    ? `\nALREADY USED AS THE CORRECT ANSWER for ${profile.need} (do NOT pick these as the answer again):\n${JSON.stringify(usedAnswers)}\n`
    : ''}
For each scenario produce:
{
  "scenario": "<the situation in natural prose. It MUST contain, word for word, all three exclusions below>",
  "exclusions": [
    "<a fact that is NOT the case, 4-10 words, copied verbatim from the scenario>",
    "<a second such fact>",
    "<a third such fact>"
  ],
  "clarity": <integer 1-5: how obvious the best answer is to a thoughtful reader>,
  "correct": {
    "reference": "<exact reference from the candidate list>",
    "cue": "<the exact words from the scenario that this verse answers, copied character-for-character>",
    "topic": "<2-4 words: what this verse actually addresses>",
    "explanation": "<one or two sentences tying the cue to what the verse does>"
  },
  "distractors": [
    { "reference": "<exact reference>", "topic": "<2-4 words>", "ruleOut": "<one of your three exclusions, copied exactly>", "whyNot": "<one sentence: why that exclusion makes this verse inapplicable>" },
    { "reference": "<exact reference>", "topic": "<2-4 words>", "ruleOut": "<one of your three exclusions>", "whyNot": "<one sentence as above>" },
    { "reference": "<exact reference>", "topic": "<2-4 words>", "ruleOut": "<one of your three exclusions>", "whyNot": "<one sentence as above>" }
  ]
}

HOW THIS WORKS — the player eliminates options because the scenario says certain things are not so:
1. Write the scenario so it states THREE things that are NOT the case, each as a short plain
   clause inside the prose. Example: "It is 2am and your mind is looping on the same thought.
   Nothing has gone wrong today, no bill is due and nobody is angry with you."
2. List those three clauses in "exclusions", copied word for word from the scenario.
3. Each distractor's "ruleOut" must be one of those exclusions, copied exactly. The exclusion
   must genuinely make that verse inapplicable — not merely describe the situation.
4. If you cannot tie a distractor to one of the exclusions, replace the distractor. Do not
   invent a rule-out, and never quote the whole scenario.
5. No judgment calls. If a distractor would still be a defensible answer, it is a bad
   distractor. "Less helpful" is not a reason; "does not apply" is.
6. The strongest rule-out is a contradiction: the verse tells you to do what the scenario says
   you have already done, or assumes something the scenario says you lack.
7. Keep the seed scenario's situation. You may rewrite its wording to add the exclusions.
8. The "cue" must be copied character-for-character from the scenario: the detail the correct
   verse answers.
9. "topic" must be 2-4 words and different for all four options. A distractor's topic must not
   be cued by the scenario text.
10. The word "${profile.need}" may appear in the verse text of AT MOST ONE option.
11. Plain modern English, second person. No preaching, no filler.

Return ONLY a JSON array of ${scenarios.length} objects.`;
}

// --- API ---------------------------------------------------------------------

async function callModel(prompt, attempt = 1) {
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    };
    if (PROVIDER === 'openrouter') {
        headers['HTTP-Referer'] = 'https://dcgame.4you.tel';
        headers['X-Title'] = 'DC Game Need-Comparison Generator';
    }
    if (PROVIDER === 'opencode-go') {
        headers['x-opencode-session'] = SESSION_ID;
    }

    const response = await fetch(P.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.6,
            max_tokens: MAX_TOKENS,
            ...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {}),
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
            const wait = 2000 * attempt;
            console.warn(`  ${response.status}, retrying in ${wait}ms (attempt ${attempt}/3)`);
            await new Promise(r => setTimeout(r, wait));
            return callModel(prompt, attempt + 1);
        }
        throw new Error(`${PROVIDER} API error ${response.status}: ${body.slice(0, 400)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`API error: ${JSON.stringify(data.error).slice(0, 400)}`);
    if (data.usage) {
        USAGE.calls++;
        USAGE.in += data.usage.prompt_tokens || 0;
        USAGE.out += data.usage.completion_tokens || 0;
    }

    const choice = data.choices && data.choices[0];
    if (!choice) throw new Error('No choices in response');
    if (choice.finish_reason && choice.finish_reason !== 'stop') {
        console.warn(`  Warning: finish_reason=${choice.finish_reason}`);
    }
    return choice.message.content;
}

function parseJsonArray(text) {
    let cleaned = String(text).trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    // Tolerate a leading brace-wrapped object.
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
    return JSON.parse(cleaned);
}


// --- Critic pass -------------------------------------------------------------
// The generator grades its own homework and will happily justify a weak
// rule-out. An independent pass asks the only question that matters: could a
// thoughtful player still make a case for one of the wrong options?

const CRITIC_SYSTEM = `You audit multiple-choice Bible questions for fairness. Return only valid JSON.`;

function buildCriticPrompt(items, corpus) {
    const payload = items.map((it, i) => ({
        index: i + 1,
        scenario: it.scenario,
        options: [
            { reference: it.correct.reference, role: 'answer' },
            ...it.distractors.map(d => ({ reference: d.reference, role: 'wrong' })),
        ].map(o => {
            const v = corpus.get(o.reference);
            return { reference: o.reference, role: o.role, text: v ? v.Text : '' };
        }),
    }));

    return `For each question below, decide whether a thoughtful, biblically literate player could make a reasonable case for any WRONG option.

Be strict but fair. The question asks which verse speaks most directly to THIS situation AS STATED. A wrong option is only defensible if it addresses that same specific situation. "It is a comforting verse", "it is generally about this theme", or "it could help someone feeling this way" are NOT a case.

QUESTIONS:
${JSON.stringify(payload, null, 2)}

Return ONLY a JSON array, one object per question, in the same order:
{ "index": <number from the input>, "verdict": "clear" | "ambiguous", "defensible": ["<reference of any wrong option that is still defensible>"], "reason": "<max 15 words>" }

Also check each "ruleOut": it must name a fact that makes that verse INAPPLICABLE. If it merely
restates the scenario, describes the situation, or quotes the whole scenario, that option is not
actually excluded — treat the question as "ambiguous".

Use "ambiguous" if ANY wrong option is still defensible OR its ruleOut does not exclude it.`;
}

async function auditItems(items, corpus) {
    if (!items.length) return null;
    try {
        const parsed = parseJsonArray(await callModel(buildCriticPrompt(items, corpus)));
        return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
        console.warn(`  critic failed (keeping items): ${err.message}`);
        return null;
    }
}

// --- Validation --------------------------------------------------------------

const MIN_REASON = 40;
const MIN_CLARITY = parseInt(getArg('min-clarity', '3'), 10);

function validateItem(raw, profile, pool, corpus, answerRefs) {
    const errors = [];
    const warnings = [];
    const poolRefs = new Set(pool.map(v => v.Reference));
    const answers = answerRefs || new Set();

    if (!raw || typeof raw !== 'object') return { errors: ['item is not an object'], warnings };
    if (!raw.scenario || typeof raw.scenario !== 'string') errors.push('missing scenario');
    if (!raw.correct || !raw.correct.reference) errors.push('missing correct.reference');
    if (!Array.isArray(raw.distractors) || raw.distractors.length !== 3) {
        errors.push(`expected 3 distractors, got ${Array.isArray(raw.distractors) ? raw.distractors.length : 'none'}`);
    }
    if (errors.length) return { errors, warnings };

    const all = [raw.correct, ...raw.distractors];
    const refs = all.map(o => o.reference);

    for (const ref of refs) {
        if (!corpus.has(ref)) errors.push(`"${ref}" is not in the corpus`);
        else if (!poolRefs.has(ref)) warnings.push(`"${ref}" was not offered in the pool`);
    }
    if (new Set(refs).size !== refs.length) errors.push('duplicate reference within item');

    // A verse the game already teaches as the answer must never reappear as a
    // wrong option within the same need — that teaches contradictory things.
    // Across different needs it is defensible, so it is only a warning.
    const sameNeed = answers.has(profile.need) ? answers.get(profile.need) : new Set();
    const otherNeed = new Set();
    for (const [need, set] of answers) {
        if (need === profile.need) continue;
        for (const r of set) otherNeed.add(r);
    }
    if (sameNeed.has(raw.correct.reference)) {
        errors.push(`"${raw.correct.reference}" is already the correct answer for ${profile.need}`);
    }
    for (const d of raw.distractors) {
        if (sameNeed.has(d.reference)) {
            warnings.push(`"${d.reference}" is the answer for another ${profile.need} item — the ruleOut must make the difference explicit`);
        } else if (otherNeed.has(d.reference)) {
            warnings.push(`"${d.reference}" is the answer in another need`);
        }
    }

    if (!raw.correct.explanation || raw.correct.explanation.trim().length < MIN_REASON) {
        errors.push('correct.explanation missing or too short');
    }
    for (const d of raw.distractors) {
        if (!d.whyNot || d.whyNot.trim().length < MIN_REASON) {
            errors.push(`distractor ${d.reference} has no real rationale`);
        }
        if (/^this verse is (less|not) (relevant|applicable)/i.test(String(d.whyNot).trim())) {
            errors.push(`distractor ${d.reference} uses a non-answer rationale`);
        }
    }

    // --- Discernibility checks -------------------------------------------
    // These exist because "more than one could fit" is the failure mode that
    // makes the mode feel like a coin flip.
    const scenarioNorm = norm(raw.scenario);

    // 1. Every wrong option must be ruled out by a fact the scenario states.
    //    This is what separates "does not apply" from "I like this one less".
    // The exclusions are the mechanism: three short facts the scenario says are
    // NOT the case. Distractors must be ruled out by quoting one of them, which
    // is what stops "quote the whole scenario back" from passing.
    const exclusions = Array.isArray(raw.exclusions) ? raw.exclusions.map(e => norm(e)) : [];
    if (exclusions.length !== 3) {
        errors.push(`expected 3 exclusions, got ${exclusions.length}`);
    }
    for (const e of exclusions) {
        if (!e) { errors.push('an exclusion is empty'); continue; }
        if (e.length < 8) errors.push(`exclusion "${e}" is too short to be a fact`);
        if (e.split(' ').length > 14) errors.push(`exclusion "${e}" is too long to be one fact`);
        if (!scenarioNorm.includes(e)) errors.push(`exclusion "${e}" is not copied from the scenario`);
    }
    if (exclusions.length > 1 && new Set(exclusions).size !== exclusions.length) {
        errors.push('exclusions are not distinct');
    }

    const ruleOuts = [];
    for (const d of raw.distractors) {
        const ro = norm(d.ruleOut);
        ruleOuts.push(ro);
        if (!ro) {
            errors.push(`distractor ${d.reference} has no ruleOut`);
        } else if (!exclusions.some(e => e && e.includes(ro))) {
            errors.push(`ruleOut on ${d.reference} must quote one of the exclusions`);
        }
    }
    if (ruleOuts.length === 3 && ruleOuts.every(r => r && r === ruleOuts[0])) {
        errors.push('all three distractors share one ruleOut, so nothing is distinguished');
    }

    // 2. The cue must actually appear in the scenario, or the answer is not
    //    grounded in anything the player can see.
    const cueNorm = norm(raw.correct.cue);
    if (!cueNorm) {
        errors.push('correct.cue is missing');
    } else if (!scenarioNorm.includes(cueNorm)) {
        errors.push(`cue "${String(raw.correct.cue).slice(0, 40)}" is not copied from the scenario`);
    } else if (cueNorm.length < 8) {
        errors.push('cue is too short to be a deciding detail');
    }

    // 3. Topics must exist and be distinct, so the four options address
    //    genuinely different things.
    const topicOf = (o) => norm(o.topic);
    const topics = all.map(topicOf);
    if (topics.some(t => !t)) {
        errors.push('every option needs a topic');
    } else {
        const words = topics.map(t => t.split(' ').length);
        if (words.some(n => n > 5)) errors.push('a topic is longer than 5 words');
        if (new Set(topics).size !== topics.length) errors.push('two options share the same topic');
    }

    // 4. A distractor whose topic is cued by the situation itself is in scope,
    //    i.e. a second defensible answer. Exclusions are removed first, because
    //    an exclusion necessarily names the domain it is excluding ("no bill is
    //    due" must contain "bill").
    let residual = scenarioNorm;
    for (const e of exclusions) {
        if (e) residual = residual.split(e).join(' ');
    }
    for (const d of raw.distractors) {
        const t = topicOf(d);
        if (!t) continue;
        const significant = t.split(' ').filter(w => w.length > 3);
        const cued = significant.filter(w => residual.includes(w));
        if (cued.length) {
            errors.push(`distractor topic "${d.topic}" is cued by the situation (${cued.join(', ')})`);
        }
    }

    // 5. The need word may appear in at most one option's verse text.
    const needWord = norm(profile.need);
    const withNeedWord = all.filter(o => {
        const v = corpus.get(o.reference);
        return v && norm(v.Text).includes(needWord);
    });
    if (withNeedWord.length > 1) {
        errors.push(`"${profile.need}" appears in ${withNeedWord.length} options; at most one is allowed`);
    }

    // 6. Self-rated clarity must clear the floor.
    const clarity = Number(raw.clarity);
    if (!Number.isInteger(clarity) || clarity < 1 || clarity > 5) {
        errors.push('clarity must be an integer 1-5');
    } else if (clarity < MIN_CLARITY) {
        errors.push(`clarity ${clarity} is below the floor of ${MIN_CLARITY}`);
    }

    return { errors, warnings };
}

// Normalise text for comparison: straighten quotes, collapse whitespace, lowercase.
function norm(s) {
    return String(s == null ? '' : s)
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function previewOf(text, max = 62) {    const t = String(text).replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > 20 ? cut.slice(0, sp) : cut) + '...';
}

// --- Option ordering ---------------------------------------------------------
// The correct answer must not sit in a predictable position. Ordering is a pure
// function of (id, reference) so it is stable across re-runs and idempotent.

function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function orderOptions(id, options) {
    return options
        .slice()
        .sort((a, b) => hash32(id + '|' + a.reference) - hash32(id + '|' + b.reference));
}

function materialise(raw, profile, corpus, id) {
    const options = [];
    const cv = corpus.get(raw.correct.reference);
    options.push({
        reference: cv.Reference,
        text: cv.Text,
        preview: previewOf(cv.Text),
        correct: true,
        topic: String(raw.correct.topic).trim(),
        cue: String(raw.correct.cue).trim(),
        explanation: raw.correct.explanation.trim(),
    });
    for (const d of raw.distractors) {
        const dv = corpus.get(d.reference);
        options.push({
            reference: dv.Reference,
            text: dv.Text,
            preview: previewOf(dv.Text),
            topic: String(d.topic).trim(),
            ruleOut: String(d.ruleOut).trim(),
            whyNot: d.whyNot.trim(),
        });
    }
    return {
        id,
        need: profile.need,
        tier: 1,
        clarity: Number(raw.clarity),
        scenario: raw.scenario.trim(),
        exclusions: (raw.exclusions || []).map(e => String(e).trim()),
        question: 'Which verse speaks most directly to this?',
        options: orderOptions(id, options),
    };
}

// --- Table IO ----------------------------------------------------------------

// Map of need -> Set of references already used as the correct answer.
function answersByNeed(table) {
    const m = new Map();
    for (const it of table.items) {
        const c = (it.options || []).find(o => o.correct);
        if (!c) continue;
        if (!m.has(it.need)) m.set(it.need, new Set());
        m.get(it.need).add(c.reference);
    }
    return m;
}

function loadTable() {    if (!fs.existsSync(TABLE_FILE)) {
        return { version: 1, translation: 'WEB', kind: 'need_comparison', description: '', designRules: [], needs: [], items: [] };
    }
    return JSON.parse(fs.readFileSync(TABLE_FILE, 'utf8'));
}

function saveTable(table) {
    fs.mkdirSync(path.dirname(TABLE_FILE), { recursive: true });
    fs.writeFileSync(TABLE_FILE, JSON.stringify(table, null, 2) + '\n');
}

function nextId(table, prefix) {
    let max = 0;
    const re = new RegExp('^' + prefix + '-(\\d+)$');
    for (const it of table.items) {
        const m = re.exec(it.id || '');
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return (n) => `${prefix}-${String(n).padStart(3, '0')}`;
}

const scenarioKey = (need, scenario) =>
    need + '::' + String(scenario).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function loadProgress() {
    if (!RESUME || !fs.existsSync(PROGRESS_FILE)) return new Set();
    try {
        const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        console.log(`Resuming: ${data.done.length} scenarios already done`);
        return new Set(data.done);
    } catch {
        return new Set();
    }
}

function saveProgress(done) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        done: [...done],
        timestamp: new Date().toISOString(),
        model: MODEL,
    }, null, 2));
}

// --- Modes -------------------------------------------------------------------

function report(table) {
    const byNeed = new Map();
    const refUse = new Map();
    for (const it of table.items) {
        byNeed.set(it.need, (byNeed.get(it.need) || 0) + 1);
        for (const o of it.options) refUse.set(o.reference, (refUse.get(o.reference) || 0) + 1);
    }
    const total = table.items.length;
    const answers = table.items.map(it => it.options.find(o => o.correct)?.reference).filter(Boolean);

    console.log(`\nTable: ${TABLE_FILE}`);
    console.log(`Items: ${total}`);
    console.log(`Needs: ${byNeed.size}`);
    console.log(`Distinct verses used: ${refUse.size}`);

    console.log('\nPer need:');
    for (const [need, n] of [...byNeed.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${need.padEnd(14)} ${String(n).padStart(3)}`);
    }

    const overused = [...refUse.entries()].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]);
    if (overused.length) {
        console.log('\nVerses used 4+ times (players will notice):');
        for (const [ref, n] of overused) console.log(`  ${ref} x${n}`);
    }

    const dupAnswers = answers.filter((r, i) => answers.indexOf(r) !== i);
    if (dupAnswers.length) {
        console.log('\nRepeated correct answers: ' + [...new Set(dupAnswers)].join(', '));
    }

    const pos = [0, 0, 0, 0];
    for (const it of table.items) {
        const i = (it.options || []).findIndex(o => o.correct);
        if (i >= 0 && i < 4) pos[i]++;
    }
    console.log('\nCorrect-answer position: ' + pos.map((n, i) => `${i + 1}=${n}`).join('  '));
    if (table.items.length >= 8) {
        const worst = Math.max(...pos) / table.items.length;
        if (worst > 0.5) {
            console.log(`  WARNING: ${Math.round(worst * 100)}% of answers in one position — run --reorder`);
        }
    }

    const noNeed = [...byNeed.entries()].filter(([need]) => !table.needs.includes(need));
    if (noNeed.length) console.log('\nNeeds present but not declared: ' + noNeed.map(n => n[0]).join(', '));
    console.log('');
}

function verify(table, corpus) {
    let errors = 0, warnings = 0;
    const seenScenario = new Map();
    const seenId = new Set();
    const answers = answersByNeed(table);

    for (const it of table.items) {
        const tag = it.id || '(no id)';
        if (!it.id || !/^[a-z]{3}-\d{3}$/.test(it.id)) { console.error(`ERR  ${tag}: malformed id`); errors++; }
        if (seenId.has(it.id)) { console.error(`ERR  ${tag}: duplicate id`); errors++; }
        seenId.add(it.id);

        const opts = it.options || [];
        if (opts.length !== 4) { console.error(`ERR  ${tag}: ${opts.length} options`); errors++; }
        const correct = opts.filter(o => o.correct);
        if (correct.length !== 1) { console.error(`ERR  ${tag}: ${correct.length} correct answers`); errors++; }

        const key = scenarioKey(it.need, it.scenario);
        if (seenScenario.has(key)) { console.error(`ERR  ${tag}: duplicate scenario of ${seenScenario.get(key)}`); errors++; }
        seenScenario.set(key, tag);

        if (!it.scenario || it.scenario.length < 20) { console.error(`ERR  ${tag}: scenario too thin`); errors++; }

        const refs = opts.map(o => o.reference);
        if (new Set(refs).size !== refs.length) { console.error(`ERR  ${tag}: duplicate reference`); errors++; }

        const excl = (it.exclusions || []).map(e => norm(e)).filter(Boolean);
        if (excl.length && excl.length !== 3) {
            console.error(`ERR  ${tag}: ${excl.length} exclusions (need 3)`);
            errors++;
        }
        for (const e of excl) {
            if (!norm(it.scenario).includes(e)) {
                console.error(`ERR  ${tag}: exclusion "${e}" is not copied from the scenario`);
                errors++;
            }
        }

        for (const o of opts) {
            if (!corpus.has(o.reference)) { console.error(`ERR  ${tag}: "${o.reference}" not in corpus`); errors++; continue; }
            const truth = corpus.get(o.reference).Text;
            if (o.text !== truth) { console.error(`ERR  ${tag}: text drift on ${o.reference}`); errors++; }
            if (o.preview) {
                // Previews may be hand-written and may start mid-verse, so compare
                // on a normalized needle rather than requiring a prefix.
                const needle = norm(o.preview.replace(/\.\.\.$/, '')).slice(0, 25);
                if (needle && !norm(truth).includes(needle)) {
                    console.warn(`WARN ${tag}: preview does not appear in text on ${o.reference}`);
                    warnings++;
                }
            }
            const reason = o.correct ? o.explanation : o.whyNot;
            if (!reason || reason.trim().length < MIN_REASON) {
                console.error(`ERR  ${tag}: weak rationale on ${o.reference}`); errors++;
            }
            if (!o.correct) {
                const sameNeed = answers.get(it.need);
                if (sameNeed && sameNeed.has(o.reference)) {
                    console.warn(`WARN ${tag}: "${o.reference}" is the answer for another ${it.need} item — check the ruleOut makes the difference explicit`);
                    warnings++;
                }
                const ro = norm(o.ruleOut);
                const sc = norm(it.scenario);
                if (!ro) {
                    console.error(`ERR  ${tag}: distractor ${o.reference} has no ruleOut`);
                    errors++;
                } else if (excl.length) {
                    // Newer items declare exclusions; ruleOuts must quote one.
                    if (!excl.some(e => e.includes(ro))) {
                        console.error(`ERR  ${tag}: ruleOut on ${o.reference} must quote one of the exclusions`);
                        errors++;
                    }
                } else if (!sc.includes(ro)) {
                    console.error(`ERR  ${tag}: ruleOut on ${o.reference} is not copied from the scenario`);
                    errors++;
                } else if (ro === sc) {
                    console.error(`ERR  ${tag}: ruleOut on ${o.reference} restates the whole scenario`);
                    errors++;
                }
            }
            if (!o.topic) { console.error(`ERR  ${tag}: ${o.reference} has no topic`); errors++; }
        }

        // Discernibility invariants.
        let residual = norm(it.scenario);
        for (const e of excl) residual = residual.split(e).join(' ');
        for (const o of opts) {
            if (o.correct || !o.topic) continue;
            const cued = norm(o.topic).split(' ').filter(w => w.length > 3 && residual.includes(w));
            if (cued.length) {
                console.error(`ERR  ${tag}: distractor topic "${o.topic}" is cued by the situation (${cued.join(', ')})`);
                errors++;
            }
        }
        const ros = opts.filter(o => !o.correct).map(o => norm(o.ruleOut)).filter(Boolean);
        if (ros.length === 3 && new Set(ros).size === 1) {
            console.error(`ERR  ${tag}: all three distractors share one ruleOut`);
            errors++;
        }
        const topics = opts.map(o => norm(o.topic)).filter(Boolean);
        if (topics.length === opts.length && new Set(topics).size !== topics.length) {
            console.error(`ERR  ${tag}: two options share a topic`);
            errors++;
        }
        const cv = opts.find(o => o.correct);
        if (cv) {
            if (!cv.cue) { console.error(`ERR  ${tag}: answer has no cue`); errors++; }
            else if (!norm(it.scenario).includes(norm(cv.cue))) {
                console.error(`ERR  ${tag}: cue is not copied from the scenario`);
                errors++;
            }
        }
        const cl = Number(it.clarity);
        if (!Number.isInteger(cl) || cl < 1 || cl > 5) {
            console.error(`ERR  ${tag}: clarity must be 1-5`);
            errors++;
        } else if (cl < MIN_CLARITY) {
            console.warn(`WARN ${tag}: clarity ${cl} below floor ${MIN_CLARITY}`);
            warnings++;
        }
    }

    const legacy = table.items.filter(i => !i.exclusions || !i.exclusions.length).length;
    if (legacy) console.log(`Note: ${legacy} item(s) predate exclusions and were checked against the scenario only.`);

    const missingNeeds = (table.needs || []).filter(n => !table.items.some(i => i.need === n));
    if (missingNeeds.length) console.log(`Note: declared needs with no items: ${missingNeeds.join(', ')}`);

    console.log(`\nverify: ${table.items.length} items, ${errors} errors, ${warnings} warnings`);
    return errors === 0;
}

// --- Scenario expansion ------------------------------------------------------
// The curated bank is the quality backbone, but it is finite. When --size asks
// for more than it can supply, grow the bank and cache it so re-runs reuse it.

function loadScenarioCache() {
    if (!fs.existsSync(SCENARIO_CACHE_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(SCENARIO_CACHE_FILE, 'utf8')); } catch { return {}; }
}

function saveScenarioCache(cache) {
    fs.writeFileSync(SCENARIO_CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function expandScenarios(profiles, done, shortfall) {
    const cache = loadScenarioCache();
    const out = new Map();
    const perNeed = Math.max(1, Math.ceil(shortfall / Math.max(1, profiles.length)));

    for (const profile of profiles) {
        const cached = cache[profile.need] || [];
        const fresh = cached.filter(s => !done.has(scenarioKey(profile.need, s)));
        if (fresh.length >= perNeed) {
            out.set(profile.need, fresh.slice(0, perNeed));
            continue;
        }

        const known = [...profile.scenarios, ...cached];
        const want = perNeed - fresh.length;
        const prompt = `You are extending a bank of diagnostic scenarios for a Bible quiz game.

THEME: ${profile.need}

SCENARIOS ALREADY USED (do not repeat or paraphrase any of these):
${JSON.stringify(known, null, 2)}

Write ${want} NEW scenarios on this theme.

RULES:
1. Second person, present tense, one concrete situation.
2. 12 to 30 words. Include a specific physical or situational detail.
3. No verse references, no advice, no moral. Just the situation.
4. Each must be a genuinely different moment from the others.

Return ONLY a JSON array of ${want} strings.`;

        try {
            const parsed = parseJsonArray(await callModel(prompt));
            const added = [];
            const seen = new Set(known.map(s => scenarioKey(profile.need, s)));
            for (const s of parsed) {
                if (typeof s !== 'string') continue;
                const t = s.trim();
                if (t.length < 20 || t.split(/\s+/).length > 45) continue;
                const key = scenarioKey(profile.need, t);
                if (seen.has(key)) continue;
                seen.add(key);
                added.push(t);
            }
            cache[profile.need] = [...cached, ...added];
            saveScenarioCache(cache);
            out.set(profile.need, [...fresh, ...added].slice(0, perNeed));
            console.log(`  ${profile.need}: +${added.length} scenarios`);
            await new Promise(r => setTimeout(r, DELAY_MS));
        } catch (err) {
            console.warn(`  ${profile.need}: expansion failed (${err.message})`);
            out.set(profile.need, fresh);
        }
    }
    return out;
}

// Round-robin across needs so a small --size still gives broad coverage.
function interleaveByNeed(work) {
    const queues = new Map();
    for (const w of work) {
        if (!queues.has(w.profile.need)) queues.set(w.profile.need, []);
        queues.get(w.profile.need).push(w);
    }
    const lists = [...queues.values()];
    if (!lists.length) return [];
    const out = [];
    for (let round = 0; out.length < work.length; round++) {
        for (const q of lists) {
            if (q.length) out.push(q.shift());
            if (out.length >= work.length) break;
        }
    }
    return out;
}

// Take up to `size` items from one need at a time, cycling needs so coverage
// stays balanced without forcing one API call per item.
function chunkByNeed(work, size) {
    const queues = new Map();
    for (const w of work) {
        if (!queues.has(w.profile.need)) queues.set(w.profile.need, []);
        queues.get(w.profile.need).push(w);
    }
    const lists = [...queues.values()];
    if (!lists.length) return [];
    const batches = [];
    let i = 0;
    while (lists.some(q => q.length)) {
        const q = lists[i % lists.length];
        if (q.length) batches.push(q.splice(0, size));
        i++;
    }
    return batches;
}

// Timestamped, never-overwritten backup under backups/.
function writeBackup(tag) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    const dir = path.join(ROOT, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `need-comparison-items-${stamp}-${tag}.json`);
    fs.copyFileSync(TABLE_FILE, dest);
    return dest;
}

function reportUsage() {
    if (!USAGE.calls) return;
    const price = PRICES[MODEL];
    let cost = '';
    if (price) {
        const usd = (USAGE.in / 1e6) * price[0] + (USAGE.out / 1e6) * price[1];
        cost = ` | ~$${usd.toFixed(3)}`;
    }
    console.log(`\nAPI usage: ${USAGE.calls} calls, ${USAGE.in.toLocaleString()} in, ${USAGE.out.toLocaleString()} out tokens${cost} (${PROVIDER}/${MODEL})`);
}


// --- Prune pass ---------------------------------------------------------------
// A second, stricter reading of the items the generator rated as weak. The first
// critic asks "is a wrong option defensible?"; this one asks "how likely is a
// thoughtful player to actually pick one?" and drops the arguable ones.

const PRUNE_SYSTEM = `You rate how arguable multiple-choice Bible questions are. Return only valid JSON.`;

function buildPrunePrompt(items, corpus) {
    const payload = items.map((it, i) => ({
        index: i + 1,
        scenario: it.scenario,
        options: (it.options || []).map(o => {
            const v = corpus.get(o.reference);
            return { reference: o.reference, role: o.correct ? 'answer' : 'wrong', text: v ? v.Text : '' };
        }),
    }));

    return `For each question, rate how likely a thoughtful, biblically literate player is to pick a WRONG option.

1 = no thoughtful player would pick a wrong option; the stated exclusions make them inapplicable.
2 = a careless player might, but on reading it is clearly excluded.
3 = a thoughtful player could make a case for one wrong option.
4 = two options are genuinely arguable.
5 = effectively a coin flip.

Judge only what the scenario states. Do not reward a verse for being generally comforting,
on-theme, or true in a broader sense.

QUESTIONS:
${JSON.stringify(payload, null, 2)}

Return ONLY a JSON array, same order:
{ "index": <number>, "score": <1-5>, "worst": "<reference of the most tempting wrong option, or empty>", "reason": "<max 15 words>" }`;
}

async function pruneWeak(table, corpus) {
    const targets = table.items.filter(i => (Number(i.clarity) || 0) < PRUNE_BELOW);
    console.log(`Prune: ${targets.length} item(s) rated below clarity ${PRUNE_BELOW}; threshold ${PRUNE_THRESHOLD}`);
    if (!targets.length) return new Map();

    const scores = new Map();
    for (let i = 0; i < targets.length; i += PRUNE_BATCH) {
        const chunk = targets.slice(i, i + PRUNE_BATCH);
        try {
            const parsed = parseJsonArray(await callModel(buildPrunePrompt(chunk, corpus)));
            for (const v of parsed) {
                const it = chunk[Number(v.index) - 1];
                if (it) scores.set(it.id, { score: Number(v.score) || 3, reason: v.reason || '', worst: v.worst || '' });
            }
        } catch (err) {
            console.warn(`  prune batch failed (keeping those items): ${err.message}`);
        }
        console.log(`  rated ${Math.min(i + PRUNE_BATCH, targets.length)}/${targets.length}`);
        if (i + PRUNE_BATCH < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
    }

    const hist = {};
    for (const v of scores.values()) hist[v.score] = (hist[v.score] || 0) + 1;
    console.log('score histogram:', JSON.stringify(hist));
    return scores;
}

// --- Main --------------------------------------------------------------------

async function main() {
    console.log('Loading corpus...');
    const corpus = loadCorpus();
    console.log(`Corpus: ${corpus.size} verses`);

    const table = loadTable();

    if (REORDER) {
        let changed = 0;
        for (const it of table.items) {
            const before = (it.options || []).map(o => o.reference).join('|');
            it.options = orderOptions(it.id, it.options || []);
            if (it.options.map(o => o.reference).join('|') !== before) changed++;
        }
        saveTable(table);
        console.log(`Reordered options on ${changed} of ${table.items.length} items (deterministic by id).`);
        if (!VERIFY && !REPORT) process.exit(0);
    }

    if (VERIFY || REPORT) {
        if (REPORT) report(table);
        const ok = VERIFY ? verify(table, corpus) : true;
        process.exit(ok ? 0 : 1);
    }

    if (PRUNE_BELOW > 0) {
        const backup = writeBackup('pre-prune');
        console.log(`Prune: backup -> ${backup}`);
        const scores = await pruneWeak(table, corpus);
        const doomed = table.items.filter(i => {
            const v = scores.get(i.id);
            return v && v.score >= PRUNE_THRESHOLD;
        });
        if (PRUNE_DRY) {
            console.log(`Prune (dry run): would drop ${doomed.length} of ${table.items.length}.`);
            for (const i of doomed.slice(0, 15)) {
                const v = scores.get(i.id);
                console.log(`  ${i.id} score ${v.score} - ${v.reason}`);
            }
        } else {
            const drop = new Set(doomed.map(i => i.id));
            table.items = table.items.filter(i => !drop.has(i.id));
            table.needs = [...new Set(table.items.map(i => i.need))];
            saveTable(table);
            console.log(`Prune: dropped ${doomed.length}; table now ${table.items.length}.`);
        }
        reportUsage();
        process.exit(0);
    }

    if (REDO_BELOW > 0) {
        const keep = table.items.filter(i => (Number(i.clarity) || 0) >= REDO_BELOW);
        const dropped = table.items.length - keep.length;
        if (DRY_RUN) {
            console.log(`Redo (dry run): would drop ${dropped} item(s) rated below clarity ${REDO_BELOW}.`);
        } else if (dropped > 0) {
            // Destructive: always leave a restore point first.
            const backup = writeBackup('pre-redo');
            console.log(`Redo: backup written to ${backup}`);
            table.items = keep;
            table.needs = [...new Set(table.items.map(i => i.need))];
            saveTable(table);
            // Clearing progress frees the dropped scenarios to regenerate; kept
            // items' scenarios are re-seeded from the table, so they stay skipped.
            try { fs.unlinkSync(PROGRESS_FILE); } catch (e) { /* none */ }
            console.log(`Redo: dropped ${dropped} item(s) rated below clarity ${REDO_BELOW}.`);
        } else {
            console.log(`Redo: nothing rated below clarity ${REDO_BELOW}.`);
        }
    }

    const profiles = NEED_FILTER.length
        ? NEEDS.filter(n => NEED_FILTER.some(f => f.toLowerCase() === n.need.toLowerCase()))
        : NEEDS;

    if (!profiles.length) {
        console.error(`No matching needs. Available: ${NEEDS.map(n => n.need).join(', ')}`);
        process.exit(1);
    }

    // How many more items are needed to reach the requested total?
    const inScope = (it) => !NEED_FILTER.length || profiles.some(p => p.need === it.need);
    const existing = table.items.filter(inScope).length;
    let needed = SIZE > 0 ? Math.max(0, SIZE - existing) : Infinity;

    if (SIZE > 0) {
        console.log(`Target: ${SIZE} items. In scope: ${existing}. Need ${needed} more.`);
        if (needed === 0) {
            console.log('Table already at or above target. Nothing to do.');
            return;
        }
    }

    // Build the work list, balanced across needs.
    const done = loadProgress();
    // Scenarios already in the table count as done, or the seed items get regenerated.
    for (const it of table.items) {
        if (it.need && it.scenario) done.add(scenarioKey(it.need, it.scenario));
    }
    const pools = new Map();
    let work = [];
    for (const profile of profiles) {
        const pool = buildPool(corpus, profile, POOL_SIZE);
        if (pool.length < 8) {
            console.warn(`Skipping ${profile.need}: only ${pool.length} candidate verses`);
            continue;
        }
        pools.set(profile.need, pool);
        for (const scenario of profile.scenarios) {
            if (done.has(scenarioKey(profile.need, scenario))) continue;
            work.push({ profile, pool, scenario });
        }
    }
    work = interleaveByNeed(work);

    // Curated bank exhausted? Grow it rather than silently under-delivering.
    if (Number.isFinite(needed) && needed > work.length && EXPAND && API_KEY) {
        console.log(`Curated bank has ${work.length} usable scenarios; expanding by ~${needed - work.length}...`);
        const expanded = await expandScenarios(profiles, done, needed - work.length);
        for (const profile of profiles) {
            const pool = pools.get(profile.need);
            if (!pool) continue;
            for (const scenario of (expanded.get(profile.need) || [])) {
                if (done.has(scenarioKey(profile.need, scenario))) continue;
                work.push({ profile, pool, scenario });
            }
        }
        work = interleaveByNeed(work);
    }

    if (!Number.isFinite(needed)) needed = work.length;

    if (needed > work.length) {
        console.warn(`Warning: ${needed} items requested but only ${work.length} scenarios available.`);
        console.warn('  Re-run with --expand to generate more scenarios, or lower --size.');
    }

    const limited = work.slice(0, needed);
    console.log(`Scenarios to generate: ${limited.length} across ${profiles.length} needs` +
        (limited.length < needed ? ` (short by ${needed - limited.length})` : ''));

    if (DRY_RUN) {
        const first = limited.slice(0, BATCH_SIZE);
        if (!first.length) { console.log('Nothing to do.'); return; }
        const { profile, pool } = first[0];
        console.log('\n=== POOL for ' + profile.need + ' (' + pool.length + ' verses) ===');
        for (const v of pool.slice(0, 12)) console.log(`  [${v.Category}] ${v.Reference} - ${previewOf(v.Text, 70)}`);
        if (pool.length > 12) console.log(`  ... and ${pool.length - 12} more`);
        console.log('\n=== PROMPT (first batch) ===\n');
        console.log(buildBatchPrompt(profile, first.map(f => f.scenario), pool, [...(answersByNeed(table).get(profile.need) || [])]));
        console.log('\n=== dry run: no API calls made ===');
        return;
    }

    if (!API_KEY) {
        console.error(`\nError: ${P.keyEnv} is not set for provider "${PROVIDER}".`);
        console.error(`  node scripts/generate_need_comparison.js --size 3 --provider ${PROVIDER}`);
        console.error(`  (keys are read from the project .env, or from the environment)`);
        console.error('  Get one at https://openrouter.ai/keys');
        console.error('\nYou can inspect the prompt without a key using --dry-run,');
        console.error('and validate the existing table with --verify / --report.');
        process.exit(1);
    }

    if (!limited.length) { console.log('Nothing to do.'); return; }

    // Group by need so one call covers several scenarios from the same pool.
    const batches = chunkByNeed(limited, BATCH_SIZE);

    let added = 0, rejected = 0, flagged = 0;
    const rejects = [];

    for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const profile = batch[0].profile;
        const pool = batch[0].pool;
        const scenarios = batch.map(x => x.scenario);

        console.log(`\n[${b + 1}/${batches.length}] ${profile.need}: ${scenarios.length} scenario(s)`);

        let raw;
        try {
            const usedAnswers = [...(answersByNeed(table).get(profile.need) || [])];
            const text = await callModel(buildBatchPrompt(profile, scenarios, pool, usedAnswers));
            raw = parseJsonArray(text);
        } catch (err) {
            console.error(`  FAILED: ${err.message}`);
            continue;
        }

        const idFor = nextId(table, profile.prefix);
        let counter = table.items.filter(i => i.need === profile.need).length;
        const answerMap = answersByNeed(table);

        const passed = [];
        for (const item of raw) {
            const { errors, warnings } = validateItem(item, profile, pool, corpus, answerMap);
            if (errors.length) {
                rejected++;
                rejects.push({ need: profile.need, scenario: item && item.scenario, errors });
                console.log(`  REJECT ${String(item && item.scenario).slice(0, 50)}...`);
                for (const e of errors) console.log(`         ${e}`);
                continue;
            }
            if (warnings.length) {
                flagged++;
                for (const w of warnings) console.log(`  warn: ${w}`);
                if (STRICT) { rejected++; continue; }
            }
            passed.push(item);
        }

        // Independent fairness check before anything is written to the table.
        const verdicts = (CRITIC && passed.length) ? await auditItems(passed, corpus) : null;
        let acceptedHere = 0;

        for (let k = 0; k < passed.length; k++) {
            const item = passed[k];
            if (verdicts) {
                const v = verdicts.find(x => x && Number(x.index) === k + 1);
                if (v && String(v.verdict).toLowerCase() === 'ambiguous') {
                    rejected++;
                    const why = 'critic: still defensible -> '
                        + ((v.defensible || []).join(', ') || '?')
                        + (v.reason ? ' (' + v.reason + ')' : '');
                    rejects.push({ need: profile.need, scenario: item.scenario, errors: [why] });
                    console.log(`  REJECT (ambiguous) ${String(item.scenario).slice(0, 46)}...`);
                    console.log(`         ${why}`);
                    continue;
                }
            }
            counter++;
            table.items.push(materialise(item, profile, corpus, idFor(counter)));
            if (!answerMap.has(profile.need)) answerMap.set(profile.need, new Set());
            answerMap.get(profile.need).add(item.correct.reference);
            acceptedHere++;
            added++;
            console.log(`  + ${idFor(counter)} ${item.correct.reference}`);
        }

        // The model may rewrite scenarios to add exclusions, so mark the seed
        // scenarios consumed rather than the returned text, or resume re-requests them.
        if (acceptedHere > 0) {
            for (const sc of scenarios) done.add(scenarioKey(profile.need, sc));
        }

        // Declare needs we now have items for.
        for (const it of table.items) {
            if (!table.needs.includes(it.need)) table.needs.push(it.need);
        }
        saveTable(table);
        saveProgress(done);
        console.log(`  saved (${table.items.filter(inScope).length}${SIZE ? '/' + SIZE : ''} in scope)`);

        if (b < batches.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`\nDone. Added ${added}, rejected ${rejected}, flagged ${flagged}.`);
    console.log(`Table now has ${table.items.length} items` +
        (SIZE ? ` (${table.items.filter(inScope).length} in scope, target ${SIZE})` : '') +
        ` -> ${TABLE_FILE}`);
    if (SIZE > 0 && table.items.filter(inScope).length < SIZE) {
        console.log(`Still ${SIZE - table.items.filter(inScope).length} short. Re-run with --expand to grow the scenario bank.`);
    }

    if (rejects.length) {
        const rejectFile = path.join(__dirname, '.need_comparison_rejects.json');
        fs.writeFileSync(rejectFile, JSON.stringify(rejects, null, 2));
        console.log(`Rejections written to ${rejectFile}`);
    }
    reportUsage();
    console.log('Run with --verify to check the result, --report for coverage.\n');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
