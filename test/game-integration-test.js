#!/usr/bin/env node
/**
 * Integration test for the full Game class
 * Tests the actual Game.start() and update() loop
 */

const Game = require('../src/server/Game');

// Mock Socket.IO
const mockSockets = [];
const mockIO = {
    emit: (event, data) => {
        if (event === 'gameStateUpdate') {
            // Track the last state update
            mockIO.lastGameState = data;
            mockIO.updateCount++;
        }
    },
    to: () => mockIO,
    lastGameState: null,
    updateCount: 0
};

console.log('=== Game Integration Test ===\n');

// Create game instance (same as server.js does)
const game = new Game(mockIO, 'test-room');

console.log('Game created:');
console.log(`  - Initial monsters: ${game.gameState.monsters.length}`);
console.log(`  - Initial players: ${Object.keys(game.gameState.players).length}`);
console.log(`  - Connected players: ${game.gameState.connectedPlayers}`);
console.log(`  - Spawns left: ${game.gameState.spawnsLeft}`);
console.log(`  - Max spawns: ${game.gameState.maxSpawns}\n`);

console.log('=== Test 1: Start Game Without Players ===\n');

game.start();
console.log('Game.start() called\n');

// Wait for spawn interval (2 seconds) and check if monsters spawn without players
console.log('Waiting 2.5 seconds for spawn interval...');

setTimeout(() => {
    console.log(`\nAfter 2.5s - Monsters: ${game.gameState.monsters.length}`);
    console.log(`Spawn condition check: connectedPlayers=${game.gameState.connectedPlayers} > 0? ${game.gameState.connectedPlayers > 0}`);
    console.log('Expected: 0 monsters (no players connected)\n');
    
    console.log('=== Test 2: Add a Player ===\n');
    
    // Mock socket
    const mockSocket = {
        id: 'socket-1',
        playerCode: null,
        emit: (event, data) => {
            if (event === 'playerCode') {
                mockSocket.playerCode = data;
            }
        },
        on: () => {} // Event handler registration
    };
    
    game.addPlayer(mockSocket);
    
    console.log(`Player added:`);
    console.log(`  - Socket playerCode: ${mockSocket.playerCode}`);
    console.log(`  - GameState players: ${Object.keys(game.gameState.players).length}`);
    console.log(`  - Connected players: ${game.gameState.connectedPlayers}\n`);
    
    // Get the player position
    const player = game.gameState.players[mockSocket.playerCode];
    console.log(`Player position: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})\n`);
    
    console.log('Waiting 3 seconds for monster spawn...');
    
    setTimeout(() => {
        console.log(`\nAfter 3s with player - Monsters: ${game.gameState.monsters.length}`);
        
        if (game.gameState.monsters.length === 0) {
            console.log('⚠️  BUG: No monsters spawned even with a player connected!');
            console.log('   Checking spawn conditions:');
            console.log(`   - connectedPlayers: ${game.gameState.connectedPlayers}`);
            console.log(`   - monsters.length: ${game.gameState.monsters.length}`);
            console.log(`   - maxMonsters: ${game.gameState.maxSpawns}`);
            console.log(`   - spawnsLeft: ${game.gameState.spawnsLeft}`);
        } else {
            const monster = game.gameState.monsters[0];
            console.log(`✓ Monster spawned at (${monster.x.toFixed(1)}, ${monster.y.toFixed(1)})`);
            console.log(`  Type: ${monster.chaser ? 'chaser' : 'walker'}`);
            console.log(`  Demon: ${monster.demonType}\n`);
            
            console.log('=== Test 3: Track Monster Movement ===\n');
            
            const initialX = monster.x;
            const initialY = monster.y;
            let lastX = monster.x;
            let lastY = monster.y;
            let moveCount = 0;
            
            console.log('Tracking monster position over 5 seconds...\n');
            console.log('Time  | Monster X | Monster Y | Moved?');
            console.log('------|-----------|-----------|--------');
            
            const trackInterval = setInterval(() => {
                const currentMonster = game.gameState.monsters[0];
                if (!currentMonster) {
                    console.log('Monster was removed!');
                    clearInterval(trackInterval);
                    return;
                }
                
                const moved = (currentMonster.x !== lastX || currentMonster.y !== lastY);
                if (moved) moveCount++;
                
                console.log(`${(5 - (trackInterval._idleTimeout/1000)).toFixed(1).padStart(4)}s | ${currentMonster.x.toFixed(1).padStart(9)} | ${currentMonster.y.toFixed(1).padStart(9)} | ${moved ? 'YES' : 'no'}`);
                
                lastX = currentMonster.x;
                lastY = currentMonster.y;
            }, 1000);
            
            setTimeout(() => {
                clearInterval(trackInterval);
                
                console.log('\n=== Test Results ===\n');
                
                const finalMonster = game.gameState.monsters[0];
                const totalMoveX = finalMonster.x - initialX;
                const totalMoveY = finalMonster.y - initialY;
                
                console.log(`Monster movement summary:`);
                console.log(`  Start: (${initialX.toFixed(1)}, ${initialY.toFixed(1)})`);
                console.log(`  End:   (${finalMonster.x.toFixed(1)}, ${finalMonster.y.toFixed(1)})`);
                console.log(`  Total: (${totalMoveX.toFixed(1)}, ${totalMoveY.toFixed(1)})`);
                console.log(`  Frames moved: ${moveCount}/5`);
                
                if (totalMoveX === 0 && totalMoveY === 0) {
                    console.log('\n⚠️  BUG CONFIRMED: Monster is not moving in the Game loop!');
                    console.log('   The updateMonsters() is being called but monster position is not changing.');
                    console.log('\n   Possible causes:');
                    console.log('   1. Collision detection always returning true');
                    console.log('   2. Monster spawned inside a wall');
                    console.log('   3. findNearestPlayer() returning null');
                    console.log('   4. Monster speed is 0 or undefined');
                    console.log('   5. updateMonsters() not actually being called\n');
                    
                    // Debug: Check monster state
                    console.log('   Debug info:');
                    console.log(`   - Monster chaser: ${finalMonster.chaser}`);
                    console.log(`   - Game level: ${game.gameState.gameLevel}`);
                    console.log(`   - Level data exists: ${!!game.levelData[game.gameState.gameLevel]}`);
                    if (game.levelData[game.gameState.gameLevel]) {
                        console.log(`   - Monster speed from config: ${game.levelData[game.gameState.gameLevel].monsterSpeed}`);
                    }
                    console.log(`   - Update broadcasts: ${mockIO.updateCount}`);
                    
                } else {
                    console.log('\n✓ Monster is moving correctly in the Game loop!');
                    console.log(`  Total distance moved: ${Math.sqrt(totalMoveX**2 + totalMoveY**2).toFixed(1)} pixels`);
                }
                
                // Stop the game
                game.shouldRun = false;
                console.log('\n=== End of Integration Test ===');
                process.exit(0);
                
            }, 5000);
        }
    }, 3000);
}, 2500);
