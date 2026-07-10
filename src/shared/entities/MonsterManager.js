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
        Condemnation: 2, Fear: 3, Goliath: 9, Unbelief: 5, Ignorance: 2,
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
            this.pendingFixedSpawns = [];
            this.fixedSpawnStartedAt = Date.now();
            this.randomSpawnsEnabled = true;
            this.randomSpawnBudget = null;
            this.randomSpawnsUsed = 0;
        }

        configureSpawner(options) {
            options = options || {};
            this.randomSpawnsEnabled = options.randomSpawnsEnabled !== false;
            this.randomSpawnBudget = typeof options.randomSpawnBudget === 'number' ? options.randomSpawnBudget : null;
        }

        spawnLevelBoss() {
            var level = this.gameState.gameLevel || 1;
            var bossConfig = LevelConfig.getLevelBossConfig(level);
            if (!bossConfig) return null;
            if (this.gameState.monsters.some(function (monster) { return monster.isBoss; })) return null;

            var bossWidth = Math.round(Constants.MONSTER_WIDTH * Constants.BOSS_SIZE_MULTIPLIER);
            var bossHeight = Math.round(Constants.MONSTER_HEIGHT * Constants.BOSS_SIZE_MULTIPLIER);
            var spawnPoint = this._findCornerSpawn(bossWidth, bossHeight);
            if (!spawnPoint) {
                console.warn('Unable to find safe corner spawn for level boss on level ' + level);
                return null;
            }

            return this._spawnFixedMonster({
                x: spawnPoint.x,
                y: spawnPoint.y,
                demonType: bossConfig.demonType,
                behavior: {
                    type: 'chaser',
                    patrolRadius: 0,
                    patrolPath: []
                },
                stats: {
                    healthMultiplier: Constants.BOSS_HEALTH_MULTIPLIER,
                    damageMultiplier: Constants.BOSS_DAMAGE_MULTIPLIER,
                    speedMultiplier: 2.0,
                    sizeMultiplier: Constants.BOSS_SIZE_MULTIPLIER
                },
                spawnTrigger: { type: 'immediate', value: 0 },
                isBoss: true,
                label: bossConfig.label || (bossConfig.demonType + ' Guard')
            });
        }

        spawnMonsterAtDistance(minDistance, maxDistance, isFirst) {
            if (isFirst === undefined) isFirst = false;
            var gameState = this.gameState;
            var levelData = this.levelData;

            if (gameState.monsters.length >= levelData[gameState.gameLevel].maxMonsters) return;

            var playerCodes = Object.keys(gameState.players);
            if (playerCodes.length === 0) return;

            var validPositions = this._findSpawnPositions(playerCodes, minDistance, maxDistance);

            if (validPositions.length === 0) {
                console.log('No valid positions found in distance range ' + minDistance + '-' + maxDistance + ', using fallback');
                this.spawnMonster();
                return;
            }

            var chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
            var chaser = isFirst ? true : Math.random() < 0.5;
            console.log(isFirst ? 'Spawning FIRST CHASER monster' : (chaser ? 'Spawning CHASER monster' : 'Spawning RANDOM WALKER monster'));

            var baseHealth = levelData[gameState.gameLevel].monsterHealth || 10;
            var monster = this._createMonster(chosen.x, chosen.y, chaser, baseHealth, 1.0);

            gameState.monsters.push(monster);
            console.log('Monster spawned. Total monsters:', gameState.monsters.length);
        }

        spawnMonster() {
            var gameState = this.gameState;
            var levelData = this.levelData;

            if (!this.randomSpawnsEnabled) return;
            if (this.randomSpawnBudget !== null && this.randomSpawnsUsed >= this.randomSpawnBudget) return;

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
            this.randomSpawnsUsed++;
            console.log("Monster spawned. Total monsters:", gameState.monsters.length);

            this.io.emit('gameStateUpdate', gameState);
        }

        spawnFixedMonsters(fixedMonsters) {
            var self = this;
            (fixedMonsters || []).forEach(function (fixedMonster) {
                if (!fixedMonster) return;
                var triggerType = fixedMonster.spawnTrigger && fixedMonster.spawnTrigger.type
                    ? fixedMonster.spawnTrigger.type
                    : 'immediate';
                if (triggerType === 'immediate') {
                    self._spawnFixedMonster(fixedMonster);
                } else {
                    self.pendingFixedSpawns.push({
                        config: fixedMonster,
                        queuedAt: Date.now()
                    });
                }
            });
        }

        _findSpawnPositions(playerCodes, minDistance, maxDistance) {
            var gameState = this.gameState;
            var validPositions = [];
            var wallGrid = this.wallGrid;

            for (var testX = 50; testX < Constants.WORLD_WIDTH - 50; testX += 50) {
                for (var testY = 50; testY < Constants.WORLD_HEIGHT - 50; testY += 50) {
                    if (Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, wallGrid)) continue;

                    var inRange = false;
                    for (var ci = 0; ci < playerCodes.length; ci++) {
                        var p = gameState.players[playerCodes[ci]];
                        if (!p) continue;
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

        _findCornerSpawn(width, height) {
            var worldWidth = Constants.WORLD_WIDTH;
            var worldHeight = Constants.WORLD_HEIGHT;
            var step = Constants.CELL_SIZE;
            var maxDepth = Math.min(800, Math.floor(Math.min(worldWidth, worldHeight) / 3));
            var halfWidth = width / 2;
            var halfHeight = height / 2;
            var corners = [
                { startX: halfWidth, startY: halfHeight, dirX: 1, dirY: 1 },
                { startX: worldWidth - halfWidth, startY: halfHeight, dirX: -1, dirY: 1 },
                { startX: halfWidth, startY: worldHeight - halfHeight, dirX: 1, dirY: -1 },
                { startX: worldWidth - halfWidth, startY: worldHeight - halfHeight, dirX: -1, dirY: -1 }
            ];
            var bestCandidate = null;

            for (var c = 0; c < corners.length; c++) {
                var corner = corners[c];
                for (var depth = 0; depth <= maxDepth; depth += step) {
                    for (var offset = 0; offset <= depth; offset += step) {
                        var inwardX = depth - offset;
                        var inwardY = offset;
                        var candidateX = corner.startX + inwardX * corner.dirX;
                        var candidateY = corner.startY + inwardY * corner.dirY;
                        if (!Physics.isOverlapping(candidateX, candidateY, width, height, this.gameState, null, this.wallGrid)) {
                            var score = depth;
                            if (!bestCandidate || score < bestCandidate.score) {
                                bestCandidate = { x: candidateX, y: candidateY, score: score };
                            }
                            break;
                        }
                    }
                    if (bestCandidate && bestCandidate.score === depth) break;
                }
            }

            return bestCandidate ? { x: bestCandidate.x, y: bestCandidate.y } : null;
        }

        _createMonster(x, y, chaser, baseHealth, hpMult, demonType, behaviorType) {
            if (!demonType) demonType = this._randomDemonType();
            if (!behaviorType) behaviorType = chaser ? 'chaser' : 'wanderer';
            var finalHealth = Math.round(baseHealth * this.healthMultiplier * (hpMult || 1.0));

            var monster = {
                id: generateId(4),
                x: x, y: y,
                width: Constants.MONSTER_WIDTH,
                height: Constants.MONSTER_HEIGHT,
                chaser: chaser,
                behaviorType: behaviorType,
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
                specialAbilities: {},
                homeX: x,
                homeY: y,
                guardRadius: Constants.GUARD_RADIUS_MULTIPLIER * Math.max(Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT)
            };

            if (demonType === 'Confusion') {
                monster.specialAbilities.freezingAura = true;
            } else if (demonType === 'Pride') {
                monster.specialAbilities.armorPlating = { active: true, hits: 3 };
            }

            return monster;
        }

        _findNearbyFixedSpawnPosition(targetX, targetY, width, height) {
            var step = Constants.CELL_SIZE || 50;
            var maxRadius = step * 8;
            var isOpen = (x, y) => !Physics.isOverlapping(x, y, width, height, this.gameState, null, this.wallGrid);

            if (isOpen(targetX, targetY)) {
                return { x: targetX, y: targetY };
            }

            for (var radius = step; radius <= maxRadius; radius += step) {
                for (var offsetX = -radius; offsetX <= radius; offsetX += step) {
                    for (var offsetY = -radius; offsetY <= radius; offsetY += step) {
                        if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) continue;

                        var candidateX = Math.max(width / 2, Math.min(Constants.WORLD_WIDTH - width / 2, targetX + offsetX));
                        var candidateY = Math.max(height / 2, Math.min(Constants.WORLD_HEIGHT - height / 2, targetY + offsetY));

                        if (isOpen(candidateX, candidateY)) {
                            return { x: candidateX, y: candidateY };
                        }
                    }
                }
            }

            return null;
        }

        _spawnFixedMonster(fixedMonster) {
            if (this.gameState.monsters.length >= this.levelData[this.gameState.gameLevel].maxMonsters) {
                return null;
            }
            var sizeMultiplier = (fixedMonster.stats && fixedMonster.stats.sizeMultiplier) || 1.0;
            var spawnWidth = Math.round(Constants.MONSTER_WIDTH * sizeMultiplier);
            var spawnHeight = Math.round(Constants.MONSTER_HEIGHT * sizeMultiplier);
            var resolvedSpawn = this._findNearbyFixedSpawnPosition(
                fixedMonster.x,
                fixedMonster.y,
                spawnWidth,
                spawnHeight
            );
            if (!resolvedSpawn) {
                return null;
            }

            var baseHealth = 10 + (this.gameState.gameLevel - 1) * 5;
            var behaviorType = fixedMonster.behavior && fixedMonster.behavior.type ? fixedMonster.behavior.type : 'chaser';
            var chaser = behaviorType === 'chaser';
            var demonType = fixedMonster.demonType || this._randomDemonType();
            var hpMult = (fixedMonster.stats && fixedMonster.stats.healthMultiplier) || 1.0;
            if (behaviorType === 'guard' && !fixedMonster.isBoss) {
                hpMult *= Constants.GUARD_HP_MULTIPLIER;
            }
            var monster = this._createMonster(resolvedSpawn.x, resolvedSpawn.y, chaser, baseHealth, hpMult, demonType, behaviorType);

            monster.behaviorType = behaviorType;
            monster.fixedSpawn = true;
            monster.spawnTrigger = fixedMonster.spawnTrigger || { type: 'immediate', value: 0 };
            monster.label = fixedMonster.label || demonType;
            if (fixedMonster.behavior) {
                monster.patrolRadius = fixedMonster.behavior.patrolRadius || 0;
                monster.patrolPath = fixedMonster.behavior.patrolPath || [];
            }
            if (fixedMonster.stats && fixedMonster.stats.damageMultiplier) {
                monster.maxDamage = Math.max(1, Math.round(monster.maxDamage * fixedMonster.stats.damageMultiplier));
            }
            if (fixedMonster.stats && fixedMonster.stats.speedMultiplier) {
                monster.speedMultiplier = fixedMonster.stats.speedMultiplier;
            }
            if (fixedMonster.stats && fixedMonster.stats.sizeMultiplier) {
                monster.width = Math.round(monster.width * fixedMonster.stats.sizeMultiplier);
                monster.height = Math.round(monster.height * fixedMonster.stats.sizeMultiplier);
            }
            if (fixedMonster.isBoss) {
                monster.isBoss = true;
                monster.bossLabel = fixedMonster.label || (monster.demonType + ' Guard');
                monster.bonusXp = Constants.BOSS_XP_BONUS;
            }
            monster.guardRadius = Math.max(
                Constants.GUARD_RADIUS_MULTIPLIER * Math.max(monster.width, monster.height),
                fixedMonster.behavior && fixedMonster.behavior.patrolRadius ? fixedMonster.behavior.patrolRadius : 0
            );

            this.gameState.monsters.push(monster);
            return monster;
        }

        _updatePendingFixedSpawns() {
            if (!this.pendingFixedSpawns.length) return;

            var remaining = [];
            for (var i = 0; i < this.pendingFixedSpawns.length; i++) {
                var pending = this.pendingFixedSpawns[i];
                var config = pending.config;
                var trigger = config.spawnTrigger || { type: 'immediate', value: 0 };
                var shouldSpawn = false;

                if (trigger.type === 'timer') {
                    shouldSpawn = Date.now() - this.fixedSpawnStartedAt >= (trigger.value || 0) * 1000;
                } else if (trigger.type === 'killCount') {
                    shouldSpawn = (this.gameState.monstersKilled || 0) >= (trigger.value || 0);
                } else if (trigger.type === 'proximity') {
                    var radius = trigger.value || 150;
                    shouldSpawn = Object.keys(this.gameState.players).some((playerCode) => {
                        var player = this.gameState.players[playerCode];
                        if (!player) return false;
                        var dx = player.x - config.x;
                        var dy = player.y - config.y;
                        return Math.sqrt(dx * dx + dy * dy) <= radius;
                    });
                }

                if (shouldSpawn) {
                    this._spawnFixedMonster(config);
                } else {
                    remaining.push(pending);
                }
            }

            this.pendingFixedSpawns = remaining;
        }

        updateMonsters() {
            this._updatePendingFixedSpawns();
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

            // A guard that takes damage becomes a wanderer — it leaves its territory
            // and roams freely. Chaser pathing can't navigate around walls/corners,
            // so wandering is more effective in maze-like maps.
            if (monster.behaviorType === 'guard' || monster.behaviorType === 'patrol') {
                monster.behaviorType = 'wanderer';
                monster.chaser = false;
                monster.guardRadius = 0;
                monster.homeX = null;
                monster.homeY = null;
            }

            if (monster.health <= 0) {
                return this._handleMonsterDeath(monsterIndex, monsterId, attackerPlayerCode);
            }
            return false;
        }

        _awardXp(player, amount, attackerPlayerCode) {
            if (!player || !amount) return;
            player.xp = (player.xp || 0) + amount;
            var xpReqs = LevelConfig.levelXPRequirements;
            var nextLevelIndex = player.level;
            if (nextLevelIndex < xpReqs.length && player.xp >= xpReqs[nextLevelIndex]) {
                player.level = nextLevelIndex + 1;
                player.maxHealth = 50 + player.level * 50;
                player.health = player.maxHealth;
                console.log('Player ' + attackerPlayerCode + ' reached level ' + player.level + '!');
            }
        }

        _handleMonsterDeath(monsterIndex, monsterId, attackerPlayerCode) {
            var gameState = this.gameState;
            var monster = gameState.monsters[monsterIndex];
            var deathX = monster.x;
            var deathY = monster.y;
            var isBoss = !!monster.isBoss;
            var bossBonusXp = isBoss ? (monster.bonusXp || Constants.BOSS_XP_BONUS) : 0;

            gameState.monsters.splice(monsterIndex, 1);
            // Bosses should still advance kill-based objectives and level progress.
            gameState.monstersKilled = (gameState.monstersKilled || 0) + 1;

            if (gameState.monstersKilled >= (gameState.monstersToKill || 999)) {
                this.io.emit('levelProgress', { killed: gameState.monstersKilled, required: gameState.monstersToKill });
            }

            // Award XP
            var player = gameState.players[attackerPlayerCode];
            if (player) {
                this._awardXp(player, 10 + bossBonusXp, attackerPlayerCode);
            }

            this.io.emit('monsterKilled', {
                monsterId: monsterId,
                killer: attackerPlayerCode,
                x: deathX,
                y: deathY,
                isBoss: isBoss,
                bossLabel: monster.bossLabel || null,
                bonusXp: bossBonusXp
            });

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
