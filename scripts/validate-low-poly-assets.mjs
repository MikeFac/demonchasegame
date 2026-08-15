import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const TRIANGLES = 4;
const TRIANGLE_STRIP = 5;
const TRIANGLE_FAN = 6;

function parseArgs(argv) {
    const options = { manifest: 'public/assets/3d/manifest.json', requireSource: false, key: null };
    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];
        if (value === '--require-source') options.requireSource = true;
        else if (value === '--key') options.key = argv[++index];
        else if (!value.startsWith('--')) options.manifest = value;
        else throw new Error(`Unknown option: ${value}`);
    }
    return options;
}

function parseGlb(filePath) {
    const bytes = fs.readFileSync(filePath);
    if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB 2.0 file');
    if (bytes.readUInt32LE(4) !== 2) throw new Error('GLB version must be 2');
    if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB length header does not match file size');
    let offset = 12;
    let document = null;
    let binary = null;
    while (offset + 8 <= bytes.length) {
        const length = bytes.readUInt32LE(offset);
        const type = bytes.readUInt32LE(offset + 4);
        const start = offset + 8;
        const end = start + length;
        if (end > bytes.length) throw new Error('GLB chunk exceeds file length');
        if (type === JSON_CHUNK) document = JSON.parse(bytes.subarray(start, end).toString('utf8').replace(/\u0000+$/g, '').trim());
        else if (type === BIN_CHUNK) binary = bytes.subarray(start, end);
        offset = end;
    }
    if (!document) throw new Error('GLB has no JSON chunk');
    return { bytes, document, binary };
}

function primitiveElementCount(document, primitive) {
    if (Number.isInteger(primitive.indices)) return document.accessors?.[primitive.indices]?.count || 0;
    const positionAccessor = primitive.attributes?.POSITION;
    return Number.isInteger(positionAccessor) ? document.accessors?.[positionAccessor]?.count || 0 : 0;
}

function primitiveTriangles(document, primitive) {
    const count = primitiveElementCount(document, primitive);
    const mode = primitive.mode ?? TRIANGLES;
    if (mode === TRIANGLES) return Math.floor(count / 3);
    if (mode === TRIANGLE_STRIP || mode === TRIANGLE_FAN) return Math.max(0, count - 2);
    return 0;
}

function imageBytes(document, binary, image) {
    if (Number.isInteger(image.bufferView) && binary) {
        const view = document.bufferViews?.[image.bufferView];
        if (!view) return null;
        return binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    }
    if (typeof image.uri === 'string' && image.uri.startsWith('data:')) {
        const comma = image.uri.indexOf(',');
        if (comma >= 0) return Buffer.from(image.uri.slice(comma + 1), 'base64');
    }
    return null;
}

function imageDimensions(bytes) {
    if (!bytes || bytes.length < 24) return null;
    if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
        return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) { offset++; continue; }
        const marker = bytes[offset + 1];
        const length = bytes.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xc3) {
            return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
        }
        if (length < 2) break;
        offset += 2 + length;
    }
    return null;
}

function normalizeClipName(name) {
    return String(name || '').trim().toLowerCase().replace(/[ ._-]+/g, '');
}

function inspectAsset(assetKey, config, manifestDirectory) {
    const filePath = path.resolve(manifestDirectory, config.source);
    const { bytes, document, binary } = parseGlb(filePath);
    const primitives = (document.meshes || []).flatMap((mesh) => mesh.primitives || []);
    const triangles = primitives.reduce((sum, primitive) => sum + primitiveTriangles(document, primitive), 0);
    const materials = new Set(primitives.map((primitive) => primitive.material).filter(Number.isInteger)).size;
    const clips = (document.animations || []).map((animation) => animation.name || 'unnamed');
    const normalizedClips = new Set(clips.map(normalizeClipName));
    const missingClips = (config.clips || []).filter((clip) => !normalizedClips.has(normalizeClipName(clip)));
    const textureLimit = Number(config.textureBudget || 0);
    const textures = (document.images || []).map((image, index) => ({ index, ...imageDimensions(imageBytes(document, binary, image)) }));
    const oversizedTextures = textureLimit > 0
        ? textures.filter((texture) => texture.width > textureLimit || texture.height > textureLimit)
        : [];
    const embeddedLights = (document.nodes || []).filter((node) => node.extensions?.KHR_lights_punctual).length;
    const violations = [];
    if (triangles > config.triangleBudget) violations.push(`${triangles} triangles exceed ${config.triangleBudget}`);
    if (materials > (config.materialBudget || 1)) violations.push(`${materials} materials exceed ${config.materialBudget || 1}`);
    if (!document.skins?.length) violations.push('no skin/rig');
    if (missingClips.length) violations.push(`missing clips: ${missingClips.join(', ')}`);
    if (oversizedTextures.length) violations.push(`textures exceed ${textureLimit}px: ${oversizedTextures.map((item) => item.index).join(', ')}`);
    if (document.cameras?.length) violations.push(`${document.cameras.length} embedded camera(s)`);
    if (embeddedLights) violations.push(`${embeddedLights} embedded light(s)`);
    return {
        assetKey,
        file: path.relative(process.cwd(), filePath),
        bytes: bytes.length,
        triangles,
        primitives: primitives.length,
        materials,
        skins: document.skins?.length || 0,
        clips,
        textures,
        violations
    };
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const manifestPath = path.resolve(options.manifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const manifestDirectory = path.dirname(manifestPath);
    const entries = Object.entries(manifest.assets || {}).filter(([key]) => !options.key || key === options.key);
    if (!entries.length) throw new Error(options.key ? `Unknown asset key: ${options.key}` : 'Manifest contains no assets');
    let failures = 0;
    const reports = [];
    for (const [key, config] of entries) {
        if (!config.source) {
            const report = { assetKey: key, status: 'procedural-fallback', violations: [] };
            if (options.requireSource) { report.violations.push('source is null'); failures++; }
            reports.push(report);
            continue;
        }
        try {
            const report = inspectAsset(key, config, manifestDirectory);
            if (report.violations.length) failures++;
            reports.push(report);
        } catch (error) {
            failures++;
            reports.push({ assetKey: key, file: config.source, violations: [error.message] });
        }
    }
    console.log(JSON.stringify({ manifest: path.relative(process.cwd(), manifestPath), reports }, null, 2));
    if (failures) process.exitCode = 1;
}

main();
