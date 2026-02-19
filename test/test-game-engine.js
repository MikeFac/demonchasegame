#!/usr/bin/env node
/**
 * Test shared GameEngine loads and works in Node.js
 * Run: node test/test-game-engine.js
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  ✓ ' + message);
        passed++;
    } else {
        console.log('  ✗ FAIL: ' + message);
        failed++;
    }
}

// Suppress console.log from game modules during tests
const origLog = console.log;
const origWarn = console.warn;
let suppressLogs = false;
console.log = function () { if (!suppressLogs) origLog.apply(console, arguments); };
console.warn = function () { if (!suppressLogs) origWarn.apply(console, arguments); };

// ---- Test: Module loads ----
origLog('\n=== Test: GameEngine loads ===');

const GameEngine = require('../src/shared/GameEngine');
assert(typeof GameEngine === 'function', 'GameEngine is a constructor');

// ---- Test: Instantiation with mock emitter ----
origLog('\n=== Test: GameEngine instantiation ===');
suppressLogs = true;

const emittedEvents = [];
const mockEmitter = {
    emit: function (event, data) {
        emittedEvents.push({ event: event, data: data });
    }
};

const engine = new GameEngine(mockEmitter);
assert(engine !== null, 'Engine created');
assert(engine.gameState !== null, 'gameState initialized');
assert(engine.gameState.gameLevel === 1, 'Starting at level 1');
assert(engine.gameState.monsters.length === 0, 'No monsters initially');
assert(engine.gameState.healingPoints.length > 0, 'Healing points spawned');
assert(engine.walls.length > 0, 'Walls generated');
assert(engine.wallGrid !== null, 'WallGrid created');

// ---- Test: addPlayer ----
origLog('\n=== Test: addPlayer ===');

const playerEvents = [];
engine.registerPlayerSend('player1', function (event, data) {
    playerEvents.push({ event: event, data: data });
});

const playerCode = engine.addPlayer('player1', 'TestUser');
assert(typeof playerCode === 'string', 'addPlayer returns player code');
assert(playerCode.length > 0, 'Player code is not empty');
assert(Object.keys(engine.gameState.players).length === 1, 'One player in gameState');
assert(engine.gameState.connectedPlayers === 1, 'connectedPlayers is 1');

const player = engine.gameState.players[playerCode];
assert(player !== null && player !== undefined, 'Player object exists');
assert(player.username === 'TestUser', 'Username set correctly');
assert(player.health === 100, 'Player has 100 health');
assert(player.ammo === 0, 'Player starts with 0 ammo');

// Check that walls, gameConfig, etc. were sent to the player
assert(playerEvents.some(function (e) { return e.event === 'walls'; }), 'walls event sent to player');
assert(playerEvents.some(function (e) { return e.event === 'gameConfig'; }), 'gameConfig event sent to player');

// ---- Test: Monsters were spawned for first player ----
assert(engine.gameState.monsters.length > 0, 'Initial monsters spawned for first player');

// ---- Test: handlePlayerInput - movement ----
origLog('\n=== Test: handlePlayerInput ===');

engine.handlePlayerInput('player1', 'playerPosition', { x: 200, y: 300 });
assert(player.x === 200, 'Player x updated to 200');
assert(player.y === 300, 'Player y updated to 300');

// ---- Test: handlePlayerInput - quizCorrect ----
engine.handlePlayerInput('player1', 'quizCorrect', null);
assert(player.ammo > 0, 'Player gained ammo from quiz');

// ---- Test: handlePlayerInput - playerShoot ----
const ammo = player.ammo;
engine.handlePlayerInput('player1', 'playerShoot', { x: 500, y: 300 });
assert(player.ammo === ammo - 1, 'Ammo decremented after shooting');
assert(engine.bulletManager.bullets.length === 1, 'Bullet created');

// ---- Test: handlePlayerInput - votdBonusEarned ----
engine.handlePlayerInput('player1', 'votdBonusEarned', null);
assert(player.votdDamageBonus === true, 'VOTD bonus set');

// ---- Test: update tick ----
origLog('\n=== Test: update ===');

emittedEvents.length = 0;
engine.update();
assert(emittedEvents.some(function (e) { return e.event === 'gameStateUpdate'; }), 'gameStateUpdate emitted during update');

// ---- Test: start/stop ----
origLog('\n=== Test: start/stop ===');

engine.start();
assert(engine.shouldRun === true, 'Engine running after start');
assert(engine.intervals.length > 0, 'Intervals set');

engine.stop();
assert(engine.shouldRun === false, 'Engine stopped');

// ---- Test: removePlayer ----
origLog('\n=== Test: removePlayer ===');

engine.removePlayer('player1');
assert(Object.keys(engine.gameState.players).length === 0, 'Player removed');
assert(engine.gameState.connectedPlayers === 0, 'connectedPlayers is 0');

suppressLogs = false;

// ---- Summary ----
origLog('\n=== Results ===');
origLog('Passed: ' + passed + ', Failed: ' + failed);
if (failed > 0) {
    process.exit(1);
} else {
    origLog('All tests passed!');
}
