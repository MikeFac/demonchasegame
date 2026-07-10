const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'story-david-goliath-smoke');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3500/';

async function ensureDir(dir) {
    await fs.promises.mkdir(dir, { recursive: true });
}

async function writeJson(name, data) {
    await fs.promises.writeFile(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 2));
}

async function main() {
    await ensureDir(OUTPUT_DIR);

    const browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
        pageErrors.push({ message: err.message, stack: err.stack });
    });

    try {
        // Load the page
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Fetch the David & Goliath mission
        const missionData = await page.evaluate(async () => {
            const response = await fetch('/missions/featured-david-goliath.json');
            const data = await response.json();
            const mission = data.missions[0];
            return {
                id: mission.id,
                gameMode: mission.gameMode,
                storyIntegration: mission.storyIntegration,
                phaseCount: mission.storyPhases.length
            };
        });
        console.log('Mission:', JSON.stringify(missionData));

        // Launch the mission via the core-loop path (same as game.js startMission)
        await page.evaluate(async () => {
            const response = await fetch('/missions/featured-david-goliath.json');
            const data = await response.json();
            const mission = data.missions[0];

            // Simulate what startMission does for coreLoop story missions
            window.organizedVerses = window.organizedVerses || {};
            window.currentMission = mission;

            // Build the config and start the game
            const config = window.CoreStoryDirector.buildCollectCombatConfig(mission);
            const storyCollectibleSeed = window.CoreStoryDirector.buildCollectibleSeed(mission);
            if (storyCollectibleSeed) {
                storyCollectibleSeed.puzzlePause = window.CoreStoryDirector.buildPuzzlePause(mission);
            }

            // Call startGame with story options (same as game.js)
            // We need to use the global startGame function
            window.startGame('solo', undefined, {
                config: config,
                mapStyle: mission.mapStyle || 'open',
                qualities: mission.qualities,
                storyIntroPause: window.CoreStoryDirector.buildIntroPause(mission),
                storyCollectibleSeed: storyCollectibleSeed
            });
        });

        // Wait for game mode to be 'game'
        await page.waitForFunction(() => window.gameMode === 'game', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Take screenshot — should show the game with intro dialogue overlay
        await page.locator('#gameCanvas').screenshot({
            path: path.join(OUTPUT_DIR, 'collect-phase.png')
        });

        // Check the game state
        const state = await page.evaluate(() => ({
            gameMode: window.gameMode,
            isStoryPaused: typeof window.isStoryPaused === 'function' ? window.isStoryPaused() : null,
            currentMission: window.currentMission ? {
                id: window.currentMission.id,
                gameMode: window.currentMission.gameMode,
                storyIntegration: window.currentMission.storyIntegration
            } : null
        }));
        console.log('State:', JSON.stringify(state));
        await writeJson('collect-state.json', state);

    } finally {
        await writeJson('errors.json', { consoleMessages, pageErrors });
        await browser.close();
    }

    // Check results
    const errors = pageErrors;
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    console.log('\n=== RESULTS ===');
    console.log('Page errors:', errors.length);
    errors.forEach(e => console.log('  PAGE ERROR:', e.message));
    console.log('Console errors:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('  ERROR:', e.text.substring(0, 200)));
    console.log('Engine logs:');
    consoleMessages.filter(m => m.text && (m.text.indexOf('core-loop') >= 0 || m.text.indexOf('Story') >= 0 || m.text.indexOf('STORY') >= 0)).forEach(m => console.log('  ', m.text));

    if (errors.length > 0) process.exit(1);
}

main().catch(async (error) => {
    try {
        await ensureDir(OUTPUT_DIR);
        await writeJson('fatal-error.json', { message: error.message, stack: error.stack });
    } catch (_) {}
    console.error(error);
    process.exit(1);
});