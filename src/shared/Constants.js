const Constants = {
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 2000,
    CELL_SIZE: 25,
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 600,
    MONSTER_WIDTH: 48,
    MONSTER_HEIGHT: 48,
    MAX_HEALING_POINTS: 2,
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
    VERSE_TEST_SHIELD_DURATION: 15000  // 15s shield for shielded verse test
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.Constants = Constants;
}
