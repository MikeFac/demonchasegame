(function () {
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
  firstLetter: 25,
  missingWord: 25,
  categoryMatch: 20,
  trueFalse: 15,
  cloze: 15
};

// Quick-select quiz balance presets (separate from monster difficulty presets)
const QUIZ_BALANCE_PRESETS = {
  easy: {
    name: 'Easy Quizzes',
    settings: { firstLetter: 5, missingWord: 15, categoryMatch: 30, trueFalse: 40, cloze: 10 }
  },
  balanced: {
    name: 'Balanced',
    settings: { firstLetter: 25, missingWord: 25, categoryMatch: 20, trueFalse: 15, cloze: 15 }
  },
  hard: {
    name: 'Hard Quizzes',
    settings: { firstLetter: 40, missingWord: 20, categoryMatch: 10, trueFalse: 10, cloze: 20 }
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
    },
    meleeHitProbabilityNoAnswer: 0.2  // 20% chance to hit without answering quiz
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
    },
    meleeHitProbabilityNoAnswer: 0.0  // Must answer quiz to hit in normal mode
  },
  hard: {
    name: 'Hard',
    description: 'Intense challenge. stronger monsters, scarce resources',
    multipliers: {
      monsterHealth: 1.5,          // 50% more health
      monsterDamage: 1.5,          // 50% more damage
      monsterSpeed: 1.2,           // 20% faster
      spawnRate: 0.7,              // 30% faster spawning (multiply interval)
      healingSpawnRate: 1.5,       // 50% slower healing spawns
      maxMonsters: 1.3             // 30% more concurrent monsters
    },
    meleeHitProbabilityNoAnswer: 0.0  // Must answer quiz to hit (current behavior)
  },
  fun: {
    name: 'Fun Mode',
    description: 'Arcade action! Fast combat, lots of ammo. optional quizzes',
    multipliers: {
      monsterHealth: 0.5,          // 50% health (easy to kill)
      monsterDamage: 0.5,          // 50% damage (forgiving)
      monsterSpeed: 1.2,           // 20% faster (more exciting)
      spawnRate: 0.6,              // 40% faster spawning (more enemies)
      healingSpawnRate: 0.5,       // 50% more frequent healing
      maxMonsters: 1.5             // 50% more enemies on screen
    },
    meleeHitProbabilityNoAnswer: 0.8,  // 80% chance to hit without answering quiz
    startingAmmo: 50,              // Start with plenty of ammo
    ammoRegenRate: 1000,           // Regenerate 1 ammo every second
    bonusHealth: 20,               // Bonus health for correct answers
    bonusAmmo: 10,                 // Bonus ammo for correct answers
    noQuizPenalty: true            // No penalty for wrong/ignored answers
  }
};

/**
 * Validate quiz settings: all 5 keys present, all non-negative integers, sum to 100
 */
function validateQuizSettings(qs) {
  if (!qs || typeof qs !== 'object') return false;
  const keys = ['firstLetter', 'missingWord', 'categoryMatch', 'trueFalse', 'cloze'];
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
    quizSettings: quizSettings,

    // Melee combat: probability to hit without answering quiz (0.0 - 1.0)
    meleeHitProbabilityNoAnswer: preset.meleeHitProbabilityNoAnswer || 0.0,

    // FUN mode properties (optional)
    startingAmmo: preset.startingAmmo || 0,
    ammoRegenRate: preset.ammoRegenRate || 0,
    bonusHealth: preset.bonusHealth || 0,
    bonusAmmo: preset.bonusAmmo || 0,
    noQuizPenalty: preset.noQuizPenalty || false
  };
}

/**
 * Apply per-level overrides (from Levels tab config) onto levelData.
 * Mutates levelData in place.
 * @param {Object} levelData - Level data keyed by level number
 * @param {Array} levels - Array of per-level overrides (index 0 = level 1)
 */
function applyLevelOverrides(levelData, levels) {
  if (!levels || !Array.isArray(levels)) return;
  levels.forEach(function(lvl, idx) {
    var levelNum = idx + 1;
    if (lvl && levelData[levelNum]) {
      if (lvl.qualities && lvl.qualities.length > 0) {
        levelData[levelNum].qualities = lvl.qualities;
      }
      if (lvl.monsters && lvl.monsters.length > 0) {
        levelData[levelNum].monsters = lvl.monsters;
      }
      if (lvl.monstersToKill) {
        levelData[levelNum].monstersToKill = lvl.monstersToKill;
      }
      if (lvl.maxMonsters) {
        levelData[levelNum].maxMonsters = lvl.maxMonsters;
      }
      if (lvl.spawnRate) {
        // Config stores seconds, game uses milliseconds
        levelData[levelNum].spawnRate = lvl.spawnRate * 1000;
      }
    }
  });

  // Remove levels beyond what the override specifies
  // (e.g. mission with 1 level should not have levels 2-5)
  var maxLevel = levels.length;
  for (var key in levelData) {
    if (levelData.hasOwnProperty(key) && parseInt(key, 10) > maxLevel) {
      delete levelData[key];
    }
  }
}

/**
 * Create game config from custom balance multipliers (e.g. from URL config).
 * @param {Object} balance - { monsterHealth, monsterDamage, monsterSpeed, spawnRate, maxMonsters, healingFrequency }
 * @param {Object|null} customQuizSettings - Custom quiz balance, or null for defaults
 * @param {Array|null} levelOverrides - Per-level overrides (qualities, monsters, spawn settings)
 */
function createFromCustomBalance(balance, customQuizSettings, levelOverrides, extraOptions) {
  // Map URL config balance keys to preset multiplier keys
  var m = {
    monsterHealth: balance.monsterHealth || 1.0,
    monsterDamage: balance.monsterDamage || 1.0,
    monsterSpeed: balance.monsterSpeed || 1.0,
    spawnRate: balance.spawnRate || 1.0,
    maxMonsters: balance.maxMonsters || 1.0,
    healingSpawnRate: balance.healingFrequency || 1.0
  };

  var levelData = {};
  for (var level in LevelConfig.levelData) {
    if (!LevelConfig.levelData.hasOwnProperty(level)) continue;
    var data = LevelConfig.levelData[level];
    levelData[level] = Object.assign({}, data, {
      monsterDamageFactor: data.monsterDamageFactor * m.monsterDamage,
      monsterSpeed: Math.round(data.monsterSpeed * m.monsterSpeed),
      playerSpeed: data.playerSpeed,
      spawnRate: Math.round(data.spawnRate * m.spawnRate),
      maxMonsters: Math.round(data.maxMonsters * m.maxMonsters)
    });
  }

  var quizSettings = (customQuizSettings && validateQuizSettings(customQuizSettings))
    ? Object.assign({}, customQuizSettings)
    : Object.assign({}, DEFAULT_QUIZ_SETTINGS);

  // Apply per-level overrides (monsters, qualities, spawn settings from Levels tab)
  if (levelOverrides) {
    applyLevelOverrides(levelData, levelOverrides);
  }

  var config = {
    preset: 'custom',
    presetName: 'Custom',
    description: 'Custom game configuration',
    constants: Object.assign({}, Constants, {
      MAX_HEALING_POINTS: Math.round(Constants.MAX_HEALING_POINTS * m.healingSpawnRate),
      HEALING_SPAWN_INTERVAL: Math.round(30000 * m.healingSpawnRate)
    }),
    levelData: levelData,
    multipliers: m,
    monsterHealthMultiplier: m.monsterHealth,
    quizSettings: quizSettings,
    meleeHitProbabilityNoAnswer: 0.0  // Default custom balance matches normal mode quiz discipline
  };

  if (extraOptions && typeof extraOptions === 'object') {
    if (extraOptions.world && typeof extraOptions.world === 'object') {
      if (typeof extraOptions.world.width === 'number' && extraOptions.world.width > 0) {
        config.constants.WORLD_WIDTH = extraOptions.world.width;
      }
      if (typeof extraOptions.world.height === 'number' && extraOptions.world.height > 0) {
        config.constants.WORLD_HEIGHT = extraOptions.world.height;
      }
    }
    if (extraOptions.constants && typeof extraOptions.constants === 'object') {
      config.constants = Object.assign({}, config.constants, extraOptions.constants);
    }
    if (extraOptions.disableLevelBoss === true) {
      config.disableLevelBoss = true;
    }
    if (Array.isArray(extraOptions.fixedMonsters)) {
      config.fixedMonsters = extraOptions.fixedMonsters;
    }
    if (typeof extraOptions.randomSpawnsEnabled === 'boolean') {
      config.randomSpawnsEnabled = extraOptions.randomSpawnsEnabled;
    }
    if (typeof extraOptions.randomSpawnBudget === 'number') {
      config.randomSpawnBudget = extraOptions.randomSpawnBudget;
    }
    if (extraOptions.mapData) {
      config.mapData = extraOptions.mapData;
    }
    if (extraOptions.playerSpawn) {
      config.playerSpawn = extraOptions.playerSpawn;
    }
  }

  return config;
}

var GameConfigExports = {
  PRESETS,
  DEFAULT_QUIZ_SETTINGS,
  QUIZ_BALANCE_PRESETS,
  validateQuizSettings,
  applyLevelOverrides,
  createGameConfig,
  createFromCustomBalance,
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
})();
