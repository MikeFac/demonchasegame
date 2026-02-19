(function () {
    var Constants, SharedUtils;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        SharedUtils = require('../utils');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        SharedUtils = window.SharedUtils;
    }

    var generateId = SharedUtils.generateId;

    var COLLECTIBLE_CONFIG = {
        sword: { maxCount: 0, respawn: false, width: 32, height: 32 },
        belt: { maxCount: 0, respawn: true, width: 28, height: 28 },
        helmet: { maxCount: 0, respawn: false, width: 32, height: 32 },
        breastplate: { maxCount: 0, respawn: false, width: 36, height: 36 },
        sandals: { maxCount: 0, respawn: true, width: 28, height: 28 },
        shield: { maxCount: 0, respawn: false, width: 32, height: 32 }
    };

    // Weighted drop table for monster drops (higher = more common)
    var DROP_WEIGHTS = {
        belt: 30,
        sandals: 30,
        shield: 15,
        breastplate: 10,
        sword: 10,
        helmet: 5
    };

    var TOTAL_DROP_WEIGHT = Object.values(DROP_WEIGHTS).reduce(function (a, b) { return a + b; }, 0);

    class CollectibleManager {
        constructor(gameState, wallGrid) {
            this.gameState = gameState;
            this.wallGrid = wallGrid;

            if (!this.gameState.collectibles) {
                this.gameState.collectibles = [];
            }
        }

        /**
         * Spawn a collectible of the given type at a random non-wall position.
         */
        spawnCollectible(type, ignoreMaxCount) {
            if (ignoreMaxCount === undefined) ignoreMaxCount = false;
            var config = COLLECTIBLE_CONFIG[type];
            if (!config) return null;

            var currentCount = this.gameState.collectibles.filter(function (c) { return c.type === type; }).length;
            if (!ignoreMaxCount && currentCount >= config.maxCount) return null;

            var WORLD_WIDTH = Constants.WORLD_WIDTH;
            var WORLD_HEIGHT = Constants.WORLD_HEIGHT;
            var x, y;
            var attempts = 0;

            do {
                x = Math.random() * (WORLD_WIDTH - 200) + 100;
                y = Math.random() * (WORLD_HEIGHT - 200) + 100;
                attempts++;
            } while (this.wallGrid && this.wallGrid.collides(x, y, config.width, config.height) && attempts < 50);

            if (attempts >= 50) return null;

            var collectible = {
                id: generateId(4),
                x: x, y: y,
                width: config.width,
                height: config.height,
                type: type
            };

            this.gameState.collectibles.push(collectible);
            console.log('Collectible [' + type + '] spawned at (' + Math.round(x) + ', ' + Math.round(y) + ')');
            return collectible;
        }

        /**
         * Spawn a collectible at a specific position (for monster drops).
         */
        spawnCollectibleAt(type, x, y) {
            var config = COLLECTIBLE_CONFIG[type];
            if (!config) return null;

            var collectible = {
                id: generateId(4),
                x: x, y: y,
                width: config.width,
                height: config.height,
                type: type
            };

            this.gameState.collectibles.push(collectible);
            return collectible;
        }

        /**
         * Roll for a monster drop. Returns { dropped, type } or { dropped: false }.
         */
        rollMonsterDrop(x, y) {
            if (Math.random() > Constants.MONSTER_DROP_CHANCE) {
                return { dropped: false };
            }

            var roll = Math.random() * TOTAL_DROP_WEIGHT;
            var selectedType = 'belt';

            var types = Object.keys(DROP_WEIGHTS);
            for (var i = 0; i < types.length; i++) {
                roll -= DROP_WEIGHTS[types[i]];
                if (roll <= 0) {
                    selectedType = types[i];
                    break;
                }
            }

            var collectible = this.spawnCollectibleAt(selectedType, x, y);
            if (collectible) {
                return { dropped: true, type: selectedType };
            }
            return { dropped: false };
        }

        /**
         * Spawn all collectible types at level start.
         */
        initializeLevelCollectibles() {
            this.gameState.collectibles = [];

            var allTypes = Object.keys(COLLECTIBLE_CONFIG);
            var randomType = allTypes[Math.floor(Math.random() * allTypes.length)];

            this.spawnCollectible(randomType, true);

            console.log('Level collectibles spawned: ' + this.gameState.collectibles.length + ' items (Selected: ' + randomType + ')');
        }

        /**
         * Respawn belt and sandals (called on 45s timer).
         */
        respawnCollectibles() {
            var entries = Object.entries(COLLECTIBLE_CONFIG);
            for (var i = 0; i < entries.length; i++) {
                var type = entries[i][0];
                var config = entries[i][1];
                if (!config.respawn) continue;

                var currentCount = this.gameState.collectibles.filter(function (c) { return c.type === type; }).length;
                if (currentCount < config.maxCount) {
                    this.spawnCollectible(type);
                }
            }
        }

        /**
         * Remove a collectible by ID. Returns the removed item or null.
         */
        removeCollectible(id) {
            var index = this.gameState.collectibles.findIndex(function (c) { return c.id === id; });
            if (index !== -1) {
                return this.gameState.collectibles.splice(index, 1)[0];
            }
            return null;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CollectibleManager;
    } else if (typeof window !== 'undefined') {
        window.CollectibleManager = CollectibleManager;
    }
})();
