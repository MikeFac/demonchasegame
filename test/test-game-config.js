const GameConfig = require('../src/server/config/GameConfig');
const Constants = require('../src/shared/Constants');
const LevelConfig = require('../src/shared/LevelConfig');

console.log('Testing GameConfig System...\n');

// Test 1: Preset list
console.log('=== Test 1: Preset List ===');
const presets = GameConfig.getPresetList();
console.log('Available presets:', presets);
console.assert(presets.length === 3, 'Should have 3 presets');
console.assert(presets[0].id === 'easy', 'First preset should be easy');
console.assert(presets[1].id === 'normal', 'Second preset should be normal');
console.assert(presets[2].id === 'hard', 'Third preset should be hard');
console.log('✓ Preset list OK\n');

// Test 2: Normal config (baseline)
console.log('=== Test 2: Normal Config ===');
const normalConfig = GameConfig.createGameConfig('normal');
console.log('Normal preset:', normalConfig.presetName);
console.log('Level 1 maxMonsters:', normalConfig.levelData[1].maxMonsters);
console.log('Level 1 spawnRate:', normalConfig.levelData[1].spawnRate);
console.log('Monster health multiplier:', normalConfig.monsterHealthMultiplier);
console.log('Healing spawn interval:', normalConfig.constants.HEALING_SPAWN_INTERVAL);
console.assert(normalConfig.monsterHealthMultiplier === 1.0, 'Normal should have 1.0x health');
console.assert(normalConfig.levelData[1].maxMonsters === LevelConfig.levelData[1].maxMonsters, 'Normal should match base values');
console.log('✓ Normal config OK\n');

// Test 3: Easy config
console.log('=== Test 3: Easy Config ===');
const easyConfig = GameConfig.createGameConfig('easy');
console.log('Easy preset:', easyConfig.presetName);
console.log('Level 1 maxMonsters:', easyConfig.levelData[1].maxMonsters, '(should be 70% of', LevelConfig.levelData[1].maxMonsters + ')');
console.log('Level 1 spawnRate:', easyConfig.levelData[1].spawnRate, '(should be 150% of', LevelConfig.levelData[1].spawnRate + ')');
console.log('Monster health multiplier:', easyConfig.monsterHealthMultiplier);
console.log('Healing spawn interval:', easyConfig.constants.HEALING_SPAWN_INTERVAL, '(should be 70% of 30000)');

// Easy should have:
// - 0.7x monster health
// - 0.7x max monsters (70% of base)
// - 1.5x spawn rate (slower spawning)
// - 0.7x healing interval (faster healing)
console.assert(easyConfig.monsterHealthMultiplier === 0.7, 'Easy should have 0.7x health');
console.assert(easyConfig.levelData[1].maxMonsters === Math.round(LevelConfig.levelData[1].maxMonsters * 0.7), 'Easy maxMonsters should be 70%');
console.assert(easyConfig.levelData[1].spawnRate === Math.round(LevelConfig.levelData[1].spawnRate * 1.5), 'Easy spawnRate should be 150%');
console.assert(easyConfig.constants.HEALING_SPAWN_INTERVAL === Math.round(30000 * 0.7), 'Easy healing should be 70%');
console.log('✓ Easy config OK\n');

// Test 4: Hard config
console.log('=== Test 4: Hard Config ===');
const hardConfig = GameConfig.createGameConfig('hard');
console.log('Hard preset:', hardConfig.presetName);
console.log('Level 1 maxMonsters:', hardConfig.levelData[1].maxMonsters, '(should be 130% of', LevelConfig.levelData[1].maxMonsters + ')');
console.log('Level 1 spawnRate:', hardConfig.levelData[1].spawnRate, '(should be 70% of', LevelConfig.levelData[1].spawnRate + ')');
console.log('Monster health multiplier:', hardConfig.monsterHealthMultiplier);
console.log('Healing spawn interval:', hardConfig.constants.HEALING_SPAWN_INTERVAL, '(should be 150% of 30000)');

// Hard should have:
// - 1.5x monster health
// - 1.3x max monsters
// - 0.7x spawn rate (faster spawning)
// - 1.5x healing interval (slower healing)
console.assert(hardConfig.monsterHealthMultiplier === 1.5, 'Hard should have 1.5x health');
console.assert(hardConfig.levelData[1].maxMonsters === Math.round(LevelConfig.levelData[1].maxMonsters * 1.3), 'Hard maxMonsters should be 130%');
console.assert(hardConfig.levelData[1].spawnRate === Math.round(LevelConfig.levelData[1].spawnRate * 0.7), 'Hard spawnRate should be 70%');
console.assert(hardConfig.constants.HEALING_SPAWN_INTERVAL === Math.round(30000 * 1.5), 'Hard healing should be 150%');
console.log('✓ Hard config OK\n');

// Test 5: Invalid preset defaults to normal
console.log('=== Test 5: Invalid Preset ===');
const invalidConfig = GameConfig.createGameConfig('invalid');
console.log('Invalid preset defaults to:', invalidConfig.presetName);
console.assert(invalidConfig.presetName === 'Normal', 'Invalid preset should default to normal');
console.log('✓ Invalid preset handling OK\n');

// Test 6: Level 4 and 5 exist
console.log('=== Test 6: New Levels ===');
console.assert(LevelConfig.levelData[4] !== undefined, 'Level 4 should exist');
console.assert(LevelConfig.levelData[5] !== undefined, 'Level 5 should exist');
console.log('Level 4 qualities:', LevelConfig.levelData[4].qualities);
console.log('Level 4 monsters:', LevelConfig.levelData[4].monsters);
console.log('Level 5 qualities:', LevelConfig.levelData[5].qualities);
console.log('Level 5 monsters:', LevelConfig.levelData[5].monsters);
console.log('✓ Levels 4 and 5 OK\n');

// Test 7: All levels get scaled
console.log('=== Test 7: All Levels Scaled ===');
for (let level = 1; level <= 5; level++) {
    const easy = easyConfig.levelData[level];
    const hard = hardConfig.levelData[level];
    const base = LevelConfig.levelData[level];

    console.log(`Level ${level}:`);
    console.log(`  Easy maxMonsters: ${easy.maxMonsters} (base: ${base.maxMonsters})`);
    console.log(`  Hard maxMonsters: ${hard.maxMonsters} (base: ${base.maxMonsters})`);

    console.assert(easy.maxMonsters === Math.round(base.maxMonsters * 0.7), `Level ${level} easy scaling failed`);
    console.assert(hard.maxMonsters === Math.round(base.maxMonsters * 1.3), `Level ${level} hard scaling failed`);
}
console.log('✓ All levels scaled correctly\n');

console.log('=== All Tests Passed! ===');
