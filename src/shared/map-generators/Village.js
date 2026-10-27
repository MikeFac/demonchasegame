(function () {
var Constants;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('../Constants');
} else {
    Constants = window.Constants;
}

/**
 * Village Generator — the authored starter map.
 *
 * Unlike the other generators this layout is hand-composed, not random, because
 * it is the first world a new player ever sees. It is built around the chapter 0
 * starter mission, whose spawn and encounter positions are fixed:
 *
 *   player spawn   cell (60, 60)    world (1500, 1500)
 *   first demon    cell (75, 58)    world (1885, 1460)  — east courtyard
 *   second demon   cell (60, 48)    world (1500, 1195)  — north courtyard
 *
 * Composition: a walled village whose houses front onto a central square, with
 * two courtyards holding the two scripted encounters. Houses are placed by hand
 * so they frame the square instead of scattering across it — a ring of frontage
 * is what makes the space read as a village rather than a field with buildings
 * in it.
 *
 * Everything is deterministic, so the mission's absolute coordinates stay valid
 * and every player sees the same opening.
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    const grid = [];

    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = (r === 0 || r === rows - 1 || c === 0 || c === cols - 1);
        }
    }

    function fill(x, y, w, h, value) {
        for (let r = Math.max(0, y); r < Math.min(rows, y + h); r++) {
            for (let c = Math.max(0, x); c < Math.min(cols, x + w); c++) {
                grid[r][c] = value;
            }
        }
    }

    function areaClear(x, y, w, h) {
        for (let r = y; r < y + h; r++) {
            if (r < 0 || r >= rows) return false;
            for (let c = x; c < x + w; c++) {
                if (c < 0 || c >= cols) return false;
                if (grid[r][c]) return false;
            }
        }
        return true;
    }

    // --- Village enclosure -------------------------------------------------
    // 48x48 cells (1200px) centred on the spawn, with a 2-cell wall ring so the
    // player can never wander into the empty remainder of the world.
    const VX = 36;
    const VY = 36;
    const VW = 48;
    const VH = 48;
    const WALL = 2;

    fill(VX, VY, VW, WALL, true);
    fill(VX, VY + VH - WALL, VW, WALL, true);
    fill(VX, VY, WALL, VH, true);
    fill(VX + VW - WALL, VY, WALL, VH, true);

    // --- Open space --------------------------------------------------------
    // A crossroads: one street north-south, one east-west, widened into a small
    // square at the crossing where the player spawns. Both scripted enemies stand
    // in the open ends of those streets, so the player can see where to go from
    // the spawn point without a minimap.
    const reserved = [];
    function reserve(x, y, w, h) {
        reserved.push({ x: x, y: y, w: w, h: h });
        fill(x, y, w, h, false);
    }

    reserve(58, 38, 4, 44);    // north-south street
    reserve(38, 58, 44, 4);    // east-west street
    reserve(56, 56, 8, 8);     // square at the crossing — spawn is its centre

    // Ground paths, purely decorative: they make the streets readable against
    // the ground. Collision still comes from the wall grid alone.
    const paths = [
        { x: 58 * cellSize, y: 38 * cellSize, w: 4 * cellSize, h: 44 * cellSize },
        { x: 38 * cellSize, y: 58 * cellSize, w: 44 * cellSize, h: 4 * cellSize },
        { x: 56 * cellSize, y: 56 * cellSize, w: 8 * cellSize, h: 8 * cellSize }
    ];

    // --- Houses ------------------------------------------------------------
    // 4x4-cell plots (100px), the native size of the building sprites, on a
    // 6-cell pitch: four cells of house and a two-cell alley. Each quadrant is a
    // 3x3 block, which gives the square and both streets a continuous frontage
    // instead of the scatter of buildings the open map produced.
    const HOUSE = 4;
    const housePlots = [];

    function overlapsReserved(gx, gy) {
        for (let i = 0; i < reserved.length; i++) {
            const r = reserved[i];
            if (gx < r.x + r.w && gx + HOUSE > r.x &&
                gy < r.y + r.h && gy + HOUSE > r.y) {
                return true;
            }
        }
        return false;
    }

    function placeHouse(gx, gy) {
        if (gx < VX + WALL || gy < VY + WALL) return false;
        if (gx + HOUSE > VX + VW - WALL || gy + HOUSE > VY + VH - WALL) return false;
        // Never build into a street or the square.
        if (overlapsReserved(gx, gy)) return false;
        // One clear cell around the plot, so houses read as separate buildings
        // and no alley is a dead 25px slot.
        if (!areaClear(gx - 1, gy - 1, HOUSE + 2, HOUSE + 2)) return false;

        fill(gx, gy, HOUSE, HOUSE, true);
        housePlots.push({ gx: gx, gy: gy });
        return true;
    }

    const QUADRANTS = [[40, 40], [64, 40], [40, 64], [64, 64]];
    QUADRANTS.forEach(function (origin) {
        [0, 6, 12].forEach(function (dy) {
            [0, 6, 12].forEach(function (dx) {
                placeHouse(origin[0] + dx, origin[1] + dy);
            });
        });
    });

    // --- Wall list ---------------------------------------------------------
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: 8
                });
            }
        }
    }

    return {
        walls: walls,
        grid: grid,
        cols: cols,
        rows: rows,
        spawnX: 60 * cellSize,
        spawnY: 60 * cellSize,
        paths: paths,
        housePlots: housePlots
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = generateMaze;
} else {
    window.Village = generateMaze;
}
})();
