const Constants = require('../../shared/Constants');

/**
 * Dungeon-room maze generator using 25px cells.
 * Places random rooms, connects them via MST corridors, and returns
 * both a wall-object array (for rendering) and a boolean grid (for collision).
 *
 * @param {number} width  - World width in pixels (e.g. 2000)
 * @param {number} height - World height in pixels (e.g. 2000)
 * @param {number} cellSize - Size of each grid cell (default: CELL_SIZE = 25)
 * @returns {{ walls: Array, grid: boolean[][], cols: number, rows: number, spawnX: number, spawnY: number }}
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

    // Initialize grid: true = wall, false = open
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = true;
        }
    }

    // --- Room placement ---
    const rooms = [];
    const MIN_ROOM = 4;   // cells
    const MAX_ROOM = 8;   // cells
    const BUFFER = 2;     // cell gap between rooms
    const BORDER = 2;     // cells from world edge
    const TARGET_ROOMS = 12;
    const MAX_ATTEMPTS = 300;

    let attempts = 0;
    while (rooms.length < TARGET_ROOMS && attempts < MAX_ATTEMPTS) {
        attempts++;
        const rw = MIN_ROOM + Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM + 1));
        const rh = MIN_ROOM + Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM + 1));
        const rx = BORDER + Math.floor(Math.random() * (cols - rw - BORDER * 2));
        const ry = BORDER + Math.floor(Math.random() * (rows - rh - BORDER * 2));

        // Check overlap with existing rooms (including buffer)
        let overlaps = false;
        for (const room of rooms) {
            if (rx - BUFFER < room.x + room.w &&
                rx + rw + BUFFER > room.x &&
                ry - BUFFER < room.y + room.h &&
                ry + rh + BUFFER > room.y) {
                overlaps = true;
                break;
            }
        }
        if (overlaps) continue;

        rooms.push({ x: rx, y: ry, w: rw, h: rh });

        // Carve room into grid
        for (let r = ry; r < ry + rh; r++) {
            for (let c = rx; c < rx + rw; c++) {
                grid[r][c] = false;
            }
        }
    }

    // If fewer than 2 rooms placed, force at least 2
    if (rooms.length < 2) {
        const fallback = { x: BORDER, y: BORDER, w: 6, h: 6 };
        rooms.push(fallback);
        for (let r = fallback.y; r < fallback.y + fallback.h; r++) {
            for (let c = fallback.x; c < fallback.x + fallback.w; c++) {
                grid[r][c] = false;
            }
        }
        const fallback2 = { x: cols - BORDER - 6, y: rows - BORDER - 6, w: 6, h: 6 };
        rooms.push(fallback2);
        for (let r = fallback2.y; r < fallback2.y + fallback2.h; r++) {
            for (let c = fallback2.x; c < fallback2.x + fallback2.w; c++) {
                grid[r][c] = false;
            }
        }
    }

    // --- Compute room centers ---
    const centers = rooms.map(room => ({
        cx: Math.floor(room.x + room.w / 2),
        cy: Math.floor(room.y + room.h / 2)
    }));

    // --- MST (Prim's algorithm) to connect all rooms ---
    const n = rooms.length;
    const inMST = new Array(n).fill(false);
    const mstEdges = [];

    // Distance between room centers
    function dist(i, j) {
        const dx = centers[i].cx - centers[j].cx;
        const dy = centers[i].cy - centers[j].cy;
        return Math.abs(dx) + Math.abs(dy); // Manhattan distance
    }

    inMST[0] = true;
    while (mstEdges.length < n - 1) {
        let bestDist = Infinity;
        let bestFrom = -1;
        let bestTo = -1;
        for (let i = 0; i < n; i++) {
            if (!inMST[i]) continue;
            for (let j = 0; j < n; j++) {
                if (inMST[j]) continue;
                const d = dist(i, j);
                if (d < bestDist) {
                    bestDist = d;
                    bestFrom = i;
                    bestTo = j;
                }
            }
        }
        if (bestTo === -1) break;
        inMST[bestTo] = true;
        mstEdges.push([bestFrom, bestTo]);
    }

    // --- Carve corridors ---
    function carveCorridorWide(x1, y1, x2, y2, halfWidth) {
        // L-shaped: horizontal first, then vertical
        // Horizontal segment
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let c = minX; c <= maxX; c++) {
            for (let offset = -halfWidth; offset <= halfWidth; offset++) {
                const r = y1 + offset;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = false;
                }
            }
        }

        // Vertical segment
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        for (let r = minY; r <= maxY; r++) {
            for (let offset = -halfWidth; offset <= halfWidth; offset++) {
                const c = x2 + offset;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = false;
                }
            }
        }
    }

    // Main MST corridors: 6 cells wide (halfWidth = 3) -> 150px
    for (const [from, to] of mstEdges) {
        carveCorridorWide(centers[from].cx, centers[from].cy, centers[to].cx, centers[to].cy, 3);
    }

    // Optional extra corridors (shortcuts): 2-3 cells wide
    const extraCorridors = Math.floor(rooms.length * 0.3);
    for (let i = 0; i < extraCorridors; i++) {
        const a = Math.floor(Math.random() * n);
        let b = Math.floor(Math.random() * n);
        if (a === b) b = (b + 1) % n;
        const halfWidth = Math.random() < 0.5 ? 1 : 1; // 1 = 3 cells wide (50-75px)
        carveCorridorWide(centers[a].cx, centers[a].cy, centers[b].cx, centers[b].cy, halfWidth);
    }

    // --- Convert grid to wall objects ---
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: Math.floor(Math.random() * 4)
                });
            }
        }
    }

    // Spawn point: center of first room
    const spawnX = centers[0].cx * cellSize;
    const spawnY = centers[0].cy * cellSize;

    return { walls, grid, cols, rows, spawnX, spawnY };
}

module.exports = generateMaze;
