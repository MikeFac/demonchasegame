import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3500/';
const outputDirectory = path.resolve(process.argv[3] || 'output/web-game/three-view-modes');
fs.mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {};
const failures = [];

async function createPage(viewMode) {
    const context = await browser.newContext({ viewport: { width: 920, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    await page.addInitScript(() => {
        localStorage.setItem('hasVisited', 'true');
        localStorage.setItem('dcgame_speedTooltipShown', 'true');
        localStorage.setItem('dcgame_speedPromptShown', 'true');
    });
    const url = new URL(baseUrl);
    if (viewMode) url.searchParams.set('viewMode', viewMode);
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    return { context, page, errors };
}

async function startSolo(page) {
    await page.click('#btnSolo');
    await page.waitForFunction(() => window.gameMode === 'game' && window.renderer, null, { timeout: 30000 });
}

async function captureComposited(page, name) {
    const canvas = page.locator('#gameCanvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('game canvas has no bounding box');
    await page.screenshot({
        path: path.join(outputDirectory, `${name}.png`),
        clip: { x: box.x, y: box.y, width: box.width, height: box.height }
    });
}

async function testMenuAndLegacyMigration() {
    const { context, page, errors } = await createPage('3d');
    const result = await page.evaluate(() => ({
        selected: document.getElementById('mainMenuViewModeSelect')?.value,
        options: Array.from(document.getElementById('mainMenuViewModeSelect')?.options || [])
            .map((option) => ({ value: option.value, label: option.textContent.trim() })),
        persisted: localStorage.getItem('preferredViewMode'),
        globalMode: window.viewMode
    }));
    results.menu = { ...result, errors };
    const expected = ['2d', 'third-person', 'first-person'];
    if (JSON.stringify(result.options.map((option) => option.value)) !== JSON.stringify(expected)) {
        failures.push(`view selector options are ${result.options.map((option) => option.value).join(', ')}`);
    }
    if (result.selected !== 'third-person' || result.persisted !== 'third-person' || result.globalMode !== 'third-person') {
        failures.push(`legacy 3d did not migrate to third-person: ${JSON.stringify(result)}`);
    }
    if (errors.length) failures.push(`menu/legacy browser errors: ${errors.join(' | ')}`);
    await context.close();
}

async function test2D() {
    const { context, page, errors } = await createPage('2d');
    await startSolo(page);
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
        const state = JSON.parse(window.render_game_to_text());
        return {
            viewMode: window.viewMode,
            renderer: window.renderer?.constructor?.name,
            rendererViewMode: window.renderer?.viewMode,
            stateViewMode: state.viewMode,
            stateRenderer: state.renderer,
            worldCanvasDisplay: getComputedStyle(document.getElementById('worldCanvas3D')).display,
            recoveryCanvasDisplay: getComputedStyle(document.getElementById('worldCanvasRecovery')).display
        };
    });
    results['2d'] = { ...result, errors };
    await page.evaluate(() => { speedPromptVisible = false; currentMission = null; });
    await page.waitForTimeout(50);
    await captureComposited(page, '2d');
    if (result.viewMode !== '2d' || result.renderer !== 'Renderer' || result.rendererViewMode !== '2d') {
        failures.push(`2D selected ${JSON.stringify(result)}`);
    }
    if (result.stateViewMode !== '2d' || result.stateRenderer !== 'Renderer') {
        failures.push(`2D text state is incorrect: ${JSON.stringify(result)}`);
    }
    if (result.worldCanvasDisplay !== 'none' || result.recoveryCanvasDisplay !== 'none') {
        failures.push('2D left a 3D canvas visible');
    }
    if (errors.length) failures.push(`2D browser errors: ${errors.join(' | ')}`);
    await context.close();
}

async function testThirdPerson() {
    const { context, page, errors } = await createPage('third-person');
    await startSolo(page);
    await page.waitForFunction(() => window.lowPoly3DStats?.cameraProfile === 'chase' && window.lowPoly3DStats.entities?.monsters > 0, null, { timeout: 30000 });
    const result = await page.evaluate(() => {
        const state = JSON.parse(window.render_game_to_text());
        return {
            viewMode: state.viewMode,
            renderer: window.renderer?.constructor?.name,
            camera: state.camera,
            supportProbeCount: state.performance?.supportProbeCount,
            context: state.context
        };
    });
    results['third-person'] = { ...result, errors };
    await page.evaluate(() => { speedPromptVisible = false; currentMission = null; });
    await page.waitForTimeout(50);
    await captureComposited(page, 'third-person');
    await page.locator('#worldCanvas3D').screenshot({ path: path.join(outputDirectory, 'third-person-world.png') });
    if (result.viewMode !== 'third-person' || result.renderer !== 'RendererThreeJS' || result.camera?.profile !== 'chase') {
        failures.push(`third-person selected ${JSON.stringify(result)}`);
    }
    if (result.camera?.localPlayerVisible !== true) failures.push('third-person local player is hidden');
    if (result.supportProbeCount !== 1) failures.push(`third-person support probes: ${result.supportProbeCount}`);
    if (result.context?.losses !== 0) failures.push(`third-person context losses: ${result.context.losses}`);
    if (errors.length) failures.push(`third-person browser errors: ${errors.join(' | ')}`);
    await context.close();
}

async function testFirstPerson() {
    const { context, page, errors } = await createPage('first-person');
    await startSolo(page);
    await page.waitForFunction(() => window.lowPoly3DStats?.cameraProfile === 'first-person' && window.lowPoly3DStats.entities?.monsters > 0, null, { timeout: 30000 });

    const initial = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const beforeMovement = await page.evaluate(() => ({ x: player.x, y: player.y, angle: player.viewAngle }));
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(320);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyD');
    const released = await page.evaluate(() => ({ x: player.x, y: player.y, angle: player.viewAngle }));
    await page.waitForTimeout(220);
    const settled = await page.evaluate(() => ({ x: player.x, y: player.y, angle: player.viewAngle }));

    const hitSetup = await page.evaluate(() => {
        const monster = monsters[0];
        let clearAngle = 0;
        for (let degree = 0; degree < 360; degree++) {
            const angle = degree * Math.PI / 180;
            if (!findNearestWallRayHit(player.x, player.y, Math.cos(angle), Math.sin(angle), 180)) {
                clearAngle = angle;
                break;
            }
        }
        monster.x = player.x + Math.cos(clearAngle) * 110;
        monster.y = player.y + Math.sin(clearAngle) * 110;
        player.viewAngle = clearAngle;
        lastAttackTime = 0;
        const before = monster.health;
        const aim = resolveFirstPersonAim(monsters, player);
        const accepted = tryHandle3DFire(monsters, Date.now());
        return { id: monster.id, before, aimType: aim.type, accepted };
    });
    await page.waitForTimeout(350);
    const hitResult = await page.evaluate((id) => ({
        health: monsters.find((monster) => monster.id === id)?.health,
        aim: JSON.parse(window.render_game_to_text()).aim
    }), hitSetup.id);

    await page.waitForTimeout(750);
    const blockedSetup = await page.evaluate(() => {
        const monster = monsters[0];
        let selected = null;
        for (let degree = 0; degree < 360; degree++) {
            const angle = degree * Math.PI / 180;
            const wall = findNearestWallRayHit(player.x, player.y, Math.cos(angle), Math.sin(angle), 300);
            if (wall && wall.distance > 25 && wall.distance < 250) {
                selected = { angle, wall };
                break;
            }
        }
        if (!selected) return null;
        player.viewAngle = selected.angle;
        monster.x = player.x + Math.cos(selected.angle) * (selected.wall.distance + 70);
        monster.y = player.y + Math.sin(selected.angle) * (selected.wall.distance + 70);
        lastAttackTime = 0;
        const before = monster.health;
        tryHandle3DFire(monsters, Date.now());
        return { id: monster.id, before, wallDistance: selected.wall.distance };
    });
    await page.waitForTimeout(250);
    const blockedResult = await page.evaluate((id) => ({
        health: id ? monsters.find((monster) => monster.id === id)?.health : null,
        aim: JSON.parse(window.render_game_to_text()).aim
    }), blockedSetup?.id || null);

    await page.evaluate(() => {
        speedPromptVisible = false;
        currentMission = null;
        const monster = monsters[0];
        let vantage = null;
        for (let degree = 0; degree < 360; degree++) {
            const angle = degree * Math.PI / 180;
            const x = monster.x - Math.cos(angle) * 145;
            const y = monster.y - Math.sin(angle) * 145;
            const wall = findNearestWallRayHit(x, y, Math.cos(angle), Math.sin(angle), 145);
            if (!checkWallCollision(x, y, player.width, player.height) && !wall) {
                vantage = { x, y, angle };
                break;
            }
        }
        if (vantage) {
            player.x = vantage.x;
            player.y = vantage.y;
            player.viewAngle = vantage.angle;
        }
        window.lowPoly3DRenderer.aimFeedback = { type: 'neutral', until: 0, distance: null, targetId: null, point: null };
    });
    await page.waitForTimeout(120);
    await captureComposited(page, 'first-person');
    await page.locator('#worldCanvas3D').screenshot({ path: path.join(outputDirectory, 'first-person-world.png') });
    await page.evaluate(() => { menuOpen = true; });
    await page.waitForTimeout(50);
    await captureComposited(page, 'first-person-menu');
    await page.evaluate(() => {
        menuOpen = false;
        window.lowPoly3DRenderer.webgl.forceContextLoss();
    });
    await page.waitForFunction(() => window.lowPoly3DStats?.renderer === 'three-snapshot-recovery', null, { timeout: 10000 });
    const recoveryLost = await page.evaluate(() => ({
        viewMode: window.lowPoly3DRenderer.viewMode,
        cameraProfile: window.lowPoly3DRenderer.cameraProfile,
        signature: window.lowPoly3DRenderer.recoverySnapshotSignature,
        recoveryVisible: getComputedStyle(document.getElementById('worldCanvasRecovery')).display,
        state: JSON.parse(window.render_game_to_text())
    }));
    await page.evaluate(() => window.lowPoly3DRenderer.webgl.forceContextRestore());
    await page.waitForFunction(() => window.lowPoly3DStats?.context?.restores >= 1 && !window.lowPoly3DStats?.context?.lost, null, { timeout: 10000 });
    await page.waitForTimeout(100);
    const recoveryRestored = await page.evaluate(() => ({
        context: window.lowPoly3DStats.context,
        worldVisible: getComputedStyle(document.getElementById('worldCanvas3D')).visibility,
        recoveryDisplay: getComputedStyle(document.getElementById('worldCanvasRecovery')).display
    }));

    const result = {
        initial: {
            viewMode: initial.viewMode,
            camera: initial.camera,
            performance: initial.performance,
            context: initial.context
        },
        movement: { before: beforeMovement, released, settled },
        hit: { setup: hitSetup, result: hitResult },
        blocked: { setup: blockedSetup, result: blockedResult },
        recovery: { lost: recoveryLost, restored: recoveryRestored },
        errors
    };
    results['first-person'] = result;

    if (initial.viewMode !== 'first-person' || initial.camera?.profile !== 'first-person') {
        failures.push(`first-person selected ${JSON.stringify(initial.camera)}`);
    }
    if (initial.camera?.localPlayerVisible !== false || initial.camera?.projectedPlayer !== null) {
        failures.push('first-person local player is visible');
    }
    if (initial.camera?.framing?.nearestMonsterId !== null) failures.push('first-person camera auto-framed a monster');
    if (Math.hypot(released.x - beforeMovement.x, released.y - beforeMovement.y) < 1) failures.push('first-person held movement did not move');
    if (Math.abs(released.angle - beforeMovement.angle) < 0.05) failures.push('first-person held turn did not turn');
    if (Math.hypot(settled.x - released.x, settled.y - released.y) > 0.01 || Math.abs(settled.angle - released.angle) > 0.001) {
        failures.push('first-person input drifted after release');
    }
    if (hitSetup.aimType !== 'monster' || !hitSetup.accepted || hitResult.health !== hitSetup.before - 2 || hitResult.aim?.type !== 'hit') {
        failures.push(`first-person visible hit failed: ${JSON.stringify({ hitSetup, hitResult })}`);
    }
    if (!blockedSetup || blockedResult.health !== blockedSetup.before || blockedResult.aim?.type !== 'wall') {
        failures.push(`first-person wall block failed: ${JSON.stringify({ blockedSetup, blockedResult })}`);
    }
    if (initial.performance?.supportProbeCount !== 1) failures.push(`first-person support probes: ${initial.performance?.supportProbeCount}`);
    if (initial.context?.losses !== 0) failures.push(`first-person context losses: ${initial.context.losses}`);
    if (recoveryLost.viewMode !== 'first-person' || recoveryLost.cameraProfile !== 'first-person'
        || !String(recoveryLost.signature).startsWith('first-person:first-person:')
        || recoveryLost.state?.fallback !== 'last-first-person-frame'
        || recoveryLost.recoveryVisible === 'none') {
        failures.push(`first-person recovery used the wrong profile: ${JSON.stringify(recoveryLost)}`);
    }
    if (recoveryRestored.context?.restores < 1 || recoveryRestored.context?.lost
        || recoveryRestored.worldVisible !== 'visible' || recoveryRestored.recoveryDisplay !== 'none') {
        failures.push(`first-person recovery did not complete: ${JSON.stringify(recoveryRestored)}`);
    }
    if (errors.length) failures.push(`first-person browser errors: ${errors.join(' | ')}`);
    await context.close();
}

try {
    await testMenuAndLegacyMigration();
    await test2D();
    await testThirdPerson();
    await testFirstPerson();
} finally {
    await browser.close();
}

const report = { passed: failures.length === 0, failures, results };
fs.writeFileSync(path.join(outputDirectory, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
