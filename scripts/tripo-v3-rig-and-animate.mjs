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
    process.env.TRIPO_LOW_POLY_DIR
        || 'output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000'
);
const outputDir = path.join(sourceDir, 'rigged-and-animated');
const rigDir = path.join(outputDir, 'rig');
const animationDir = path.join(outputDir, 'animations');
const rigCreditCap = 30;
const animationCreditCap = 50;
const totalCreditCap = rigCreditCap + animationCreditCap;
const pollIntervalMs = 3000;
const pollTimeoutMs = 20 * 60 * 1000;
const rigModel = process.env.TRIPO_RIG_MODEL || 'v1.0-20240301';
const rigSpec = process.env.TRIPO_RIG_SPEC || 'mixamo';
const animations = rigModel.startsWith('v2.5')
    ? [
        { role: 'idle', preset: 'preset:idle' },
        { role: 'walk', preset: 'preset:walk' },
        { role: 'attack', preset: 'preset:slash' },
        { role: 'hit', preset: 'preset:hurt' },
        { role: 'death', preset: 'preset:fall' }
    ]
    : [
        { role: 'idle', preset: 'preset:biped:idle' },
        { role: 'walk', preset: 'preset:biped:walk' },
        { role: 'attack', preset: 'preset:biped:box_01' },
        { role: 'hit', preset: 'preset:biped:hurt' },
        { role: 'death', preset: 'preset:biped:defeat_02' }
    ];

if (!apiKey || !apiKey.startsWith('tsk_')) {
    throw new Error('TRIPO_API_KEY is missing or is not a Tripo API key');
}

async function fetchJson(url, options = {}) {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
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
        } catch (error) {
            lastError = error;
            if (attempt === 4) break;
            console.warn(`Tripo request attempt ${attempt} failed; retrying the same request: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
    }
    throw lastError;
}

async function readJsonIfPresent(filename) {
    try {
        return JSON.parse(await fs.readFile(filename, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
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

async function uploadModel(filename) {
    const bytes = await fs.readFile(filename);
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'model/gltf-binary' }), path.basename(filename));
    const data = await fetchJson(`${apiBase}/files`, { method: 'POST', body: form });
    if (!data.file_token) throw new Error('Tripo file upload did not return a file_token');
    return { fileToken: data.file_token, filename, bytes: bytes.length };
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
                    found.push({ name: `${name}-${index + 1}`, url: entry, index });
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

async function downloadOutputs(output, destination, roleNames = []) {
    const urls = collectUrls(output);
    if (!urls.length) throw new Error('Successful Tripo task returned no downloadable URLs');
    const downloaded = [];
    for (const item of urls) {
        const response = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
        if (!response.ok) throw new Error(`Failed to download ${item.name}: HTTP ${response.status}`);
        const extension = extensionFor(item.url, response.headers.get('content-type'));
        const role = Number.isInteger(item.index) ? roleNames[item.index] : null;
        const baseName = role || item.name;
        const filename = `${baseName.replace(/[^a-zA-Z0-9._-]+/g, '-')}${extension}`;
        try {
            const existing = await fs.stat(path.join(destination, filename));
            downloaded.push({ filename, bytes: existing.size, reused: true });
            console.log(`Reusing ${path.relative(outputDir, path.join(destination, filename))} (${existing.size} bytes)`);
            continue;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(path.join(destination, filename), bytes, { flag: 'wx' });
        downloaded.push({ filename, bytes: bytes.length });
        console.log(`Downloaded ${path.relative(outputDir, path.join(destination, filename))} (${bytes.length} bytes)`);
    }
    return downloaded;
}

async function main() {
    const lowPolySummary = JSON.parse(await fs.readFile(path.join(sourceDir, 'summary.json'), 'utf8'));
    const sourceTaskId = process.env.TRIPO_SOURCE_TASK_ID
        || lowPolySummary.retopoTaskId
        || lowPolySummary.taskId;
    if (!sourceTaskId) throw new Error('Source summary does not contain a Tripo task ID');

    await fs.mkdir(rigDir, { recursive: true });
    await fs.mkdir(animationDir, { recursive: true });
    const sourceRigCheckPath = path.join(outputDir, 'source-rig-check.json');
    let sourceRigCheck = await readJsonIfPresent(sourceRigCheckPath);
    if (!sourceRigCheck) {
        if (lowPolySummary.lowPolyRiggable && lowPolySummary.lowPolyRigType === 'biped') {
            sourceRigCheck = {
                inheritedFromSummary: true,
                output: { riggable: true, rig_type: 'biped' }
            };
        } else {
            const sourceRigCheckTaskId = await postTask('/animations/rig-check', {
                input: sourceTaskId
            });
            const sourceRigCheckTask = await pollTask(sourceRigCheckTaskId, 'Source rig check');
            sourceRigCheck = {
                taskId: sourceRigCheckTaskId,
                output: sourceRigCheckTask.output,
                creditsConsumed: sourceRigCheckTask.credits_consumed || 0
            };
        }
        await fs.writeFile(sourceRigCheckPath, `${JSON.stringify(sourceRigCheck, null, 2)}\n`, {
            flag: 'wx'
        });
    }
    if (!sourceRigCheck.output?.riggable || sourceRigCheck.output?.rig_type !== 'biped') {
        throw new Error(`Source has not passed biped rig-check: ${JSON.stringify(sourceRigCheck.output)}`);
    }
    let rigInput = sourceTaskId;
    if (process.env.TRIPO_UPLOAD_LOW_POLY === '1') {
        const uploadFilename = process.env.TRIPO_UPLOAD_FILE || 'model_url.glb';
        const uploadRecordPath = path.join(
            rigDir,
            `upload-${path.parse(uploadFilename).name}.json`
        );
        let uploadRecord = await readJsonIfPresent(uploadRecordPath);
        if (!uploadRecord) {
            uploadRecord = await uploadModel(path.join(sourceDir, uploadFilename));
            const rigCheckTaskId = await postTask('/animations/rig-check', {
                input: uploadRecord.fileToken
            });
            const rigCheckTask = await pollTask(rigCheckTaskId, 'Uploaded-file rig check');
            if (!rigCheckTask.output?.riggable || rigCheckTask.output?.rig_type !== 'biped') {
                throw new Error(
                    `Uploaded GLB did not pass biped rig check: ${JSON.stringify(rigCheckTask.output)}`
                );
            }
            uploadRecord = {
                ...uploadRecord,
                rigCheckTaskId,
                rigCheck: rigCheckTask.output
            };
            await fs.writeFile(uploadRecordPath, `${JSON.stringify(uploadRecord, null, 2)}\n`, {
                flag: 'wx'
            });
            console.log(`Uploaded low-poly GLB as ${uploadRecord.fileToken}`);
        } else {
            console.log(`Reusing uploaded low-poly GLB ${uploadRecord.fileToken}`);
        }
        rigInput = uploadRecord.fileToken;
    }
    const balanceBefore = await fetchJson(`${apiBase}/account/balance`);
    if (balanceBefore.balance < totalCreditCap) {
        throw new Error(`Rig and animation require an ${totalCreditCap}-credit allowance; balance is ${balanceBefore.balance}`);
    }

    const rigPayload = {
        input: rigInput,
        model: rigModel,
        rig_type: 'biped',
        spec: rigSpec,
        out_format: 'glb'
    };
    const rigRequestPath = path.join(rigDir, 'request.json');
    const existingRigRequest = await readJsonIfPresent(rigRequestPath);
    let rigTaskId = existingRigRequest?.taskId || await postTask('/animations/rig', rigPayload);
    if (existingRigRequest) {
        const existingRigTask = await fetchJson(`${apiBase}/tasks/${encodeURIComponent(rigTaskId)}`);
        const failedStatuses = ['failed', 'cancelled', 'banned', 'expired'];
        if (failedStatuses.includes(existingRigTask.status)) {
            if (process.env.TRIPO_RETRY_FAILED_RIG !== '1') {
                throw new Error(
                    `Existing rig task ${rigTaskId} is ${existingRigTask.status}; `
                    + 'set TRIPO_RETRY_FAILED_RIG=1 to submit one recorded retry'
                );
            }
            const failedTaskId = rigTaskId;
            await fs.writeFile(
                path.join(rigDir, `failed-${failedTaskId}.json`),
                `${JSON.stringify({ request: existingRigRequest, task: existingRigTask }, null, 2)}\n`,
                { flag: 'wx' }
            );
            rigTaskId = await postTask('/animations/rig', rigPayload);
            await fs.writeFile(
                rigRequestPath,
                `${JSON.stringify({
                    ...existingRigRequest,
                    taskId: rigTaskId,
                    payload: rigPayload,
                    attempts: [
                        ...(existingRigRequest.attempts || []),
                        {
                            taskId: failedTaskId,
                            status: existingRigTask.status,
                            errorCode: existingRigTask.error_code,
                            errorMessage: existingRigTask.error_message
                        }
                    ]
                }, null, 2)}\n`
            );
            console.log(`Retrying failed rig task ${failedTaskId} as ${rigTaskId}`);
        }
    }
    if (!existingRigRequest) {
        await fs.writeFile(
            rigRequestPath,
            `${JSON.stringify({
                api: 'v3',
                endpoint: '/animations/rig',
                sourceTaskId,
                taskId: rigTaskId,
                creditCap: rigCreditCap,
                payload: rigPayload
            }, null, 2)}\n`,
            { flag: 'wx' }
        );
        console.log(`Created rig task ${rigTaskId}`);
    } else {
        console.log(`Resuming rig task ${rigTaskId}`);
    }
    const rigTask = await pollTask(rigTaskId, 'Rigging');
    await fs.writeFile(
        path.join(rigDir, 'task.json'),
        `${JSON.stringify(rigTask, null, 2)}\n`
    );
    if (Number.isFinite(rigTask.credits_consumed) && rigTask.credits_consumed > rigCreditCap) {
        throw new Error(`Rigging consumed ${rigTask.credits_consumed} credits, above the ${rigCreditCap}-credit cap`);
    }
    const rigDownloads = await downloadOutputs(rigTask.output, rigDir);

    const animationPayload = {
        input: rigTaskId,
        animations: animations.map((item) => item.preset),
        out_format: 'glb',
        bake_animation: true,
        export_with_geometry: true,
        animate_in_place: true
    };
    const existingAnimationRequest = await readJsonIfPresent(path.join(animationDir, 'request.json'));
    const animationTaskId = existingAnimationRequest?.taskId
        || await postTask('/animations/retarget', animationPayload);
    if (!existingAnimationRequest) {
        await fs.writeFile(
            path.join(animationDir, 'request.json'),
            `${JSON.stringify({
                api: 'v3',
                endpoint: '/animations/retarget',
                rigTaskId,
                taskId: animationTaskId,
                creditCap: animationCreditCap,
                roles: animations,
                payload: animationPayload
            }, null, 2)}\n`,
            { flag: 'wx' }
        );
        console.log(`Created animation task ${animationTaskId}`);
    } else {
        console.log(`Resuming animation task ${animationTaskId}`);
    }
    const animationTask = await pollTask(animationTaskId, 'Animation retarget');
    await fs.writeFile(
        path.join(animationDir, 'task.json'),
        `${JSON.stringify(animationTask, null, 2)}\n`
    );
    if (Number.isFinite(animationTask.credits_consumed)
        && animationTask.credits_consumed > animationCreditCap) {
        throw new Error(
            `Animation retarget consumed ${animationTask.credits_consumed} credits, above the ${animationCreditCap}-credit cap`
        );
    }
    const animationDownloads = await downloadOutputs(
        animationTask.output,
        animationDir,
        animations.map((item) => item.role)
    );

    const balanceAfter = await fetchJson(`${apiBase}/account/balance`);
    const creditsConsumed = (rigTask.credits_consumed || 0) + (animationTask.credits_consumed || 0);
    if (creditsConsumed > totalCreditCap) {
        throw new Error(`Combined tasks consumed ${creditsConsumed} credits, above the ${totalCreditCap}-credit cap`);
    }
    const summary = {
        sourceTaskId,
        rigTaskId,
        animationTaskId,
        rigModel: rigPayload.model,
        rigType: rigPayload.rig_type,
        rigSpec: rigPayload.spec,
        animations,
        animateInPlace: true,
        rigCredits: rigTask.credits_consumed,
        animationCredits: animationTask.credits_consumed,
        totalCredits: creditsConsumed,
        balanceBefore: balanceBefore.balance,
        balanceAfter: balanceAfter.balance,
        observedSharedBalanceDelta: balanceBefore.balance - balanceAfter.balance,
        rigDownloads,
        animationDownloads
    };
    await fs.writeFile(
        path.join(outputDir, 'summary.json'),
        `${JSON.stringify(summary, null, 2)}\n`
    );
    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
