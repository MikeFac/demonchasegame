/**
 * WallRects - turns the server's flat wall list into camera-cullable rectangles.
 *
 * Shared between the browser (window.WallRects) and Node tests (module.exports).
 * Pure logic, no canvas, no globals other than the arguments.
 *
 * Why: the 2D renderer used to iterate every wall cell in the 3000x3000 world
 * (~11,700 cells on `classic`) on every frame in order to draw ~300 of them.
 * This module merges grid-aligned cells into larger rectangles and answers
 * "which rectangles are on screen" with a binary search over y.
 *
 * Only cells that are exactly `cellSize` square and grid aligned are merged.
 * Anything else (custom mission maps may supply arbitrary rectangles) is passed
 * through untouched so rendering never disagrees with collision.
 */
const WallRects = (function () {
    /**
     * @param {Array<{x:number,y:number,width:number,height:number}>} walls
     * @param {number} cellSize
     * @returns {{rects: Array, maxHeight: number, mergedCells: number, passthrough: number}}
     *          `rects` is sorted by y ascending.
     */
    function build(walls, cellSize) {
        const cell = cellSize > 0 ? cellSize : 25;
        const passthrough = [];
        const rows = new Map(); // gy -> Set(gx)
        let mergedCells = 0;

        for (let i = 0; i < walls.length; i++) {
            const w = walls[i];
            if (!w || !(w.width > 0) || !(w.height > 0)) continue;

            const aligned =
                w.width === cell &&
                w.height === cell &&
                w.x % cell === 0 &&
                w.y % cell === 0 &&
                w.x >= 0 &&
                w.y >= 0;

            if (!aligned) {
                passthrough.push({ x: w.x, y: w.y, w: w.width, h: w.height });
                continue;
            }

            const gx = w.x / cell;
            const gy = w.y / cell;
            let row = rows.get(gy);
            if (!row) {
                row = new Set();
                rows.set(gy, row);
            }
            if (!row.has(gx)) {
                row.add(gx);
                mergedCells++;
            }
        }

        // Horizontal runs per row, then merge identical runs downwards so a
        // solid 6x6 city block becomes one rectangle instead of 36.
        const rowKeys = Array.from(rows.keys()).sort((a, b) => a - b);
        const runsByRow = new Map();
        for (let i = 0; i < rowKeys.length; i++) {
            const gy = rowKeys[i];
            const xs = Array.from(rows.get(gy)).sort((a, b) => a - b);
            const runs = [];
            let start = null;
            let prev = null;
            for (let k = 0; k < xs.length; k++) {
                const x = xs[k];
                if (start === null) {
                    start = x;
                } else if (x !== prev + 1) {
                    runs.push({ gx: start, len: prev - start + 1 });
                    start = x;
                }
                prev = x;
            }
            if (start !== null) runs.push({ gx: start, len: prev - start + 1 });
            runsByRow.set(gy, runs);
        }

        const out = [];
        const open = new Map(); // "gx:len" -> {gx,len,gy,height}

        const flush = (entry) => {
            out.push({
                x: entry.gx * cell,
                y: entry.gy * cell,
                w: entry.len * cell,
                h: entry.height * cell
            });
        };

        for (let i = 0; i < rowKeys.length; i++) {
            const gy = rowKeys[i];
            const runs = runsByRow.get(gy) || [];

            // Close runs that stopped at the previous row.
            for (const [key, entry] of open) {
                if (entry.gy + entry.height !== gy) {
                    flush(entry);
                    open.delete(key);
                }
            }

            const seen = new Set();
            for (let r = 0; r < runs.length; r++) {
                const run = runs[r];
                const key = run.gx + ':' + run.len;
                seen.add(key);
                const existing = open.get(key);
                if (existing) {
                    existing.height++;
                } else {
                    open.set(key, { gx: run.gx, len: run.len, gy: gy, height: 1 });
                }
            }

            // Close runs that did not continue into this row.
            for (const [key, entry] of open) {
                if (!seen.has(key)) {
                    flush(entry);
                    open.delete(key);
                }
            }
        }
        for (const entry of open.values()) flush(entry);

        const rects = out.concat(passthrough);
        rects.sort((a, b) => (a.y - b.y) || (a.x - b.x));

        let maxHeight = 0;
        for (let i = 0; i < rects.length; i++) {
            if (rects[i].h > maxHeight) maxHeight = rects[i].h;
        }

        return {
            rects: rects,
            maxHeight: maxHeight,
            mergedCells: mergedCells,
            passthrough: passthrough.length
        };
    }

    /**
     * Collect rectangles intersecting `view` into `out` (reused array).
     *
     * @param {Array} rects sorted by y, from build()
     * @param {number} maxHeight tallest rect, from build()
     * @param {{x:number,y:number,w:number,h:number}} view world-space view rect
     * @param {Array} out array to fill (cleared first)
     * @returns {number} number of visible rects
     */
    function query(rects, maxHeight, view, out) {
        out.length = 0;
        if (!rects || rects.length === 0) return 0;

        const left = view.x;
        const right = view.x + view.w;
        const top = view.y;
        const bottom = view.y + view.h;

        // Binary search for the first rect whose y could still reach `top`.
        let lo = 0;
        let hi = rects.length;
        const searchFrom = top - maxHeight;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (rects[mid].y < searchFrom) lo = mid + 1;
            else hi = mid;
        }

        let count = 0;
        for (let i = lo; i < rects.length; i++) {
            const r = rects[i];
            if (r.y > bottom) break;
            if (r.y + r.h <= top) continue;
            if (r.x + r.w <= left || r.x >= right) continue;
            out[count++] = r;
        }
        out.length = count;
        return count;
    }

    return { build, query };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WallRects;
} else {
    window.WallRects = WallRects;
}
