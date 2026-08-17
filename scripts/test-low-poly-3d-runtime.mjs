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
const normalizeAngle = (angle) => {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
};
page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', text: message.text(), url: message.location().url || null });
});
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));

try {
    await page.addInitScript(() => localStorage.setItem('dcgame_speedPromptShown', 'true'));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof window.startMission === 'function', null, { timeout: 30000 });
    await page.waitForFunction(() => {
        const splash = document.getElementById('splashScreen');
        return !splash || getComputedStyle(splash).display === 'none';
    }, null, { timeout: 6000 });
    await page.evaluate(() => window.startMission('chapter0', 'intro-01'));
    await page.waitForFunction(() => window.lowPoly3DStats?.renderer === 'three' && window.lowPoly3DStats.entities?.players > 0, null, { timeout: 30000 });
    await page.waitForTimeout(1200);

    const angleBeforeTurn = await page.evaluate(() => player.viewAngle);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    // Wait for the post-release game frame that consumes rotation accumulated
    // while the key was held. Initial shader compilation can delay that frame
    // substantially on the headless software GPU.
    await page.waitForFunction((before) => {
        const current = player?.viewAngle;
        const pending = typeof inputHandler === 'undefined' ? null : inputHandler?.pendingTurnRadians;
        return Number.isFinite(current)
            && Math.abs(current - before) > 0.001
            && Number.isFinite(pending)
            && Math.abs(pending) < 0.000001;
    }, angleBeforeTurn, { timeout: 2500 });
    await page.waitForTimeout(100);
    const angleAfterTurn = await page.evaluate(() => player.viewAngle);
    await page.waitForTimeout(350);
    const angleAfterRelease = await page.evaluate(() => player.viewAngle);
    const controlSample = {
        angleBeforeTurn,
        angleAfterTurn,
        angleAfterRelease,
        turnRadians: normalizeAngle(angleAfterTurn - angleBeforeTurn),
        releaseDriftRadians: Math.abs(normalizeAngle(angleAfterRelease - angleAfterTurn))
    };

    // Aim exactly along a wall-free ray for the projectile assertion.
    // Continuous user-driven rotation is measured independently above, while
    // deterministic placement keeps random missions and wall occlusion from
    // making this legacy compatibility test flaky.
    const targetState = await page.evaluate(() => {
        const monster = monsters?.[0];
        if (!monster) return null;
        let targetAngle = 0;
        for (let degree = 0; degree < 360; degree++) {
            const angle = degree * Math.PI / 180;
            if (!findNearestWallRayHit(player.x, player.y, Math.cos(angle), Math.sin(angle), 180)) {
                targetAngle = angle;
                break;
            }
        }
        monster.x = player.x + Math.cos(targetAngle) * 110;
        monster.y = player.y + Math.sin(targetAngle) * 110;
        player.viewAngle = targetAngle;
        lastAttackTime = 0;
        const aim = resolveThirdPersonAim(monsters, player);
        const accepted = tryHandle3DFire(monsters, Date.now());
        return {
            id: monster.id,
            health: monster.health,
            angle: targetAngle,
            targetAngle,
            aimType: aim.type,
            accepted
        };
    });
    await page.waitForTimeout(100);

    let projectileSample = null;
    if (targetState) {
        targetState.delta = normalizeAngle(targetState.targetAngle - targetState.angle);
        targetState.distance = await page.evaluate((id) => {
            const state = window.lowPoly3DRenderer.debugState;
            const monster = state.monsters.find((candidate) => candidate.id === id);
            return monster ? Math.hypot(monster.x - state.player.x, monster.y - state.player.y) : null;
        }, targetState.id);
        const healthBefore = targetState.health;
        await page.waitForFunction(({ id, health }) => {
            const state = window.lowPoly3DRenderer?.debugState;
            const monster = state?.monsters?.find((candidate) => candidate.id === id);
            return state?.performance?.entities?.shotTracers > 0 && monster?.health < health;
        }, { id: targetState.id, health: healthBefore }, { timeout: 2000 });
        projectileSample = await page.evaluate((id) => {
            const state = window.lowPoly3DRenderer.debugState;
            return {
                targetId: id,
                health: state.monsters.find((monster) => monster.id === id)?.health,
                shotTracers: state.performance.entities.shotTracers,
                tracerDebug: state.shotTracers
            };
        }, targetState.id);
        projectileSample.healthBefore = healthBefore;
        await page.screenshot({ path: path.join(outputDirectory, 'projectile.png'), fullPage: true });
        await page.waitForTimeout(1000);
        projectileSample.shotTracersAfterCleanup = await page.evaluate(() => window.lowPoly3DStats.entities.shotTracers);
    }

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
    result.controlSample = controlSample;
    result.projectileSample = projectileSample;
    result.errors = errors;
    fs.writeFileSync(path.join(outputDirectory, 'result.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(outputDirectory, 'runtime.png'), fullPage: true });

    const failures = [];
    if (result.rendererClass !== 'RendererThreeJS') failures.push(`renderer is ${result.rendererClass}`);
    if (result.stats.supportProbeCount !== 1) failures.push(`WebGL support probe ran ${result.stats.supportProbeCount} times instead of once`);
    if (result.stats.calls > 100) failures.push(`${result.stats.calls} draw calls exceed 100`);
    if (result.stats.triangles > 150000) failures.push(`${result.stats.triangles} triangles exceed 150000`);
    if (!result.stats.assets?.authoredLoaded?.includes('monster.fear')) failures.push('authored monster.fear did not load');
    if (result.stats.context?.lost) failures.push('WebGL context remained lost at the end of the runtime sample');
    if (controlSample.turnRadians < 0.08) failures.push(`held right turn only moved ${controlSample.turnRadians.toFixed(3)} radians`);
    if (controlSample.releaseDriftRadians > 0.02) failures.push(`turn drifted ${controlSample.releaseDriftRadians.toFixed(3)} radians after release`);
    if (!projectileSample || projectileSample.shotTracers < 1) failures.push('visible shot tracer was not observed');
    if (projectileSample && projectileSample.health >= projectileSample.healthBefore) failures.push('shot tracer did not preserve hitscan damage');
    if (projectileSample?.shotTracersAfterCleanup !== 0) failures.push('shot tracer did not clean itself up');
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
