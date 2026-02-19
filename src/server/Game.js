const GameEngine = require('../shared/GameEngine');
const GameConfig = require('../shared/GameConfig');

/**
 * Server-side game wrapper.
 * Binds Socket.IO sockets to the shared GameEngine.
 * Handles socket lifecycle, reconnection, and per-socket event routing.
 */
class Game {
    constructor(io, roomId, gameConfig) {
        if (roomId === undefined) roomId = null;
        if (gameConfig === undefined) gameConfig = null;

        this.roomId = roomId;
        this._io = io;

        // Create room-scoped emitter for GameEngine broadcasts
        const roomName = roomId ? `room:${roomId}` : null;
        const emitter = {
            emit: (event, data) => {
                if (roomName) {
                    io.to(roomName).emit(event, data);
                } else {
                    io.emit(event, data);
                }
            }
        };

        // Create the shared game engine
        const config = gameConfig || GameConfig.createGameConfig('normal');
        this.engine = new GameEngine(emitter, config, roomId);

        // Track connected sockets (for per-socket wall re-emission)
        this.sockets = [];

        // Proxy commonly accessed properties
        this.gameState = this.engine.gameState;

        // Forward onEmpty callback
        this.engine.onEmpty = () => {
            if (this.onEmpty) this.onEmpty();
        };
    }

    get shouldRun() { return this.engine.shouldRun; }

    start() {
        this.engine.start();
    }

    stop() {
        this.engine.stop();
    }

    addPlayer(socket) {
        const isSoloGame = this.roomId && this.roomId.startsWith('solo-');

        // Try reconnection first (multiplayer only)
        if (!isSoloGame && socket.username) {
            const sendFn = (event, data) => socket.emit(event, data);
            const reconnectedCode = this.engine.reconnectPlayer(socket.id, socket.username, sendFn);
            if (reconnectedCode) {
                socket.playerCode = reconnectedCode;
                this.sockets.push(socket);
                this._registerSocketHandlers(socket, reconnectedCode);
                return;
            }
        }

        // New player — register send callback, then add to engine
        const sendFn = (event, data) => socket.emit(event, data);
        this.engine.registerPlayerSend(socket.id, sendFn);

        const playerCode = this.engine.addPlayer(socket.id, socket.username || null);
        socket.playerCode = playerCode;
        this.sockets.push(socket);

        // Register socket event handlers
        this._registerSocketHandlers(socket, playerCode);
    }

    /**
     * Register Socket.IO event handlers that route to GameEngine.
     */
    _registerSocketHandlers(socket, playerCode) {
        const isSoloGame = this.roomId && this.roomId.startsWith('solo-');
        const playerId = socket.id;

        // Disconnect handling
        socket.on('disconnect', () => {
            this.sockets = this.sockets.filter(s => s !== socket);

            if (isSoloGame) {
                this.engine.removePlayer(playerId);
            } else {
                this.engine.disconnectPlayer(playerId);
                // Check if all sockets gone
                if (this.sockets.length === 0 && this.gameState.connectedPlayers <= 0) {
                    this.engine.stop();
                    if (this.onEmpty) this.onEmpty();
                }
            }
        });

        // Route all game events to engine
        const events = [
            'playerPosition', 'playerShoot', 'quizCorrect',
            'collectHealingPoint', 'collectCollectible',
            'activateItem', 'consumeItem', 'playerHit',
            'votdBonusEarned', 'verseTestPassed', 'playerAttack',
            'levelCompleted'
        ];

        for (const event of events) {
            socket.on(event, (data) => {
                this.engine.handlePlayerInput(playerId, event, data);
            });
        }

        // leaveGame needs special handling (removes socket from our list too)
        socket.on('leaveGame', () => {
            this.sockets = this.sockets.filter(s => s !== socket);
            this.engine.handlePlayerInput(playerId, 'leaveGame', null);
        });
    }
}

module.exports = Game;
