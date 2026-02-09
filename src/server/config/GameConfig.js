const Constants = require('../../shared/Constants');
const LevelConfig = require('../../shared/LevelConfig');

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
 * Create game config by merging preset with base values
 */
function createGameConfig(presetName = 'normal') {
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
    monsterHealthMultiplier: m.monsterHealth
  };
}

module.exports = {
  PRESETS,
  createGameConfig,
  getPresetList: () => Object.keys(PRESETS).map(key => ({
    id: key,
    name: PRESETS[key].name,
    description: PRESETS[key].description
  }))
};
