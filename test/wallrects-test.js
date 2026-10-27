/**
 * WallRects tests — merging + culling used by the 2D world renderer.
 *
 * Run: node test/wallrects-test.js
 */
const WallRects = require('../src/client/WallRects');
const MapGenerators = require('../src/shared/map-generators');
const TerrainThemes = require('../src/client/TerrainThemes');

const CELL = 25;
let pass = 0;
let fail = 0;

function check(name, condition, detail) {
    if (condition) {
        pass++;
        console.log('  ok   ' + name);
    } else {
        fail++;
        console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
    }
}

function cells(wallList) {
    const out = [];
    for (const w of wallList) {
        for (let x = w.x; x < w.x + (w.width || w.w); x += CELL) {
            for (let y = w.y; y < w.y + (w.height || w.h); y += CELL) {
                out.push(x + ',' + y);
            }
        }
    }
    return out;
}

function verifyCoverage(label, walls) {
    const built = WallRects.build(walls, CELL);
    const before = new Set(cells(walls));
    const seen = new Map();
    let overlaps = 0;

    for (const r of built.rects) {
        for (let x = r.x; x < r.x + r.w; x += CELL) {
            for (let y = r.y; y < r.y + r.h; y += CELL) {
                const key = x + ',' + y;
                if (seen.has(key)) overlaps++;
                seen.set(key, 1);
            }
        }
    }

    let missing = 0;
    for (const key of before) if (!seen.has(key)) missing++;
    let extra = 0;
    for (const key of seen.keys()) if (!before.has(key)) extra++;

    check(label + ': exact cell coverage',
        missing === 0 && extra === 0 && overlaps === 0,
        'missing=' + missing + ' extra=' + extra + ' overlaps=' + overlaps);

    return built;
}

function gridRect(x, y, w, h) {
    const out = [];
    for (let gy = 0; gy < h; gy++) {
        for (let gx = 0; gx < w; gx++) {
            out.push({ x: x + gx * CELL, y: y + gy * CELL, width: CELL, height: CELL });
        }
    }
    return out;
}

console.log('WallRects merging');

check('empty input produces no rects', WallRects.build([], CELL).rects.length === 0);

const single = WallRects.build(gridRect(100, 100, 1, 1), CELL);
check('single cell stays one rect', single.rects.length === 1);
check('single cell keeps size', single.rects[0].w === CELL && single.rects[0].h === CELL);

const row = WallRects.build(gridRect(100, 100, 4, 1), CELL);
check('horizontal run merges to one rect', row.rects.length === 1, 'got ' + row.rects.length);
check('horizontal run keeps width', row.rects[0].w === CELL * 4);

const col = WallRects.build(gridRect(100, 100, 1, 4), CELL);
check('vertical run merges to one rect', col.rects.length === 1, 'got ' + col.rects.length);
check('vertical run keeps height', col.rects[0].h === CELL * 4);

const block = WallRects.build(gridRect(100, 100, 3, 3), CELL);
check('solid block merges to one rect', block.rects.length === 1, 'got ' + block.rects.length);

// L shape: must not claim the missing corner.
const lShape = gridRect(100, 100, 2, 2).filter(c => c.y !== 125 || c.x !== 125);
const lBuilt = WallRects.build(lShape, CELL);
const lArea = lBuilt.rects.reduce((sum, r) => sum + r.w * r.h, 0);
check('L shape keeps exact area', lArea === lShape.length * CELL * CELL, 'area=' + lArea);
verifyCoverage('L shape', lShape);

// Gap in a row must not merge across it.
const gap = gridRect(100, 100, 2, 1).concat(gridRect(200, 100, 2, 1));
check('gap splits runs', WallRects.build(gap, CELL).rects.length === 2);

// Non grid-aligned (custom mission map) input must pass through unchanged.
const irregular = [{ x: 10, y: 10, width: 120, height: 60 }];
const irrBuilt = WallRects.build(irregular, CELL);
check('irregular rect passes through', irrBuilt.rects.length === 1);
check('irregular rect keeps size',
    irrBuilt.rects[0].w === 120 && irrBuilt.rects[0].h === 60);
check('irregular counted as passthrough', irrBuilt.passthrough === 1);

// Duplicate cells must not double count.
const dup = gridRect(100, 100, 2, 2).concat(gridRect(100, 100, 2, 2));
check('duplicates de-duplicated', WallRects.build(dup, CELL).rects.length === 1);

console.log('\nReal map generators');
for (const style of MapGenerators.AVAILABLE_STYLES) {
    const map = MapGenerators.generateMap(style, 3000, 3000, CELL);
    const built = verifyCoverage(style, map.walls);
    if (built.rects.length > map.walls.length) {
        check(style + ': rect count does not exceed cell count', false);
    }
}

console.log('\nCamera culling');
{
    const map = MapGenerators.generateMap('classic', 3000, 3000, CELL);
    const built = WallRects.build(map.walls, CELL);
    const out = [];

    const mid = WallRects.query(built.rects, built.maxHeight, { x: 1500, y: 1500, w: 512, h: 394 }, out);
    check('mid-map view returns some rects', mid > 0);

    // Every returned rect must actually intersect the view.
    let bad = 0;
    for (const r of out) {
        if (r.x + r.w <= 1500 || r.x >= 2012 || r.y + r.h <= 1500 || r.y >= 1894) bad++;
    }
    check('all returned rects intersect the view', bad === 0, 'bad=' + bad);

    const far = WallRects.query(built.rects, built.maxHeight, { x: 2950, y: 2950, w: 512, h: 394 }, out);
    check('corner view returns fewer rects than the world', far < built.rects.length);

    const empty = WallRects.query(built.rects, built.maxHeight, { x: -5000, y: -5000, w: 100, h: 100 }, out);
    check('off-world view returns nothing', empty === 0);

    const reuse = WallRects.query(built.rects, built.maxHeight, { x: 1500, y: 1500, w: 512, h: 394 }, out);
    check('query reuses the output array', reuse === out.length);

    // The cull must be a large win over iterating every cell.
    check('cull reduces work', mid * 5 < map.walls.length,
        'visible=' + mid + ' cells=' + map.walls.length);
}

console.log('\nTerrainThemes');
{
    check('all five level themes exist',
        ['city', 'earth', 'crystal', 'shadow', 'void'].every(n => TerrainThemes.has(n)));
    check('unknown theme falls back to stone', TerrainThemes.get('nope').name === 'stone');
    check('theme lookup is case sensitive', TerrainThemes.get('City').name === 'stone');

    const required = ['ground', 'groundAlt', 'groundSpeck', 'wall', 'wallTop', 'wallFace', 'wallLine', 'groundShadow'];
    let missing = [];
    for (const name of TerrainThemes.names()) {
        const t = TerrainThemes.get(name);
        for (const key of required) {
            if (!t[key]) missing.push(name + '.' + key);
        }
    }
    check('every theme defines the full palette', missing.length === 0, missing.join(', '));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
