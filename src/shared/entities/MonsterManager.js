(function () {
    var Constants, LevelConfig, Physics, SharedUtils, MonsterMovement;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        LevelConfig = require('../LevelConfig');
        Physics = require('../Physics');
        SharedUtils = require('../utils');
        MonsterMovement = require('./MonsterMovement');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        LevelConfig = window.LevelConfig;
        Physics = window.Physics;
        SharedUtils = window.SharedUtils;
        MonsterMovement = window.MonsterMovement;
    }

    var generateId = SharedUtils.generateId;

    var DEMON_MAX_DAMAGE = {
        Condemnation: 2, Fear: 3, Unbelief: 5, Ignorance: 2,
        Strife: 6, Confusion: 4, Depression: 3, Doubt: 4,
        Infirmity: 7, Deception: 4, Despair: 4, Temptation: 5,
        Pride: 6, Poverty: 3, Shame: 3, Slumber: 2,
        Jezebel: 8, SpiritSlumber: 2, Blindness: 2, Swarm: 5
    };
    var DEFAULT_DEMON_DAMAGE = 3;

    class MonsterManager {
        constructor(gameState, io, levelData, wallGrid, healthMultiplier) {
            if (healthMultiplier === undefined) healthMultiplier = 1.0;
            this.gameState = gameState;
            this.io = io;
            this.levelData = levelData;
            this.wallGrid = wallGrid || null;
            this.healthMultiplier = healthMultiplier;
        }

        spawnMonsterAtDistance(minDistance, maxDistance, isFirst) {
            if (isFirst === undefined) isFirst = false;
            var gameState = this.gameState;
            var levelData = this.levelData;

            if (gameState.monsters.length >= levelData[gameState.gameLevel].maxMonsters) return;

            var playerCodes = Object.keys(gameState.players);
            if (playerCodes.length === 0) {
                console.log('[MonsterManager] spawnMonsterAtDistance: No players in gameState');
                return;
            }

            // Debug: log player positions
            console.log('[MonsterManager] Player positions:');
            playerCodes.forEach(function(code) {
                var p = gameState.players[code];
                console.log('  Player ' + code + ': x=' + p.x + ', y=' + p.y);
            });

            var validPositions = this._findSpawnPositions(playerCodes, minDistance, maxDistance);
            console.log('[MonsterManager] Found ' + validPositions.length + ' valid positions');

            if (validPositions.length === 0) {
                console.log('[MonsterManager] No valid positions found in distance range ' + minDistance + '-' + maxDistance + ', using fallback');
                this.spawnMonster();
                return;
            }

            var chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
            console.log('[MonsterManager] Chosen position: x=' + chosen.x + ', y=' + chosen.y);
            
            var chaser = isFirst ? true : Math.random() < 0.5;
            console.log(isFirst ? 'Spawning FIRST CHASER monster' : (chaser ? 'Spawning CHASER monster' : 'Spawning RANDOM WALKER monster'));

            var baseHealth = levelData[gameState.gameLevel].monsterHealth || 10;
            var monster = this._createMonster(chosen.x, chosen.y, chaser, baseHealth, 1.0);

            gameState.monsters.push(monster);
            console.log('Monster spawned at (' + monster.x + ', ' + monster.y + '). Total monsters:', gameState.monsters.length);
        }

        spawnMonster() {
            var gameState = this.gameState;
            var levelData = this.levelData;

            if (gameState.spawnsLeft === undefined) {
                gameState.spawnsLeft = levelData[gameState.gameLevel].maxMonsters;
            }

            var livingPlayers = Object.values(gameState.players).filter(function (p) { return p.state === 'alive' || !p.state; });
            if (livingPlayers.length === 0) return;
            if (gameState.monsters.length >= levelData[gameState.gameLevel].maxMonsters) return;

            var playerCodes = Object.keys(gameState.players);
            var validPositions = this._findSpawnPositions(playerCodes, 400, Infinity);

            // Fallback: relax to 200px minimum distance
            if (validPositions.length === 0) {
                validPositions = this._findSpawnPositions(playerCodes, 200, Infinity);
            }
            if (validPositions.length === 0) return;

            var chosen = validPositions[Math.floor(Math.random() * validPositions.length)];

            if (Physics.isOverlapping(chosen.x, chosen.y, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, this.wallGrid)) {
                console.log('Skipping monster spawn - final check failed, position overlaps');
                return;
            }

            var chaser = Math.random() < 0.5;
            console.log(chaser ? 'Spawning CHASER monster' : 'Spawning RANDOM WALKER monster');

            var baseHealth = 10 + (gameState.gameLevel - 1) * 5;
            var demonType = this._randomDemonType();
            var isStronghold = Constants.STRONGHOLD_DEMONS.includes(demonType);
            var hpMult = isStronghold ? Constants.STRONGHOLD_HP_MULTIPLIER : 1.0;

            var monster = this._createMonster(chosen.x, chosen.y, chaser, baseHealth, hpMult, demonType);
            gameState.monsters.push(monster);
            gameState.spawnsLeft--;
            console.log("Monster spawned. Total monsters:", gameState.monsters.length);

            this.io.emit('gameStateUpdate', gameState);
        }

        _findSpawnPositions(playerCodes, minDistance, maxDistance) {
            var gameState = this.gameState;
            var validPositions = [];
            var wallGrid = this.wallGrid;

            console.log('[MonsterManager._findSpawnPositions] wallGrid:', wallGrid ? 'exists' : 'null');

            for (var testX = 50; testX < Constants.WORLD_WIDTH - 50; testX += 50) {
                for (var testY = 50; testY < Constants.WORLD_HEIGHT - 50; testY += 50) {
                    if (Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, wallGrid)) continue;

                    var inRange = false;
                    for (var ci = 0; ci < playerCodes.length; ci++) {
                        var p = gameState.players[playerCodes[ci]];
                        if (!p) continue;
                        if (p.x === undefined || p.y === undefined || p.x === null || p.y === null) {
                            console.log('[MonsterManager._findSpawnPositions] Player ' + playerCodes[ci] + ' has invalid position: x=' + p.x + ', y=' + p.y);
                            continue;
                        }
                        var dx = testX - p.x;
                        var dy = testY - p.y;
                        var distSq = dx * dx + dy * dy;
                        var dist = Math.sqrt(distSq);
                        if (dist >= minDistance && dist <= maxDistance) {
                            inRange = true;
                            break;
                        }
                    }
                    if (inRange) {
                        validPositions.push({ x: testX, y: testY });
                    }
                }
            }
            return validPositions;
        }

        _randomDemonType() {
            var level = this.gameState.gameLevel;
            var monsters = this.levelData[level].monsters;
            return monsters[Math.floor(Math.random() * monsters.length)];
        }

        _createMonster(x, y, chaser, baseHealth, hpMult, demonType) {
            if (!demonType) demonType = this._randomDemonType();
            var finalHealth = Math.round(baseHealth * this.healthMultiplier * (hpMult || 1.0));

            var monster = {
                id: generateId(4),
                x: x, y: y,
                width: Constants.MONSTER_WIDTH,
                height: Constants.MONSTER_HEIGHT,
                chaser: chaser,
                maxDamage: DEMON_MAX_DAMAGE[demonType] || DEFAULT_DEMON_DAMAGE,
                demonType: demonType,
                monsterType: demonType,
                health: finalHealth,
                maxHealth: finalHealth,
                chasingStartTime: null,
                behaviorStartTime: Date.now(),
                showHealth: true,
                showHealthTimeout: null,
                isAttacked: false,
                healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' },
                armorHits: demonType === 'Pride' ? Constants.PRIDE_ARMOR_HITS : 0,
                freezeAura: Constants.PARALYZER_DEMONS.includes(demonType),
                erratic: Constants.MISLEADER_DEMONS.includes(demonType),
                isDashing: false,
                dashCooldownEnd: 0,
                specialAbilities: {}
            };

            if (demonType === 'Confusion') {
                monster.specialAbilities.freezingAura = true;
            } else if (demonType === 'Pride') {
                monster.specialAbilities.armorPlating = { active: true, hits: 3 };
            }

            return monster;
        }

        updateMonsters() {
            var gs = this.gameState;
            MonsterMovement.updateAll(gs.monsters, this.levelData, gs.gameLevel, gs.speedMultiplier, this.wallGrid, gs);
        }

        damageMonster(monsterId, damage, attackerPlayerCode) {
            var gameState = this.gameState;
            var io = this.io;
            var monsterIndex = gameState.monsters.findIndex(function (m) { return m.id === monsterId; });
            if (monsterIndex === -1) return false;

            var monster = gameState.monsters[monsterIndex];

            // Pride armor: absorb hits
            if (monster.armorHits > 0) {
                monster.armorHits--;
                monster.isAttacked = true;
                monster.showHealth = true;
                monster.showHealthTimeout = Date.now() + 3000;
                io.emit('armorAbsorb', { monsterId: monster.id, armorLeft: monster.armorHits });
                setTimeout(function () {
                    if (monster && gameState.monsters.includes(monster)) monster.isAttacked = false;
                }, 500);
                return false;
            }

            monster.health -= damage;
            monster.isAttacked = true;
            monster.showHealth = true;
            monster.showHealthTimeout = Date.now() + 3000;
            setTimeout(function () {
                if (monster && gameState.monsters.includes(monster)) monster.isAttacked = false;
            }, 500);

            if (monster.health <= 0) {
                return this._handleMonsterDeath(monsterIndex, monsterId, attackerPlayerCode);
            }
            return false;
        }

        _handleMonsterDeath(monsterIndex, monsterId, attackerPlayerCode) {
            var gameState = this.gameState;
            var monster = gameState.monsters[monsterIndex];
            var deathX = monster.x;
            var deathY = monster.y;

            gameState.monsters.splice(monsterIndex, 1);
            gameState.monstersKilled = (gameState.monstersKilled || 0) + 1;

            if (gameState.monstersKilled >= (gameState.monstersToKill || 999)) {
                this.io.emit('levelProgress', { killed: gameState.monstersKilled, required: gameState.monstersToKill });
            }

            // Award XP
            var player = gameState.players[attackerPlayerCode];
            if (player) {
                player.xp = (player.xp || 0) + 10;
                var xpReqs = LevelConfig.levelXPRequirements;
                var nextLevelIndex = player.level;
                if (nextLevelIndex < xpReqs.length && player.xp >= xpReqs[nextLevelIndex]) {
                    player.level = nextLevelIndex + 1;
                    player.maxHealth = 50 + player.level * 50;
                    player.health = player.maxHealth;
                    console.log('Player ' + attackerPlayerCode + ' reached level ' + player.level + '!');
                }
            }

            this.io.emit('monsterKilled', { monsterId: monsterId, killer: attackerPlayerCode, x: deathX, y: deathY });

            if (this.collectibleManager) {
                var dropResult = this.collectibleManager.rollMonsterDrop(deathX, deathY);
                if (dropResult.dropped) {
                    this.io.emit('monsterDrop', { x: deathX, y: deathY, type: dropResult.type, killer: attackerPlayerCode });
                    console.log('Monster dropped [' + dropResult.type + '] at (' + Math.round(deathX) + ', ' + Math.round(deathY) + ')');
                }
            }

            return true;
        }

        static _getDemonMaxDamage(demonType) {
            return DEMON_MAX_DAMAGE[demonType] || DEFAULT_DEMON_DAMAGE;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MonsterManager;
    } else if (typeof window !== 'undefined') {
        window.MonsterManager = MonsterManager;
    }
})();
