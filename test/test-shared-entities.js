#!/usr/bin/env node
/**
 * Test shared entity managers load and work in Node.js
 * Run: node test/test-shared-entities.js
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

// ---- Test: Modules load from shared ----
origLog('\n=== Test: Shared Entity Modules Load ===');

const MonsterManager = require('../src/shared/entities/MonsterManager');
assert(typeof MonsterManager === 'function', 'MonsterManager is a constructor');

const PlayerManager = require('../src/shared/entities/PlayerManager');
assert(typeof PlayerManager === 'function', 'PlayerManager is a constructor');

const BulletManager = require('../src/shared/entities/BulletManager');
assert(typeof BulletManager === 'function', 'BulletManager is a constructor');

const CollectibleManager = require('../src/shared/entities/CollectibleManager');
assert(typeof CollectibleManager === 'function', 'CollectibleManager is a constructor');

// ---- Test: Re-export stubs work ----
origLog('\n=== Test: Re-export Stubs ===');

const MMStub = require('../src/server/entities/MonsterManager');
assert(MMStub === MonsterManager, 'MonsterManager re-export matches shared');

const PMStub = require('../src/server/entities/PlayerManager');
assert(PMStub === PlayerManager, 'PlayerManager re-export matches shared');

const BMStub = require('../src/server/entities/BulletManager');
assert(BMStub === BulletManager, 'BulletManager re-export matches shared');

const CMStub = require('../src/server/entities/CollectibleManager');
assert(CMStub === CollectibleManager, 'CollectibleManager re-export matches shared');

// ---- Test: No crypto import needed ----
origLog('\n=== Test: No crypto dependency ===');

const SharedUtils = require('../src/shared/utils');
assert(typeof SharedUtils.generateId === 'function', 'generateId available');
assert(typeof SharedUtils.generateUUID === 'function', 'generateUUID available');

const id1 = SharedUtils.generateId(4);
const id2 = SharedUtils.generateId(4);
assert(id1.length === 8, 'generateId(4) produces 8 hex chars');
assert(id1 !== id2, 'generateId produces unique IDs');

const uuid = SharedUtils.generateUUID();
assert(uuid.length === 36, 'generateUUID produces 36-char UUID');
assert(uuid.includes('-'), 'UUID contains dashes');

// ---- Test: MonsterManager can spawn without crypto ----
origLog('\n=== Test: MonsterManager spawn ===');
suppressLogs = true;

const Constants = require('../src/shared/Constants');
const LevelConfig = require('../src/shared/LevelConfig');

const mockIO = { emit: function () { } };
const gameState = {
    gameLevel: 1,
    players: {
        'abc': { x: 100, y: 100, width: 32, height: 32, state: 'alive' }
    },
    monsters: [],
    spawnsLeft: 10,
    walls: []
};

const mm = new MonsterManager(gameState, mockIO, LevelConfig.levelData, null, 1.0);
mm.spawnMonster();

assert(gameState.monsters.length > 0, 'MonsterManager spawned a monster');
if (gameState.monsters.length > 0) {
    assert(typeof gameState.monsters[0].id === 'string', 'Monster has string ID');
    assert(gameState.monsters[0].id.length > 0, 'Monster ID is not empty');
    assert(typeof gameState.monsters[0].demonType === 'string', 'Monster has demonType');
    assert(gameState.monsters[0].health > 0, 'Monster has positive health');
}

// ---- Test: PlayerManager can generate codes without crypto ----
origLog('\n=== Test: PlayerManager ===');

const gameState2 = {
    gameLevel: 1,
    players: {},
    monsters: [],
    connectedPlayers: 0,
    walls: []
};

const pm = new PlayerManager(gameState2, mockIO, null);
const code = pm.generatePlayerCode();
assert(typeof code === 'string', 'Player code is a string');
assert(code.length === 6, 'Player code is 6 hex chars (3 bytes)');

// Test addPlayer with mock socket
var emittedEvents = [];
var mockSocket = {
    username: 'TestPlayer',
    emit: function (event, data) { emittedEvents.push({ event: event, data: data }); }
};

pm.addPlayer(mockSocket);
assert(Object.keys(gameState2.players).length === 1, 'Player added to gameState');
assert(gameState2.connectedPlayers === 1, 'connectedPlayers incremented');
assert(emittedEvents.some(function (e) { return e.event === 'playerCode'; }), 'playerCode event emitted to socket');

// ---- Test: CollectibleManager can create collectibles without crypto ----
origLog('\n=== Test: CollectibleManager ===');

const gameState3 = {
    collectibles: [],
    walls: []
};

const cm = new CollectibleManager(gameState3, null);
const collectible = cm.spawnCollectible('sword', true);
assert(collectible !== null, 'Collectible spawned');
assert(typeof collectible.id === 'string', 'Collectible has string ID');
assert(collectible.type === 'sword', 'Collectible type is sword');
assert(gameState3.collectibles.length === 1, 'Collectible in gameState');

// Test rollMonsterDrop
const dropResult = cm.rollMonsterDrop(500, 500);
assert(typeof dropResult.dropped === 'boolean', 'rollMonsterDrop returns dropped boolean');

// ---- Test: BulletManager works ----
origLog('\n=== Test: BulletManager ===');

const gameState4 = {
    players: { 'abc': { x: 100, y: 100, width: 32, height: 32 } },
    monsters: [],
    walls: [],
    bullets: []
};

const bm = new BulletManager(mockIO, mm, null, gameState4);
const bullet = bm.addBullet('abc', { x: 100, y: 100 }, { x: 200, y: 100 });
assert(bullet !== null, 'Bullet created');
assert(bullet.active === true, 'Bullet is active');
assert(bm.bullets.length === 1, 'Bullet in manager');

bm.update(gameState4);
assert(gameState4.bullets.length === 1, 'Bullet in gameState after update');
assert(gameState4.bullets[0].x > 100, 'Bullet moved right');

suppressLogs = false;

// ---- Summary ----
origLog('\n=== Results ===');
origLog('Passed: ' + passed + ', Failed: ' + failed);
if (failed > 0) {
    process.exit(1);
} else {
    origLog('All tests passed!');
}
