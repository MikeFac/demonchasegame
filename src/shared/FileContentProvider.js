/**
 * FileContentProvider - File-based implementation of ContentProvider.
 * 
 * Loads world/mission content from JSON files in the /missions directory.
 * Uses fetch in browser, fs.readFileSync on server (for initial load).
 */
(function () {
    var ContentProvider;
    
    if (typeof module !== 'undefined' && module.exports) {
        ContentProvider = require('./ContentProvider');
    } else if (typeof window !== 'undefined') {
        ContentProvider = window.ContentProvider;
    }
    
    class FileContentProvider extends ContentProvider {
        constructor() {
            super();
            this._worldsCache = null;
            this._missionsCache = {};
        }
        
        /**
         * Get list of all available worlds/chapters.
         * @returns {Promise<Array>} Array of world objects
         */
        async getWorlds() {
            if (this._worldsCache) {
                return this._worldsCache;
            }
            
            try {
                const response = await fetch('/missions/chapters.json');
                if (!response.ok) {
                    throw new Error('Failed to load chapters.json: ' + response.status);
                }
                const data = await response.json();
                this._worldsCache = data.chapters || [];
                return this._worldsCache;
            } catch (error) {
                console.error('FileContentProvider.getWorlds() error:', error);
                return [];
            }
        }
        
        /**
         * Get a single world/chapter by ID, including its missions.
         * @param {string} worldId - World/chapter ID (e.g., 'chapter1')
         * @returns {Promise<Object|null>} World object with missions array
         */
        async getWorld(worldId) {
            // Check cache first
            if (this._missionsCache[worldId]) {
                return this._missionsCache[worldId];
            }
            
            try {
                // Find the world in chapters list to get the slug
                const worlds = await this.getWorlds();
                const worldMeta = worlds.find(w => w.id === worldId);
                
                if (!worldMeta) {
                    console.warn('World not found:', worldId);
                    return null;
                }
                
                // Load the world's mission file
                const slug = worldMeta.slug || worldId;
                const response = await fetch('/missions/' + slug + '.json');
                
                if (!response.ok) {
                    console.warn('Failed to load world file:', slug + '.json');
                    return null;
                }
                
                const worldData = await response.json();
                
                // Merge metadata with mission data
                const world = {
                    ...worldMeta,
                    missions: worldData.missions || []
                };
                
                // Cache it
                this._missionsCache[worldId] = world;
                return world;
            } catch (error) {
                console.error('FileContentProvider.getWorld() error:', error);
                return null;
            }
        }
        
        /**
         * Get a specific mission within a world.
         * @param {string} worldId - World/chapter ID
         * @param {string} missionId - Mission ID (e.g., 'faith-01')
         * @returns {Promise<Object|null>} Mission object with config
         */
        async getMission(worldId, missionId) {
            const world = await this.getWorld(worldId);
            
            if (!world || !world.missions) {
                return null;
            }
            
            const mission = world.missions.find(m => m.id === missionId);
            
            if (!mission) {
                console.warn('Mission not found:', worldId, missionId);
                return null;
            }
            
            // Add world context to mission
            return {
                ...mission,
                worldId: worldId,
                worldName: world.name,
                worldTheme: world.theme,
                nodeShape: world.nodeShape
            };
        }
        
        /**
         * Check if a world is available (exists and accessible).
         * @param {string} worldId - World/chapter ID
         * @returns {Promise<boolean>}
         */
        async isWorldAvailable(worldId) {
            const world = await this.getWorld(worldId);
            return world !== null;
        }
        
        /**
         * Clear the cache (useful for development/testing).
         */
        clearCache() {
            this._worldsCache = null;
            this._missionsCache = {};
        }
    }
    
    // Export for both Node.js and browser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FileContentProvider;
    } else if (typeof window !== 'undefined') {
        window.FileContentProvider = FileContentProvider;
    }
})();
