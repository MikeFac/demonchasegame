#!/usr/bin/env node

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

function resolveWallSpawnPosition(playerCode, gameState, wallData) {
    const serverPlayer = playerCode && gameState.players ? gameState.players[playerCode] : null;
    const targetX = serverPlayer && typeof serverPlayer.x === 'number' ? serverPlayer.x : wallData.spawnX;
    const targetY = serverPlayer && typeof serverPlayer.y === 'number' ? serverPlayer.y : wallData.spawnY;
    return { x: targetX, y: targetY };
}

console.log('\n=== Test: wall spawn sync prefers server player position ===');

const sharedSpawn = { spawnX: 2050, spawnY: 912.5 };
const joinedPlayerState = {
    players: {
        host: { x: 2050, y: 912.5 },
        guest: { x: 437.5, y: 1581.7 }
    }
};

const joinedPos = resolveWallSpawnPosition('guest', joinedPlayerState, sharedSpawn);
assert(joinedPos.x === 437.5 && joinedPos.y === 1581.7,
    'Joined player keeps server-assigned alternate spawn instead of shared spawn');

console.log('\n=== Test: fallback to shared spawn when player state is not ready ===');

const pendingState = { players: {} };
const fallbackPos = resolveWallSpawnPosition('guest', pendingState, sharedSpawn);
assert(fallbackPos.x === 2050 && fallbackPos.y === 912.5,
    'Fallback uses shared spawn when no authoritative player position exists yet');

console.log('\n=== Results ===');
console.log('Passed: ' + passed + ', Failed: ' + failed);

if (failed > 0) {
    process.exit(1);
}
