#!/usr/bin/env node
/**
 * Debug script for monster movement
 * Run: node test/monster-movement-debug.js
 * 
 * This tests the monster movement logic without browser or Socket.IO
 * to identify why monsters aren't moving in the game.
 */

const path = require('path');

// Mock Socket.IO before requiring Game modules
const mockIO = {
    emit: (event, data) => {
        // Suppress broadcast spam during tests
        if (event !== 'gameStateUpdate') {
            console.log(`[IO Emit] ${event}`);
        }
    },
    to: () => mockIO
};

// Require server modules
const Constants = require('../src/shared/Constants');
const LevelConfig = require('../src/shared/LevelConfig');
const Physics = require('../src/server/utils/Physics');
const MonsterManager = require('../src/server/entities/MonsterManager');

console.log('=== Monster Movement Debug Test ===\n');

// Create minimal gameState
const gameState = {
    players: {
        'player1': {
            x: 1000,
            y: 1000,
            width: Constants.PLAYER_WIDTH,
            height: Constants.PLAYER_HEIGHT
        }
    },
    monsters: [],
    healingPoints: [],
    shieldPoints: [],
    connectedPlayers: 1,
    gameLevel: 1,
    maxSpawns: LevelConfig.levelData[1].maxMonsters,
    spawnsLeft: LevelConfig.levelData[1].maxMonsters,
    monstersKilled: 0,
    walls: [
        // Simple maze for testing - just a few walls
        { x: 500, y: 500, width: 200, height: 50 },
        { x: 800, y: 800, width: 50, height: 200 }
    ]
};

console.log('Game State initialized:');
console.log(`  - Players: ${Object.keys(gameState.players).length}`);
console.log(`  - Walls: ${gameState.walls.length}`);
console.log(`  - Level: ${gameState.gameLevel}`);
console.log(`  - Max Monsters: ${gameState.maxSpawns}`);
console.log(`  - Monster Speed: ${LevelConfig.levelData[1].monsterSpeed}\n`);

// Create MonsterManager instance
const monsterManager = new MonsterManager(gameState, mockIO, LevelConfig.levelData);

console.log('=== Test 1: Manual Monster Creation ===\n');

// Create a test chaser monster near the player
const testChaser = {
    id: 'chaser-test-1',
    x: 900,  // 100 pixels from player at (1000, 1000)
    y: 900,
    health: 10,
    width: Constants.MONSTER_WIDTH,
    height: Constants.MONSTER_HEIGHT,
    demonType: 'Fear',
    maxDamage: 3,
    chaser: true,
    chasingStartTime: null,
    behaviorStartTime: Date.now(),
    showHealth: true,
    showHealthTimeout: null,
    isAttacked: false,
    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' }
};

gameState.monsters.push(testChaser);
console.log(`Created chaser monster at (${testChaser.x}, ${testChaser.y})`);
console.log(`Player is at (${gameState.players.player1.x}, ${gameState.players.player1.y})`);

// Calculate expected movement
const dx = gameState.players.player1.x - testChaser.x;
const dy = gameState.players.player1.y - testChaser.y;
const distance = Math.sqrt(dx * dx + dy * dy);
const speed = LevelConfig.levelData[1].monsterSpeed;
console.log(`\nExpected movement calculation:`);
console.log(`  - Distance to player: ${distance.toFixed(2)}`);
console.log(`  - Speed: ${speed}`);
console.log(`  - Normalized vector: (${(dx/distance).toFixed(4)}, ${(dy/distance).toFixed(4)})`);
console.log(`  - Expected new position: (${testChaser.x + (dx/distance) * speed}, ${testChaser.y + (dy/distance) * speed})\n`);

// Check collision at current position
const isOverlappingNow = Physics.isOverlapping(
    testChaser.x, 
    testChaser.y, 
    Constants.MONSTER_WIDTH, 
    Constants.MONSTER_HEIGHT, 
    gameState, 
    testChaser.id
);
console.log(`Collision check at current position: ${isOverlappingNow ? 'OVERLAPPING!' : 'clear'}`);

// Calculate new position
const newX = testChaser.x + (dx / distance) * speed;
const newY = testChaser.y + (dy / distance) * speed;

// Check collision at new position
const isOverlappingNew = Physics.isOverlapping(
    newX, 
    newY, 
    Constants.MONSTER_WIDTH, 
    Constants.MONSTER_HEIGHT, 
    gameState, 
    testChaser.id
);
console.log(`Collision check at new position (${newX.toFixed(1)}, ${newY.toFixed(1)}): ${isOverlappingNew ? 'OVERLAPPING!' : 'clear'}\n`);

console.log('=== Test 2: Simulate Update Loop ===\n');

// Run updateMonsters multiple times and track position
console.log('Frame | Monster X | Monster Y | Distance to Player');
console.log('------|-----------|-----------|-------------------');

for (let i = 0; i < 10; i++) {
    const monster = gameState.monsters[0];
    const pdx = gameState.players.player1.x - monster.x;
    const pdy = gameState.players.player1.y - monster.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    
    console.log(`${i.toString().padStart(5)} | ${monster.x.toFixed(1).padStart(9)} | ${monster.y.toFixed(1).padStart(9)} | ${pdist.toFixed(1)}`);
    
    monsterManager.updateMonsters();
}

console.log('\n=== Test 3: Create Random Walker ===\n');

// Create a random walker monster
const testWalker = {
    id: 'walker-test-1',
    x: 1200,
    y: 1200,
    health: 10,
    width: Constants.MONSTER_WIDTH,
    height: Constants.MONSTER_HEIGHT,
    demonType: 'Ignorance',
    maxDamage: 2,
    chaser: false,  // Random walker
    behaviorStartTime: Date.now(),
    showHealth: false,
    showHealthTimeout: null,
    isAttacked: false,
    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' }
};

gameState.monsters.push(testWalker);
console.log(`Created walker monster at (${testWalker.x}, ${testWalker.y})`);
console.log('\nSimulating 10 frames of walker movement:');
console.log('Frame | Walker X  | Walker Y  | walkingDistance');
console.log('------|-----------|-----------|----------------');

for (let i = 0; i < 10; i++) {
    const walker = gameState.monsters[1];
    const wd = walker.walkingDistance || 'undefined';
    console.log(`${i.toString().padStart(5)} | ${walker.x.toFixed(1).padStart(9)} | ${walker.y.toFixed(1).padStart(9)} | ${wd}`);
    
    monsterManager.updateMonsters();
}

console.log('\n=== Test 4: Collision Detection Deep Dive ===\n');

// Test wall collision
console.log('Wall positions:');
gameState.walls.forEach((wall, i) => {
    console.log(`  Wall ${i}: (${wall.x}, ${wall.y}) size ${wall.width}x${wall.height}`);
});

console.log('\nCollision test results:');

// Test various positions
const testPositions = [
    { x: 500, y: 500, desc: 'On wall 1' },
    { x: 600, y: 600, desc: 'Near wall 1' },
    { x: 100, y: 100, desc: 'Away from walls' },
    { x: 1000, y: 1000, desc: 'On player position' }
];

testPositions.forEach(pos => {
    const overlap = Physics.isOverlapping(
        pos.x, pos.y,
        Constants.MONSTER_WIDTH,
        Constants.MONSTER_HEIGHT,
        gameState
    );
    console.log(`  Position (${pos.x}, ${pos.y}) - ${pos.desc}: ${overlap ? 'COLLISION' : 'clear'}`);
});

console.log('\n=== Test 5: Find Nearest Player ===\n');

// Test finding nearest player from various positions
const testMonsterPositions = [
    { x: 1000, y: 1000 },  // On top of player
    { x: 0, y: 0 },        // Far away
    { x: 1050, y: 1050 }   // Close to player
];

testMonsterPositions.forEach(pos => {
    const mockMonster = { x: pos.x, y: pos.y };
    const nearest = Physics.findNearestPlayer(mockMonster, gameState);
    if (nearest) {
        const dist = Math.sqrt(
            Math.pow(nearest.x - pos.x, 2) + 
            Math.pow(nearest.y - pos.y, 2)
        );
        console.log(`Monster at (${pos.x}, ${pos.y}): nearest player at (${nearest.x}, ${nearest.y}), distance=${dist.toFixed(1)}`);
    } else {
        console.log(`Monster at (${pos.x}, ${pos.y}): NO PLAYER FOUND!`);
    }
});

console.log('\n=== Summary ===\n');

const finalChaser = gameState.monsters[0];
const finalWalker = gameState.monsters[1];

console.log('Chaser monster:');
console.log(`  Start: (900, 900)`);
console.log(`  End:   (${finalChaser.x.toFixed(1)}, ${finalChaser.y.toFixed(1)})`);
console.log(`  Moved: ${(finalChaser.x - 900).toFixed(1)}, ${(finalChaser.y - 900).toFixed(1)}`);

console.log('\nWalker monster:');
console.log(`  Start: (1200, 1200)`);
console.log(`  End:   (${finalWalker.x.toFixed(1)}, ${finalWalker.y.toFixed(1)})`);
console.log(`  Moved: ${(finalWalker.x - 1200).toFixed(1)}, ${(finalWalker.y - 1200).toFixed(1)}`);

if (finalChaser.x === 900 && finalChaser.y === 900) {
    console.log('\n⚠️  BUG CONFIRMED: Chaser did not move at all!');
    console.log('   Possible causes:');
    console.log('   1. Physics.isOverlapping() returning true for new position');
    console.log('   2. findNearestPlayer() returning null');
    console.log('   3. Distance calculation issue (division by zero?)');
} else {
    console.log('\n✓ Chaser moved - movement logic is working');
}

if (finalWalker.x === 1200 && finalWalker.y === 1200) {
    console.log('\n⚠️  BUG CONFIRMED: Walker did not move at all!');
} else {
    console.log('\n✓ Walker moved - movement logic is working');
}

console.log('\n=== End of Debug Test ===');
