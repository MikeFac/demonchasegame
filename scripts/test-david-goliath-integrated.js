const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'david-goliath-integrated');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3500/';
const EXPECT_LEGACY_STORY_MODE = process.argv.includes('--expect-legacy-story-mode');
const ENABLE_INTEGRATED_STORY = process.argv.includes('--enable-integrated-story') ||
  process.argv.includes('--enable-integrated-intro');
const SIMULATE_CORE_LOOP_CONFIG = process.argv.includes('--simulate-core-loop-config');
const FORCE_LEGACY_STORY = process.argv.includes('--force-legacy-story');
const EXPECT_INTEGRATED_STORY = (ENABLE_INTEGRATED_STORY || SIMULATE_CORE_LOOP_CONFIG) && !FORCE_LEGACY_STORY;

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

function parseRenderText(renderText) {
  if (!renderText) return null;
  try {
    return JSON.parse(renderText);
  } catch (_) {
    return { raw: renderText };
  }
}

async function captureState(page, name) {
  await page.locator('#gameCanvas').screenshot({
    path: path.join(OUTPUT_DIR, `${name}.png`)
  });

  const state = await page.evaluate(() => {
    const modeManagerId = window.ModeManager && typeof window.ModeManager.getCurrentModeId === 'function'
      ? window.ModeManager.getCurrentModeId()
      : null;
    const canvas = document.getElementById('gameCanvas');
    const storyMenuButton = document.getElementById('storyMenuButton');
    const storyMenuPanel = document.getElementById('storyMenuPanel');

    let playerSnapshot = null;
    try {
      if (typeof player !== 'undefined' && player) {
        playerSnapshot = {
          x: player.x,
          y: player.y,
          health: player.health,
          ammo: player.ammo,
          state: player.state || null
        };
      }
    } catch (_) {
      playerSnapshot = null;
    }

    let monstersSnapshot = [];
    try {
      if (typeof monsters !== 'undefined' && Array.isArray(monsters)) {
        monstersSnapshot = monsters.map((monster) => ({
          id: monster.id,
          x: monster.x,
          y: monster.y,
          demonType: monster.demonType,
          isBoss: !!monster.isBoss,
          label: monster.label || null,
          health: monster.health,
          maxHealth: monster.maxHealth
        }));
      }
    } catch (_) {
      monstersSnapshot = [];
    }

    let gameStateSnapshot = null;
    try {
      if (typeof gameState !== 'undefined' && gameState) {
        gameStateSnapshot = {
          gameLevel: gameState.gameLevel,
          monstersKilled: gameState.monstersKilled,
          monstersToKill: gameState.monstersToKill,
          disableKillCountVictory: !!gameState.disableKillCountVictory,
          requireBossKillForVictory: !!gameState.requireBossKillForVictory,
          worldWidth: typeof network !== 'undefined' && network && network.engine && network.engine.constants ? network.engine.constants.WORLD_WIDTH : null,
          worldHeight: typeof network !== 'undefined' && network && network.engine && network.engine.constants ? network.engine.constants.WORLD_HEIGHT : null,
          engineEnded: typeof network !== 'undefined' && network && network.engine ? !!network.engine._gameEnded : null,
          pausedForStory: !!gameState.pausedForStory,
          storyPhaseId: gameState.storyPhaseId || null,
          integratedStory: gameState.integratedStory || null
        };
      }
    } catch (_) {
      gameStateSnapshot = null;
    }

    let collectiblesSnapshot = [];
    try {
      if (typeof gameState !== 'undefined' && gameState && Array.isArray(gameState.collectibles)) {
        collectiblesSnapshot = gameState.collectibles.map((item) => ({
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          authoredX: item.authoredX || null,
          authoredY: item.authoredY || null,
          positionAdjusted: !!item.positionAdjusted,
          storyCollectible: !!item.storyCollectible,
          storyObjectId: item.storyObjectId || null,
          guardDemonType: item.guardDemonType || null,
	          wallCollides: typeof clientWallGrid !== 'undefined' && clientWallGrid
	            ? clientWallGrid.collides(item.x, item.y, item.width || 28, item.height || 22)
	            : null,
	          nearWallCount: typeof clientWalls !== 'undefined' && Array.isArray(clientWalls)
	            ? clientWalls.filter((wall) => {
	                const wallCenterX = wall.x + wall.width / 2;
	                const wallCenterY = wall.y + wall.height / 2;
	                return Math.abs(wallCenterX - item.x) <= 180 && Math.abs(wallCenterY - item.y) <= 180;
	              }).length
	            : null,
	          label: item.label || null
	        }));
      }
    } catch (_) {
      collectiblesSnapshot = [];
    }

    let inventorySnapshot = null;
    try {
      if (typeof inventory !== 'undefined' && inventory) {
        inventorySnapshot = Object.assign({}, inventory);
      }
    } catch (_) {
      inventorySnapshot = null;
    }

    const storyPauseDebug = window.__storyPauseDebug && typeof window.__storyPauseDebug.snapshot === 'function'
      ? window.__storyPauseDebug.snapshot()
      : null;
    let flashMessagesSnapshot = [];
    try {
      if (typeof flashMessages !== 'undefined' && Array.isArray(flashMessages)) {
        flashMessagesSnapshot = flashMessages.map((message) => ({
          text: message.text,
          color: message.color,
          remainingMs: Math.max(0, (message.duration || 0) - (Date.now() - (message.startTime || 0)))
        }));
      }
    } catch (_) {
      flashMessagesSnapshot = [];
    }
    const renderText = typeof window.render_game_to_text === 'function'
      ? window.render_game_to_text()
      : null;

    return {
      modeManagerId,
      gameMode: window.gameMode || null,
      currentMission: window.currentMission ? {
        id: window.currentMission.id,
        worldId: window.currentMission.worldId,
        gameMode: window.currentMission.gameMode || null,
        storyIntegration: window.currentMission.storyIntegration || null,
        configuredStoryIntegration: window.currentMission.configuredStoryIntegration || null
      } : null,
      canvasVisible: !!canvas && canvas.style.display !== 'none',
      storyMenuVisible: !!storyMenuButton,
      storyPanelVisible: !!storyMenuPanel && storyMenuPanel.style.display !== 'none',
      gameOverFlag: typeof gameOverFlag !== 'undefined' ? !!gameOverFlag : null,
      gameOverModalVisible: typeof gameOverModalVisible !== 'undefined' ? !!gameOverModalVisible : null,
      storyPaused: typeof window.isStoryPaused === 'function' ? window.isStoryPaused() : false,
      storyPauseDebug,
      integratedStoryLaunchState: window.__integratedStoryLaunchState || null,
      integratedStoryIntroState: window.__integratedStoryIntroState || null,
      integratedStoryState: window.__integratedStoryState || null,
      player: playerSnapshot,
      monsters: monstersSnapshot,
      collectibles: collectiblesSnapshot,
      inventory: inventorySnapshot,
      flashMessages: flashMessagesSnapshot,
      gameState: gameStateSnapshot,
      renderText
    };
  });

  const enriched = Object.assign({}, state, {
    parsedRenderText: parseRenderText(state.renderText)
  });
  await writeJson(`${name}.json`, enriched);
  return enriched;
}

async function sampleMovement(page) {
  const samples = [];

  async function readPlayer() {
    return page.evaluate(() => {
      try {
        if (typeof player !== 'undefined' && player) {
          return { x: player.x, y: player.y };
        }
      } catch (_) {
        return null;
      }
      return null;
    });
  }

  samples.push(await readPlayer());
  const canvasBox = await page.locator('#gameCanvas').boundingBox();
  if (canvasBox) {
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.5);
  }
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(120);
    samples.push(await readPlayer());
  }

  const valid = samples.filter(Boolean);
  const deltas = [];
  for (let i = 1; i < valid.length; i++) {
    const dx = valid[i].x - valid[i - 1].x;
    const dy = valid[i].y - valid[i - 1].y;
    deltas.push(Math.sqrt(dx * dx + dy * dy));
  }

  return {
    samples,
    validSampleCount: valid.length,
    totalDx: valid.length > 1 ? valid[valid.length - 1].x - valid[0].x : 0,
    maxStep: deltas.length ? Math.max.apply(null, deltas) : 0,
    deltas
  };
}

async function samplePausedMovement(page) {
  const before = await page.evaluate(() => {
    try {
      if (typeof player !== 'undefined' && player) return { x: player.x, y: player.y };
    } catch (_) {
      return null;
    }
    return null;
  });
  const canvasBox = await page.locator('#gameCanvas').boundingBox();
  if (canvasBox) {
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.5);
  }
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => {
    try {
      if (typeof player !== 'undefined' && player) return { x: player.x, y: player.y };
    } catch (_) {
      return null;
    }
    return null;
  });
  const dx = before && after ? after.x - before.x : 0;
  const dy = before && after ? after.y - before.y : 0;
  return {
    before,
    after,
    distance: Math.sqrt(dx * dx + dy * dy)
  };
}

async function setPlayerPosition(page, target) {
  await page.evaluate((position) => {
    let resolvedX = position.x;
    let resolvedY = position.y;
    try {
      if (!position.allowUnsafe && typeof clientWallGrid !== 'undefined' && clientWallGrid &&
          typeof player !== 'undefined' && player) {
        const width = player.width || 48;
        const height = player.height || 48;
        const isClear = (x, y) => !clientWallGrid.collides(x, y, width, height);
        if (!isClear(resolvedX, resolvedY)) {
          let found = null;
          for (let ring = 1; ring <= 8 && !found; ring++) {
            const radius = ring * 60;
            const samples = Math.max(12, ring * 8);
            for (let index = 0; index < samples; index++) {
              const angle = (Math.PI * 2 * index) / samples;
              const x = Math.round(position.x + Math.cos(angle) * radius);
              const y = Math.round(position.y + Math.sin(angle) * radius);
              if (isClear(x, y)) {
                found = { x, y };
                break;
              }
            }
          }
          if (found) {
            resolvedX = found.x;
            resolvedY = found.y;
          }
        }
      }
    } catch (_) {
      // Keep the requested position if wall-grid probing is unavailable.
    }

    if (typeof player !== 'undefined' && player) {
      player.x = resolvedX;
      player.y = resolvedY;
    }
    try {
      if (typeof network !== 'undefined' && network && network.engine &&
          typeof playerCode !== 'undefined' && playerCode &&
          network.engine.gameState && network.engine.gameState.players[playerCode]) {
        network.engine.gameState.players[playerCode].x = resolvedX;
        network.engine.gameState.players[playerCode].y = resolvedY;
      }
    } catch (_) {
      // local browser test only
    }
  }, target);
}

async function captureStoneGuardViews(page, stones) {
  for (let i = 0; i < stones.length; i++) {
    const stone = stones[i];
    const viewPosition = await page.evaluate((target) => {
      try {
        const guard = typeof monsters !== 'undefined' && Array.isArray(monsters)
          ? monsters.find((monster) => monster && monster.demonType === target.guardDemonType)
          : null;
        if (guard) {
          return {
            x: Math.round((target.x + guard.x) / 2),
            y: Math.round((target.y + guard.y) / 2 + 120)
          };
        }
      } catch (_) {
        // Fall through to stone-relative framing.
      }
      return { x: target.x, y: target.y + 220 };
    }, stone);
    await setPlayerPosition(page, viewPosition);
    await page.waitForTimeout(120);
    await page.locator('#gameCanvas').screenshot({
      path: path.join(OUTPUT_DIR, `stone-${i + 1}-guard.png`)
    });
  }
}

async function collectStoryStones(page) {
  const collectionLog = [];
  const stones = await page.evaluate(() => {
    try {
      if (typeof gameState !== 'undefined' && gameState && Array.isArray(gameState.collectibles)) {
        return gameState.collectibles
          .filter((item) => item && item.storyCollectible)
          .map((item) => ({ id: item.id, x: item.x, y: item.y, type: item.type, guardDemonType: item.guardDemonType }));
      }
    } catch (_) {
      return [];
    }
    return [];
  });

  await captureStoneGuardViews(page, stones);

  for (const stone of stones) {
    const before = await page.evaluate(() => {
      return window.__integratedStoryState ? window.__integratedStoryState.collected : 0;
    });

    await setPlayerPosition(page, Object.assign({}, stone, { allowUnsafe: true }));

    await page.waitForFunction((previousCount) => {
      return window.__integratedStoryState &&
        window.__integratedStoryState.collected > previousCount;
    }, before, { timeout: 4000 });

    collectionLog.push({
      stone,
      before,
      after: await page.evaluate(() => window.__integratedStoryState ? window.__integratedStoryState.collected : 0)
    });
  }

  return collectionLog;
}

async function clickStoryPauseRect(page, matcher) {
  const result = await page.evaluate((matcherSource) => {
    const parsedMatcher = JSON.parse(matcherSource);
    const snapshot = window.__storyPauseDebug && typeof window.__storyPauseDebug.snapshot === 'function'
      ? window.__storyPauseDebug.snapshot()
      : null;
    const rects = snapshot && snapshot.state && Array.isArray(snapshot.state.buttonRects)
      ? snapshot.state.buttonRects
      : [];
    const rect = rects.find((entry) => {
      if (parsedMatcher.id && entry.id !== parsedMatcher.id) return false;
      if (parsedMatcher.value && entry.value !== parsedMatcher.value) return false;
      return true;
    });
    const canvas = document.getElementById('gameCanvas');
    if (!rect || !canvas) return null;
    if (typeof window.handleStoryPauseClick === 'function') {
      window.handleStoryPauseClick(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { handledDirectly: true, rect, canvasWidth: canvas.width, canvasHeight: canvas.height };
    }
    return { rect, canvasWidth: canvas.width, canvasHeight: canvas.height };
  }, JSON.stringify(matcher));

  if (!result) {
    throw new Error(`Could not find story pause rect for ${JSON.stringify(matcher)}`);
  }
  if (result.handledDirectly) return;

  const canvasBox = await page.locator('#gameCanvas').boundingBox();
  if (!canvasBox) throw new Error('Canvas bounding box unavailable');

  const scaleX = canvasBox.width / result.canvasWidth;
  const scaleY = canvasBox.height / result.canvasHeight;
  await page.mouse.click(
    canvasBox.x + (result.rect.x + result.rect.width / 2) * scaleX,
    canvasBox.y + (result.rect.y + result.rect.height / 2) * scaleY
  );
}

function assertCondition(assertions, condition, message, details) {
  assertions.push({
    pass: !!condition,
    message,
    details: details || null
  });
}

function getMinimumDistance(points) {
  let minimum = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      minimum = Math.min(minimum, Math.sqrt(dx * dx + dy * dy));
    }
  }
  return minimum === Infinity ? 0 : minimum;
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

  let initialState = null;
  let afterIntroState = null;
  let afterCollectThresholdState = null;
  let afterStonesState = null;
  let afterPuzzleWrongState = null;
  let afterPuzzleCorrectState = null;
  let afterPuzzleResumeState = null;
  let afterBossFocusState = null;
  let afterEngineThresholdState = null;
  let afterPrematureVictoryState = null;
  let afterBossVictoryState = null;
  let afterVictoryCompleteState = null;
  let afterMoveState = null;
  let pausedMovement = null;
  let stoneCollection = null;
  let movement = null;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#gameCanvas', { timeout: 10000, state: 'attached' });
    await page.waitForTimeout(1200);

    await page.evaluate((opts) => {
      localStorage.setItem('dcgame_speedPromptShown', 'true');
      localStorage.removeItem('dcgame_integratedStoryIntro');
      if (opts.forceLegacyStory) {
        localStorage.setItem('dcgame_forceLegacyStory', 'true');
      } else {
        localStorage.removeItem('dcgame_forceLegacyStory');
      }
      if (opts.enableIntegratedStory) {
        localStorage.setItem('dcgame_integratedStory', 'true');
      } else {
        localStorage.removeItem('dcgame_integratedStory');
      }
      if (opts.simulateCoreLoopConfig) {
        window.__storyIntegrationMissionOverrides = Object.assign({}, window.__storyIntegrationMissionOverrides || {}, {
          'featured/david-01': { storyIntegration: 'coreLoop' }
        });
      } else if (window.__storyIntegrationMissionOverrides) {
        delete window.__storyIntegrationMissionOverrides['featured/david-01'];
        if (Object.keys(window.__storyIntegrationMissionOverrides).length === 0) {
          delete window.__storyIntegrationMissionOverrides;
        }
      }
    }, {
      enableIntegratedStory: ENABLE_INTEGRATED_STORY,
      simulateCoreLoopConfig: SIMULATE_CORE_LOOP_CONFIG,
      forceLegacyStory: FORCE_LEGACY_STORY
    });

    await page.evaluate(async () => {
      if (typeof startMission !== 'function') {
        throw new Error('startMission is unavailable');
      }
      await startMission('featured', 'david-01');
    });

    await page.waitForTimeout(1800);
    initialState = await captureState(page, 'initial');

    const legacyStoryModeDetected = initialState.gameMode === 'story' || initialState.storyMenuVisible;
    const integratedStoryDetected = initialState.currentMission &&
      initialState.currentMission.storyIntegration === 'coreLoop';
    const shouldRunIntegratedStoryAssertions = !FORCE_LEGACY_STORY &&
      (EXPECT_INTEGRATED_STORY || integratedStoryDetected);
    if (EXPECT_LEGACY_STORY_MODE && legacyStoryModeDetected) {
      assertCondition(assertions, true, 'Current build still uses legacy standalone story mode as expected for Phase 0', {
        gameMode: initialState.gameMode,
        storyMenuVisible: initialState.storyMenuVisible
      });
      await writeJson('summary.json', {
        expectedLegacyStoryMode: true,
        enableIntegratedStory: ENABLE_INTEGRATED_STORY,
        simulateCoreLoopConfig: SIMULATE_CORE_LOOP_CONFIG,
        forceLegacyStory: FORCE_LEGACY_STORY,
        expectIntegratedStory: EXPECT_INTEGRATED_STORY,
        assertions,
        initialState,
        consoleMessages,
        pageErrors
      });
      return;
    }
    if (EXPECT_LEGACY_STORY_MODE && !legacyStoryModeDetected) {
      assertCondition(assertions, false, 'Expected legacy standalone story mode but mission did not use it', {
        gameMode: initialState.gameMode,
        storyMenuVisible: initialState.storyMenuVisible,
        currentMission: initialState.currentMission
      });
    }

    assertCondition(assertions, initialState.gameMode === 'game', 'David/Goliath launches through the core game loop', {
      actualGameMode: initialState.gameMode
    });
    assertCondition(assertions, initialState.currentMission && initialState.currentMission.storyIntegration === 'coreLoop', 'Integrated path marks mission as coreLoop', {
      currentMission: initialState.currentMission
    });
    assertCondition(assertions, initialState.modeManagerId === 'soloDungeon' || initialState.modeManagerId === 'mission', 'ModeManager remains on a core gameplay mode', {
      actualModeManagerId: initialState.modeManagerId
    });
    assertCondition(assertions, !initialState.storyMenuVisible, 'Standalone story menu is not mounted');
    assertCondition(assertions, initialState.currentMission && initialState.currentMission.id === 'david-01', 'Current mission is david-01', {
      currentMission: initialState.currentMission
    });
    assertCondition(assertions, !!initialState.player, 'Core loop exposes a player snapshot');
    assertCondition(assertions, initialState.monsters.length > 0, 'Core loop has visible mission monsters');

    if (shouldRunIntegratedStoryAssertions) {
      assertCondition(assertions, initialState.storyPaused === true, 'Integrated intro opens the reusable story pause overlay', {
        storyPaused: initialState.storyPaused,
        storyPauseDebug: initialState.storyPauseDebug,
        integratedStoryLaunchState: initialState.integratedStoryLaunchState,
        integratedStoryIntroState: initialState.integratedStoryIntroState
      });
      assertCondition(assertions, initialState.gameState && initialState.gameState.pausedForStory === true, 'Core game state is paused for story during intro', {
        gameState: initialState.gameState
      });

      pausedMovement = await samplePausedMovement(page);
      assertCondition(assertions, pausedMovement.distance < 2, 'Player movement is frozen while story intro is paused', pausedMovement);

      await clickStoryPauseRect(page, { id: 'continue' });
      await page.waitForTimeout(200);
      await clickStoryPauseRect(page, { id: 'continue' });
      await page.waitForFunction(() => typeof window.isStoryPaused === 'function' && !window.isStoryPaused(), null, { timeout: 5000 });
      await page.waitForTimeout(500);
      afterIntroState = await captureState(page, 'after-intro');
      assertCondition(assertions, afterIntroState.storyPaused === false, 'Integrated intro exits back to live gameplay', {
        storyPaused: afterIntroState.storyPaused,
        gameState: afterIntroState.gameState
      });
      assertCondition(assertions, afterIntroState.gameState &&
        afterIntroState.gameState.worldWidth === 2000 &&
        afterIntroState.gameState.worldHeight === 2000, 'David/Goliath integrated mission uses compact 2000x2000 arena', {
        gameState: afterIntroState.gameState
      });
      assertCondition(assertions, afterIntroState.integratedStoryState && afterIntroState.integratedStoryState.targetCount === 5, 'Integrated story seeds five smooth stones', {
        integratedStoryState: afterIntroState.integratedStoryState
      });
	      assertCondition(assertions, afterIntroState.collectibles.filter((item) => item.storyCollectible).length === 5, 'Five story stone collectibles are present in core game state', {
	        collectibles: afterIntroState.collectibles
	      });
	      const storyStones = afterIntroState.collectibles.filter((item) => item.storyCollectible);
	      const minimumStoneDistance = getMinimumDistance(storyStones);
	      assertCondition(assertions, minimumStoneDistance >= 650, 'Story stones are spread across the mission area', {
	        minimumStoneDistance,
	        storyStones
	      });
	      assertCondition(assertions, storyStones.every((item) => item.wallCollides === false), 'Story stones are seeded outside generated walls', {
	        storyStones
	      });
	      assertCondition(assertions, storyStones.every((item) => item.nearWallCount >= 8), 'Story stones are placed inside enterable landmark structures', {
	        storyStones
	      });
	      const expectedGuardTypes = ['Fear', 'Shame', 'Doubt', 'Confusion', 'Unbelief'];
      const liveGuardTypes = new Set(afterIntroState.monsters.map((monster) => monster.demonType).filter(Boolean));
	      assertCondition(assertions, expectedGuardTypes.every((demonType) => liveGuardTypes.has(demonType)), 'Collect phase spawns a different guard demon type for each stone', {
	        expectedGuardTypes,
	        liveGuardTypes: Array.from(liveGuardTypes),
	        monsters: afterIntroState.monsters
	      });

      assertCondition(assertions, afterIntroState.gameState && afterIntroState.gameState.disableKillCountVictory === true, 'Collect phase disables generic kill-count victory', {
        gameState: afterIntroState.gameState
      });

      await page.evaluate(() => {
        if (typeof network !== 'undefined' && network && network.engine) {
          if (network.engine.gameState) {
            network.engine.gameState.monstersKilled = network.engine.gameState.monstersToKill || 5;
          }
          network.engine.update();
        }
      });
      await page.waitForTimeout(250);
      afterCollectThresholdState = await captureState(page, 'after-collect-threshold');
      assertCondition(assertions, afterCollectThresholdState.gameState &&
        afterCollectThresholdState.gameState.engineEnded === false &&
        afterCollectThresholdState.gameOverModalVisible === false &&
        afterCollectThresholdState.integratedStoryState &&
        afterCollectThresholdState.integratedStoryState.phaseId === 'collectStones', 'Collection-phase kill threshold does not trigger generic victory', {
        gameState: afterCollectThresholdState.gameState,
        gameOverModalVisible: afterCollectThresholdState.gameOverModalVisible,
        integratedStoryState: afterCollectThresholdState.integratedStoryState
      });

      await page.evaluate(() => {
        if (typeof network !== 'undefined' && network && network.engine && network.engine.gameState) {
          network.engine.gameState.monstersKilled = 0;
          if (typeof gameState !== 'undefined' && gameState) {
            gameState.monstersKilled = 0;
          }
        }
      });
	    }

    movement = await sampleMovement(page);
    await page.waitForTimeout(250);
    afterMoveState = await captureState(page, 'after-move');

    assertCondition(assertions, movement.validSampleCount >= 4, 'Movement sampler captured player positions', movement);
    assertCondition(assertions, movement.totalDx > 10, 'Click-target movement changes player position', movement);
    assertCondition(assertions, movement.maxStep > 0 && movement.maxStep < 80, 'Player movement is continuous rather than jumpy', movement);

    if (shouldRunIntegratedStoryAssertions) {
      stoneCollection = await collectStoryStones(page);
      await page.waitForTimeout(350);
      afterStonesState = await captureState(page, 'after-stones');

      assertCondition(assertions, stoneCollection.length === 5, 'Stone collector visited all five authored stones', stoneCollection);
      assertCondition(assertions, afterStonesState.integratedStoryState && afterStonesState.integratedStoryState.collected === 5, 'Story stone counter reaches five', {
        integratedStoryState: afterStonesState.integratedStoryState
      });
      assertCondition(assertions, afterStonesState.integratedStoryState && afterStonesState.integratedStoryState.complete === true, 'Story collect phase is marked complete after five stones', {
        integratedStoryState: afterStonesState.integratedStoryState
      });
      assertCondition(assertions, afterStonesState.collectibles.filter((item) => item.storyCollectible).length === 0, 'Collected story stones are removed from core collectibles', {
        collectibles: afterStonesState.collectibles
      });
      assertCondition(assertions, !afterStonesState.inventory || afterStonesState.inventory.smoothStone === undefined, 'Smooth stones do not enter Armor of God inventory', {
        inventory: afterStonesState.inventory
      });
      assertCondition(assertions, afterStonesState.storyPaused === true, 'Collecting five stones opens the core story puzzle pause', {
        storyPaused: afterStonesState.storyPaused,
        storyPauseDebug: afterStonesState.storyPauseDebug
      });
      assertCondition(assertions, afterStonesState.storyPauseDebug &&
        afterStonesState.storyPauseDebug.state &&
        afterStonesState.storyPauseDebug.state.type === 'puzzle', 'Story pause switches to puzzle mode after stones', {
        storyPauseDebug: afterStonesState.storyPauseDebug
      });

      await clickStoryPauseRect(page, { id: 'option', value: 'king' });
      await page.waitForFunction(() => {
        const snap = window.__storyPauseDebug && window.__storyPauseDebug.snapshot();
        return snap && snap.state && snap.state.selectedAnswer === 'king';
      }, null, { timeout: 4000 });
      afterPuzzleWrongState = await captureState(page, 'after-puzzle-wrong');
      assertCondition(assertions, afterPuzzleWrongState.storyPaused === true, 'Wrong puzzle answer keeps story pause active', {
        storyPauseDebug: afterPuzzleWrongState.storyPauseDebug
      });
      assertCondition(assertions, !afterPuzzleWrongState.integratedStoryState.puzzleComplete, 'Wrong puzzle answer does not complete puzzle state', {
        integratedStoryState: afterPuzzleWrongState.integratedStoryState
      });

      await clickStoryPauseRect(page, { id: 'option', value: 'Lord' });
      await page.waitForFunction(() => {
        return window.__integratedStoryState && window.__integratedStoryState.puzzleComplete === true;
      }, null, { timeout: 4000 });
      afterPuzzleCorrectState = await captureState(page, 'after-puzzle-correct');
      assertCondition(assertions, afterPuzzleCorrectState.storyPaused === true, 'Correct puzzle answer shows completion before resume', {
        storyPauseDebug: afterPuzzleCorrectState.storyPauseDebug
      });
      assertCondition(assertions, afterPuzzleCorrectState.integratedStoryState &&
        afterPuzzleCorrectState.integratedStoryState.phaseId === 'puzzle' &&
        afterPuzzleCorrectState.integratedStoryState.nextPhase === 'bossFight' &&
        afterPuzzleCorrectState.integratedStoryState.puzzleComplete === true, 'Correct puzzle answer advances integrated story state to puzzle complete', {
        integratedStoryState: afterPuzzleCorrectState.integratedStoryState
      });

      await clickStoryPauseRect(page, { id: 'continue' });
      await page.waitForFunction(() => typeof window.isStoryPaused === 'function' && !window.isStoryPaused(), null, { timeout: 5000 });
      await page.waitForTimeout(300);
      afterPuzzleResumeState = await captureState(page, 'after-puzzle-resume');
      assertCondition(assertions, afterPuzzleResumeState.storyPaused === false, 'Puzzle Continue resumes core gameplay', {
        storyPaused: afterPuzzleResumeState.storyPaused
      });
      assertCondition(assertions, afterPuzzleResumeState.monsters.some((monster) => monster.isBoss && monster.label === 'Goliath' && monster.demonType === 'Goliath'), 'Phase 5 spawns Goliath as a distinct fixed boss monster', {
        monsters: afterPuzzleResumeState.monsters
      });
      assertCondition(assertions, afterPuzzleResumeState.gameState && afterPuzzleResumeState.gameState.monstersToKill === 1, 'Boss phase sets the core kill target to one', {
        gameState: afterPuzzleResumeState.gameState
      });
      assertCondition(assertions, afterPuzzleResumeState.gameState && afterPuzzleResumeState.gameState.requireBossKillForVictory === true, 'Boss phase requires a boss kill before victory', {
        gameState: afterPuzzleResumeState.gameState
      });
      assertCondition(assertions, afterPuzzleResumeState.integratedStoryState &&
        afterPuzzleResumeState.integratedStoryState.phaseId === 'bossFight' &&
        afterPuzzleResumeState.integratedStoryState.bossStarted === true, 'Integrated story state enters bossFight after puzzle resume', {
        integratedStoryState: afterPuzzleResumeState.integratedStoryState
      });

      const bossFocusPosition = await page.evaluate(() => {
        try {
          const boss = typeof monsters !== 'undefined' && Array.isArray(monsters)
            ? monsters.find((monster) => monster && monster.isBoss)
            : null;
          if (boss) return { x: boss.x, y: boss.y + 180 };
        } catch (_) {
          // visual focus only
        }
        return null;
      });
      if (bossFocusPosition) {
        await setPlayerPosition(page, bossFocusPosition);
      }
      await page.waitForTimeout(250);
      afterBossFocusState = await captureState(page, 'after-boss-focus');
      assertCondition(assertions, afterBossFocusState.flashMessages.some((message) => /Goliath/i.test(message.text || '')), 'Boss phase shows recurring direction popup toward Goliath', {
        flashMessages: afterBossFocusState.flashMessages
      });

      await page.evaluate(() => {
        if (typeof network !== 'undefined' && network && network.engine) {
          if (network.engine.gameState) {
            network.engine.gameState.monstersKilled = 1;
            network.engine.gameState.monstersToKill = 1;
          }
          network.engine.update();
        }
      });
      await page.waitForTimeout(250);
      afterEngineThresholdState = await captureState(page, 'after-engine-threshold');
      assertCondition(assertions, afterEngineThresholdState.gameState &&
        afterEngineThresholdState.gameState.engineEnded === false &&
        afterEngineThresholdState.integratedStoryState &&
        afterEngineThresholdState.integratedStoryState.phaseId === 'bossFight', 'Engine kill-count victory is blocked while Goliath is alive', {
        gameState: afterEngineThresholdState.gameState,
        integratedStoryState: afterEngineThresholdState.integratedStoryState
      });

      await page.evaluate(() => {
        if (typeof network !== 'undefined' && network && network.engine) {
          network.engine._endGame('victory');
        }
      });
      await page.waitForTimeout(350);
      afterPrematureVictoryState = await captureState(page, 'after-premature-victory');
      assertCondition(assertions, afterPrematureVictoryState.integratedStoryState &&
        afterPrematureVictoryState.integratedStoryState.phaseId === 'bossFight' &&
        afterPrematureVictoryState.integratedStoryState.prematureVictoryBlocked === true, 'Generic victory is blocked until Goliath is defeated', {
        integratedStoryState: afterPrematureVictoryState.integratedStoryState,
        gameState: afterPrematureVictoryState.gameState
      });
      assertCondition(assertions, afterPrematureVictoryState.gameOverModalVisible === false, 'Premature Goliath victory block does not open generic game-over modal', {
        gameOverModalVisible: afterPrematureVictoryState.gameOverModalVisible
      });

	      await page.evaluate(() => {
	        if (typeof network === 'undefined' || !network || !network.engine || !network.engine.gameState) {
	          throw new Error('Engine unavailable for boss defeat simulation');
	        }
	        const boss = network.engine.gameState.monsters.find((monster) => monster && monster.isBoss);
	        if (!boss) throw new Error('Goliath boss unavailable for defeat simulation');
	        network.engine.gameState.monsters = network.engine.gameState.monsters.filter((monster) => monster.id !== boss.id);
	        network.engine.gameState.monstersKilled = (network.engine.gameState.monstersKilled || 0) + 1;
	        network.engine.emitter.emit('monsterKilled', {
	          monsterId: boss.id,
	          x: boss.x,
	          y: boss.y,
	          isBoss: true,
	          bossLabel: boss.bossLabel || boss.label || 'Goliath',
	          bonusXp: boss.bonusXp || 0
	        });
	        network.engine.emitter.emit('gameStateUpdate', network.engine.gameState);
	      });
	      await page.waitForFunction(() => {
	        return typeof window.isStoryPaused === 'function' &&
	          window.isStoryPaused() &&
          window.__integratedStoryState &&
          window.__integratedStoryState.phaseId === 'victory';
      }, null, { timeout: 5000 });
      afterBossVictoryState = await captureState(page, 'after-boss-victory');

      assertCondition(assertions, afterBossVictoryState.storyPaused === true, 'Goliath defeat opens David victory dialogue instead of game-over modal', {
        storyPauseDebug: afterBossVictoryState.storyPauseDebug,
        gameOverModalVisible: afterBossVictoryState.gameOverModalVisible
      });
	      assertCondition(assertions, afterBossVictoryState.integratedStoryState &&
	        afterBossVictoryState.integratedStoryState.phaseId === 'victory' &&
	        afterBossVictoryState.integratedStoryState.victoryStarted === true &&
	        afterBossVictoryState.integratedStoryState.bossDefeated === true, 'Integrated story state enters victory after Goliath defeat', {
	        integratedStoryState: afterBossVictoryState.integratedStoryState
	      });
      assertCondition(assertions, afterBossVictoryState.gameOverModalVisible === false, 'Integrated victory suppresses generic game-over modal', {
        gameOverModalVisible: afterBossVictoryState.gameOverModalVisible
      });

      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.gameMode === 'overland' && !window.currentMission, null, { timeout: 5000 });
      await page.waitForTimeout(350);
      afterVictoryCompleteState = await captureState(page, 'after-victory-complete');
      assertCondition(assertions, afterVictoryCompleteState.gameMode === 'overland', 'Completing victory dialogue returns to overland', {
        gameMode: afterVictoryCompleteState.gameMode
      });
      assertCondition(assertions, afterVictoryCompleteState.currentMission === null, 'Completing victory dialogue clears current mission', {
        currentMission: afterVictoryCompleteState.currentMission
      });
    }

    const failed = assertions.filter((entry) => !entry.pass);
    await writeJson('summary.json', {
      expectedLegacyStoryMode: false,
      enableIntegratedStory: ENABLE_INTEGRATED_STORY,
      simulateCoreLoopConfig: SIMULATE_CORE_LOOP_CONFIG,
      forceLegacyStory: FORCE_LEGACY_STORY,
      expectIntegratedStory: EXPECT_INTEGRATED_STORY,
      integratedStoryDetected,
      shouldRunIntegratedStoryAssertions,
      assertions,
      initialState,
      afterIntroState,
      afterCollectThresholdState,
      afterMoveState,
      afterStonesState,
      afterPuzzleWrongState,
	      afterPuzzleCorrectState,
	      afterPuzzleResumeState,
	      afterBossFocusState,
	      afterEngineThresholdState,
	      afterPrematureVictoryState,
	      afterBossVictoryState,
      afterVictoryCompleteState,
      pausedMovement,
      stoneCollection,
      movement,
      consoleMessages,
      pageErrors
    });

    if (failed.length) {
      throw new Error(`Integrated David/Goliath regression failed ${failed.length} assertion(s)`);
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
