(function () {
    'use strict';

    /**
     * StoryState - Tracks phase, dialogue index, collected objects, and puzzle state
     * for a story-driven mission.
     */
    class StoryState {
        constructor(storyConfig) {
            this.phases = (storyConfig && Array.isArray(storyConfig.storyPhases)) ? storyConfig.storyPhases : [];
            this.npcs = (storyConfig && Array.isArray(storyConfig.npcs)) ? storyConfig.npcs : [];
            this.specialObjects = (storyConfig && Array.isArray(storyConfig.specialObjects)) ? storyConfig.specialObjects : [];
            this.puzzles = (storyConfig && Array.isArray(storyConfig.puzzles)) ? storyConfig.puzzles : [];

            this.currentPhaseId = null;
            this.dialogueIndex = 0;
            this.collectedObjects = {};
            this.puzzleSolved = false;
            this.combatResult = null;
            this.ended = false;

            var i;
            for (i = 0; i < this.specialObjects.length; i++) {
                this.collectedObjects[this.specialObjects[i].id] = 0;
            }
        }

        setPhase(phaseId) {
            this.currentPhaseId = phaseId;
            this.dialogueIndex = 0;
            this.puzzleSolved = false;
        }

        getPhase() {
            var self = this;
            return this.phases.find(function (p) { return p.id === self.currentPhaseId; }) || null;
        }

        getPhaseById(phaseId) {
            var self = this;
            return this.phases.find(function (p) { return p.id === phaseId; }) || null;
        }

        advanceDialogue() {
            this.dialogueIndex++;
        }

        getCurrentLine() {
            var phase = this.getPhase();
            if (!phase || !Array.isArray(phase.i18nLines)) return null;
            if (this.dialogueIndex >= phase.i18nLines.length) return null;
            return phase.i18nLines[this.dialogueIndex];
        }

        isDialogueComplete() {
            var phase = this.getPhase();
            if (!phase || !Array.isArray(phase.i18nLines)) return true;
            return this.dialogueIndex >= phase.i18nLines.length;
        }

        collectObject(objectId) {
            if (!this.collectedObjects.hasOwnProperty(objectId)) {
                this.collectedObjects[objectId] = 0;
            }
            this.collectedObjects[objectId]++;
        }

        getCollectedCount(objectId) {
            return this.collectedObjects[objectId] || 0;
        }

        isCollectComplete(phase) {
            if (!phase || phase.type !== 'collect') return true;
            var targetCount = phase.targetCount || 0;
            return this.getCollectedCount(phase.objectType) >= targetCount;
        }

        markPuzzleSolved() {
            this.puzzleSolved = true;
        }

        setCombatResult(result) {
            this.combatResult = result;
        }

        snapshot() {
            return {
                currentPhaseId: this.currentPhaseId,
                dialogueIndex: this.dialogueIndex,
                collectedObjects: Object.assign({}, this.collectedObjects),
                puzzleSolved: this.puzzleSolved,
                combatResult: this.combatResult,
                ended: this.ended
            };
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StoryState;
    } else if (typeof window !== 'undefined') {
        window.StoryState = StoryState;
    }
})();