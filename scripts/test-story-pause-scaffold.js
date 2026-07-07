const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'story-pause-scaffold');
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

function getLaunchOptions() {
  const options = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  };
  const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  if (fs.existsSync(chromePath)) {
    options.executablePath = chromePath;
  }
  return options;
}

async function getPlayer(page) {
  return page.evaluate(() => {
    if (typeof player === 'undefined' || !player) return null;
    return {
      x: player.x,
      y: player.y,
      isMoving: !!player.isMoving
    };
  });
}

function distance(a, b) {
  if (!a || !b) return 0;
  const dx = (b.x || 0) - (a.x || 0);
  const dy = (b.y || 0) - (a.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

async function clickPlayableArea(page, offsetX, offsetY) {
  const box = await page.locator('#gameCanvas').boundingBox();
  if (!box) throw new Error('Canvas bounding box unavailable');
  await page.mouse.click(box.x + offsetX, box.y + offsetY);
}

function assertCondition(assertions, condition, message, details) {
  assertions.push({
    pass: !!condition,
    message,
    details: details || null
  });
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  await fs.promises.rm(path.join(OUTPUT_DIR, 'fatal-error.json'), { force: true });

  const browser = await chromium.launch(getLaunchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMessages = [];
  const pageErrors = [];
  const assertions = [];

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

  let beforePause = null;
  let duringPause = null;
  let afterBlockedClick = null;
  let afterResume = null;
  let afterMove = null;
  let pauseSnapshot = null;
  let resumedSnapshot = null;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#gameCanvas', { timeout: 10000, state: 'attached' });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      localStorage.setItem('dcgame_speedPromptShown', 'true');
      if (typeof startGame !== 'function') {
        throw new Error('startGame is unavailable');
      }
      startGame('solo');
    });

    await page.waitForFunction(() => window.gameMode === 'game', { timeout: 15000 });
    await page.waitForFunction(() => typeof player !== 'undefined' && !!player, { timeout: 15000 });
    await page.waitForTimeout(1200);

    beforePause = await getPlayer(page);

    await page.evaluate(() => {
      if (!window.__storyPauseDebug || typeof window.__storyPauseDebug.enterDemo !== 'function') {
        throw new Error('__storyPauseDebug.enterDemo is unavailable');
      }
      window.__storyPauseDebug.enterDemo();
    });

    await page.waitForFunction(() => window.isStoryPaused && window.isStoryPaused(), { timeout: 5000 });
    await page.waitForTimeout(300);
    duringPause = await getPlayer(page);
    pauseSnapshot = await page.evaluate(() => window.__storyPauseDebug.snapshot());

    await page.locator('#gameCanvas').screenshot({
      path: path.join(OUTPUT_DIR, 'paused.png')
    });

    await clickPlayableArea(page, 300, 260);
    await page.waitForTimeout(800);
    afterBlockedClick = await getPlayer(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.isStoryPaused || !window.isStoryPaused(), { timeout: 5000 });
    await page.waitForTimeout(300);
    afterResume = await getPlayer(page);
    resumedSnapshot = await page.evaluate(() => window.__storyPauseDebug.snapshot());

    await page.locator('#gameCanvas').screenshot({
      path: path.join(OUTPUT_DIR, 'resumed.png')
    });

    await clickPlayableArea(page, 330, 260);
    await page.waitForTimeout(1000);
    afterMove = await getPlayer(page);

    assertCondition(assertions, pauseSnapshot && pauseSnapshot.paused === true, 'Debug hook enters story pause', pauseSnapshot);
    assertCondition(assertions, pauseSnapshot && pauseSnapshot.gameState && pauseSnapshot.gameState.pausedForStory === true, 'Game state marks story pause', pauseSnapshot);
    assertCondition(assertions, distance(duringPause, afterBlockedClick) < 2, 'Gameplay click does not move player while story pause is active', {
      duringPause,
      afterBlockedClick,
      distance: distance(duringPause, afterBlockedClick)
    });
    assertCondition(assertions, resumedSnapshot && resumedSnapshot.paused === false, 'Story pause exits after advancing dialogue', resumedSnapshot);
    assertCondition(assertions, resumedSnapshot && resumedSnapshot.gameState && resumedSnapshot.gameState.pausedForStory === false, 'Game state clears story pause on resume', resumedSnapshot);
    assertCondition(assertions, distance(afterResume, afterMove) > 5, 'Gameplay movement resumes after story pause exits', {
      afterResume,
      afterMove,
      distance: distance(afterResume, afterMove)
    });

    const failed = assertions.filter((entry) => !entry.pass);
    await writeJson('summary.json', {
      assertions,
      beforePause,
      duringPause,
      afterBlockedClick,
      afterResume,
      afterMove,
      pauseSnapshot,
      resumedSnapshot,
      consoleMessages,
      pageErrors
    });

    if (failed.length) {
      throw new Error(`Story pause scaffold smoke failed ${failed.length} assertion(s)`);
    }
  } finally {
    await browser.close();
  }
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
