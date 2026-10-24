/**
 * Step 0 visual regression: HUD widths, five quiz modes, solo mission.
 *
 * Usage: node scripts/test-step0-regression.js [baseUrl]
 *
 * Writes screenshots and a summary under output/step0/. Requires a running
 * server (./restart-server.sh) and Playwright's Chromium.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://127.0.0.1:3500/';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'step0');
const WIDTHS = [320, 360, 400, 420];
const QUIZ_MODES = [
  { mode: 'first_letter', setting: 'firstLetter' },
  { mode: 'missing_word', setting: 'missingWord' },
  { mode: 'category_match', setting: 'categoryMatch' },
  { mode: 'true_false', setting: 'trueFalse' },
  { mode: 'cloze', setting: 'cloze' }
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeJson(name, data) {
  await fs.promises.writeFile(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 2));
}

function viewportFor(logicalWidth) {
  // getOptimalCanvasWidth: mobile = min(innerWidth - 10, 420, 400); desktop
  // allows up to 600. Use a wide viewport to exercise the 420 px cap.
  return {
    width: logicalWidth <= 400 ? logicalWidth + 10 : 1050,
    height: 820
  };
}

async function preparePage(browser, logicalWidth, label, errors) {
  const page = await browser.newPage({
    viewport: viewportFor(logicalWidth),
    deviceScaleFactor: 2,
    isMobile: logicalWidth <= 400,
    hasTouch: true
  });
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem('dcgame_speedPromptShown', 'true');
    localStorage.setItem('dcgame_speedTooltipShown', 'true');
    localStorage.setItem('hasSeenVerseHint', 'true');
    localStorage.setItem('lang', 'en');
  });
  await page.goto(`${BASE_URL}?v=step0-regression-${label}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  return page;
}

async function startSolo(page) {
  await page.evaluate(() => { if (typeof showMainMenu === 'function') showMainMenu(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { startGame('solo'); });
  await page.waitForFunction(() => window.gameMode === 'game' && !!window.renderer, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    if (typeof hideOnboardingModal === 'function') hideOnboardingModal();
    if (typeof firstGameTips !== 'undefined') {
      firstGameTips.demonAppeared = true;
      firstGameTips.firstKill = true;
    }
  });
}

async function captureWidth(browser, width, errors) {
  const label = `hud-${width}`;
  const page = await preparePage(browser, width, label, errors);
  try {
    await startSolo(page);
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const transform = canvas.getContext('2d').getTransform();
      return {
        logicalWidth: Viewport.width,
        logicalHeight: Viewport.height,
        dpr: Viewport.dpr,
        bitmapWidth: canvas.width,
        bitmapHeight: canvas.height,
        cssWidth: canvas.style.width,
        transformA: transform.a,
        playableTop: UILayout.playableTop,
        hudRowHeight: UILayout.HUD_ROW_HEIGHT,
        gameMode: window.gameMode,
        playerHealth: (typeof player !== 'undefined' && player) ? player.health : null,
        monsterCount: (typeof monsters !== 'undefined' && monsters) ? monsters.length : null
      };
    });
    await page.locator('#gameCanvas').screenshot({
      path: path.join(OUTPUT_DIR, 'after', `hud-${width}.png`)
    });
    return { width, state };
  } finally {
    await page.close();
  }
}

async function captureQuizModes(browser, errors) {
  const page = await preparePage(browser, 400, 'quiz', errors);
  const results = [];
  try {
    await startSolo(page);
    const settings = await page.evaluate(() => Object.keys(window.quizSettings || {}));
    for (const quizMode of QUIZ_MODES) {
      const result = await page.evaluate((entry) => {
        const keys = Object.keys(window.quizSettings || {});
        keys.forEach((key) => { window.quizSettings[key] = 0; });
        window.quizSettings[entry.setting] = 100;
        let quiz = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          window.QuizManager.pickQualityVerse();
          if (typeof currentQuiz !== 'undefined' && currentQuiz && currentQuiz.mode === entry.mode) {
            quiz = currentQuiz;
            break;
          }
        }
        return {
          requested: entry.mode,
          actual: quiz ? quiz.mode : null,
          prompt: quiz ? (quiz.promptText || quiz.questionLabel || quiz.reference || '') : null,
          optionCount: quiz && Array.isArray(quiz.options) ? quiz.options.length : 0,
          hasAnswer: !!(quiz && (quiz.correctAnswer !== undefined ||
            (Array.isArray(quiz.answers) && quiz.answers.length > 0) ||
            (Array.isArray(quiz.options) && quiz.options.some((option) => option.isCorrect))))
        };
      }, quizMode);
      await page.waitForTimeout(120);
      await page.locator('#gameCanvas').screenshot({
        path: path.join(OUTPUT_DIR, 'quiz', `${quizMode.mode}.png`)
      });
      results.push(result);
    }
    return { settings, results };
  } finally {
    await page.close();
  }
}

async function captureSoloMission(browser, errors) {
  const page = await preparePage(browser, 400, 'mission', errors);
  try {
    await page.evaluate(() => { startMission('chapter0', 'intro-01'); });
    await page.waitForFunction(() => window.gameMode === 'game' && typeof currentMission !== 'undefined' && currentMission && currentMission.id === 'intro-01', null, { timeout: 25000 });
    await page.waitForTimeout(1400);
    const state = await page.evaluate(() => ({
      gameMode: window.gameMode,
      missionId: currentMission ? currentMission.id : null,
      missionName: currentMission ? currentMission.name : null,
      playerCode: typeof playerCode !== 'undefined' ? playerCode : null,
      playerHealth: (typeof player !== 'undefined' && player) ? player.health : null,
      monsters: (typeof monsters !== 'undefined' && monsters) ? monsters.length : null
    }));
    await page.locator('#gameCanvas').screenshot({
      path: path.join(OUTPUT_DIR, 'solo-mission.png')
    });
    return state;
  } finally {
    await page.close();
  }
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  await ensureDir(path.join(OUTPUT_DIR, 'after'));
  await ensureDir(path.join(OUTPUT_DIR, 'quiz'));

  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const summary = { baseUrl: BASE_URL, widths: [], quiz: null, mission: null, errors };

  try {
    for (const width of WIDTHS) {
      summary.widths.push(await captureWidth(browser, width, errors));
    }
    summary.quiz = await captureQuizModes(browser, errors);
    summary.mission = await captureSoloMission(browser, errors);
  } finally {
    await browser.close();
  }

  await writeJson('regression-summary.json', summary);
  const failures = [];
  for (const entry of summary.widths) {
    const expectedWidth = entry.width;
    if (entry.state.logicalWidth !== expectedWidth) {
      failures.push(`width ${expectedWidth}: logical width was ${entry.state.logicalWidth}`);
    }
    if (entry.state.dpr !== 2 || entry.state.transformA !== 2) {
      failures.push(`width ${expectedWidth}: expected DPR 2, got dpr=${entry.state.dpr} transform=${entry.state.transformA}`);
    }
    if (entry.state.bitmapWidth !== expectedWidth * 2) {
      failures.push(`width ${expectedWidth}: bitmap width ${entry.state.bitmapWidth}`);
    }
  }
  for (const result of summary.quiz.results) {
    if (result.actual !== result.requested) {
      failures.push(`quiz ${result.requested}: generated ${result.actual}`);
    }
    if (!result.hasAnswer) {
      failures.push(`quiz ${result.requested}: missing answer data`);
    }
  }
  if (!summary.mission || summary.mission.missionId !== 'intro-01') {
    failures.push('solo mission did not start');
  }
  if (errors.length) failures.push(`browser errors: ${errors.join(' | ')}`);

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) {
    console.error('FAILURES:\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log('Step 0 regression passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
