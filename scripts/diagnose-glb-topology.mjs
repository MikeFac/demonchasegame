import fs from 'node:fs/promises';
import path from 'node:path';

const filename = path.resolve(process.argv[2] || 'output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/model_url.glb');
const bytes = await fs.readFile(filename);
let json;
let binary;
for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', start, start + length).trim());
    if (type === 0x004e4942) binary = bytes.subarray(start, start + length);
    offset = start + length;
}
if (!json || !binary) throw new Error('Expected an embedded GLB JSON and BIN chunk');

const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const readers = {
    5121: (buffer, offset) => buffer.readUInt8(offset),
    5123: (buffer, offset) => buffer.readUInt16LE(offset),
    5125: (buffer, offset) => buffer.readUInt32LE(offset),
    5126: (buffer, offset) => buffer.readFloatLE(offset)
};
const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(index) {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const width = typeSize[accessor.type];
    const byteWidth = componentBytes[accessor.componentType];
    const stride = view.byteStride || width * byteWidth;
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const values = new Array(accessor.count);
    for (let i = 0; i < accessor.count; i += 1) {
        values[i] = new Array(width);
        for (let c = 0; c < width; c += 1) {
            values[i][c] = readers[accessor.componentType](binary, start + i * stride + c * byteWidth);
        }
    }
    return values;
}

class UnionFind {
    constructor(count) {
        this.parent = Array.from({ length: count }, (_, index) => index);
        this.rank = new Uint8Array(count);
    }
    find(value) {
        let root = value;
        while (this.parent[root] !== root) root = this.parent[root];
        while (this.parent[value] !== value) {
            const next = this.parent[value];
            this.parent[value] = root;
            value = next;
        }
        return root;
    }
    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return;
        if (this.rank[rootA] < this.rank[rootB]) [rootA, rootB] = [rootB, rootA];
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) this.rank[rootA] += 1;
    }
}

const primitives = (json.meshes || []).flatMap((mesh) => mesh.primitives || []);
if (primitives.length !== 1) throw new Error(`Diagnostic expects one primitive; found ${primitives.length}`);
const primitive = primitives[0];
const positions = readAccessor(primitive.attributes.POSITION);
const indices = readAccessor(primitive.indices).flat();
const invalidPositions = positions.filter((position) => position.some((value) => !Number.isFinite(value))).length;
const invalidIndices = indices.filter((index) => !Number.isInteger(index) || index < 0 || index >= positions.length).length;

const welded = new UnionFind(positions.length);
const positionOwners = new Map();
const epsilon = 1e-5;
for (let i = 0; i < positions.length; i += 1) {
    const key = positions[i].map((value) => Math.round(value / epsilon)).join(',');
    const owner = positionOwners.get(key);
    if (owner == null) positionOwners.set(key, i);
    else welded.union(i, owner);
}
const surface = new UnionFind(positions.length);
for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = welded.find(indices[i]);
    const b = welded.find(indices[i + 1]);
    const c = welded.find(indices[i + 2]);
    surface.union(a, b);
    surface.union(b, c);
}

const edgeUses = new Map();
const componentTriangles = new Map();
let degenerateIndexTriangles = 0;
let nearZeroAreaTriangles = 0;
let duplicateTriangles = 0;
const triangleKeys = new Set();
function addEdge(a, b) {
    a = welded.find(a);
    b = welded.find(b);
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    edgeUses.set(key, (edgeUses.get(key) || 0) + 1);
}
for (let i = 0; i + 2 < indices.length; i += 3) {
    const raw = [indices[i], indices[i + 1], indices[i + 2]];
    const ids = raw.map((index) => welded.find(index));
    if (new Set(ids).size < 3) degenerateIndexTriangles += 1;
    const key = [...ids].sort((a, b) => a - b).join(',');
    if (triangleKeys.has(key)) duplicateTriangles += 1;
    triangleKeys.add(key);
    const [a, b, c] = raw.map((index) => positions[index]);
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0]
    ];
    if (Math.hypot(...cross) * 0.5 < 1e-12) nearZeroAreaTriangles += 1;
    addEdge(raw[0], raw[1]);
    addEdge(raw[1], raw[2]);
    addEdge(raw[2], raw[0]);
    const root = surface.find(welded.find(raw[0]));
    componentTriangles.set(root, (componentTriangles.get(root) || 0) + 1);
}

const counts = [...edgeUses.values()];
const componentSizes = [...componentTriangles.values()].sort((a, b) => b - a);
const largestRoot = [...componentTriangles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
const largestEdgeCounts = [...edgeUses.entries()]
    .filter(([key]) => surface.find(Number(key.split(',')[0])) === largestRoot)
    .map(([, count]) => count);
const report = {
    file: filename,
    bytes: bytes.length,
    vertices: positions.length,
    weldedVertices: new Set(positions.map((_, index) => welded.find(index))).size,
    triangles: Math.floor(indices.length / 3),
    connectedSurfaceComponents: componentSizes.length,
    largestComponentTriangles: componentSizes.slice(0, 20),
    boundaryEdges: counts.filter((count) => count === 1).length,
    manifoldEdges: counts.filter((count) => count === 2).length,
    nonManifoldEdges: counts.filter((count) => count > 2).length,
    maximumEdgeUse: Math.max(...counts),
    largestComponentBoundaryEdges: largestEdgeCounts.filter((count) => count === 1).length,
    largestComponentNonManifoldEdges: largestEdgeCounts.filter((count) => count > 2).length,
    degenerateIndexTriangles,
    nearZeroAreaTriangles,
    duplicateTriangles,
    invalidPositions,
    invalidIndices
};
console.log(JSON.stringify(report, null, 2));
