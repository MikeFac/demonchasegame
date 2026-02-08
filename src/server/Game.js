const Constants = require('../shared/Constants');
const LevelConfig = require('../shared/LevelConfig');
const WallGrid = require('../shared/WallGrid');
const generateMaze = require('./utils/Maze');
const MonsterManager = require('./entities/MonsterManager');
const PlayerManager = require('./entities/PlayerManager');
const BulletManager = require('./entities/BulletManager');

class Game {
    constructor(io, roomId = null) {
        this.roomId = roomId;
        this.lastUpdateTime = Date.now();
        this._io = io; // Keep raw io reference for direct socket emits

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

        // Generate dungeon maze
        const mazeResult = generateMaze(Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT);
        this.walls = mazeResult.walls;
        this.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, Constants.CELL_SIZE);
        this.mazeGridData = {
            rows: mazeResult.rows,
            cols: mazeResult.cols,
            cellSize: Constants.CELL_SIZE
        };
        this.spawnX = mazeResult.spawnX;
        this.spawnY = mazeResult.spawnY;

        // Initial Game State (walls NOT included — sent separately)
        this.gameState = {
            players: {},
            monsters: [],
            healingPoints: [],
            shieldPoints: [],
            connectedPlayers: 0,
            gameLevel: 1,
            terrainTheme: this.levelData[1].terrainTheme || 'stone',
            maxSpawns: this.levelData[1].maxMonsters,
            spawnsLeft: this.levelData[1].maxMonsters,
            monstersKilled: 0
        };

        // Managers (pass wallGrid for spatial collision)
        this.monsterManager = new MonsterManager(this.gameState, this.io, this.levelData, this.wallGrid);
        this.playerManager = new PlayerManager(this.gameState, this.io, this.wallGrid);
        this.bulletManager = new BulletManager(this.io, this.monsterManager, this.wallGrid);

        // Track connected sockets for re-emitting walls on level change
        this.sockets = [];

        // Healing Points
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
        this.sockets.push(socket);

        // Send walls once on connect (not in periodic broadcast)
        socket.emit('walls', {
            walls: this.walls,
            gridFlat: this._flattenGrid(),
            rows: this.mazeGridData.rows,
            cols: this.mazeGridData.cols,
            cellSize: this.mazeGridData.cellSize,
            spawnX: this.spawnX,
            spawnY: this.spawnY
        });

        // Handle player disconnect
        socket.on('disconnect', () => {
            this.playerManager.removePlayer(socket);
            this.sockets = this.sockets.filter(s => s !== socket);
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
            // Prevent duplicate triggers during countdown
            if (this._levelAdvancing) return;
            if (this.gameState.gameLevel >= Object.keys(this.levelData).length) return;

            this._levelAdvancing = true;
            const nextLevel = this.gameState.gameLevel + 1;

            // Broadcast countdown to all clients
            for (const sock of this.sockets) {
                sock.emit('levelAdvancing', { countdown: 5, nextLevel });
            }

            // After 5 seconds, actually advance
            setTimeout(() => {
                this.gameState.gameLevel = nextLevel;
                this.resetLevelData(this.gameState.gameLevel);
                this._levelAdvancing = false;
                this.io.emit('gameStateUpdate', this.gameState);
            }, 5000);
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

        // Broadcast State (walls are NOT included)
        this.io.emit('gameStateUpdate', this.gameState);
    }

    resetLevelData(level) {
        if (this.levelData[level]) {
            this.gameState.maxSpawns = this.levelData[level].maxMonsters;
            this.gameState.spawnsLeft = this.levelData[level].maxMonsters;
            this.gameState.monstersKilled = 0;
            this.gameState.monsters = [];
            this.gameState.healingPoints = [];
            this.gameState.shieldPoints = [];
            this.gameState.terrainTheme = this.levelData[level].terrainTheme || 'stone';

            // Regenerate maze for new level
            const mazeResult = generateMaze(Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT);
            this.walls = mazeResult.walls;
            this.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, Constants.CELL_SIZE);
            this.mazeGridData = {
                rows: mazeResult.rows,
                cols: mazeResult.cols,
                cellSize: Constants.CELL_SIZE
            };
            this.spawnX = mazeResult.spawnX;
            this.spawnY = mazeResult.spawnY;

            // Teleport all players to new spawn point
            for (const playerCode in this.gameState.players) {
                this.gameState.players[playerCode].x = this.spawnX;
                this.gameState.players[playerCode].y = this.spawnY;
            }

            // Update managers with new wallGrid
            this.monsterManager.wallGrid = this.wallGrid;
            this.playerManager.wallGrid = this.wallGrid;
            this.bulletManager.wallGrid = this.wallGrid;

            // Re-emit walls to all connected sockets
            const wallData = {
                walls: this.walls,
                gridFlat: this._flattenGrid(),
                rows: this.mazeGridData.rows,
                cols: this.mazeGridData.cols,
                cellSize: this.mazeGridData.cellSize,
                spawnX: this.spawnX,
                spawnY: this.spawnY
            };
            for (const sock of this.sockets) {
                sock.emit('walls', wallData);
            }

            // Spawn a new shield for the new level
            this.spawnShieldPoint();
            console.log(`Level ${level} data reset.`);
        }
    }

    _flattenGrid() {
        const grid = this.wallGrid.grid;
        const flat = [];
        for (let r = 0; r < this.mazeGridData.rows; r++) {
            for (let c = 0; c < this.mazeGridData.cols; c++) {
                flat.push(grid[r][c] ? 1 : 0);
            }
        }
        return flat;
    }

    spawnHealingPoint() {
        const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;

        if (this.gameState.healingPoints.length < Constants.MAX_HEALING_POINTS) {
            let x, y;
            let attempts = 0;
            do {
                x = Math.random() * WORLD_WIDTH;
                y = Math.random() * WORLD_HEIGHT;
                attempts++;
            } while (this.wallGrid.collides(x, y, 30, 30) && attempts < 50);

            if (attempts < 50) {
                const healingPoint = {
                    id: Date.now() + Math.random(),
                    x: x,
                    y: y,
                    width: 30,
                    height: 30
                };
                this.gameState.healingPoints.push(healingPoint);
            }
        }
    }

    spawnShieldPoint() {
        const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;

        if (this.gameState.shieldPoints.length < Constants.MAX_SHIELD_POINTS) {
            let x, y;
            let attempts = 0;
            do {
                x = Math.random() * WORLD_WIDTH;
                y = Math.random() * WORLD_HEIGHT;
                attempts++;
            } while (this.wallGrid.collides(x, y, Constants.SHIELD_POINT_WIDTH, Constants.SHIELD_POINT_HEIGHT) && attempts < 50);

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
