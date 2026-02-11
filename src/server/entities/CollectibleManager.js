const Constants = require('../../shared/Constants');
const crypto = require('crypto');

const COLLECTIBLE_CONFIG = {
    sword:       { maxCount: 0, respawn: false, width: 32, height: 32 },  // Only from drops
    belt:        { maxCount: 1, respawn: true,  width: 28, height: 28 },
    helmet:      { maxCount: 0, respawn: false, width: 32, height: 32 },  // Only from drops
    breastplate: { maxCount: 0, respawn: false, width: 36, height: 36 },  // Only from drops
    sandals:     { maxCount: 1, respawn: true,  width: 28, height: 28 },
    shield:      { maxCount: 1, respawn: false, width: 32, height: 32 }   // Spawns in maze
};

// Weighted drop table for monster drops (higher = more common)
const DROP_WEIGHTS = {
    belt: 30,
    sandals: 30,
    shield: 15,
    breastplate: 10,
    sword: 10,
    helmet: 5
};

const TOTAL_DROP_WEIGHT = Object.values(DROP_WEIGHTS).reduce((a, b) => a + b, 0);

class CollectibleManager {
    constructor(gameState, wallGrid) {
        this.gameState = gameState;
        this.wallGrid = wallGrid;

        // Initialize collectibles array on gameState
        if (!this.gameState.collectibles) {
            this.gameState.collectibles = [];
        }
    }

    /**
     * Spawn a collectible of the given type at a random non-wall position.
     * Respects max count per type.
     */
    spawnCollectible(type) {
        const config = COLLECTIBLE_CONFIG[type];
        if (!config) return null;

        // Check max count
        const currentCount = this.gameState.collectibles.filter(c => c.type === type).length;
        if (currentCount >= config.maxCount) return null;

        const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;
        let x, y;
        let attempts = 0;

        do {
            x = Math.random() * (WORLD_WIDTH - 200) + 100;
            y = Math.random() * (WORLD_HEIGHT - 200) + 100;
            attempts++;
        } while (this.wallGrid && this.wallGrid.collides(x, y, config.width, config.height) && attempts < 50);

        if (attempts >= 50) return null;

        const collectible = {
            id: crypto.randomBytes(4).toString('hex'),
            x, y,
            width: config.width,
            height: config.height,
            type
        };

        this.gameState.collectibles.push(collectible);
        console.log(`Collectible [${type}] spawned at (${Math.round(x)}, ${Math.round(y)})`);
        return collectible;
    }

    /**
     * Spawn a collectible at a specific position (for monster drops).
     * Does NOT respect max count — drops are bonus items.
     */
    spawnCollectibleAt(type, x, y) {
        const config = COLLECTIBLE_CONFIG[type];
        if (!config) return null;

        const collectible = {
            id: crypto.randomBytes(4).toString('hex'),
            x, y,
            width: config.width,
            height: config.height,
            type
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

        // Weighted random selection
        let roll = Math.random() * TOTAL_DROP_WEIGHT;
        let selectedType = 'belt'; // fallback

        for (const [type, weight] of Object.entries(DROP_WEIGHTS)) {
            roll -= weight;
            if (roll <= 0) {
                selectedType = type;
                break;
            }
        }

        const collectible = this.spawnCollectibleAt(selectedType, x, y);
        if (collectible) {
            return { dropped: true, type: selectedType };
        }
        return { dropped: false };
    }

    /**
     * Spawn all collectible types at level start.
     */
    initializeLevelCollectibles() {
        // Clear existing
        this.gameState.collectibles = [];

        // Spawn each type up to its maxCount
        for (const [type, config] of Object.entries(COLLECTIBLE_CONFIG)) {
            for (let i = 0; i < config.maxCount; i++) {
                this.spawnCollectible(type);
            }
        }

        console.log(`Level collectibles spawned: ${this.gameState.collectibles.length} items`);
    }

    /**
     * Respawn belt and sandals (called on 45s timer).
     */
    respawnCollectibles() {
        for (const [type, config] of Object.entries(COLLECTIBLE_CONFIG)) {
            if (!config.respawn) continue;

            const currentCount = this.gameState.collectibles.filter(c => c.type === type).length;
            if (currentCount < config.maxCount) {
                this.spawnCollectible(type);
            }
        }
    }

    /**
     * Remove a collectible by ID. Returns the removed item or null.
     */
    removeCollectible(id) {
        const index = this.gameState.collectibles.findIndex(c => c.id === id);
        if (index !== -1) {
            return this.gameState.collectibles.splice(index, 1)[0];
        }
        return null;
    }
}

module.exports = CollectibleManager;
