const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'random-verse-order');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 512, height: 700 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto('http://127.0.0.1:3500/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.click('#btnSettings');
    await page.waitForSelector('#randomizeVerseOrderToggle:visible');
    await page.locator('#randomizeVerseOrderToggle').check();
    const persisted = await page.evaluate(() => ({
      enabled: window.randomizeVerseOrder,
      saved: localStorage.getItem('randomizeVerseOrder')
    }));
    assert(persisted.enabled && persisted.saved === 'true', 'setting should persist as enabled');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-settings-enabled.png') });

    await page.click('#settingsBackButton');
    await page.click('#btnSolo');
    await page.waitForFunction(() => window.gameMode === 'game' && window.QuizManager, { timeout: 15000 });
    await page.waitForTimeout(1000);

    const selection = await page.evaluate(() => {
      const category = window.vQuality;
      const available = organizedVerses[category] || [];
      const refs = [];
      for (let i = 0; i < Math.min(available.length, 8); i++) {
        QuizManager.pickQualityVerse();
        refs.push(currentQuiz && currentQuiz.verseReference);
      }
      return { category, available: available.length, refs };
    });
    assert(selection.available > 1, 'test category must contain more than one verse');
    assert(new Set(selection.refs).size === selection.refs.length,
      'shuffle bag repeated a verse before completing the category: ' + JSON.stringify(selection));
    await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '02-gameplay-shuffled.png') });
    await fs.promises.writeFile(path.join(OUTPUT_DIR, 'state.json'), JSON.stringify({ persisted, selection, errors }, null, 2));
    console.log('Random verse order passed: ' + JSON.stringify(selection));
  } finally {
    await browser.close();
  }
  assert(errors.length === 0, 'page errors: ' + errors.join('; '));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
