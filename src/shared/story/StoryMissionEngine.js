(function () {
    'use strict';

    var StoryState, GameEngine, GameConfig, MissionClient;

    if (typeof module !== 'undefined' && module.exports) {
        StoryState = require('./StoryState');
        GameEngine = require('../GameEngine');
        GameConfig = require('../GameConfig');
        var mc = require('../MissionClient');
        MissionClient = mc.missionClient;
    } else if (typeof window !== 'undefined') {
        StoryState = window.StoryState;
        GameEngine = window.GameEngine;
        GameConfig = window.GameConfig;
        MissionClient = window.missionClient;
    }

    /**
     * StoryMissionEngine - Orchestrates a story-driven mission.
     *
     * Owns a GameEngine instance for combat phases and a StoryState for
     * dialogue/collectible/puzzle phases. Emits events via the provided emitter.
     *
     * @param {Object} emitter - Event emitter with .emit(event, data)
     * @param {Object} storyConfig - Mission JSON (with storyPhases, npcs, etc.)
     * @param {string} roomId - Optional room identifier
     */
    class StoryMissionEngine {
        constructor(emitter, storyConfig, roomId) {
            this.emitter = emitter;
            this.storyConfig = storyConfig || {};
            this.roomId = roomId || null;
            this.storyState = new StoryState(storyConfig);

            this.combatEngine = null;
            this._gameEndedHandler = null;
            this._stonePositions = [];
            this._collectedStoneIndices = {};
        }

        start() {
            var firstPhase = this.storyState.phases.length > 0 ? this.storyState.phases[0].id : null;
            if (firstPhase) {
                this._enterPhase(firstPhase);
            }
        }

        stop() {
            if (this.combatEngine) {
                this.combatEngine.stop();
                this.combatEngine = null;
            }
        }

        handleInput(playerId, event, data) {
            if (this.combatEngine && (this._isCombatPhase() || this._isCombatCollectPhase())) {
                if (event === 'playerPosition' || event === 'playerShoot' || event === 'playerHit' ||
                    event === 'quizCorrect' || event === 'setCombatCategory') {
                    this.combatEngine.handlePlayerInput(playerId, event, data);
                    return;
                }
            }

            this._handleStoryInput(playerId, event, data);
        }

        getGameState() {
            if (this.combatEngine && (this._isCombatPhase() || this._isCombatCollectPhase())) {
                return this.combatEngine.gameState;
            }
            return null;
        }

        getSnapshot() {
            var snap = this.storyState.snapshot();
            if (this.combatEngine && (this._isCombatPhase() || this._isCombatCollectPhase())) {
                snap.combatState = this.combatEngine.gameState;
                snap.stonePositions = this._stonePositions;
                snap.collectedStoneIndices = this._collectedStoneIndices;
            }
            return snap;
        }

        _isCombatPhase() {
            var phase = this.storyState.getPhase();
            return phase && phase.type === 'combat';
        }

        _isCombatCollectPhase() {
            var phase = this.storyState.getPhase();
            return phase && phase.type === 'combatCollect';
        }

        _enterPhase(phaseId) {
            var phase = this.storyState.getPhaseById(phaseId);
            if (!phase) {
                console.warn('StoryMissionEngine: unknown phase ' + phaseId);
                return;
            }

            this.storyState.setPhase(phaseId);
            console.log('StoryMissionEngine: entering phase ' + phaseId + ' (type: ' + phase.type + ')');

            if (this.combatEngine) {
                this.combatEngine.stop();
                this.combatEngine = null;
            }

            this._collectedStoneIndices = {};
            this._stonePositions = [];

            if (phase.type === 'combat') {
                this._startCombat(phase);
            } else if (phase.type === 'combatCollect') {
                this._startCombatCollect(phase);
            }

            this.emitter.emit('storyPhase', this.getSnapshot());
        }

        _startCombat(phase) {
            var combatConfig = this._buildCombatConfig(this.storyConfig.combatConfig);
            if (!combatConfig) {
                console.error('StoryMissionEngine: no combatConfig available');
                return;
            }

            var self = this;
            this.combatEngine = new GameEngine(this.emitter, combatConfig, this.roomId);
            this._addPlayerToCombat();

            this._gameEndedHandler = function (data) {
                self.storyState.setCombatResult(data && data.result);
                self.emitter.removeListener('gameEnded', self._gameEndedHandler);
                self._gameEndedHandler = null;

                if (data && data.result === 'victory') {
                    self._advancePhase();
                } else {
                    self.emitter.emit('storyPhase', self.getSnapshot());
                }
            };

            this.emitter.on('gameEnded', this._gameEndedHandler);
            this.combatEngine.start();
        }

        _startCombatCollect(phase) {
            var collectConfig = this._buildCombatConfig(this.storyConfig.collectCombatConfig);
            if (!collectConfig) {
                console.error('StoryMissionEngine: no collectCombatConfig available');
                return;
            }

            // Don't end the game on monstersToKill — we end when stones are collected
            this.combatEngine = new GameEngine(this.emitter, collectConfig, this.roomId);
            this._addPlayerToCombat();

            // Generate stone positions in world space
            var objConfig = null;
            for (var i = 0; i < (this.storyConfig.specialObjects || []).length; i++) {
                if (this.storyConfig.specialObjects[i].id === phase.objectType) {
                    objConfig = this.storyConfig.specialObjects[i];
                    break;
                }
            }

            if (objConfig) {
                var area = objConfig.spawnArea || { x: 800, y: 800, w: 1400, h: 1400 };
                var count = phase.targetCount || objConfig.count || 5;
                for (var s = 0; s < count; s++) {
                    var seed = s * 7919 + 31;
                    var rx = ((seed * 2654435761) % 1000) / 1000;
                    var ry = ((seed * 40503) % 1000) / 1000;
                    this._stonePositions.push({
                        x: area.x + Math.floor(rx * area.w),
                        y: area.y + Math.floor(ry * area.h),
                        id: s
                    });
                }
            }

            this.combatEngine.start();
        }

        _addPlayerToCombat() {
            if (!this.combatEngine) return;
            var playerId = 'story-player';
            this.combatEngine.registerPlayerSend(playerId, function () {});
            this.combatEngine.addPlayer(playerId, 'David');
        }

        _buildCombatConfig(combat) {
            if (!combat) return null;

            var balance = {
                monsterHealth: 1.0,
                monsterDamage: combat.monsterDamageFactor || 1.0,
                monsterSpeed: 1.0,
                spawnRate: 1.0,
                maxMonsters: 1.0,
                healingFrequency: 1.0
            };

            var levelOverrides = [{
                qualities: combat.qualities || this.storyConfig.qualities || ['Faith'],
                monsters: combat.monsters || ['Fear'],
                monstersToKill: combat.monstersToKill || 1,
                maxMonsters: combat.maxMonsters || 10,
                spawnRate: combat.spawnRate || 18
            }];

            var extraOptions = {
                disableLevelBoss: combat.disableLevelBoss === true,
                fixedMonsters: Array.isArray(combat.fixedMonsters) ? combat.fixedMonsters : [],
                randomSpawnsEnabled: combat.randomSpawnsEnabled !== false,
                randomSpawnBudget: typeof combat.randomSpawnBudget === 'number' ? combat.randomSpawnBudget : 0
            };

            var config = GameConfig.createFromCustomBalance(balance, null, levelOverrides, extraOptions);
            config.mapStyle = this.storyConfig.mapStyle || 'open';

            return config;
        }

        _handleStoryInput(playerId, event, data) {
            if (event === 'advanceDialogue' || event === 'click') {
                this._onAdvanceInput();
            } else if (event === 'collectObject') {
                var objectId = data && data.objectId;
                var stoneId = data && data.stoneId;
                if (objectId) {
                    this.storyState.collectObject(objectId);
                    if (stoneId !== undefined) {
                        this._collectedStoneIndices[stoneId] = true;
                    }
                    this.emitter.emit('objectCollected', { objectId: objectId, count: this.storyState.getCollectedCount(objectId) });

                    var phase = this.storyState.getPhase();
                    if (phase && (phase.type === 'collect' || phase.type === 'combatCollect') && this.storyState.isCollectComplete(phase)) {
                        this._advancePhase();
                    } else {
                        this.emitter.emit('storyPhase', this.getSnapshot());
                    }
                }
            } else if (event === 'puzzleSolved') {
                this.storyState.markPuzzleSolved();
                this._advancePhase();
            } else if (event === 'endMission') {
                this.storyState.ended = true;
                this.emitter.emit('storyEnded', { result: 'victory' });
            }
        }

        _onAdvanceInput() {
            var phase = this.storyState.getPhase();
            if (!phase) return;

            if (phase.type === 'dialogue') {
                if (!this.storyState.isDialogueComplete()) {
                    this.storyState.advanceDialogue();
                    this.emitter.emit('storyPhase', this.getSnapshot());
                }
                if (this.storyState.isDialogueComplete() && phase.endMission) {
                    this.storyState.ended = true;
                    this.emitter.emit('storyEnded', { result: 'victory' });
                    return;
                }
                if (this.storyState.isDialogueComplete()) {
                    this._advancePhase();
                }
            } else if (phase.type === 'collect') {
                this._advancePhase();
            } else if (phase.type === 'puzzle') {
                this._advancePhase();
            }
        }

        _advancePhase() {
            var phase = this.storyState.getPhase();
            if (!phase || !phase.nextPhase) {
                this.storyState.ended = true;
                this.emitter.emit('storyEnded', { result: 'victory' });
                return;
            }
            this._enterPhase(phase.nextPhase);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StoryMissionEngine;
    } else if (typeof window !== 'undefined') {
        window.StoryMissionEngine = StoryMissionEngine;
    }
})();