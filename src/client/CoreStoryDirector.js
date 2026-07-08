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
            : (phase.npcId || translateMissionText('story.david.title'));

        return {
            type: 'dialogue',
            missionId: mission.id,
            phaseId: phase.id,
            title: translateMissionText('story.david.title'),
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
        if (!puzzle || !Array.isArray(puzzle.options) || !puzzle.answer) return null;

        return {
            type: 'puzzle',
            missionId: mission.id,
            phaseId: puzzlePhase.id,
            puzzleId: puzzle.id,
            title: translateMissionText('story.david.title'),
            speaker: 'Courage Test',
            text: puzzle.i18nPrompt ? translateMissionText(puzzle.i18nPrompt) : '',
            options: puzzle.options.slice(),
            answer: puzzle.answer,
            nextPhase: puzzlePhase.nextPhase || null,
            prompt: translateMissionText('story.david.buttons.continue')
        };
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
            : 'David';

        return {
            type: 'dialogue',
            missionId: mission.id,
            phaseId: phase.id,
            title: translateMissionText('story.david.title'),
            speaker: speaker,
            lines: phase.i18nLines.map(translateMissionText),
            prompt: translateMissionText('story.david.buttons.continue'),
            nextPhase: null,
            endMission: phase.endMission === true
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
        isEnabled: isEnabled,
        isForceLegacyStoryEnabled: isForceLegacyStoryEnabled,
        isIntegratedStoryOverrideEnabled: isIntegratedStoryOverrideEnabled
    };
})();
