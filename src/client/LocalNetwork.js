/**
 * LocalNetwork - Offline game adapter
 * Mirrors the Network.js interface but drives a local GameEngine instance
 * instead of connecting to a Socket.IO server.
 */
class LocalNetwork {
    constructor() {
        this.engine = null;
        this.isConnected = false;
        this.playerCode = null;
        this._playerId = 'local-player';

        // Same callback structure as Network
        this.callbacks = {
            onGameStateUpdate: null,
            onPlayerCode: null,
            onPlayerNumber: null,
            onMonsterKilled: null,
            onBulletHit: null,
            onWalls: null,
            onLevelAdvancing: null,
            onGameConfig: null,
            onMonsterDrop: null,
            onArmorAbsorb: null,
            onLevelProgress: null,
            // Multiplayer lifecycle events (mostly no-ops offline)
            onPlayerDied: null,
            onPlayerJoinedGame: null,
            onPlayerLeftGame: null,
            onPlayerDisconnected: null,
            onPlayerReconnected: null,
            onGameEnded: null,
            onGameSpeedUpdate: null
        };
    }

    /**
     * Set callbacks for network events
     * @param {Object} callbacks
     */
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }

    /**
     * Connect to a local game engine (offline mode).
     * @param {Object} callbacks - Optional callbacks to set before connecting
     * @returns {Promise} Resolves when local engine is ready
     */
    connect(callbacks) {
        if (callbacks) {
            Object.assign(this.callbacks, callbacks);
        }

        var self = this;
        return new Promise(function (resolve) {
            self.isConnected = true;
            console.log('LocalNetwork: Connected (offline mode)');
            resolve();
        });
    }

    /**
     * Start a local solo game. Creates and starts the GameEngine.
     * @param {string} difficulty - 'easy', 'normal', or 'hard' (or 'custom')
     * @param {Object} quizSettings - Quiz mode distribution
     * @param {string} gameSpeed - 'slow', 'normal', or 'fast'
     * @param {string} mapStyle - Map generation style
     * @param {Object} urlConfig - Full URL config with balance/levels overrides (optional)
     */
    sendStartSoloGame(difficulty, quizSettings, gameSpeed, mapStyle, urlConfig) {
        if (difficulty === undefined) difficulty = 'normal';
        if (quizSettings === undefined) quizSettings = null;
        if (gameSpeed === undefined) gameSpeed = 'normal';
        if (mapStyle === undefined) mapStyle = 'classic';

        var self = this;

        // Create game config — use custom balance if URL config provided
        var config;
        if (urlConfig && urlConfig.balance) {
            config = GameConfig.createFromCustomBalance(
                urlConfig.balance,
                quizSettings,
                urlConfig.levels || null,
                {
                    disableLevelBoss: urlConfig.disableLevelBoss === true,
                    fixedMonsters: urlConfig.fixedMonsters || null,
                    randomSpawnsEnabled: urlConfig.randomSpawnsEnabled,
                    randomSpawnBudget: urlConfig.randomSpawnBudget,
                    mapData: urlConfig.mapData || null,
                    playerSpawn: urlConfig.playerSpawn || null
                }
            );
        } else {
            config = GameConfig.createGameConfig(difficulty);
            if (quizSettings) {
                config.quizSettings = quizSettings;
            }
        }
        if (gameSpeed) {
            config.gameSpeed = gameSpeed === 'fast' ? 1.5 : (gameSpeed === 'slow' ? 0.75 : 1.0);
        }
        if (mapStyle) {
            config.mapStyle = mapStyle;
        }

        // Create emitter that routes events to our callbacks
        var emitter = {
            emit: function (event, data) {
                self._handleEngineEvent(event, data);
            }
        };

        // Create and start the engine
        this.engine = new GameEngine(emitter, config, 'solo-local');

        // Register per-player send callback
        this.engine.registerPlayerSend(this._playerId, function (event, data) {
            self._handleEngineEvent(event, data);
        });

        // Add the local player (this emits playerCode, playerNumber,
        // gameStateUpdate, and playerJoinedGame via _sendToPlayer callback)
        this.playerCode = this.engine.addPlayer(this._playerId, 'Player');

        // Start the game loop
        this.engine.start();

        // Emit game speed update so client-side player speed multiplier is set
        if (this.callbacks.onGameSpeedUpdate) {
            this.callbacks.onGameSpeedUpdate(gameSpeed || 'normal');
        }
    }

    /**
     * Start a local wave assault game. Creates and starts the WaveGameEngine.
     * @param {Object} waveConfig - Optional overrides (totalWaves, etc.)
     */
    sendStartWaveGame(waveConfig) {
        var self = this;

        // Create emitter that routes events to our callbacks
        var emitter = {
            emit: function (event, data) {
                self._handleEngineEvent(event, data);
            }
        };

        // Create and start the wave engine
        this.engine = new WaveGameEngine(emitter, waveConfig || {});
        this.playerCode = this.engine.playerCode;
        this.isConnected = true;

        // Start the game loop
        this.engine.start();
    }

    /**
     * Start a local Scripture Maze game.
     * @param {Object} missionConfig - Mission definition for this mode
     */
    sendStartScriptureMazeGame(missionConfig) {
        var self = this;

        var emitter = {
            emit: function (event, data) {
                self._handleEngineEvent(event, data);
            }
        };

        this.engine = new ScriptureMazeEngine(emitter, missionConfig || {});
        this.playerCode = 'scripture-maze-local';
        this.isConnected = true;
        this.engine.start();
    }

    /**
     * Send input to the wave game engine (horizontal movement, firing).
     * @param {string} event - Input event name
     * @param {*} data - Input data
     */
    sendWaveInput(event, data) {
        if (this.engine && typeof this.engine.handleInput === 'function') {
            this.engine.handleInput(event, data);
        }
    }

    sendScriptureMazeInput(event, data) {
        if (this.engine && typeof this.engine.handleInput === 'function') {
            this.engine.handleInput(event, data);
        }
    }

    /**
     * Route engine events to the appropriate callbacks.
     */
    _handleEngineEvent(event, data) {
        // Map event names to callback names (gameStateUpdate/gameState -> onGameStateUpdate)
        var eventName = event === 'gameState' ? 'gameStateUpdate' : event;
        var callbackName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        if (this.callbacks[callbackName]) {
            this.callbacks[callbackName](data);
        }
    }

    // ==================== SEND METHODS ====================

    sendPosition(x, y) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'playerPosition', { x: x, y: y });
        }
    }

    sendPlayerHit(damage) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'playerHit', damage);
        }
    }

    sendAttack(attackData) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'playerAttack', attackData);
        }
    }

    sendCollectHealingPoint(healingPointId) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'collectHealingPoint', healingPointId);
        }
    }

    sendShoot(target) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'playerShoot', target);
        }
    }

    sendQuizCorrect(category) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'quizCorrect', category ? { category: category } : null);
        }
    }

    sendCombatCategory(category) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'setCombatCategory', { category: category });
        }
    }

    sendVerseTestPassed() {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'verseTestPassed', null);
        }
    }

    sendVotdBonusEarned() {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'votdBonusEarned', null);
        }
    }

    sendFunModeBonus(bonusHealth, bonusAmmo) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'funModeBonus', { bonusHealth, bonusAmmo });
        }
    }

    sendCollectCollectible(collectibleId) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'collectCollectible', collectibleId);
        }
    }

    sendActivateItem(type) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'activateItem', type);
        }
    }

    sendConsumeItem(type) {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'consumeItem', type);
        }
    }

    sendLevelCompleted() {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'levelCompleted', null);
        }
    }

    sendGameStateUpdate(gameState) {
        // No-op for offline — engine manages its own state
    }

    sendPlayerData(playerCode, playerData) {
        // No-op for offline
    }

    // Multiplayer methods — no-ops in offline mode
    sendJoinGame(roomId) { }
    sendLeaveGame() {
        if (this.engine) {
            this.engine.handlePlayerInput(this._playerId, 'leaveGame', null);
        }
    }

    /**
     * Disconnect and stop the local engine.
     */
    disconnect() {
        if (this.engine) {
            this.engine.stop();
            this.engine = null;
        }
        this.isConnected = false;
        this.playerCode = null;
        console.log('LocalNetwork: Disconnected (offline mode)');
    }
}

// Expose LocalNetwork class globally for instanceof checks
window.LocalNetwork = LocalNetwork;
