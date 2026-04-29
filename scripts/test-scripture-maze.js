const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function main() {
    const outDir = path.join(process.cwd(), 'output', 'web-game', 'scripture-maze-direct');
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch({
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push({ type: 'console.error', text: msg.text() });
        }
    });
    page.on('pageerror', (err) => {
        errors.push({ type: 'pageerror', text: String(err) });
    });

    try {
        await page.goto('http://localhost:3500/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#gameCanvas', { timeout: 10000, state: 'attached' });
        await page.waitForTimeout(1000);

        await page.evaluate(async () => {
            if (typeof startMission !== 'function') {
                throw new Error('startMission is not available');
            }
            await startMission('chapter6', 'maze-01');
        });

        await page.waitForFunction(() => window.gameMode === 'scriptureMaze', { timeout: 10000 });
        await page.waitForTimeout(1200);

        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(400);
        await page.keyboard.up('ArrowLeft');

        await page.keyboard.press('Space');
        await page.waitForTimeout(300);

        const stateText = await page.evaluate(() => {
            if (typeof window.render_game_to_text === 'function') {
                return window.render_game_to_text();
            }
            return null;
        });

        await page.locator('#gameCanvas').screenshot({
            path: path.join(outDir, 'shot-0.png')
        });

        if (stateText) {
            fs.writeFileSync(path.join(outDir, 'state-0.json'), stateText);
        }
        if (errors.length) {
            fs.writeFileSync(path.join(outDir, 'errors-0.json'), JSON.stringify(errors, null, 2));
        }
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
