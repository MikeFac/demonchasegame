/**
 * MissionValidator — validates mission JSON against the engine's safety rules.
 *
 * Pure function: validate(missionJSON, options) → ValidationResult.
 * A mission that passes is guaranteed loadable by StoryMissionEngine / MissionClient.
 * It is NOT guaranteed fun.
 *
 * See docs/plans/mission-dsl-schema.md → "Layer 3 — Mission Validator".
 */
(function () {
    'use strict';

    var MissionAssetRegistry, Constants, LevelConfig;

    if (typeof module !== 'undefined' && module.exports) {
        MissionAssetRegistry = require('./MissionAssetRegistry');
        Constants = require('./Constants');
        LevelConfig = require('./LevelConfig');
    } else {
        MissionAssetRegistry = window.MissionAssetRegistry;
        Constants = window.Constants;
        LevelConfig = window.LevelConfig;
    }

    var CELL_SIZE = Constants.CELL_SIZE;
    var PLAYER_W = Constants.PLAYER_WIDTH;
    var MONSTER_W = Constants.MONSTER_WIDTH;

    function ValidationResult() {
        this.ok = true;
        this.errors = [];
        this.warnings = [];
    }
    ValidationResult.prototype.addError = function (code, message, context) {
        this.ok = false;
        this.errors.push({ code: code, message: message, context: context || null });
    };
    ValidationResult.prototype.addWarning = function (code, message, context) {
        this.warnings.push({ code: code, message: message, context: context || null });
    };

    // -----------------------------------------------------------------
    // Main entry point
    // -----------------------------------------------------------------
    function validate(mission, options) {
        var result = new ValidationResult();
        options = options || {};
        var registry = options.registry || MissionAssetRegistry;
        if (options.customBosses) {
            registry = registry.withCustomBosses(options.customBosses);
        }

        if (!mission || typeof mission !== 'object') {
            result.addError('SCHEMA_NOT_OBJECT', 'mission must be an object');
            return result;
        }

        var worldW, worldH;
        if (mission.world) {
            worldW = mission.world.width || Constants.WORLD_WIDTH;
            worldH = mission.world.height || Constants.WORLD_HEIGHT;
        } else {
            worldW = Constants.WORLD_WIDTH;
            worldH = Constants.WORLD_HEIGHT;
        }

        // A. Schema shape
        checkSchemaShape(mission, result);

        // Stop early if fundamentally broken
        if (result.errors.length > 5) return result;

        // B. Asset references
        checkAssetReferences(mission, result, registry);

        // C. Phase graph integrity
        checkPhaseGraph(mission, result);

        // D. Reachability (bounds checks — full BFS wall-check is optional/external)
        checkReachability(mission, result, worldW, worldH);

        // E. Win path feasibility (story missions only)
        if (Array.isArray(mission.storyPhases)) {
            checkWinPath(mission, result);
        }

        // F. Combat sanity
        checkCombatSanity(mission, result);

        // G. World bounds
        checkWorldBounds(mission, result, worldW, worldH);

        // W. Warnings
        checkWarnings(mission, result, worldW, worldH);

        return result;
    }

    // -----------------------------------------------------------------
    // A. Schema shape
    // -----------------------------------------------------------------
    function checkSchemaShape(m, result) {
        if (!m || typeof m !== 'object') {
            result.addError('SCHEMA_NOT_OBJECT', 'mission must be an object');
            return;
        }
        requireString(m, 'id', result, 'SCHEMA_ID');
        requireString(m, 'name', result, 'SCHEMA_NAME');
        requireString(m, 'description', result, 'SCHEMA_DESC');

        if (m.schemaVersion !== undefined && m.schemaVersion !== 1) {
            result.addError('SCHEMA_VERSION', 'unsupported schemaVersion: ' + m.schemaVersion);
        }

        // storyPhases must be array if present
        if (m.storyPhases !== undefined && !Array.isArray(m.storyPhases)) {
            result.addError('SCHEMA_STORYPHASES', 'storyPhases must be an array');
        }

        // Each phase must have id + type
        if (Array.isArray(m.storyPhases)) {
            var validTypes = { dialogue: 1, combat: 1, combatCollect: 1, puzzle: 1, collect: 1 };
            m.storyPhases.forEach(function (p, i) {
                if (!p || typeof p !== 'object') {
                    result.addError('SCHEMA_PHASE_NOT_OBJECT', 'phase[' + i + '] is not an object');
                    return;
                }
                if (!p.id || typeof p.id !== 'string') {
                    result.addError('SCHEMA_PHASE_ID', 'phase[' + i + '] missing string id');
                }
                if (!p.type || !validTypes[p.type]) {
                    result.addError('SCHEMA_PHASE_TYPE', 'phase[' + i + '] has invalid type: ' + p.type);
                }
            });
        }

        // Room types / puzzle modes are not directly in engine JSON, but puzzle.mode is
        if (Array.isArray(m.puzzles)) {
            m.puzzles.forEach(function (p, i) {
                if (!p || !p.id) {
                    result.addError('SCHEMA_PUZZLE_ID', 'puzzle[' + i + '] missing id');
                }
                if (!p.mode) {
                    result.addError('SCHEMA_PUZZLE_MODE', 'puzzle[' + i + '] missing mode');
                }
            });
        }
    }

    function requireString(obj, field, result, code) {
        if (typeof obj[field] !== 'string' || obj[field].length === 0) {
            result.addError(code, 'missing required string field: ' + field);
        }
    }

    // -----------------------------------------------------------------
    // B. Asset references
    // -----------------------------------------------------------------
    function checkAssetReferences(m, result, registry) {
        // B4: demon types in fixedMonsters, monsters arrays
        function checkDemonType(name, where) {
            if (!name || typeof name !== 'string') {
                result.addError('ASSET_DEMON_EMPTY', 'empty demonType in ' + where);
            } else if (!registry.hasDemonType(name)) {
                result.addError('ASSET_DEMON_UNKNOWN', 'unknown demon type "' + name + '" in ' + where);
            }
        }

        var combatConfigs = [m.collectCombatConfig, m.combatConfig].filter(Boolean);
        combatConfigs.forEach(function (cc, idx) {
            var where = idx === 0 ? 'collectCombatConfig' : 'combatConfig';
            if (Array.isArray(cc.monsters)) {
                cc.monsters.forEach(function (dt) { checkDemonType(dt, where + '.monsters'); });
            }
            if (Array.isArray(cc.fixedMonsters)) {
                cc.fixedMonsters.forEach(function (fm, i) {
                    checkDemonType(fm.demonType, where + '.fixedMonsters[' + i + ']');
                });
            }
        });

        // B5: puzzle modes
        if (Array.isArray(m.puzzles)) {
            m.puzzles.forEach(function (p, i) {
                if (p.mode && !registry.hasPuzzleMode(p.mode)) {
                    result.addError('ASSET_PUZZLE_MODE', 'puzzle[' + i + '] has unknown mode: ' + p.mode);
                }
                // B6: verse references (warning — story puzzles carry their own answer/options)
                if (p.verseRef && !registry.hasVerseReference(p.verseRef)) {
                    result.addWarning('ASSET_VERSE_REF', 'puzzle[' + i + '] references verse not in corpus: ' + p.verseRef + ' (may be intentional for story puzzles)');
                }
            });
        }

        // B7: collectible icons (skip — file checks require fs, leave optional)
        // B8: verse categories in qualities
        if (Array.isArray(m.qualities)) {
            m.qualities.forEach(function (q) {
                // Qualities map to verse categories; unknown ones are a warning, not error
                if (!registry.hasVerseCategory(q)) {
                    result.addWarning('ASSET_QUALITY_UNKNOWN', 'quality "' + q + '" is not a known verse category');
                }
            });
        }

        // mapStyle
        if (m.mapStyle && !registry.hasMapStyle(m.mapStyle)) {
            result.addError('ASSET_MAP_STYLE', 'unknown mapStyle: ' + m.mapStyle);
        }
    }

    // -----------------------------------------------------------------
    // C. Phase graph integrity
    // -----------------------------------------------------------------
    function checkPhaseGraph(m, result) {
        var phases = m.storyPhases;
        if (!Array.isArray(phases)) return;

        var phaseIds = {};
        phases.forEach(function (p) {
            if (p && p.id) phaseIds[p.id] = true;
        });

        // C9: nextPhase targets exist
        phases.forEach(function (p, i) {
            if (p.nextPhase && !phaseIds[p.nextPhase]) {
                result.addError('PHASE_NEXT_MISSING', 'phase[' + i + '] "' + p.id + '" → unknown nextPhase "' + p.nextPhase + '"');
            }
        });

        // C10: no cycles (except endMission terminations)
        var visited = {};
        var inPath = {};
        function detectCycle(phaseId) {
            if (inPath[phaseId]) {
                result.addError('PHASE_CYCLE', 'cycle detected at phase "' + phaseId + '"');
                return true;
            }
            if (visited[phaseId]) return false;
            visited[phaseId] = true;
            inPath[phaseId] = true;
            var p = phases.find(function (ph) { return ph.id === phaseId; });
            if (p && p.nextPhase) detectCycle(p.nextPhase);
            inPath[phaseId] = false;
        }
        phases.forEach(function (p) {
            if (p && p.id && !visited[p.id]) detectCycle(p.id);
        });

        // C11: at least one endMission or terminal node
        var hasEndMission = phases.some(function (p) { return p.endMission === true; });
        var hasTerminal = phases.some(function (p) { return !p.nextPhase; });
        if (!hasEndMission && !hasTerminal) {
            result.addError('PHASE_NO_END', 'no phase with endMission and no terminal node — mission cannot end');
        }

        // C12: puzzleId references exist
        var puzzleIds = {};
        if (Array.isArray(m.puzzles)) {
            m.puzzles.forEach(function (p) { if (p && p.id) puzzleIds[p.id] = true; });
        }
        phases.forEach(function (p, i) {
            if (p.type === 'puzzle' && p.puzzleId && !puzzleIds[p.puzzleId]) {
                result.addError('PHASE_PUZZLE_MISSING', 'phase[' + i + '] "' + p.id + '" references unknown puzzleId "' + p.puzzleId + '"');
            }
        });

        // C13: objectType references exist in specialObjects
        var objIds = {};
        if (Array.isArray(m.specialObjects)) {
            m.specialObjects.forEach(function (o) { if (o && o.id) objIds[o.id] = true; });
        }
        phases.forEach(function (p, i) {
            if ((p.type === 'collect' || p.type === 'combatCollect') && p.objectType && !objIds[p.objectType]) {
                result.addError('PHASE_OBJECT_MISSING', 'phase[' + i + '] "' + p.id + '" references unknown objectType "' + p.objectType + '"');
            }
        });

        // C14: npcId references exist in npcs
        var npcIds = {};
        if (Array.isArray(m.npcs)) {
            m.npcs.forEach(function (n) { if (n && n.id) npcIds[n.id] = true; });
        }
        phases.forEach(function (p, i) {
            if (p.type === 'dialogue' && p.npcId && !npcIds[p.npcId]) {
                result.addError('PHASE_NPC_MISSING', 'phase[' + i + '] "' + p.id + '" references unknown npcId "' + p.npcId + '"');
            }
        });

        // C15: duplicate phase ids
        var seenIds = {};
        phases.forEach(function (p) {
            if (p && p.id) {
                if (seenIds[p.id]) {
                    result.addError('PHASE_DUP_ID', 'duplicate phase id: "' + p.id + '"');
                }
                seenIds[p.id] = true;
            }
        });
    }

    // -----------------------------------------------------------------
    // D. Reachability (bounds-based; full wall BFS is optional/external)
    // -----------------------------------------------------------------
    function checkReachability(m, result, worldW, worldH) {
        var margin = CELL_SIZE; // 1 cell margin

        // D15-16: collectible/guard coordinates within bounds
        if (Array.isArray(m.specialObjects)) {
            m.specialObjects.forEach(function (obj, oi) {
                if (Array.isArray(obj.placements)) {
                    obj.placements.forEach(function (p, pi) {
                        if (!inBounds(p.x, p.y, worldW, worldH, margin)) {
                            result.addError('REACH_OBJ_OOB', 'specialObject[' + oi + '].placements[' + pi + '] out of bounds: x=' + p.x + ' y=' + p.y);
                        }
                    });
                }
            });
        }

        // fixedMonsters within bounds
        var combatConfigs = [m.collectCombatConfig, m.combatConfig].filter(Boolean);
        combatConfigs.forEach(function (cc, idx) {
            var where = idx === 0 ? 'collectCombatConfig' : 'combatConfig';
            if (Array.isArray(cc.fixedMonsters)) {
                cc.fixedMonsters.forEach(function (fm, i) {
                    if (!inBounds(fm.x, fm.y, worldW, worldH, margin)) {
                        result.addError('REACH_MONSTER_OOB', where + '.fixedMonsters[' + i + '] out of bounds: x=' + fm.x + ' y=' + fm.y);
                    }
                });
            }
        });

        // NPC positions within bounds
        if (Array.isArray(m.npcs)) {
            m.npcs.forEach(function (n, i) {
                if (n && n.position && !inBounds(n.position.x, n.position.y, worldW, worldH, 0)) {
                    result.addError('REACH_NPC_OOB', 'npc[' + i + '] "' + (n.id || '?') + '" out of bounds');
                }
            });
        }

        // D17: doorway check requires wall grid — skip (would need to regenerate map)
        // D18-19: BFS reachability requires wall grid — skip (expensive, optional)
    }

    function inBounds(x, y, w, h, margin) {
        return x >= margin && x <= w - margin && y >= margin && y <= h - margin;
    }

    // -----------------------------------------------------------------
    // E. Win path feasibility (story missions only)
    // -----------------------------------------------------------------
    function checkWinPath(m, result) {
        // For story missions with storyPhases, verify the phase graph reaches victory
        var phases = m.storyPhases;
        if (!Array.isArray(phases) || phases.length === 0) return;

        // E26: is there at least one path from first phase to an endMission/terminal phase?
        var firstPhase = phases[0];
        if (!firstPhase) {
            result.addError('WIN_NO_FIRST_PHASE', 'no first phase to start the mission');
            return;
        }

        // Walk the phase graph from the first phase — must reach an endMission or a
        // combatCollect phase whose completion naturally advances (terminal nextPhase=null
        // with endMission is valid; terminal without endMission is a dead-end only if no
        // prior phase has endMission reachable on this path).
        var visited = {};
        var current = firstPhase.id;
        var reachedEndMission = false;
        var reachedTerminal = false;
        var terminalPhase = null;
        for (var guard = 0; guard < phases.length + 1; guard++) {
            if (visited[current]) break;
            visited[current] = true;
            var p = phases.find(function (ph) { return ph.id === current; });
            if (!p) break;
            if (p.endMission) { reachedEndMission = true; break; }
            if (!p.nextPhase) { reachedTerminal = true; terminalPhase = p; break; }
            current = p.nextPhase;
        }
        if (!reachedEndMission && !reachedTerminal) {
            result.addError('WIN_NO_PATH', 'no path from first phase to an endMission/terminal phase');
        }
        // A terminal phase without endMission is a warning unless it's a combat/collect
        // phase that the engine treats as a natural victory — but our engine requires
        // storyEnded event, which only endMission or storyState.ended=true triggers.
        // So flag terminal-without-endMission as an error.
        if (reachedTerminal && !reachedEndMission && terminalPhase && !terminalPhase.endMission) {
            result.addError('WIN_NO_ENDMISSION', 'phase "' + terminalPhase.id + '" is terminal but has no endMission — mission cannot end cleanly');
        }

        // E21: defeatBoss — if a boss phase exists, combatConfig must have isBoss monster
        var hasBossPhase = phases.some(function (p) { return p.type === 'combat' && p.id && /boss/i.test(p.id); });
        if (hasBossPhase && m.combatConfig && Array.isArray(m.combatConfig.fixedMonsters)) {
            var hasBossMonster = m.combatConfig.fixedMonsters.some(function (fm) { return fm.isBoss === true; });
            if (!hasBossMonster) {
                result.addError('WIN_NO_BOSS_MONSTER', 'boss combat phase exists but combatConfig has no isBoss fixedMonster');
            }
        }

        // E20: collect phases — specialObjects total count >= required count
        phases.forEach(function (p) {
            if ((p.type === 'collect' || p.type === 'combatCollect') && p.objectType && typeof p.targetCount === 'number') {
                if (Array.isArray(m.specialObjects)) {
                    var obj = m.specialObjects.find(function (o) { return o.id === p.objectType; });
                    if (obj) {
                        var totalPlaced = Array.isArray(obj.placements) ? obj.placements.length : 0;
                        if (totalPlaced < p.targetCount) {
                            result.addError('WIN_COLLECT_SHORT',
                                'phase "' + p.id + '" requires ' + p.targetCount + ' of "' + p.objectType +
                                '" but only ' + totalPlaced + ' placed');
                        }
                    }
                }
            }
        });
    }

    // -----------------------------------------------------------------
    // F. Combat sanity
    // -----------------------------------------------------------------
    function checkCombatSanity(m, result) {
        var combatConfigs = [
            { name: 'collectCombatConfig', cc: m.collectCombatConfig },
            { name: 'combatConfig', cc: m.combatConfig }
        ];

        combatConfigs.forEach(function (entry) {
            var cc = entry.cc;
            var name = entry.name;
            if (!cc) return;

            var fixedCount = Array.isArray(cc.fixedMonsters) ? cc.fixedMonsters.length : 0;

            // F28: maxMonsters >= fixedMonsters.length
            if (typeof cc.maxMonsters === 'number' && fixedCount > cc.maxMonsters) {
                result.addError('COMBAT_MAX_TOO_LOW', name + '.maxMonsters (' + cc.maxMonsters +
                    ') < fixedMonsters.length (' + fixedCount + ') — fixed monsters cannot all spawn');
            }

            // F29: spawnRate >= 1000 (ms)
            if (typeof cc.spawnRate === 'number' && cc.spawnRate < 1000 && cc.spawnRate !== 999) {
                result.addError('COMBAT_SPAWN_RATE_LOW', name + '.spawnRate=' + cc.spawnRate +
                    ' (< 1000ms — likely seconds/ms confusion). Note: 999 is allowed as a "no spawn" sentinel.');
            }

            // F30: spawnRate 0 with random spawns
            if (cc.spawnRate === 0 && cc.randomSpawnsEnabled !== false) {
                result.addError('COMBAT_SPAWN_RATE_ZERO', name + '.spawnRate=0 with randomSpawnsEnabled — infinite spawn loop');
            }

            // F27: monstersToKill feasibility when randomSpawns disabled
            if (cc.randomSpawnsEnabled === false && typeof cc.monstersToKill === 'number') {
                if (cc.monstersToKill !== 99 && cc.monstersToKill > fixedCount) {
                    result.addError('COMBAT_KILL_INFEASIBLE', name + '.monstersToKill=' + cc.monstersToKill +
                        ' but only ' + fixedCount + ' fixedMonsters and randomSpawns disabled — cannot reach kill count');
                }
            }

            // Boss combat: monstersToKill=1 requires at least one fixedMonster
            if (cc.monstersToKill === 1 && fixedCount === 0) {
                result.addError('COMBAT_KILL_NO_MONSTERS', name + '.monstersToKill=1 but no fixedMonsters — cannot win');
            }
        });
    }

    // -----------------------------------------------------------------
    // G. World bounds
    // -----------------------------------------------------------------
    function checkWorldBounds(m, result, worldW, worldH) {
        if (m.world) {
            if (typeof m.world.width !== 'number' || m.world.width < 500) {
                result.addError('WORLD_WIDTH', 'world.width must be >= 500, got ' + m.world.width);
            }
            if (typeof m.world.height !== 'number' || m.world.height < 500) {
                result.addError('WORLD_HEIGHT', 'world.height must be >= 500, got ' + m.world.height);
            }
        }
    }

    // -----------------------------------------------------------------
    // W. Warnings (non-blocking)
    // -----------------------------------------------------------------
    function checkWarnings(m, result, worldW, worldH) {
        // W3: boss healthMultiplier > 10
        if (m.combatConfig && Array.isArray(m.combatConfig.fixedMonsters)) {
            m.combatConfig.fixedMonsters.forEach(function (fm) {
                if (fm.isBoss && fm.stats && fm.stats.healthMultiplier > 10) {
                    result.addWarning('WARN_BOSS_HP_HIGH', 'boss healthMultiplier=' + fm.stats.healthMultiplier + ' (likely unwinnable without strong ammo)');
                }
            });
        }

        // W4: collectible.count > 8
        if (Array.isArray(m.specialObjects)) {
            m.specialObjects.forEach(function (obj) {
                var total = Array.isArray(obj.placements) ? obj.placements.length : 0;
                if (total > 8) {
                    result.addWarning('WARN_COLLECT_TOO_MANY', 'specialObject "' + obj.id + '" has ' + total + ' placements (>8 — collectathon fatigue)');
                }
            });
        }

        // W5: no outro dialogue (mission ends abruptly)
        if (Array.isArray(m.storyPhases) && m.storyPhases.length > 0) {
            var lastPhase = m.storyPhases[m.storyPhases.length - 1];
            if (lastPhase && lastPhase.type !== 'dialogue' && !lastPhase.endMission) {
                result.addWarning('WARN_NO_OUTRO', 'mission ends without dialogue/outro — may feel abrupt');
            }
        }

        // W2: many rooms in compact world
        var roomCount = 0;
        if (Array.isArray(m.storyPhases)) {
            roomCount = m.storyPhases.filter(function (p) {
                return p.type === 'combatCollect' || p.type === 'puzzle' || (p.type === 'combat' && !/boss/i.test(p.id));
            }).length;
        }
        if (roomCount > 6 && worldW <= 2000) {
            result.addWarning('WARN_MANY_ROOMS_COMPACT', roomCount + ' encounters in compact (2000x2000) world — spacing may feel tight');
        }
    }

    // -----------------------------------------------------------------
    // Exports
    // -----------------------------------------------------------------
    var MissionValidatorExports = {
        validate: validate,
        ValidationResult: ValidationResult
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MissionValidatorExports;
    } else {
        window.MissionValidator = MissionValidatorExports;
    }
})();