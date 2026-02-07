const Constants = require('../shared/Constants');
const LevelConfig = require('../shared/LevelConfig');
const generateMaze = require('./utils/Maze');
const MonsterManager = require('./entities/MonsterManager');
const PlayerManager = require('./entities/PlayerManager');
const BulletManager = require('./entities/BulletManager');

class Game {
    constructor(io, roomId = null) {
        this.io = io;
        this.roomId = roomId; // If null, broadcasts to all; otherwise scoped to room
        this.lastUpdateTime = Date.now();
        this.shouldRun = false;

        // Level Data (shared between client and server)
        this.levelData = LevelConfig.levelData;

        // Initial Game State
        this.gameState = {
            players: {},
            monsters: [],
            healingPoints: [],
            shieldPoints: [],
            connectedPlayers: 0,
            gameLevel: 1,
            maxSpawns: this.levelData[1].maxMonsters,
            spawnsLeft: this.levelData[1].maxMonsters,
            monstersKilled: 0,
            walls: generateMaze(Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT, 100)
        };

        // Managers
        this.monsterManager = new MonsterManager(this.gameState, this.io, this.levelData);
        this.playerManager = new PlayerManager(this.gameState, this.io);
        this.bulletManager = new BulletManager(this.io, this.monsterManager);

        // Healing Points
        // Initialize initial healing points
        for (let i = 0; i < Constants.MAX_HEALING_POINTS; i++) {
            this.spawnHealingPoint();
        }

        // Shield Points - one per level
        this.spawnShieldPoint();
    }

    start() {
        this.shouldRun = true;
        console.log('Game Loop Started');

        // Main Game Loop
        setInterval(() => {
            if (!this.shouldRun) return;
            this.update();
        }, 50);

        // Monster Spawning Loop 
        // MonsterManager handles specific spawn logic, but we need to trigger it.
        // Original server.js used setInterval(spawnMonster, 10000).
        // Let's delegate to MonsterManager.spawnMonster()
        setInterval(() => {
            if (!this.shouldRun) return;
            this.monsterManager.spawnMonster();
        }, 2000); // 2 seconds check? Original was 10000? 
        // Wait, original was 10000 (10s).
        // But MonsterManager spawnMonster logic checks checks spawn conditions.
        // I'll stick to 2000 to be responsive if count is low?
        // Original `spawnMonster` had a check: `if (gameState.monsters.length < max ...)`
        // So calling it frequently is fine, it just won't spawn if full.
        // I'll set it to 2000.

        // Healing Point Spawning Loop
        setInterval(() => {
            if (this.gameState.healingPoints.length < Constants.MAX_HEALING_POINTS) {
                this.spawnHealingPoint();
            }
        }, 30000);
    }

    addPlayer(socket) {
        this.playerManager.addPlayer(socket);

        // Handle player disconnect
        socket.on('disconnect', () => {
            this.playerManager.removePlayer(socket);
        });

        // Handle player movement
        socket.on('playerPosition', (data) => {
            this.playerManager.handleMovement(socket, data);
        });

        // Handle player attacks
        socket.on('playerAttack', (data) => {
            this.playerManager.handleAttack(socket, data);
        });

        // Handle player being hit
        socket.on('playerHit', (damage) => {
            this.playerManager.handlePlayerHit(socket, damage);
        });

        // Handle healing point collection
        socket.on('collectHealingPoint', (healingPointId) => {
            const index = this.gameState.healingPoints.findIndex(hp => hp.id === healingPointId);
            if (index !== -1) {
                const player = this.gameState.players[socket.playerCode];
                if (player) {
                    player.health = Math.min(player.health + 25, player.maxHealth);
                }
                this.gameState.healingPoints.splice(index, 1);
                this.io.emit('gameStateUpdate', this.gameState);
            }
        });

        // Handle shield collection
        socket.on('collectShield', (shieldId) => {
            const index = this.gameState.shieldPoints.findIndex(sp => sp.id === shieldId);
            if (index !== -1) {
                this.gameState.shieldPoints.splice(index, 1);
                this.io.emit('gameStateUpdate', this.gameState);
            }
        });

        // Handle level completion event (global game event)
        socket.on('levelCompleted', () => {
            if (this.gameState.gameLevel < Object.keys(this.levelData).length)
                this.gameState.gameLevel++;
            this.resetLevelData(this.gameState.gameLevel);
            this.io.emit('gameStateUpdate', this.gameState);
        });

        // Handle player shooting
        socket.on('playerShoot', (data) => {
            const player = this.gameState.players[socket.playerCode];
            if (player && player.ammo >= 1) { // 1 = AMMO_COST
                player.ammo -= 1;
                this.bulletManager.addBullet(socket.playerCode, player, data);
            }
        });

        // Handle quiz answer (Award Ammo)
        socket.on('quizCorrect', () => {
            const player = this.gameState.players[socket.playerCode];
            if (player) {
                player.ammo = (player.ammo || 0) + 5; // 5 = AMMO_REWARD
            }
        });
    }

    update() {
        // Update Monsters
        this.monsterManager.updateMonsters();

        // Update Bullets
        this.bulletManager.update(this.gameState);

        // Broadcast State
        this.io.emit('gameStateUpdate', this.gameState);
    }

    resetLevelData(level) {
        if (this.levelData[level]) {
            this.gameState.maxSpawns = this.levelData[level].maxMonsters;
            this.gameState.spawnsLeft = this.levelData[level].maxMonsters;
            this.gameState.monstersKilled = 0;
            // Spawn a new shield for the new level
            this.spawnShieldPoint();
            console.log(`Level ${level} data reset.`);
        }
    }

    spawnHealingPoint() {
        // Simple logic embedded for now or extract to a Manager
        const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;
        const walls = this.gameState.walls;
        // Helper to check walls
        const isOverlapping = (x, y, w, h) => {
            // simplified check against walls
            for (const wall of walls) {
                if (x + w / 2 > wall.x && x - w / 2 < wall.x + wall.width &&
                    y + h / 2 > wall.y && y - h / 2 < wall.y + wall.height) return true;
            }
            return false;
        };

        if (this.gameState.healingPoints.length < Constants.MAX_HEALING_POINTS) {
            let x, y;
            let attempts = 0;
            do {
                x = Math.random() * WORLD_WIDTH;
                y = Math.random() * WORLD_HEIGHT;
                attempts++;
            } while (isOverlapping(x, y, 30, 30) && attempts < 50);

            if (attempts < 50) {
                const healingPoint = {
                    id: Date.now() + Math.random(),
                    x: x,
                    y: y,
                    width: 30,
                    height: 30
                };
                this.gameState.healingPoints.push(healingPoint);
                // console.log(`Healing point spawned at (${x}, ${y})`);
            }
        }
    }

    spawnShieldPoint() {
        const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;
        const walls = this.gameState.walls;

        const isOverlapping = (x, y, w, h) => {
            for (const wall of walls) {
                if (x + w / 2 > wall.x && x - w / 2 < wall.x + wall.width &&
                    y + h / 2 > wall.y && y - h / 2 < wall.y + wall.height) return true;
            }
            return false;
        };

        if (this.gameState.shieldPoints.length < Constants.MAX_SHIELD_POINTS) {
            let x, y;
            let attempts = 0;
            do {
                x = Math.random() * WORLD_WIDTH;
                y = Math.random() * WORLD_HEIGHT;
                attempts++;
            } while (isOverlapping(x, y, Constants.SHIELD_POINT_WIDTH, Constants.SHIELD_POINT_HEIGHT) && attempts < 50);

            if (attempts < 50) {
                const shieldPoint = {
                    id: Date.now() + Math.random(),
                    x: x,
                    y: y,
                    width: Constants.SHIELD_POINT_WIDTH,
                    height: Constants.SHIELD_POINT_HEIGHT
                };
                this.gameState.shieldPoints.push(shieldPoint);
                console.log(`Shield point spawned at (${x}, ${y})`);
            }
        }
    }
}

module.exports = Game;
