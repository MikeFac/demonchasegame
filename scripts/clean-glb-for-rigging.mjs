import fs from 'node:fs/promises';
import path from 'node:path';

const input = path.resolve(process.argv[2] || 'output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/model_url.glb');
const output = path.resolve(process.argv[3] || path.join(path.dirname(input), 'rig-source-cleaned.glb'));
const bytes = await fs.readFile(input);
let json;
let binary;
for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', start, start + length).trim());
    if (type === 0x004e4942) binary = Buffer.from(bytes.subarray(start, start + length));
    offset = start + length;
}
if (!json || !binary) throw new Error('Expected an embedded GLB JSON and BIN chunk');

const primitive = json.meshes?.[0]?.primitives?.[0];
if (!primitive || json.meshes.length !== 1 || json.meshes[0].primitives.length !== 1) {
    throw new Error('Cleaner expects one mesh with one primitive');
}
const positionAccessor = json.accessors[primitive.attributes.POSITION];
const positionView = json.bufferViews[positionAccessor.bufferView];
const indexAccessor = json.accessors[primitive.indices];
const indexView = json.bufferViews[indexAccessor.bufferView];
if (positionAccessor.componentType !== 5126 || positionAccessor.type !== 'VEC3') {
    throw new Error('Cleaner expects float VEC3 positions');
}
if (![5123, 5125].includes(indexAccessor.componentType)) {
    throw new Error('Cleaner expects unsigned-short or unsigned-int indices');
}

const positionStart = (positionView.byteOffset || 0) + (positionAccessor.byteOffset || 0);
const positionStride = positionView.byteStride || 12;
const positions = Array.from({ length: positionAccessor.count }, (_, index) => [
    binary.readFloatLE(positionStart + index * positionStride),
    binary.readFloatLE(positionStart + index * positionStride + 4),
    binary.readFloatLE(positionStart + index * positionStride + 8)
]);
const indexBytes = indexAccessor.componentType === 5123 ? 2 : 4;
const readIndex = indexBytes === 2
    ? (offset) => binary.readUInt16LE(offset)
    : (offset) => binary.readUInt32LE(offset);
const writeIndex = indexBytes === 2
    ? (value, offset) => binary.writeUInt16LE(value, offset)
    : (value, offset) => binary.writeUInt32LE(value, offset);
const indexStart = (indexView.byteOffset || 0) + (indexAccessor.byteOffset || 0);
const indices = Array.from(
    { length: indexAccessor.count },
    (_, index) => readIndex(indexStart + index * indexBytes)
);

class UnionFind {
    constructor(count) { this.parent = Array.from({ length: count }, (_, index) => index); }
    find(value) {
        if (this.parent[value] !== value) this.parent[value] = this.find(this.parent[value]);
        return this.parent[value];
    }
    union(a, b) {
        a = this.find(a);
        b = this.find(b);
        if (a !== b) this.parent[b] = a;
    }
}

const weld = new UnionFind(positions.length);
const owners = new Map();
for (let index = 0; index < positions.length; index += 1) {
    const key = positions[index].map((value) => Math.round(value / 1e-5)).join(',');
    if (owners.has(key)) weld.union(index, owners.get(key));
    else owners.set(key, index);
}
const triangles = [];
for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    triangles.push(indices.slice(offset, offset + 3));
}

function keepLargestComponent(inputTriangles) {
    const surface = new UnionFind(positions.length);
    for (const triangle of inputTriangles) {
        const [a, b, c] = triangle.map((index) => weld.find(index));
        surface.union(a, b);
        surface.union(b, c);
    }
    const counts = new Map();
    for (const triangle of inputTriangles) {
        const root = surface.find(weld.find(triangle[0]));
        counts.set(root, (counts.get(root) || 0) + 1);
    }
    const largestRoot = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return inputTriangles.filter((triangle) => surface.find(weld.find(triangle[0])) === largestRoot);
}

function edgeKey(a, b) {
    a = weld.find(a);
    b = weld.find(b);
    return a < b ? `${a},${b}` : `${b},${a}`;
}

let cleaned = keepLargestComponent(triangles);
let removedNonManifold = 0;
for (let pass = 0; pass < 8; pass += 1) {
    const edgeCounts = new Map();
    for (const [a, b, c] of cleaned) {
        for (const key of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) {
            edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        }
    }
    const badEdges = new Set([...edgeCounts.entries()]
        .filter(([, count]) => count > 2)
        .map(([key]) => key));
    if (!badEdges.size) break;
    const before = cleaned.length;
    cleaned = cleaned.filter(([a, b, c]) => ![
        edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)
    ].some((key) => badEdges.has(key)));
    removedNonManifold += before - cleaned.length;
    cleaned = keepLargestComponent(cleaned);
}

const flattened = cleaned.flat();
for (let index = 0; index < flattened.length; index += 1) {
    writeIndex(flattened[index], indexStart + index * indexBytes);
}
indexAccessor.count = flattened.length;

function padded(buffer, byte = 0x20) {
    const padding = (4 - buffer.length % 4) % 4;
    return padding ? Buffer.concat([buffer, Buffer.alloc(padding, byte)]) : buffer;
}
const jsonChunk = padded(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binChunk = padded(binary, 0x00);
const result = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
result.write('glTF', 0, 'ascii');
result.writeUInt32LE(2, 4);
result.writeUInt32LE(result.length, 8);
result.writeUInt32LE(jsonChunk.length, 12);
result.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(result, 20);
const binHeader = 20 + jsonChunk.length;
result.writeUInt32LE(binChunk.length, binHeader);
result.writeUInt32LE(0x004e4942, binHeader + 4);
binChunk.copy(result, binHeader + 8);
await fs.writeFile(output, result, { flag: 'wx' });
console.log(JSON.stringify({
    input,
    output,
    originalTriangles: triangles.length,
    cleanedTriangles: cleaned.length,
    removedTriangles: triangles.length - cleaned.length,
    removedNonManifoldTriangles: removedNonManifold,
    bytes: result.length
}, null, 2));
