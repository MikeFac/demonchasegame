/**
 * ProgressManager - Local progress persistence for missions.
 * 
 * Stores completed missions, unlocked chapters, and XP in localStorage.
 * Designed to be easily extended for server-side sync in the future.
 */
(function () {
    
    const STORAGE_KEY = 'missionProgress';
    const SCHEMA_VERSION = 1;
    
    // Default progress state
    const DEFAULT_PROGRESS = {
        schemaVersion: SCHEMA_VERSION,
        completedMissions: [],
        currentWorldId: 'chapter1',
        unlockedWorlds: ['chapter1'],
        missionStars: {},
        totalXP: 0,
        lastPlayedAt: null
    };
    
    class ProgressManager {
        constructor() {
            this._progress = null;
            this._syncManager = null;
            this._load();
        }
        
        /**
         * Wire up a SyncManager for automatic change queuing.
         * @param {SyncManager} syncManager
         */
        setSyncManager(syncManager) {
            this._syncManager = syncManager;
        }
        
        /**
         * Load progress from localStorage.
         */
        _load() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const data = JSON.parse(stored);
                    
                    // Validate schema version
                    if (data.schemaVersion !== SCHEMA_VERSION) {
                        console.warn('ProgressManager: Schema version mismatch, resetting');
                        this._progress = { ...DEFAULT_PROGRESS };
                        return;
                    }
                    
                    this._progress = data;
                } else {
                    this._progress = { ...DEFAULT_PROGRESS };
                }
            } catch (error) {
                console.error('ProgressManager: Failed to load progress', error);
                this._progress = { ...DEFAULT_PROGRESS };
            }
        }
        
        /**
         * Save progress to localStorage.
         */
        _save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this._progress));
            } catch (error) {
                console.error('ProgressManager: Failed to save progress', error);
            }
        }
        
        /**
         * Get current progress state.
         * @returns {Object} Progress object
         */
        getProgress() {
            return { ...this._progress };
        }
        
        /**
         * Check if a mission has been completed.
         * @param {string} missionId - Mission ID
         * @returns {boolean}
         */
        isMissionCompleted(missionId) {
            return this._progress.completedMissions.includes(missionId);
        }
        
        /**
         * Get count of completed missions in a world.
         * @param {string} worldId - World ID
         * @param {Array} missionIds - Array of mission IDs in the world
         * @returns {number} Number of completed missions
         */
        getCompletedCount(worldId, missionIds) {
            return missionIds.filter(id => this.isMissionCompleted(id)).length;
        }
        
        /**
         * Mark a mission as completed.
         * @param {string} missionId - Mission ID
         * @param {number} stars - Number of stars earned (1-3)
         * @param {number} xpEarned - XP earned from mission
         */
        completeMission(missionId, stars = 1, xpEarned = 0) {
            if (!this._progress.completedMissions.includes(missionId)) {
                this._progress.completedMissions.push(missionId);
            }
            
            // Update stars (keep best)
            const currentStars = this._progress.missionStars[missionId] || 0;
            if (stars > currentStars) {
                this._progress.missionStars[missionId] = stars;
            }
            
            // Add XP
            this._progress.totalXP += xpEarned;
            
            // Update timestamp
            this._progress.lastPlayedAt = new Date().toISOString();
            
            this._save();
            
            // Queue change for server sync
            if (this._syncManager) {
                this._syncManager.queueChange({
                    type: 'missionComplete',
                    missionId, stars, xpEarned,
                    timestamp: Date.now()
                });
            }
            
            console.log('ProgressManager: Mission completed', missionId, 'stars:', stars, 'XP:', xpEarned);
        }
        
        /**
         * Check if a world is unlocked.
         * @param {string} worldId - World ID
         * @returns {boolean}
         */
        isWorldUnlocked(worldId) {
            return this._progress.unlockedWorlds.includes(worldId);
        }
        
        /**
         * Unlock a world.
         * @param {string} worldId - World ID
         */
        unlockWorld(worldId) {
            if (!this._progress.unlockedWorlds.includes(worldId)) {
                this._progress.unlockedWorlds.push(worldId);
                this._save();
                
                // Queue change for server sync
                if (this._syncManager) {
                    this._syncManager.queueChange({
                        type: 'worldUnlock',
                        worldId,
                        timestamp: Date.now()
                    });
                }
                
                console.log('ProgressManager: World unlocked', worldId);
            }
        }
        
        /**
         * Check and update world unlocks based on progress.
         * @param {Array} worlds - Array of world objects with unlockRequirements
         */
        async checkUnlocks(worlds) {
            for (const world of worlds) {
                if (this.isWorldUnlocked(world.id)) continue;
                
                if (!world.unlockRequirement) {
                    // No requirement = always unlocked
                    this.unlockWorld(world.id);
                    continue;
                }
                
                const req = world.unlockRequirement;
                if (req.chapterId && req.missionsCompleted) {
                    // Get mission IDs for required world
                    const reqWorld = worlds.find(w => w.id === req.chapterId);
                    if (reqWorld && reqWorld.missionIds) {
                        const completed = this.getCompletedCount(req.chapterId, reqWorld.missionIds);
                        if (completed >= req.missionsCompleted) {
                            this.unlockWorld(world.id);
                        }
                    }
                }
            }
        }
        
        /**
         * Get current world ID.
         * @returns {string}
         */
        getCurrentWorldId() {
            return this._progress.currentWorldId;
        }
        
        /**
         * Set current world ID.
         * @param {string} worldId - World ID
         */
        setCurrentWorld(worldId) {
            this._progress.currentWorldId = worldId;
            this._save();
        }
        
        /**
         * Get stars for a mission.
         * @param {string} missionId - Mission ID
         * @returns {number} Stars (0-3)
         */
        getMissionStars(missionId) {
            return this._progress.missionStars[missionId] || 0;
        }
        
        /**
         * Get total XP.
         * @returns {number}
         */
        getTotalXP() {
            return this._progress.totalXP;
        }
        
        /**
         * Overwrite local progress with server-synced data.
         * Used by SyncManager after a successful sync.
         * 
         * Note: The server sends Mongoose docs where `missionStars` is a Map object.
         * We convert it to a plain object for localStorage compatibility.
         * @param {Object} syncedProgress - Progress data from server
         */
        overwriteProgress(syncedProgress) {
            // Convert Mongoose Maps to plain objects (missionStars comes as { _data: ... } or entries)
            let stars = syncedProgress.missionStars || this._progress.missionStars;
            if (stars && typeof stars === 'object' && !(stars instanceof Object && !Array.isArray(stars))) {
                // Already a plain object, fine
            }
            // If it's a Mongoose Map or has entries(), convert it
            if (stars && typeof stars.entries === 'function') {
                const plain = {};
                for (const [k, v] of stars.entries()) {
                    plain[k] = v;
                }
                stars = plain;
            }
            // If it has $__, it's a Mongoose subdoc — use toJSON
            if (stars && stars.toJSON) {
                stars = stars.toJSON();
            }

            this._progress = {
                ...this._progress,
                completedMissions: syncedProgress.completedMissions || this._progress.completedMissions,
                unlockedWorlds: syncedProgress.unlockedWorlds || this._progress.unlockedWorlds,
                missionStars: stars,
                totalXP: Math.max(this._progress.totalXP, syncedProgress.totalXP || 0),
                lastPlayedAt: syncedProgress.updatedAt || this._progress.lastPlayedAt
            };
            this._save();
            
            // Trigger any UI updates needed
            window.dispatchEvent(new CustomEvent('progressUpdated', { detail: this._progress }));
        }

        /**
         * Reset all progress.
         */
        reset() {
            this._progress = { ...DEFAULT_PROGRESS };
            this._save();
            console.log('ProgressManager: Progress reset');
        }
    }
    
    // Create singleton instance
    var progressManagerInstance = new ProgressManager();
    
    // Export for browser (localStorage is browser-only)
    if (typeof window !== 'undefined') {
        window.ProgressManager = ProgressManager;
        window.progressManager = progressManagerInstance;
    }
})();
