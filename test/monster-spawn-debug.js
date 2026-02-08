#!/usr/bin/env node
/**
 * Debug why monster isn't moving in Game integration
 * Focuses on the specific spawn location collision issue
 */

const Game = require('../src/server/Game');
const Constants = require('../src/shared/Constants');
const Physics = require('../src/server/utils/Physics');

const mockIO = {
    emit: (event, data) => {
        if (event === 'gameStateUpdate') {
            mockIO.lastGameState = data;
            mockIO.updateCount++;
        }
    },
    to: () => mockIO,
    lastGameState: null,
    updateCount: 0
};

console.log('=== Monster Movement Debug in Game Context ===\n');

const game = new Game(mockIO, 'test-room');
game.start();

// Mock socket
const mockSocket = {
    id: 'socket-1',
    playerCode: null,
    emit: (event, data) => {
        if (event === 'playerCode') {
            mockSocket.playerCode = data;
        }
    },
    on: () => {}
};

console.log('Adding player...');
game.addPlayer(mockSocket);

const player = game.gameState.players[mockSocket.playerCode];
console.log(`Player spawned at (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`);
console.log(`World size: ${Constants.WORLD_WIDTH}x${Constants.WORLD_HEIGHT}`);
console.log(`Maze has ${game.gameState.walls.length} walls\n`);

console.log('Waiting 3 seconds for monster spawn...\n');

setTimeout(() => {
    console.log(`Monsters: ${game.gameState.monsters.length}\n`);
    
    if (game.gameState.monsters.length === 0) {
        console.log('No monsters spawned!');
        process.exit(1);
    }
    
    const monster = game.gameState.monsters[0];
    console.log('Monster details:');
    console.log(`  ID: ${monster.id}`);
    console.log(`  Position: (${monster.x.toFixed(1)}, ${monster.y.toFixed(1)})`);
    console.log(`  Type: ${monster.chaser ? 'chaser' : 'walker'}`);
    console.log(`  Size: ${monster.width}x${monster.height}\n`);
    
    // Check collision at current position
    const currentOverlap = Physics.isOverlapping(
        monster.x, monster.y,
        monster.width, monster.height,
        game.gameState,
        monster.id
    );
    console.log(`Collision at current position: ${currentOverlap ? 'OVERLAPPING!' : 'clear'}`);
    
    // Check if player exists and distance
    const nearest = Physics.findNearestPlayer(monster, game.gameState);
    if (nearest) {
        const dx = nearest.x - monster.x;
        const dy = nearest.y - monster.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        console.log(`Distance to player: ${dist.toFixed(1)}`);
        
        if (monster.chaser) {
            const speed = game.levelData[game.gameState.gameLevel].monsterSpeed;
            const newX = monster.x + (dx / dist) * speed;
            const newY = monster.y + (dy / dist) * speed;
            
            console.log(`\nExpected next position: (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
            
            const nextOverlap = Physics.isOverlapping(
                newX, newY,
                monster.width, monster.height,
                game.gameState,
                monster.id
            );
            console.log(`Collision at next position: ${nextOverlap ? 'OVERLAPPING!' : 'clear'}`);
            
            if (nextOverlap) {
                console.log('\n⚠️  Monster cannot move - collision detected at new position!');
                console.log('   This means the monster is trapped by walls.');
            }
        }
    } else {
        console.log('⚠️  No nearest player found!');
    }
    
    console.log('\n=== Test: Forcing monster to move 20 frames ===\n');
    
    console.log('Frame | X Position | Y Position | Can Move?');
    console.log('------|------------|------------|----------');
    
    let moveCount = 0;
    for (let i = 0; i < 20; i++) {
        const m = game.gameState.monsters[0];
        const prevX = m.x;
        const prevY = m.y;
        
        game.monsterManager.updateMonsters();
        
        const moved = (m.x !== prevX || m.y !== prevY);
        if (moved) moveCount++;
        
        if (i % 5 === 0) {
            console.log(`${i.toString().padStart(5)} | ${m.x.toFixed(1).padStart(10)} | ${m.y.toFixed(1).padStart(10)} | ${moved ? 'YES' : 'NO'}`);
        }
    }
    
    console.log(`\nMoved in ${moveCount}/20 frames`);
    
    if (moveCount === 0) {
        console.log('\n⚠️  Monster is completely stuck!');
        
        // Find nearby walls
        console.log('\nChecking for nearby walls...');
        const range = 200;
        let nearbyWalls = 0;
        game.gameState.walls.forEach((wall, i) => {
            const wdx = wall.x - monster.x;
            const wdy = wall.y - monster.y;
            const wdist = Math.sqrt(wdx*wdx + wdy*wdy);
            if (wdist < range) {
                console.log(`  Wall ${i}: (${wall.x}, ${wall.y}) size ${wall.width}x${wall.height} - distance ${wdist.toFixed(1)}`);
                nearbyWalls++;
            }
        });
        console.log(`Found ${nearbyWalls} walls within ${range}px`);
    }
    
    game.shouldRun = false;
    console.log('\n=== End of Debug ===');
    process.exit(0);
}, 3000);
