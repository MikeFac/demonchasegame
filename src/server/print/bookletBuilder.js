const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { loadSelectedVerses } = require(path.join(__dirname, '..', '..', '..', 'bible-verses'));

const MAX_VERSE_LENGTH = 160;
const VERSES_PER_BOOKLET = 24;
const MIN_VERSES_PER_BOOKLET = 1;
const VERSES_PER_PAGE = 6;
const VERSE_PAGE_COUNT = 4;
const SITE_URL = 'https://versebattles.com';
const CTA_TEXT = 'Scan to memorise and play at VerseBattles.com';
const LOGO_PATH = '/images/VerseBattles-logo.png';
const LOGO_FILE_PATH = path.join(__dirname, '..', '..', '..', 'images', 'VerseBattles-logo.png');
const MENU_SCREEN_PATH = '/public/print-assets/menu-panel-bw.png';
const MENU_SCREEN_FILE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'print-assets', 'menu-panel-bw.png');

let qrCodeDataUrlPromise = null;
let logoDataUrl = null;
let menuScreenDataUrl = null;

function slugifyCategory(category) {
  return String(category || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function groupVersesByCategory() {
  const grouped = new Map();
  const verses = loadSelectedVerses();

  for (const verse of verses) {
    const category = verse.Category || 'Uncategorized';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
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

function paginateVerses(verses) {
  const pages = [];
  for (let i = 0; i < VERSE_PAGE_COUNT; i += 1) {
    const start = i * VERSES_PER_PAGE;
    pages.push(verses.slice(start, start + VERSES_PER_PAGE));
  }
  return pages;
}

async function getQrCodeDataUrl() {
  if (!qrCodeDataUrlPromise) {
    qrCodeDataUrlPromise = QRCode.toDataURL(SITE_URL, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      width: 280
    });
  }

  return qrCodeDataUrlPromise;
}

function getLogoDataUrl() {
  if (!logoDataUrl) {
    const buffer = fs.readFileSync(LOGO_FILE_PATH);
    logoDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  }

  return logoDataUrl;
}

function getMenuScreenDataUrl() {
  if (!menuScreenDataUrl) {
    const buffer = fs.readFileSync(MENU_SCREEN_FILE_PATH);
    menuScreenDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  }

  return menuScreenDataUrl;
}

function getPrintableCategories() {
  const grouped = groupVersesByCategory();
  const categories = [];

  for (const [category, verses] of grouped.entries()) {
    const suitable = verses.filter((verse) => verse.length <= MAX_VERSE_LENGTH);
    if (suitable.length >= MIN_VERSES_PER_BOOKLET) {
      const selectedVerses = Math.min(suitable.length, VERSES_PER_BOOKLET);
      categories.push({
        slug: slugifyCategory(category),
        category,
        totalVerses: verses.length,
        suitableVerses: suitable.length,
        selectedVerses,
        isPartial: selectedVerses < VERSES_PER_BOOKLET
      });
    }
  }

  return categories.sort((a, b) => a.category.localeCompare(b.category));
}

async function buildBookletBySlug(categorySlug) {
  const grouped = groupVersesByCategory();
  const categoryEntry = Array.from(grouped.entries()).find(([category]) => slugifyCategory(category) === categorySlug);

  if (!categoryEntry) {
    return null;
  }

  const [category, allVerses] = categoryEntry;
  const suitableVerses = allVerses.filter((verse) => verse.length <= MAX_VERSE_LENGTH);

  if (suitableVerses.length < MIN_VERSES_PER_BOOKLET) {
    return null;
  }

  const selectedVerses = suitableVerses.slice(0, VERSES_PER_BOOKLET);
  const versePages = paginateVerses(selectedVerses);
  const qrCodeDataUrl = await getQrCodeDataUrl();

  const pages = [
    {
      pageNumber: 1,
      kind: 'cover-front',
      title: `${category} Verses`,
      headline: 'Memorise Scripture. Battle Doubt.',
      subhead: 'Scan to learn and play online at VerseBattles.com.',
      category
    },
    ...versePages.map((verses, index) => ({
      pageNumber: index + 2,
      kind: 'verses',
      title: `${category} Verses`,
      footerCta: CTA_TEXT,
      verses
    })),
    {
      pageNumber: 6,
      kind: 'how-to',
      title: 'How To Use This Booklet',
      steps: [
        'Read the verses aloud.',
        'Memorise one verse at a time.',
        'Scan the QR code to keep learning online.',
        'Use VerseBattles to review, quiz, and practise.'
      ]
    },
    {
      pageNumber: 7,
      kind: 'cta',
      title: 'Keep Going Online',
      headline: 'Turn these verses into a daily habit.',
      body: 'VerseBattles helps learners review verses, answer quizzes, and keep returning to Scripture throughout the week.',
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 8,
      kind: 'cover-back',
      title: 'Start Today',
      headline: 'Scan and begin at VerseBattles.com',
      subhead: 'Free Bible verse memorisation and review.',
      footerCta: CTA_TEXT
    }
  ];

  return {
    slug: categorySlug,
    category,
    title: `${category} Verses`,
    logoPath: LOGO_PATH,
    logoDataUrl: getLogoDataUrl(),
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
  MAX_VERSE_LENGTH,
  MIN_VERSES_PER_BOOKLET,
  VERSES_PER_BOOKLET,
  VERSES_PER_PAGE,
  VERSE_PAGE_COUNT,
  CTA_TEXT,
  escapeHtml,
  getPrintableCategories,
  buildBookletBySlug,
  slugifyCategory
};
