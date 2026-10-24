/**
 * Capture "before" Step 0 screenshots from the base commit without a worktree.
 *
 * Playwright route interception serves the base commit's index.html, client
 * scripts and images from git blobs. Nothing is written to the repo except the
 * screenshots under output/step0/before/.
 *
 * Usage: node scripts/capture-step0-before.js [baseCommit] [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const BASE_COMMIT = process.argv[2] || 'c5190ff';
const BASE_URL = process.argv[3] || 'http://127.0.0.1:3500/';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'step0', 'before');
const WIDTHS = [320, 360, 400, 420];

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg'
};

function gitBlob(repoPath) {
  const clean = path.posix.normalize(repoPath.replace(/^\/+/, ''));
  if (!clean || clean.startsWith('..')) return null;
  try {
    return execFileSync('git', ['show', `${BASE_COMMIT}:${clean}`], {
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch (error) {
    return null;
  }
}

function shouldServeFromBase(pathname) {
  return pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/game.js' ||
    pathname === '/bible-verses.js' ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/locales/');
}

function viewportFor(logicalWidth) {
  return {
    width: logicalWidth <= 400 ? logicalWidth + 10 : 1050,
    height: 820
  };
}

async function capture(browser, logicalWidth) {
  const context = await browser.newContext({
    viewport: viewportFor(logicalWidth),
    deviceScaleFactor: 2,
    isMobile: logicalWidth <= 400,
    hasTouch: true,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(BASE_URL).origin) {
      await route.continue();
      return;
    }
    const pathname = url.pathname;
    if (!shouldServeFromBase(pathname)) {
      await route.continue();
      return;
    }
    const repoPath = pathname === '/' ? 'index.html' : pathname;
    const blob = gitBlob(repoPath);
    if (!blob) {
      await route.continue();
      return;
    }
    const extension = path.extname(pathname === '/' ? 'index.html' : pathname).toLowerCase();
    await route.fulfill({
      status: 200,
      contentType: CONTENT_TYPES[extension] || 'application/octet-stream',
      body: blob
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('dcgame_speedPromptShown', 'true');
    localStorage.setItem('dcgame_speedTooltipShown', 'true');
    localStorage.setItem('hasSeenVerseHint', 'true');
    localStorage.setItem('lang', 'en');
  });

  await page.goto(`${BASE_URL}?v=step0-before-${logicalWidth}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (typeof showMainMenu === 'function') showMainMenu(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { startGame('solo'); });
  await page.waitForFunction(() => window.gameMode === 'game' && typeof player !== 'undefined', null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    if (typeof hideOnboardingModal === 'function') hideOnboardingModal();
    if (typeof firstGameTips !== 'undefined') {
      firstGameTips.demonAppeared = true;
      firstGameTips.firstKill = true;
    }
  });
  const state = await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas');
    return {
      logicalWidth: canvas.width,
      logicalHeight: canvas.height,
      cssWidth: canvas.style.width,
      cssHeight: canvas.style.height,
      dpr: window.devicePixelRatio,
      gameMode: window.gameMode
    };
  });
  await page.locator('#gameCanvas').screenshot({
    path: path.join(OUTPUT_DIR, `hud-${logicalWidth}.png`)
  });
  await context.close();
  return { width: logicalWidth, state, errors };
}

async function main() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of WIDTHS) {
      results.push(await capture(browser, width));
    }
  } finally {
    await browser.close();
  }
  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify({ baseCommit: BASE_COMMIT, results }, null, 2)
  );
  console.log(JSON.stringify({ baseCommit: BASE_COMMIT, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
