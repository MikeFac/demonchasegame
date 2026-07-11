/**
 * MissionCompiler — deterministic spec → engine mission JSON.
 *
 * Pure function: compile(spec) → missionJSON. No Math.random for placement;
 * uses a seeded PRNG keyed off the mission id so regeneration is stable.
 *
 * See docs/plans/mission-dsl-schema.md for the full spec.
 */
(function () {
    'use strict';

    var Constants;
    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
    } else {
        Constants = window.Constants;
    }

    // -----------------------------------------------------------------
    // Seeded PRNG (mulberry32) — deterministic given the same seed.
    // -----------------------------------------------------------------
    function makePRNG(seed) {
        var state = hashSeed(seed);
        return function next() {
            state |= 0; state = (state + 0x6D2B79F5) | 0;
            var t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hashSeed(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    // -----------------------------------------------------------------
    // World size presets
    // -----------------------------------------------------------------
    var SIZE_PRESETS = {
        compact:  { width: 2000, height: 2000 },
        standard: { width: 3000, height: 3000 },
        large:    { width: 4000, height: 4000 }
    };

    function resolveWorldSize(worldSpec, roomCount) {
        if (worldSpec && worldSpec.size) {
            if (typeof worldSpec.size === 'string') {
                var preset = SIZE_PRESETS[worldSpec.size];
                if (preset) {
                    // Cap: world size must be proportional to room count
                    // so the map doesn't feel empty
                    if (roomCount <= 6) return { width: 2000, height: 2000 }; // compact
                    if (roomCount <= 9) return { width: 3000, height: 3000 }; // standard
                    return { width: preset.width, height: preset.height };
                }
            } else if (worldSpec.size && typeof worldSpec.size.width === 'number') {
                return { width: worldSpec.size.width, height: worldSpec.size.height };
            }
        }
        if (roomCount <= 6) return { width: 2000, height: 2000 };
        if (roomCount <= 9) return { width: 3000, height: 3000 };
        return { width: 4000, height: 4000 };
    }

    // -----------------------------------------------------------------
    // Sector placement (3×3 grid)
    // -----------------------------------------------------------------
    var SECTORS = ['nw', 'n', 'ne', 'w', 'center', 'e', 'sw', 's', 'se'];
    var SECTOR_CENTER = {
        nw:     { fx: 0.18, fy: 0.18 },
        n:      { fx: 0.50, fy: 0.18 },
        ne:     { fx: 0.82, fy: 0.18 },
        w:      { fx: 0.18, fy: 0.50 },
        center: { fx: 0.50, fy: 0.50 },
        e:      { fx: 0.82, fy: 0.50 },
        sw:     { fx: 0.18, fy: 0.82 },
        s:      { fx: 0.50, fy: 0.82 },
        se:     { fx: 0.82, fy: 0.82 }
    };

    /**
     * Assign a sector to each room. Rooms with explicit positions get them first;
     * 'auto' rooms fill remaining sectors.
     */
    function assignSectors(rooms, prng) {
        var used = {};
        var result = new Array(rooms.length);

        // First pass: explicit positions
        for (var i = 0; i < rooms.length; i++) {
            var pos = rooms[i].position || 'auto';
            if (pos !== 'auto' && SECTOR_CENTER[pos] && !used[pos]) {
                result[i] = pos;
                used[pos] = true;
            }
        }

        // Second pass: auto rooms fill remaining sectors
        var available = SECTORS.filter(function (s) { return !used[s]; });
        for (var j = 0; j < rooms.length; j++) {
            if (result[j]) continue;
            if (available.length > 0) {
                var idx = Math.floor(prng() * available.length);
                result[j] = available.splice(idx, 1)[0];
            } else {
                // More than 9 rooms: cycle with jitter
                result[j] = SECTORS[Math.floor(prng() * 9)];
            }
        }

        return result;
    }

    // -----------------------------------------------------------------
    // Room geometry
    // -----------------------------------------------------------------
    var CELL_SIZE = Constants.CELL_SIZE;       // 25
    var PLAYER_W  = Constants.PLAYER_WIDTH;     // 48
    var MONSTER_W = Constants.MONSTER_WIDTH;    // 48

    /**
     * Compute a room's building footprint and interior point in world coordinates.
     * Room is 11×11 cells (story-preferred size per rooms-structure.md).
     */
    function roomGeometry(sector, world, prng) {
        var sc = SECTOR_CENTER[sector];
        var cols = Math.floor(world.width / CELL_SIZE);
        var rows = Math.floor(world.height / CELL_SIZE);

        var roomW = 11;
        var roomH = 11;
        var cellX = Math.max(1, Math.min(cols - roomW - 1, Math.round(cols * sc.fx) - Math.floor(roomW / 2)));
        var cellY = Math.max(1, Math.min(rows - roomH - 1, Math.round(rows * sc.fy) - Math.floor(roomH / 2)));

        // Interior center in world coords
        var interiorX = (cellX + Math.floor(roomW / 2)) * CELL_SIZE;
        var interiorY = (cellY + Math.floor(roomH / 2)) * CELL_SIZE;

        // Door side — deterministic per sector (bottom for top sectors, top for bottom, etc.)
        var doorSide = 'bottom';
        if (sc.fy > 0.6) doorSide = 'top';
        else if (sc.fx < 0.3) doorSide = 'right';
        else if (sc.fx > 0.7) doorSide = 'left';

        // Guard position: offset from center but ≥2 cells from walls
        var guardOffsetX = Math.floor((prng() - 0.5) * 80);
        var guardOffsetY = Math.floor((prng() - 0.5) * 80);
        var guardX = clampToInterior(interiorX + guardOffsetX, cellX, roomW, MONSTER_W);
        var guardY = clampToInterior(interiorY + guardOffsetY, cellY, roomH, MONSTER_W);

        return {
            sector: sector,
            cellX: cellX, cellY: cellY,
            roomW: roomW, roomH: roomH,
            doorSide: doorSide,
            interiorX: interiorX, interiorY: interiorY,
            guardX: guardX, guardY: guardY
        };
    }

    function clampToInterior(coord, cellOrigin, roomCells, entitySize) {
        var minWorld = (cellOrigin + 2) * CELL_SIZE + Math.ceil(entitySize / 2);
        var maxWorld = (cellOrigin + roomCells - 2) * CELL_SIZE - Math.ceil(entitySize / 2);
        return Math.max(minWorld, Math.min(maxWorld, coord));
    }

    // -----------------------------------------------------------------
    // Difficulty mapping
    // -----------------------------------------------------------------
    var DIFFICULTY_PRESET = { easy: 'easy', medium: 'normal', hard: 'hard' };
    var DIFFICULTY_GUARD_HP = { easy: 0.7, medium: 1.0, hard: 1.5 };
    var DIFFICULTY_BOSS_HP  = { easy: 4.0, medium: 6.0, hard: 9.0 };

    // -----------------------------------------------------------------
    // Phase id helper
    // -----------------------------------------------------------------
    function phaseId(prefix, index) { return prefix + '-' + (index + 1); }

    // -----------------------------------------------------------------
    // Main compile function
    // -----------------------------------------------------------------
    function compile(spec) {
        if (!spec || typeof spec !== 'object') {
            throw new Error('MissionCompiler: spec is required');
        }
        if (spec.schemaVersion !== 1) {
            throw new Error('MissionCompiler: unsupported schemaVersion ' + spec.schemaVersion);
        }

        // Quest step mode: build a branching DAG with hub phases
        if (Array.isArray(spec.questSteps) && spec.questSteps.length > 0) {
            return compileQuestSteps(spec);
        }

        var prng = makePRNG(spec.id || 'unnamed');
        var world = resolveWorldSize(spec.world, (spec.rooms || []).length);
        var mapStyle = (spec.world && spec.world.mapStyle) || 'open';
        // Override: use 'open' for compact worlds — labyrinth/narrow are too dense
        // and make it hard to find monsters in small story missions
        if (world.width <= 2000 && mapStyle !== 'open') {
            mapStyle = 'open';
        }

        var rooms = spec.rooms || [];
        var sectors = assignSectors(rooms, prng);
        var geometries = sectors.map(function (s) { return roomGeometry(s, world, prng); });

        var mission = {
            id: spec.id,
            gameMode: 'story',
            storyIntegration: 'coreLoop',
            name: spec.name,
            description: spec.description,
            qualities: spec.qualities || [],
            mapStyle: mapStyle,
            world: { width: world.width, height: world.height },
            xpMultiplier: spec.xpMultiplier || 1.0
        };

        // ---- Story phases ----
        var phases = [];
        var npcs = [];
        var prevPhaseId = null;

        // Intro dialogue
        if (spec.intro) {
            var introPhase = buildDialoguePhase('intro', spec.intro, null, prng, world);
            phases.push(introPhase);
            if (introPhase._npc) npcs.push(introPhase._npc);
            prevPhaseId = 'intro';
        }

        // Room phases
        var specialObjects = [];
        var puzzles = [];
        var allFixedMonsters = []; // for collectCombatConfig
        var collectMonsterTypes = [];

        for (var i = 0; i < rooms.length; i++) {
            var room = rooms[i];
            var geo = geometries[i];
            var pid = phaseId('room', i);
            var phase;

            if (room.type === 'supplyCache' && room.collectible) {
                // combatCollect phase
                phase = {
                    id: pid,
                    type: 'combatCollect',
                    targetCount: room.collectible.count || 1,
                    objectType: room.collectible.id,
                    nextPhase: null
                };

                // Add specialObject placement
                addSpecialObject(specialObjects, room.collectible, geo, room.guard);

                // Add guard as fixed monster
                if (room.guard) {
                    addRoomFixedMonster(allFixedMonsters, collectMonsterTypes, room.guard, geo);
                }

            } else if (room.type === 'ruinPuzzle' && room.puzzle) {
                phase = {
                    id: pid,
                    type: 'puzzle',
                    puzzleId: room.puzzle.id,
                    nextPhase: null
                };
                puzzles.push(buildPuzzle(room.puzzle, spec));

            } else if (room.type === 'combatArena') {
                phase = {
                    id: pid,
                    type: 'combat',
                    nextPhase: null
                };
                if (room.guard) {
                    addRoomFixedMonster(allFixedMonsters, collectMonsterTypes, room.guard, geo);
                }

            } else if (room.type === 'narrative') {
                phase = buildDialoguePhase(pid, room.dialogue || {
                    lines: room.label ? [room.label] : ['...'],
                    endMission: false
                }, null, prng, world);
                if (phase._npc) npcs.push(phase._npc);

            } else if (room.type === 'shrine') {
                // Shrine: dialogue or silent heal
                phase = {
                    id: pid,
                    type: 'dialogue',
                    i18nLines: room.label ? [room.label] : ['You feel restored.'],
                    nextPhase: null
                };
                if (room.guard) {
                    addRoomFixedMonster(allFixedMonsters, collectMonsterTypes, room.guard, geo);
                }

            } else {
                // Fallback: treat as combatCollect if it has a collectible, else combat
                phase = { id: pid, type: 'combat', nextPhase: null };
            }

            // Wire previous phase → this one
            if (prevPhaseId) {
                var prev = findPhase(phases, prevPhaseId);
                if (prev) prev.nextPhase = pid;
            }
            phases.push(phase);
            prevPhaseId = pid;
        }

        // Boss phase
        if (spec.boss) {
            var bossPhaseId = 'bossFight';
            var bossGeo = roomGeometry('center', world, prng); // boss at center sector
            // If center was used by a room, nudge to a nearby free sector
            if (sectors.indexOf('center') >= 0) {
                bossGeo = roomGeometry('n', world, prng);
            }
            var bossPhase = { id: bossPhaseId, type: 'combat', nextPhase: null };
            if (prevPhaseId) {
                var prevB = findPhase(phases, prevPhaseId);
                if (prevB) prevB.nextPhase = bossPhaseId;
            }
            phases.push(bossPhase);
            prevPhaseId = bossPhaseId;
            mission._bossGeo = bossGeo;
        }

        // Outro dialogue
        if (spec.outro) {
            var outroPhase = buildDialoguePhase('victory', spec.outro, null, prng, world);
            if (prevPhaseId) {
                var prevO = findPhase(phases, prevPhaseId);
                if (prevO) prevO.nextPhase = 'victory';
            }
            if (outroPhase.endMission === undefined) outroPhase.endMission = true;
            phases.push(outroPhase);
            if (outroPhase._npc) npcs.push(outroPhase._npc);
        }

        mission.storyPhases = phases;
        mission.npcs = npcs;
        mission.specialObjects = specialObjects;
        mission.puzzles = puzzles;

        // ---- Combat configs ----
        var diffKey = spec.difficulty || 'medium';
        var defaultGuardHp = DIFFICULTY_GUARD_HP[diffKey] || 1.0;
        var defaultBossHp  = DIFFICULTY_BOSS_HP[diffKey]  || 6.0;

        // collectCombatConfig (for collection phases)
        if (allFixedMonsters.length > 0) {
            mission.collectCombatConfig = buildCollectCombatConfig(
                spec, allFixedMonsters, collectMonsterTypes, defaultGuardHp
            );
        }

        // combatConfig (for boss phase)
        if (spec.boss) {
            mission.combatConfig = buildBossCombatConfig(
                spec, mission._bossGeo, defaultBossHp, defaultGuardHp
            );
            delete mission._bossGeo;
        }

        // ---- Music placeholders ----
        mission.music = {
            phaseTracks: buildMusicPlaceholders(phases),
            fallbackTrackIndex: 0
        };

        // ---- i18n ----
        if (spec.i18n && spec.i18n.strings) {
            mission._i18n = { prefix: spec.i18n.prefix || ('mission.' + spec.id), strings: spec.i18n.strings };
        }

        return mission;
    }

    // -----------------------------------------------------------------
    // Quest step compilation — builds a branching DAG with questHub phases
    // -----------------------------------------------------------------
    function compileQuestSteps(spec) {
        var prng = makePRNG(spec.id || 'unnamed');
        var steps = spec.questSteps;
        var world = resolveWorldSize(spec.world, steps.length);
        var mapStyle = (spec.world && spec.world.mapStyle) || 'open';
        if (world.width <= 2000 && mapStyle !== 'open') {
            mapStyle = 'open';
        }

        // Topological sort of steps by prerequisites
        var sortedIds = topoSortSteps(steps);

        // Assign sectors to steps that need placement (supplyCache, combatArena, bossArena)
        var placeableSteps = steps.filter(function (s) {
            return s.type === 'supplyCache' || s.type === 'combatArena' ||
                   s.type === 'bossArena' || s.type === 'shrine' || s.type === 'ruinPuzzle';
        });
        var stepSectors = assignSectors(placeableSteps, prng);
        var stepGeometries = {};
        for (var si = 0; si < placeableSteps.length; si++) {
            stepGeometries[placeableSteps[si].id] = roomGeometry(stepSectors[si], world, prng);
        }

        var mission = {
            id: spec.id,
            gameMode: 'story',
            storyIntegration: 'coreLoop',
            name: spec.name,
            description: spec.description,
            qualities: spec.qualities || [],
            mapStyle: mapStyle,
            world: { width: world.width, height: world.height },
            xpMultiplier: spec.xpMultiplier || 1.0,
            questSteps: steps,
            questFlow: normalizeQuestFlow(spec.questFlow)
        };

        var phases = [];
        var npcs = [];
        var specialObjects = [];
        var puzzles = [];
        var allFixedMonsters = [];
        var collectMonsterTypes = [];

        // ---- Intro ----
        var firstPhaseId = 'questHub-initial';
        if (spec.intro) {
            var introPhase = buildDialoguePhase('intro', spec.intro, 'questHub-initial', prng, world);
            phases.push(introPhase);
            if (introPhase._npc) npcs.push(introPhase._npc);
            firstPhaseId = 'intro';
        }

        // ---- Build a phase (or phase chain) for each quest step ----
        // Each step gets one phase. After completing, the engine returns to questHub.
        var stepPhaseMap = {};  // stepId → phaseId

        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            var phaseId = 'step-' + step.id;
            stepPhaseMap[step.id] = phaseId;

            var stepType = step.type;
            if (!stepType) {
                stepType = step.npc ? 'learn' : 'combat';
            }

            var phase;

            if (stepType === 'learn' || stepType === 'narrative') {
                // Learn/narrative step: dialogue phase that grants a skill
                var dialogue = step.npc || step.dialogue || {
                    lines: step.label ? [step.label] : ['...'],
                    endMission: false
                };
                phase = buildDialoguePhase(phaseId, dialogue, 'questHub', prng, world);
                phase.stepId = step.id;
                phase.grantsSkill = step.grantsSkill || null;
                if (phase._npc) npcs.push(phase._npc);

            } else if (stepType === 'supplyCache' && step.collectible) {
                phase = {
                    id: phaseId,
                    type: 'combatCollect',
                    targetCount: step.collectible.count || 1,
                    objectType: step.collectible.id,
                    nextPhase: 'questHub',
                    stepId: step.id
                };
                var geo = stepGeometries[step.id];
                if (geo) {
                    addSpecialObject(specialObjects, step.collectible, geo, step.guard);
                    if (step.guard) {
                        addRoomFixedMonster(allFixedMonsters, collectMonsterTypes, step.guard, geo, step.id);
                    }
                }

            } else if (stepType === 'ruinPuzzle' && step.puzzle) {
                phase = {
                    id: phaseId,
                    type: 'puzzle',
                    puzzleId: step.puzzle.id,
                    nextPhase: 'questHub',
                    stepId: step.id
                };
                puzzles.push(buildPuzzle(step.puzzle, spec));

            } else if (stepType === 'combatArena') {
                phase = {
                    id: phaseId,
                    type: 'combat',
                    nextPhase: 'questHub',
                    stepId: step.id
                };
                var geo2 = stepGeometries[step.id];
                if (geo2 && step.guard) {
                    addRoomFixedMonster(allFixedMonsters, collectMonsterTypes, step.guard, geo2, step.id);
                }

            } else if (stepType === 'bossArena') {
                // Boss step — build combatConfig for this specific boss
                phase = {
                    id: phaseId,
                    type: 'combat',
                    nextPhase: spec.outro ? 'victory' : null,
                    stepId: step.id,
                    isBossPhase: true
                };
                var bossGeo = stepGeometries[step.id] || roomGeometry('center', world, prng);
                mission._bossGeo = bossGeo;
                mission._bossStep = step;

            } else if (stepType === 'shrine') {
                phase = {
                    id: phaseId,
                    type: 'dialogue',
                    i18nLines: step.label ? [step.label] : ['You feel restored.'],
                    nextPhase: 'questHub',
                    stepId: step.id
                };

            } else {
                // Fallback: treat as combat
                phase = {
                    id: phaseId,
                    type: 'combat',
                    nextPhase: 'questHub',
                    stepId: step.id
                };
            }

            phases.push(phase);
        }

        // ---- Boss handling ----
        // If spec.boss is present (and no bossArena step), add a boss phase after the hub
        var bossPhaseId = null;
        var hasBossStep = steps.some(function (s) { return s.type === 'bossArena'; });

        if (!hasBossStep && spec.boss) {
            bossPhaseId = 'bossFight';
            var bossGeo = roomGeometry('center', world, prng);
            if (steps.length > 6) bossGeo = roomGeometry('n', world, prng);
            var bossPhase = {
                id: bossPhaseId,
                type: 'combat',
                nextPhase: spec.outro ? 'victory' : null,
                isBossPhase: true
            };
            phases.push(bossPhase);
            mission._bossGeo = bossGeo;
        } else if (hasBossStep) {
            // Find the boss step's phase
            for (var b = 0; b < steps.length; b++) {
                if (steps[b].type === 'bossArena') {
                    bossPhaseId = stepPhaseMap[steps[b].id];
                    break;
                }
            }
        }

        // ---- Quest Hub phase ----
        // The hub is a choice screen. Its "nextPhase" is dynamically resolved
        // by the engine based on which steps are unlocked. We set it to the boss
        // phase if all required steps are done, or null (engine handles choice).
        var hubPhase = {
            id: 'questHub',
            type: 'questHub',
            nextPhase: null,  // engine resolves dynamically
            stepPhaseMap: stepPhaseMap,
            bossPhaseId: bossPhaseId
        };
        phases.push(hubPhase);

        // The initial hub (first entry point if no intro)
        var initialHubPhase = {
            id: 'questHub-initial',
            type: 'questHub',
            nextPhase: null,
            stepPhaseMap: stepPhaseMap,
            bossPhaseId: bossPhaseId,
            isInitial: true
        };
        phases.push(initialHubPhase);

        // Wire intro → questHub-initial (already wired above if intro exists)
        if (!spec.intro) {
            // No intro: first phase is questHub-initial
        }

        // ---- Outro ----
        if (spec.outro) {
            var outroPhase = buildDialoguePhase('victory', spec.outro, null, prng, world);
            if (outroPhase.endMission === undefined) outroPhase.endMission = true;
            phases.push(outroPhase);
            if (outroPhase._npc) npcs.push(outroPhase._npc);
        }

        mission.storyPhases = phases;
        mission.npcs = npcs;
        mission.specialObjects = specialObjects;
        mission.puzzles = puzzles;

        // ---- Combat configs ----
        var diffKey = spec.difficulty || 'medium';
        var defaultGuardHp = DIFFICULTY_GUARD_HP[diffKey] || 1.0;
        var defaultBossHp = DIFFICULTY_BOSS_HP[diffKey] || 6.0;

        // collectCombatConfig (for collection steps)
        if (allFixedMonsters.length > 0) {
            mission.collectCombatConfig = buildCollectCombatConfig(
                spec, allFixedMonsters, collectMonsterTypes, defaultGuardHp
            );
        }

        // Boss combatConfig
        if (spec.boss || mission._bossStep) {
            if (mission._bossStep && mission._bossStep.boss) {
                // Boss comes from a bossArena step
                mission.combatConfig = buildBossCombatConfigFromStep(
                    spec, mission._bossStep, mission._bossGeo, defaultBossHp, defaultGuardHp
                );
            } else if (spec.boss) {
                // Boss comes from spec.boss (top-level)
                mission.combatConfig = buildBossCombatConfig(
                    spec, mission._bossGeo, defaultBossHp, defaultGuardHp
                );
            }
            delete mission._bossGeo;
            delete mission._bossStep;
        }

        // ---- Music placeholders ----
        mission.music = {
            phaseTracks: buildMusicPlaceholders(phases),
            fallbackTrackIndex: 0
        };

        // ---- i18n ----
        if (spec.i18n && spec.i18n.strings) {
            mission._i18n = { prefix: spec.i18n.prefix || ('mission.' + spec.id), strings: spec.i18n.strings };
        }

        return mission;
    }

    // -----------------------------------------------------------------
    // Topological sort of quest steps by prerequisites
    // -----------------------------------------------------------------
    function topoSortSteps(steps) {
        var visited = {};
        var inPath = {};
        var result = [];

        function visit(stepId) {
            if (visited[stepId]) return;
            if (inPath[stepId]) {
                throw new Error('MissionCompiler: cycle detected in quest step prerequisites at "' + stepId + '"');
            }
            inPath[stepId] = true;

            // Find step and visit its prerequisites
            for (var i = 0; i < steps.length; i++) {
                if (steps[i].id === stepId) {
                    var prereqs = steps[i].prerequisites || [];
                    for (var j = 0; j < prereqs.length; j++) {
                        visit(prereqs[j]);
                    }
                    break;
                }
            }

            inPath[stepId] = false;
            visited[stepId] = true;
            result.push(stepId);
        }

        for (var k = 0; k < steps.length; k++) {
            visit(steps[k].id);
        }

        return result;
    }

    function normalizeQuestFlow(questFlow) {
        var flow = questFlow && typeof questFlow === 'object' ? questFlow : {};
        return {
            mode: flow.mode === 'continuous' ? 'continuous' : 'hub'
        };
    }

    // -----------------------------------------------------------------
    // Helper: derive boss spec from a bossArena step
    // -----------------------------------------------------------------
    function deriveBossFromStep(step, fallbackBoss) {
        return step.boss || fallbackBoss || {
            demonType: 'Pride',
            label: step.label || 'Boss',
            stats: { healthMultiplier: 6.0, damageMultiplier: 3.0, sizeMultiplier: 1.5 }
        };
    }

    // -----------------------------------------------------------------
    // Helper: build boss combatConfig from a bossArena step
    // -----------------------------------------------------------------
    function buildBossCombatConfigFromStep(spec, step, bossGeo, defaultBossHp, defaultGuardHp) {
        var boss = step.boss || spec.boss || {
            demonType: 'Pride',
            label: 'Boss',
            stats: {}
        };
        var overrides = boss.combatOverrides || {};
        var bossStats = boss.stats || {};

        var fixedMonsters = [{
            x: bossGeo.interiorX,
            y: bossGeo.interiorY,
            demonType: boss.demonType,
            isBoss: true,
            label: boss.label || boss.demonType,
            behavior: { type: 'guard', patrolRadius: 200 },
            stats: {
                healthMultiplier: bossStats.healthMultiplier || defaultBossHp,
                damageMultiplier: bossStats.damageMultiplier || 3.0,
                sizeMultiplier: bossStats.sizeMultiplier || 1.5
            },
            spawnTrigger: { type: 'immediate', value: 0 }
        }];

        var monsterTypes = [boss.demonType];

        if (boss.minions) {
            for (var i = 0; i < boss.minions.length; i++) {
                var m = boss.minions[i];
                var mCount = m.count || 1;
                for (var j = 0; j < mCount; j++) {
                    var mX = bossGeo.interiorX + (j - mCount / 2) * 120;
                    var mY = bossGeo.interiorY + 170;
                    fixedMonsters.push({
                        x: Math.max(100, mX),
                        y: mY,
                        demonType: m.demonType,
                        stats: { healthMultiplier: (m.stats && m.stats.healthMultiplier) || 1.0 },
                        spawnTrigger: { type: 'immediate', value: 0 }
                    });
                }
                if (monsterTypes.indexOf(m.demonType) < 0) monsterTypes.push(m.demonType);
            }
        }

        return {
            monsters: monsterTypes,
            monsterDamageFactor: overrides.monsterDamageFactor || 1.1,
            monsterSpeed: overrides.monsterSpeed || 5,
            playerSpeed: overrides.playerSpeed || 5,
            maxMonsters: overrides.maxMonsters || Math.max(6, fixedMonsters.length),
            monstersToKill: overrides.monstersToKill || 1,
            spawnRate: overrides.spawnRate || 999,
            randomSpawnsEnabled: overrides.randomSpawnsEnabled !== undefined ? overrides.randomSpawnsEnabled : false,
            disableLevelBoss: true,
            fixedMonsters: fixedMonsters
        };
    }
    function buildDialoguePhase(id, dialogue, nextPhaseId, prng, world) {
        var lines = dialogue.lines || [];
        // Store the raw text directly as i18nLines. translateMissionText() in
        // CoreStoryDirector falls back to returning the key as-is when no translation
        // exists, so passing plain text here means it displays correctly without
        // needing a translation file.
        var i18nLines = lines.map(function (l, idx) {
            // If it looks like an i18n key already (has dots, no spaces), keep it
            if (typeof l === 'string' && l.indexOf('.') > 0 && l.indexOf(' ') < 0) {
                return l;
            }
            // Otherwise pass the raw text through — it will display as-is
            return l;
        });

        var phase = {
            id: id,
            type: 'dialogue',
            i18nLines: i18nLines,
            nextPhase: nextPhaseId
        };

        if (dialogue.sermonRef) phase.sermonRef = dialogue.sermonRef;
        if (dialogue.endMission) phase.endMission = true;

        // Synthesize NPC
        if (dialogue.npcId || dialogue.npcName) {
            var npc = {
                id: dialogue.npcId || ('npc-' + id),
                nameKey: dialogue.npcName || (dialogue.npcId || 'narrator'),
                position: { x: Math.floor(world.width / 2), y: Math.floor(world.height / 2) }
            };
            if (dialogue.portrait) npc.portrait = dialogue.portrait;
            phase.npcId = npc.id;
            phase._npc = npc;
        }

        return phase;
    }

    // -----------------------------------------------------------------
    // Helper: build a puzzle entry
    // -----------------------------------------------------------------
    function buildPuzzle(puzzleSpec, missionSpec) {
        var p = {
            id: puzzleSpec.id,
            mode: puzzleSpec.mode
        };
        if (puzzleSpec.verseRef) p.verseRef = puzzleSpec.verseRef;
        if (puzzleSpec.prompt) p.i18nPrompt = puzzleSpec.prompt;
        if (puzzleSpec.answer) p.answer = puzzleSpec.answer;
        if (puzzleSpec.options) p.options = puzzleSpec.options.slice();
        // verseMemorize mode: progressive word hiding puzzle
        if (puzzleSpec.mode === 'verseMemorize') {
            p.wordsToHide = puzzleSpec.wordsToHide || 3;
            if (puzzleSpec.verseText) p.verseText = puzzleSpec.verseText;
        }
        return p;
    }

    // -----------------------------------------------------------------
    // Helper: add a specialObject placement from a room
    // -----------------------------------------------------------------
    function addSpecialObject(specialObjects, collectible, geo, guard) {
        // Find or create the specialObject entry for this collectible id
        var entry = null;
        for (var i = 0; i < specialObjects.length; i++) {
            if (specialObjects[i].id === collectible.id) {
                entry = specialObjects[i];
                break;
            }
        }
        if (!entry) {
            entry = {
                id: collectible.id,
                labelKey: collectible.label || collectible.id,
                count: 0,
                spawnArea: { x: 0, y: 0, w: 0, h: 0 },
                placements: []
            };
            specialObjects.push(entry);
        }

        entry.count += collectible.count || 1;

        // Expand spawnArea to cover this placement
        expandSpawnArea(entry.spawnArea, geo.interiorX, geo.interiorY);

        for (var c = 0; c < (collectible.count || 1); c++) {
            entry.placements.push({
                x: geo.interiorX,
                y: geo.interiorY,
                guardDemonType: guard ? guard.demonType : undefined
            });
        }
    }

    function expandSpawnArea(area, x, y) {
        if (area.w === 0) {
            area.x = x; area.y = y; area.w = 1; area.h = 1;
        } else {
            var minX = Math.min(area.x, x);
            var minY = Math.min(area.y, y);
            var maxX = Math.max(area.x + area.w, x);
            var maxY = Math.max(area.y + area.h, y);
            area.x = minX; area.y = minY;
            area.w = maxX - minX; area.h = maxY - minY;
        }
    }

    // -----------------------------------------------------------------
    // Helper: add a room's guard as a fixedMonster
    // -----------------------------------------------------------------
    function addRoomFixedMonster(fixedMonsters, monsterTypes, guard, geo, storyStepId) {
        var count = guard.count || 1;
        for (var i = 0; i < count; i++) {
            var fixedMonster = {
                x: geo.guardX,
                y: geo.guardY,
                demonType: guard.demonType,
                behavior: {
                    type: guard.behavior || 'guard',
                    patrolRadius: guard.patrolRadius || 140
                },
                stats: { healthMultiplier: (guard.stats && guard.stats.healthMultiplier) || 1.0 },
                spawnTrigger: { type: 'immediate', value: 0 }
            };
            if (storyStepId) fixedMonster.storyStepId = storyStepId;
            fixedMonsters.push(fixedMonster);
            if (monsterTypes.indexOf(guard.demonType) < 0) {
                monsterTypes.push(guard.demonType);
            }
        }
    }

    // -----------------------------------------------------------------
    // Helper: build collectCombatConfig
    // -----------------------------------------------------------------
    function buildCollectCombatConfig(spec, fixedMonsters, monsterTypes, defaultGuardHp) {
        var overrides = {};
        // Gather combatOverrides from supplyCache rooms
        for (var i = 0; i < (spec.rooms || []).length; i++) {
            var r = spec.rooms[i];
            if (r.type === 'supplyCache' && r.combatOverrides) {
                overrides = mergeOverrides(overrides, r.combatOverrides);
            }
        }
        // Top-level escape hatch (advanced authors)
        if (spec.collectCombatConfig) {
            overrides = mergeOverrides(overrides, spec.collectCombatConfig);
        }

        var config = {
            monsters: (spec.collectCombatConfig && spec.collectCombatConfig.monsters) || monsterTypes.slice(),
            monsterDamageFactor: overrides.monsterDamageFactor !== undefined ? overrides.monsterDamageFactor : 0.9,
            monsterSpeed: overrides.monsterSpeed !== undefined ? overrides.monsterSpeed : 4,
            playerSpeed: overrides.playerSpeed || 5,
            maxMonsters: overrides.maxMonsters || Math.max(16, fixedMonsters.length + 10),
            monstersToKill: overrides.monstersToKill || 99,
            spawnRate: overrides.spawnRate || 4000,
            randomSpawnsEnabled: overrides.randomSpawnsEnabled !== undefined ? overrides.randomSpawnsEnabled : true,
            randomSpawnBudget: overrides.randomSpawnBudget !== undefined ? overrides.randomSpawnBudget : 20,
            disableLevelBoss: true,
            fixedMonsters: fixedMonsters
        };

        return config;
    }

    // -----------------------------------------------------------------
    // Helper: build boss combatConfig
    // -----------------------------------------------------------------
    function buildBossCombatConfig(spec, bossGeo, defaultBossHp, defaultGuardHp) {
        var boss = spec.boss;
        var overrides = boss.combatOverrides || {};

        var bossStats = boss.stats || {};
        var fixedMonsters = [{
            x: bossGeo.interiorX,
            y: bossGeo.interiorY,
            demonType: boss.demonType,
            isBoss: true,
            label: boss.label || boss.demonType,
            behavior: { type: 'guard', patrolRadius: 200 },
            stats: {
                healthMultiplier: bossStats.healthMultiplier || defaultBossHp,
                damageMultiplier: bossStats.damageMultiplier || 3.0,
                sizeMultiplier: bossStats.sizeMultiplier || 1.5
            },
            spawnTrigger: { type: 'immediate', value: 0 }
        }];

        var monsterTypes = [boss.demonType];

        // Minions
        if (boss.minions) {
            for (var i = 0; i < boss.minions.length; i++) {
                var m = boss.minions[i];
                var mCount = m.count || 1;
                for (var j = 0; j < mCount; j++) {
                    var mX = bossGeo.interiorX + (j - mCount / 2) * 120;
                    var mY = bossGeo.interiorY + 170;
                    fixedMonsters.push({
                        x: Math.max(100, Math.min(spec.world ? 9999 : 9999, mX)),
                        y: mY,
                        demonType: m.demonType,
                        stats: { healthMultiplier: (m.stats && m.stats.healthMultiplier) || 1.0 },
                        spawnTrigger: { type: 'immediate', value: 0 }
                    });
                }
                if (monsterTypes.indexOf(m.demonType) < 0) monsterTypes.push(m.demonType);
            }
        }

        return {
            monsters: monsterTypes,
            monsterDamageFactor: overrides.monsterDamageFactor || 1.1,
            monsterSpeed: overrides.monsterSpeed || 5,
            playerSpeed: overrides.playerSpeed || 5,
            maxMonsters: overrides.maxMonsters || Math.max(6, fixedMonsters.length),
            monstersToKill: overrides.monstersToKill || 1,
            spawnRate: overrides.spawnRate || 999,
            randomSpawnsEnabled: overrides.randomSpawnsEnabled !== undefined ? overrides.randomSpawnsEnabled : false,
            disableLevelBoss: true,
            fixedMonsters: fixedMonsters
        };
    }

    // -----------------------------------------------------------------
    // Helper: build music placeholders (all null for now)
    // -----------------------------------------------------------------
    function buildMusicPlaceholders(phases) {
        var tracks = {};
        for (var i = 0; i < phases.length; i++) {
            tracks[phases[i].id] = null;
        }
        return tracks;
    }

    // -----------------------------------------------------------------
    // Helper: merge combatOverrides
    // -----------------------------------------------------------------
    function mergeOverrides(base, over) {
        if (!over) return base;
        var result = Object.assign({}, base);
        var keys = ['monsterDamageFactor', 'monsterSpeed', 'playerSpeed', 'maxMonsters',
                     'monstersToKill', 'spawnRate', 'randomSpawnsEnabled', 'randomSpawnBudget'];
        for (var i = 0; i < keys.length; i++) {
            if (over[keys[i]] !== undefined) result[keys[i]] = over[keys[i]];
        }
        return result;
    }

    // -----------------------------------------------------------------
    // Helper: find phase by id
    // -----------------------------------------------------------------
    function findPhase(phases, id) {
        for (var i = 0; i < phases.length; i++) {
            if (phases[i].id === id) return phases[i];
        }
        return null;
    }

    // -----------------------------------------------------------------
    // Exports
    // -----------------------------------------------------------------
    var MissionCompilerExports = {
        compile: compile,
        // Exposed for testing:
        _makePRNG: makePRNG,
        _resolveWorldSize: resolveWorldSize,
        _assignSectors: assignSectors,
        _roomGeometry: roomGeometry
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MissionCompilerExports;
    } else {
        window.MissionCompiler = MissionCompilerExports;
    }
})();
