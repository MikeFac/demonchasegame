import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function padToFour(bytes, fill) {
    const padding = (4 - (bytes.length % 4)) % 4;
    return padding ? Buffer.concat([bytes, Buffer.alloc(padding, fill)]) : bytes;
}

function decodeEmbeddedBuffer(uri) {
    const match = /^data:application\/octet-stream;base64,(.+)$/s.exec(uri || '');
    if (!match) throw new Error('Expected one embedded base64 application/octet-stream buffer');
    return Buffer.from(match[1], 'base64');
}

function convert(inputPath, outputPath) {
    const document = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    if (document.asset?.version !== '2.0') throw new Error('Only glTF 2.0 is supported');
    if (document.buffers?.length !== 1) throw new Error('Expected exactly one embedded buffer');

    const binary = padToFour(decodeEmbeddedBuffer(document.buffers[0].uri), 0);
    delete document.buffers[0].uri;
    document.buffers[0].byteLength = binary.length;

    const canonicalClipNames = new Map([
        ['fastflying', 'walk'],
        ['flyingidle', 'idle'],
        ['hitreact', 'hit'],
        ['punch', 'attack']
    ]);
    for (const animation of document.animations || []) {
        const normalized = String(animation.name || '').trim().toLowerCase().replace(/[ ._-]+/g, '');
        if (canonicalClipNames.has(normalized)) animation.name = canonicalClipNames.get(normalized);
    }

    const json = padToFour(Buffer.from(JSON.stringify(document), 'utf8'), 0x20);
    const totalLength = 12 + 8 + json.length + 8 + binary.length;
    const glb = Buffer.alloc(totalLength);
    let offset = 0;

    glb.writeUInt32LE(0x46546c67, offset); offset += 4;
    glb.writeUInt32LE(2, offset); offset += 4;
    glb.writeUInt32LE(totalLength, offset); offset += 4;
    glb.writeUInt32LE(json.length, offset); offset += 4;
    glb.writeUInt32LE(0x4e4f534a, offset); offset += 4;
    json.copy(glb, offset); offset += json.length;
    glb.writeUInt32LE(binary.length, offset); offset += 4;
    glb.writeUInt32LE(0x004e4942, offset); offset += 4;
    binary.copy(glb, offset);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, glb);
    console.log(`${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)} (${glb.length} bytes)`);
}

const [input, output] = process.argv.slice(2);
if (!input || !output) {
    console.error('Usage: node scripts/convert-embedded-gltf-to-glb.mjs INPUT.gltf OUTPUT.glb');
    process.exit(1);
}

convert(path.resolve(input), path.resolve(output));
