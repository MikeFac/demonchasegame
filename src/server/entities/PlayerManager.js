const Constants = require('../../shared/Constants');
const LevelConfig = require('../../shared/LevelConfig');
const Physics = require('../utils/Physics');
const crypto = require('crypto');

class PlayerManager {
    constructor(gameState, io, wallGrid) {
        this.gameState = gameState;
        this.io = io;
        this.wallGrid = wallGrid || null;
    }

    generatePlayerCode() {
        return crypto.randomBytes(3).toString('hex');
    }

    addPlayer(socket, spawnX = null, spawnY = null) {
        const { gameState, io } = this;
        const playerCode = this.generatePlayerCode();
        socket.playerCode = playerCode;

        // Try to use provided spawn position first (from maze generation)
        let x, y;
        let validPosition = false;

        if (spawnX !== null && spawnY !== null) {
            // Use maze-generated spawn position
            x = spawnX;
            y = spawnY;
            if (!Physics.isOverlapping(x, y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT, gameState, null, this.wallGrid)) {
                validPosition = true;
                console.log(`Player ${playerCode} spawned at maze position (${x.toFixed(1)}, ${y.toFixed(1)})`);
            } else {
                console.warn(`Spawn position (${x.toFixed(1)}, ${y.toFixed(1)}) has collision, searching for alternative...`);
            }
        }

        // Fall back to random search if maze spawn is invalid or not provided
        if (!validPosition) {
            let attempts = 0;
            while (!validPosition && attempts < 100) {
                x = Math.random() * (Constants.WORLD_WIDTH - 200) + 100;
                y = Math.random() * (Constants.WORLD_HEIGHT - 200) + 100;

                if (!Physics.isOverlapping(x, y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT, gameState, null, this.wallGrid)) {
                    validPosition = true;
                    console.log(`Player ${playerCode} spawned at random position (${x.toFixed(1)}, ${y.toFixed(1)}) after ${attempts} attempts`);
                }
                attempts++;
            }
        }

        if (!validPosition) {
            x = 100;
            y = 100;
            console.warn('Spawn position fallback (100, 100) used for player ' + playerCode);
        }

        gameState.players[playerCode] = {
            x: x,
            y: y,
            width: Constants.PLAYER_WIDTH,
            height: Constants.PLAYER_HEIGHT,
            health: 100, // Initial health
            maxHealth: 100,
            code: playerCode,
            color: 'blue', // Default, client overrides with sprite
            xp: 0,
            level: 1,
            ammo: 0, // Must earn ammo by answering quizzes correctly
            votdDamageBonus: false, // True when player completes VOTD test
            state: 'alive',        // 'alive' | 'ghost' | 'disconnected'
            canAttack: true,
            username: socket.username || null
        };
        gameState.connectedPlayers++;

        // Send player their code and number (for sprite selection)
        socket.emit('playerCode', playerCode);
        socket.emit('playerNumber', gameState.connectedPlayers); // This triggers client to load playerX.png
        socket.emit('gameStateUpdate', gameState);
        io.emit('playerJoinedGame', { code: playerCode, username: socket.username || 'Player', players: gameState.connectedPlayers });

        console.log(`Player ${playerCode} connected. Total: ${gameState.connectedPlayers}`);
    }

    removePlayer(socket) {
        const { gameState, io } = this;
        const playerCode = socket.playerCode;
        if (playerCode && gameState.players[playerCode]) {
            const player = gameState.players[playerCode];
            const username = player.username || 'Player';
            delete gameState.players[playerCode];
            gameState.connectedPlayers--;
            io.emit('playerDisconnected', { code: playerCode, username });
            console.log(`Player ${playerCode} (${username}) disconnected. Total: ${gameState.connectedPlayers}`);
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
                // Store position before removing
                const deathX = targetMonster.x;
                const deathY = targetMonster.y;

                const index = gameState.monsters.indexOf(targetMonster);
                gameState.monsters.splice(index, 1);

                if (!gameState.monstersKilled) gameState.monstersKilled = 0;
                gameState.monstersKilled++;

                // Award XP
                player.xp += 10; // 10 XP per kill

                // Level Up Logic - ONLY check next level threshold to prevent multi-level jumps
                const xpReqs = LevelConfig.levelXPRequirements;
                const nextLevelIndex = player.level; // next level is current+1, which is at index player.level
                if (nextLevelIndex < xpReqs.length && player.xp >= xpReqs[nextLevelIndex]) {
                    player.level = nextLevelIndex + 1;
                    player.maxHealth = 50 + player.level * 50;
                    player.health = player.maxHealth; // Full heal on level up
                    console.log(`Player ${playerCode} reached level ${player.level}!`);
                }

                io.emit('monsterKilled', { monsterId: targetMonster.id, killer: playerCode, x: deathX, y: deathY });

                if (targetMonster.chaser) {
                    gameState.chaseTrigger = true;
                }
            }
            io.emit('gameStateUpdate', gameState);
        }
    }

    handlePlayerHit(socket, damage) {
        const { gameState } = this;
        const playerCode = socket.playerCode;
        const player = gameState.players[playerCode];

        if (!player) return;
        if (player.state !== 'alive') return; // Ghosts can't take damage

        player.health -= damage;
        if (player.health < 0) player.health = 0;

        // Death detection — convert to ghost
        if (player.health <= 0 && player.state === 'alive') {
            player.state = 'ghost';
            player.canAttack = false;
            this.io.emit('playerDied', {
                playerCode,
                username: player.username || 'Player'
            });
            console.log(`Player ${playerCode} (${player.username || 'Player'}) died — now a ghost`);
        }

        // Broadcast the health update
        this.io.emit('gameStateUpdate', gameState);
    }
}

module.exports = PlayerManager;
