#!/usr/bin/env node
/**
 * generate_mission.js — CLI for the Mission DSL pipeline.
 *
 * Usage:
 *   node scripts/generate_mission.js <spec.json> [--out <path>] [--force]
 *   node scripts/generate_mission.js missions/specs/david-goliath-01.spec.json
 *   node scripts/generate_mission.js missions/specs/my.spec.json --out missions/generated/my.json
 *
 * Pipeline:
 *   spec JSON → MissionCompiler.compile() → MissionValidator.validate()
 *             → (if ok) write mission JSON → exit 0
 *             → (if errors) print errors → exit 1
 *
 * Options:
 *   --out <path>   Output file path (default: missions/generated/<spec.id>.json)
 *   --force        Write even if warnings (default: warnings don't block)
 *   --check        Validate only, don't write (dry run)
 *   --pretty       Pretty-print JSON output (default: 2-space indent)
 *   --quiet        Suppress informational output
 *   --help, -h     Show this help
 */
'use strict';

var fs = require('fs');
var path = require('path');
var MissionCompiler = require('../src/shared/MissionCompiler');
var MissionValidator = require('../src/shared/MissionValidator');

function parseArgs(argv) {
    var args = { specPath: null, outPath: null, force: false, check: false, pretty: 2, quiet: false, help: false };
    var positional = [];
    for (var i = 0; i < argv.length; i++) {
        var a = argv[i];
        if (a === '--help' || a === '-h') { args.help = true; }
        else if (a === '--out') { args.outPath = argv[++i]; }
        else if (a === '--force') { args.force = true; }
        else if (a === '--check') { args.check = true; }
        else if (a === '--quiet') { args.quiet = true; }
        else if (a === '--pretty') {
            var p = argv[++i];
            args.pretty = p === '0' ? 0 : parseInt(p, 10) || 2;
        }
        else if (a[0] === '-' && a.length > 1) {
            return { error: 'Unknown option: ' + a };
        }
        else { positional.push(a); }
    }
    if (positional.length > 0) args.specPath = positional[0];
    if (positional.length > 1) return { error: 'Unexpected extra argument: ' + positional[1] };
    return args;
}

function showHelp() {
    console.log([
        'generate_mission.js — Mission DSL compiler + validator CLI',
        '',
        'Usage:',
        '  node scripts/generate_mission.js <spec.json> [options]',
        '',
        'Options:',
        '  --out <path>   Output file path (default: missions/generated/<id>.json)',
        '  --force        Write even if validation errors (use with caution)',
        '  --check        Validate only, do not write (dry run)',
        '  --pretty <n>   JSON indent size (default: 2, use 0 for minified)',
        '  --quiet        Suppress informational output',
        '  --help, -h     Show this help',
        '',
        'Examples:',
        '  node scripts/generate_mission.js missions/specs/david-goliath-01.spec.json',
        '  node scripts/generate_mission.js my-spec.json --out missions/my-mission.json',
        '  node scripts/generate_mission.js my-spec.json --check',
        ''
    ].join('\n'));
}

function fail(msg, code) {
    console.error('Error: ' + msg);
    process.exit(code || 1);
}

function main() {
    var args = parseArgs(process.argv.slice(2));

    if (args.help) { showHelp(); process.exit(0); }
    if (args.error) { fail(args.error); }
    if (!args.specPath) { fail('No spec file specified. Use --help for usage.'); }

    var specPath = path.resolve(args.specPath);
    if (!fs.existsSync(specPath)) {
        fail('Spec file not found: ' + specPath);
    }

    // ---- Load spec ----
    var spec;
    try {
        spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    } catch (e) {
        fail('Failed to parse spec JSON: ' + e.message);
    }

    if (!args.quiet) {
        console.log('Loaded spec: ' + spec.id + ' (' + spec.name + ')');
    }

    // ---- Compile ----
    var mission;
    try {
        mission = MissionCompiler.compile(spec);
    } catch (e) {
        fail('Compilation failed: ' + e.message);
    }

    if (!args.quiet) {
        var phases = mission.storyPhases || [];
        var rooms = (spec.rooms || []).length;
        console.log('Compiled: ' + phases.length + ' phases, ' + rooms + ' rooms' +
                    (mission.combatConfig ? ', boss' : '') +
                    (mission.collectCombatConfig ? ', collect combat' : ''));
    }

    // ---- Validate ----
    var result = MissionValidator.validate(mission, { customBosses: spec.customBosses });

    if (result.errors.length > 0) {
        console.error('\nValidation ERRORS (' + result.errors.length + '):');
        result.errors.forEach(function (e) {
            console.error('  ✗ ' + e.code + ': ' + e.message);
        });
    }

    if (result.warnings.length > 0 && !args.quiet) {
        console.warn('\nValidation warnings (' + result.warnings.length + '):');
        result.warnings.forEach(function (w) {
            console.warn('  ⚠ ' + w.code + ': ' + w.message);
        });
    }

    if (!result.ok && !args.force) {
        console.error('\nValidation failed. Use --force to write anyway.');
        process.exit(1);
    }

    if (args.check) {
        if (!args.quiet) {
            console.log('\n--check: validation ' + (result.ok ? 'passed' : 'forced') +
                        ', ' + result.errors.length + ' errors, ' +
                        result.warnings.length + ' warnings. No file written.');
        }
        process.exit(result.ok ? 0 : 1);
    }

    // ---- Determine output path ----
    var outPath;
    if (args.outPath) {
        outPath = path.resolve(args.outPath);
    } else {
        var generatedDir = path.resolve(__dirname, '..', 'missions', 'generated');
        outPath = path.join(generatedDir, spec.id + '.json');
    }

    // ---- Ensure output directory exists ----
    var outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
        try {
            fs.mkdirSync(outDir, { recursive: true });
        } catch (e) {
            fail('Cannot create output directory ' + outDir + ': ' + e.message);
        }
    }

    // ---- Wrap in the engine's mission file format ----
    var outputFile = {
        schemaVersion: 1,
        id: 'generated',
        missions: [mission]
    };

    // ---- Write ----
    var jsonStr = args.pretty === 0
        ? JSON.stringify(outputFile)
        : JSON.stringify(outputFile, null, args.pretty);

    try {
        fs.writeFileSync(outPath, jsonStr + '\n');
    } catch (e) {
        fail('Failed to write output: ' + e.message);
    }

    if (!args.quiet) {
        console.log('\nWritten: ' + outPath);
        console.log('  ' + (jsonStr.length / 1024).toFixed(1) + ' KB, ' +
                    (mission.storyPhases || []).length + ' phases' +
                    (result.warnings.length > 0 ? ', ' + result.warnings.length + ' warnings' : ''));
    }

    process.exit(result.ok ? 0 : 1);
}

main();