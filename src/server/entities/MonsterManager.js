const Constants = require('../../shared/Constants');
const LevelConfig = require('../../shared/LevelConfig');
const Physics = require('../utils/Physics');
const crypto = require('crypto');

class MonsterManager {
    constructor(gameState, io, levelData, wallGrid, healthMultiplier = 1.0) {
        this.gameState = gameState;
        this.io = io;
        this.levelData = levelData;
        this.wallGrid = wallGrid || null;
        this.healthMultiplier = healthMultiplier;
    }

    spawnMonster() {
        const { gameState, levelData, io } = this;

        // Check if monsters need to be spawned
        if (gameState.spawnsLeft === undefined) {
            console.log("spawnsLeft is undefined. Initializing...");
            gameState.spawnsLeft = levelData[gameState.gameLevel].maxMonsters;
        }

        // Only spawn if there are living players (not ghosts/disconnected)
        const livingPlayers = Object.values(gameState.players).filter(p => p.state === 'alive' || !p.state);
        if (livingPlayers.length > 0) {
            // Only check concurrent monster limit, not spawnsLeft (allows continuous respawning)
            if (gameState.monsters.length < levelData[gameState.gameLevel].maxMonsters) {

                // Scan world grid for valid spawn positions, spread across the map
                const playerCodes = Object.keys(gameState.players);
                const minPlayerDistance = 400; // Minimum distance from any player

                let x, y;

                // Build list of valid positions across the entire world
                const validPositions = [];
                for (let testX = 100; testX < Constants.WORLD_WIDTH - 100; testX += 150) {
                    for (let testY = 100; testY < Constants.WORLD_HEIGHT - 100; testY += 150) {
                        if (Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, this.wallGrid)) continue;

                        // Check distance from all players
                        let tooClose = false;
                        for (const code of playerCodes) {
                            const p = gameState.players[code];
                            if (!p) continue;
                            const dx = testX - p.x;
                            const dy = testY - p.y;
                            if (dx * dx + dy * dy < minPlayerDistance * minPlayerDistance) {
                                tooClose = true;
                                break;
                            }
                        }
                        if (!tooClose) {
                            validPositions.push({ x: testX, y: testY });
                        }
                    }
                }

                // Fallback: relax to 200px minimum distance if nothing found
                if (validPositions.length === 0) {
                    const relaxedDistance = 200;
                    for (let testX = 100; testX < Constants.WORLD_WIDTH - 100; testX += 150) {
                        for (let testY = 100; testY < Constants.WORLD_HEIGHT - 100; testY += 150) {
                            if (Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, this.wallGrid)) continue;
                            let tooClose = false;
                            for (const code of playerCodes) {
                                const p = gameState.players[code];
                                if (!p) continue;
                                const dx = testX - p.x;
                                const dy = testY - p.y;
                                if (dx * dx + dy * dy < relaxedDistance * relaxedDistance) {
                                    tooClose = true;
                                    break;
                                }
                            }
                            if (!tooClose) {
                                validPositions.push({ x: testX, y: testY });
                            }
                        }
                    }
                }

                if (validPositions.length === 0) return;

                const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
                x = chosen.x;
                y = chosen.y;

                let chaser = false;
                // 50% chasers
                if (Math.random() < 0.5) {
                    chaser = true;
                    console.log('Spawning CHASER monster');
                } else {
                    console.log('Spawning RANDOM WALKER monster');
                }

                // Randomly assign a demon type
                const demonType = levelData[gameState.gameLevel].monsters[Math.floor(Math.random() * levelData[gameState.gameLevel].monsters.length)];

                // Set the maximum damage based on the demon type
                let maxDamage;
                switch (demonType) {
                    case 'Condemnation': maxDamage = 2; break;
                    case 'Fear': maxDamage = 3; break;
                    case 'Unbelief': maxDamage = 5; break;
                    case 'Ignorance': maxDamage = 2; break;
                    case 'Strife': maxDamage = 6; break;
                    case 'Confusion': maxDamage = 4; break;
                    case 'Depression': maxDamage = 3; break;
                    case 'Doubt': maxDamage = 4; break;
                    case 'Infirmity': maxDamage = 7; break;
                    default: maxDamage = 1;
                }

                // Apply health multiplier from config
                const baseHealth = 10;
                const actualHealth = Math.round(baseHealth * this.healthMultiplier);

                const newMonster = {
                    id: crypto.randomBytes(4).toString('hex'),
                    x: x,
                    y: y,
                    health: actualHealth,
                    maxHealth: actualHealth,
                    width: Constants.MONSTER_WIDTH,
                    height: Constants.MONSTER_HEIGHT,
                    demonType: demonType,
                    maxDamage: maxDamage,
                    chaser: chaser,
                    chasingStartTime: null,
                    behaviorStartTime: Date.now(),
                    showHealth: true,
                    showHealthTimeout: null,
                    isAttacked: false,
                    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' }
                };

                // Final validation
                if (Physics.isOverlapping(x, y, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, null, this.wallGrid)) {
                    console.log('Skipping monster spawn - final check failed, position overlaps');
                    return;
                }

                gameState.monsters.push(newMonster);
                gameState.spawnsLeft--;
                console.log("Monster spawned. Total monsters:", gameState.monsters.length);
            } else {
                // console.log("Cannot spawn logic...");
            }
            io.emit('gameStateUpdate', gameState);
        }
    }

    updateMonsters() {
        const { gameState, levelData } = this;
        const currentLevelData = levelData[gameState.gameLevel];
        // Speed is based on 20fps, so we scale it for 60fps (approx 0.33)
        const baseSpeed = currentLevelData.monsterSpeed * (20 / 60);

        gameState.monsters.forEach(monster => {
            // Check for Sandals of Peace slow aura from any player
            let speed = baseSpeed;
            for (const code in gameState.players) {
                const p = gameState.players[code];
                if (p && p.activeBuffs && p.activeBuffs.sandals && p.activeBuffs.sandals.active) {
                    const dx = monster.x - p.x;
                    const dy = monster.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < Constants.SANDALS_SLOW_RADIUS) {
                        speed *= Constants.SANDALS_SLOW_FACTOR;
                        break; // Only apply one slow
                    }
                }
            }

            if (monster.chaser) {
                // Retrieve (or calculate) distance to nearest player to normalize speed
                let nearestPlayer = Physics.findNearestPlayer(monster, gameState);
                if (nearestPlayer) {
                    let dx = nearestPlayer.x - monster.x;
                    let dy = nearestPlayer.y - monster.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    // Calculate new position
                    const newX = monster.x + (dx / distance) * speed;
                    const newY = monster.y + (dy / distance) * speed;

                    // Check wall collision before moving
                    if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id, this.wallGrid)) {
                        monster.x = newX;
                        monster.y = newY;
                    }
                }
            } else {
                // Random walk
                if (monster.walkingDistance === undefined) {
                    monster.walkingDistance = Math.random() * (Constants.MAX_WALK_DISTANCE - Constants.MIN_WALK_DISTANCE) + Constants.MIN_WALK_DISTANCE;
                    monster.angle = Math.random() * 2 * Math.PI;
                }

                let dx = Math.cos(monster.angle) * speed;
                let dy = Math.sin(monster.angle) * speed;

                // Calculate new position
                const newX = monster.x + dx;
                const newY = monster.y + dy;

                // Check wall collision before moving
                if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id, this.wallGrid)) {
                    monster.x = newX;
                    monster.y = newY;
                    monster.walkingDistance -= speed;
                } else {
                    // Hit a wall, pick a new direction
                    monster.walkingDistance = undefined;
                    monster.angle = undefined;
                }

                if (monster.walkingDistance <= 0) {
                    monster.walkingDistance = undefined;
                    monster.angle = undefined;
                }
            }

            // Update health bar position
            monster.healthBar.x = monster.x - monster.width / 2;
            monster.healthBar.y = monster.y - monster.height / 2 - 10;
            monster.healthBar.width = (monster.health / 10) * monster.width;

            // Update showHealthTimeout
            if (monster.showHealthTimeout && Date.now() > monster.showHealthTimeout) {
                monster.showHealth = false;
                monster.showHealthTimeout = null;
            }
        });
    }
    /**
     * Damage a monster by ID. Returns true if killed.
     * @param {string} monsterId 
     * @param {number} damage 
     * @param {string} attackerPlayerCode 
     * @returns {boolean} - true if monster was killed
     */
    damageMonster(monsterId, damage, attackerPlayerCode) {
        const { gameState, io } = this;
        const monsterIndex = gameState.monsters.findIndex(m => m.id === monsterId);

        if (monsterIndex === -1) return false;

        const monster = gameState.monsters[monsterIndex];
        monster.health -= damage;
        monster.isAttacked = true;
        monster.showHealth = true;
        monster.showHealthTimeout = Date.now() + 3000; // Show health for 3s

        // Clear isAttacked after 500ms (explosion visual duration)
        setTimeout(() => {
            if (monster && gameState.monsters.includes(monster)) {
                monster.isAttacked = false;
            }
        }, 500);

        if (monster.health <= 0) {
            // Monster killed - store position before removing
            const deathX = monster.x;
            const deathY = monster.y;

            gameState.monsters.splice(monsterIndex, 1);
            gameState.monstersKilled = (gameState.monstersKilled || 0) + 1;

            // Award XP to attacker
            const player = gameState.players[attackerPlayerCode];
            if (player) {
                player.xp = (player.xp || 0) + 10;

                // Level up check - ONLY check next level threshold to prevent multi-level jumps
                const xpReqs = LevelConfig.levelXPRequirements;
                const nextLevelIndex = player.level; // next level is current+1, which is at index player.level
                if (nextLevelIndex < xpReqs.length && player.xp >= xpReqs[nextLevelIndex]) {
                    player.level = nextLevelIndex + 1;
                    player.maxHealth = 50 + player.level * 50;
                    player.health = player.maxHealth;
                    console.log(`Player ${attackerPlayerCode} reached level ${player.level}!`);
                }
            }

            io.emit('monsterKilled', { monsterId: monsterId, killer: attackerPlayerCode, x: deathX, y: deathY });

            // Roll for monster drop
            if (this.collectibleManager) {
                const dropResult = this.collectibleManager.rollMonsterDrop(deathX, deathY);
                if (dropResult.dropped) {
                    io.emit('monsterDrop', { x: deathX, y: deathY, type: dropResult.type, killer: attackerPlayerCode });
                    console.log(`Monster dropped [${dropResult.type}] at (${Math.round(deathX)}, ${Math.round(deathY)})`);
                }
            }

            return true;
        }

        return false;
    }
}

module.exports = MonsterManager;
