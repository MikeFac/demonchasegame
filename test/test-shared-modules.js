const assert = require('assert');

// Test Physics loads from shared
const Physics = require('../src/shared/Physics');
assert.strictEqual(typeof Physics.isOverlapping, 'function', 'Physics.isOverlapping should be a function');
assert.strictEqual(typeof Physics.findNearestPlayer, 'function', 'Physics.findNearestPlayer should be a function');
assert.strictEqual(typeof Physics.checkCollisionCircleRect, 'function', 'Physics.checkCollisionCircleRect should be a function');

// Test collision detection works
const hit = Physics.checkCollisionCircleRect(
    { x: 10, y: 10, radius: 5 },
    { x: 10, y: 10, width: 10, height: 10 }
);
assert.strictEqual(hit, true, 'Overlapping circle/rect should collide');

const miss = Physics.checkCollisionCircleRect(
    { x: 100, y: 100, radius: 5 },
    { x: 10, y: 10, width: 10, height: 10 }
);
assert.strictEqual(miss, false, 'Distant circle/rect should not collide');

// Test GameConfig loads from shared
const GameConfig = require('../src/shared/GameConfig');
assert.strictEqual(typeof GameConfig.createGameConfig, 'function', 'createGameConfig should be a function');
assert.strictEqual(typeof GameConfig.validateQuizSettings, 'function', 'validateQuizSettings should be a function');
assert.strictEqual(typeof GameConfig.getPresetList, 'function', 'getPresetList should be a function');
assert.strictEqual(typeof GameConfig.getQuizPresetList, 'function', 'getQuizPresetList should be a function');

const config = GameConfig.createGameConfig('normal');
assert.strictEqual(config.preset, 'normal', 'Normal preset should have preset=normal');
assert.ok(config.levelData, 'Config should have levelData');
assert.ok(config.quizSettings, 'Config should have quizSettings');
assert.ok(config.constants, 'Config should have constants');

// Test map generators load from shared
const MapGenerators = require('../src/shared/map-generators');
assert.strictEqual(typeof MapGenerators.generateMap, 'function', 'generateMap should be a function');
assert.ok(Array.isArray(MapGenerators.AVAILABLE_STYLES), 'AVAILABLE_STYLES should be an array');
assert.ok(MapGenerators.AVAILABLE_STYLES.includes('classic'), 'Should include classic style');

// Test map generation produces valid output
const map = MapGenerators.generateMap('classic', 3000, 3000, 25);
assert.ok(Array.isArray(map.walls), 'Map should have walls array');
assert.ok(map.walls.length > 0, 'Map should have at least one wall');
assert.ok(Array.isArray(map.grid), 'Map should have grid');
assert.strictEqual(typeof map.spawnX, 'number', 'Map should have spawnX');
assert.strictEqual(typeof map.spawnY, 'number', 'Map should have spawnY');

// Test re-export stubs still work (backward compat)
const PhysicsStub = require('../src/server/utils/Physics');
assert.strictEqual(PhysicsStub, Physics, 'Re-export stub should return same Physics module');

const GameConfigStub = require('../src/server/config/GameConfig');
assert.strictEqual(GameConfigStub, GameConfig, 'Re-export stub should return same GameConfig module');

const MapGenStub = require('../src/server/utils/map-generators');
assert.strictEqual(MapGenStub, MapGenerators, 'Re-export stub should return same map generators module');

console.log('All shared module tests passed!');
