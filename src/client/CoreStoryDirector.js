/**
 * CoreStoryDirector - pure story routing/build helpers for core-loop missions.
 *
 * This module intentionally avoids owning gameplay state. game.js still owns
 * pause state, engine wiring, collectibles, victory completion, and rollback.
 */
(function () {
    'use strict';

    var INTEGRATED_STORY_FLAG_KEY = 'dcgame_integratedStory';
    var INTEGRATED_STORY_LEGACY_INTRO_FLAG_KEY = 'dcgame_integratedStoryIntro';
    var FORCE_LEGACY_STORY_FLAG_KEY = 'dcgame_forceLegacyStory';

    function translateMissionText(key) {
        if (!key) return '';
        if (typeof window.t === 'function') return window.t(key);
        if (window.I18n && typeof window.I18n.t === 'function') return window.I18n.t(key);
        return key;
    }

    function isForceLegacyStoryEnabled() {
        try {
            var params = new URLSearchParams(window.location.search || '');
            if (params.get('legacyStory') === '1') return true;
        } catch (_) {
            // Ignore malformed URL state and keep the safe default.
        }

        try {
            var stored = window.localStorage.getItem(FORCE_LEGACY_STORY_FLAG_KEY);
            return stored === 'true' || stored === '1';
        } catch (_) {
            return false;
        }
    }

    function isIntegratedStoryOverrideEnabled() {
        try {
            var params = new URLSearchParams(window.location.search || '');
            if (params.get('integratedStory') === '1') return true;
            if (params.get('integratedStoryIntro') === '1') return true;
        } catch (_) {
            // Ignore malformed URL state and keep the safe default.
        }

        try {
            var stored = window.localStorage.getItem(INTEGRATED_STORY_FLAG_KEY);
            var legacyStored = window.localStorage.getItem(INTEGRATED_STORY_LEGACY_INTRO_FLAG_KEY);
            return stored === 'true' || stored === '1' || legacyStored === 'true' || legacyStored === '1';
        } catch (_) {
            return false;
        }
    }

    function isEnabled(mission) {
        if (isForceLegacyStoryEnabled()) return false;
        if (isIntegratedStoryOverrideEnabled()) return true;
        return !!mission && mission.storyIntegration === 'coreLoop';
    }

    function isDavidGoliathMission(mission) {
        return !!mission && mission.worldId === 'featured' && mission.id === 'david-01';
    }

    /**
     * Generic check: does this mission use the core-loop story integration?
     * Any mission with storyIntegration === 'coreLoop' and story phases qualifies.
     */
    function isCoreLoopStoryMission(mission) {
        if (!mission) return false;
        if (mission.storyIntegration !== 'coreLoop') return false;
        return Array.isArray(mission.storyPhases) && mission.storyPhases.length > 0;
    }

    function applyMissionOverride(mission, worldId, missionId) {
        if (!mission || typeof window === 'undefined') return mission;
        var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost || !window.__storyIntegrationMissionOverrides) return mission;
        var key = worldId + '/' + missionId;
        var override = window.__storyIntegrationMissionOverrides[key];
        if (!override) return mission;
        return Object.assign({}, mission, override);
    }

    function buildIntroPause(mission) {
        if (!mission || !Array.isArray(mission.storyPhases)) return null;

        var phase = mission.storyPhases.find(function (entry) {
            return entry && entry.id === 'intro' && entry.type === 'dialogue';
        });
        if (!phase || !Array.isArray(phase.i18nLines) || phase.i18nLines.length === 0) return null;

        var npc = Array.isArray(mission.npcs)
            ? mission.npcs.find(function (entry) { return entry && entry.id === phase.npcId; })
            : null;

        var speaker = npc && npc.nameKey
            ? translateMissionText(npc.nameKey)
            : (phase.npcId || mission.name || 'Narrator');

        return {
            type: 'dialogue',
            missionId: mission.id,
            phaseId: phase.id,
            title: mission.name || translateMissionText('story.david.title'),
            speaker: speaker,
            lines: phase.i18nLines.map(translateMissionText),
            prompt: translateMissionText('story.david.buttons.continue')
        };
    }

    function buildCollectCombatConfig(mission) {
        var combat = (mission && mission.collectCombatConfig) || {};
        var rawSpawnRate = combat.spawnRate || mission.spawnRate || 18;
        var spawnRateSeconds = rawSpawnRate > 1000 ? rawSpawnRate / 1000 : rawSpawnRate;

        return {
            balance: {
                monsterHealth: 1.0,
                monsterDamage: combat.monsterDamageFactor || mission.monsterDamageFactor || 1.0,
                monsterSpeed: 1.0,
                spawnRate: 1.0,
                maxMonsters: 1.0,
                healingFrequency: 1.0
            },
            levels: [{
                qualities: combat.qualities || mission.qualities || ['Faith'],
                monsters: combat.monsters || mission.monsters || ['Fear'],
                monstersToKill: combat.monstersToKill || mission.monstersToKill || 99,
                maxMonsters: combat.maxMonsters || mission.maxMonsters || 8,
                spawnRate: spawnRateSeconds
            }],
            quizSettings: mission.quizSettings || null,
            world: mission.world || null,
            disableLevelBoss: combat.disableLevelBoss === true,
            fixedMonsters: Array.isArray(combat.fixedMonsters) ? combat.fixedMonsters.slice() : [],
            randomSpawnsEnabled: combat.randomSpawnsEnabled !== false,
            randomSpawnBudget: typeof combat.randomSpawnBudget === 'number' ? combat.randomSpawnBudget : undefined
        };
    }

    function buildCollectibleSeed(mission) {
        if (!mission || !Array.isArray(mission.storyPhases) || !Array.isArray(mission.specialObjects)) return null;

        var collectPhase = mission.storyPhases.find(function (entry) {
            return entry && entry.type === 'combatCollect';
        });
        if (!collectPhase || !collectPhase.objectType) return null;

        var objectConfig = mission.specialObjects.find(function (entry) {
            return entry && entry.id === collectPhase.objectType;
        });
        if (!objectConfig) return null;

        var targetCount = collectPhase.targetCount || objectConfig.count || 0;
        if (!targetCount) return null;

        var area = objectConfig.spawnArea || { x: 1300, y: 1300, w: 400, h: 400 };
        var centerX = area.x + area.w / 2;
        var centerY = area.y + area.h / 2;
        var label = objectConfig.labelKey ? translateMissionText(objectConfig.labelKey) : objectConfig.id;
        var placements = Array.isArray(objectConfig.placements) ? objectConfig.placements : [];
        var stones = [];

        for (var i = 0; i < targetCount; i++) {
            var placement = placements[i] || null;
            var x;
            var y;
            if (placement && typeof placement.x === 'number' && typeof placement.y === 'number') {
                x = placement.x;
                y = placement.y;
            } else {
                var angle = (-Math.PI / 2) + (i * (Math.PI * 2 / Math.max(1, targetCount)));
                var radius = 120 + ((i % 2) * 70);
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
            }
            stones.push({
                id: mission.id + '-' + objectConfig.id + '-' + (i + 1),
                type: objectConfig.id,
                storyCollectible: true,
                storyObjectId: objectConfig.id,
                label: label,
                x: Math.round(x),
                y: Math.round(y),
                guardDemonType: placement && placement.guardDemonType ? placement.guardDemonType : null,
                width: 28,
                height: 22
            });
        }

        return {
            missionId: mission.id,
            phaseId: collectPhase.id,
            nextPhase: collectPhase.nextPhase || null,
            objectType: objectConfig.id,
            label: label,
            targetCount: targetCount,
            collected: 0,
            collectedIds: [],
            complete: false,
            collectibles: stones
        };
    }

    function buildPuzzlePause(mission) {
        if (!mission || !Array.isArray(mission.storyPhases) || !Array.isArray(mission.puzzles)) return null;

        var puzzlePhase = mission.storyPhases.find(function (entry) {
            return entry && entry.type === 'puzzle' && entry.puzzleId;
        });
        if (!puzzlePhase) return null;

        var puzzle = mission.puzzles.find(function (entry) {
            return entry && entry.id === puzzlePhase.puzzleId;
        });
        if (!puzzle) return null;

        var mode = puzzle.mode || 'cloze';
        var hasChoiceOptions = Array.isArray(puzzle.options) && puzzle.options.length > 0;

        // Verse memorization puzzle: show verse with N hidden words, player taps correct words
        if (mode === 'verseMemorize') {
            var rawVerseText = findVerseText(puzzle.verseRef) || puzzle.verseText || '';
            // If the verse is too long (>120 chars), try to find a shorter verse from the same category
            if (rawVerseText.length > 120 && puzzle.verseRef) {
                var shortVerse = findShortVerseForCategory(puzzle.verseRef);
                if (shortVerse) {
                    rawVerseText = shortVerse.Text;
                    puzzle = Object.assign({}, puzzle, { verseRef: shortVerse.Reference, verseText: shortVerse.Text });
                }
            }
            // If still too long or no text, use prompt as fallback
            if (!rawVerseText || rawVerseText.length > 150) {
                rawVerseText = puzzle.prompt || '';
            }
            if (!rawVerseText) {
                return {
                    type: 'puzzle',
                    puzzleMode: 'verseMemorize',
                    missionId: mission.id,
                    phaseId: puzzlePhase.id,
                    puzzleId: puzzle.id,
                    title: mission.name || 'Challenge',
                    speaker: 'Memory Check',
                    text: 'No verse available',
                    verseRef: puzzle.verseRef || null,
                    blanks: [],
                    blankOptions: [],
                    currentBlankIndex: 0,
                    completed: true,
                    isCorrect: true,
                    feedback: 'Verse not found — puzzle skipped',
                    nextPhase: puzzlePhase.nextPhase || null,
                    prompt: 'Continue'
                };
            }
            var wordsToHide = puzzle.wordsToHide || 3;
            var blankResult = generateMemorizationBlanks(rawVerseText, wordsToHide);
            return {
                type: 'puzzle',
                puzzleMode: 'verseMemorize',
                missionId: mission.id,
                phaseId: puzzlePhase.id,
                puzzleId: puzzle.id,
                title: mission.name || 'Challenge',
                speaker: 'Memory Check',
                text: rawVerseText,
                verseRef: puzzle.verseRef || null,
                blanks: blankResult.blanks,
                blankOptions: blankResult.options,
                currentBlankIndex: 0,
                selectedAnswer: null,
                usedWords: [],
                completed: false,
                nextPhase: puzzlePhase.nextPhase || null,
                prompt: 'Continue'
            };
        }

        // Standard puzzle modes (cloze, symbolChoice, categoryMatch, etc.)
        return {
            type: 'puzzle',
            missionId: mission.id,
            phaseId: puzzlePhase.id,
            puzzleId: puzzle.id,
            title: mission.name || translateMissionText('story.david.title'),
            speaker: 'Challenge',
            text: puzzle.i18nPrompt ? translateMissionText(puzzle.i18nPrompt) : (puzzle.prompt || ''),
            options: hasChoiceOptions ? puzzle.options.slice() : null,
            answer: puzzle.answer || null,
            mode: mode,
            verseRef: puzzle.verseRef || null,
            nextPhase: puzzlePhase.nextPhase || null,
            prompt: translateMissionText('story.david.buttons.continue')
        };
    }

    // Find verse text by reference from the loaded verse corpus
    function findVerseText(ref) {
        if (!ref) return null;
        try {
            if (typeof window !== 'undefined' && window.organizedVerses) {
                for (var cat in window.organizedVerses) {
                    if (!window.organizedVerses.hasOwnProperty(cat)) continue;
                    var verses = window.organizedVerses[cat];
                    if (!Array.isArray(verses)) continue;
                    for (var i = 0; i < verses.length; i++) {
                        if (verses[i] && verses[i].Reference === ref) return verses[i].Text || null;
                    }
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    // Find a short verse (<=120 chars) from the same category as the given reference
    function findShortVerseForCategory(ref) {
        if (!ref || typeof window === 'undefined' || !window.organizedVerses) return null;
        try {
            // First find which category the reference belongs to
            var targetCategory = null;
            for (var cat in window.organizedVerses) {
                if (!window.organizedVerses.hasOwnProperty(cat)) continue;
                var verses = window.organizedVerses[cat];
                if (!Array.isArray(verses)) continue;
                for (var i = 0; i < verses.length; i++) {
                    if (verses[i] && verses[i].Reference === ref) {
                        targetCategory = cat;
                        break;
                    }
                }
                if (targetCategory) break;
            }
            if (!targetCategory) return null;

            // Find a short verse from that category
            var candidates = window.organizedVerses[targetCategory].filter(function(v) {
                return v && v.Text && v.Text.length >= 40 && v.Text.length <= 120;
            });
            if (candidates.length === 0) return null;
            return candidates[Math.floor(Math.random() * candidates.length)];
        } catch (e) { /* ignore */ }
        return null;
    }

    // Generate blanks and word options for verse memorization
    function generateMemorizationBlanks(verseText, count) {
        if (!verseText || !verseText.length) return { blanks: [], options: [] };
        var words = verseText.split(/\s+/);
        var wordCount = words.length;
        if (wordCount < 6) return { blanks: [], options: [] };
        var hideCount = Math.min(count, Math.floor(wordCount / 4));
        if (hideCount < 1) hideCount = 1;

        // Pick words to hide — prefer words >= 4 chars, spread across the verse
        var candidates = [];
        for (var i = 0; i < wordCount; i++) {
            var clean = words[i].replace(/[^a-zA-Z']/g, '');
            if (clean.length >= 4) candidates.push(i);
        }
        if (candidates.length < hideCount) {
            // Relax to 3+ chars
            candidates = [];
            for (var j = 0; j < wordCount; j++) {
                var c = words[j].replace(/[^a-zA-Z']/g, '');
                if (c.length >= 3) candidates.push(j);
            }
        }
        if (candidates.length < hideCount) {
            return { blanks: [], options: [] };
        }

        // Shuffle and pick
        for (var k = candidates.length - 1; k > 0; k--) {
            var r = Math.floor(Math.random() * (k + 1));
            var tmp = candidates[k]; candidates[k] = candidates[r]; candidates[r] = tmp;
        }
        var hiddenIndices = candidates.slice(0, hideCount).sort(function(a, b) { return a - b; });

        var blanks = [];
        var correctWords = [];
        for (var h = 0; h < hiddenIndices.length; h++) {
            var idx = hiddenIndices[h];
            var word = words[idx];
            blanks.push({ index: idx, word: word });
            correctWords.push(word);
        }

        // Generate distractors from other words in the verse
        var distractors = [];
        for (var d = 0; d < wordCount; d++) {
            if (hiddenIndices.indexOf(d) >= 0) continue;
            var dw = words[d].replace(/[^a-zA-Z']/g, '');
            if (dw.length >= 3 && correctWords.indexOf(words[d]) < 0 && distractors.indexOf(words[d]) < 0) {
                distractors.push(words[d]);
            }
        }
        // Shuffle distractors
        for (var m = distractors.length - 1; m > 0; m--) {
            var r2 = Math.floor(Math.random() * (m + 1));
            var tmp2 = distractors[m]; distractors[m] = distractors[r2]; distractors[r2] = tmp2;
        }
        var numDistractors = Math.min(distractors.length, hideCount);
        var allOptions = correctWords.concat(distractors.slice(0, numDistractors));
        // Shuffle final options
        for (var n = allOptions.length - 1; n > 0; n--) {
            var r3 = Math.floor(Math.random() * (n + 1));
            var tmp3 = allOptions[n]; allOptions[n] = allOptions[r3]; allOptions[r3] = tmp3;
        }

        return { blanks: blanks, options: allOptions };
    }

    function buildVictoryPause(mission) {
        if (!mission || !Array.isArray(mission.storyPhases)) return null;

        var phase = mission.storyPhases.find(function (entry) {
            return entry && entry.id === 'victory' && entry.type === 'dialogue';
        });
        if (!phase || !Array.isArray(phase.i18nLines) || phase.i18nLines.length === 0) return null;

        var npc = Array.isArray(mission.npcs)
            ? mission.npcs.find(function (entry) { return entry && entry.id === phase.npcId; })
            : null;
        var speaker = npc && npc.nameKey
            ? translateMissionText(npc.nameKey)
            : (mission.name || 'Victory');

        return {
            type: 'dialogue',
            missionId: mission.id,
            phaseId: phase.id,
            title: mission.name || translateMissionText('story.david.title'),
            speaker: speaker,
            lines: phase.i18nLines.map(translateMissionText),
            prompt: translateMissionText('story.david.buttons.continue'),
            nextPhase: null,
            endMission: phase.endMission === true
        };
    }

    // -----------------------------------------------------------------
    // Quest Step Framework
    // -----------------------------------------------------------------

    /**
     * Check if a mission uses the quest step framework.
     */
    function hasQuestSteps(mission) {
        return !!mission && Array.isArray(mission.questSteps) && mission.questSteps.length > 0;
    }

    /**
     * Evaluate whether a quest step is unlocked given the current state.
     * state = { completedSteps: {}, learnedSkills: {}, collectedObjects: {} }
     */
    function isStepUnlocked(step, state) {
        if (!step || !step.id) return false;
        state = state || {};
        var completedSteps = state.completedSteps || {};
        var learnedSkills = state.learnedSkills || {};
        var collectedObjects = state.collectedObjects || {};

        if (completedSteps[step.id]) return false;

        var prereqs = step.prerequisites || [];
        for (var i = 0; i < prereqs.length; i++) {
            if (!completedSteps[prereqs[i]]) return false;
        }

        if (step.requiredSkill && !learnedSkills[step.requiredSkill]) {
            return false;
        }

        if (Array.isArray(step.requiredItems)) {
            for (var j = 0; j < step.requiredItems.length; j++) {
                if ((collectedObjects[step.requiredItems[j]] || 0) < 1) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get the list of unlocked step ids given the current state.
     */
    function getUnlockedSteps(mission, state) {
        if (!hasQuestSteps(mission)) return [];
        var result = [];
        var steps = mission.questSteps;
        for (var i = 0; i < steps.length; i++) {
            if (isStepUnlocked(steps[i], state)) {
                result.push(steps[i].id);
            }
        }
        return result;
    }

    /**
     * Check if all required quest steps are complete (boss is available).
     */
    function areAllRequiredStepsComplete(mission, state) {
        if (!hasQuestSteps(mission)) return true;
        var steps = mission.questSteps;
        state = state || {};
        var completedSteps = state.completedSteps || {};
        var hasRequired = false;
        for (var i = 0; i < steps.length; i++) {
            if (steps[i].required) {
                hasRequired = true;
                if (!completedSteps[steps[i].id]) return false;
            }
        }
        if (!hasRequired) {
            for (var j = 0; j < steps.length; j++) {
                if (!completedSteps[steps[j].id] && steps[j].type !== 'bossArena') return false;
            }
        }
        return true;
    }

    /**
     * Get a step spec by id.
     */
    function getStepById(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        for (var i = 0; i < mission.questSteps.length; i++) {
            if (mission.questSteps[i].id === stepId) return mission.questSteps[i];
        }
        return null;
    }

    /**
     * Build a quest hub pause — a choice screen showing all quest steps
     * with their status (completed, unlocked, locked).
     * Returns a pause object for enterStoryPause().
     */
    function buildQuestHubPause(mission, state) {
        if (!hasQuestSteps(mission)) return null;
        var steps = mission.questSteps;
        state = state || {};
        var completedSteps = state.completedSteps || {};
        var learnedSkills = state.learnedSkills || {};
        var collectedObjects = state.collectedObjects || {};

        var stepCards = [];
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            var unlocked = isStepUnlocked(step, state);
            var complete = !!completedSteps[step.id];

            var lockedReason = '';
            if (!unlocked && !complete) {
                var prereqs = step.prerequisites || [];
                for (var p = 0; p < prereqs.length; p++) {
                    if (!completedSteps[prereqs[p]]) {
                        lockedReason = 'Requires: ' + prereqs[p];
                        break;
                    }
                }
                if (!lockedReason && step.requiredSkill && !learnedSkills[step.requiredSkill]) {
                    lockedReason = 'Requires skill: ' + step.requiredSkill;
                }
                if (!lockedReason && Array.isArray(step.requiredItems)) {
                    for (var ri = 0; ri < step.requiredItems.length; ri++) {
                        if ((collectedObjects[step.requiredItems[ri]] || 0) < 1) {
                            lockedReason = 'Requires item: ' + step.requiredItems[ri];
                            break;
                        }
                    }
                }
            }

            var label = step.label || step.id;
            var isBossStep = step.type === 'bossArena';
            if (isBossStep && step.boss) label = step.boss.label || label;

            var typeText = '';
            if (step.type === 'learn' || step.npc) typeText = 'Learn';
            else if (step.type === 'supplyCache') typeText = 'Collect';
            else if (step.type === 'combatArena') typeText = 'Fight';
            else if (step.type === 'bossArena') typeText = 'Boss';
            else if (step.type === 'ruinPuzzle') typeText = 'Solve';

            stepCards.push({
                stepId: step.id,
                label: label,
                typeText: typeText,
                isBoss: isBossStep,
                unlocked: unlocked,
                complete: complete,
                lockedReason: lockedReason
            });
        }

        var allRequiredDone = areAllRequiredStepsComplete(mission, state);
        var hasBossStep = steps.some(function (s) { return s.type === 'bossArena'; });
        var showBossButton = allRequiredDone && !hasBossStep;

        return {
            type: 'questHub',
            missionId: mission.id,
            phaseId: 'questHub',
            title: mission.name || 'Quest',
            stepCards: stepCards,
            showBossButton: showBossButton,
            allRequiredDone: allRequiredDone,
            completedCount: Object.keys(completedSteps).length,
            totalSteps: steps.length
        };
    }

    /**
     * Build a dialogue pause for a "learn" quest step (NPC teaches a skill).
     */
    function buildLearnDialoguePause(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        var step = getStepById(mission, stepId);
        if (!step || !step.npc) return null;

        var npc = step.npc;
        var speaker = npc.npcName || npc.npcId || 'NPC';
        var lines = Array.isArray(npc.lines) ? npc.lines : [];

        return {
            type: 'dialogue',
            missionId: mission.id,
            phaseId: 'step-' + stepId,
            stepId: stepId,
            grantsSkill: step.grantsSkill || null,
            title: mission.name || 'Story',
            speaker: speaker,
            lines: lines.map(translateMissionText),
            nextPhase: 'questHub',
            prompt: 'Continue'
        };
    }

    /**
     * Build a collectible seed for a specific quest step (supplyCache type).
     */
    function buildStepCollectibleSeed(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        var step = getStepById(mission, stepId);
        if (!step || !step.collectible) return null;

        var objConfig = step.collectible;
        var targetCount = objConfig.count || 1;

        // Find placement from specialObjects array
        var placement = null;
        if (Array.isArray(mission.specialObjects)) {
            var obj = mission.specialObjects.find(function (o) { return o.id === objConfig.id; });
            if (obj && Array.isArray(obj.placements) && obj.placements.length > 0) {
                placement = obj.placements[0];
            }
        }

        var x = placement ? placement.x : 1500;
        var y = placement ? placement.y : 1500;
        var label = objConfig.label ? translateMissionText(objConfig.label) : objConfig.id;

        var stones = [];
        for (var i = 0; i < targetCount; i++) {
            stones.push({
                id: mission.id + '-' + objConfig.id + '-' + (i + 1),
                type: objConfig.id,
                storyCollectible: true,
                storyObjectId: objConfig.id,
                label: label,
                x: Math.round(x + (i * 80 - targetCount * 40)),
                y: Math.round(y),
                guardDemonType: step.guard ? step.guard.demonType : null,
                width: 28,
                height: 22
            });
        }

        return {
            missionId: mission.id,
            phaseId: 'step-' + stepId,
            stepId: stepId,
            nextPhase: 'questHub',
            objectType: objConfig.id,
            label: label,
            targetCount: targetCount,
            collected: 0,
            collectedIds: [],
            complete: false,
            collectibles: stones
        };
    }

    /**
     * Build combat config for a combatArena quest step.
     */
    function buildStepCombatConfig(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        var step = getStepById(mission, stepId);
        if (!step) return null;

        // For combatArena steps, use the collectCombatConfig from the mission
        var combat = (mission.collectCombatConfig) || {};
        var rawSpawnRate = combat.spawnRate || mission.spawnRate || 18;
        var spawnRateSeconds = rawSpawnRate > 1000 ? rawSpawnRate / 1000 : rawSpawnRate;

        return {
            balance: {
                monsterHealth: 1.0,
                monsterDamage: combat.monsterDamageFactor || mission.monsterDamageFactor || 1.0,
                monsterSpeed: 1.0,
                spawnRate: 1.0,
                maxMonsters: 1.0,
                healingFrequency: 1.0
            },
            levels: [{
                qualities: combat.qualities || mission.qualities || ['Faith'],
                monsters: combat.monsters || mission.monsters || ['Fear'],
                monstersToKill: combat.monstersToKill || 99,
                maxMonsters: combat.maxMonsters || 8,
                spawnRate: spawnRateSeconds
            }],
            quizSettings: mission.quizSettings || null,
            world: mission.world || null,
            disableLevelBoss: true,
            fixedMonsters: Array.isArray(combat.fixedMonsters) ? combat.fixedMonsters.slice() : [],
            randomSpawnsEnabled: combat.randomSpawnsEnabled !== false,
            randomSpawnBudget: typeof combat.randomSpawnBudget === 'number' ? combat.randomSpawnBudget : undefined
        };
    }

    /**
     * Build a puzzle pause for a ruinPuzzle quest step.
     */
    function buildStepPuzzlePause(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        var step = getStepById(mission, stepId);
        if (!step || !step.puzzle) return null;

        // Delegate to the existing buildPuzzlePause logic, but set the stepId
        var puzzle = step.puzzle;
        var mode = puzzle.mode || 'cloze';
        var hasChoiceOptions = Array.isArray(puzzle.options) && puzzle.options.length > 0;

        if (mode === 'verseMemorize') {
            var rawVerseText = findVerseText(puzzle.verseRef) || puzzle.verseText || '';
            if (rawVerseText.length > 120 && puzzle.verseRef) {
                var shortVerse = findShortVerseForCategory(puzzle.verseRef);
                if (shortVerse) {
                    rawVerseText = shortVerse.Text;
                    puzzle = Object.assign({}, puzzle, { verseRef: shortVerse.Reference, verseText: shortVerse.Text });
                }
            }
            if (!rawVerseText || rawVerseText.length > 150) {
                rawVerseText = puzzle.prompt || '';
            }
            if (!rawVerseText) {
                return {
                    type: 'puzzle',
                    puzzleMode: 'verseMemorize',
                    missionId: mission.id,
                    phaseId: 'step-' + stepId,
                    stepId: stepId,
                    puzzleId: puzzle.id,
                    title: mission.name || 'Challenge',
                    speaker: 'Memory Check',
                    text: 'No verse available',
                    verseRef: puzzle.verseRef || null,
                    blanks: [],
                    blankOptions: [],
                    currentBlankIndex: 0,
                    completed: true,
                    isCorrect: true,
                    feedback: 'Verse not found — puzzle skipped',
                    nextPhase: 'questHub',
                    prompt: 'Continue'
                };
            }
            var wordsToHide = puzzle.wordsToHide || 3;
            var blankResult = generateMemorizationBlanks(rawVerseText, wordsToHide);
            return {
                type: 'puzzle',
                puzzleMode: 'verseMemorize',
                missionId: mission.id,
                phaseId: 'step-' + stepId,
                stepId: stepId,
                puzzleId: puzzle.id,
                title: mission.name || 'Challenge',
                speaker: 'Memory Check',
                text: rawVerseText,
                verseRef: puzzle.verseRef || null,
                blanks: blankResult.blanks,
                blankOptions: blankResult.options,
                currentBlankIndex: 0,
                selectedAnswer: null,
                usedWords: [],
                completed: false,
                nextPhase: 'questHub',
                prompt: 'Continue'
            };
        }

        return {
            type: 'puzzle',
            missionId: mission.id,
            phaseId: 'step-' + stepId,
            stepId: stepId,
            puzzleId: puzzle.id,
            title: mission.name || translateMissionText('story.david.title'),
            speaker: 'Challenge',
            text: puzzle.i18nPrompt ? translateMissionText(puzzle.i18nPrompt) : (puzzle.prompt || ''),
            options: hasChoiceOptions ? puzzle.options.slice() : null,
            answer: puzzle.answer || null,
            mode: mode,
            verseRef: puzzle.verseRef || null,
            nextPhase: 'questHub',
            prompt: translateMissionText('story.david.buttons.continue')
        };
    }

    /**
     * Build a boss combat config from a bossArena quest step.
     */
    function buildStepBossConfig(mission, stepId) {
        if (!hasQuestSteps(mission)) return null;
        var step = getStepById(mission, stepId);
        if (!step) return null;

        var boss = step.boss || mission.boss;
        if (!boss) return null;

        var combat = mission.combatConfig || {};
        return {
            monsters: combat.monsters || [boss.demonType],
            monstersToKill: combat.monstersToKill || 1,
            maxMonsters: combat.maxMonsters || 6,
            spawnRate: combat.spawnRate || 999,
            fixedMonsters: Array.isArray(combat.fixedMonsters) ? combat.fixedMonsters.slice() : [],
            disableLevelBoss: true,
            randomSpawnsEnabled: false
        };
    }

    window.CoreStoryDirector = {
        applyMissionOverride: applyMissionOverride,
        buildCollectCombatConfig: buildCollectCombatConfig,
        buildCollectibleSeed: buildCollectibleSeed,
        buildIntroPause: buildIntroPause,
        buildPuzzlePause: buildPuzzlePause,
        buildVictoryPause: buildVictoryPause,
        isDavidGoliathMission: isDavidGoliathMission,
        isCoreLoopStoryMission: isCoreLoopStoryMission,
        isEnabled: isEnabled,
        isForceLegacyStoryEnabled: isForceLegacyStoryEnabled,
        isIntegratedStoryOverrideEnabled: isIntegratedStoryOverrideEnabled,
        // Quest step framework
        hasQuestSteps: hasQuestSteps,
        isStepUnlocked: isStepUnlocked,
        getUnlockedSteps: getUnlockedSteps,
        areAllRequiredStepsComplete: areAllRequiredStepsComplete,
        getStepById: getStepById,
        buildQuestHubPause: buildQuestHubPause,
        buildLearnDialoguePause: buildLearnDialoguePause,
        buildStepCollectibleSeed: buildStepCollectibleSeed,
        buildStepCombatConfig: buildStepCombatConfig,
        buildStepPuzzlePause: buildStepPuzzlePause,
        buildStepBossConfig: buildStepBossConfig
    };
})();
