#!/usr/bin/env node

const assert = require('assert');
const GameConfig = require('../src/shared/GameConfig');
const GameEngine = require('../src/shared/GameEngine');
const MapGeneratorFactory = require('../src/shared/map-generators');
const Constants = require('../src/shared/Constants');

const mapData = MapGeneratorFactory.generateMap('classic', Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT, Constants.CELL_SIZE);

const config = GameConfig.createFromCustomBalance(
    {
        monsterHealth: 1.0,
        monsterDamage: 1.0,
        monsterSpeed: 1.0,
        spawnRate: 1.0,
        maxMonsters: 1.0,
        healingFrequency: 1.0
    },
    null,
    [{
        qualities: ['Faith'],
        monsters: ['Fear'],
        monstersToKill: 5,
        maxMonsters: 5,
        spawnRate: 30
    }],
    {
        mapData: mapData,
        fixedMonsters: [
            {
                x: mapData.spawnX + 100,
                y: mapData.spawnY,
                demonType: 'Fear',
                stats: { healthMultiplier: 2, damageMultiplier: 1.5, speedMultiplier: 1.2 },
                isBoss: true,
                spawnTrigger: { type: 'immediate', value: 0 }
            },
            {
                x: mapData.spawnX + 180,
                y: mapData.spawnY,
                demonType: 'Doubt',
                spawnTrigger: { type: 'timer', value: 1 }
            }
        ],
        randomSpawnsEnabled: false
    }
);

const events = [];
const engine = new GameEngine({
    emit: function (event, data) {
        events.push({ event, data });
    }
}, config, 'test-room');

engine.registerPlayerSend('player1', function () {});
engine.addPlayer('player1', 'Tester');

assert.strictEqual(engine.gameState.monsters.length, 1, 'Immediate fixed monster spawns at game start');
assert.strictEqual(engine.gameState.monsters[0].fixedSpawn, true, 'Immediate spawn is marked as fixed');
assert.strictEqual(engine.gameState.monsters[0].isBoss, true, 'Boss flag is preserved on fixed monster');
assert.strictEqual(engine.monsterManager.randomSpawnsEnabled, false, 'Random spawns can be disabled for authored missions');

engine.monsterManager.fixedSpawnStartedAt = Date.now() - 2000;
engine.monsterManager.updateMonsters();

assert.strictEqual(engine.gameState.monsters.length, 2, 'Timer-triggered fixed monster spawns after threshold');

console.log('test-fixed-monster-spawns passed');
