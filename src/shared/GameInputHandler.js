(function () {
    var Constants;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
    }

    /**
     * Handles player input events for the GameEngine.
     * Each handler receives the engine instance and operates on its state.
     *
     * @param {GameEngine} engine
     * @param {string} playerId - External player identifier
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    function handlePlayerInput(engine, playerId, event, data) {
        var playerCode = engine._playerIdToCode[playerId];
        if (!playerCode && event !== 'leaveGame') return;

        var player = engine.gameState.players[playerCode];

        switch (event) {
            case 'playerPosition':
                if (player && typeof data.x === 'number' && typeof data.y === 'number') {
                    player.x = data.x;
                    player.y = data.y;
                }
                break;

            case 'playerShoot':
                if (player && player.state === 'alive' && player.ammo >= 1) {
                    player.ammo -= 1;
                    engine.bulletManager.addBullet(playerCode, player, data);
                }
                break;

            case 'quizCorrect':
                if (player) {
                    player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
                }
                break;

            case 'collectHealingPoint':
                _handleCollectHealingPoint(engine, player, data);
                break;

            case 'collectCollectible':
                if (!player || player.state !== 'alive') break;
                var removed = engine.collectibleManager.removeCollectible(data);
                if (removed) {
                    engine.emitter.emit('gameStateUpdate', engine.gameState);
                }
                break;

            case 'activateItem':
                _handleActivateItem(engine, player, playerCode, data);
                break;

            case 'consumeItem':
                console.log('Player ' + playerCode + ' consumed ' + data);
                break;

            case 'playerHit':
                _handlePlayerHit(engine, player, playerCode, data);
                break;

            case 'votdBonusEarned':
                if (player) {
                    player.votdDamageBonus = true;
                    console.log('Player ' + playerCode + ' earned VOTD damage bonus');
                }
                break;

            case 'verseTestPassed':
                if (player && player.state === 'alive') {
                    player.health = Math.min(player.health + Constants.VERSE_TEST_HEALTH_REWARD, player.maxHealth);
                }
                break;

            case 'funModeBonus':
                if (player && data && data.bonusHealth) {
                    player.health = Math.min(player.health + data.bonusHealth, player.maxHealth);
                    console.log('Player ' + playerCode + ' received fun mode bonus health: ' + data.bonusHealth);
                }
                if (player && data && data.bonusAmmo) {
                    player.ammo = (player.ammo || 0) + data.bonusAmmo;
                    console.log('Player ' + playerCode + ' received fun mode bonus ammo: ' + data.bonusAmmo);
                }
                engine.emitter.emit('gameStateUpdate', engine.gameState);
                break;

            case 'playerAttack':
                if (player) {
                    var attackProxy = { playerCode: playerCode };
                    engine.playerManager.handleAttack(attackProxy, data);
                }
                break;

            case 'levelCompleted':
                engine._handleLevelCompleted();
                break;

            case 'leaveGame':
                if (player) {
                    engine.emitter.emit('playerLeftGame', { code: playerCode, username: player.username || 'Player' });
                }
                engine.removePlayer(playerId);
                break;
        }
    }

    function _handleCollectHealingPoint(engine, player, hpId) {
        var hpIndex = engine.gameState.healingPoints.findIndex(function (hp) { return hp.id === hpId; });
        if (hpIndex !== -1 && player && player.state === 'alive') {
            player.health = Math.min(player.health + 25, player.maxHealth);
            engine.gameState.healingPoints.splice(hpIndex, 1);
            engine.emitter.emit('gameStateUpdate', engine.gameState);
        }
    }

    function _handleActivateItem(engine, player, playerCode, itemType) {
        if (!player) return;
        if (!player.activeBuffs) player.activeBuffs = {};
        var durations = {
            sword: Constants.SWORD_DURATION,
            shield: Constants.SHIELD_DURATION,
            breastplate: Constants.BREASTPLATE_DURATION,
            sandals: Constants.SANDALS_DURATION
        };
        var duration = durations[itemType];
        if (!duration) return;
        player.activeBuffs[itemType] = {
            active: true,
            endTime: Date.now() + duration
        };
        console.log('Player ' + playerCode + ' activated ' + itemType + ' for ' + duration + 'ms');
        setTimeout(function () {
            if (player.activeBuffs && player.activeBuffs[itemType]) {
                player.activeBuffs[itemType].active = false;
                console.log('Player ' + playerCode + ' ' + itemType + ' buff expired');
            }
        }, duration);
    }

    function _handlePlayerHit(engine, player, playerCode, damage) {
        if (!player) return;
        if (player.state !== 'alive') return;
        player.health -= damage;
        if (player.health < 0) player.health = 0;
        
        // Only set ghost state for multiplayer games
        // Solo games should show game over instead
        var isSoloGame = engine.roomId && engine.roomId.startsWith('solo-');
        
        if (player.health <= 0 && player.state === 'alive') {
            if (isSoloGame) {
                // Solo game: emit playerDied for client to show game over, but don't set ghost
                engine.emitter.emit('playerDied', {
                    playerCode: playerCode,
                    username: player.username || 'Player'
                });
                console.log('Player ' + playerCode + ' (' + (player.username || 'Player') + ') died in solo game');
            } else {
                // Multiplayer: player becomes ghost and can watch others
                player.state = 'ghost';
                player.canAttack = false;
                engine.emitter.emit('playerDied', {
                    playerCode: playerCode,
                    username: player.username || 'Player'
                });
                console.log('Player ' + playerCode + ' (' + (player.username || 'Player') + ') died — now a ghost');
            }
        }
        engine.emitter.emit('gameStateUpdate', engine.gameState);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = handlePlayerInput;
    } else if (typeof window !== 'undefined') {
        window.GameInputHandler = handlePlayerInput;
    }
})();
