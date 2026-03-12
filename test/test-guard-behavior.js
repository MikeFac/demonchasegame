#!/usr/bin/env node

const assert = require('assert');
const MonsterMovement = require('../src/shared/entities/MonsterMovement');
const Constants = require('../src/shared/Constants');

const guard = {
    id: 'guard-1',
    x: 100,
    y: 100,
    width: Constants.MONSTER_WIDTH,
    height: Constants.MONSTER_HEIGHT,
    behaviorType: 'guard',
    chaser: false,
    erratic: false,
    homeX: 100,
    homeY: 100,
    guardRadius: 4 * Math.max(Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT),
    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' },
    health: 10,
    maxHealth: 10
};

const gameState = {
    monsters: [guard],
    players: {
        p1: { x: 180, y: 100 }
    }
};

MonsterMovement._moveMonster(guard, 5, gameState, null);
assert(guard.x > 100, 'Guard advances on a player inside its territory');

guard.x = 380;
guard.y = 100;
gameState.players.p1.x = 500;
MonsterMovement._moveMonster(guard, 5, gameState, null);
assert(guard.x < 380, 'Guard returns toward home instead of chasing far outside its territory');

console.log('test-guard-behavior passed');
