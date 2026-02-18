var Constants;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('../Constants');
} else {
    Constants = window.Constants;
}

/**
 * Narrow Paths Generator (Redesigned)
 * Room-based layout similar to Classic Dungeon, but with strictly narrow (50px / 2-cell) corridors.
 *
 * @param {number} width 
 * @param {number} height 
 * @param {number} cellSize 
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
    // Keep rooms relatively large as requested
    const MIN_ROOM = 5;   // cells
    const MAX_ROOM = 10;  // cells
    const BUFFER = 2;     // cell gap
    const BORDER = 2;     // cells from edge
    const TARGET_ROOMS = 15; // Slightly more rooms?
    const MAX_ATTEMPTS = 300;

    let attempts = 0;
    while (rooms.length < TARGET_ROOMS && attempts < MAX_ATTEMPTS) {
        attempts++;
        const rw = MIN_ROOM + Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM + 1));
        const rh = MIN_ROOM + Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM + 1));
        const rx = BORDER + Math.floor(Math.random() * (cols - rw - BORDER * 2));
        const ry = BORDER + Math.floor(Math.random() * (rows - rh - BORDER * 2));

        // Check overlap
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

        // Carve room
        for (let r = ry; r < ry + rh; r++) {
            for (let c = rx; c < rx + rw; c++) {
                grid[r][c] = false;
            }
        }
    }

    // Force at least 2 rooms
    if (rooms.length < 2) {
        const fallback = { x: BORDER, y: BORDER, w: 6, h: 6 };
        rooms.push(fallback);
        for (let r = fallback.y; r < fallback.y + fallback.h; r++) for (let c = fallback.x; c < fallback.x + fallback.w; c++) grid[r][c] = false;

        const fallback2 = { x: cols - BORDER - 6, y: rows - BORDER - 6, w: 6, h: 6 };
        rooms.push(fallback2);
        for (let r = fallback2.y; r < fallback2.y + fallback2.h; r++) for (let c = fallback2.x; c < fallback2.x + fallback2.w; c++) grid[r][c] = false;
    }

    // --- Rooms MST Connection ---
    const centers = rooms.map(room => ({
        cx: Math.floor(room.x + room.w / 2),
        cy: Math.floor(room.y + room.h / 2)
    }));

    const n = rooms.length;
    const inMST = new Array(n).fill(false);
    const mstEdges = [];

    function dist(i, j) {
        return Math.abs(centers[i].cx - centers[j].cx) + Math.abs(centers[i].cy - centers[j].cy);
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

    // --- Carve Corridors (50px = 2 cells) ---
    function carveCorridor2Cell(x1, y1, x2, y2) {
        // L-shaped
        // Width = 2. offsets: 0, 1. (e.g. c and c+1)

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let c = minX; c <= maxX; c++) {
            // Horizontal segment: carve row y1 and y1+1 ??
            // OR carve row y1-1 and y1.
            // Let's use -1, 0 to center it roughly? 
            // If y1 is integer, y1-1 and y1 makes it 2 cells.
            for (let offset = -1; offset <= 0; offset++) {
                const r = y1 + offset;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = false;
                }
            }
        }

        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        for (let r = minY; r <= maxY; r++) {
            // Vertical segment: carve col x2 and x2-1 ?
            for (let offset = -1; offset <= 0; offset++) {
                const c = x2 + offset;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = false;
                }
            }
        }

        // Ensure the corner is fully cleared (intersection of H and V)
        const cornerX = x2;
        const cornerY = y1;
        for (let rOffset = -1; rOffset <= 0; rOffset++) {
            for (let cOffset = -1; cOffset <= 0; cOffset++) {
                const r = cornerY + rOffset;
                const c = cornerX + cOffset;
                if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = false;
            }
        }
    }

    for (const [from, to] of mstEdges) {
        carveCorridor2Cell(centers[from].cx, centers[from].cy, centers[to].cx, centers[to].cy);
    }

    // Add extra connections (loops)
    const extraCorridors = Math.floor(rooms.length * 0.5); // 50% extra edges for loops
    for (let i = 0; i < extraCorridors; i++) {
        const a = Math.floor(Math.random() * n);
        let b = Math.floor(Math.random() * n);
        if (a === b) b = (b + 1) % n;
        carveCorridor2Cell(centers[a].cx, centers[a].cy, centers[b].cx, centers[b].cy);
    }

    // --- Output ---
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

    // Spawn point (first room center)
    // Find safe spot
    let spawnX = centers[0].cx * cellSize;
    let spawnY = centers[0].cy * cellSize;

    // Validate spawn
    if (grid[centers[0].cy][centers[0].cx]) {
        // Center is wall? (Shouldn't happen for room center, but just in case)
        spawnX = rooms[0].x * cellSize;
        spawnY = rooms[0].y * cellSize;
    }

    return { walls, grid, cols, rows, spawnX, spawnY };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = generateMaze;
} else {
    window.NarrowPaths = generateMaze;
}
