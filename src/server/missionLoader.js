const fs = require('fs');
const path = require('path');

const missionsDir = path.join(__dirname, '..', '..', 'missions');

/**
 * Build a GameConfig from mission JSON for multiplayer mission mode.
 * Uses the same conversion logic as startMission() in game.js.
 *
 * @param {Object} settings - Room settings with worldId, missionId, quizSettings
 * @param {Object} GameConfig - The GameConfig module
 * @returns {Object|null} gameConfig or null on failure
 */
function buildMissionGameConfig(settings, GameConfig) {
  try {
    const chaptersPath = path.join(missionsDir, 'chapters.json');
    const chaptersData = JSON.parse(fs.readFileSync(chaptersPath, 'utf8'));
    const chapter = chaptersData.chapters.find(c => c.id === settings.worldId);
    if (!chapter) {
      console.error('Mission mode: chapter not found:', settings.worldId);
      return null;
    }

    const chapterPath = path.join(missionsDir, chapter.slug + '.json');
    const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
    const mission = chapterData.missions.find(m => m.id === settings.missionId);
    if (!mission) {
      console.error('Mission mode: mission not found:', settings.missionId);
      return null;
    }

    // Build config using same structure as startMission() in game.js
    const balance = {
      monsterHealth: 1.0,
      monsterDamage: mission.monsterDamageFactor || 1.0,
      monsterSpeed: 1.0,
      spawnRate: 1.0,
      maxMonsters: 1.0,
      healingFrequency: 1.0
    };

    const levels = [{
      qualities: mission.qualities,
      monsters: mission.monsters,
      monstersToKill: mission.monstersToKill,
      maxMonsters: mission.maxMonsters,
      spawnRate: mission.spawnRate || 18
    }];

    const quizSettings = settings.quizSettings || null;
    const gameConfig = GameConfig.createFromCustomBalance(balance, quizSettings, levels);
    gameConfig.mapStyle = mission.mapStyle || 'classic';

    // Attach mission metadata so clients can identify this as a mission game
    gameConfig.missionId = mission.id;
    gameConfig.worldId = settings.worldId;
    gameConfig.missionName = mission.name;
    gameConfig.xpMultiplier = mission.xpMultiplier || 1.0;

    return gameConfig;
  } catch (err) {
    console.error('Failed to load mission config:', err);
    return null;
  }
}

module.exports = { buildMissionGameConfig };
