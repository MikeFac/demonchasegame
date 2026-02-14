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
                // Use smaller step (50px) to find valid spots in narrow corridors (checking 25px grid is ideal but costly, 50px is good compromise)
                for (let testX = 50; testX < Constants.WORLD_WIDTH - 50; testX += 50) {
                    for (let testY = 50; testY < Constants.WORLD_HEIGHT - 50; testY += 50) {
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
                    for (let testX = 50; testX < Constants.WORLD_WIDTH - 50; testX += 50) {
                        for (let testY = 50; testY < Constants.WORLD_HEIGHT - 50; testY += 50) {
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
                    case 'Deception': maxDamage = 4; break;
                    case 'Despair': maxDamage = 4; break;
                    case 'Temptation': maxDamage = 5; break;
                    case 'Pride': maxDamage = 6; break;
                    case 'Poverty': maxDamage = 3; break;
                    case 'Shame': maxDamage = 3; break;
                    case 'Blindness': maxDamage = 2; break;
                    case 'Swarm': maxDamage = 5; break;
                    default: maxDamage = 1;
                }

                // Apply health multiplier from config
                // Scale base health by level: Level 1 = 10, Level 5 = 30 (+5 per level)
                const baseHealth = 10 + (gameState.gameLevel - 1) * 5;

                // Stronghold demons (Pride, Condemnation, Unbelief) get 2x HP
                const isStronghold = Constants.STRONGHOLD_DEMONS.includes(demonType);
                const hpMult = isStronghold ? Constants.STRONGHOLD_HP_MULTIPLIER : 1.0;
                const actualHealth = Math.round(baseHealth * this.healthMultiplier * hpMult);

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
                    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' },
                    // Demon ability flags
                    armorHits: demonType === 'Pride' ? Constants.PRIDE_ARMOR_HITS : 0,
                    freezeAura: Constants.PARALYZER_DEMONS.includes(demonType),
                    erratic: Constants.MISLEADER_DEMONS.includes(demonType),
                    isDashing: false,
                    dashCooldownEnd: 0
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
        // Apply game speed multiplier from config
        const speedMultiplier = gameState.speedMultiplier || 1.0;
        const baseSpeed = currentLevelData.monsterSpeed * (20 / 60) * speedMultiplier;

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

            // Dash Attack (Strife): periodically lunge at 3x speed
            const now = Date.now();
            if (monster.demonType === 'Strife') {
                if (monster.isDashing && now < monster.dashEndTime) {
                    // Currently dashing — move at dash speed toward nearest player
                    let nearestPlayer = Physics.findNearestPlayer(monster, gameState);
                    if (nearestPlayer) {
                        let dx = nearestPlayer.x - monster.x;
                        let dy = nearestPlayer.y - monster.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        const dashSpeed = speed * Constants.DASH_SPEED_MULT;
                        const newX = monster.x + (dx / distance) * dashSpeed;
                        const newY = monster.y + (dy / distance) * dashSpeed;
                        if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id, this.wallGrid)) {
                            monster.x = newX;
                            monster.y = newY;
                        }
                    }
                    // Skip normal movement while dashing
                } else {
                    // End dash if expired
                    if (monster.isDashing) {
                        monster.isDashing = false;
                        monster.dashCooldownEnd = now + Constants.DASH_COOLDOWN;
                    }
                    // Roll for new dash if cooldown expired
                    if (!monster.isDashing && now >= (monster.dashCooldownEnd || 0) && Math.random() < Constants.DASH_CHANCE) {
                        monster.isDashing = true;
                        monster.dashEndTime = now + Constants.DASH_DURATION;
                    }
                }
            }

            // Skip normal movement if dashing
            if (monster.isDashing) {
                // Already moved above
            } else if (monster.chaser) {
                // Retrieve (or calculate) distance to nearest player to normalize speed
                let nearestPlayer = Physics.findNearestPlayer(monster, gameState);
                if (nearestPlayer) {
                    let dx = nearestPlayer.x - monster.x;
                    let dy = nearestPlayer.y - monster.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    // Erratic Movement: misleader demons zig-zag unpredictably
                    let moveAngle = Math.atan2(dy, dx);
                    if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                        moveAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
                    }

                    // Calculate new position
                    const newX = monster.x + Math.cos(moveAngle) * speed;
                    const newY = monster.y + Math.sin(moveAngle) * speed;

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

                // Erratic Movement for random walkers: randomize angle more often
                let walkAngle = monster.angle;
                if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                    walkAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
                }

                let dx = Math.cos(walkAngle) * speed;
                let dy = Math.sin(walkAngle) * speed;

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
            monster.healthBar.width = (monster.health / monster.maxHealth) * monster.width;

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

        // Pride armor: absorb hits before taking damage
        if (monster.armorHits > 0) {
            monster.armorHits--;
            monster.isAttacked = true;
            monster.showHealth = true;
            monster.showHealthTimeout = Date.now() + 3000;
            // Emit armor absorb event for client visual feedback
            io.emit('armorAbsorb', { monsterId: monster.id, armorLeft: monster.armorHits });
            setTimeout(() => {
                if (monster && gameState.monsters.includes(monster)) {
                    monster.isAttacked = false;
                }
            }, 500);
            return false; // Not killed, damage absorbed
        }

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

            // Check Level Completion
            if (gameState.monstersKilled >= (gameState.monstersToKill || 999)) {
                // Emit level completion event to Game.js via io (Game.js listens on socket, but we need to trigger it internally or via emit)
                // Since MonsterManager doesn't have direct access to Game instance methods, we'll emit a special internal event or 
                // relying on Game.js to check this state.
                // BETTER APPROACH: Game.js should check this in its update loop or listener.
                // However, for now, let's emit a 'levelCompleted' event that the server listens to? 
                // No, Game.js handles 'levelCompleted' from CLIENT. 
                // Let's emit to all clients that level is done, and let ONE client trigger it? 
                // OR better, let's just emit 'levelProgress' and let Game.js check it in update()?

                // actually Game.js passes `io` to MonsterManager. 
                // The current architecture relies on a client sending 'levelCompleted'.
                // We should update that: Server should detect it.

                // Let's emit an event that clients can use to show "Level Complete" UI,
                // and then *they* send 'levelCompleted' as before (legacy compat), 
                // OR we upgrade Game.js to detect this.

                // For now, let's just log it and rely on Game.js to check it in update() or add a check here if we pass a callback.
                // But wait, I can just emit to the room.
                io.emit('levelProgress', { killed: gameState.monstersKilled, required: gameState.monstersToKill });
            }

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
