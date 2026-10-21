/**
 * Viewport - single source of truth for the 2D canvas size.
 *
 * The game is laid out in *logical* (CSS) pixels (320-600 wide), but the
 * canvas bitmap is rendered at `devicePixelRatio` so text and sprites stay
 * crisp on modern phones. Everything that draws on #gameCanvas must use
 * `Viewport.width` / `Viewport.height` for layout and `Viewport.clear()` for
 * a full clear; `canvas.width` / `canvas.height` are the *bitmap* size only.
 *
 * Loaded after Constants.js and before UILayout.js, Renderer.js and game.js.
 *
 * Rules:
 *  - Assigning canvas.width/height resets the 2D transform. Always go through
 *    Viewport.apply()/setSize(), which re-applies the DPR transform afterwards.
 *  - Never draw using bitmap dimensions; they are DPR-scaled.
 *  - DPR is capped at 2 so 3x phones do not render a 3x-size bitmap.
 */
const Viewport = (function () {
    const MAX_DPR = 2;
    const FALLBACK_WIDTH = 400;
    const FALLBACK_HEIGHT = 600;

    let logicalWidth = FALLBACK_WIDTH;
    let logicalHeight = FALLBACK_HEIGHT;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let lastCanvas = null;

    function readDpr() {
        const raw = window.devicePixelRatio || 1;
        return Math.max(1, Math.min(raw, MAX_DPR));
    }

    /**
     * Size the canvas bitmap to logical size * DPR, keep its CSS size at the
     * logical size, and re-apply the DPR transform to the 2D context.
     *
     * @param {HTMLCanvasElement} canvas
     * @returns {CanvasRenderingContext2D|null}
     */
    function apply(canvas) {
        if (!canvas) return null;
        lastCanvas = canvas;
        pixelRatio = readDpr();

        const bitmapWidth = Math.max(1, Math.round(logicalWidth * pixelRatio));
        const bitmapHeight = Math.max(1, Math.round(logicalHeight * pixelRatio));

        // Assigning width/height clears the canvas and resets the transform.
        if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
        if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;

        canvas.style.width = logicalWidth + 'px';
        canvas.style.height = logicalHeight + 'px';

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        return ctx;
    }

    /**
     * Update the logical size and re-apply the bitmap size/transform.
     *
     * @param {number} width logical width in CSS pixels
     * @param {number} height logical height in CSS pixels
     * @param {HTMLCanvasElement} [canvas] defaults to the last applied canvas
     */
    function setSize(width, height, canvas) {
        logicalWidth = Math.max(1, Math.round(width));
        logicalHeight = Math.max(1, Math.round(height));
        return apply(canvas || lastCanvas);
    }

    /**
     * Re-apply the DPR transform after code has touched the context transform.
     * Safe to call every frame.
     */
    function reapply(ctx) {
        if (!ctx) return;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    /**
     * Clear the whole bitmap. Uses the identity transform so it covers the
     * full DPR-scaled backing store regardless of the current transform.
     */
    function clear(ctx, canvas) {
        if (!ctx) return;
        const target = canvas || lastCanvas;
        const width = target ? target.width : Math.round(logicalWidth * pixelRatio);
        const height = target ? target.height : Math.round(logicalHeight * pixelRatio);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.restore();
    }

    /**
     * Convert a DOM client point to logical canvas coordinates. The scale is
     * Viewport.width / rect.width so it stays correct if the CSS size is ever
     * letterboxed by the browser.
     */
    function toLogicalPoint(clientX, clientY, canvas) {
        const target = canvas || lastCanvas;
        if (!target) return { x: clientX, y: clientY };
        const rect = target.getBoundingClientRect();
        const scaleX = rect.width ? logicalWidth / rect.width : 1;
        const scaleY = rect.height ? logicalHeight / rect.height : 1;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    /** Refresh DPR (e.g. after moving the window between monitors). */
    function refreshDpr() {
        pixelRatio = readDpr();
        return pixelRatio;
    }

    return {
        MAX_DPR,
        get width() { return logicalWidth; },
        get height() { return logicalHeight; },
        get dpr() { return pixelRatio; },
        get bitmapWidth() { return Math.max(1, Math.round(logicalWidth * pixelRatio)); },
        get bitmapHeight() { return Math.max(1, Math.round(logicalHeight * pixelRatio)); },
        get canvas() { return lastCanvas; },
        apply,
        setSize,
        reapply,
        clear,
        toLogicalPoint,
        refreshDpr
    };
})();

window.Viewport = Viewport;
