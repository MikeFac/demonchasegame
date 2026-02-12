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
    VERSE_TEST_HEALTH_REWARD: 10,
    VERSE_TEST_SHIELD_DURATION: 15000,  // 15s shield for shielded verse test

    // Collectible Constants
    COLLECTIBLE_SPAWN_INTERVAL: 45000,  // 45s respawn for belt/sandals
    MONSTER_DROP_CHANCE: 0.50,          // 50% chance on kill

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
    SPEED_SLOW: 0.3,
    SPEED_NORMAL: 0.5,
    SPEED_FAST: 1.0
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.Constants = Constants;
}
