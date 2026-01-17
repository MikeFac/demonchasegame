const Constants = require('../../shared/Constants');
const Physics = require('../utils/Physics');
const crypto = require('crypto');

class PlayerManager {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
    }

    generatePlayerCode() {
        return crypto.randomBytes(3).toString('hex');
    }

    addPlayer(socket) {
        const { gameState, io } = this;
        const playerCode = this.generatePlayerCode();
        socket.playerCode = playerCode;

        // Use a simpler approach for start position (centerish or safe)
        // Original logic: spawnPlayer() used random position
        // We will inline simplified random position logic here for now
        let x, y;
        let validPosition = false;
        let attempts = 0;
        while (!validPosition && attempts < 100) {
            x = Math.random() * (Constants.WORLD_WIDTH - 200) + 100;
            y = Math.random() * (Constants.WORLD_HEIGHT - 200) + 100;

            if (!Physics.isOverlapping(x, y, 32, 32, gameState)) {
                validPosition = true;
            }
            attempts++;
        }
        if (!validPosition) { x = 100; y = 100; } // Fallback

        gameState.players[playerCode] = {
            x: x,
            y: y,
            width: 32, // approx size
            height: 32,
            health: 100, // Initial health
            maxHealth: 100,
            code: playerCode,
            color: 'blue' // Default, client overrides with sprite
        };
        gameState.connectedPlayers++;

        // Send player their code and number (for sprite selection)
        socket.emit('playerCode', playerCode);
        socket.emit('playerNumber', gameState.connectedPlayers); // This triggers client to load playerX.png
        socket.emit('gameStateUpdate', gameState);
        io.emit('playerConnected', { code: playerCode, players: gameState.connectedPlayers });

        console.log(`Player ${playerCode} connected. Total: ${gameState.connectedPlayers}`);
    }

    removePlayer(socket) {
        const { gameState, io } = this;
        const playerCode = socket.playerCode;
        if (playerCode && gameState.players[playerCode]) {
            delete gameState.players[playerCode];
            gameState.connectedPlayers--;
            io.emit('playerDisconnected', playerCode);
            console.log(`Player ${playerCode} disconnected. Total: ${gameState.connectedPlayers}`);
        }
    }

    handleMovement(socket, movementData) {
        const { gameState, io } = this;
        const playerCode = socket.playerCode;
        const player = gameState.players[playerCode];

        if (player) {
            if (typeof movementData.x === 'number' && typeof movementData.y === 'number') {
                // Validate movement (collision check on server is ideal, but for now we trust client or simple check)
                // Original server.js: updated player x,y directly from socket data.
                // We will keep it blindly trusting for now to match original behavior, 
                // OR add the server-side collision validation if original had it.
                // Original had `socket.on('playerMove', ...)` which updated `player.x = data.x`.
                // Wait, original server.js did NOT have playerMove handler updating x/y?
                // Let's check original server.js code in previous turns.
                // Ah, original server.js line 273: socket.on('playerMovement', (movementData) => { ... player.x = movementData.x ... })
                // Yes, it updated blindly.
                // But we added collision logic in CLIENT.
                // SERVER validation is good but optionally later.

                player.x = movementData.x;
                player.y = movementData.y;

                // Broadcast immediately? No, game loop broadcasts state at 50ms.
                // But original might have broadcasted? No, loop does it.
            }
        }
    }

    handleAttack(socket, attackData) {
        const { gameState, io } = this;
        const playerCode = socket.playerCode;
        const player = gameState.players[playerCode];
        // Find monster by ID
        const targetMonster = gameState.monsters.find(m => m.id === attackData.monsterId);

        if (player && targetMonster) {
            targetMonster.health -= attackData.damage;
            if (targetMonster.health <= 0) {
                const index = gameState.monsters.indexOf(targetMonster);
                gameState.monsters.splice(index, 1);

                if (!gameState.monstersKilled) gameState.monstersKilled = 0;
                gameState.monstersKilled++;

                io.emit('monsterKilled', { monsterId: targetMonster.id });

                if (targetMonster.chaser) {
                    gameState.chaseTrigger = true;
                }
            }
            io.emit('gameStateUpdate', gameState);
        }
    }
}

module.exports = PlayerManager;
