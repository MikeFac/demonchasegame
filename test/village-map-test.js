/**
 * Village (starter mission) map tests.
 *
 * Run: node test/village-map-test.js
 *
 * The starter map is hand-composed and the mission hard-codes encounter
 * coordinates, so these tests guard the contract between the two: if someone
 * moves a wall, the encounters must still be reachable and standing in the open.
 */
const fs = require('fs');
const path = require('path');
const MapGenerators = require('../src/shared/map-generators');
const Constants = require('../src/shared/Constants');
const WallGrid = require('../src/shared/WallGrid');

const CELL = Constants.CELL_SIZE;
const WORLD = Constants.WORLD_WIDTH;
const MISSION_FILE = path.join(__dirname, '..', 'missions', 'chapter0-start-here.json');

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

const mission = JSON.parse(fs.readFileSync(MISSION_FILE, 'utf8')).missions[0];
const map = MapGenerators.generateMap('village', WORLD, WORLD, CELL);
const grid = map.grid;
const wallGrid = new WallGrid(grid, map.rows, map.cols, CELL);

/** A cell the 48px player can stand in without colliding. */
function standable(gx, gy) {
    const x = gx * CELL + CELL / 2;
    const y = gy * CELL + CELL / 2;
    return !wallGrid.collides(x, y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT);
}

console.log('Village basics');
check('generator is registered', MapGenerators.AVAILABLE_STYLES.includes('village'));
check('mission uses the village map', mission.mapStyle === 'village', mission.mapStyle);
check('mission sets a terrain theme', !!mission.worldTheme, String(mission.worldTheme));
check('map has walls', map.walls.length > 500, String(map.walls.length));
check('map has streets rendered as paths', Array.isArray(map.paths) && map.paths.length > 0);

console.log('\nDeterminism');
{
    const a = MapGenerators.generateMap('village', WORLD, WORLD, CELL);
    const b = MapGenerators.generateMap('village', WORLD, WORLD, CELL);
    let identical = a.walls.length === b.walls.length;
    for (let i = 0; identical && i < a.walls.length; i++) {
        if (a.walls[i].x !== b.walls[i].x || a.walls[i].y !== b.walls[i].y) identical = false;
    }
    check('same map every time (mission coordinates depend on it)', identical);
}

console.log('\nSpawn and encounters');
{
    check('spawn is standable',
        !wallGrid.collides(map.spawnX, map.spawnY, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT));

    const encounters = mission.fixedMonsters || [];
    check('mission defines encounters', encounters.length >= 2, String(encounters.length));
    for (const e of encounters) {
        const label = (e.label || e.demonType || 'demon').padEnd(12);
        check(label + ' does not stand in a wall',
            !wallGrid.collides(e.x, e.y, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT));
        // Within one screen of the spawn, so the player can see it.
        const dx = Math.abs(e.x - map.spawnX);
        const dy = Math.abs(e.y - map.spawnY);
        check(label + ' is visible from the spawn', dx < 300 && dy < 220, `dx=${Math.round(dx)} dy=${Math.round(dy)}`);
    }
}

console.log('\nReachability');
{
    // Flood fill over cells the player can stand in.
    const startX = Math.round(map.spawnX / CELL);
    const startY = Math.round(map.spawnY / CELL);
    const seen = new Uint8Array(map.rows * map.cols);
    const queue = [startY * map.cols + startX];
    seen[queue[0]] = 1;
    let reached = 0;

    while (queue.length) {
        const idx = queue.pop();
        reached++;
        const gx = idx % map.cols;
        const gy = (idx - gx) / map.cols;
        const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of neighbours) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
            const nIdx = ny * map.cols + nx;
            if (seen[nIdx]) continue;
            if (!standable(nx, ny)) continue;
            seen[nIdx] = 1;
            queue.push(nIdx);
        }
    }

    check('the player can walk somewhere', reached > 100, String(reached));

    for (const e of (mission.fixedMonsters || [])) {
        const gx = Math.round(e.x / CELL);
        const gy = Math.round(e.y / CELL);
        const idx = gy * map.cols + gx;
        check((e.label || 'demon') + ' is reachable on foot', !!seen[idx]);
    }

    // The village is walled in: every reachable cell must be inside its ring, so
    // the player never wanders into the empty remainder of the 3000x3000 world.
    let escaped = 0;
    for (let gy = 0; gy < map.rows; gy++) {
        for (let gx = 0; gx < map.cols; gx++) {
            if (!seen[gy * map.cols + gx]) continue;
            if (gx < 36 || gx > 83 || gy < 36 || gy > 83) escaped++;
        }
    }
    check('the village is sealed — no way into the empty world', escaped === 0, 'escaped cells ' + escaped);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
