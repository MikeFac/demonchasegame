const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'npc-proximity-interaction');

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
    await page.evaluate(() => localStorage.setItem('dcgame_speedPromptShown', 'true'));
    await page.click('#btnSolo');
    await page.waitForFunction(() => window.gameMode === 'game' && player && window.renderer, { timeout: 15000 });
    await page.evaluate(() => {
      currentMission = {
        id: 'npc-proximity-test',
        name: 'NPC Proximity Test',
        npcInteractions: [{
          id: 'talk-guide',
          npcId: 'guide',
          npcName: 'Guide',
          position: { x: player.x + 38, y: player.y + 8 },
          radius: 120,
          once: true,
          lines: ['You found me in the maze.', 'Keep going with courage.']
        }]
      };
      window.currentMission = currentMission;
      missionNpcInteractionState = { completed: {} };
    });
    await page.waitForFunction(() => !!window.getNearbyMissionNpcInteraction());
    const before = await page.evaluate(() => window.getNearbyMissionNpcInteraction());
    assert(before && before.id === 'talk-guide', 'NPC should be available when the player is nearby');
    await page.waitForTimeout(400);
    await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '01-nearby-npc.png') });

    await page.keyboard.press('e');
    await page.waitForFunction(() => window.isStoryPaused() && window.__storyPauseDebug.snapshot().state.npcInteractionId === 'talk-guide');
    await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '02-npc-dialogue.png') });

    await page.evaluate(() => { advanceStoryPause(); advanceStoryPause(); });
    await page.waitForFunction(() => !window.isStoryPaused() && !window.getNearbyMissionNpcInteraction());
    const after = await page.evaluate(() => ({ nearby: window.getNearbyMissionNpcInteraction(), pause: window.isStoryPaused() }));
    assert(after.nearby === null && !after.pause, 'one-time interaction should complete and no longer be available');
    await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '03-after-conversation.png') });
    await fs.promises.writeFile(path.join(OUTPUT_DIR, 'state.json'), JSON.stringify({ before, after, errors }, null, 2));
    console.log('NPC proximity interaction passed');
  } finally {
    await browser.close();
  }
  assert(errors.length === 0, 'page errors: ' + errors.join('; '));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
