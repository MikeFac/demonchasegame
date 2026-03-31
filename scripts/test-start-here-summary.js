const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'start-here-summary-final');
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
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    startMission('chapter0', 'intro-01');
  });
  await page.waitForTimeout(1500);

  const summaryVisibleDirect = await page.evaluate(() => {
    if (typeof showStartHereSummary === 'function') {
      showStartHereSummary();
      return !!window.startHereSummaryState;
    }
    return false;
  });

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'summary-direct.png') });

  const directState = await page.evaluate(() => ({
    gameMode: window.gameMode,
    currentMission: window.currentMission ? {
      id: window.currentMission.id,
      worldId: window.currentMission.worldId
    } : null,
    startHereSummaryVisible: !!window.startHereSummaryState,
    startHereSummaryState: window.startHereSummaryState,
    renderText: typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null
  }));
  await writeJson('summary-direct-state.json', { summaryVisibleDirect, ...directState });

  const endToEnd = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    startMission('chapter0', 'intro-01');
    await sleep(1200);

    const introMonster = (window.monsters || []).find((monster) => !monster.isBoss && monster.health > 0);
    if (introMonster) {
      introMonster.health = 0;
    }
    if (window.gameState) {
      window.gameState.monstersKilled = 1;
    }
    if (typeof window.spawnTriggeredMissionMonsters === 'function') {
      window.spawnTriggeredMissionMonsters();
    }
    await sleep(500);

    if (window.onboardingGuideState) {
      window.onboardingGuideState.learnOpened = true;
      window.onboardingGuideState.learnReturned = true;
      window.onboardingGuideState.step = 'finish';
    }

    const boss = (window.monsters || []).find((monster) => monster.isBoss && monster.health > 0);
    if (boss) {
      boss.health = 0;
    }
    if (window.gameState) {
      window.gameState.monstersKilled = 2;
    }

    if (window.currentMissionClient && typeof window.currentMissionClient.onGameEnded === 'function') {
      window.currentMissionClient.onGameEnded({
        result: 'victory',
        level: 1,
        monstersKilled: 2,
        playerStats: {}
      });
    } else if (typeof window.showStartHereSummary === 'function') {
      window.showStartHereSummary();
    }

    await sleep(300);

    return {
      gameMode: window.gameMode,
      kills: window.gameState ? window.gameState.monstersKilled : null,
      bossAlive: (window.monsters || []).some((monster) => monster.isBoss && monster.health > 0),
      step: window.onboardingGuideState ? window.onboardingGuideState.step : null,
      startHereSummaryVisible: !!window.startHereSummaryState,
      startHereSummaryState: window.startHereSummaryState,
      currentMission: window.currentMission ? {
        id: window.currentMission.id,
        worldId: window.currentMission.worldId
      } : null,
      renderText: typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null
    };
  });

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'summary-end-to-end.png') });
  await writeJson('summary-end-to-end-state.json', endToEnd);

  const missionsAction = await page.evaluate(async () => {
    if (typeof window.handleStartHereSummaryClick !== 'function') return { ok: false, reason: 'missing-handler' };
    window.handleStartHereSummaryClick('missions');
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      ok: true,
      gameMode: window.gameMode,
      currentMission: window.currentMission,
      startHereSummaryVisible: !!window.startHereSummaryState,
      renderText: typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null
    };
  });
  await writeJson('summary-missions-action-state.json', missionsAction);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'summary-after-missions.png') });

  await writeJson('errors.json', {
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
