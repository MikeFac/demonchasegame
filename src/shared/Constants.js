const Constants = {
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    CELL_SIZE: 25,
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 600,
    MONSTER_WIDTH: 48,
    MONSTER_HEIGHT: 48,
    MAX_HEALING_POINTS: 5,
    HEALING_POINT_WIDTH: 16,
    HEALING_POINT_HEIGHT: 16,
    MIN_WALK_DISTANCE: 40,
    MAX_WALK_DISTANCE: 300,
    MINIMUM_DISTANCE: 30, // Minimum distance between player and monster
    QUALITY_LINE_HEIGHT: 45,
    BUTTON_WIDTH: 84,
    BUTTON_HEIGHT: 21,
    BUTTON_PADDING: 4,
    ANSWER_SECTION_HEIGHT: 17,
    PLAYER_WIDTH: 48,
    PLAYER_HEIGHT: 48,

    // Bullet Constants
    BULLET_SPEED: 15, // projectile speed
    BULLET_RADIUS: 4,
    BULLET_DAMAGE: 2,  // Damage per hit (not lethal)
    AMMO_COST: 1,
    AMMO_REWARD: 2,

    // Shield Constants
    MAX_SHIELD_POINTS: 1,       // One shield per level
    SHIELD_POINT_WIDTH: 32,
    SHIELD_POINT_HEIGHT: 32,
    SHIELD_DURATION: 10000,      // 10 seconds of invincibility

    // Verse Test Rewards
    VERSE_TEST_AMMO_REWARD: 5,
    VERSE_TEST_XP_REWARD: 15,
    VERSE_TEST_HEALTH_REWARD: 20,
    VERSE_TEST_SHIELD_DURATION: 15000,  // 15s shield for shielded verse test

    // Collectible Constants
    COLLECTIBLE_SPAWN_INTERVAL: 45000,  // 45s respawn for belt/sandals
    MONSTER_DROP_CHANCE: 0.60,          // 60% chance on kill

    // Sword of the Spirit
    SWORD_DURATION: 10000,              // 10s
    SWORD_DAMAGE_MULTIPLIER: 2,
    SWORD_PIERCE_COUNT: 2,

    // Belt of Truth
    BELT_REVEAL_COUNT: 1,               // Remove 1 wrong answer

    // Helmet of Salvation
    HELMET_REVIVE_HP_PERCENT: 0.25,     // Revive at 25% HP

    // Breastplate of Righteousness
    BREASTPLATE_DURATION: 15000,        // 15s
    BREASTPLATE_REDUCTION: 0.5,         // 50% damage reduction

    // Sandals of Peace
    SANDALS_DURATION: 12000,            // 12s
    SANDALS_SPEED_BOOST: 1.5,           // +50% move speed
    SANDALS_SLOW_RADIUS: 150,           // pixels
    SANDALS_SLOW_FACTOR: 0.7,           // 30% slow

    // Game Speed Presets
    SPEED_SLOW: 0.45,
    SPEED_NORMAL: 0.75,
    SPEED_FAST: 1.5,

    // === Demon Special Abilities ===

    // Freezing Aura (Fear, Doubt, Depression, Despair)
    FREEZE_AURA_RADIUS: 150,        // pixels - proximity range
    FREEZE_AURA_SLOW: 0.6,          // 40% slow (multiply speed by 0.6)

    // Erratic Movement (Confusion, Deception, Ignorance, Blindness)
    ERRATIC_CHANCE: 0.30,            // 30% chance per move update to zig-zag
    ERRATIC_ANGLE_OFFSET: Math.PI / 3, // Max angle deviation (60 degrees)

    // Armored Shell (Pride, Condemnation, Unbelief)
    STRONGHOLD_HP_MULTIPLIER: 2.0,   // 2x base health
    PRIDE_ARMOR_HITS: 3,             // Hits absorbed before taking damage

    // Spirit Drain (Poverty, Temptation)
    DRAIN_CHANCE: 0.40,              // 40% chance per hit on player
    POVERTY_XP_DRAIN: 5,             // XP drained per proc
    TEMPTATION_AMMO_DRAIN: 5,        // Ammo drained per proc

    // Dash Attack (Strife)
    DASH_CHANCE: 0.15,               // 15% chance per move update
    DASH_SPEED_MULT: 3.0,            // 3x speed during dash
    DASH_DURATION: 500,              // ms - how long a dash lasts
    DASH_COOLDOWN: 5000,             // ms - cooldown between dashes

    // Demon type groupings (for ability lookups)
    PARALYZER_DEMONS: ['Fear', 'Doubt', 'Depression', 'Despair'],
    MISLEADER_DEMONS: ['Confusion', 'Deception', 'Ignorance', 'Blindness'],
    STRONGHOLD_DEMONS: ['Pride', 'Condemnation', 'Unbelief'],
    THIEF_DEMONS: ['Poverty', 'Temptation', 'Shame'],
    AGGRESSOR_DEMONS: ['Strife']
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.Constants = Constants;
}
