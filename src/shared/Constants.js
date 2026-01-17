const Constants = {
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 2000,
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 600,
    MONSTER_WIDTH: 50,
    MONSTER_HEIGHT: 50,
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
    PLAYER_WIDTH: 47,
    PLAYER_HEIGHT: 52
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.Constants = Constants;
}
