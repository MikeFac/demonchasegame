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
        },
        {
            x: mapData.spawnX + 260,
            y: mapData.spawnY,
            demonType: 'Fear',
            behavior: { type: 'guard', patrolRadius: 0, patrolPath: [] },
            spawnTrigger: { type: 'immediate', value: 0 }
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

const fixedMonstersAtStart = engine.gameState.monsters.filter((monster) => monster.fixedSpawn);
assert.strictEqual(fixedMonstersAtStart.length, 2, 'Immediate fixed monsters spawn at game start alongside normal initial spawns');
assert.strictEqual(fixedMonstersAtStart[0].isBoss, true, 'Boss flag is preserved on fixed monster');
assert.strictEqual(fixedMonstersAtStart[1].behaviorType, 'guard', 'Guard behavior is preserved on fixed monster');
assert.strictEqual(
    fixedMonstersAtStart[1].guardRadius,
    4 * Math.max(fixedMonstersAtStart[1].width, fixedMonstersAtStart[1].height),
    'Guard monsters get a default territory radius based on monster size'
);
assert.strictEqual(fixedMonstersAtStart[1].health, 13, 'Guard monsters receive the configured HP bonus');
assert.strictEqual(engine.monsterManager.randomSpawnsEnabled, false, 'Random spawns can be disabled for authored missions');

engine.monsterManager.fixedSpawnStartedAt = Date.now() - 2000;
engine.monsterManager.updateMonsters();

const fixedMonstersAfterTimer = engine.gameState.monsters.filter((monster) => monster.fixedSpawn);
assert.strictEqual(fixedMonstersAfterTimer.length, 3, 'Timer-triggered fixed monster spawns after threshold');

console.log('test-fixed-monster-spawns passed');
