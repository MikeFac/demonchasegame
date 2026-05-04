const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { slugifyCategory } = require('../bookletBuilder');

const lgVersesPath = path.join(__dirname, '..', '..', '..', '..', 'bible-verses-lg');
let loadSelectedVerses;
try {
  loadSelectedVerses = require(lgVersesPath).loadSelectedVerses;
} catch (e) {
  loadSelectedVerses = () => { throw new Error('bible-verses-lg.js not found. Run: node scripts/translate-verses-to-luganda.js'); };
}

const MAX_VERSE_LENGTH = 200;
const MIN_VERSES_PER_SHEET = 1;
const VERSES_PER_SHEET = 16;
const VERSES_PER_INSIDE_PAGE = 8;
const SITE_URL = 'https://versebattles.com';
const CTA_TEXT = 'Yunga awano omanye n\u2019osubize ku VerseBattles.com';
const RADIO_FRONT_PROMO = 'RADIO BIBLE CLASS. Family Radio 105.3 FM\nBuli Wenesaala 9:15-10 p.m.\nYESU ASONYIYA N\u2019AKUFA';
const RADIO_BACK_PROMO = 'RADIO BIBLE CLASS. Family Radio 105.3 FM\nBul\u00ed Wenesaala 9:15-10 p.m.\nYESU ASONYIYA N\u2019AKUFA';
const FRONT_ACTION_PATH = '/public/print-assets/front-cover-action-qr.png';
const FRONT_ACTION_FILE_PATH = path.join(__dirname, '..', '..', '..', '..', 'public', 'print-assets', 'front-cover-action-qr.png');

let qrCodeDataUrlPromise = null;
let frontActionDataUrl = null;

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
      englishRef: verse.EnglishRef || '',
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

function getFrontActionDataUrl() {
  if (!frontActionDataUrl) {
    const buffer = fs.readFileSync(FRONT_ACTION_FILE_PATH);
    frontActionDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  }
  return frontActionDataUrl;
}

function getPrintableLgOnePageCategories() {
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

async function buildLgOnePageBySlug(categorySlug) {
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
      title: `Olupapula lwa ${category} okujjukira`,
      headline: `Manya Baibuli. Praktika buli lunaku. Zimba eky\u2019olubeerera.`,
      featureHighlights: [
        `Teeka mu mutwe ggwe yokka oba ozaane n\u2019emikwano`,
        `Waniriza emirimu egikoleddwa ku Baibuli`,
        `Yongera amaanyi mu ntuusi, amagezi, n\u2019okwegendeeza`,
        `Jjukira ebigambo bya mpaangatte mu nkola, okunnyonnyola, n\u2019okuzanya`,
        `Yiga ebigambo mu nyimba`,
        `Yufue ebiriisa ebitongole`,
        `Weetegeke obulamu bwo ow\u2019omwoyo`
      ],
      frontPromoLine: RADIO_FRONT_PROMO,
      salesVerseReference: 'Timoseo 2:15',
      salesVerseText: `Weerabira omanye n\u2019olowooza mu kumanya, nga omulabirizi waama alina okusiima.`,
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 2,
      kind: 'inside-verses',
      title: `Ebigambo bya ${category}`,
      verses: insideLeftVerses,
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 3,
      kind: 'inside-verses',
      title: `Ebigambo bya ${category}`,
      verses: insideRightVerses,
      footerCta: CTA_TEXT
    },
    {
      pageNumber: 4,
      kind: 'cover-back',
      title: 'Okukozesa + Ebirala',
      instructions: [
        `Soma ebigambo bibiri mu bdoodi.`,
        `Jjukira ebigambo bimu bubwe.`,
        `Yunga ku QR code osobole okunnyonnyola n\u2019okuzuza.`,
        `Kozesa VerseBattles mu wiiki yonna amagezi g\u2019obeere gwa maanyi.`
      ],
      features: [
        `Okuzanya ebigambo mu bibinja`,
        `Okutuuka ku simu ne kompyuta`,
        `Okunnyonnyola n\u2019okuzuza mu mution`,
        `Ekyakozesebwa mu kuyiga kw\u2019omuntu oba mu bibinja`
      ],
      promoLines: [
        RADIO_BACK_PROMO,
        'Lemu ne raymasongs.com ku nyimba za Baibuli.'
      ],
      footerCta: CTA_TEXT
    }
  ];

  return {
    slug: categorySlug,
    category,
    title: `${category} Olupapula olw'okupapula mu Luganda`,
    frontHeadline1: 'Wewangule Omuwala w\u2019omwoyo',
    frontHeadline2: 'omuwanga amagye ku lw\u2019a Katonda!',
    frontCta: 'Yunga osaanye leero - VerseBattles.com',
    frontActionPath: FRONT_ACTION_PATH,
    frontActionDataUrl: getFrontActionDataUrl(),
    qrCodeDataUrl,
    siteUrl: SITE_URL,
    footerCta: CTA_TEXT,
    totalSelectedVerses: selectedVerses.length,
    totalSuitableVerses: suitableVerses.length,
    pages
  };
}

module.exports = {
  buildLgOnePageBySlug,
  getPrintableLgOnePageCategories
};
