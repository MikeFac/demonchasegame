(function () {
    'use strict';

    /**
     * StoryContentProvider - Loads story mission JSON.
     * Uses the same FileContentProvider fetch pattern for browser-side loading.
     */
    class StoryContentProvider {
        constructor() {
            this._cache = {};
        }

        async loadStoryMission(worldId, missionId) {
            var cacheKey = worldId + '/' + missionId;
            if (this._cache[cacheKey]) {
                return this._cache[cacheKey];
            }

            try {
                var MissionClient;
                if (typeof module !== 'undefined' && module.exports) {
                    MissionClient = require('../MissionClient').missionClient;
                } else if (typeof window !== 'undefined') {
                    MissionClient = window.missionClient;
                }

                if (MissionClient) {
                    var mission = await MissionClient.getMission(worldId, missionId);
                    if (mission) {
                        this._cache[cacheKey] = mission;
                    }
                    return mission;
                }
            } catch (err) {
                console.error('StoryContentProvider.loadStoryMission error:', err);
            }

            return null;
        }
    }

    var instance = new StoryContentProvider();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { StoryContentProvider: StoryContentProvider, storyContentProvider: instance };
    } else if (typeof window !== 'undefined') {
        window.StoryContentProvider = StoryContentProvider;
        window.storyContentProvider = instance;
    }
})();