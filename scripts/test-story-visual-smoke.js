const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'story-david-goliath-smoke');
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

async function launchPhase(page, phaseId, names) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);

    await page.evaluate(async (targetPhaseId) => {
        const response = await fetch('/missions/featured-david-goliath.json');
        const data = await response.json();
        const mission = data.missions[0];
        const phase = mission.storyPhases.find((entry) => entry.id === targetPhaseId);
        if (!phase) {
            throw new Error(`Missing story phase: ${targetPhaseId}`);
        }

        if (targetPhaseId === 'collectStones' && mission.collectCombatConfig && Array.isArray(mission.collectCombatConfig.fixedMonsters)) {
            mission.collectCombatConfig.fixedMonsters = mission.collectCombatConfig.fixedMonsters.map((monster, index) => {
                const positions = [
                    { x: 1760, y: 1660 },
                    { x: 1320, y: 1160 },
                    { x: 1100, y: 1500 }
                ];
                return Object.assign({}, monster, positions[index] || {});
            });
        }

        if (targetPhaseId === 'bossFight' && mission.combatConfig && Array.isArray(mission.combatConfig.fixedMonsters)) {
            mission.combatConfig.fixedMonsters = mission.combatConfig.fixedMonsters.map((monster, index) => {
                const positions = [
                    { x: 1640, y: 1120 },
                    { x: 1320, y: 1220 },
                    { x: 1880, y: 1260 }
                ];
                return Object.assign({}, monster, positions[index] || {});
            });
        }

        mission.storyPhases = [Object.assign({}, phase, { nextPhase: null })];
        window.currentMission = mission;

        if (!window.StoryMissionLauncher || typeof window.StoryMissionLauncher.start !== 'function') {
            throw new Error('StoryMissionLauncher is unavailable');
        }

        window.StoryMissionLauncher.start({
            canvas: document.getElementById('gameCanvas'),
            ctx: document.getElementById('gameCanvas').getContext('2d'),
            mission,
            npcImages: {},
            onEndGame: function () {},
            onLeaveGame: function () {},
            onRestartGame: function () {}
        });
    }, phaseId);

    await page.waitForFunction(() => window.gameMode === 'story', { timeout: 10000 });
    await page.waitForTimeout(1800);

    await page.locator('#gameCanvas').screenshot({
        path: path.join(OUTPUT_DIR, names.shot)
    });

    const state = await page.evaluate(() => ({
        gameMode: window.gameMode,
        currentMission: window.currentMission ? {
            id: window.currentMission.id,
            gameMode: window.currentMission.gameMode
        } : null,
        renderText: typeof window.render_game_to_text === 'function'
            ? window.render_game_to_text()
            : null
    }));

    await writeJson(names.state, state);
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

    try {
        await launchPhase(page, 'collectStones', {
            shot: 'collect-phase.png',
            state: 'collect-state.json'
        });
        await launchPhase(page, 'bossFight', {
            shot: 'boss-phase.png',
            state: 'boss-state.json'
        });
    } finally {
        await writeJson('errors.json', { consoleMessages, pageErrors });
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
