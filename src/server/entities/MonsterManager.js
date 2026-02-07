const Constants = require('../../shared/Constants');
const LevelConfig = require('../../shared/LevelConfig');
const Physics = require('../utils/Physics');
const crypto = require('crypto');

class MonsterManager {
    constructor(gameState, io, levelData) {
        this.gameState = gameState;
        this.io = io;
        this.levelData = levelData;
    }

    spawnMonster() {
        const { gameState, levelData, io } = this;

        // Check if monsters need to be spawned
        if (gameState.spawnsLeft === undefined) {
            console.log("spawnsLeft is undefined. Initializing...");
            gameState.spawnsLeft = levelData[gameState.gameLevel].maxMonsters;
        }

        // Check if there are any connected players
        if (gameState.connectedPlayers > 0) {
            // Only check concurrent monster limit, not spawnsLeft (allows continuous respawning)
            if (gameState.monsters.length < levelData[gameState.gameLevel].maxMonsters) {

                // Find a valid position near a random player
                const playerCodes = Object.keys(gameState.players);
                const randomPlayerCode = playerCodes[Math.floor(Math.random() * playerCodes.length)];
                const player = gameState.players[randomPlayerCode];

                let x, y;
                let validPosition = false;

                // Try to find a position near the player first
                if (player) {
                    const searchRadius = 400; // Search within this radius of the player
                    const minDistance = 150; // Minimum distance from player
                    const validPositions = [];

                    // Create a grid of potential positions around the player
                    for (let testX = player.x - searchRadius; testX <= player.x + searchRadius; testX += 100) {
                        for (let testY = player.y - searchRadius; testY <= player.y + searchRadius; testY += 100) {

                            // Ensure inside world bounds
                            if (testX < 100 || testX > Constants.WORLD_WIDTH - 100 || testY < 100 || testY > Constants.WORLD_HEIGHT - 100) continue;

                            // Calculate distance to player
                            const dx = testX - player.x;
                            const dy = testY - player.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist >= minDistance && !Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState)) {
                                validPositions.push({ x: testX, y: testY });
                            }
                        }
                    }

                    if (validPositions.length > 0) {
                        const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
                        x = chosen.x;
                        y = chosen.y;
                        console.log(`Found ${validPositions.length} valid positions, spawning at (${x}, ${y})`);
                    } else {
                        // Fallback to world grid
                        return; // Or try world grid logic as fallback
                    }
                }

                // If no player or fail (simplified refactor: kept player logic mostly)
                // If x,y undefined, return
                if (x === undefined || y === undefined) {
                    // Logic for global grid fallback if needed (copied from original server.js)
                    const validPositions = [];
                    for (let testX = 100; testX < Constants.WORLD_WIDTH - 100; testX += 150) {
                        for (let testY = 100; testY < Constants.WORLD_HEIGHT - 100; testY += 150) {
                            if (!Physics.isOverlapping(testX, testY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState)) {
                                validPositions.push({ x: testX, y: testY });
                            }
                        }
                    }
                    if (validPositions.length === 0) return;
                    const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
                    x = chosen.x;
                    y = chosen.y;
                }

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

                const newMonster = {
                    id: crypto.randomBytes(4).toString('hex'),
                    x: x,
                    y: y,
                    health: 10,
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
                if (Physics.isOverlapping(x, y, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState)) {
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
        const speed = currentLevelData.monsterSpeed * (20 / 60);

        gameState.monsters.forEach(monster => {
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
                    if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id)) {
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
                if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id)) {
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
            // Monster killed
            gameState.monsters.splice(monsterIndex, 1);
            gameState.monstersKilled = (gameState.monstersKilled || 0) + 1;

            // Award XP to attacker
            const player = gameState.players[attackerPlayerCode];
            if (player) {
                player.xp = (player.xp || 0) + 10;

                // Level up check (matches client thresholds)
                const xpReqs = LevelConfig.levelXPRequirements;
                for (let i = player.level; i < xpReqs.length; i++) {
                    if (player.xp >= xpReqs[i]) {
                        player.level = i + 1;
                        player.maxHealth = 50 + player.level * 50;
                        player.health = player.maxHealth;
                    } else {
                        break;
                    }
                }
            }

            io.emit('monsterKilled', { monsterId: monsterId, killer: attackerPlayerCode });
            return true;
        }

        return false;
    }
}

module.exports = MonsterManager;
