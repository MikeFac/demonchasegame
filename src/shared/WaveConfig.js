(function () {

/**
 * WaveConfig — Wave definitions for the Wave Assault game mode.
 *
 * Each wave defines:
 *   rows/cols   — formation grid size
 *   demons      — array of demon types to randomly pick from
 *   formationSpeed — horizontal sway speed (px per frame)
 *   diveChance  — probability per frame per demon of starting a dive
 *   maxDivers   — max simultaneous diving demons
 *   diveSpeed   — downward speed of diving demons
 *   boss        — optional boss config (center of formation)
 */

var ARENA_WIDTH = 800;
var ARENA_HEIGHT = 1000;

var FORMATION_START_Y = 80;
var FORMATION_SPACING_X = 64;
var FORMATION_SPACING_Y = 60;

var PLAYER_Y = ARENA_HEIGHT - 80;
var PLAYER_WIDTH = 48;
var PLAYER_HEIGHT = 48;
var PLAYER_SPEED = 7;

var PROJECTILE_SPEED = 12;
var PROJECTILE_WIDTH = 6;
var PROJECTILE_HEIGHT = 14;
var FIRE_COOLDOWN = 250; // ms between shots
var QUIZ_FAIL_FIRE_LOCKOUT_MS = 15000; // ms unable to fire after failing a quiz

var QUIZ_PAUSE_INTERVAL = 10000; // ms between quiz pauses
var INITIAL_QUIZ_PAUSE_DELAY = 4500; // ms before the first quiz appears

var WAVE_DATA = {
    1: {
        name: 'The Fearful',
        rows: 3,
        cols: 4,
        demons: ['Fear', 'Doubt'],
        formationSpeed: 1.0,
        swayRange: 100,
        diveChance: 0.0018,
        maxDivers: 2,
        diveSpeed: 3.8,
        diveTrackingFactor: 0.028
    },
    2: {
        name: 'Shadows of Shame',
        rows: 3,
        cols: 5,
        demons: ['Shame', 'Confusion', 'Fear'],
        formationSpeed: 1.3,
        swayRange: 120,
        diveChance: 0.0026,
        maxDivers: 3,
        diveSpeed: 4.2,
        diveTrackingFactor: 0.032
    },
    3: {
        name: 'Deceptive Forces',
        rows: 4,
        cols: 5,
        demons: ['Deception', 'Blindness', 'Ignorance', 'Confusion'],
        formationSpeed: 1.5,
        swayRange: 130,
        diveChance: 0.003,
        maxDivers: 3,
        diveSpeed: 4.8,
        diveTrackingFactor: 0.038
    },
    4: {
        name: 'Stronghold Assault',
        rows: 4,
        cols: 6,
        demons: ['Condemnation', 'Unbelief', 'Strife', 'Despair'],
        formationSpeed: 1.8,
        swayRange: 140,
        diveChance: 0.0035,
        maxDivers: 4,
        diveSpeed: 5.2,
        diveTrackingFactor: 0.045
    },
    5: {
        name: 'Pride\'s Last Stand',
        rows: 5,
        cols: 7,
        demons: ['Pride', 'Temptation', 'Strife', 'Fear'],
        formationSpeed: 2.0,
        swayRange: 150,
        diveChance: 0.004,
        maxDivers: 4,
        diveSpeed: 5.8,
        diveTrackingFactor: 0.05,
        boss: {
            demonType: 'Pride',
            label: 'Pride Lord',
            healthMultiplier: 4.0,
            sizeMultiplier: 1.4
        }
    }
};

var WaveConfig = {
    ARENA_WIDTH: ARENA_WIDTH,
    ARENA_HEIGHT: ARENA_HEIGHT,
    FORMATION_START_Y: FORMATION_START_Y,
    FORMATION_SPACING_X: FORMATION_SPACING_X,
    FORMATION_SPACING_Y: FORMATION_SPACING_Y,
    PLAYER_Y: PLAYER_Y,
    PLAYER_WIDTH: PLAYER_WIDTH,
    PLAYER_HEIGHT: PLAYER_HEIGHT,
    PLAYER_SPEED: PLAYER_SPEED,
    PROJECTILE_SPEED: PROJECTILE_SPEED,
    PROJECTILE_WIDTH: PROJECTILE_WIDTH,
    PROJECTILE_HEIGHT: PROJECTILE_HEIGHT,
    FIRE_COOLDOWN: FIRE_COOLDOWN,
    QUIZ_FAIL_FIRE_LOCKOUT_MS: QUIZ_FAIL_FIRE_LOCKOUT_MS,
    QUIZ_PAUSE_INTERVAL: QUIZ_PAUSE_INTERVAL,
    INITIAL_QUIZ_PAUSE_DELAY: INITIAL_QUIZ_PAUSE_DELAY,
    WAVE_DATA: WAVE_DATA,
    TOTAL_WAVES: Object.keys(WAVE_DATA).length,

    getWave: function (waveNumber) {
        return WAVE_DATA[waveNumber] || null;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveConfig;
} else if (typeof window !== 'undefined') {
    window.WaveConfig = WaveConfig;
}
})();
