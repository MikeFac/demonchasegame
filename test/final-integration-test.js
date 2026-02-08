#!/usr/bin/env node
/**
 * Final integration test - simulates full client-server flow
 * Verifies monsters move correctly with server authority
 */

console.log('=== Final Integration Test: Client-Server Monster Sync ===\n');

const Game = require('../src/server/Game');

// Mock Socket.IO with state tracking
const mockIO = {
    emit: (event, data) => {
        if (event === 'gameStateUpdate') {
            mockIO.gameStates.push({
                timestamp: Date.now(),
                monsters: data.monsters ? data.monsters.map(m => ({...m})) : []
            });
        }
    },
    to: () => mockIO,
    gameStates: []
};

const game = new Game(mockIO, 'final-test');
game.start();

// Add player
const mockSocket = {
    id: 'player-1',
    playerCode: null,
    emit: (event, data) => {
        if (event === 'playerCode') mockSocket.playerCode = data;
    },
    on: () => {}
};

game.addPlayer(mockSocket);
console.log('✓ Player connected\n');

console.log('Waiting 3 seconds for monster spawn and movement...\n');

setTimeout(() => {
    const states = mockIO.gameStates;
    console.log(`Received ${states.length} game state updates\n`);
    
    if (states.length === 0) {
        console.log('✗ FAIL: No state updates received');
        process.exit(1);
    }
    
    // Find first state with monsters
    const firstMonsterState = states.find(s => s.monsters.length > 0);
    if (!firstMonsterState) {
        console.log('✗ FAIL: No monsters spawned');
        process.exit(1);
    }
    
    console.log('✓ Monsters spawned\n');
    
    // Track monster movement across states
    const monsterId = firstMonsterState.monsters[0].id;
    const positions = [];
    
    states.forEach(state => {
        const monster = state.monsters.find(m => m.id === monsterId);
        if (monster) {
            positions.push({
                x: monster.x,
                y: monster.y,
                time: state.timestamp
            });
        }
    });
    
    console.log(`Tracked ${positions.length} positions for monster ${monsterId.substring(0, 8)}...\n`);
    
    if (positions.length < 2) {
        console.log('✗ FAIL: Not enough position data');
        process.exit(1);
    }
    
    // Check if monster moved
    const start = positions[0];
    const end = positions[positions.length - 1];
    const totalDist = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    console.log('Movement summary:');
    console.log(`  Start: (${start.x.toFixed(1)}, ${start.y.toFixed(1)})`);
    console.log(`  End:   (${end.x.toFixed(1)}, ${end.y.toFixed(1)})`);
    console.log(`  Total: ${totalDist.toFixed(1)} pixels`);
    
    // Check consecutive movements
    let moveCount = 0;
    for (let i = 1; i < positions.length; i++) {
        const dx = positions[i].x - positions[i-1].x;
        const dy = positions[i].y - positions[i-1].y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            moveCount++;
        }
    }
    
    console.log(`  Updates with movement: ${moveCount}/${positions.length - 1}\n`);
    
    if (totalDist > 10) {
        console.log('✓ PASS: Monster is moving correctly!');
        console.log(`  Server authority is working - monsters move ${totalDist.toFixed(0)} pixels`);
    } else if (totalDist > 0) {
        console.log('⚠ WARNING: Monster moved slightly');
        console.log('  May be stuck in collision or at edge of world');
    } else {
        console.log('✗ FAIL: Monster did not move at all');
        console.log('  Check server logs for collision or AI issues');
    }
    
    game.shouldRun = false;
    console.log('\n=== Test Complete ===');
    process.exit(totalDist > 10 ? 0 : 1);
}, 3000);
