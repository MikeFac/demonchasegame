import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:3500/?viewMode=3d';
const outputDirectory = path.resolve(process.argv[3] || 'output/web-game/low-poly-3d-runtime-budget');
const headed = process.env.LOW_POLY_HEADED === '1';
fs.mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({
    headless: !headed,
    args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));

try {
    await page.addInitScript(() => localStorage.setItem('dcgame_speedPromptShown', 'true'));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof window.startMission === 'function', null, { timeout: 30000 });
    await page.evaluate(() => window.startMission('chapter0', 'intro-01'));
    await page.waitForFunction(() => window.lowPoly3DStats?.renderer === 'three' && window.lowPoly3DStats.entities?.players > 0, null, { timeout: 30000 });
    await page.waitForTimeout(1200);

    const frameSample = await page.evaluate(() => new Promise((resolve) => {
        const started = performance.now();
        let frames = 0;
        const sample = (now) => {
            frames++;
            if (now - started >= 2000) resolve({ frames, elapsedMs: now - started, fps: frames * 1000 / (now - started) });
            else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
    }));
    const result = await page.evaluate(() => ({
        stats: window.lowPoly3DStats,
        debug: window.lowPoly3DRenderer?.debugState || null,
        rendererClass: window.lowPoly3DRenderer?.constructor?.name || null
    }));
    result.frameSample = frameSample;
    result.errors = errors;
    fs.writeFileSync(path.join(outputDirectory, 'result.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(outputDirectory, 'runtime.png'), fullPage: true });

    const failures = [];
    if (result.rendererClass !== 'RendererThreeJS') failures.push(`renderer is ${result.rendererClass}`);
    if (result.stats.supportProbeCount !== 1) failures.push(`WebGL support probe ran ${result.stats.supportProbeCount} times instead of once`);
    if (result.stats.calls > 100) failures.push(`${result.stats.calls} draw calls exceed 100`);
    if (result.stats.triangles > 150000) failures.push(`${result.stats.triangles} triangles exceed 150000`);
    if (result.stats.context?.lost) failures.push('WebGL context remained lost at the end of the runtime sample');
    const projectedMonsters = result.debug?.monsters || [];
    if (result.stats.entities?.monsters > 0 && !projectedMonsters.some((monster) => monster.projected?.onScreen)) {
        failures.push('active monsters exist but none project inside the camera viewport');
    }
    const topUnsafeMonsters = projectedMonsters.filter((monster) => monster.projected?.onScreen && monster.projected.y > 0.75);
    if (topUnsafeMonsters.length) failures.push(`${topUnsafeMonsters.length} monster(s) project underneath the top HUD safe area`);
    if (Object.keys(result.stats.assets?.failures || {}).length) failures.push(`asset load failures: ${JSON.stringify(result.stats.assets.failures)}`);
    if (errors.length) failures.push(`${errors.length} browser console/page error(s)`);
    console.log(JSON.stringify({ ...result, failures }, null, 2));
    if (failures.length) process.exitCode = 1;
} finally {
    await browser.close();
}
