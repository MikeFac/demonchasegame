var Constants, LevelConfig;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('./Constants');
    LevelConfig = require('./LevelConfig');
} else {
    Constants = window.Constants;
    LevelConfig = window.LevelConfig;
}

// Default quiz balance (used as starting point in UI, independent of monster difficulty)
const DEFAULT_QUIZ_SETTINGS = {
  firstLetter: 30,
  missingWord: 30,
  categoryMatch: 25,
  trueFalse: 15
};

// Quick-select quiz balance presets (separate from monster difficulty presets)
const QUIZ_BALANCE_PRESETS = {
  easy: {
    name: 'Easy Quizzes',
    settings: { firstLetter: 5, missingWord: 15, categoryMatch: 30, trueFalse: 50 }
  },
  balanced: {
    name: 'Balanced',
    settings: { firstLetter: 30, missingWord: 30, categoryMatch: 25, trueFalse: 15 }
  },
  hard: {
    name: 'Hard Quizzes',
    settings: { firstLetter: 50, missingWord: 25, categoryMatch: 10, trueFalse: 15 }
  }
};

// Monster difficulty presets (does NOT include quiz settings — they are independent)
const PRESETS = {
  easy: {
    name: 'Easy',
    description: 'Relaxed pace, weaker monsters, generous resources',
    multipliers: {
      monsterHealth: 0.7,          // 70% health
      monsterDamage: 0.7,          // 70% damage
      monsterSpeed: 0.8,           // 80% speed
      spawnRate: 1.5,              // 50% slower spawning (multiply interval)
      healingSpawnRate: 0.7,       // 30% faster healing spawns
      maxMonsters: 0.7             // 70% max concurrent monsters
    }
  },
  normal: {
    name: 'Normal',
    description: 'Balanced gameplay',
    multipliers: {
      monsterHealth: 1.0,
      monsterDamage: 1.0,
      monsterSpeed: 1.0,
      spawnRate: 1.0,
      healingSpawnRate: 1.0,
      maxMonsters: 1.0
    }
  },
  hard: {
    name: 'Hard',
    description: 'Intense challenge, stronger monsters, scarce resources',
    multipliers: {
      monsterHealth: 1.5,          // 50% more health
      monsterDamage: 1.5,          // 50% more damage
      monsterSpeed: 1.2,           // 20% faster
      spawnRate: 0.7,              // 30% faster spawning (multiply interval)
      healingSpawnRate: 1.5,       // 50% slower healing spawns
      maxMonsters: 1.3             // 30% more concurrent monsters
    }
  }
};

/**
 * Validate quiz settings: all 4 keys present, all non-negative integers, sum to 100
 */
function validateQuizSettings(qs) {
  if (!qs || typeof qs !== 'object') return false;
  const keys = ['firstLetter', 'missingWord', 'categoryMatch', 'trueFalse'];
  for (const k of keys) {
    if (typeof qs[k] !== 'number' || qs[k] < 0 || !Number.isInteger(qs[k])) return false;
  }
  const total = keys.reduce((sum, k) => sum + qs[k], 0);
  return total === 100;
}

/**
 * Create game config by merging monster preset with base values.
 * Quiz settings are passed separately (independent of monster difficulty).
 * @param {string} presetName - Monster difficulty preset ('easy', 'normal', 'hard')
 * @param {Object|null} customQuizSettings - Custom quiz balance, or null for defaults
 */
function createGameConfig(presetName = 'normal', customQuizSettings = null) {
  const preset = PRESETS[presetName] || PRESETS.normal;
  const m = preset.multipliers;

  // Apply multipliers to base LevelConfig values
  const levelData = {};
  for (const [level, data] of Object.entries(LevelConfig.levelData)) {
    levelData[level] = {
      ...data,
      monsterDamageFactor: data.monsterDamageFactor * m.monsterDamage,
      monsterSpeed: Math.round(data.monsterSpeed * m.monsterSpeed),
      playerSpeed: data.playerSpeed, // Don't scale player speed
      spawnRate: Math.round(data.spawnRate * m.spawnRate),
      maxMonsters: Math.round(data.maxMonsters * m.maxMonsters)
    };
  }

  // Use custom quiz settings if valid, otherwise defaults
  const quizSettings = (customQuizSettings && validateQuizSettings(customQuizSettings))
    ? { ...customQuizSettings }
    : { ...DEFAULT_QUIZ_SETTINGS };

  return {
    preset: presetName,
    presetName: preset.name,
    description: preset.description,

    // Override Constants
    constants: {
      ...Constants,
      MAX_HEALING_POINTS: Math.round(Constants.MAX_HEALING_POINTS * m.healingSpawnRate),
      HEALING_SPAWN_INTERVAL: Math.round(30000 * m.healingSpawnRate)
    },

    // Override LevelConfig
    levelData: levelData,

    // Store raw multipliers for display/editing
    multipliers: m,

    // Monster health multiplier (applied per monster)
    monsterHealthMultiplier: m.monsterHealth,

    // Quiz settings (independent of monster difficulty)
    quizSettings: quizSettings
  };
}

var GameConfigExports = {
  PRESETS,
  DEFAULT_QUIZ_SETTINGS,
  QUIZ_BALANCE_PRESETS,
  validateQuizSettings,
  createGameConfig,
  getPresetList: () => Object.keys(PRESETS).map(key => ({
    id: key,
    name: PRESETS[key].name,
    description: PRESETS[key].description
  })),
  getQuizPresetList: () => Object.keys(QUIZ_BALANCE_PRESETS).map(key => ({
    id: key,
    name: QUIZ_BALANCE_PRESETS[key].name,
    settings: QUIZ_BALANCE_PRESETS[key].settings
  }))
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfigExports;
} else {
  window.GameConfig = GameConfigExports;
}
