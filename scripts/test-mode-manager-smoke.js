const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'mode-manager-smoke');
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

async function captureState(page, name) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`) });
  const state = await page.evaluate(() => {
    const modeManagerId = window.ModeManager && typeof window.ModeManager.getCurrentModeId === 'function'
      ? window.ModeManager.getCurrentModeId()
      : null;
    const menuScreen = document.getElementById('menuScreen');
    const canvas = document.getElementById('gameCanvas');
    const waveMenuPanel = document.getElementById('waveMenuPanel');
    return {
      modeManagerId,
      gameMode: window.gameMode || null,
      mission: window.currentMission ? {
        id: window.currentMission.id,
        worldId: window.currentMission.worldId,
        gameMode: window.currentMission.gameMode || null
      } : null,
      menuVisible: !!menuScreen && menuScreen.style.display !== 'none',
      canvasVisible: !!canvas && canvas.style.display !== 'none',
      overlandVisible: !!window.overlandState,
      reviewVisible: !!document.getElementById('reviewScreen'),
      waveMenuVisible: !!waveMenuPanel && waveMenuPanel.style.display !== 'none',
      renderText: typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null
    };
  });
  await writeJson(`${name}.json`, state);
  return state;
}

async function waitForMode(page, expectedModeId, expectedGameMode) {
  await page.waitForFunction(
    ({ expectedModeId, expectedGameMode }) => {
      const modeId = window.ModeManager && typeof window.ModeManager.getCurrentModeId === 'function'
        ? window.ModeManager.getCurrentModeId()
        : null;
      if (modeId !== expectedModeId) return false;
      if (expectedGameMode && window.gameMode !== expectedGameMode) return false;
      return true;
    },
    { expectedModeId, expectedGameMode },
    { timeout: 30000 }
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
    showMainMenu();
  });
  await waitForMode(page, 'menu', 'menu');
  await captureState(page, 'menu');

  await page.evaluate(() => {
    startGame('solo');
  });
  await waitForMode(page, 'soloDungeon', 'game');
  await page.waitForTimeout(750);
  await captureState(page, 'solo');

  await page.evaluate(async () => {
    await showOverland();
  });
  await waitForMode(page, 'overland', 'overland');
  await page.waitForTimeout(500);
  await captureState(page, 'overland');

  await page.evaluate(() => {
    startReviewModeManaged({ returnTo: 'overland', vQuality: 'Faith' });
  });
  await waitForMode(page, 'review', 'review');
  await page.waitForTimeout(500);
  await captureState(page, 'review');

  await page.evaluate(() => {
    window.ReviewMode.restoreGameState();
  });
  await waitForMode(page, 'overland', 'overland');
  await page.waitForTimeout(500);
  await captureState(page, 'review-return');

  await page.evaluate(async () => {
    await startMission('chapter5', 'wave-01');
  });
  await waitForMode(page, 'wave', 'waveGame');
  await page.waitForTimeout(1200);
  await captureState(page, 'wave');

  await page.click('#waveMenuButton');
  await page.waitForFunction(() => {
    const panel = document.getElementById('waveMenuPanel');
    return !!panel && panel.style.display !== 'none';
  }, { timeout: 5000 });
  await captureState(page, 'wave-menu-open');

  await page.click('[data-wave-menu-item="leave"]');
  await waitForMode(page, 'overland', 'overland');
  await page.waitForTimeout(500);
  const finalState = await captureState(page, 'wave-leave-return');

  await writeJson('summary.json', {
    finalState,
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
