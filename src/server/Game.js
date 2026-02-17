const Constants = require('../shared/Constants');
const LevelConfig = require('../shared/LevelConfig');
const WallGrid = require('../shared/WallGrid');
const MapGeneratorFactory = require('./utils/map-generators');
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

        // Generate dungeon maze based on config style
        const mapStyle = this.gameConfig.mapStyle || 'classic';
        const mazeResult = MapGeneratorFactory.generateMap(mapStyle, this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
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
            spawnsLeft: this.levelData[1].maxMonsters,
            monstersKilled: 0,
            monstersToKill: this.levelData[1].monstersToKill || 10
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

            // Monster Spawning Loop (dynamic based on level spawn rate)
            this.scheduleNextSpawn(),

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

    scheduleNextSpawn() {
        if (!this.shouldRun) return;

        // Get current level's spawn rate
        const currentLevel = this.gameState.gameLevel || 1;
        const spawnRate = this.levelData[currentLevel] ? this.levelData[currentLevel].spawnRate : 5000;

        this.spawnTimeout = setTimeout(() => {
            if (this.shouldRun) {
                this.monsterManager.spawnMonster();
                this.scheduleNextSpawn(); // Reschedule
            }
        }, spawnRate);
    }

    stop() {
        this.shouldRun = false;
        this.intervals.forEach(id => clearInterval(id));
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
        this.intervals = [];
        console.log(`Game stopped (room: ${this.roomId || 'global'})`);
    }

    addPlayer(socket) {
        // Check for reconnection (player with same username who disconnected)
        if (this._disconnectedPlayers && socket.username) {
            for (const [code, info] of this._disconnectedPlayers.entries()) {
                if (info.username === socket.username) {
                    const player = this.gameState.players[code];
                    if (player && player.state === 'disconnected') {
                        // Reconnect — restore player state
                        player.state = player.health > 0 ? 'alive' : 'ghost';
                        player.disconnectTime = null;
                        socket.playerCode = code;
                        this.sockets.push(socket);
                        this._disconnectedPlayers.delete(code);

                        // Re-register socket handlers
                        this._registerSocketHandlers(socket);

                        // Send current state to reconnected client
                        socket.emit('playerCode', code);
                        socket.emit('walls', {
                            walls: this.walls,
                            gridFlat: this._flattenGrid(),
                            rows: this.mazeGridData.rows,
                            cols: this.mazeGridData.cols,
                            cellSize: this.mazeGridData.cellSize,
                            spawnX: this.spawnX,
                            spawnY: this.spawnY
                        });
                        const isSoloGame = this.roomId && this.roomId.startsWith('solo-');
                        socket.emit('gameConfig', {
                            quizSettings: this.gameConfig.quizSettings,
                            preset: this.gameConfig.preset,
                            presetName: this.gameConfig.presetName,
                            isSoloGame: isSoloGame
                        });
                        socket.emit('playerNumber', Object.keys(this.gameState.players).indexOf(code) + 1);

                        this.io.emit('playerReconnected', { code, username: socket.username });
                        console.log(`Player ${code} (${socket.username}) reconnected!`);
                        return;
                    }
                }
            }
        }

        // New player — spawn normally
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

        // Register all socket event handlers
        this._registerSocketHandlers(socket);

        // Spawn initial monsters if this is the first player (game just started)
        const playerCount = Object.keys(this.gameState.players).length;
        if (playerCount === 1 && this.gameState.monsters.length === 0) {
            const currentLevel = this.gameState.gameLevel || 1;
            const initialMonsterCount = Math.ceil(this.levelData[currentLevel].maxMonsters * 0.2);
            console.log(`First player joined - spawning ${initialMonsterCount} initial monsters for level ${currentLevel}`);

            // Spawn first monster at close range (200-350px)
            this.monsterManager.spawnMonsterAtDistance(200, 350, true);

            // Spawn remaining initial monsters anywhere valid
            for (let i = 1; i < initialMonsterCount; i++) {
                this.monsterManager.spawnMonster();
            }
        }
    }

    /**
     * Register all socket event handlers for a player.
     * Extracted from addPlayer() so it can be reused for reconnection.
     */
    _registerSocketHandlers(socket) {
        const isSoloGame = this.roomId && this.roomId.startsWith('solo-');

        // Handle player disconnect
        socket.on('disconnect', () => {
            const player = this.gameState.players[socket.playerCode];
            if (!player) return;

            if (isSoloGame) {
                // Solo games: remove immediately (no grace period)
                this.playerManager.removePlayer(socket);
                this.sockets = this.sockets.filter(s => s !== socket);
                if (this.gameState.connectedPlayers <= 0) {
                    this.stop();
                    if (this.onEmpty) this.onEmpty();
                }
            } else {
                // Multiplayer: grace period (30 seconds)
                player.state = 'disconnected';
                player.disconnectTime = Date.now();

                this.io.emit('playerDisconnected', { code: socket.playerCode, username: player.username || 'Player' });
                this.sockets = this.sockets.filter(s => s !== socket);

                // Store info for reconnection
                if (!this._disconnectedPlayers) this._disconnectedPlayers = new Map();
                this._disconnectedPlayers.set(socket.playerCode, { username: player.username });
                console.log(`Player ${socket.playerCode} (${player.username || 'Player'}) disconnected — 30s grace period`);
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
                if (player && player.state === 'alive') { // Ghosts can't collect
                    player.health = Math.min(player.health + 25, player.maxHealth);
                    this.gameState.healingPoints.splice(index, 1);
                    this.io.emit('gameStateUpdate', this.gameState);
                }
            }
        });

        // Handle collectible collection (unified for all item types)
        socket.on('collectCollectible', (collectibleId) => {
            const player = this.gameState.players[socket.playerCode];
            if (!player || player.state !== 'alive') return; // Ghosts can't collect
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

        // Handle player leaving the game
        socket.on('leaveGame', () => {
            const player = this.gameState.players[socket.playerCode];
            if (player) {
                this.io.emit('playerLeftGame', { code: socket.playerCode, username: player.username || 'Player' });
            }
            this.playerManager.removePlayer(socket);
            this.sockets = this.sockets.filter(s => s !== socket);
            if (this._disconnectedPlayers) this._disconnectedPlayers.delete(socket.playerCode);
            if (this.gameState.connectedPlayers <= 0) {
                this.stop();
                if (this.onEmpty) this.onEmpty();
            }
        });

        // Handle level completion event (global game event)
        socket.on('levelCompleted', () => {
            // Prevent duplicate triggers during countdown
            if (this._levelAdvancing) return;
            if (this._gameEnded) return;

            // Check if this was the last level — trigger victory
            if (this.gameState.gameLevel >= Object.keys(this.levelData).length) {
                this._endGame('victory');
                return;
            }

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
            if (player && player.state === 'alive' && player.ammo >= 1) { // Ghosts can't shoot
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

        // Handle VOTD bonus earned (damage multiplier)
        socket.on('votdBonusEarned', () => {
            const player = this.gameState.players[socket.playerCode];
            if (player) {
                player.votdDamageBonus = true;
                console.log(`Player ${socket.playerCode} earned VOTD damage bonus`);
            }
        });

        // Handle verse test passed (Award Health)
        socket.on('verseTestPassed', () => {
            const player = this.gameState.players[socket.playerCode];
            if (player && player.state === 'alive') {
                player.health = Math.min(player.health + Constants.VERSE_TEST_HEALTH_REWARD, player.maxHealth);
            }
        });
    }

    update() {
        // Update Monsters
        this.monsterManager.updateMonsters();

        // Update Bullets
        this.bulletManager.update(this.gameState);

        // Check disconnect grace periods (multiplayer)
        this._checkGracePeriods();

        // Check multiplayer game end condition
        this._checkGameEnd();


        // Check Level Completion (Server-side trigger)
        if (this.gameState.monstersKilled >= (this.gameState.monstersToKill || 999) && !this._levelAdvancing && !this._gameEnded) {
            // Simulate level completion logic
            // We can reuse the socket handler logic by extracting it or just replicating it here
            // Replicating for clarity/server-authority:

            // Check if this was the last level — trigger victory
            if (this.gameState.gameLevel >= Object.keys(this.levelData).length) {
                this._endGame('victory');
            } else {
                this._levelAdvancing = true;
                const nextLevel = this.gameState.gameLevel + 1;

                // Broadcast countdown to all clients
                this.io.emit('levelAdvancing', { countdown: 5, nextLevel });

                // After 5 seconds, actually advance
                setTimeout(() => {
                    this.gameState.gameLevel = nextLevel;
                    this.resetLevelData(this.gameState.gameLevel);
                    this._levelAdvancing = false;
                    this.io.emit('gameStateUpdate', this.gameState);
                }, 5000);
            }
        }

        // Broadcast State (walls are NOT included)
        this.io.emit('gameStateUpdate', this.gameState);
    }

    /**
     * Check disconnected players' grace periods and remove expired ones
     */
    _checkGracePeriods() {
        const now = Date.now();
        const GRACE_PERIOD_MS = 30000; // 30 seconds

        for (const code in this.gameState.players) {
            const p = this.gameState.players[code];
            if (p.state === 'disconnected' && p.disconnectTime && (now - p.disconnectTime > GRACE_PERIOD_MS)) {
                // Grace period expired — remove player
                const username = p.username || 'Player';
                delete this.gameState.players[code];
                this.gameState.connectedPlayers--;
                this.io.emit('playerLeftGame', { code, username });
                if (this._disconnectedPlayers) this._disconnectedPlayers.delete(code);
                console.log(`Player ${code} (${username}) grace period expired — removed`);

                if (this.gameState.connectedPlayers <= 0) {
                    this.stop();
                    if (this.onEmpty) this.onEmpty();
                }
            }
        }
    }

    /**
     * Check if multiplayer game should end (all players dead/gone)
     */
    _checkGameEnd() {
        if (this._gameEnded) return;
        const isSolo = this.roomId && this.roomId.startsWith('solo-');
        if (isSolo) return; // Solo handles game over client-side

        const players = Object.values(this.gameState.players);
        if (players.length === 0) return;

        // Only count non-disconnected players for defeat check
        const activePlayers = players.filter(p => p.state !== 'disconnected');
        if (activePlayers.length === 0) return;

        const livingPlayers = activePlayers.filter(p => p.state === 'alive');

        // All active players are ghosts → defeat
        if (livingPlayers.length === 0) {
            this._endGame('defeat');
        }
    }

    _endGame(result) {
        this._gameEnded = true;

        const playerStats = {};
        for (const code in this.gameState.players) {
            const p = this.gameState.players[code];
            playerStats[code] = {
                username: p.username || 'Player',
                level: p.level,
                xp: p.xp
            };
        }

        this.io.emit('gameEnded', {
            result, // 'victory' | 'defeat'
            level: this.gameState.gameLevel,
            monstersKilled: this.gameState.monstersKilled || 0,
            playerStats
        });

        console.log(`Game ended: ${result} (room: ${this.roomId}, level: ${this.gameState.gameLevel})`);

        // Stop game after brief delay (players see results)
        setTimeout(() => {
            this.stop();
            if (this.onEmpty) this.onEmpty();
        }, 10000);
    }

    resetLevelData(level) {
        if (this.levelData[level]) {
            this.gameState.maxSpawns = this.levelData[level].maxMonsters;
            this.gameState.spawnsLeft = this.levelData[level].maxMonsters;
            this.gameState.spawnsLeft = this.levelData[level].maxMonsters;
            this.gameState.monstersKilled = 0;
            this.gameState.monstersToKill = this.levelData[level].monstersToKill || (10 + level * 5); // Fallback if missing
            this.gameState.monsters = [];
            this.gameState.healingPoints = [];
            this.gameState.collectibles = [];
            this.gameState.terrainTheme = this.levelData[level].terrainTheme || 'stone';

            // Regenerate maze for new level
            const mapStyle = this.gameConfig.mapStyle || 'classic';
            const mazeResult = MapGeneratorFactory.generateMap(mapStyle, this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
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

            // Spawn initial monsters (25% of max monsters)
            const initialMonsterCount = Math.ceil(this.levelData[level].maxMonsters * 0.25);
            console.log(`Spawning ${initialMonsterCount} initial monsters for level ${level}`);

            // Spawn first monster at medium distance (400-700px)
            this.monsterManager.spawnMonsterAtDistance(400, 700, true);

            // Spawn remaining initial monsters anywhere valid
            for (let i = 1; i < initialMonsterCount; i++) {
                this.monsterManager.spawnMonster();
            }

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
