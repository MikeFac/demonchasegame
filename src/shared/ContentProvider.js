/**
 * ContentProvider - Abstract interface for loading game content.
 * 
 * This abstraction layer allows swapping between file-based content loading
 * (current implementation) and database-driven content loading (future).
 * 
 * Implementations:
 * - FileContentProvider: Loads from JSON files (current)
 * - DatabaseContentProvider: Loads from API/database (future)
 */
(function () {
    
    /**
     * Abstract ContentProvider class.
     * All methods return Promises for async compatibility with future API calls.
     */
    class ContentProvider {
        
        /**
         * Get list of all available worlds/chapters.
         * @returns {Promise<Array>} Array of world objects with id, name, description, etc.
         */
        async getWorlds() {
            throw new Error('ContentProvider.getWorlds() must be implemented');
        }
        
        /**
         * Get a single world/chapter by ID, including its missions.
         * @param {string} worldId - World/chapter ID (e.g., 'chapter1')
         * @returns {Promise<Object>} World object with missions array
         */
        async getWorld(worldId) {
            throw new Error('ContentProvider.getWorld() must be implemented');
        }
        
        /**
         * Get a specific mission within a world.
         * @param {string} worldId - World/chapter ID
         * @param {string} missionId - Mission ID (e.g., 'faith-01')
         * @returns {Promise<Object>} Mission object with config
         */
        async getMission(worldId, missionId) {
            throw new Error('ContentProvider.getMission() must be implemented');
        }
        
        /**
         * Check if a world is available (exists and accessible).
         * @param {string} worldId - World/chapter ID
         * @returns {Promise<boolean>}
         */
        async isWorldAvailable(worldId) {
            throw new Error('ContentProvider.isWorldAvailable() must be implemented');
        }
    }
    
    // Export for both Node.js and browser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ContentProvider;
    } else if (typeof window !== 'undefined') {
        window.ContentProvider = ContentProvider;
    }
})();
