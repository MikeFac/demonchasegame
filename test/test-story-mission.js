/**
 * Test: Story mission phase transitions and state management.
 *
 * Runs without a server — instantiates StoryMissionEngine with a mock emitter
 * and walks through all 5 phases of the David & Goliath mission.
 *
 * Usage: node test/test-story-mission.js
 */

const StoryMissionEngine = require('../src/shared/story/StoryMissionEngine.js');
const StoryState = require('../src/shared/story/StoryState.js');
const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  PASS: ' + message);
        passCount++;
    } else {
        console.error('  FAIL: ' + message);
        failCount++;
    }
}

function loadMission() {
    const missionPath = path.join(__dirname, '..', 'missions', 'featured-david-goliath.json');
    const data = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
    return data.missions[0];
}

function makeMockEmitter(events) {
    return {
        emit: function (event, data) {
            events.push({ event: event, data: data });
        },
        on: function () {},
        removeListener: function () {}
    };
}

function testStoryStateInit() {
    console.log('\n=== Test: StoryState initialization ===');
    const mission = loadMission();
    const state = new StoryState(mission);

    assert(state.phases.length === 5, 'Should have 5 phases, got ' + state.phases.length);
    assert(state.npcs.length === 2, 'Should have 2 NPCs, got ' + state.npcs.length);
    assert(state.specialObjects.length === 1, 'Should have 1 special object type');
    assert(state.puzzles.length === 1, 'Should have 1 puzzle');
    assert(state.collectedObjects.smoothStone === 0, 'Smooth stones should start at 0');
    assert(state.currentPhaseId === null, 'Phase should be null before start');
}

function testPhaseTransitions() {
    console.log('\n=== Test: Phase transitions (intro -> victory) ===');
    const mission = loadMission();
    const events = [];
    const emitter = makeMockEmitter(events);
    const engine = new StoryMissionEngine(emitter, mission, 'test');

    engine.start();
    assert(engine.storyState.currentPhaseId === 'intro', 'After start, phase should be intro');

    // Advance dialogue (2 lines)
    engine.handleInput('p1', 'advanceDialogue');
    assert(engine.storyState.dialogueIndex === 1, 'After 1st advance, dialogueIndex should be 1');
    engine.handleInput('p1', 'advanceDialogue');
    assert(engine.storyState.currentPhaseId === 'collectStones', 'After dialogue, should be in collectStones');

    // Collect 5 stones (combatCollect phase)
    for (let i = 0; i < 5; i++) {
        engine.handleInput('p1', 'collectObject', { objectId: 'smoothStone', stoneId: i });
    }
    assert(engine.storyState.getCollectedCount('smoothStone') === 5, 'Should have collected 5 stones');
    assert(engine.storyState.currentPhaseId === 'puzzle', 'After collecting, should be in puzzle');

    // Solve puzzle
    engine.handleInput('p1', 'puzzleSolved');
    assert(engine.storyState.currentPhaseId === 'bossFight', 'After puzzle, should be in bossFight');

    // Verify combat engine started
    assert(!!engine.combatEngine, 'Combat engine should be instantiated');
    assert(!!engine.combatEngine.gameState, 'Combat gameState should exist');
    assert(engine.combatEngine.gameState.monstersToKill === 1, 'Combat monstersToKill should be 1 (Goliath)');

    // Simulate combat victory
    engine.storyState.setCombatResult('victory');
    engine._advancePhase();
    assert(engine.storyState.currentPhaseId === 'victory', 'After combat victory, should be in victory');

    // Advance victory dialogue
    engine.handleInput('p1', 'advanceDialogue');
    engine.handleInput('p1', 'advanceDialogue');
    assert(engine.storyState.ended === true, 'After victory dialogue, mission should end');

    engine.stop();
}

function testEndPhaseSermonRef() {
    console.log('\n=== Test: Victory phase has sermonRef ===');
    const mission = loadMission();
    const state = new StoryState(mission);
    const victoryPhase = state.getPhaseById('victory');
    assert(!!victoryPhase, 'Victory phase should exist');
    assert(victoryPhase.sermonRef === '1 Samuel 17:47', 'sermonRef should be 1 Samuel 17:47, got ' + victoryPhase.sermonRef);
    assert(victoryPhase.endMission === true, 'endMission should be true');
}

function testNpcPortraits() {
    console.log('\n=== Test: NPC portrait paths ===');
    const mission = loadMission();
    assert(mission.npcs[0].portrait === 'images/npcs/samuel.png', 'Samuel portrait path correct');
    assert(mission.npcs[1].portrait === 'images/npcs/david.png', 'David portrait path correct');
}

function testMusicConfig() {
    console.log('\n=== Test: Music configuration ===');
    const mission = loadMission();
    assert(!!mission.music, 'Music config should exist');
    assert(!!mission.music.phaseTracks, 'phaseTracks should exist');
    assert(Object.keys(mission.music.phaseTracks).length === 5, 'Should have 5 phase tracks');
    assert(mission.music.fallbackTrackIndex === 0, 'Fallback track index should be 0');
}

function testLocaleFiles() {
    console.log('\n=== Test: Locale files have story block ===');
    const locales = ['en', 'es', 'hi', 'hi-rom', 'id', 'ja', 'kr', 'lg', 'zw'];
    for (const lang of locales) {
        const localePath = path.join(__dirname, '..', 'public', 'locales', lang + '.json');
        const data = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        assert(!!data.story, lang + '.json should have story block');
        assert(!!data.story.david, lang + '.json should have story.david block');
        assert(!!data.story.david.title, lang + '.json should have story.david.title');
        assert(!!data.story.david.intro, lang + '.json should have story.david.intro');
        assert(!!data.story.david.victory, lang + '.json should have story.david.victory');
    }

    // Verify Spanish is a real translation (not English)
    const esData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', 'es.json'), 'utf8'));
    assert(esData.story.david.title.includes('y Goliat'), 'Spanish title should contain "y Goliat"');
    assert(!esData.story.david.title.includes('Goliath'), 'Spanish title should NOT contain "Goliath"');
}

function testCombatConfig() {
    console.log('\n=== Test: Combat config (Goliath boss) ===');
    const mission = loadMission();
    const combat = mission.combatConfig;
    assert(!!combat, 'Combat config should exist');
    assert(combat.fixedMonsters.length === 3, 'Should have 3 fixed monsters (Goliath + 2 adds)');
    assert(combat.fixedMonsters[0].isBoss === true, 'First monster should be boss (Goliath)');
    assert(combat.fixedMonsters[0].demonType === 'Goliath', 'Goliath should use the distinct Goliath type');
    assert(combat.fixedMonsters[0].stats.healthMultiplier === 6.0, 'Goliath should have 6x health');
    assert(combat.disableLevelBoss === true, 'Level boss spawning should be disabled');
    assert(combat.randomSpawnsEnabled === false, 'Random spawns should be disabled');

    // Collect combat config
	    const collectCombat = mission.collectCombatConfig;
	    assert(!!collectCombat, 'Collect combat config should exist');
	    assert(collectCombat.fixedMonsters.length === 5, 'Should have 5 guarding demons');
	    const guardTypes = collectCombat.fixedMonsters.map((monster) => monster.demonType);
	    const distinctGuardTypes = new Set(guardTypes);
	    assert(distinctGuardTypes.size === collectCombat.fixedMonsters.length, 'Each guarding demon should use a distinct demon type');
	    assert(collectCombat.monsters.includes('Fear'), 'Should include Fear demons');
	    assert(collectCombat.monsters.includes('Shame'), 'Should include Shame demons');
	    assert(collectCombat.monsters.includes('Confusion'), 'Should include Confusion demons');
	    assert(collectCombat.monsters.includes('Unbelief'), 'Should include Unbelief demons');
	    assert(collectCombat.randomSpawnsEnabled === false, 'Random spawns disabled for tighter collect phase pacing');
	    assert(mission.world && mission.world.width === 2000 && mission.world.height === 2000, 'David/Goliath should use compact 2000x2000 world');
	    const placements = mission.specialObjects[0].placements || [];
	    assert(placements.length === 5, 'Smooth stones should have five explicit placements');
	    const placementGuardTypes = new Set(placements.map((placement) => placement.guardDemonType));
	    assert(placementGuardTypes.size === 5, 'Each smooth stone placement should name a different guard type');

	    // Puzzle should have multiple-choice options (no typing)
    const puzzle = mission.puzzles[0];
    assert(Array.isArray(puzzle.options) && puzzle.options.length >= 4, 'Puzzle should have multiple-choice options array');
    assert(puzzle.options.includes(puzzle.answer), 'Correct answer should be in options');
}

// Run all tests
console.log('=== Story Mission Tests ===');
testStoryStateInit();
testPhaseTransitions();
testEndPhaseSermonRef();
testNpcPortraits();
testMusicConfig();
testLocaleFiles();
testCombatConfig();

console.log('\n=== Results ===');
console.log('Passed: ' + passCount);
console.log('Failed: ' + failCount);
process.exit(failCount > 0 ? 1 : 0);
