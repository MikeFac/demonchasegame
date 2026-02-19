#!/usr/bin/env node
/**
 * Test LocalNetwork adapter in Node.js
 * Run: node test/test-local-network.js
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

const origLog = console.log;
const origWarn = console.warn;
let suppressLogs = false;
console.log = function () { if (!suppressLogs) origLog.apply(console, arguments); };
console.warn = function () { if (!suppressLogs) origWarn.apply(console, arguments); };

// Load shared modules (simulating browser script tag loading)
// LocalNetwork is a browser-only class that expects window globals,
// but we can test it by loading the deps as Node.js modules and
// exposing GameEngine and GameConfig on global scope
global.GameEngine = require('../src/shared/GameEngine');
global.GameConfig = require('../src/shared/GameConfig');

// Load LocalNetwork — wrap the file content so the class is captured
const fs = require('fs');
const path = require('path');
const localNetworkCode = fs.readFileSync(path.join(__dirname, '../src/client/LocalNetwork.js'), 'utf8');
// The file defines LocalNetwork as a class statement; eval in non-strict captures it
const LocalNetwork = new Function(localNetworkCode + '\nreturn LocalNetwork;')();

// ---- Test: Class exists ----
origLog('\n=== Test: LocalNetwork loads ===');
assert(typeof LocalNetwork === 'function', 'LocalNetwork is a constructor');

// ---- Test: Instantiation ----
origLog('\n=== Test: Instantiation ===');
const ln = new LocalNetwork();
assert(ln !== null, 'LocalNetwork created');
assert(ln.isConnected === false, 'Not connected initially');
assert(ln.engine === null, 'No engine initially');

// ---- Test: connect() returns Promise ----
origLog('\n=== Test: connect() ===');
suppressLogs = true;

let connectResolved = false;
ln.connect().then(function () {
    connectResolved = true;
    assert(connectResolved, 'connect() resolved');
    assert(ln.isConnected === true, 'isConnected is true after connect');

    runGameTests();
});

function runGameTests() {
    // ---- Test: sendStartSoloGame creates engine ----
    origLog('\n=== Test: sendStartSoloGame ===');

    const receivedEvents = [];
    ln.setCallbacks({
        onGameStateUpdate: function (data) { receivedEvents.push({ event: 'gameStateUpdate', data: data }); },
        onPlayerCode: function (code) { receivedEvents.push({ event: 'playerCode', code: code }); },
        onWalls: function (data) { receivedEvents.push({ event: 'walls', data: data }); },
        onGameConfig: function (data) { receivedEvents.push({ event: 'gameConfig', data: data }); },
        onMonsterKilled: function (data) { receivedEvents.push({ event: 'monsterKilled', data: data }); },
        onBulletHit: function (data) { receivedEvents.push({ event: 'bulletHit', data: data }); },
        onLevelAdvancing: function (data) { receivedEvents.push({ event: 'levelAdvancing', data: data }); },
        onMonsterDrop: function (data) { receivedEvents.push({ event: 'monsterDrop', data: data }); }
    });

    ln.sendStartSoloGame('normal', null, 'normal', 'classic');

    assert(ln.engine !== null, 'Engine created');
    assert(ln.engine.shouldRun === true, 'Engine is running');
    assert(ln.playerCode !== null, 'Player code assigned');

    // Check events were fired
    assert(receivedEvents.some(function (e) { return e.event === 'playerCode'; }), 'playerCode event received');
    assert(receivedEvents.some(function (e) { return e.event === 'walls'; }), 'walls event received');
    assert(receivedEvents.some(function (e) { return e.event === 'gameConfig'; }), 'gameConfig event received');

    // ---- Test: Player exists in gameState ----
    const player = ln.engine.gameState.players[ln.playerCode];
    assert(player !== undefined, 'Player exists in engine gameState');
    assert(player.health === 100, 'Player has 100 health');

    // ---- Test: sendPosition ----
    origLog('\n=== Test: Send methods ===');
    ln.sendPosition(200, 300);
    assert(player.x === 200, 'Position x updated');
    assert(player.y === 300, 'Position y updated');

    // ---- Test: sendQuizCorrect ----
    ln.sendQuizCorrect();
    assert(player.ammo > 0, 'Ammo gained from quiz');

    // ---- Test: sendShoot ----
    const ammo = player.ammo;
    ln.sendShoot({ x: 500, y: 300 });
    assert(player.ammo === ammo - 1, 'Ammo decremented after shooting');

    // ---- Test: sendVotdBonusEarned ----
    ln.sendVotdBonusEarned();
    assert(player.votdDamageBonus === true, 'VOTD bonus set');

    // ---- Test: Monsters spawned ----
    assert(ln.engine.gameState.monsters.length > 0, 'Monsters spawned in local game');

    // ---- Test: disconnect stops engine ----
    origLog('\n=== Test: disconnect ===');
    ln.disconnect();
    assert(ln.engine === null, 'Engine null after disconnect');
    assert(ln.isConnected === false, 'isConnected false after disconnect');

    suppressLogs = false;

    // ---- Summary ----
    origLog('\n=== Results ===');
    origLog('Passed: ' + passed + ', Failed: ' + failed);
    if (failed > 0) {
        process.exit(1);
    } else {
        origLog('All tests passed!');
    }
}
