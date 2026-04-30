const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { loadSelectedVerses } = require(path.join(__dirname, '..', '..', '..', '..', 'bible-verses'));
const { slugifyCategory } = require('../bookletBuilder');

const MAX_VERSE_LENGTH = 160;
const MIN_VERSES_PER_SHEET = 1;
const VERSES_PER_SHEET = 12;
const VERSES_PER_INSIDE_PAGE = 6;
const SITE_URL = 'https://versebattles.com';
const CTA_TEXT = 'Scan to memorise and play at VerseBattles.com';
const MENU_SCREEN_PATH = '/public/print-assets/menu-panel-bw.png';
const MENU_SCREEN_FILE_PATH = path.join(__dirname, '..', '..', '..', '..', 'public', 'print-assets', 'menu-panel-bw.png');

let qrCodeDataUrlPromise = null;
let menuScreenDataUrl = null;

function groupVersesByCategory() {
  const grouped = new Map();
  const verses = loadSelectedVerses();

  for (const verse of verses) {
    const category = verse.Category || 'Uncategorized';
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({
      id: verse.Id,
      category,
      reference: verse.Reference,
      text: verse.Text,
      length: verse.Text.length
    });
  }

  return grouped;
}

async function getQrCodeDataUrl() {
  if (!qrCodeDataUrlPromise) {
    qrCodeDataUrlPromise = QRCode.toDataURL(SITE_URL, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      width: 280
    });
  }
  return qrCodeDataUrlPromise;
}

function getMenuScreenDataUrl() {
  if (!menuScreenDataUrl) {
    const buffer = fs.readFileSync(MENU_SCREEN_FILE_PATH);
    menuScreenDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  }
  return menuScreenDataUrl;
}

function getPrintableOnePageCategories() {
  const grouped = groupVersesByCategory();
  const categories = [];

  for (const [category, verses] of grouped.entries()) {
    const suitable = verses.filter((verse) => verse.length <= MAX_VERSE_LENGTH);
    if (suitable.length >= MIN_VERSES_PER_SHEET) {
      const selectedVerses = Math.min(suitable.length, VERSES_PER_SHEET);
      categories.push({
        slug: slugifyCategory(category),
        category,
        totalVerses: verses.length,
        suitableVerses: suitable.length,
        selectedVerses,
        isPartial: selectedVerses < VERSES_PER_SHEET
      });
    }
  }

  return categories.sort((a, b) => a.category.localeCompare(b.category));
}

async function buildOnePageBySlug(categorySlug) {
  const grouped = groupVersesByCategory();
  const categoryEntry = Array.from(grouped.entries()).find(([category]) => slugifyCategory(category) === categorySlug);

  if (!categoryEntry) return null;

  const [category, allVerses] = categoryEntry;
  const suitableVerses = allVerses.filter((verse) => verse.length <= MAX_VERSE_LENGTH);
  if (suitableVerses.length < MIN_VERSES_PER_SHEET) return null;

  const selectedVerses = suitableVerses.slice(0, VERSES_PER_SHEET);
  const insideLeftVerses = selectedVerses.slice(0, VERSES_PER_INSIDE_PAGE);
  const insideRightVerses = selectedVerses.slice(VERSES_PER_INSIDE_PAGE, VERSES_PER_SHEET);
  const qrCodeDataUrl = await getQrCodeDataUrl();

  const pages = [
    {
      pageNumber: 1,
      kind: 'cover-front',
      title: `${category} Memory Sheet`,
      headline: 'Memorise Scripture. Practice daily. Build what lasts.',
      salesVerseReference: '2 Timothy 2:15',
      salesVerseText: 'Do your best to present yourself to God as one approved, a worker who does not need to be ashamed and who correctly handles the word of truth.',
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 2,
      kind: 'inside-verses',
      title: `${category} Verses (1-6)`,
      verses: insideLeftVerses,
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 3,
      kind: 'inside-verses',
      title: `${category} Verses (7-12)`,
      verses: insideRightVerses,
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 4,
      kind: 'cover-back',
      title: 'How to Use + Features',
      instructions: [
        'Read each verse aloud twice.',
        'Memorise one verse at a time.',
        'Scan the QR code for review and quizzes.',
        'Use VerseBattles through the week to keep recall strong.'
      ],
      features: [
        'Category-based verse practice',
        'Simple mobile and desktop access',
        'Built-in review and quiz loops',
        'Works for personal study or groups'
      ],
      promoLine: 'Also visit raymasongs.com for Scripture songs and worship resources.',
      footerCta: CTA_TEXT
    }
  ];

  return {
    slug: categorySlug,
    category,
    title: `${category} One-Page Print`,
    menuScreenPath: MENU_SCREEN_PATH,
    menuScreenDataUrl: getMenuScreenDataUrl(),
    qrCodeDataUrl,
    siteUrl: SITE_URL,
    footerCta: CTA_TEXT,
    totalSelectedVerses: selectedVerses.length,
    totalSuitableVerses: suitableVerses.length,
    pages
  };
}

module.exports = {
  buildOnePageBySlug,
  getPrintableOnePageCategories
};
