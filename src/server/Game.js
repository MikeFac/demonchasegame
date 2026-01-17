const Constants = require('../shared/Constants');
const generateMaze = require('./utils/Maze');
const MonsterManager = require('./entities/MonsterManager');
const PlayerManager = require('./entities/PlayerManager');

class Game {
    constructor(io) {
        this.io = io;
        this.lastUpdateTime = Date.now();
        this.shouldRun = false;

        // Level Data
        this.levelData = {
            1: {
                qualities: ['Faith', 'Courage', 'Knowledge'],
                monsters: ['Fear', 'Ignorance'],
                monsterDamageFactor: 1,
                playerSpeed: 5,
                monsterSpeed: 5,
                spawnRate: 10000,
                maxMonsters: 8
            },
            2: {
                qualities: ['Love', 'Wisdom', 'Healing'],
                monsters: ['Strife', 'Confusion', 'Infirmity'],
                monsterDamageFactor: 1.5,
                playerSpeed: 6,
                spawnRate: 8000,
                monsterSpeed: 7,
                maxMonsters: 10
            },
            3: {
                qualities: ['Forgiveness', 'Good News', 'Focus'],
                monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt'],
                monsterDamageFactor: 1.5,
                monsterSpeed: 9,
                maxMonsters: 12,
                playerSpeed: 6,
                spawnRate: 5000,
                maxMonsters: 5
            }
        };

        // Initial Game State
        this.gameState = {
            players: {},
            monsters: [],
            healingPoints: [],
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

        // Healing Points
        // Initialize initial healing points
        for (let i = 0; i < Constants.MAX_HEALING_POINTS; i++) {
            this.spawnHealingPoint();
        }
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

        // Handle level completion event (global game event)
        socket.on('levelCompleted', () => {
            if (this.gameState.gameLevel < Object.keys(this.levelData).length)
                this.gameState.gameLevel++;
            this.resetLevelData(this.gameState.gameLevel);
            this.io.emit('gameStateUpdate', this.gameState);
        });
    }

    update() {
        // Update Monsters
        this.monsterManager.updateMonsters();

        // Broadcast State
        this.io.emit('gameStateUpdate', this.gameState);
    }

    resetLevelData(level) {
        if (this.levelData[level]) {
            this.gameState.maxSpawns = this.levelData[level].maxMonsters;
            this.gameState.spawnsLeft = this.levelData[level].maxMonsters;
            this.gameState.monstersKilled = 0;
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
}

module.exports = Game;
