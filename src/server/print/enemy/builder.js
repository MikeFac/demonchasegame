const path = require('path');
const fs = require('fs');
const LevelConfig = require(path.join(__dirname, '..', '..', '..', '..', 'src', 'shared', 'LevelConfig'));

const DATA_DIR = path.join(__dirname, '..', '..', '..', '..', 'data');
const SETS_REGISTRY_PATH = path.join(DATA_DIR, 'enemy-card-sets.json');
const SITE_URL = 'https://versebattles.com';
const CTA_TEXT = 'Memorise and play at VerseBattles.com';

const ENEMY_IMAGE_PATHS = {
  Blindness: '/images/monsters/SPIRITUALBLINDNESS.png',
  Condemnation: '/images/monsters/condemnation_demon.png',
  Confusion: '/images/monsters/confusion_spirit.png',
  Deception: '/images/monsters/DECEPTION_SPIRIT1.png',
  Depression: '/images/monsters/depression_spirit.png',
  Despair: '/images/monsters/DISCOURAGEMENT.png',
  Doubt: '/images/monsters/doubt_spirit.png',
  Fear: '/images/monsters/fear_demon.png',
  Ignorance: '/images/monsters/ignorance_spirit.png',
  Infirmity: '/images/monsters/infirmity_spirit.png',
  Poverty: '/images/monsters/DEMON-OF-POVERTY.png',
  Pride: '/images/monsters/PRIDE.png',
  Shame: '/images/monsters/SHAME-ACCUSATION.png',
  Strife: '/images/monsters/strife_spirit.png',
  Swarm: '/images/monsters/DEMON-SWARM.png',
  Temptation: '/images/monsters/JEZEBEL.png',
  Unbelief: '/images/monsters/unbelief_demon.png'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEnemyCardSets() {
  const registry = JSON.parse(fs.readFileSync(SETS_REGISTRY_PATH, 'utf8'));
  return registry.sets;
}

function loadLevelAppearanceMap() {
  const map = {};
  const levelData = LevelConfig.levelData || {};

  Object.keys(levelData).forEach((levelKey) => {
    const levelNumber = Number(levelKey);
    const levelEntry = levelData[levelKey] || {};
    const monsters = Array.isArray(levelEntry.monsters) ? levelEntry.monsters : [];

    monsters.forEach((demonType) => {
      if (!demonType || map[demonType]) return;
      map[demonType] = levelNumber;
    });
  });

  return map;
}

function buildEnemyCardSet(setId) {
  const registry = JSON.parse(fs.readFileSync(SETS_REGISTRY_PATH, 'utf8'));
  const setConfig = registry.sets.find((set) => set.id === setId);
  if (!setConfig) return null;

  const setDataPath = path.join(DATA_DIR, setConfig.dataFile);
  if (!fs.existsSync(setDataPath)) return null;

  const cardEntries = JSON.parse(fs.readFileSync(setDataPath, 'utf8'));
  const levelAppearanceMap = loadLevelAppearanceMap();

  const cards = cardEntries.map((entry, index) => {
    const demonType = entry.demonType;
    if (!demonType) return null;

    return {
      index: index + 1,
      demonType,
      image: ENEMY_IMAGE_PATHS[demonType] || null,
      role: entry.role || 'Enemy',
      note: entry.note || '',
      bestCounter: LevelConfig.getBestCategoryForMonster(demonType) || 'Unknown',
      firstSeenLevel: levelAppearanceMap[demonType] || null
    };
  }).filter(Boolean);

  const cardsPerRow = setConfig.cardsPerRow || 3;
  const rowsPerPage = setConfig.rowsPerPage || 4;
  const cardsPerPage = cardsPerRow * rowsPerPage;
  const pages = [];

  for (let i = 0; i < cards.length; i += cardsPerPage) {
    pages.push(cards.slice(i, i + cardsPerPage));
  }

  return {
    id: setConfig.id,
    name: setConfig.name,
    description: setConfig.description,
    totalCards: cards.length,
    cardsPerRow,
    rowsPerPage,
    cardsPerPage,
    pages,
    siteUrl: SITE_URL,
    footerCta: CTA_TEXT
  };
}

module.exports = { getEnemyCardSets, buildEnemyCardSet, escapeHtml };
