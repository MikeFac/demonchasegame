/**
 * GridCity layout tests — level 1's map.
 *
 * Run: node test/city-map-test.js
 *
 * The city is the first thing a player sees, so these lock the properties that
 * make it readable: houses big enough for the 100px building sprites, streets
 * wide enough for the 48px player, and a spawn that is not inside a wall.
 */
const MapGenerators = require('../src/shared/map-generators');
const Constants = require('../src/shared/Constants');
const WallGrid = require('../src/shared/WallGrid');

const CELL = Constants.CELL_SIZE;
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

function cellKey(gx, gy) {
    return gy * 100000 + gx;
}

/** Maximal solid square plots with open ground on all four sides. */
function isolatedPlots(grid, rows, cols, size) {
    const wall = (gx, gy) => gy >= 0 && gy < rows && gx >= 0 && gx < cols && grid[gy][gx];
    const solid = (gx, gy) => {
        for (let oy = 0; oy < size; oy++) {
            for (let ox = 0; ox < size; ox++) {
                if (!wall(gx + ox, gy + oy)) return false;
            }
        }
        return true;
    };
    const seen = new Set();
    const plots = [];
    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            if (!solid(gx, gy)) continue;
            if (seen.has(cellKey(gx, gy))) continue;
            for (let oy = 0; oy < size; oy++) {
                for (let ox = 0; ox < size; ox++) seen.add(cellKey(gx + ox, gy + oy));
            }
            const mid = size >> 1;
            const open =
                !wall(gx + mid, gy - 1) &&
                !wall(gx + mid, gy + size) &&
                !wall(gx - 1, gy + mid) &&
                !wall(gx + size, gy + mid);
            if (open) plots.push({ gx, gy });
        }
    }
    return plots;
}

const map = MapGenerators.generateMap('city', Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT, CELL);
const { grid, rows, cols } = map;
const wallGrid = new WallGrid(grid, rows, cols, CELL);

console.log('GridCity layout');
check('grid matches the world size', rows === 120 && cols === 120, rows + 'x' + cols);
check('map produces walls', map.walls.length > 1000);

console.log('\nHouse footprints');
{
    const plots2 = isolatedPlots(grid, rows, cols, 2);
    const plots4 = isolatedPlots(grid, rows, cols, 4);

    // 4x4 cells = 100px, which is the native size of the building sprites.
    check('city has 4x4 house plots', plots4.length >= 150, 'found ' + plots4.length);

    // The old 2x2 footprints were too small for the 100px art and read as tiles.
    check('no 2x2 house plots remain', plots2.length === 0, 'found ' + plots2.length);

    check('plots are all inside the border', plots4.every(p => p.gx > 0 && p.gy > 0));
}

console.log('\nStreets and spawn');
{
    // Streets are 4 cells wide; a 48px player needs two clear cells.
    const start = map.spawnX;
    const free = [];
    for (let d = 0; d < 400; d += CELL) {
        if (!wallGrid.collides(start, start - d, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT)) free.push(d);
        else break;
    }
    check('a player fits at the spawn for a few cells',
        free.length >= 3, 'clear distance ' + free.length + ' cells');

    check('spawn does not collide',
        !wallGrid.collides(map.spawnX, map.spawnY, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT));

    // The outer ring stays solid so nothing can leave the world.
    let borderOk = true;
    for (let i = 0; i < cols; i++) {
        if (!grid[0][i] || !grid[rows - 1][i]) borderOk = false;
        if (!grid[i][0] || !grid[i][cols - 1]) borderOk = false;
    }
    check('world border is solid', borderOk);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
