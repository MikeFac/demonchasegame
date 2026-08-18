import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = 'https://openapi.tripo3d.ai/v3';
const apiKey = process.env.TRIPO_API_KEY;
const sourceDir = path.resolve(
    projectRoot,
    process.env.TRIPO_SOURCE_DIR || 'output/tripo/fear-b-v3.1-standard-2026-08-18'
);
const outputDir = path.join(sourceDir, 'low-poly-10000');
const targetFaces = 10_000;
const maxRetopoCredits = 30;
const pollIntervalMs = 3000;
const pollTimeoutMs = 20 * 60 * 1000;

if (!apiKey || !apiKey.startsWith('tsk_')) {
    throw new Error('TRIPO_API_KEY is missing or is not a Tripo API key');
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(60_000),
        headers: {
            Authorization: `Bearer ${apiKey}`,
            ...(options.headers || {})
        }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.code !== 0) {
        const detail = body?.message || body?.msg || body?.error || response.statusText;
        throw new Error(`Tripo request failed (${response.status}): ${JSON.stringify(detail)}`);
    }
    return body.data;
}

async function postTask(endpoint, payload) {
    const data = await fetchJson(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!data.task_id) throw new Error(`${endpoint} did not return a task_id`);
    return data.task_id;
}

async function pollTask(taskId, label) {
    const startedAt = Date.now();
    let previous = '';
    while (Date.now() - startedAt < pollTimeoutMs) {
        const task = await fetchJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`);
        const current = `${task.status}:${task.progress ?? 0}`;
        if (current !== previous) {
            console.log(`${label} ${task.status}: ${task.progress ?? 0}%`);
            previous = current;
        }
        if (task.status === 'success') return task;
        if (['failed', 'cancelled', 'banned', 'expired'].includes(task.status)) {
            throw new Error(
                `${label} ${task.status}: ${task.error_message || task.error_code || 'unknown error'}`
            );
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`${label} did not finish within ${pollTimeoutMs / 60000} minutes`);
}

function collectUrls(value, prefix = '') {
    const found = [];
    if (!value || typeof value !== 'object') return found;
    for (const [key, item] of Object.entries(value)) {
        const name = prefix ? `${prefix}-${key}` : key;
        if (typeof item === 'string' && /^https?:\/\//.test(item)) {
            found.push({ name, url: item });
        } else if (Array.isArray(item)) {
            item.forEach((entry, index) => {
                if (typeof entry === 'string' && /^https?:\/\//.test(entry)) {
                    found.push({ name: `${name}-${index + 1}`, url: entry });
                }
            });
        } else if (item && typeof item === 'object') {
            found.push(...collectUrls(item, name));
        }
    }
    return found;
}

function extensionFor(url, contentType) {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/.test(extension)) return extension;
    if (contentType?.includes('model/gltf-binary')) return '.glb';
    if (contentType?.includes('image/webp')) return '.webp';
    if (contentType?.includes('image/png')) return '.png';
    if (contentType?.includes('image/jpeg')) return '.jpg';
    return '.bin';
}

async function downloadOutputs(output) {
    const urls = collectUrls(output);
    if (!urls.length) throw new Error('Retopology task returned no downloadable URLs');
    const downloaded = [];
    for (const item of urls) {
        const response = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
        if (!response.ok) throw new Error(`Failed to download ${item.name}: HTTP ${response.status}`);
        const extension = extensionFor(item.url, response.headers.get('content-type'));
        const filename = `${item.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}${extension}`;
        const bytes = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(path.join(outputDir, filename), bytes, { flag: 'wx' });
        downloaded.push({ filename, bytes: bytes.length });
        console.log(`Downloaded ${filename} (${bytes.length} bytes)`);
    }
    return downloaded;
}

async function runRigCheck(input, filename, label) {
    const taskId = await postTask('/animations/rig-check', { input });
    const task = await pollTask(taskId, label);
    await fs.writeFile(
        path.join(outputDir, filename),
        `${JSON.stringify(task, null, 2)}\n`,
        { flag: 'wx' }
    );
    if ((task.credits_consumed || 0) !== 0) {
        throw new Error(`${label} unexpectedly consumed ${task.credits_consumed} credits`);
    }
    return task;
}

async function main() {
    const sourceSummary = JSON.parse(await fs.readFile(path.join(sourceDir, 'summary.json'), 'utf8'));
    const sourceTaskId = sourceSummary.taskId;
    if (!sourceTaskId) throw new Error('Source summary does not contain a taskId');

    await fs.mkdir(outputDir, { recursive: false });
    const balanceBefore = await fetchJson(`${apiBase}/account/balance`);
    if (balanceBefore.balance < maxRetopoCredits) {
        throw new Error(`Retopology requires a ${maxRetopoCredits}-credit allowance; balance is ${balanceBefore.balance}`);
    }

    console.log(`Checking source riggability for ${sourceTaskId}`);
    const sourceRigCheck = await runRigCheck(
        sourceTaskId,
        'source-rig-check.json',
        'Source rig check'
    );
    if (!sourceRigCheck.output?.riggable) {
        console.log(JSON.stringify({
            sourceTaskId,
            riggable: false,
            rigType: sourceRigCheck.output?.rig_type || null,
            retopologyStarted: false,
            balance: balanceBefore.balance
        }, null, 2));
        return;
    }

    const retopoPayload = {
        input: sourceTaskId,
        model: 'v2.0',
        face_limit: targetFaces,
        quad: false,
        bake: true
    };
    console.log(`Source is riggable as ${sourceRigCheck.output.rig_type}; starting ${targetFaces}-face smart retopology`);
    const retopoTaskId = await postTask('/mesh/decimate', retopoPayload);
    await fs.writeFile(
        path.join(outputDir, 'request.json'),
        `${JSON.stringify({
            api: 'v3',
            endpoint: '/mesh/decimate',
            sourceTaskId,
            sourceRigType: sourceRigCheck.output.rig_type,
            maxRetopoCredits,
            payload: retopoPayload,
            taskId: retopoTaskId
        }, null, 2)}\n`,
        { flag: 'wx' }
    );

    const retopoTask = await pollTask(retopoTaskId, 'Retopology');
    await fs.writeFile(
        path.join(outputDir, 'task.json'),
        `${JSON.stringify(retopoTask, null, 2)}\n`,
        { flag: 'wx' }
    );
    if (Number.isFinite(retopoTask.credits_consumed)
        && retopoTask.credits_consumed > maxRetopoCredits) {
        throw new Error(
            `Retopology consumed ${retopoTask.credits_consumed} credits, above the ${maxRetopoCredits}-credit allowance`
        );
    }

    const downloaded = await downloadOutputs(retopoTask.output);
    console.log('Checking low-poly derivative riggability');
    const lowPolyRigCheck = await runRigCheck(
        retopoTaskId,
        'low-poly-rig-check.json',
        'Low-poly rig check'
    );
    const balanceAfter = await fetchJson(`${apiBase}/account/balance`);
    const summary = {
        sourceTaskId,
        sourceRiggable: sourceRigCheck.output.riggable,
        sourceRigType: sourceRigCheck.output.rig_type,
        retopoTaskId,
        targetFaces,
        retopoModel: 'v2.0',
        bake: true,
        creditsConsumed: retopoTask.credits_consumed ?? (balanceBefore.balance - balanceAfter.balance),
        balanceBefore: balanceBefore.balance,
        balanceAfter: balanceAfter.balance,
        lowPolyRiggable: lowPolyRigCheck.output?.riggable ?? false,
        lowPolyRigType: lowPolyRigCheck.output?.rig_type || null,
        downloaded
    };
    await fs.writeFile(
        path.join(outputDir, 'summary.json'),
        `${JSON.stringify(summary, null, 2)}\n`,
        { flag: 'wx' }
    );
    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
