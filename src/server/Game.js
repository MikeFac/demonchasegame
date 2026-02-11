const Constants = require('../shared/Constants');
const LevelConfig = require('../shared/LevelConfig');
const WallGrid = require('../shared/WallGrid');
const generateMaze = require('./utils/Maze');
const Physics = require('./utils/Physics');
const MonsterManager = require('./entities/MonsterManager');
const PlayerManager = require('./entities/PlayerManager');
const BulletManager = require('./entities/BulletManager');
const CollectibleManager = require('./entities/CollectibleManager');

class Game {
    constructor(io, roomId = null, gameConfig = null) {
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

        // Game Config (preset-based difficulty)
        this.gameConfig = gameConfig || require('./config/GameConfig').createGameConfig('normal');
        this.constants = this.gameConfig.constants;
        this.levelData = this.gameConfig.levelData;

        // Generate dungeon maze
        const mazeResult = generateMaze(this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
        this.walls = mazeResult.walls;
        this.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, this.constants.CELL_SIZE);
        this.mazeGridData = {
            rows: mazeResult.rows,
            cols: mazeResult.cols,
            cellSize: this.constants.CELL_SIZE
        };
        this.spawnX = mazeResult.spawnX;
        this.spawnY = mazeResult.spawnY;

        // Initial Game State (walls NOT included — sent separately)
        this.gameState = {
            players: {},
            monsters: [],
            healingPoints: [],
            collectibles: [],
            connectedPlayers: 0,
            gameLevel: 1,
            terrainTheme: this.levelData[1].terrainTheme || 'stone',
            maxSpawns: this.levelData[1].maxMonsters,
            spawnsLeft: this.levelData[1].maxMonsters,
            monstersKilled: 0
        };

        // Managers (pass wallGrid for spatial collision and config)
        this.collectibleManager = new CollectibleManager(this.gameState, this.wallGrid);
        this.monsterManager = new MonsterManager(
            this.gameState,
            this.io,
            this.levelData,
            this.wallGrid,
            this.gameConfig.monsterHealthMultiplier
        );
        this.monsterManager.collectibleManager = this.collectibleManager;
        this.playerManager = new PlayerManager(this.gameState, this.io, this.wallGrid);
        this.bulletManager = new BulletManager(this.io, this.monsterManager, this.wallGrid, this.gameState);

        // Track connected sockets for re-emitting walls on level change
        this.sockets = [];

        // Healing Points (use config values)
        for (let i = 0; i < this.constants.MAX_HEALING_POINTS; i++) {
            this.spawnHealingPoint();
        }

        // Spawn all collectibles for level 1
        this.collectibleManager.initializeLevelCollectibles();
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

            // Monster Spawning Loop (use config spawn rate)
            setInterval(() => {
                if (!this.shouldRun) return;
                this.monsterManager.spawnMonster();
            }, this.levelData[1].spawnRate),

            // Healing Point Spawning Loop (use config interval)
            setInterval(() => {
                if (this.gameState.healingPoints.length < this.constants.MAX_HEALING_POINTS) {
                    this.spawnHealingPoint();
                }
            }, this.constants.HEALING_SPAWN_INTERVAL),

            // Collectible Respawn Loop (belt + sandals every 45s)
            setInterval(() => {
                if (!this.shouldRun) return;
                this.collectibleManager.respawnCollectibles();
            }, Constants.COLLECTIBLE_SPAWN_INTERVAL)
        ];
    }

    stop() {
        this.shouldRun = false;
        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];
        console.log(`Game stopped (room: ${this.roomId || 'global'})`);
    }

    addPlayer(socket) {
        const spawnCollides = this.wallGrid.collides(this.spawnX, this.spawnY, this.constants.PLAYER_WIDTH, this.constants.PLAYER_HEIGHT);
        console.log(`[WallSpawn] addPlayer ${socket.id} at (${this.spawnX}, ${this.spawnY}) wallCollides=${spawnCollides}`);
        this.playerManager.addPlayer(socket, this.spawnX, this.spawnY);
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

        // Send game config to client (quiz settings, difficulty info)
        const isSoloGame = this.roomId && this.roomId.startsWith('solo-');
        socket.emit('gameConfig', {
            quizSettings: this.gameConfig.quizSettings,
            preset: this.gameConfig.preset,
            presetName: this.gameConfig.presetName,
            isSoloGame: isSoloGame
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

        // Handle collectible collection (unified for all item types)
        socket.on('collectCollectible', (collectibleId) => {
            const removed = this.collectibleManager.removeCollectible(collectibleId);
            if (removed) {
                this.io.emit('gameStateUpdate', this.gameState);
            }
        });

        // Handle item activation (sword, breastplate, sandals, shield)
        socket.on('activateItem', (type) => {
            const player = this.gameState.players[socket.playerCode];
            if (!player) return;

            if (!player.activeBuffs) player.activeBuffs = {};

            const durations = {
                sword: Constants.SWORD_DURATION,
                shield: Constants.SHIELD_DURATION,
                breastplate: Constants.BREASTPLATE_DURATION,
                sandals: Constants.SANDALS_DURATION
            };

            const duration = durations[type];
            if (!duration) return;

            player.activeBuffs[type] = {
                active: true,
                endTime: Date.now() + duration
            };

            console.log(`Player ${socket.playerCode} activated ${type} for ${duration}ms`);

            // Schedule buff expiry
            setTimeout(() => {
                if (player.activeBuffs && player.activeBuffs[type]) {
                    player.activeBuffs[type].active = false;
                    console.log(`Player ${socket.playerCode} ${type} buff expired`);
                }
            }, duration);
        });

        // Handle passive item consumption (belt, helmet)
        socket.on('consumeItem', (type) => {
            // Server acknowledges the consumption — client manages inventory counts
            console.log(`Player ${socket.playerCode} consumed ${type}`);
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
                player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
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
            this.gameState.collectibles = [];
            this.gameState.terrainTheme = this.levelData[level].terrainTheme || 'stone';

            // Regenerate maze for new level
            const mazeResult = generateMaze(this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
            this.walls = mazeResult.walls;
            this.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, this.constants.CELL_SIZE);
            this.mazeGridData = {
                rows: mazeResult.rows,
                cols: mazeResult.cols,
                cellSize: this.constants.CELL_SIZE
            };
            this.spawnX = mazeResult.spawnX;
            this.spawnY = mazeResult.spawnY;

            const mazeSpawnCollides = this.wallGrid.collides(this.spawnX, this.spawnY, this.constants.PLAYER_WIDTH, this.constants.PLAYER_HEIGHT);
            console.log(`[WallSpawn] Level ${level} maze spawn (${this.spawnX}, ${this.spawnY}) wallCollides=${mazeSpawnCollides}`);

            // Find a safe spawn point (maze spawn may overlap walls for 48x48 player)
            // Use wallGrid.collides() directly — Physics.isOverlapping also checks
            // player/monster entities which gives false positives here (players are
            // still at old positions, haven't been teleported yet)
            let safeX = this.spawnX;
            let safeY = this.spawnY;
            if (mazeSpawnCollides) {
                console.warn(`[WallSpawn] Level ${level} spawn collides, searching for safe spot...`);
                let found = false;
                for (let attempts = 0; attempts < 100; attempts++) {
                    const tryX = Math.random() * (this.constants.WORLD_WIDTH - 200) + 100;
                    const tryY = Math.random() * (this.constants.WORLD_HEIGHT - 200) + 100;
                    if (!this.wallGrid.collides(tryX, tryY, this.constants.PLAYER_WIDTH, this.constants.PLAYER_HEIGHT)) {
                        safeX = tryX;
                        safeY = tryY;
                        found = true;
                        console.log(`[WallSpawn] Found safe spawn at (${safeX.toFixed(1)}, ${safeY.toFixed(1)}) after ${attempts + 1} attempts`);
                        break;
                    }
                }
                if (!found) {
                    safeX = 100;
                    safeY = 100;
                    console.warn(`[WallSpawn] Level ${level}: ALL 100 random attempts failed! Fallback (100, 100) collides=${this.wallGrid.collides(100, 100, this.constants.PLAYER_WIDTH, this.constants.PLAYER_HEIGHT)}`);
                }
            }
            this.spawnX = safeX;
            this.spawnY = safeY;
            console.log(`[WallSpawn] Level ${level} final spawn (${this.spawnX}, ${this.spawnY})`);

            // Teleport all players to safe spawn point
            for (const playerCode in this.gameState.players) {
                const p = this.gameState.players[playerCode];
                const oldX = p.x, oldY = p.y;
                p.x = this.spawnX;
                p.y = this.spawnY;
                console.log(`[WallSpawn] Teleported ${playerCode} from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${p.x}, ${p.y})`);
            }

            // Update managers with new wallGrid
            this.monsterManager.wallGrid = this.wallGrid;
            this.playerManager.wallGrid = this.wallGrid;
            this.bulletManager.wallGrid = this.wallGrid;
            this.collectibleManager.wallGrid = this.wallGrid;

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

            // Spawn collectibles for the new level
            this.collectibleManager.initializeLevelCollectibles();
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

}

module.exports = Game;
