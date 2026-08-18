import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDir = path.join(
    projectRoot,
    'output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/rigged-and-animated'
);
const inputDir = path.resolve(projectRoot, process.argv[2] || defaultDir);

function parseGlbJson(bytes, filename) {
    if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${filename} is not a GLB`);
    const version = bytes.readUInt32LE(4);
    const declaredLength = bytes.readUInt32LE(8);
    if (version !== 2) throw new Error(`${filename} uses unsupported GLB version ${version}`);
    if (declaredLength !== bytes.length) {
        throw new Error(`${filename} length mismatch: header ${declaredLength}, file ${bytes.length}`);
    }
    let offset = 12;
    while (offset + 8 <= bytes.length) {
        const chunkLength = bytes.readUInt32LE(offset);
        const chunkType = bytes.readUInt32LE(offset + 4);
        const chunkStart = offset + 8;
        if (chunkType === 0x4e4f534a) {
            return JSON.parse(bytes.toString('utf8', chunkStart, chunkStart + chunkLength).trim());
        }
        offset = chunkStart + chunkLength;
    }
    throw new Error(`${filename} contains no JSON chunk`);
}

function accessorCount(gltf, accessorIndex) {
    return gltf.accessors?.[accessorIndex]?.count || 0;
}

function primitiveTriangles(gltf, primitive) {
    const mode = primitive.mode ?? 4;
    const count = primitive.indices != null
        ? accessorCount(gltf, primitive.indices)
        : accessorCount(gltf, primitive.attributes?.POSITION);
    if (mode === 4) return Math.floor(count / 3);
    if (mode === 5 || mode === 6) return Math.max(0, count - 2);
    return 0;
}

function animationDuration(gltf, animation) {
    let duration = 0;
    for (const sampler of animation.samplers || []) {
        const accessor = gltf.accessors?.[sampler.input];
        const maximum = Array.isArray(accessor?.max) ? accessor.max[0] : 0;
        duration = Math.max(duration, maximum || 0);
    }
    return duration;
}

function analyze(gltf, filename, byteLength) {
    const primitives = (gltf.meshes || []).flatMap((mesh) => mesh.primitives || []);
    const jointNodes = new Set((gltf.skins || []).flatMap((skin) => skin.joints || []));
    const animationTargetNodes = new Set();
    const animations = (gltf.animations || []).map((animation, index) => {
        for (const channel of animation.channels || []) {
            if (channel.target?.node != null) animationTargetNodes.add(channel.target.node);
        }
        return {
            name: animation.name || `animation-${index + 1}`,
            durationSeconds: Number(animationDuration(gltf, animation).toFixed(4)),
            channels: animation.channels?.length || 0,
            samplers: animation.samplers?.length || 0
        };
    });
    return {
        filename,
        bytes: byteLength,
        megabytes: Number((byteLength / 1024 / 1024).toFixed(2)),
        scenes: gltf.scenes?.length || 0,
        nodes: gltf.nodes?.length || 0,
        meshes: gltf.meshes?.length || 0,
        primitives: primitives.length,
        triangles: primitives.reduce((sum, primitive) => sum + primitiveTriangles(gltf, primitive), 0),
        materials: gltf.materials?.length || 0,
        textures: gltf.textures?.length || 0,
        images: gltf.images?.length || 0,
        skins: gltf.skins?.length || 0,
        joints: jointNodes.size,
        animationTargetNodes: animationTargetNodes.size,
        animations
    };
}

async function collectGlbs(directory) {
    const output = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) output.push(...await collectGlbs(fullPath));
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) output.push(fullPath);
    }
    return output;
}

const files = await collectGlbs(inputDir);
if (!files.length) throw new Error(`No GLB files found under ${inputDir}`);
const results = [];
for (const filename of files.sort()) {
    const bytes = await fs.readFile(filename);
    results.push(analyze(
        parseGlbJson(bytes, filename),
        path.relative(inputDir, filename),
        bytes.length
    ));
}
const report = {
    generatedAt: new Date().toISOString(),
    directory: path.relative(projectRoot, inputDir),
    files: results
};
await fs.writeFile(path.join(inputDir, 'glb-analysis.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
