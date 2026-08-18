import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = path.resolve(
    projectRoot,
    process.argv[2] || 'output/tripo/player-default-p1-5000-2026-08-18/rigged-and-animated'
);
const serverOrigin = process.env.DEFORMATION_SERVER_ORIGIN || 'http://127.0.0.1:3500';
const viewerPath = '/output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/rigged-and-animated/deformation-viewer.html';
const playwrightClient = '/home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js';
const roles = ['idle', 'walk', 'attack', 'hit', 'death'];
const times = [0, 0.25, 0.5, 0.75];
const testDir = path.join(assetDir, 'deformation-test', 'animated');

fs.mkdirSync(testDir, { recursive: true });
const report = { assetDir: path.relative(projectRoot, assetDir), poses: [], passed: true };

for (const role of roles) {
    const roleFilename = path.join(assetDir, 'animations', `${role}.glb`);
    const batchFilename = path.join(assetDir, 'animations', 'model_url.glb');
    const filename = fs.existsSync(roleFilename) ? roleFilename : batchFilename;
    if (!fs.existsSync(filename)) throw new Error(`Missing animation file: ${filename}`);
    const sourceUrl = `/${path.relative(projectRoot, filename).split(path.sep).join('/')}`;
    for (const normalizedTime of times) {
        const label = `${role}-${String(normalizedTime * 100).padStart(2, '0')}`;
        const outputDir = path.join(testDir, label);
        const url = `${serverOrigin}${viewerPath}?source=${encodeURIComponent(sourceUrl)}&clip=${role}&time=${normalizedTime}`;
        const result = spawnSync(process.execPath, [
            playwrightClient,
            '--url', url,
            '--iterations', '1',
            '--pause-ms', '250',
            '--screenshot-dir', outputDir,
            '--actions-json', JSON.stringify({ steps: [] })
        ], {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 120_000
        });
        if (result.status !== 0) {
            throw new Error(`${label} browser test failed: ${result.stderr || result.stdout}`);
        }
        const state = JSON.parse(fs.readFileSync(path.join(outputDir, 'state-0.json'), 'utf8'));
        const errorFile = path.join(outputDir, 'errors-0.json');
        const errors = fs.existsSync(errorFile)
            ? JSON.parse(fs.readFileSync(errorFile, 'utf8'))
            : [];
        const finiteBounds = state.bounds
            && [...state.bounds.min, ...state.bounds.max, ...state.bounds.size]
                .every(Number.isFinite);
        const passed = state.status === 'ready'
            && state.scene?.skinnedMeshes > 0
            && state.scene?.uniqueJoints > 0
            && state.animation?.tracks > 0
            && finiteBounds
            && errors.length === 0;
        report.passed &&= passed;
        report.poses.push({
            role,
            normalizedTime,
            passed,
            animation: state.animation,
            scene: state.scene,
            bounds: state.bounds,
            errors,
            screenshot: path.relative(projectRoot, path.join(outputDir, 'shot-0.png'))
        });
        console.log(`${label}: ${passed ? 'PASS' : 'FAIL'}`);
    }
}

fs.writeFileSync(path.join(testDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
