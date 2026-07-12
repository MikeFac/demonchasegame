/**
 * test-mission-compiler.js
 *
 * Tests the MissionCompiler against the David & Goliath spec (golden case).
 * Verifies structural correctness — not exact coordinate values (those depend on
 * the seeded PRNG, but should be deterministic).
 *
 * Run: node test/test-mission-compiler.js
 */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var MissionCompiler = require('../src/shared/MissionCompiler');

var SPEC_PATH = path.join(__dirname, '..', 'missions', 'specs', 'david-goliath-01.spec.json');

var passed = 0;
var failed = 0;

function ok(name, cond, detail) {
    if (cond) {
        passed++;
        // console.log('  PASS ' + name);
    } else {
        failed++;
        console.error('  FAIL ' + name + (detail ? ' — ' + detail : ''));
    }
}

function run() {
    var specRaw = fs.readFileSync(SPEC_PATH, 'utf8');
    var spec = JSON.parse(specRaw);
    var mission;

    console.log('=== MissionCompiler Tests ===\n');

    // -- Compile succeeds --
    try {
        mission = MissionCompiler.compile(spec);
        ok('compile succeeds', !!mission);
    } catch (e) {
        ok('compile succeeds', false, e.message);
        console.error('\nFATAL: compile threw, cannot continue tests.');
        process.exit(1);
    }

    // -- Top-level fields --
    ok('id matches', mission.id === 'david-goliath-01');
    ok('gameMode is story', mission.gameMode === 'story');
    ok('storyIntegration is coreLoop', mission.storyIntegration === 'coreLoop');
    ok('name matches', mission.name === 'David & Goliath: Faith Over Fear');
    ok('description matches', typeof mission.description === 'string' && mission.description.length > 0);
    ok('qualities preserved', Array.isArray(mission.qualities) && mission.qualities.length === 2);
    ok('qualities content', mission.qualities[0] === 'Faith' && mission.qualities[1] === 'Courage');
    ok('mapStyle is open', mission.mapStyle === 'open');
    ok('world is compact 2000x2000', mission.world.width === 2000 && mission.world.height === 2000);
    ok('xpMultiplier preserved', mission.xpMultiplier === 1.5);

    // -- Story phases --
    ok('storyPhases is array', Array.isArray(mission.storyPhases));
    ok('9 phases (intro + 6 rooms + boss + victory)', mission.storyPhases.length === 9,
       'got ' + mission.storyPhases.length);
    ok('phase 0 is intro dialogue', mission.storyPhases[0].id === 'intro' && mission.storyPhases[0].type === 'dialogue');
    ok('phase 0 has i18nLines', Array.isArray(mission.storyPhases[0].i18nLines) && mission.storyPhases[0].i18nLines.length === 2);
    ok('phase 0 npcId is samuel', mission.storyPhases[0].npcId === 'samuel');

    // Room phases (1-6): 5 supplyCache + 1 ruinPuzzle
    var collectPhases = mission.storyPhases.filter(function (p) { return p.type === 'combatCollect'; });
    var puzzlePhases = mission.storyPhases.filter(function (p) { return p.type === 'puzzle'; });
    ok('5 combatCollect phases', collectPhases.length === 5, 'got ' + collectPhases.length);
    ok('1 puzzle phase', puzzlePhases.length === 1, 'got ' + puzzlePhases.length);

    // Each combatCollect phase has targetCount and objectType
    collectPhases.forEach(function (p, i) {
        ok('collect phase ' + i + ' has targetCount', p.targetCount === 1);
        ok('collect phase ' + i + ' has objectType', p.objectType === 'smoothStone');
    });

    // Boss phase
    var bossPhase = mission.storyPhases.find(function (p) { return p.id === 'bossFight'; });
    ok('bossFight phase exists', !!bossPhase);
    ok('bossFight is combat type', bossPhase && bossPhase.type === 'combat');

    // Victory phase
    var victoryPhase = mission.storyPhases.find(function (p) { return p.id === 'victory'; });
    ok('victory phase exists', !!victoryPhase);
    ok('victory is dialogue', victoryPhase && victoryPhase.type === 'dialogue');
    ok('victory has endMission true', victoryPhase && victoryPhase.endMission === true);
    ok('victory has sermonRef', victoryPhase && victoryPhase.sermonRef === '1 Samuel 17:47');
    ok('victory npcId is david', victoryPhase && victoryPhase.npcId === 'david');

    // -- Phase graph wiring --
    ok('intro → room-1', mission.storyPhases[0].nextPhase === 'room-1');
    ok('room-1 → room-2', mission.storyPhases[1].nextPhase === 'room-2');
    ok('room-2 → room-3', mission.storyPhases[2].nextPhase === 'room-3');
    ok('room-3 → room-4', mission.storyPhases[3].nextPhase === 'room-4');
    ok('room-4 → room-5', mission.storyPhases[4].nextPhase === 'room-5');
    ok('room-5 → room-6', mission.storyPhases[5].nextPhase === 'room-6');
    ok('room-6 → bossFight', mission.storyPhases[6].nextPhase === 'bossFight');
    ok('bossFight → victory', mission.storyPhases[7].nextPhase === 'victory');
    ok('victory is last (no nextPhase)', mission.storyPhases[8].nextPhase === null || mission.storyPhases[8].nextPhase === undefined);

    // -- NPCs --
    ok('npcs is array', Array.isArray(mission.npcs));
    ok('2 NPCs (samuel + david)', mission.npcs.length === 2, 'got ' + mission.npcs.length);
    var samuel = mission.npcs.find(function (n) { return n.id === 'samuel'; });
    var david = mission.npcs.find(function (n) { return n.id === 'david'; });
    ok('samuel NPC exists', !!samuel);
    ok('samuel has portrait', samuel && samuel.portrait === 'images/npcs/samuel.png');
    ok('david NPC exists', !!david);
    ok('david has portrait', david && david.portrait === 'images/npcs/david.png');
    ok('npcs have position', samuel && david && samuel.position && david.position);

    // -- Special objects --
    ok('specialObjects is array', Array.isArray(mission.specialObjects));
    ok('1 specialObject (smoothStone)', mission.specialObjects.length === 1, 'got ' + mission.specialObjects.length);
    var stoneObj = mission.specialObjects[0];
    ok('smoothStone id', stoneObj.id === 'smoothStone');
    ok('smoothStone count is 5', stoneObj.count === 5, 'got ' + stoneObj.count);
    ok('smoothStone has 5 placements', stoneObj.placements.length === 5, 'got ' + stoneObj.placements.length);
    ok('each placement has x,y', stoneObj.placements.every(function (p) { return typeof p.x === 'number' && typeof p.y === 'number'; }));
    ok('each placement has guardDemonType', stoneObj.placements.every(function (p) { return typeof p.guardDemonType === 'string'; }));
    ok('placements have distinct guard types', new Set(stoneObj.placements.map(function (p) { return p.guardDemonType; })).size === 5);
    ok('spawnArea exists', !!stoneObj.spawnArea);

    // All placements within world bounds
    stoneObj.placements.forEach(function (p, i) {
        ok('placement ' + i + ' within world bounds',
           p.x >= 0 && p.x <= 2000 && p.y >= 0 && p.y <= 2000,
           'x=' + p.x + ' y=' + p.y);
    });

    // -- Puzzles --
    ok('puzzles is array', Array.isArray(mission.puzzles));
    ok('1 puzzle', mission.puzzles.length === 1);
    var puzzle = mission.puzzles[0];
    ok('puzzle id courageCloze', puzzle.id === 'courageCloze');
    ok('puzzle mode cloze', puzzle.mode === 'cloze');
    ok('puzzle verseRef', puzzle.verseRef === '1 Samuel 17:47');
    ok('puzzle answer Lord', puzzle.answer === 'Lord');
    ok('puzzle has 6 options', puzzle.options && puzzle.options.length === 6);

    // -- collectCombatConfig --
    var ccc = mission.collectCombatConfig;
    ok('collectCombatConfig exists', !!ccc);
    ok('ccc has 5 monster types', ccc.monsters.length === 5, 'got ' + ccc.monsters.length);
    ok('ccc monsters match guards', ccc.monsters.indexOf('Fear') >= 0 && ccc.monsters.indexOf('Shame') >= 0);
    ok('ccc monsterDamageFactor', typeof ccc.monsterDamageFactor === 'number');
    ok('ccc monstersToKill is 99 (endless)', ccc.monstersToKill === 99, 'got ' + ccc.monstersToKill);
    ok('ccc disableLevelBoss', ccc.disableLevelBoss === true);
    ok('ccc randomSpawnsEnabled false', ccc.randomSpawnsEnabled === false);
    ok('ccc has 5 fixedMonsters', ccc.fixedMonsters.length === 5, 'got ' + ccc.fixedMonsters.length);
    ccc.fixedMonsters.forEach(function (fm, i) {
        ok('ccc fixedMonster ' + i + ' has x,y', typeof fm.x === 'number' && typeof fm.y === 'number');
        ok('ccc fixedMonster ' + i + ' has demonType', typeof fm.demonType === 'string');
        ok('ccc fixedMonster ' + i + ' has spawnTrigger', fm.spawnTrigger && fm.spawnTrigger.type === 'immediate');
        ok('ccc fixedMonster ' + i + ' within world bounds',
           fm.x >= 0 && fm.x <= 2000 && fm.y >= 0 && fm.y <= 2000);
    });

    // -- combatConfig (boss) --
    var bc = mission.combatConfig;
    ok('combatConfig exists', !!bc);
    ok('bc has Goliath in monsters', bc.monsters.indexOf('Goliath') >= 0);
    ok('bc monstersToKill is 1', bc.monstersToKill === 1);
    ok('bc disableLevelBoss', bc.disableLevelBoss === true);
    ok('bc randomSpawnsEnabled false', bc.randomSpawnsEnabled === false);
    ok('bc has 3 fixedMonsters (boss + 2 minions)', bc.fixedMonsters.length === 3, 'got ' + bc.fixedMonsters.length);
    var bossMonster = bc.fixedMonsters.find(function (fm) { return fm.isBoss; });
    ok('boss fixedMonster exists', !!bossMonster);
    ok('boss demonType Goliath', bossMonster && bossMonster.demonType === 'Goliath');
    ok('boss label Goliath', bossMonster && bossMonster.label === 'Goliath');
    ok('boss healthMultiplier 6.0', bossMonster && bossMonster.stats.healthMultiplier === 6.0);
    ok('boss damageMultiplier 3.0', bossMonster && bossMonster.stats.damageMultiplier === 3.0);
    ok('boss sizeMultiplier 1.5', bossMonster && bossMonster.stats.sizeMultiplier === 1.5);
    ok('boss within world bounds', bossMonster && bossMonster.x >= 0 && bossMonster.x <= 2000 && bossMonster.y >= 0 && bossMonster.y <= 2000);

    // Minions
    var minionTypes = bc.fixedMonsters.filter(function (fm) { return !fm.isBoss; }).map(function (fm) { return fm.demonType; });
    ok('boss has Doubt minion', minionTypes.indexOf('Doubt') >= 0);
    ok('boss has Fear minion', minionTypes.indexOf('Fear') >= 0);

    // -- Music placeholders --
    ok('music exists', !!mission.music);
    ok('music phaseTracks is object', typeof mission.music.phaseTracks === 'object');
    ok('music fallbackTrackIndex 0', mission.music.fallbackTrackIndex === 0);
    ok('music has placeholder for each phase', Object.keys(mission.music.phaseTracks).length >= 8);

    // -- Determinism: compile twice, same result --
    var mission2 = MissionCompiler.compile(spec);
    ok('deterministic: same JSON', JSON.stringify(mission) === JSON.stringify(mission2));

    // -- Different id → different coordinates --
    var spec2 = JSON.parse(JSON.stringify(spec));
    spec2.id = 'different-mission';
    var mission3 = MissionCompiler.compile(spec2);
    ok('different id → different guard coords',
       mission3.collectCombatConfig.fixedMonsters[0].x !== mission.collectCombatConfig.fixedMonsters[0].x ||
       mission3.collectCombatConfig.fixedMonsters[0].y !== mission.collectCombatConfig.fixedMonsters[0].y);

    // -- Continuous quest flow --
    var armorSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'missions', 'specs', 'armor-of-god-01.spec.json'), 'utf8'));
    var armorMission = MissionCompiler.compile(armorSpec);
    ok('continuous quest flow preserved', armorMission.questFlow && armorMission.questFlow.mode === 'continuous');
    ok('quest guard tagged with owning step', armorMission.collectCombatConfig.fixedMonsters.every(function (monster) {
        return typeof monster.storyStepId === 'string' && monster.storyStepId.length > 0;
    }));
    var legacyQuestSpec = JSON.parse(JSON.stringify(armorSpec));
    delete legacyQuestSpec.questFlow;
    var legacyQuestMission = MissionCompiler.compile(legacyQuestSpec);
    ok('quest flow defaults to hub', legacyQuestMission.questFlow && legacyQuestMission.questFlow.mode === 'hub');

    var trialsSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'missions', 'specs', 'trials-of-grace.spec.json'), 'utf8'));
    var trialsMission = MissionCompiler.compile(trialsSpec);
    ok('quest quiz settings preserved', trialsMission.quizSettings &&
        trialsMission.quizSettings.firstLetter === 50 && trialsMission.quizSettings.cloze === 50);
    ok('quest combat quiz modes preserved', trialsMission.combatQuiz &&
        trialsMission.combatQuiz.allowedModes.join(',') === 'first_letter,cloze');
    ok('quest focus verse percentage preserved', trialsMission.combatQuiz &&
        trialsMission.combatQuiz.focusVerseReference === 'Hebrews 11:1' &&
        trialsMission.combatQuiz.focusVerseTestPercent === 70);
    ok('quest progressive cloze preserved', trialsMission.combatQuiz &&
        trialsMission.combatQuiz.progressiveStartCloze.initialWords === 2 &&
        trialsMission.combatQuiz.progressiveStartCloze.additionalWordsPerFight === 1);
    ok('quest task focus verses preserved', trialsMission.combatQuiz &&
        trialsMission.combatQuiz.taskFocusVerseReferences['collect-shield'] === 'Joshua 1:9');
    ok('quest final focus test preserved', trialsMission.combatQuiz &&
        trialsMission.combatQuiz.finalFocusVerseTest.hideAllWords === true &&
        trialsMission.combatQuiz.finalFocusVerseTest.taskIds.indexOf('collect-journal-page') >= 0);

    var npcInteractionSpec = {
        schemaVersion: 1,
        id: 'npc-interaction-test',
        name: 'NPC Interaction Test',
        description: 'Test',
        objective: 'Talk',
        difficulty: 'easy',
        winCondition: { type: 'clearRooms', count: 1 },
        rooms: [{
            id: 'teacher-room',
            type: 'narrative',
            position: 'ne',
            dialogue: {
                npcId: 'teacher', npcName: 'Teacher', position: 'ne',
                lines: ['Come close and listen.'],
                interaction: { trigger: 'proximity', radius: 90, once: true }
            }
        }]
    };
    var npcInteractionMission = MissionCompiler.compile(npcInteractionSpec);
    ok('proximity NPC interaction compiled', npcInteractionMission.npcInteractions && npcInteractionMission.npcInteractions.length === 1);
    var compiledInteraction = npcInteractionMission.npcInteractions && npcInteractionMission.npcInteractions[0];
    ok('proximity NPC preserves configured radius', compiledInteraction && compiledInteraction.radius === 90);
    ok('proximity NPC has world position', compiledInteraction && compiledInteraction.position && compiledInteraction.position.x > 0 && compiledInteraction.position.y > 0);

    // -- Edge cases --
    // Minimal spec (1 room, no intro/outro/boss)
    var minimal = {
        schemaVersion: 1,
        id: 'minimal-test',
        name: 'Test',
        description: 'Test',
        objective: 'Win',
        difficulty: 'easy',
        winCondition: { type: 'clearRooms', count: 1 },
        rooms: [{ id: 'r1', type: 'combatArena', guard: { demonType: 'Fear' } }]
    };
    var minimalMission;
    try {
        minimalMission = MissionCompiler.compile(minimal);
        ok('minimal spec compiles', !!minimalMission);
        ok('minimal has 1 phase', minimalMission.storyPhases.length === 1);
        ok('minimal phase is combat', minimalMission.storyPhases[0].type === 'combat');
        ok('minimal no boss config', !minimalMission.combatConfig);
    } catch (e) {
        ok('minimal spec compiles', false, e.message);
    }

    // No rooms → should throw or produce empty
    var noRooms = {
        schemaVersion: 1, id: 'no-rooms', name: 'X', description: 'X',
        objective: 'X', difficulty: 'easy',
        winCondition: { type: 'clearRooms', count: 0 },
        rooms: []
    };
    try {
        var noRoomMission = MissionCompiler.compile(noRooms);
        ok('empty rooms compiles', !!noRoomMission);
        ok('empty rooms has 0 phases', noRoomMission.storyPhases.length === 0);
    } catch (e) {
        ok('empty rooms compiles', false, e.message);
    }

    // Invalid schemaVersion
    try {
        MissionCompiler.compile({ schemaVersion: 99, id: 'x' });
        ok('invalid schemaVersion throws', false);
    } catch (e) {
        ok('invalid schemaVersion throws', true);
    }

    // -- Unit tests for helpers --
    console.log('\n--- Helper unit tests ---');

    var prng = MissionCompiler._makePRNG('test-seed');
    var v1a = prng(), v1b = prng(), v1c = prng();
    var prng2 = MissionCompiler._makePRNG('test-seed');
    var v2a = prng2(), v2b = prng2(), v2c = prng2();
    ok('PRNG deterministic', v1a === v2a && v1b === v2b && v1c === v2c);

    var ws = MissionCompiler._resolveWorldSize({ size: 'compact' }, 5);
    ok('resolveWorldSize compact', ws.width === 2000);
    var ws2 = MissionCompiler._resolveWorldSize(null, 2);
    ok('resolveWorldSize heuristic (2 rooms → compact)', ws2.width === 2000);
    var ws3 = MissionCompiler._resolveWorldSize(null, 5);
    ok('resolveWorldSize heuristic (5 rooms → compact)', ws3.width === 2000);
    var ws4 = MissionCompiler._resolveWorldSize(null, 10);
    ok('resolveWorldSize heuristic (10 rooms → large)', ws4.width === 4000);

    var sectors = MissionCompiler._assignSectors([
        { position: 'nw' }, { position: 'auto' }, { position: 'auto' }
    ], MissionCompiler._makePRNG('sector-test'));
    ok('assignSectors: explicit nw preserved', sectors[0] === 'nw');
    ok('assignSectors: auto filled', sectors[1] !== 'nw' && sectors[2] !== 'nw');
    ok('assignSectors: no duplicates', sectors[1] !== sectors[2]);

    var geo = MissionCompiler._roomGeometry('nw', { width: 2000, height: 2000 }, MissionCompiler._makePRNG('geo-test'));
    ok('roomGeometry: interiorX in bounds', geo.interiorX > 0 && geo.interiorX < 2000);
    ok('roomGeometry: interiorY in bounds', geo.interiorY > 0 && geo.interiorY < 2000);
    ok('roomGeometry: guardX in bounds', geo.guardX > 0 && geo.guardX < 2000);
    ok('roomGeometry: guardY in bounds', geo.guardY > 0 && geo.guardY < 2000);
    ok('roomGeometry: roomW 11', geo.roomW === 11);
    ok('roomGeometry: roomH 11', geo.roomH === 11);

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
