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
            if (this.combatEngine && this._isCombatPhase()) {
                this.combatEngine.handlePlayerInput(playerId, event, data);
                return;
            }

            this._handleStoryInput(playerId, event, data);
        }

        getGameState() {
            if (this.combatEngine && this._isCombatPhase()) {
                return this.combatEngine.gameState;
            }
            return null;
        }

        getSnapshot() {
            return this.storyState.snapshot();
        }

        _isCombatPhase() {
            var phase = this.storyState.getPhase();
            return phase && phase.type === 'combat';
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

            if (phase.type === 'combat') {
                this._startCombat(phase);
            }

            this.emitter.emit('storyPhase', this.storyState.snapshot());
        }

        _startCombat(phase) {
            var combatConfig = this._buildCombatConfig();
            if (!combatConfig) {
                console.error('StoryMissionEngine: no combatConfig available');
                return;
            }

            var self = this;
            this.combatEngine = new GameEngine(this.emitter, combatConfig, this.roomId);

            this._gameEndedHandler = function (data) {
                self.storyState.setCombatResult(data && data.result);
                self.emitter.removeListener('gameEnded', self._gameEndedHandler);
                self._gameEndedHandler = null;

                if (data && data.result === 'victory') {
                    self._advancePhase();
                } else {
                    self.emitter.emit('storyPhase', self.storyState.snapshot());
                }
            };

            this.emitter.on('gameEnded', this._gameEndedHandler);
            this.combatEngine.start();
        }

        _buildCombatConfig() {
            var combat = this.storyConfig.combatConfig;
            if (!combat) return null;

            // Build a GameConfig using createFromCustomBalance, then overlay
            // combat-specific level data and fixed monsters.
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
                if (objectId) {
                    this.storyState.collectObject(objectId);
                    this.emitter.emit('objectCollected', { objectId: objectId, count: this.storyState.getCollectedCount(objectId) });

                    var phase = this.storyState.getPhase();
                    if (phase && phase.type === 'collect' && this.storyState.isCollectComplete(phase)) {
                        this._advancePhase();
                    } else {
                        this.emitter.emit('storyPhase', this.storyState.snapshot());
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
                    this.emitter.emit('storyPhase', this.storyState.snapshot());
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