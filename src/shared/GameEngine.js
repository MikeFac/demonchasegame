(function () {
    var Constants, WallGrid, MapGeneratorFactory;
    var MonsterManager, PlayerManager, BulletManager, CollectibleManager, GameConfig;
    var GameInputHandler, GameLifecycle, GamePlayerHandler;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
        WallGrid = require('./WallGrid');
        MapGeneratorFactory = require('./map-generators');
        MonsterManager = require('./entities/MonsterManager');
        PlayerManager = require('./entities/PlayerManager');
        BulletManager = require('./entities/BulletManager');
        CollectibleManager = require('./entities/CollectibleManager');
        GameConfig = require('./GameConfig');
        GameInputHandler = require('./GameInputHandler');
        GameLifecycle = require('./GameLifecycle');
        GamePlayerHandler = require('./GamePlayerHandler');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        WallGrid = window.WallGrid;
        MapGeneratorFactory = window.MapGeneratorFactory;
        MonsterManager = window.MonsterManager;
        PlayerManager = window.PlayerManager;
        BulletManager = window.BulletManager;
        CollectibleManager = window.CollectibleManager;
        GameConfig = window.GameConfig;
        GameInputHandler = window.GameInputHandler;
        GameLifecycle = window.GameLifecycle;
        GamePlayerHandler = window.GamePlayerHandler;
    }

    /**
     * Environment-agnostic game engine.
     * Core game loop and manager coordination.
     * Player handling delegated to GamePlayerHandler.
     * Input dispatch delegated to GameInputHandler.
     * Level transitions delegated to GameLifecycle.
     *
     * @param {Object} emitter - Abstract event emitter with .emit(event, data)
     * @param {Object} gameConfig - Optional game config (from GameConfig.createGameConfig)
     * @param {string} roomId - Optional room identifier
     */
    class GameEngine {
        constructor(emitter, gameConfig, roomId) {
            this.roomId = roomId || null;
            this.emitter = emitter;
            this.shouldRun = false;
            this.lastUpdateTime = Date.now();

            // Callbacks for per-player events (set by wrapper)
            this._sendToPlayer = {};
            this._playerIdToCode = {};
            this._codeToPlayerId = {};

            // Game Config
            this.gameConfig = gameConfig || GameConfig.createGameConfig('normal');
            this.constants = this.gameConfig.constants;
            this.levelData = this.gameConfig.levelData;

            // Generate dungeon maze
            this._generateMaze(this.gameConfig.mapStyle || 'classic');

            // Initial Game State
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
                monstersKilled: 0,
                monstersToKill: this.levelData[1].monstersToKill || 10
            };

            if (this.gameConfig.gameSpeed) {
                this.gameState.speedMultiplier = this.gameConfig.gameSpeed;
            }

            // Entity Managers
            this.collectibleManager = new CollectibleManager(this.gameState, this.wallGrid);
            this.monsterManager = new MonsterManager(
                this.gameState, this.emitter, this.levelData,
                this.wallGrid, this.gameConfig.monsterHealthMultiplier
            );
            this.monsterManager.collectibleManager = this.collectibleManager;
            this.playerManager = new PlayerManager(this.gameState, this.emitter, this.wallGrid);
            this.bulletManager = new BulletManager(this.emitter, this.monsterManager, this.wallGrid, this.gameState);

            // Spawn initial healing points and collectibles
            for (var i = 0; i < this.constants.MAX_HEALING_POINTS; i++) {
                this._spawnHealingPoint();
            }
            this.collectibleManager.initializeLevelCollectibles();

            // Internal state
            this._levelAdvancing = false;
            this._gameEnded = false;
            this._disconnectedPlayers = new Map();
            this.intervals = [];
        }

        start() {
            var self = this;
            this.shouldRun = true;
            console.log('GameEngine started (room: ' + (this.roomId || 'local') + ')');
            this.intervals = [];

            // Main Game Loop (60fps)
            this.intervals.push(setInterval(function () {
                if (!self.shouldRun) return;
                self.update();
            }, 1000 / 60));

            // Monster Spawning Loop
            this._scheduleNextSpawn();

            // Healing Point Spawning Loop
            this.intervals.push(setInterval(function () {
                if (!self.shouldRun) return;
                if (self.gameState.healingPoints.length < self.constants.MAX_HEALING_POINTS) {
                    self._spawnHealingPoint();
                }
            }, this.constants.HEALING_SPAWN_INTERVAL));

            // Collectible Respawn Loop
            this.intervals.push(setInterval(function () {
                if (!self.shouldRun) return;
                self.collectibleManager.respawnCollectibles();
            }, Constants.COLLECTIBLE_SPAWN_INTERVAL));
        }

        stop() {
            this.shouldRun = false;
            for (var i = 0; i < this.intervals.length; i++) {
                clearInterval(this.intervals[i]);
            }
            if (this._spawnTimeout) clearTimeout(this._spawnTimeout);
            this.intervals = [];
            console.log('GameEngine stopped (room: ' + (this.roomId || 'local') + ')');
        }

        registerPlayerSend(playerId, sendFn) {
            this._sendToPlayer[playerId] = sendFn;
        }

        unregisterPlayerSend(playerId) {
            delete this._sendToPlayer[playerId];
        }

        // Delegated to GamePlayerHandler
        addPlayer(playerId, username) {
            return GamePlayerHandler.addPlayer(this, playerId, username);
        }

        removePlayer(playerId) {
            GamePlayerHandler.removePlayer(this, playerId);
        }

        disconnectPlayer(playerId) {
            GamePlayerHandler.disconnectPlayer(this, playerId);
        }

        reconnectPlayer(playerId, username, sendFn) {
            return GamePlayerHandler.reconnectPlayer(this, playerId, username, sendFn);
        }

        // Delegated to GameInputHandler
        handlePlayerInput(playerId, event, data) {
            GameInputHandler(this, playerId, event, data);
        }

        // Delegated to GameLifecycle
        _handleLevelCompleted() {
            GameLifecycle.handleLevelCompleted(this);
        }

        _handleLevelAdvance() {
            GameLifecycle.handleLevelAdvance(this);
        }

        _checkGracePeriods() {
            GameLifecycle.checkGracePeriods(this);
        }

        _checkGameEnd() {
            GameLifecycle.checkGameEnd(this);
        }

        _endGame(result) {
            GameLifecycle.endGame(this, result);
        }

        _resetLevelData(level) {
            GameLifecycle.resetLevelData(this, level);
        }

        update() {
            this.monsterManager.updateMonsters();
            this.bulletManager.update(this.gameState);
            this._checkGracePeriods();
            this._checkGameEnd();

            // Check Level Completion
            if (this.gameState.monstersKilled >= (this.gameState.monstersToKill || 999) && !this._levelAdvancing && !this._gameEnded) {
                if (this.gameState.gameLevel >= Object.keys(this.levelData).length) {
                    this._endGame('victory');
                } else {
                    this._handleLevelAdvance();
                }
            }

            this.emitter.emit('gameStateUpdate', this.gameState);
        }

        _scheduleNextSpawn() {
            var self = this;
            if (!this.shouldRun) return;

            var currentLevel = this.gameState.gameLevel || 1;
            var spawnRate = this.levelData[currentLevel] ? this.levelData[currentLevel].spawnRate : 5000;

            this._spawnTimeout = setTimeout(function () {
                if (self.shouldRun) {
                    self.monsterManager.spawnMonster();
                    self._scheduleNextSpawn();
                }
            }, spawnRate);
        }

        _generateMaze(mapStyle) {
            var mazeResult = MapGeneratorFactory.generateMap(mapStyle, this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
            this.walls = mazeResult.walls;
            this.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, this.constants.CELL_SIZE);
            this.mazeGridData = {
                rows: mazeResult.rows,
                cols: mazeResult.cols,
                cellSize: this.constants.CELL_SIZE
            };
            this.spawnX = mazeResult.spawnX;
            this.spawnY = mazeResult.spawnY;
        }

        _getWallData() {
            return {
                walls: this.walls,
                gridFlat: this._flattenGrid(),
                rows: this.mazeGridData.rows,
                cols: this.mazeGridData.cols,
                cellSize: this.mazeGridData.cellSize,
                spawnX: this.spawnX,
                spawnY: this.spawnY
            };
        }

        _flattenGrid() {
            var grid = this.wallGrid.grid;
            var flat = [];
            for (var r = 0; r < this.mazeGridData.rows; r++) {
                for (var c = 0; c < this.mazeGridData.cols; c++) {
                    flat.push(grid[r][c] ? 1 : 0);
                }
            }
            return flat;
        }

        _spawnHealingPoint() {
            if (this.gameState.healingPoints.length < Constants.MAX_HEALING_POINTS) {
                var x, y;
                var attempts = 0;
                do {
                    x = Math.random() * Constants.WORLD_WIDTH;
                    y = Math.random() * Constants.WORLD_HEIGHT;
                    attempts++;
                } while (this.wallGrid.collides(x, y, 30, 30) && attempts < 50);

                if (attempts < 50) {
                    this.gameState.healingPoints.push({
                        id: Date.now() + Math.random(),
                        x: x, y: y, width: 30, height: 30
                    });
                }
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameEngine;
    } else if (typeof window !== 'undefined') {
        window.GameEngine = GameEngine;
    }
})();
