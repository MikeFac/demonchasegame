const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'review-toast-leak');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3500/';

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeJson(name, data) {
  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, name),
    JSON.stringify(data, null, 2)
  );
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });
  page.on('pageerror', (err) => {
    pageErrors.push({
      message: err.message,
      stack: err.stack
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  await page.evaluate(() => {
    localStorage.removeItem('hasSeenVerseHint');
    startGame('solo');
  });

  await page.waitForFunction(() => window.gameMode === 'game', { timeout: 15000 });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    startReviewModeManaged({ returnTo: 'game', vQuality: 'Faith' });
  });

  await page.waitForFunction(() => window.gameMode === 'review', { timeout: 15000 });
  await page.waitForTimeout(2200);

  const state = await page.evaluate(() => {
    const container = document.getElementById('toastContainer');
    const texts = container ? Array.from(container.querySelectorAll('.toast')).map((el) => el.textContent || '') : [];
    return {
      gameMode: window.gameMode,
      modeManagerId: window.ModeManager && typeof window.ModeManager.getCurrentModeId === 'function'
        ? window.ModeManager.getCurrentModeId()
        : null,
      toastCount: texts.length,
      toastTexts: texts,
      renderText: typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null
    };
  });

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'review-no-toast.png') });
  await writeJson('state.json', {
    ...state,
    consoleMessages,
    pageErrors
  });

  await browser.close();
}

main().catch(async (error) => {
  try {
    await ensureDir(OUTPUT_DIR);
    await writeJson('fatal-error.json', {
      message: error.message,
      stack: error.stack
    });
  } catch (_) {
    // ignore secondary failure
  }
  console.error(error);
  process.exit(1);
});
