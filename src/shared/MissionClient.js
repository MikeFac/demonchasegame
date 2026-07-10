/**
 * MissionClient - Frontend API client for mission content.
 * 
 * Provides a convenient interface for the game to load and query
 * worlds/missions. Uses ContentProvider under the hood.
 */
(function () {
    
    var FileContentProvider;
    
    if (typeof module !== 'undefined' && module.exports) {
        FileContentProvider = require('./FileContentProvider');
    } else if (typeof window !== 'undefined') {
        FileContentProvider = window.FileContentProvider;
    }
    
    class MissionClient {
        constructor() {
            this.provider = new FileContentProvider();
            this._initialized = false;
        }
        
        /**
         * Initialize the client and load world data.
         * @returns {Promise<boolean>} True if initialization succeeded
         */
        async initialize() {
            if (this._initialized) return true;
            
            try {
                await this.provider.getWorlds();
                this._initialized = true;
                console.log('MissionClient: Initialized successfully');
                return true;
            } catch (error) {
                console.error('MissionClient: Initialization failed', error);
                return false;
            }
        }
        
        /**
         * Get all available worlds/chapters.
         * @returns {Promise<Array>} Array of world objects
         */
        async getWorlds() {
            await this.initialize();
            return this.provider.getWorlds();
        }
        
        /**
         * Get a specific world with its missions.
         * @param {string} worldId - World ID (e.g., 'chapter1')
         * @returns {Promise<Object|null>} World object with missions
         */
        async getWorld(worldId) {
            await this.initialize();
            return this.provider.getWorld(worldId);
        }
        
        /**
         * Get a specific mission.
         * @param {string} worldId - World ID
         * @param {string} missionId - Mission ID
         * @returns {Promise<Object|null>} Mission object
         */
        async getMission(worldId, missionId) {
            await this.initialize();
            return this.provider.getMission(worldId, missionId);
        }
        
        /**
         * Get the first world (default starting point).
         * @returns {Promise<Object|null>} First world object
         */
        async getFirstWorld() {
            const worlds = await this.getWorlds();
            return worlds.length > 0 ? worlds[0] : null;
        }
        
        /**
         * Get the first mission of a world.
         * @param {string} worldId - World ID
         * @returns {Promise<Object|null>} First mission object
         */
        async getFirstMission(worldId) {
            const world = await this.getWorld(worldId);
            if (!world || !world.missions || world.missions.length === 0) {
                return null;
            }
            return this.getMission(worldId, world.missions[0].id);
        }
        
        /**
         * Convert mission config to game-compatible format.
         * This bridges the mission schema to the existing game config.
         * @param {Object} mission - Mission object
         * @returns {Object} Game-compatible config
         */
        missionToGameConfig(mission) {
            if (!mission) return null;
            
            var result = {
                // Mission metadata
                missionId: mission.id,
                missionName: mission.name,
                missionDescription: mission.description,
                worldId: mission.worldId,
                worldTheme: mission.worldTheme,
                missionType: mission.type || 'verse',
                packId: mission.packId || null,
                unitIds: Array.isArray(mission.unitIds) ? mission.unitIds.slice() : null,
                
                // Level config (single level for mission)
                levelData: {
                    1: {
                        qualities: mission.qualities,
                        monsters: mission.monsters,
                        monsterDamageFactor: mission.monsterDamageFactor,
                        playerSpeed: mission.playerSpeed,
                        monsterSpeed: mission.monsterSpeed,
                        spawnRate: mission.spawnRate,
                        maxMonsters: mission.maxMonsters,
                        monstersToKill: mission.monstersToKill,
                        terrainTheme: mission.worldTheme || 'stone'
                    }
                },
                
                // Map style
                mapStyle: mission.mapStyle || 'classic',
                
                // XP multiplier for rewards
                xpMultiplier: mission.xpMultiplier || 1.0,
                quizSettings: mission.quizSettings || null,
                disableLevelBoss: mission.disableLevelBoss === true,

                // Optional authored encounter controls
                fixedMonsters: Array.isArray(mission.fixedMonsters) ? mission.fixedMonsters.slice() : [],
                randomSpawnsEnabled: mission.randomSpawnsEnabled !== false,
                randomSpawnBudget: typeof mission.randomSpawnBudget === 'number' ? mission.randomSpawnBudget : undefined,
                
                // Single level game
                maxLevels: 1
            };
            
            // Pass through story mission fields unchanged
            if (Array.isArray(mission.storyPhases)) {
                result.storyPhases = mission.storyPhases.slice();
            }
            if (Array.isArray(mission.npcs)) {
                result.npcs = mission.npcs.slice();
            }
            if (Array.isArray(mission.specialObjects)) {
                result.specialObjects = mission.specialObjects.slice();
            }
            if (Array.isArray(mission.puzzles)) {
                result.puzzles = mission.puzzles.slice();
            }
            if (mission.collectCombatConfig && typeof mission.collectCombatConfig === 'object') {
                result.collectCombatConfig = mission.collectCombatConfig;
            }
            if (mission.combatConfig && typeof mission.combatConfig === 'object') {
                result.combatConfig = mission.combatConfig;
            }
            if (mission.world && typeof mission.world === 'object') {
                result.world = mission.world;
            }
            if (mission.music && typeof mission.music === 'object') {
                result.music = mission.music;
            }
            
            return result;
        }
    }
    
    // Create singleton instance
    var missionClientInstance = new MissionClient();
    
    // Export for both Node.js and browser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MissionClient, missionClient: missionClientInstance };
    } else if (typeof window !== 'undefined') {
        window.MissionClient = MissionClient;
        window.missionClient = missionClientInstance;
    }
})();
