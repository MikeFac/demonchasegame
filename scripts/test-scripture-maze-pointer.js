const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'scripture-maze-click-path');

async function ensureDir(dir) {
    await fs.promises.mkdir(dir, { recursive: true });
}

async function readState(page) {
    return page.evaluate(() => {
        if (typeof window.render_game_to_text !== 'function') return null;
        return JSON.parse(window.render_game_to_text());
    });
}

async function main() {
    await ensureDir(OUT_DIR);

    const browser = await chromium.launch({
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    try {
        await page.goto('http://localhost:3500/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#gameCanvas', { timeout: 10000, state: 'attached' });
        await page.waitForTimeout(800);

        await page.evaluate(async () => {
            await startMission('chapter6', 'maze-01');
        });

        await page.waitForFunction(() => window.gameMode === 'scriptureMaze', { timeout: 10000 });
        await page.waitForFunction(() => {
            const state = window.ScriptureMazeLauncher && window.ScriptureMazeLauncher._debugGetState && window.ScriptureMazeLauncher._debugGetState();
            return !!(state && state.status === 'playing' && state.player && state.player.alive);
        }, { timeout: 5000 });
        await page.waitForTimeout(60);

        const before = await readState(page);
        if (!before || !before.player) {
            throw new Error('Could not capture initial scripture-maze state');
        }

        const areaTarget = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const renderer = window.ScriptureMazeLauncher._debugGetRenderer && window.ScriptureMazeLauncher._debugGetRenderer();
            const state = window.ScriptureMazeLauncher._debugGetState && window.ScriptureMazeLauncher._debugGetState();
            if (!canvas || !renderer || !state || !state.player || !state.promptNode) return null;
            const rect = canvas.getBoundingClientRect();
            const target = renderer.worldToCanvas(state, state.promptNode.x, state.promptNode.y);
            return {
                x: rect.left + target.x,
                y: rect.top + target.y
            };
        });

        if (!areaTarget) {
            throw new Error('Could not compute click-path target');
        }

        await page.mouse.click(areaTarget.x, areaTarget.y);
        await page.waitForTimeout(700);

        const afterClick = await readState(page);

        await page.locator('#gameCanvas').screenshot({
            path: path.join(OUT_DIR, 'shot-0.png')
        });

        await fs.promises.writeFile(
            path.join(OUT_DIR, 'summary.json'),
            JSON.stringify({
                before,
                afterClick,
                checks: {
                    moved: !!afterClick && (afterClick.player.x !== before.player.x || afterClick.player.y !== before.player.y),
                    pathTargetPresent: !!afterClick && !!afterClick.pathTarget
                }
            }, null, 2)
        );
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
