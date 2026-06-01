(function () {
    var Constants, WallGrid, MapGeneratorFactory;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
        WallGrid = require('./WallGrid');
        MapGeneratorFactory = require('./map-generators');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        WallGrid = window.WallGrid;
        MapGeneratorFactory = window.MapGeneratorFactory;
    }

    /**
     * Level transition and game lifecycle functions for GameEngine.
     * All functions take the engine instance as the first argument.
     */

    function handleLevelCompleted(engine) {
        if (engine._levelAdvancing) return;
        if (engine._gameEnded) return;

        if (engine.gameState.gameLevel >= Object.keys(engine.levelData).length) {
            endGame(engine, 'victory');
            return;
        }

        handleLevelAdvance(engine);
    }

    function handleLevelAdvance(engine) {
        engine._levelAdvancing = true;
        var nextLevel = engine.gameState.gameLevel + 1;

        engine.emitter.emit('levelAdvancing', { countdown: 5, nextLevel: nextLevel });

        setTimeout(function () {
            engine.gameState.gameLevel = nextLevel;
            resetLevelData(engine, engine.gameState.gameLevel);
            engine._levelAdvancing = false;
            engine.emitter.emit('gameStateUpdate', engine.gameState);
        }, 5000);
    }

    function checkGracePeriods(engine) {
        var now = Date.now();
        var GRACE_PERIOD_MS = 30000;

        for (var code in engine.gameState.players) {
            var p = engine.gameState.players[code];
            if (p.state === 'disconnected' && p.disconnectTime && (now - p.disconnectTime > GRACE_PERIOD_MS)) {
                var username = p.username || 'Player';
                delete engine.gameState.players[code];
                engine.gameState.connectedPlayers--;
                engine.emitter.emit('playerLeftGame', { code: code, username: username });
                engine._disconnectedPlayers.delete(code);
                console.log('Player ' + code + ' (' + username + ') grace period expired — removed');

                var pid = engine._codeToPlayerId[code];
                if (pid) {
                    delete engine._playerIdToCode[pid];
                    delete engine._codeToPlayerId[code];
                }

                if (engine.gameState.connectedPlayers <= 0) {
                    engine.stop();
                    if (engine.onEmpty) engine.onEmpty();
                }
            }
        }
    }

    function checkGameEnd(engine) {
        if (engine._gameEnded) return;
        var isSolo = engine.roomId && engine.roomId.startsWith('solo-');
        if (isSolo) return;

        var players = Object.values(engine.gameState.players);
        if (players.length === 0) return;

        var activePlayers = players.filter(function (p) { return p.state !== 'disconnected'; });
        if (activePlayers.length === 0) return;

        var livingPlayers = activePlayers.filter(function (p) { return p.state === 'alive'; });
        if (livingPlayers.length === 0) {
            endGame(engine, 'defeat');
        }
    }

    function endGame(engine, result) {
        engine._gameEnded = true;

        var playerStats = {};
        for (var code in engine.gameState.players) {
            var p = engine.gameState.players[code];
            playerStats[code] = {
                username: p.username || 'Player',
                level: p.level,
                xp: p.xp,
                score: p.score || 0
            };
        }

        engine.emitter.emit('gameEnded', {
            result: result,
            level: engine.gameState.gameLevel,
            monstersKilled: engine.gameState.monstersKilled || 0,
            playerStats: playerStats
        });

        console.log('Game ended: ' + result + ' (room: ' + engine.roomId + ', level: ' + engine.gameState.gameLevel + ')');

        setTimeout(function () {
            engine.stop();
            if (engine.onEmpty) engine.onEmpty();
        }, 10000);
    }

    function resetLevelData(engine, level) {
        if (!engine.levelData[level]) return;

        engine.gameState.maxSpawns = engine.levelData[level].maxMonsters;
        engine.gameState.spawnsLeft = engine.levelData[level].maxMonsters;
        engine.gameState.monstersKilled = 0;
        engine.gameState.monstersToKill = engine.levelData[level].monstersToKill || (10 + level * 5);
        engine.gameState.monsters = [];
        engine.gameState.healingPoints = [];
        engine.gameState.collectibles = [];
        engine.gameState.terrainTheme = engine.levelData[level].terrainTheme || 'stone';

        // Regenerate maze
        var mapStyle = engine.gameConfig.mapStyle || 'classic';
        var mazeResult = MapGeneratorFactory.generateMap(mapStyle, engine.constants.WORLD_WIDTH, engine.constants.WORLD_HEIGHT, engine.constants.CELL_SIZE);
        engine.walls = mazeResult.walls;
        engine.wallGrid = new WallGrid(mazeResult.grid, mazeResult.rows, mazeResult.cols, engine.constants.CELL_SIZE);
        engine.mazeGridData = {
            rows: mazeResult.rows,
            cols: mazeResult.cols,
            cellSize: engine.constants.CELL_SIZE
        };
        engine.spawnX = mazeResult.spawnX;
        engine.spawnY = mazeResult.spawnY;

        // Find safe spawn point
        var spawnCollides = engine.wallGrid.collides(engine.spawnX, engine.spawnY, engine.constants.PLAYER_WIDTH, engine.constants.PLAYER_HEIGHT);
        if (spawnCollides) {
            _findSafeSpawn(engine, level);
        }

        // Teleport all players
        for (var playerCode in engine.gameState.players) {
            var p = engine.gameState.players[playerCode];
            if (typeof dbg === 'function') dbg('ENG-RESET', 'resetLevelData teleport player ' + playerCode + ' from (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ') to (' + engine.spawnX + ',' + engine.spawnY + ')');
            p.x = engine.spawnX;
            p.y = engine.spawnY;
        }

        // Update managers with new wallGrid
        engine.monsterManager.wallGrid = engine.wallGrid;
        engine.playerManager.wallGrid = engine.wallGrid;
        engine.bulletManager.wallGrid = engine.wallGrid;
        engine.collectibleManager.wallGrid = engine.wallGrid;

        // Emit walls to all players
        var wallData = engine._getWallData();
        for (var pid in engine._sendToPlayer) {
            engine._sendToPlayer[pid]('walls', wallData);
        }

        // Spawn initial monsters (another 50% more than the previous opening density, with a higher floor)
        var initialMonsterCount = Math.max(10, Math.ceil(engine.levelData[level].maxMonsters * 0.56));
        console.log('Spawning ' + initialMonsterCount + ' initial monsters for level ' + level);
        engine.monsterManager.spawnLevelBoss();
        engine.monsterManager.spawnMonsterAtDistance(400, 700, true);
        for (var mi = 1; mi < initialMonsterCount; mi++) {
            engine.monsterManager.spawnMonster();
        }

        var initialHealingCount = engine._getHealingPointCapForLevel(level);
        for (var hi = 0; hi < initialHealingCount; hi++) {
            engine._spawnHealingPoint();
        }

        console.log('Level ' + level + ' data reset.');
    }

    function _findSafeSpawn(engine, level) {
        console.warn('[GameEngine] Level ' + level + ' spawn collides, searching for safe spot...');
        for (var attempts = 0; attempts < 100; attempts++) {
            var tryX = Math.random() * (engine.constants.WORLD_WIDTH - 200) + 100;
            var tryY = Math.random() * (engine.constants.WORLD_HEIGHT - 200) + 100;
            if (!engine.wallGrid.collides(tryX, tryY, engine.constants.PLAYER_WIDTH, engine.constants.PLAYER_HEIGHT)) {
                engine.spawnX = tryX;
                engine.spawnY = tryY;
                console.log('[GameEngine] Found safe spawn at (' + tryX.toFixed(1) + ', ' + tryY.toFixed(1) + ') after ' + (attempts + 1) + ' attempts');
                return;
            }
        }
        engine.spawnX = 100;
        engine.spawnY = 100;
        console.warn('[GameEngine] Level ' + level + ': ALL 100 random attempts failed! Fallback (100, 100)');
    }

    var GameLifecycle = {
        handleLevelCompleted: handleLevelCompleted,
        handleLevelAdvance: handleLevelAdvance,
        checkGracePeriods: checkGracePeriods,
        checkGameEnd: checkGameEnd,
        endGame: endGame,
        resetLevelData: resetLevelData
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameLifecycle;
    } else if (typeof window !== 'undefined') {
        window.GameLifecycle = GameLifecycle;
    }
})();
