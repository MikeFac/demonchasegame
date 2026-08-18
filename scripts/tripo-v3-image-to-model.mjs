import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = 'https://openapi.tripo3d.ai/v3';
const apiKey = process.env.TRIPO_API_KEY;
const inputImage = path.resolve(
    projectRoot,
    process.env.TRIPO_INPUT_IMAGE
        || 'output/imagegen/demon-reference-candidates-gpt-image-2/fear-b.png'
);
const outputDir = path.resolve(
    projectRoot,
    process.env.TRIPO_OUTPUT_DIR
        || 'output/tripo/fear-b-v3.1-standard-2026-08-18'
);
const model = process.env.TRIPO_MODEL || 'v3.1-20260211';
const faceLimit = Number.parseInt(process.env.TRIPO_FACE_LIMIT || '5000', 10);
const maxCredits = Number.parseInt(
    process.env.TRIPO_MAX_CREDITS || (model.startsWith('P1-') ? '50' : '30'),
    10
);
const pollIntervalMs = 3000;
const pollTimeoutMs = 20 * 60 * 1000;

if (!apiKey || !apiKey.startsWith('tsk_')) {
    throw new Error('TRIPO_API_KEY is missing or is not a Tripo API key');
}

if (!Number.isInteger(maxCredits) || maxCredits <= 0) {
    throw new Error('TRIPO_MAX_CREDITS must be a positive integer');
}
if (model.startsWith('P1-') && (!Number.isInteger(faceLimit) || faceLimit < 50 || faceLimit > 20_000)) {
    throw new Error('TRIPO_FACE_LIMIT must be an integer from 50 to 20000 for P Series');
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

async function getBalance() {
    return fetchJson(`${apiBase}/account/balance`);
}

async function uploadImage() {
    const image = await fs.readFile(inputImage);
    if (image.length > 20 * 1024 * 1024) {
        throw new Error(`Input image exceeds Tripo's 20 MB limit: ${image.length} bytes`);
    }
    const form = new FormData();
    form.append('file', new Blob([image], { type: 'image/png' }), path.basename(inputImage));
    return fetchJson(`${apiBase}/files`, {
        method: 'POST',
        body: form
    });
}

async function createTask(fileToken) {
    const payload = {
        input: fileToken,
        model,
        texture: true,
        pbr: true,
        texture_alignment: 'original_image',
        orientation: 'align_image',
        enable_image_autofix: false,
        export_uv: true
    };
    if (model.startsWith('P1-')) {
        payload.face_limit = faceLimit;
    } else {
        payload.texture_quality = 'standard';
        payload.geometry_quality = 'standard';
        payload.auto_size = false;
        payload.quad = false;
    }

    const data = await fetchJson(`${apiBase}/generation/image-to-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return { data, payload };
}

async function pollTask(taskId) {
    const startedAt = Date.now();
    let lastProgress = null;
    let lastStatus = null;

    while (Date.now() - startedAt < pollTimeoutMs) {
        const task = await fetchJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`);
        if (task.status !== lastStatus || task.progress !== lastProgress) {
            console.log(`Tripo task ${task.status}: ${task.progress ?? 0}%`);
            lastStatus = task.status;
            lastProgress = task.progress;
        }

        if (task.status === 'success') return task;
        if (['failed', 'cancelled', 'banned', 'expired'].includes(task.status)) {
            throw new Error(
                `Tripo task ${task.status}: ${task.error_message || task.error_code || 'unknown error'}`
            );
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Tripo task did not finish within ${pollTimeoutMs / 60000} minutes`);
}

function outputUrls(output, prefix = '') {
    const found = [];
    if (!output || typeof output !== 'object') return found;

    for (const [key, value] of Object.entries(output)) {
        const name = prefix ? `${prefix}-${key}` : key;
        if (typeof value === 'string' && /^https?:\/\//.test(value)) {
            found.push({ name, url: value });
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string' && /^https?:\/\//.test(item)) {
                    found.push({ name: `${name}-${index + 1}`, url: item });
                }
            });
        } else if (value && typeof value === 'object') {
            found.push(...outputUrls(value, name));
        }
    }
    return found;
}

function extensionFor(url, contentType) {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/.test(extension)) return extension;
    if (contentType?.includes('model/gltf-binary')) return '.glb';
    if (contentType?.includes('image/webp')) return '.webp';
    if (contentType?.includes('image/png')) return '.png';
    if (contentType?.includes('image/jpeg')) return '.jpg';
    return '.bin';
}

async function downloadOutputs(output) {
    const urls = outputUrls(output);
    if (!urls.length) throw new Error('Successful Tripo task returned no downloadable URLs');

    const downloaded = [];
    for (const item of urls) {
        const response = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
        if (!response.ok) {
            throw new Error(`Failed to download ${item.name}: HTTP ${response.status}`);
        }
        const extension = extensionFor(item.url, response.headers.get('content-type'));
        const safeName = item.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
        const filename = `${safeName}${extension}`;
        const bytes = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(path.join(outputDir, filename), bytes, { flag: 'wx' });
        downloaded.push({ filename, bytes: bytes.length });
        console.log(`Downloaded ${filename} (${bytes.length} bytes)`);
    }
    return downloaded;
}

async function main() {
    await fs.access(inputImage);
    await fs.mkdir(path.dirname(outputDir), { recursive: true });
    await fs.mkdir(outputDir, { recursive: false });
    await fs.copyFile(inputImage, path.join(outputDir, path.basename(inputImage)));

    const balanceBefore = await getBalance();
    if (!Number.isFinite(balanceBefore.balance) || balanceBefore.balance < maxCredits) {
        throw new Error(
            `Insufficient API balance for the ${maxCredits}-credit safety allowance: ${balanceBefore.balance}`
        );
    }

    console.log(`Balance before task: ${balanceBefore.balance} credits`);
    console.log(`Uploading ${path.relative(projectRoot, inputImage)}`);
    const upload = await uploadImage();
    if (!upload.file_token) throw new Error('Tripo upload did not return a file_token');

    const { data: created, payload } = await createTask(upload.file_token);
    const taskId = created.task_id;
    if (!taskId) throw new Error('Tripo generation did not return a task_id');

    await fs.writeFile(
        path.join(outputDir, 'request.json'),
        `${JSON.stringify({
            api: 'v3',
            endpoint: '/generation/image-to-model',
            sourceImage: path.relative(projectRoot, inputImage),
            fileToken: upload.file_token,
            taskId,
            maxCredits,
            payload
        }, null, 2)}\n`,
        { flag: 'wx' }
    );

    console.log(`Created task ${taskId}`);
    const task = await pollTask(taskId);
    await fs.writeFile(
        path.join(outputDir, 'task.json'),
        `${JSON.stringify(task, null, 2)}\n`,
        { flag: 'wx' }
    );

    if (Number.isFinite(task.credits_consumed) && task.credits_consumed > maxCredits) {
        throw new Error(
            `Task consumed ${task.credits_consumed} credits, above the ${maxCredits}-credit safety allowance`
        );
    }

    const downloaded = await downloadOutputs(task.output);
    const balanceAfter = await getBalance();
    const summary = {
        taskId,
        status: task.status,
        model,
        sourceImage: path.relative(projectRoot, inputImage),
        outputDir: path.relative(projectRoot, outputDir),
        creditsConsumed: task.credits_consumed ?? (balanceBefore.balance - balanceAfter.balance),
        balanceBefore: balanceBefore.balance,
        balanceAfter: balanceAfter.balance,
        downloaded
    };

    await fs.writeFile(
        path.join(outputDir, 'summary.json'),
        `${JSON.stringify(summary, null, 2)}\n`,
        { flag: 'wx' }
    );
    console.log(JSON.stringify(summary, null, 2));
}

main().catch(async (error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
