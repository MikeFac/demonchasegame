const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'quest-hub-coreloop');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3500/';

async function ensureDir(dir) { await fs.promises.mkdir(dir, { recursive: true }); }

async function main() {
    await ensureDir(OUTPUT_DIR);

    const browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage({ viewport: { width: 512, height: 600 } });
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => { consoleMessages.push({ type: msg.type(), text: msg.text() }); });
    page.on('pageerror', (err) => { pageErrors.push({ message: err.message, stack: err.stack }); });

    const results = { steps: [], errors: pageErrors };

    function log(msg) { console.log(msg); }

    try {
        // 1. Load the page
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        results.steps.push({ step: 'page-load', ok: true });

        // 2. Launch the Armor of God mission via startMission (same as overland map)
        await page.evaluate(async () => {
            if (typeof window.startMission !== 'function') throw new Error('startMission not available');
            await window.startMission('generated', 'armor-of-god-01');
        });

        // Wait for game mode
        await page.waitForFunction(() => window.gameMode === 'game', { timeout: 15000 });
        await page.waitForTimeout(3000);
        results.steps.push({ step: 'launch', ok: true });

        // 3. Check that the quest hub pause is showing
        let hubState = await page.evaluate(() => {
            return {
                gameMode: window.gameMode,
                isStoryPaused: window.isStoryPaused ? window.isStoryPaused() : null,
                pauseType: window.__storyPauseDebug ? (window.__storyPauseDebug.state ? window.__storyPauseDebug.state.type : null) : null
            };
        });
        log('Hub state: ' + JSON.stringify(hubState));
        results.steps.push({ step: 'hub-initial', ok: true, data: hubState });

        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '01-hub.png') }).catch(() => {});

        // 4. Check the hub rendering — count clickable step cards
        let hubCards = await page.evaluate(() => {
            var canvas = document.getElementById('gameCanvas');
            var ctx = canvas.getContext('2d');
            // Check for yellow title text at top
            var titlePixels = 0;
            for (var y = 20; y < 35; y++) {
                for (var x = 0; x < canvas.width; x++) {
                    var idx = (y * canvas.width + x) * 4;
                    var r = ctx.getImageData(x, y, 1, 1).data[0];
                    var g = ctx.getImageData(x, y, 1, 1).data[1];
                    var b = ctx.getImageData(x, y, 1, 1).data[2];
                    if (r > 200 && g > 180 && b < 120) titlePixels++;
                }
            }
            return { titlePixels: titlePixels };
        });
        log('Hub title pixels: ' + JSON.stringify(hubCards));
        results.steps.push({ step: 'hub-rendered', ok: true, data: hubCards });

        // 5. Click on the first quest step (learnBelt — first card at y~82)
        // Use evaluate to dispatch click directly to avoid Playwright interception issues
        await page.evaluate((coords) => {
            var canvas = document.getElementById('gameCanvas');
            var rect = canvas.getBoundingClientRect();
            var evt = new MouseEvent('click', {
                clientX: rect.left + coords.x,
                clientY: rect.top + coords.y,
                bubbles: true
            });
            canvas.dispatchEvent(evt);
        }, { x: 200, y: 82 });
        await page.waitForTimeout(1500);
        results.steps.push({ step: 'click-learnBelt', ok: true });

        // 6. Check if we're now in a dialogue pause (learn step)
        let dialogueState = await page.evaluate(() => {
            return {
                isStoryPaused: window.isStoryPaused ? window.isStoryPaused() : null,
                integratedState: window.__integratedStoryState ? {
                    currentStepId: window.__integratedStoryState.currentStepId,
                    phaseId: window.__integratedStoryState.phaseId
                } : null
            };
        });
        log('After click learnBelt: ' + JSON.stringify(dialogueState));
        results.steps.push({ step: 'learnBelt-dialogue', ok: true, data: dialogueState });

        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '02-learnBelt.png') }).catch(() => {});

        // 7. Advance through the dialogue — click the continue button
        // Button is at approximately (264, 468) with size (112, 30)
        // Canvas is 400x520
        for (let i = 0; i < 4; i++) {
            await page.evaluate((coords) => {
                var canvas = document.getElementById('gameCanvas');
                var rect = canvas.getBoundingClientRect();
                var evt = new MouseEvent('click', {
                    clientX: rect.left + coords.x,
                    clientY: rect.top + coords.y,
                    bubbles: true
                });
                canvas.dispatchEvent(evt);
            }, { x: 320, y: 483 });
            await page.waitForTimeout(600);
        }
        await page.waitForTimeout(1000);
        results.steps.push({ step: 'advance-learnBelt', ok: true });

        // 8. Check if we're back at the quest hub with learnBelt completed
        let afterLearnBelt = await page.evaluate(() => {
            var state = window.__integratedStoryState;
            return {
                isStoryPaused: window.isStoryPaused ? window.isStoryPaused() : null,
                pauseType: window.__storyPauseDebug ? (window.__storyPauseDebug.state ? window.__storyPauseDebug.state.type : null) : null,
                completedSteps: state ? Object.keys(state.completedSteps || {}) : [],
                learnedSkills: state ? Object.keys(state.learnedSkills || {}) : [],
                currentStepId: state ? state.currentStepId : null
            };
        });
        log('After learnBelt: ' + JSON.stringify(afterLearnBelt));
        results.steps.push({ step: 'hub-after-learnBelt', ok: true, data: afterLearnBelt });

        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '03-hub-after-learnBelt.png') }).catch(() => {});

        // 9. Check that learnBelt is completed and collectBreastplate is unlocked
        if (afterLearnBelt.completedSteps && afterLearnBelt.completedSteps.indexOf('learnBelt') >= 0) {
            log('PASS: learnBelt is completed');
        } else {
            log('FAIL: learnBelt is not completed');
        }
        if (afterLearnBelt.learnedSkills && afterLearnBelt.learnedSkills.indexOf('truthBelt') >= 0) {
            log('PASS: truthBelt skill granted');
        } else {
            log('FAIL: truthBelt skill not granted');
        }

        // 10. Click collectBreastplate (second card, y ~136)
        await page.evaluate((coords) => {
            var canvas = document.getElementById('gameCanvas');
            var rect = canvas.getBoundingClientRect();
            var evt = new MouseEvent('click', {
                clientX: rect.left + coords.x,
                clientY: rect.top + coords.y,
                bubbles: true
            });
            canvas.dispatchEvent(evt);
        }, { x: 200, y: 136 });
        await page.waitForTimeout(3000);
        results.steps.push({ step: 'click-collectBreastplate', ok: true });

        // 11. Check state — should be in combatCollect phase (game running, not paused)
        let collectState = await page.evaluate(() => {
            var state = window.__integratedStoryState;
            return {
                gameMode: window.gameMode,
                isStoryPaused: window.isStoryPaused ? window.isStoryPaused() : null,
                currentStepId: state ? state.currentStepId : null,
                objectType: state ? state.objectType : null,
                targetCount: state ? state.targetCount : null
            };
        });
        log('After click collectBreastplate: ' + JSON.stringify(collectState));
        results.steps.push({ step: 'collectBreastplate-started', ok: true, data: collectState });

        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, '04-collectBreastplate.png') }).catch(() => {});

    } catch (error) {
        results.fatalError = { message: error.message, stack: error.stack };
        log('FATAL: ' + error.message);
    } finally {
        results.consoleErrors = consoleMessages.filter(m => m.type === 'error');
        results.engineLogs = consoleMessages.filter(m => m.text && (m.text.indexOf('core-loop') >= 0 || m.text.indexOf('[STORY]') >= 0 || m.text.indexOf('quest') >= 0));
        await fs.promises.writeFile(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
        await browser.close();
    }

    log('\n=== RESULTS ===');
    results.steps.forEach(s => {
        log('  ' + s.step + ': ' + (s.ok ? 'OK' : 'FAIL') + (s.data ? ' ' + JSON.stringify(s.data) : ''));
    });
    log('Page errors: ' + (results.errors || []).length);
    (results.errors || []).forEach(e => log('  PAGE ERROR: ' + e.message));
    log('Console errors: ' + (results.consoleErrors || []).length);
    (results.consoleErrors || []).forEach(e => log('  ERROR: ' + e.text.substring(0, 200)));
}

main().catch(err => { console.error(err); process.exit(1); });