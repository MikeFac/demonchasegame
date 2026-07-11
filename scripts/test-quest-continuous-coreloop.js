const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'quest-continuous-coreloop');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3500/';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function state(page) {
    return page.evaluate(() => {
        const story = window.__integratedStoryState || {};
        const pause = window.__storyPauseDebug ? window.__storyPauseDebug.snapshot().state : null;
        return {
            paused: window.isStoryPaused(),
            pauseType: pause ? pause.type : null,
            pausePhase: pause ? pause.phaseId : null,
            completedSteps: Object.keys(story.completedSteps || {}),
            activeSteps: Object.keys(story.activeSteps || {}),
            objectiveProgress: story.objectiveProgress || {},
            collectibles: (gameState.collectibles || []).map(item => ({
                id: item.id, stepId: item.storyStepId, type: item.type
            }))
        };
    });
}

async function main() {
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage({ viewport: { width: 512, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(() => window.startMission('generated', 'armor-of-god-01'));
        await page.waitForFunction(() => window.gameMode === 'game' && window.isStoryPaused(), { timeout: 15000 });

        let current = await state(page);
        assert(current.pausePhase === 'intro', 'continuous mission should show the intro first: ' + JSON.stringify(current));
        await page.waitForTimeout(500);
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '01-intro.png') });

        await page.evaluate(() => { advanceStoryPause(); advanceStoryPause(); });
        await page.waitForFunction(() => window.__integratedStoryState && window.__integratedStoryState.currentStepId === 'learnBelt');
        current = await state(page);
        assert(current.pausePhase === 'step-learnBelt', 'learnBelt should open after the intro, not a hub');
        assert(current.pauseType !== 'questHub', 'continuous mission must not show a quest hub');
        await page.waitForTimeout(500);
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '02-learn-belt.png') });

        await page.evaluate(() => { advanceStoryPause(); advanceStoryPause(); });
        await page.waitForFunction(() => window.__integratedStoryState && window.__integratedStoryState.activeSteps && window.__integratedStoryState.activeSteps.collectBreastplate);
        current = await state(page);
        assert(!current.paused, 'collectible objective should run in the maze');
        assert(current.collectibles.some(item => item.stepId === 'collectBreastplate'), 'breastplate should be active in the maze');
        assert(!current.activeSteps.includes('learnBelt'), 'completed learn step should leave active objectives');
        await page.waitForTimeout(500);
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '03-breastplate-active.png') });

        await page.evaluate(() => {
            const item = gameState.collectibles.find(entry => entry.storyStepId === 'collectBreastplate');
            if (!item) throw new Error('Breastplate collectible missing');
            collectIntegratedStoryItem(item);
        });
        await page.waitForFunction(() => window.__integratedStoryState && window.__integratedStoryState.completedSteps && window.__integratedStoryState.completedSteps.collectBreastplate);
        await page.waitForFunction(() => window.isStoryPaused() && window.__integratedStoryState.currentStepId === 'learnShoes');
        current = await state(page);
        assert(current.pausePhase === 'step-learnShoes', 'collecting breastplate should unlock the next learn step in place');
        assert(current.pauseType !== 'questHub', 'continuous unlock must not return to quest hub');
        await page.waitForTimeout(500);
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '04-learn-shoes.png') });

        await fs.promises.writeFile(path.join(OUTPUT_DIR, 'state.json'), JSON.stringify({ current, errors }, null, 2));
        console.log('Continuous quest flow passed');
    } finally {
        await browser.close();
    }
    assert(errors.length === 0, 'page errors: ' + errors.join('; '));
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
});
