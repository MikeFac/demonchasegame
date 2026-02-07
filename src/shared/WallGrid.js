/**
 * WallGrid — O(1) spatial collision against a boolean wall grid.
 * Shared between server (require) and client (window).
 */
(function () {
    function WallGrid(grid, rows, cols, cellSize) {
        this.grid = grid;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
    }

    /**
     * Check if an AABB (center-based) collides with any wall cell.
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @returns {boolean}
     */
    WallGrid.prototype.collides = function (x, y, w, h) {
        var left = x - w / 2;
        var right = x + w / 2;
        var top = y - h / 2;
        var bottom = y + h / 2;

        var minCol = Math.max(0, Math.floor(left / this.cellSize));
        var maxCol = Math.min(this.cols - 1, Math.floor((right - 0.01) / this.cellSize));
        var minRow = Math.max(0, Math.floor(top / this.cellSize));
        var maxRow = Math.min(this.rows - 1, Math.floor((bottom - 0.01) / this.cellSize));

        for (var r = minRow; r <= maxRow; r++) {
            for (var c = minCol; c <= maxCol; c++) {
                if (this.grid[r][c]) return true;
            }
        }
        return false;
    };

    /**
     * Check if a circle collides with any wall cell.
     * Uses bounding-box to find candidate cells, then precise circle-rect check.
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius
     * @returns {boolean}
     */
    WallGrid.prototype.collidesCircle = function (cx, cy, radius) {
        var left = cx - radius;
        var right = cx + radius;
        var top = cy - radius;
        var bottom = cy + radius;

        var minCol = Math.max(0, Math.floor(left / this.cellSize));
        var maxCol = Math.min(this.cols - 1, Math.floor(right / this.cellSize));
        var minRow = Math.max(0, Math.floor(top / this.cellSize));
        var maxRow = Math.min(this.rows - 1, Math.floor(bottom / this.cellSize));

        for (var r = minRow; r <= maxRow; r++) {
            for (var c = minCol; c <= maxCol; c++) {
                if (!this.grid[r][c]) continue;

                // Closest point on the rect to the circle center
                var rectX = c * this.cellSize;
                var rectY = r * this.cellSize;
                var closestX = Math.max(rectX, Math.min(cx, rectX + this.cellSize));
                var closestY = Math.max(rectY, Math.min(cy, rectY + this.cellSize));

                var dx = cx - closestX;
                var dy = cy - closestY;
                if (dx * dx + dy * dy <= radius * radius) return true;
            }
        }
        return false;
    };

    /**
     * Construct a WallGrid from a flat boolean array (for network transfer).
     */
    WallGrid.fromFlat = function (flat, rows, cols, cellSize) {
        var grid = [];
        for (var r = 0; r < rows; r++) {
            grid[r] = [];
            for (var c = 0; c < cols; c++) {
                grid[r][c] = flat[r * cols + c];
            }
        }
        return new WallGrid(grid, rows, cols, cellSize);
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WallGrid;
    } else {
        window.WallGrid = WallGrid;
    }
})();
