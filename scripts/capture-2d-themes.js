/**
 * Capture 2D combat screenshots for each terrain theme.
 *
 * Phase 0 baseline tooling for plans/2d-background-graphics-plan.md.
 * Uses the `?theme=` dev override, which only affects 2D rendering.
 *
 *   node scripts/capture-2d-themes.js after
 *   node scripts/capture-2d-themes.js before   (on a build without ?theme=)
 *
 * Writes docs/graphics/2d-phase1/<prefix>-<theme>.png (canvas only).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.DC_BASE_URL || 'http://localhost:3500';
const THEMES = ['city', 'earth', 'crystal', 'shadow', 'void'];
const OUT_DIR = path.join(__dirname, '..', 'docs', 'graphics', '2d-phase1');

/**
 * Click the canvas-drawn "Got it!" button of the Game Speed panel.
 * The panel is centred horizontally and its button sits ~351px down a
 * 600px-tall playfield. Harmless when the panel is not showing.
 */
async function dismissCanvasPrompt(page) {
    await page.evaluate(() => {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width ? (rect.width / 512) : 1;
        const scaleY = rect.height ? (rect.height / 600) : 1;
        const points = [
            [256, 352], // "Got it!"
            [250, 300], // playfield, dismisses other hints
        ];
        for (const [x, y] of points) {
            canvas.dispatchEvent(new MouseEvent('click', {
                clientX: rect.x + x * scaleX,
                clientY: rect.y + y * scaleY,
                bubbles: true
            }));
        }
    });
}

async function main() {
    const prefix = process.argv[2] || 'after';
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    // Suppress first-run canvas onboarding so the capture shows the world, not
    // the "Game Speed" modal / tooltip. These flags are what game.js reads.
    await page.addInitScript(() => {
        try {
            localStorage.setItem('dcgame_speedTooltipShown', 'true');
            localStorage.setItem('dcgame_speedPromptShown', 'true');
        } catch (e) { /* ignore */ }
    });

    for (const theme of THEMES) {
        const url = `${BASE}/?theme=${theme}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Dismiss the splash / reach the menu, then start solo.
        await page.waitForSelector('#btnSolo', { state: 'visible', timeout: 20000 });
        await page.click('#btnSolo');

        // Let the world load, then give the timed tutorial hint time to clear.
        await page.waitForTimeout(1200);
        await dismissCanvasPrompt(page);
        await page.waitForTimeout(3200);
        await dismissCanvasPrompt(page);

        const canvas = await page.$('#gameCanvas');
        if (!canvas) throw new Error('gameCanvas not found');

        const file = path.join(OUT_DIR, `${prefix}-${theme}.png`);
        await canvas.screenshot({ path: file });
        console.log('captured', path.relative(process.cwd(), file));

        // Return to the menu between runs so the next theme starts clean.
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    }

    await browser.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
