/**
 * TerrainThemes - visual palette + procedural ground texture per `terrainTheme`.
 *
 * Loaded before Renderer.js (2D). The 2D world is drawn in two layers:
 *   1. a repeating procedural ground pattern (walkable space)
 *   2. solid wall blocks on top of it
 *
 * Phases 0-1 of plans/2d-background-graphics-plan.md only need ground + wall
 * colours. Phase 2 (tileset) and Phase 3 (cap/face/accents/particles) extend
 * this file with the remaining fields.
 *
 * Themes match LevelConfig.levelData[n].terrainTheme:
 *   city, earth, crystal, shadow, void
 * `stone` exists as an explicit neutral fallback so a missing/unknown theme
 * never silently borrows another chapter's look.
 */
const TerrainThemes = (function () {
    const THEMES = {
        city: {
            name: 'city',
            ground: '#8a8d81',
            groundAlt: '#7d8075',
            groundSpeck: '#a3a698',
            wall: '#4f5349',
            wallTop: '#6e7365',
            wallFace: '#2b2e26',
            wallLine: '#1b1d18',
            groundShadow: 'rgba(12,14,10,0.42)'
        },
        earth: {
            name: 'earth',
            ground: '#77854e',
            groundAlt: '#6a7846',
            groundSpeck: '#96a468',
            wall: '#6a4f2e',
            wallTop: '#8d6c42',
            wallFace: '#372616',
            wallLine: '#22170c',
            groundShadow: 'rgba(18,22,10,0.44)'
        },
        crystal: {
            name: 'crystal',
            ground: '#5f5883',
            groundAlt: '#544d75',
            groundSpeck: '#8e86bb',
            wall: '#352d55',
            wallTop: '#4f4576',
            wallFace: '#181229',
            wallLine: '#0b0818',
            groundShadow: 'rgba(10,6,26,0.5)'
        },
        shadow: {
            name: 'shadow',
            ground: '#3f4459',
            groundAlt: '#363b4d',
            groundSpeck: '#616b8a',
            wall: '#1d2130',
            wallTop: '#2f3547',
            wallFace: '#080b13',
            wallLine: '#000000',
            groundShadow: 'rgba(0,0,0,0.52)'
        },
        void: {
            name: 'void',
            ground: '#2b2542',
            groundAlt: '#221d34',
            groundSpeck: '#5a4880',
            wall: '#0e0b16',
            wallTop: '#2c2447',
            wallFace: '#030206',
            wallLine: '#000000',
            groundShadow: 'rgba(0,0,0,0.6)'
        },
        stone: {
            name: 'stone',
            ground: '#6c7180',
            groundAlt: '#5f6472',
            groundSpeck: '#8b91a2',
            wall: '#414650',
            wallTop: '#5d636e',
            wallFace: '#232730',
            wallLine: '#141820',
            groundShadow: 'rgba(8,10,16,0.42)'
        }
    };

    const GROUND_TILE_SIZE = 64;

    /** Deterministic 32-bit hash so the same theme always builds the same tile. */
    function hashString(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    /** Small deterministic PRNG (mulberry32). */
    function makeRandom(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), 1 | t);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function parseHex(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function clamp255(v) {
        return v < 0 ? 0 : (v > 255 ? 255 : v | 0);
    }

    /**
     * Build a seamless ground tile for a theme.
     *
     * Seamless by construction: the per-pixel grain is independent per pixel,
     * and the larger soft patches are drawn with wrap-around copies so features
     * that cross an edge appear on the opposite edge.
     */
    function buildGroundTile(themeName, size) {
        const theme = get(themeName);
        const tileSize = size || GROUND_TILE_SIZE;

        const canvas = document.createElement('canvas');
        canvas.width = tileSize;
        canvas.height = tileSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const base = parseHex(theme.ground);
        const image = ctx.createImageData(tileSize, tileSize);
        const rand = makeRandom(hashString(themeName));
        const data = image.data;

        for (let i = 0; i < tileSize * tileSize; i++) {
            // Low-amplitude grain only: strong grain reads as static, not ground.
            const grain = (rand() - 0.5) * 7;
            data[i * 4] = clamp255(base.r + grain);
            data[i * 4 + 1] = clamp255(base.g + grain);
            data[i * 4 + 2] = clamp255(base.b + grain);
            data[i * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);

        // Soft darker patches for large-scale variation.
        const patchCount = 9;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = theme.groundAlt;
        for (let i = 0; i < patchCount; i++) {
            const x = rand() * tileSize;
            const y = rand() * tileSize;
            const r = 4 + rand() * 10;
            // Wrap-around copies keep the pattern continuous across seams.
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    ctx.beginPath();
                    ctx.arc(x + ox * tileSize, y + oy * tileSize, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Sparse 1px specks.
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = theme.groundSpeck;
        for (let i = 0; i < 40; i++) {
            ctx.fillRect(Math.floor(rand() * tileSize), Math.floor(rand() * tileSize), 1, 1);
        }

        ctx.globalAlpha = 1;
        return canvas;
    }

    /**
     * Build a seamless wall-block texture for a theme.
     *
     * Wall blocks are merged rectangles that can be hundreds of pixels wide,
     * so a solid fill reads as a flat slab. This texture is anchored to world
     * coordinates by the renderer, so the grain does not swim when the camera
     * moves and adjacent rectangles stay visually continuous.
     */
    function buildWallTile(themeName, size) {
        const theme = get(themeName);
        const tileSize = size || GROUND_TILE_SIZE;

        const canvas = document.createElement('canvas');
        canvas.width = tileSize;
        canvas.height = tileSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const base = parseHex(theme.wall);
        const image = ctx.createImageData(tileSize, tileSize);
        const rand = makeRandom(hashString(themeName + ':wall'));
        const data = image.data;

        for (let i = 0; i < tileSize * tileSize; i++) {
            const grain = (rand() - 0.5) * 9;
            data[i * 4] = clamp255(base.r + grain);
            data[i * 4 + 1] = clamp255(base.g + grain);
            data[i * 4 + 2] = clamp255(base.b + grain);
            data[i * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);

        // Darker pits so large blocks do not look like flat vinyl.
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = theme.wallFace;
        for (let i = 0; i < 8; i++) {
            const x = rand() * tileSize;
            const y = rand() * tileSize;
            const r = 2 + rand() * 5;
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    ctx.beginPath();
                    ctx.arc(x + ox * tileSize, y + oy * tileSize, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // A few lighter chips.
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = theme.wallTop;
        for (let i = 0; i < 40; i++) {
            ctx.fillRect(Math.floor(rand() * tileSize), Math.floor(rand() * tileSize), 1, 1);
        }

        ctx.globalAlpha = 1;
        return canvas;
    }

    function get(name) {
        return THEMES[name] || THEMES.stone;
    }

    function has(name) {
        return Object.prototype.hasOwnProperty.call(THEMES, name);
    }

    return {
        THEMES,
        GROUND_TILE_SIZE,
        get,
        has,
        buildGroundTile,
        buildWallTile,
        names: () => Object.keys(THEMES)
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerrainThemes;
} else {
    window.TerrainThemes = TerrainThemes;
}
