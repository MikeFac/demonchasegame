const Constants = require('../shared/Constants');
const LevelConfig = require('../shared/LevelConfig');
const generateMaze = require('./utils/Maze');
const MonsterManager = require('./entities/MonsterManager');
const PlayerManager = require('./entities/PlayerManager');
const BulletManager = require('./entities/BulletManager');

class Game {
    constructor(io, roomId = null) {
        this.roomId = roomId;
        this.lastUpdateTime = Date.now();

        // Create room-scoped emitter so all broadcasts target only this game's room
        const roomName = roomId ? `room:${roomId}` : null;
        this.io = {
            emit: (event, data) => {
                if (roomName) {
                    io.to(roomName).emit(event, data);
                } else {
                    io.emit(event, data);
                }
            }
        };
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
        console.log(`Game Loop Started (room: ${this.roomId || 'global'})`);

        this.intervals = [
            // Main Game Loop (60fps)
            setInterval(() => {
                if (!this.shouldRun) return;
                this.update();
            }, 1000 / 60),

            // Monster Spawning Loop (every 2s, spawns only if under limit)
            setInterval(() => {
                if (!this.shouldRun) return;
                this.monsterManager.spawnMonster();
            }, 2000),

            // Healing Point Spawning Loop
            setInterval(() => {
                if (this.gameState.healingPoints.length < Constants.MAX_HEALING_POINTS) {
                    this.spawnHealingPoint();
                }
            }, 30000)
        ];
    }

    stop() {
        this.shouldRun = false;
        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];
        console.log(`Game stopped (room: ${this.roomId || 'global'})`);
    }

    addPlayer(socket) {
        this.playerManager.addPlayer(socket);

        // Handle player disconnect
        socket.on('disconnect', () => {
            this.playerManager.removePlayer(socket);
            if (this.gameState.connectedPlayers <= 0) {
                this.stop();
                if (this.onEmpty) this.onEmpty();
            }
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
