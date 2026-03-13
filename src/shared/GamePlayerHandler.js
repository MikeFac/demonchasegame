(function () {
    var Constants;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
    }

    /**
     * Player lifecycle management for GameEngine.
     * Handles adding, removing, disconnecting, and reconnecting players.
     */

    function addPlayer(engine, playerId, username) {
        // Create a socket-like proxy for PlayerManager
        var socketProxy = {
            username: username || null,
            playerCode: null,
            emit: function (event, data) {
                if (engine._sendToPlayer[playerId]) {
                    engine._sendToPlayer[playerId](event, data);
                }
            }
        };

        var spawnCollides = engine.wallGrid.collides(engine.spawnX, engine.spawnY, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT);
        console.log('[GameEngine] addPlayer ' + playerId + ' at (' + engine.spawnX + ', ' + engine.spawnY + ') wallCollides=' + spawnCollides);

        engine.playerManager.addPlayer(socketProxy, engine.spawnX, engine.spawnY);

        var playerCode = socketProxy.playerCode;

        // Send walls and config to the new player
        if (engine._sendToPlayer[playerId]) {
            engine._sendToPlayer[playerId]('walls', engine._getWallData());
            var isSoloGame = engine.roomId && engine.roomId.startsWith('solo-');
            var configMsg = {
                quizSettings: engine.gameConfig.quizSettings,
                preset: engine.gameConfig.preset,
                presetName: engine.gameConfig.presetName,
                isSoloGame: isSoloGame !== false,
                meleeHitProbabilityNoAnswer: engine.gameConfig.meleeHitProbabilityNoAnswer || 0.0
            };
            // Include mission metadata if this is a mission game
            if (engine.gameConfig.missionId) {
                configMsg.missionId = engine.gameConfig.missionId;
                configMsg.worldId = engine.gameConfig.worldId;
                configMsg.missionName = engine.gameConfig.missionName;
                configMsg.xpMultiplier = engine.gameConfig.xpMultiplier;
                configMsg.missionType = engine.gameConfig.missionType || 'verse';
                configMsg.packId = engine.gameConfig.packId || null;
                configMsg.unitIds = engine.gameConfig.unitIds || null;
            }
            // Include FUN mode properties
            configMsg.startingAmmo = engine.gameConfig.startingAmmo || 0;
            configMsg.ammoRegenRate = engine.gameConfig.ammoRegenRate || 0;
            configMsg.bonusHealth = engine.gameConfig.bonusHealth || 0;
            configMsg.bonusAmmo = engine.gameConfig.bonusAmmo || 0;
            configMsg.noQuizPenalty = engine.gameConfig.noQuizPenalty || false;
            engine._sendToPlayer[playerId]('gameConfig', configMsg);
        }

        // Map playerId to playerCode for input routing
        engine._playerIdToCode[playerId] = playerCode;
        engine._codeToPlayerId[playerCode] = playerId;

        // Spawn initial monsters if first player
        var playerCount = Object.keys(engine.gameState.players).length;
        if (playerCount === 1 && engine.gameState.monsters.length === 0) {
            var currentLevel = engine.gameState.gameLevel || 1;
            var initialMonsterCount = Math.max(9, Math.ceil(engine.levelData[currentLevel].maxMonsters * 0.525));
            console.log('First player joined - spawning ' + initialMonsterCount + ' initial monsters for level ' + currentLevel);
            engine.monsterManager.spawnMonsterAtDistance(200, 350, true);
            for (var i = 1; i < initialMonsterCount; i++) {
                engine.monsterManager.spawnMonster();
            }
        }

        return playerCode;
    }

    function removePlayer(engine, playerId) {
        var playerCode = engine._playerIdToCode[playerId];
        if (!playerCode) return;

        var player = engine.gameState.players[playerCode];
        if (!player) return;

        var username = player.username || 'Player';
        delete engine.gameState.players[playerCode];
        engine.gameState.connectedPlayers--;
        engine.emitter.emit('playerDisconnected', { code: playerCode, username: username });
        console.log('Player ' + playerCode + ' (' + username + ') removed. Total: ' + engine.gameState.connectedPlayers);

        delete engine._sendToPlayer[playerId];
        delete engine._playerIdToCode[playerId];
        delete engine._codeToPlayerId[playerCode];
        engine._disconnectedPlayers.delete(playerCode);

        if (engine.gameState.connectedPlayers <= 0) {
            engine.stop();
            if (engine.onEmpty) engine.onEmpty();
        }
    }

    function disconnectPlayer(engine, playerId) {
        var playerCode = engine._playerIdToCode[playerId];
        if (!playerCode) return;

        var player = engine.gameState.players[playerCode];
        if (!player) return;

        player.state = 'disconnected';
        player.disconnectTime = Date.now();

        engine.emitter.emit('playerDisconnected', { code: playerCode, username: player.username || 'Player' });
        engine._disconnectedPlayers.set(playerCode, { username: player.username });
        delete engine._sendToPlayer[playerId];
        console.log('Player ' + playerCode + ' (' + (player.username || 'Player') + ') disconnected — 30s grace period');
    }

    function reconnectPlayer(engine, playerId, username, sendFn) {
        if (!username) return null;

        for (var entry of engine._disconnectedPlayers.entries()) {
            var code = entry[0];
            var info = entry[1];
            if (info.username === username) {
                var player = engine.gameState.players[code];
                if (player && player.state === 'disconnected') {
                    player.state = player.health > 0 ? 'alive' : 'ghost';
                    player.disconnectTime = null;

                    engine._disconnectedPlayers.delete(code);
                    engine._sendToPlayer[playerId] = sendFn;
                    engine._playerIdToCode[playerId] = code;
                    engine._codeToPlayerId[code] = playerId;

                    // Send current state
                    sendFn('playerCode', code);
                    sendFn('walls', engine._getWallData());
                    var isSoloGame = engine.roomId && engine.roomId.startsWith('solo-');
                    var reconConfigMsg = {
                        quizSettings: engine.gameConfig.quizSettings,
                        preset: engine.gameConfig.preset,
                        presetName: engine.gameConfig.presetName,
                        isSoloGame: isSoloGame !== false
                    };
                    if (engine.gameConfig.missionId) {
                        reconConfigMsg.missionId = engine.gameConfig.missionId;
                        reconConfigMsg.worldId = engine.gameConfig.worldId;
                        reconConfigMsg.missionName = engine.gameConfig.missionName;
                        reconConfigMsg.xpMultiplier = engine.gameConfig.xpMultiplier;
                        reconConfigMsg.missionType = engine.gameConfig.missionType || 'verse';
                        reconConfigMsg.packId = engine.gameConfig.packId || null;
                        reconConfigMsg.unitIds = engine.gameConfig.unitIds || null;
                    }
                    sendFn('gameConfig', reconConfigMsg);
                    sendFn('playerNumber', Object.keys(engine.gameState.players).indexOf(code) + 1);

                    engine.emitter.emit('playerReconnected', { code: code, username: username });
                    console.log('Player ' + code + ' (' + username + ') reconnected!');
                    return code;
                }
            }
        }
        return null;
    }

    var GamePlayerHandler = {
        addPlayer: addPlayer,
        removePlayer: removePlayer,
        disconnectPlayer: disconnectPlayer,
        reconnectPlayer: reconnectPlayer
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GamePlayerHandler;
    } else if (typeof window !== 'undefined') {
        window.GamePlayerHandler = GamePlayerHandler;
    }
})();
