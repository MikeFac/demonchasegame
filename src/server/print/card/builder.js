const path = require('path');
const fs = require('fs');
const { loadSelectedVerses } = require(path.join(__dirname, '..', '..', '..', '..', 'bible-verses'));

const DATA_DIR = path.join(__dirname, '..', '..', '..', '..', 'data');
const SETS_REGISTRY_PATH = path.join(DATA_DIR, 'verse-card-sets.json');
const SITE_URL = 'https://versebattles.com';
const CTA_TEXT = 'Memorise and play at VerseBattles.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCardSets() {
  const registry = JSON.parse(fs.readFileSync(SETS_REGISTRY_PATH, 'utf8'));
  return registry.sets;
}

function buildCardSet(setId) {
  const registry = JSON.parse(fs.readFileSync(SETS_REGISTRY_PATH, 'utf8'));
  const setConfig = registry.sets.find(s => s.id === setId);
  if (!setConfig) return null;

  const setDataPath = path.join(DATA_DIR, setConfig.dataFile);
  if (!fs.existsSync(setDataPath)) return null;

  const cardEntries = JSON.parse(fs.readFileSync(setDataPath, 'utf8'));
  const allVerses = loadSelectedVerses();

  const cards = cardEntries.map((entry, index) => {
    const verse = allVerses.find(v => v.Reference === entry.reference);
    if (!verse) return null;

    return {
      index: index + 1,
      category: verse.Category,
      reference: verse.Reference,
      text: verse.Text
    };
  }).filter(Boolean);

  const cardsPerRow = setConfig.cardsPerRow || 3;
  const rowsPerPage = setConfig.rowsPerPage || 3;
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

module.exports = { getCardSets, buildCardSet, escapeHtml };
