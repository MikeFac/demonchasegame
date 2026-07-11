#!/usr/bin/env node
/**
 * generate_ai_mission.js — AI-driven mission spec generation via OpenRouter or Ollama Cloud.
 *
 * Pipeline:
 *   user prompt → AI generates spec JSON → MissionCompiler compiles it
 *                → MissionValidator validates → write spec + mission JSON
 *
 * Usage:
 *   OLLAMA_API_KEY=ollama_... node scripts/generate_ai_mission.js "prompt text"
 *   OPENROUTER_API_KEY=sk-... node scripts/generate_ai_mission.js "prompt text" --provider openrouter
 *   node scripts/generate_ai_mission.js "prompt" --difficulty hard
 *   node scripts/generate_ai_mission.js "prompt" --dry-run
 *   node scripts/generate_ai_mission.js "prompt" --check
 *
 * Options:
 *   --difficulty <easy|medium|hard>  Override difficulty in generated spec
 *   --content-mode <biblical|secular>  Override contentMode
 *   --provider NAME    AI provider: auto|ollama|openrouter (default: auto)
 *   --model NAME       Model ID (default: glm-5.2 for Ollama, anthropic/claude-sonnet-4.5 for OpenRouter)
 *   --max-tokens N     Response token budget (default: 4096)
 *   --out <path>       Write compiled mission JSON to this path (default: missions/generated/<id>.json)
 *   --check            Compile + validate only, don't write mission JSON
 *   --dry-run          Show the AI prompt without calling the API
 *   --save-spec        Also save the raw AI-generated spec JSON
 *   --force            Write even if validation errors
 *   --quiet            Suppress informational output
 *   --help, -h         Show help
 */
'use strict';

var fs = require('fs');
var path = require('path');
require('dotenv').config({ quiet: true });
var MissionCompiler = require('../src/shared/MissionCompiler');
var MissionValidator = require('../src/shared/MissionValidator');

var ROOT = path.join(__dirname, '..');
var PROMPT_FILE = path.join(ROOT, 'docs', 'plans', 'ai-mission-prompt.md');
var DEFAULT_OLLAMA_MODEL = 'glm-5.2';
var DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5';
var DEFAULT_MAX_TOKENS = 4096;

// ---- Args ----
function parseArgs(argv) {
    var args = {
        prompt: null, difficulty: null, contentMode: null, provider: 'auto', model: null,
        maxTokens: DEFAULT_MAX_TOKENS,
        outPath: null, check: false, dryRun: false, saveSpec: false, force: false, quiet: false, help: false
    };
    var positional = [];
    for (var i = 0; i < argv.length; i++) {
        var a = argv[i];
        if (a === '--help' || a === '-h') { args.help = true; }
        else if (a === '--difficulty') { args.difficulty = argv[++i]; }
        else if (a === '--content-mode') { args.contentMode = argv[++i]; }
        else if (a === '--provider') { args.provider = String(argv[++i] || '').toLowerCase(); }
        else if (a === '--model') { args.model = argv[++i]; }
        else if (a === '--max-tokens') { args.maxTokens = parseInt(argv[++i], 10); }
        else if (a === '--out') { args.outPath = argv[++i]; }
        else if (a === '--check') { args.check = true; }
        else if (a === '--dry-run') { args.dryRun = true; }
        else if (a === '--save-spec') { args.saveSpec = true; }
        else if (a === '--force') { args.force = true; }
        else if (a === '--quiet') { args.quiet = true; }
        else if (a[0] === '-' && a.length > 1) { return { error: 'Unknown option: ' + a }; }
        else { positional.push(a); }
    }
    if (positional.length > 0) args.prompt = positional.join(' ');
    return args;
}

function showHelp() {
    console.log([
        'generate_ai_mission.js — AI-driven mission spec generation',
        '',
        'Usage:',
        '  OLLAMA_API_KEY=ollama_... node scripts/generate_ai_mission.js "prompt" [options]',
        '  OPENROUTER_API_KEY=sk-... node scripts/generate_ai_mission.js "prompt" --provider openrouter [options]',
        '',
        'Options:',
        '  --difficulty <easy|medium|hard>    Override difficulty in generated spec',
        '  --content-mode <biblical|secular>  Override contentMode',
        '  --provider NAME     AI provider: auto|ollama|openrouter (default: auto)',
        '  --model NAME        Model ID (default: glm-5.2 for Ollama, anthropic/claude-sonnet-4.5 for OpenRouter)',
        '  --max-tokens N      Response token budget (default: 4096)',
        '  --out <path>        Write compiled mission JSON to this path',
        '  --check             Compile + validate only, do not write mission JSON',
        '  --dry-run           Show the AI prompt without calling the API',
        '  --save-spec         Also save the raw AI-generated spec JSON',
        '  --force             Write even if validation errors',
        '  --quiet             Suppress informational output',
        '  --help, -h          Show this help',
        '',
        'Examples:',
        '  node scripts/generate_ai_mission.js "David and Goliath, faith over fear"',
        '  node scripts/generate_ai_mission.js "desert rescue" --content-mode secular --provider ollama',
        '  node scripts/generate_ai_mission.js "forgiveness mission" --difficulty easy --check',
        ''
    ].join('\n'));
}

function normalizeProvider(provider, explicitModel) {
    if (!provider || provider === 'auto') {
        if (process.env.OLLAMA_API_KEY) return 'ollama';
        if (process.env.OPENROUTER_API_KEY) return 'openrouter';
        if (explicitModel && explicitModel.indexOf('/') >= 0) return 'openrouter';
        return 'ollama';
    }
    if (provider !== 'ollama' && provider !== 'openrouter') {
        throw new Error('Unknown provider: ' + provider + ' (expected auto, ollama, or openrouter)');
    }
    return provider;
}

function defaultModelForProvider(provider) {
    return provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_OPENROUTER_MODEL;
}

// ---- Load system prompt from markdown file ----
function loadSystemPrompt() {
    var md = fs.readFileSync(PROMPT_FILE, 'utf8');
    // The system prompt contains JSON examples in nested Markdown fences, so the
    // first closing fence is not necessarily the end of the prompt. Delimit it by
    // its document sections instead.
    var startMarker = '## System Prompt\n\n```\n';
    var endMarker = '\n```\n\n---\n\n## Few-Shot Example 1';
    var start = md.indexOf(startMarker);
    var end = md.indexOf(endMarker, start + startMarker.length);
    if (start >= 0 && end >= 0) return md.slice(start + startMarker.length, end);
    // Fallback: use the whole file
    return md;
}

// ---- AI API calls ----
async function callOpenRouter(systemPrompt, userPrompt, model, apiKey, maxTokens) {
    var OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    var response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dcgame.4you.tel',
            'X-Title': 'DC Game Mission Generator'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        var body = await response.text();
        throw new Error('OpenRouter API error ' + response.status + ': ' + body);
    }

    var data = await response.json();
    if (data.error) {
        throw new Error('API error: ' + JSON.stringify(data.error));
    }

    var choice = data.choices[0];
    if (choice.finish_reason && choice.finish_reason !== 'stop') {
        console.warn('Warning: finish_reason=' + choice.finish_reason);
    }

    return choice.message.content;
}

async function callOllamaCloud(systemPrompt, userPrompt, model, apiKey, maxTokens) {
    var OLLAMA_URL = process.env.OLLAMA_API_BASE || 'https://ollama.com/api/chat';
    var response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            format: 'json',
            stream: false,
            think: false,
            options: {
                temperature: 0.8,
                num_predict: maxTokens
            }
        })
    });

    if (!response.ok) {
        var body = await response.text();
        throw new Error('Ollama API error ' + response.status + ': ' + body);
    }

    var data = await response.json();
    if (data.error) {
        throw new Error('Ollama API error: ' + JSON.stringify(data.error));
    }

    if (!data.message || !data.message.content) {
        throw new Error('Ollama returned an empty mission response' +
            (data.done_reason ? ' (done_reason=' + data.done_reason + ')' : ''));
    }

    return data.message.content;
}

async function callAI(provider, systemPrompt, userPrompt, model, apiKey, maxTokens) {
    if (provider === 'ollama') return callOllamaCloud(systemPrompt, userPrompt, model, apiKey, maxTokens);
    return callOpenRouter(systemPrompt, userPrompt, model, apiKey, maxTokens);
}

// ---- Extract JSON from AI response (strip markdown fences if present) ----
function extractJSON(text) {
    // Strip ```json ... ``` fences
    var fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) return fenceMatch[1].trim();

    // Try to find the first { ... } block
    var start = text.indexOf('{');
    if (start < 0) throw new Error('No JSON object found in AI response');
    // Find matching closing brace (naive but works for well-formed JSON)
    var depth = 0;
    for (var i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(start, i + 1).trim(); }
    }
    throw new Error('Unbalanced braces in AI response JSON');
}

// ---- Main ----
async function main() {
    var args = parseArgs(process.argv.slice(2));

    if (args.help) { showHelp(); process.exit(0); }
    if (args.error) { console.error('Error: ' + args.error); process.exit(1); }
    if (!args.prompt) { console.error('Error: No prompt specified. Use --help for usage.'); process.exit(1); }
    if (!Number.isFinite(args.maxTokens) || args.maxTokens < 256) {
        console.error('Error: --max-tokens must be a number >= 256');
        process.exit(1);
    }

    var provider;
    try {
        provider = normalizeProvider(args.provider, args.model);
    } catch (e) {
        console.error('Error: ' + e.message);
        process.exit(1);
    }
    var model = args.model || defaultModelForProvider(provider);

    var apiKey = provider === 'ollama' ? process.env.OLLAMA_API_KEY : process.env.OPENROUTER_API_KEY;
    if (!apiKey && !args.dryRun) {
        if (provider === 'ollama') {
            console.error('Error: Set OLLAMA_API_KEY environment variable or add it to .env');
            console.error('  Get one at https://ollama.com/settings/keys');
        } else {
            console.error('Error: Set OPENROUTER_API_KEY environment variable or add it to .env');
            console.error('  Get one at https://openrouter.ai/keys');
        }
        process.exit(1);
    }

    // ---- Build user prompt ----
    var systemPrompt = loadSystemPrompt();
    var userPrompt = args.prompt;
    var overrides = [];
    if (args.difficulty) overrides.push('Use difficulty: ' + args.difficulty + '.');
    if (args.contentMode) overrides.push('Use contentMode: ' + args.contentMode + '.');
    if (overrides.length > 0) {
        userPrompt += '\n\n' + overrides.join(' ');
    }

    if (args.dryRun) {
        console.log('=== System Prompt ===');
        console.log(systemPrompt);
        console.log('\n=== User Prompt ===');
        console.log(userPrompt);
        console.log('\n(dry run — no API call)');
        process.exit(0);
    }

    if (!args.quiet) console.log('Generating mission spec via ' + provider + '/' + model + '...');

    // ---- Call AI ----
    var aiResponse;
    try {
        aiResponse = await callAI(provider, systemPrompt, userPrompt, model, apiKey, args.maxTokens);
    } catch (e) {
        console.error('AI generation failed: ' + e.message);
        process.exit(1);
    }

    // ---- Parse spec ----
    var specJson = extractJSON(aiResponse);
    var spec;
    try {
        spec = JSON.parse(specJson);
    } catch (e) {
        console.error('Failed to parse AI-generated JSON: ' + e.message);
        console.error('\n--- Raw AI response ---\n' + aiResponse);
        process.exit(1);
    }

    if (!args.quiet) {
        console.log('Generated spec: ' + spec.id + ' (' + spec.name + ')');
        console.log('  ' + (spec.rooms || []).length + ' rooms, difficulty=' + spec.difficulty +
                    ', contentMode=' + spec.contentMode);
    }

    // ---- Save raw spec if requested ----
    if (args.saveSpec) {
        var specDir = path.join(ROOT, 'missions', 'specs');
        if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });
        var specPath = path.join(specDir, spec.id + '.spec.json');
        fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
        if (!args.quiet) console.log('Saved spec: ' + specPath);
    }

    // ---- Compile ----
    var mission;
    try {
        mission = MissionCompiler.compile(spec);
    } catch (e) {
        console.error('Compilation failed: ' + e.message);
        process.exit(1);
    }

    if (!args.quiet) {
        var phases = mission.storyPhases || [];
        console.log('Compiled: ' + phases.length + ' phases' +
                    (mission.combatConfig ? ', boss' : '') +
                    (mission.collectCombatConfig ? ', collect combat' : ''));
    }

    // ---- Validate ----
    var result = MissionValidator.validate(mission, { customBosses: spec.customBosses });

    if (result.errors.length > 0) {
        console.error('\nValidation ERRORS (' + result.errors.length + '):');
        result.errors.forEach(function (e) { console.error('  X ' + e.code + ': ' + e.message); });
    }
    if (result.warnings.length > 0 && !args.quiet) {
        console.warn('\nValidation warnings (' + result.warnings.length + '):');
        result.warnings.forEach(function (w) { console.warn('  ! ' + w.code + ': ' + w.message); });
    }

    if (!result.ok && !args.force) {
        console.error('\nValidation failed. Use --force to write anyway.');
        process.exit(1);
    }

    if (args.check) {
        if (!args.quiet) {
            console.log('\n--check: ' + (result.ok ? 'passed' : 'forced') +
                        ', ' + result.errors.length + ' errors, ' +
                        result.warnings.length + ' warnings. No file written.');
        }
        process.exit(result.ok ? 0 : 1);
    }

    // ---- Write mission JSON ----
    var outPath;
    if (args.outPath) {
        outPath = path.resolve(args.outPath);
    } else {
        var genDir = path.join(ROOT, 'missions', 'generated');
        if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
        outPath = path.join(genDir, spec.id + '.json');
    }

    var outputFile = { schemaVersion: 1, id: 'generated', missions: [mission] };
    var jsonStr = JSON.stringify(outputFile, null, 2);

    try {
        fs.writeFileSync(outPath, jsonStr + '\n');
    } catch (e) {
        console.error('Failed to write output: ' + e.message);
        process.exit(1);
    }

    if (!args.quiet) {
        console.log('\nWritten: ' + outPath);
        console.log('  ' + (jsonStr.length / 1024).toFixed(1) + ' KB' +
                    (result.warnings.length > 0 ? ', ' + result.warnings.length + ' warnings' : ''));
    }

    process.exit(result.ok ? 0 : 1);
}

main().catch(function (e) {
    console.error('Unexpected error: ' + (e && e.message ? e.message : e));
    process.exit(1);
});
