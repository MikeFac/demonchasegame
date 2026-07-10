/**
 * test-mission-validator.js
 *
 * Tests MissionValidator against:
 *   1. Valid missions (David/Goliath compiled output + existing chapter missions)
 *   2. Each error rule (synthetically broken missions)
 *   3. Each warning rule
 *
 * Run: node test/test-mission-validator.js
 */
var fs = require('fs');
var path = require('path');
var MissionCompiler = require('../src/shared/MissionCompiler');
var MissionValidator = require('../src/shared/MissionValidator');
var MissionAssetRegistry = require('../src/shared/MissionAssetRegistry');

var DAVID_SPEC_PATH = path.join(__dirname, '..', 'missions', 'specs', 'david-goliath-01.spec.json');
var MISSIONS_DIR = path.join(__dirname, '..', 'missions');

var passed = 0;
var failed = 0;

function ok(name, cond, detail) {
    if (cond) {
        passed++;
    } else {
        failed++;
        console.error('  FAIL ' + name + (detail ? ' — ' + detail : ''));
    }
}

function hasError(result, code) {
    return result.errors.some(function (e) { return e.code === code; });
}
function hasWarning(result, code) {
    return result.warnings.some(function (w) { return w.code === code; });
}

// -----------------------------------------------------------------
// Deep-clone helper for mutation tests
// -----------------------------------------------------------------
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function run() {
    console.log('=== MissionValidator Tests ===\n');

    var davidSpec = JSON.parse(fs.readFileSync(DAVID_SPEC_PATH, 'utf8'));
    var davidMission = MissionCompiler.compile(davidSpec);

    // ========== 1. Valid missions ==========
    console.log('--- Valid missions ---');

    var r = MissionValidator.validate(davidMission);
    ok('David/Goliath compiled output is valid', r.ok,
       r.errors.map(function (e) { return e.code + ': ' + e.message; }).join('; '));

    // Existing chapter missions (non-story — no storyPhases)
    var chapterFiles = ['chapter1-foundations.json', 'chapter2-love.json', 'chapter3-battle.json'];
    chapterFiles.forEach(function (fn) {
        var data = JSON.parse(fs.readFileSync(path.join(MISSIONS_DIR, fn), 'utf8'));
        data.missions.forEach(function (mission, i) {
            var result = MissionValidator.validate(mission);
            ok(fn + ' mission[' + i + '] valid', result.ok,
               result.errors.map(function (e) { return e.code; }).join(', '));
        });
    });

    // David/Goliath existing mission file (story mission)
    var davidFile = JSON.parse(fs.readFileSync(path.join(MISSIONS_DIR, 'featured-david-goliath.json'), 'utf8'));
    var davidExisting = davidFile.missions[0];
    r = MissionValidator.validate(davidExisting);
    ok('featured-david-goliath.json existing mission valid', r.ok,
       r.errors.map(function (e) { return e.code + ': ' + e.message; }).join('; '));

    // ========== 2. Error rules (synthetically broken) ==========
    console.log('\n--- Error rules ---');

    // SCHEMA_ID: remove id
    var m = clone(davidMission); delete m.id;
    ok('SCHEMA_ID', hasError(MissionValidator.validate(m), 'SCHEMA_ID'));

    // SCHEMA_NAME: remove name
    m = clone(davidMission); delete m.name;
    ok('SCHEMA_NAME', hasError(MissionValidator.validate(m), 'SCHEMA_NAME'));

    // SCHEMA_VERSION: bad version
    m = clone(davidMission); m.schemaVersion = 99;
    ok('SCHEMA_VERSION', hasError(MissionValidator.validate(m), 'SCHEMA_VERSION'));

    // SCHEMA_PHASE_TYPE: bad phase type
    m = clone(davidMission); m.storyPhases[1].type = 'flying';
    ok('SCHEMA_PHASE_TYPE', hasError(MissionValidator.validate(m), 'SCHEMA_PHASE_TYPE'));

    // ASSET_DEMON_UNKNOWN: unknown demon type in fixedMonsters
    m = clone(davidMission);
    m.collectCombatConfig.fixedMonsters[0].demonType = 'FakeDemon';
    ok('ASSET_DEMON_UNKNOWN', hasError(MissionValidator.validate(m), 'ASSET_DEMON_UNKNOWN'));

    // ASSET_DEMON_UNKNOWN in combatConfig (boss)
    m = clone(davidMission);
    m.combatConfig.fixedMonsters[0].demonType = 'NotARealBoss';
    ok('ASSET_DEMON_UNKNOWN (boss)', hasError(MissionValidator.validate(m), 'ASSET_DEMON_UNKNOWN'));

    // ASSET_PUZZLE_MODE: unknown mode
    m = clone(davidMission);
    m.puzzles[0].mode = 'riddle';
    ok('ASSET_PUZZLE_MODE', hasError(MissionValidator.validate(m), 'ASSET_PUZZLE_MODE'));

    // ASSET_VERSE_REF: unknown verse reference (warning, not error — story puzzles carry own answer)
    m = clone(davidMission);
    m.puzzles[0].verseRef = 'Not A Real Verse 99:99';
    ok('ASSET_VERSE_REF (warning)', hasWarning(MissionValidator.validate(m), 'ASSET_VERSE_REF'));

    // PHASE_NEXT_MISSING: nextPhase points to non-existent
    m = clone(davidMission);
    m.storyPhases[0].nextPhase = 'nonexistent-phase';
    ok('PHASE_NEXT_MISSING', hasError(MissionValidator.validate(m), 'PHASE_NEXT_MISSING'));

    // PHASE_CYCLE: create a cycle
    m = clone(davidMission);
    m.storyPhases[m.storyPhases.length - 1].nextPhase = 'intro';
    m.storyPhases[m.storyPhases.length - 1].endMission = false;
    ok('PHASE_CYCLE', hasError(MissionValidator.validate(m), 'PHASE_CYCLE'));

    // PHASE_NO_END: no endMission and no terminal
    m = clone(davidMission);
    m.storyPhases.forEach(function (p) { p.nextPhase = 'room-1'; p.endMission = false; });
    m.storyPhases[0].nextPhase = 'room-1'; // all cycle back
    ok('PHASE_NO_END', hasError(MissionValidator.validate(m), 'PHASE_NO_END'));

    // PHASE_PUZZLE_MISSING: puzzleId not in puzzles[]
    m = clone(davidMission);
    m.storyPhases[6].puzzleId = 'missing-puzzle';
    ok('PHASE_PUZZLE_MISSING', hasError(MissionValidator.validate(m), 'PHASE_PUZZLE_MISSING'));

    // PHASE_OBJECT_MISSING: objectType not in specialObjects[]
    m = clone(davidMission);
    m.storyPhases[1].objectType = 'nonexistent-object';
    ok('PHASE_OBJECT_MISSING', hasError(MissionValidator.validate(m), 'PHASE_OBJECT_MISSING'));

    // PHASE_NPC_MISSING: npcId not in npcs[]
    m = clone(davidMission);
    m.storyPhases[0].npcId = 'ghost-npc';
    ok('PHASE_NPC_MISSING', hasError(MissionValidator.validate(m), 'PHASE_NPC_MISSING'));

    // PHASE_DUP_ID: duplicate phase ids
    m = clone(davidMission);
    m.storyPhases[1].id = 'intro';
    ok('PHASE_DUP_ID', hasError(MissionValidator.validate(m), 'PHASE_DUP_ID'));

    // REACH_OBJ_OOB: specialObject placement out of bounds
    m = clone(davidMission);
    m.specialObjects[0].placements[0].x = 9999;
    ok('REACH_OBJ_OOB', hasError(MissionValidator.validate(m), 'REACH_OBJ_OOB'));

    // REACH_MONSTER_OOB: fixedMonster out of bounds
    m = clone(davidMission);
    m.collectCombatConfig.fixedMonsters[0].x = -100;
    ok('REACH_MONSTER_OOB', hasError(MissionValidator.validate(m), 'REACH_MONSTER_OOB'));

    // WIN_NO_ENDMISSION: terminal phase without endMission (dead-end)
    m = clone(davidMission);
    m.storyPhases[3].nextPhase = null;
    m.storyPhases[3].endMission = false;
    // intro→room1→room2→room3→(terminal, no endMission) — dead-end, victory never reached
    ok('WIN_NO_ENDMISSION', hasError(MissionValidator.validate(m), 'WIN_NO_ENDMISSION'));

    // WIN_NO_PATH: cycle with no endMission or terminal
    m = clone(davidMission);
    m.storyPhases.forEach(function (p) { p.nextPhase = 'room-1'; p.endMission = false; });
    m.storyPhases[0].nextPhase = 'room-1';
    ok('WIN_NO_PATH', hasError(MissionValidator.validate(m), 'WIN_NO_PATH'));

    // WIN_COLLECT_SHORT: targetCount > placements
    m = clone(davidMission);
    m.storyPhases[1].targetCount = 99; // requires 99 stones but only 5 placed
    ok('WIN_COLLECT_SHORT', hasError(MissionValidator.validate(m), 'WIN_COLLECT_SHORT'));

    // COMBAT_MAX_TOO_LOW: maxMonsters < fixedMonsters.length
    m = clone(davidMission);
    m.collectCombatConfig.maxMonsters = 2; // but 5 fixedMonsters
    ok('COMBAT_MAX_TOO_LOW', hasError(MissionValidator.validate(m), 'COMBAT_MAX_TOO_LOW'));

    // COMBAT_SPAWN_RATE_LOW: spawnRate < 1000
    m = clone(davidMission);
    m.collectCombatConfig.spawnRate = 500;
    ok('COMBAT_SPAWN_RATE_LOW', hasError(MissionValidator.validate(m), 'COMBAT_SPAWN_RATE_LOW'));

    // COMBAT_SPAWN_RATE_ZERO: spawnRate=0 with random spawns
    m = clone(davidMission);
    m.combatConfig.spawnRate = 0;
    m.combatConfig.randomSpawnsEnabled = true;
    ok('COMBAT_SPAWN_RATE_ZERO', hasError(MissionValidator.validate(m), 'COMBAT_SPAWN_RATE_ZERO'));

    // COMBAT_KILL_INFEASIBLE: monstersToKill > fixedMonsters when random disabled
    m = clone(davidMission);
    m.combatConfig.monstersToKill = 50; // boss config, only 3 fixed, random disabled
    ok('COMBAT_KILL_INFEASIBLE', hasError(MissionValidator.validate(m), 'COMBAT_KILL_INFEASIBLE'));

    // WORLD_WIDTH: too small
    m = clone(davidMission);
    m.world.width = 100;
    ok('WORLD_WIDTH', hasError(MissionValidator.validate(m), 'WORLD_WIDTH'));

    // ASSET_MAP_STYLE: unknown map style
    m = clone(davidMission);
    m.mapStyle = 'volcano';
    ok('ASSET_MAP_STYLE', hasError(MissionValidator.validate(m), 'ASSET_MAP_STYLE'));

    // ========== 3. Warning rules ==========
    console.log('\n--- Warning rules ---');

    // WARN_BOSS_HP_HIGH: healthMultiplier > 10
    m = clone(davidMission);
    m.combatConfig.fixedMonsters[0].stats.healthMultiplier = 15;
    ok('WARN_BOSS_HP_HIGH', hasWarning(MissionValidator.validate(m), 'WARN_BOSS_HP_HIGH'));

    // WARN_COLLECT_TOO_MANY: > 8 placements
    m = clone(davidMission);
    m.specialObjects[0].placements = [];
    for (var i = 0; i < 10; i++) {
        m.specialObjects[0].placements.push({ x: 400 + i * 100, y: 400, guardDemonType: 'Fear' });
    }
    ok('WARN_COLLECT_TOO_MANY', hasWarning(MissionValidator.validate(m), 'WARN_COLLECT_TOO_MANY'));

    // WARN_NO_OUTRO: ends with combat not dialogue
    m = clone(davidMission);
    m.storyPhases[m.storyPhases.length - 1].type = 'combat';
    m.storyPhases[m.storyPhases.length - 1].endMission = false;
    m.storyPhases[m.storyPhases.length - 1].nextPhase = null;
    ok('WARN_NO_OUTRO', hasWarning(MissionValidator.validate(m), 'WARN_NO_OUTRO'));

    // WARN_MANY_ROOMS_COMPACT: > 6 encounters in compact world
    m = clone(davidMission);
    // Add extra phases to exceed 6 encounters
    for (var j = 0; j < 3; j++) {
        m.storyPhases.splice(m.storyPhases.length - 2, 0, {
            id: 'extra-' + j, type: 'combatCollect', targetCount: 1, objectType: 'smoothStone', nextPhase: 'bossFight'
        });
    }
    ok('WARN_MANY_ROOMS_COMPACT', hasWarning(MissionValidator.validate(m), 'WARN_MANY_ROOMS_COMPACT'));

    // ========== 4. Custom bosses ==========
    console.log('\n--- Custom bosses ---');

    var desertSpec = {
        schemaVersion: 1,
        id: 'desert-test',
        name: 'Desert Test',
        description: 'Test',
        objective: 'Win',
        difficulty: 'medium',
        winCondition: { type: 'defeatBoss', bossId: 'sandwraith' },
        rooms: [{ id: 'r1', type: 'combatArena', guard: { demonType: 'Fear' } }],
        boss: { demonType: 'SandWraith', label: 'Sand Wraith', required: true },
        customBosses: ['SandWraith'],
        outro: { lines: ['Victory.'], endMission: true }
    };
    var desertMission = MissionCompiler.compile(desertSpec);
    r = MissionValidator.validate(desertMission, { customBosses: ['SandWraith'] });
    ok('custom boss validated with customBosses option', r.ok,
       r.errors.map(function (e) { return e.code; }).join(', '));

    // Without customBosses option → should error
    r = MissionValidator.validate(desertMission);
    ok('custom boss rejected without customBosses option', hasError(r, 'ASSET_DEMON_UNKNOWN'));

    // ========== 5. Edge cases ==========
    console.log('\n--- Edge cases ---');

    // null mission
    r = MissionValidator.validate(null);
    ok('null mission rejected', !r.ok && hasError(r, 'SCHEMA_NOT_OBJECT'));

    // Empty object
    r = MissionValidator.validate({});
    ok('empty object rejected', !r.ok);

    // spawnRate=999 should NOT trigger COMBAT_SPAWN_RATE_LOW (it's the "no spawn" sentinel)
    m = clone(davidMission);
    m.collectCombatConfig.spawnRate = 999;
    ok('spawnRate=999 allowed (no-spawn sentinel)', !hasError(MissionValidator.validate(m), 'COMBAT_SPAWN_RATE_LOW'));

    // monstersToKill=99 should NOT trigger COMBAT_KILL_INFEASIBLE (it's the "endless" sentinel)
    m = clone(davidMission);
    m.collectCombatConfig.monstersToKill = 99;
    ok('monstersToKill=99 allowed (endless sentinel)', !hasError(MissionValidator.validate(m), 'COMBAT_KILL_INFEASIBLE'));

    // -- Summary --
    console.log('\n=== Results ===');
    console.log('Passed: ' + passed);
    console.log('Failed: ' + failed);
    if (failed > 0) {
        console.log('\nSome tests FAILED.');
        process.exit(1);
    } else {
        console.log('\nAll tests PASSED.');
        process.exit(0);
    }
}

run();