/**
 * Network - Manages all Socket.IO communication
 * Encapsulates connection, event listeners, and message sending
 */
class Network {
    constructor() {
        this.socket = null;
        this.isConnected = false;

        // Callbacks for incoming events
        this.callbacks = {
            onGameStateUpdate: null,
            onPlayerCode: null,
            onPlayerNumber: null,
            onMonsterKilled: null,
            onBulletHit: null,
            onWalls: null,
            onLevelAdvancing: null,
            onGameConfig: null
        };
    }

    /**
     * Set callbacks for network events AND set up listeners
     * Call this BEFORE connect() or immediately after
     * @param {Object} callbacks 
     */
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
        // If already connected, set up listeners now
        if (this.socket) {
            this._setupListeners();
        }
    }

    /**
     * Connect to the game server
     * @param {Object} callbacks - Optional callbacks to set before connecting
     * @returns {Promise} Resolves when connected
     */
    connect(callbacks) {
        // If callbacks provided, set them first
        if (callbacks) {
            Object.assign(this.callbacks, callbacks);
        }

        return new Promise((resolve, reject) => {
            try {
                this.socket = io();

                // Set up event listeners BEFORE 'connect' fires
                this._setupListeners();

                this.socket.on('connect', () => {
                    this.isConnected = true;
                    console.log('Network: Connected to server');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    console.log('Network: Disconnected from server');
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Network: Connection error', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Set up socket event listeners
     */
    _setupListeners() {
        // Game state updates (primary sync mechanism)
        this.socket.on('gameStateUpdate', (newGameState) => {
            if (this.callbacks.onGameStateUpdate) {
                this.callbacks.onGameStateUpdate(newGameState);
            }
        });

        // Initial game state (same handler as update)
        this.socket.on('gameState', (initialGameState) => {
            if (this.callbacks.onGameStateUpdate) {
                this.callbacks.onGameStateUpdate(initialGameState);
            }
        });

        // Player code assignment
        this.socket.on('playerCode', (code) => {
            if (this.callbacks.onPlayerCode) {
                this.callbacks.onPlayerCode(code);
            }
        });

        // Player number (for sprite selection)
        this.socket.on('playerNumber', (playerNumber) => {
            if (this.callbacks.onPlayerNumber) {
                this.callbacks.onPlayerNumber(playerNumber);
            }
        });

        // Monster killed notification
        this.socket.on('monsterKilled', (data) => {
            if (this.callbacks.onMonsterKilled) {
                this.callbacks.onMonsterKilled(data);
            }
        });

        // Bullet hit notification (for impact sound)
        this.socket.on('bulletHit', (data) => {
            if (this.callbacks.onBulletHit) {
                this.callbacks.onBulletHit(data);
            }
        });

        // Walls data (sent once on connect, and on level change)
        this.socket.on('walls', (data) => {
            if (this.callbacks.onWalls) {
                this.callbacks.onWalls(data);
            }
        });

        // Level advancing countdown (server-driven)
        this.socket.on('levelAdvancing', (data) => {
            if (this.callbacks.onLevelAdvancing) {
                this.callbacks.onLevelAdvancing(data);
            }
        });

        // Game config (quiz settings, difficulty info)
        this.socket.on('gameConfig', (config) => {
            if (this.callbacks.onGameConfig) {
                this.callbacks.onGameConfig(config);
            }
        });
    }

    // ==================== SEND METHODS ====================

    /**
     * Send player position to server
     * @param {number} x 
     * @param {number} y 
     */
    sendPosition(x, y) {
        if (this.socket) {
            this.socket.emit('playerPosition', { x, y });
        }
    }

    /**
     * Notify server that player was hit
     * @param {number} damage 
     */
    sendPlayerHit(damage) {
        if (this.socket) {
            this.socket.emit('playerHit', damage);
        }
    }

    /**
     * Send player attack data
     * @param {Object} attackData - { monsterId, damage }
     */
    sendAttack(attackData) {
        if (this.socket) {
            this.socket.emit('playerAttack', attackData);
        }
    }

    /**
     * Notify server of healing point collection
     * @param {string} healingPointId 
     */
    sendCollectHealingPoint(healingPointId) {
        if (this.socket) {
            this.socket.emit('collectHealingPoint', healingPointId);
        }
    }

    /**
     * Send shoot event
     * @param {Object} target - {x, y}
     */
    sendShoot(target) {
        if (this.socket) {
            this.socket.emit('playerShoot', target);
        }
    }

    /**
     * Send quiz correct event (to award ammo)
     */
    sendQuizCorrect() {
        if (this.socket) {
            this.socket.emit('quizCorrect');
        }
    }

    /**
     * Notify server of shield collection
     * @param {string} shieldId
     */
    sendCollectShield(shieldId) {
        if (this.socket) {
            this.socket.emit('collectShield', shieldId);
        }
    }

    /**
     * Notify server that level is completed
     */
    sendLevelCompleted() {
        if (this.socket) {
            this.socket.emit('levelCompleted');
        }
    }

    /**
     * Update game state (for level config changes)
     * @param {Object} gameState 
     */
    sendGameStateUpdate(gameState) {
        if (this.socket) {
            this.socket.emit('updateGameState', gameState);
        }
    }

    /**
     * Update player data
     * @param {string} playerCode 
     * @param {Object} playerData 
     */
    sendPlayerData(playerCode, playerData) {
        if (this.socket) {
            this.socket.emit('updatePlayerData', { playerCode, playerData });
        }
    }

    /**
     * Request a solo game instance from the server
     * @param {string} difficulty - 'easy', 'normal', or 'hard'
     * @param {Object} quizSettings - Quiz mode distribution
     */
    sendStartSoloGame(difficulty = 'normal', quizSettings = null) {
        if (this.socket) {
            this.socket.emit('startSoloGame', { difficulty, quizSettings });
        }
    }

    /**
     * Join an existing multiplayer game
     * @param {string} roomId
     */
    sendJoinGame(roomId) {
        if (this.socket) {
            this.socket.emit('joinGame', roomId);
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Create global instance
const network = new Network();
