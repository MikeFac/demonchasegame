(function () {
    var Constants, LevelConfig, Physics, SharedUtils;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        LevelConfig = require('../LevelConfig');
        Physics = require('../Physics');
        SharedUtils = require('../utils');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        LevelConfig = window.LevelConfig;
        Physics = window.Physics;
        SharedUtils = window.SharedUtils;
    }

    var generateId = SharedUtils.generateId;

    class PlayerManager {
        constructor(gameState, io, wallGrid, gameConfig) {
            this.gameState = gameState;
            this.io = io;
            this.wallGrid = wallGrid || null;
            this.gameConfig = gameConfig || null;
        }

        generatePlayerCode() {
            return generateId(3);
        }

        addPlayer(socket, spawnX, spawnY) {
            if (spawnX === undefined) spawnX = null;
            if (spawnY === undefined) spawnY = null;
            var gameState = this.gameState;
            var io = this.io;
            var playerCode = this.generatePlayerCode();
            socket.playerCode = playerCode;

            var x, y;
            var validPosition = false;

            if (spawnX !== null && spawnY !== null) {
                x = spawnX;
                y = spawnY;
                if (!Physics.isOverlapping(x, y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT, gameState, null, this.wallGrid)) {
                    validPosition = true;
                    console.log('Player ' + playerCode + ' spawned at maze position (' + x.toFixed(1) + ', ' + y.toFixed(1) + ')');
                } else {
                    console.warn('Spawn position (' + x.toFixed(1) + ', ' + y.toFixed(1) + ') has collision, searching for alternative...');
                }
            }

            if (!validPosition) {
                var attempts = 0;
                while (!validPosition && attempts < 100) {
                    x = Math.random() * (Constants.WORLD_WIDTH - 200) + 100;
                    y = Math.random() * (Constants.WORLD_HEIGHT - 200) + 100;

                    if (!Physics.isOverlapping(x, y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT, gameState, null, this.wallGrid)) {
                        validPosition = true;
                        console.log('Player ' + playerCode + ' spawned at random position (' + x.toFixed(1) + ', ' + y.toFixed(1) + ') after ' + attempts + ' attempts');
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
                health: 100,
                maxHealth: 100,
                code: playerCode,
                color: 'blue',
                xp: 0,
                level: 1,
                ammo: (this.gameConfig && this.gameConfig.startingAmmo) || 0,
                votdDamageBonus: false,
                currentCombatCategory: null,
                state: 'alive',
                canAttack: true,
                username: socket.username || null
            };
            gameState.connectedPlayers++;

            // Send player their code and number (for sprite selection)
            socket.emit('playerCode', playerCode);
            socket.emit('playerNumber', gameState.connectedPlayers);
            socket.emit('gameStateUpdate', gameState);
            io.emit('playerJoinedGame', { code: playerCode, username: socket.username || 'Player', players: gameState.connectedPlayers });

            console.log('Player ' + playerCode + ' connected. Total: ' + gameState.connectedPlayers);
        }

        removePlayer(socket) {
            var gameState = this.gameState;
            var io = this.io;
            var playerCode = socket.playerCode;
            if (playerCode && gameState.players[playerCode]) {
                var player = gameState.players[playerCode];
                var username = player.username || 'Player';
                delete gameState.players[playerCode];
                gameState.connectedPlayers--;
                io.emit('playerDisconnected', { code: playerCode, username: username });
                console.log('Player ' + playerCode + ' (' + username + ') disconnected. Total: ' + gameState.connectedPlayers);
            }
        }

        handleMovement(socket, movementData) {
            var gameState = this.gameState;
            var playerCode = socket.playerCode;
            var player = gameState.players[playerCode];

            if (player) {
                if (typeof movementData.x === 'number' && typeof movementData.y === 'number') {
                    player.x = movementData.x;
                    player.y = movementData.y;
                }
            }
        }

        handleAttack(socket, attackData) {
            var gameState = this.gameState;
            var io = this.io;
            var playerCode = socket.playerCode;
            var player = gameState.players[playerCode];
            var targetMonster = gameState.monsters.find(function (m) { return m.id === attackData.monsterId; });

            if (player && targetMonster) {
                if (typeof dbg === 'function') dbg('ENG-ATK', 'handleAttack player=(' + player.x.toFixed(0) + ',' + player.y.toFixed(0) + ') monster=' + targetMonster.id + ' hp=' + targetMonster.health + ' killed=' + gameState.monstersKilled + '/' + gameState.monstersToKill);
                targetMonster.health -= attackData.damage;
                if (targetMonster.health <= 0) {
                    var deathX = targetMonster.x;
                    var deathY = targetMonster.y;
                    var isBoss = !!targetMonster.isBoss;
                    var bossBonusXp = isBoss ? (targetMonster.bonusXp || Constants.BOSS_XP_BONUS) : 0;

                    var index = gameState.monsters.indexOf(targetMonster);
                    gameState.monsters.splice(index, 1);

                    if (!isBoss) {
                        if (!gameState.monstersKilled) gameState.monstersKilled = 0;
                        gameState.monstersKilled++;
                    }

                    player.xp += 10 + bossBonusXp;

                    var xpReqs = LevelConfig.levelXPRequirements;
                    var nextLevelIndex = player.level;
                    if (nextLevelIndex < xpReqs.length && player.xp >= xpReqs[nextLevelIndex]) {
                        player.level = nextLevelIndex + 1;
                        player.maxHealth = 50 + player.level * 50;
                        player.health = player.maxHealth;
                        console.log('Player ' + playerCode + ' reached level ' + player.level + '!');
                    }

                    io.emit('monsterKilled', {
                        monsterId: targetMonster.id,
                        killer: playerCode,
                        x: deathX,
                        y: deathY,
                        isBoss: isBoss,
                        bossLabel: targetMonster.bossLabel || null,
                        bonusXp: bossBonusXp
                    });

                    if (targetMonster.chaser) {
                        gameState.chaseTrigger = true;
                    }
                }
                io.emit('gameStateUpdate', gameState);
            }
        }

        handlePlayerHit(socket, damage) {
            var gameState = this.gameState;
            var playerCode = socket.playerCode;
            var player = gameState.players[playerCode];

            if (!player) return;
            if (player.state !== 'alive') return;

            player.health -= damage;
            if (player.health < 0) player.health = 0;

            if (player.health <= 0 && player.state === 'alive') {
                player.state = 'ghost';
                player.canAttack = false;
                this.io.emit('playerDied', {
                    playerCode: playerCode,
                    username: player.username || 'Player'
                });
                console.log('Player ' + playerCode + ' (' + (player.username || 'Player') + ') died — now a ghost');
            }

            this.io.emit('gameStateUpdate', gameState);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayerManager;
    } else if (typeof window !== 'undefined') {
        window.PlayerManager = PlayerManager;
    }
})();
