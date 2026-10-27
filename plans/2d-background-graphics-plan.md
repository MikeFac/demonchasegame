# 2D Background Graphics — Plan

**Status**: Phase 0 and Phase 1 implemented on `feat/2d-backgrounds-phase1`
**Scope**: The 2D Classic view (`viewMode === '2d'`) combat world only
**Related**: `plans/graphics-update-plan.md` is the separate 3D prototype plan. This
document is independent — 2D stays the default view, and every phase here is
additive to the existing renderer. Nothing in this plan blocks or depends on 3D.

> **Implementation note (this branch).** Phase 0 and Phase 1 are done — see §13.
> Three things were pulled forward from later phases because Phase 1 could not be
> delivered without them; they are listed as deviations in §13.3. Phases 2–6 are
> unchanged and still unstarted.

---

## 1. Problem

Players report that the graphics look poor. The sprites are not the problem —
player and monster art is crisp and readable. **The world layer is the problem**:
the thing behind and around the player.

The most common failure mode is that the game reads as *unfinished* rather than
*simple*. That is a fixable rendering problem, not a talent problem, and most of
it can be fixed without commissioning any new art.

## 2. Observed state (evidence)

Measured from the running build and the current source:

| Observation | Value |
|---|---|
| Walkable ground drawn | **Nothing.** Canvas is cleared to transparent and the page's CSS `radial-gradient(#6a7a8e → #4a5a6e)` shows through |
| Distinct ground tiles used | **1** — tile index `0` of `terrain256.png` |
| Distinct wall/obstacle tiles used | **1** (same tile, plus a per-cell alpha tint) |
| Wall cells iterated per frame | **~11,700** on `classic`, **~12,500** on `narrow` (120×120 grid); ~2,200 on `city`, ~1,200 on `open` |
| Wall cells actually on screen | **~250–340** (400×394 px playfield ÷ 25 px cells) |
| Wasted work | **~40× overdraw** on the default map style, every frame |
| Level themes visually distinct | **0 of 5** — `terrainTheme` is ignored once tiles load |
| Prop placement | 2% random chance per cell, no de-duplication, no clustering |
| Sub-pixel smoothing | `imageSmoothingEnabled` never disabled → 32 px tiles bilinear-scaled into 25 px cells |

What the player sees: grey-blue void, pale-green squares with white borders
arranged in a graph-paper grid, and the occasional 100×100 building pasted on top
of a 25 px cell grid at random.

## 3. Root causes

**R1 — There is no floor.**
`Viewport.clear()` uses `clearRect` ([Viewport.js:88-104](../src/client/Viewport.js#L88-L104)),
so the canvas is transparent and the body gradient
([index.html:40-44](../index.html#L40-L44)) becomes the ground. This is the single
largest contributor to the "poor graphics" impression. There is nothing to look at.

**R2 — The visual language is inverted.**
`drawWalls` paints grass on every *collision* cell and leaves *walkable* cells
empty ([Renderer.js:2233-2441](../src/client/Renderer.js#L2233-L2441)). So the space
you can walk on is nothing, and the space that blocks you is grass. A player cannot
read the level geometry from the art.

**R3 — One tile, repeated per cell, with visible seams.**
Every wall cell draws the same source tile at 25×25 px with smoothing on
([Renderer.js:2274-2283](../src/client/Renderer.js#L2274-L2283)). Tile 0 already has a
light border baked into it, so a 2×2 cluster of cells reads as a 50 px patch with a
white cross through it. Then a 15–25% `overlay` tint per cell
([Renderer.js:2285-2312](../src/client/Renderer.js#L2285-L2312)) adds the patchwork
variation. Result: graph paper.

**R4 — Prop placement is noise, not composition.**
Buildings are drawn at 2% per cell
([Renderer.js:2377-2398](../src/client/Renderer.js#L2377-L2398)) at 100×100 px centered on
a 25 px cell, with no overlap check. Two neighbouring cells can both win the dice and
draw overlapping houses. Adjacent buildings can also cover corridor cells. The atlas
itself mixes a cottage, a suburban house, a church, a skyscraper and a factory
(`images/terrains/houses-and-buildings400.png`), so any two neighbours clash.

**R5 — The five level themes are dead code.**
`LevelConfig` defines `city`, `earth`, `crystal`, `shadow`, `void`
([LevelConfig.js:101-162](../src/shared/LevelConfig.js#L101-L162)), but the `themes`
palette in `drawWalls` only has `stone`, `earth`, `crystal`
([Renderer.js:2244-2249](../src/client/Renderer.js#L2244-L2249)). Level 1 is `city`,
levels 4 and 5 are `shadow`/`void` — all three silently fall back to `stone`. And
the whole palette is only used by the fallback path that never runs while tiles are
loaded. Net effect: five chapters, one look.

**R6 — No depth cues.**
No contact shadows, no wall caps or side faces, no ambient occlusion where walls meet
ground, no parallax, no world-space lighting, no vignette. Entities float above a
flat plane.

**R7 — There is no performance headroom to fix any of the above.**
Iterating ~11,700 cells per frame to draw ~300 means the current approach cannot
afford a richer ground, richer props, or a lighting pass. Perf has to be addressed
*before* art, or the art will make the game stutter on mid-range phones.

## 4. Gating decision: art direction

This must be settled before Phase 3, because it determines which tileset to build
or buy. Three viable options:

| Option | What it means | Cost | Verdict |
|---|---|---|---|
| **A — Strict pixel-art** | One pack, fixed 16 or 32 px grid, 2× integer upscale, `imageSmoothingEnabled = false`. Re-cut the player/monster sprites minimally to match. | Low–medium | **Recommended.** Matches your existing sprites, cheapest to source, crisp at 400 px width, and the most forgiving for procedural theme tinting |
| **B — Fully illustrated** | Keep the painted `houses-and-buildings400.png` look; commission ground/edge/prop tiles to match. Upgrade sprites to match instead. | High | Only if you want a storybook feel and can pay for a coherent set |
| **C — Hybrid (status quo)** | Painted buildings + pixel sprites + flat tiles | — | **Reject.** This is the current state and it is the core reason it reads as cheap |

Recommendation: **A**. It also gives the cleanest path to themed variants, because
recolouring a disciplined pixel palette per chapter is a palette-swap operation,
while recolouring painted art generally needs a repaint.

## 5. Target render pipeline

Layered, back to front, all clipped to the playfield rect
(`PLAYABLE_TOP = 69` to `Viewport.height - ANSWER_SECTION_HEIGHT - 120`):

```
0  Parallax backdrop        (Phase 4, optional per theme)
1  Ground base              per-theme colour + noise/dither pattern
2  Ground decals            paths, dirt, sand, water, cracks
3  Wall/obstacle layer      merged rects, autotiled cap + side face
4  Contact shadows          blurred ellipse under every solid entity
5  Entities                 players, monsters, items, props
6  Foreground silhouettes   parallax 1.15–1.3, sparse
7  Lighting overlay         multiply pass: ambient + player light
8  Ambient particles        dust, embers, fireflies, rain
9  HUD                      unchanged — do not touch in this plan
```

Every phase below is incremental progress on this stack. No phase requires a
server change: `clientWallGrid` already holds the full `grid[r][c]` boolean map on
the client ([game.js:4798-4808](../game.js#L4798-L4808)), so floor, decals and
autotiling can all be derived locally.

## 6. Phases

### Phase 0 — Baseline and instrumentation (0.5 day)

- Capture reference screenshots of all five levels in 2D, today, as the "before" set.
- Add an opt-in perf overlay (`?perf=1`): frame time, wall cells drawn vs culled,
  draw calls per layer. Keep it behind the flag.
- Decide the art direction question in §4.

**Acceptance**: a repeatable way to say "this got better" and "this got slower".

---

### Phase 1 — Ground and readability, no new art (1–1.5 days)

The biggest visible delta per unit of work. Ships without a single new asset.

| # | Task | Touchpoint |
|---|---|---|
| 1.1 | Fill the playfield with a per-theme ground base before walls. Kills the see-through void. | `Renderer.drawGame`, new `drawGround` |
| 1.2 | Derive walkable cells from `clientWallGrid.grid` and paint the floor, rather than painting grass on obstacles | `Renderer`, pass `clientWallGrid` into `drawGame` |
| 1.3 | Disable smoothing for tiles; round all tile destinations to integers | `Renderer` constructor / `drawWalls` |
| 1.4 | Merge horizontal runs of wall cells into single rects; merge vertical runs of equal width | new `RenderCulling`/`WallRuns` helper |
| 1.5 | Cull everything outside `camera.x/y ± Viewport` before drawing | same helper |
| 1.6 | Contact shadows under player, monsters, items, healing points, wall footprints | new `drawContactShadow` |
| 1.7 | Replace the per-cell `overlay` tint with a stable per-rect variation so patches stop flickering | `drawWalls` |

**Acceptance**
- No page gradient visible inside the playfield.
- No white seams between adjacent tiles at 1× and 2× DPR.
- Wall cells iterated per frame ≤ 400 (from ~11,470).
- The player can tell walkable from blocked without collision feedback.
- Frame time unchanged or better on a mid-range Android.

---

### Phase 2 — Tileset coherence and autotiling (2–3 days)

| # | Task |
|---|---|
| 2.1 | Replace `terrain256.png` with a single coherent ground set: 3–4 ground variants + 2–3 transition tiles, in one palette |
| 2.2 | Build an 8-bit neighbour-mask autotiler (N/NE/E/SE/S/SW/W/NW → 47 blob cases) for wall edges and corners |
| 2.3 | Give walls a "cap + side face" treatment (lighter top, darker 6–8 px face below) so they read as solid objects, not painted floor |
| 2.4 | Remove the painted-building pass from `drawWalls`; props move to a separate, rule-based layer (Phase 5) |
| 2.5 | Verify the autotiler against all five map styles (`classic`, `narrow`, `labyrinth`, `open`, `city`) |

**Acceptance**: no orphaned edges, no doubled corners, no tile popping as the camera
moves. Walls read as walls in a still screenshot.

---

### Phase 3 — Themes (1 day)

| # | Task |
|---|---|
| 3.1 | Add `src/client/TerrainThemes.js` with all five themes (`city`, `earth`, `crystal`, `shadow`, `void`), each defining ground, ground variant, cap, face, accent, shadow tint, ambient light, and particle type |
| 3.2 | Wire `terrainTheme` through the 2D path (it already arrives in `gameState`) |
| 3.3 | Add a theme-aware fallback so a missing theme never silently degrades to `stone` |
| 3.4 | Load `TerrainThemes.js` before `Renderer.js` in `index.html` and bump its `?v=` |

Proposed starting values (to be tuned against real art):

```js
city:    { ground:'#8b8578', cap:'#6f6a60', face:'#4a463f', accent:'#c9b98d' }
earth:   { ground:'#6b5a44', cap:'#57462f', face:'#3a2d1d', accent:'#a3875c' }
crystal: { ground:'#4a3f6b', cap:'#362c52', face:'#241c38', accent:'#8f7fd4' }
shadow:  { ground:'#2a2b3a', cap:'#1b1c28', face:'#101018', accent:'#6b7fa8' }
void:    { ground:'#14121c', cap:'#0b0a11', face:'#050409', accent:'#b04cff' }
```

**Acceptance**: all five levels are distinguishable from a single screenshot at
100% zoom.

---

### Phase 4 — Atmosphere (2–3 days)

The "premium" pass. Largest perceived-quality jump after Phase 1, and the phase most
likely to need tuning.

| # | Task |
|---|---|
| 4.1 | Lighting overlay: fill a half-resolution offscreen canvas with the theme ambient, erase a radial gradient around the player, composite `multiply` over the world layer. Do **not** use `ctx.filter = 'blur()'` on mobile |
| 4.2 | Ambient particles: pooled, capped at ~40, one particle type per theme (dust, embers, fireflies, rain, void motes). Gate on `VisualJuice.isEnabled()` so reduced-motion users get none |
| 4.3 | Parallax backdrop: reuse the existing painted `images/backgrounds/{forest,lake,mountains}.png` at 0.2–0.4 factor. They are already loaded for Review/VOTD |
| 4.4 | Foreground silhouettes at 1.15–1.3 parallax, sparse, semi-transparent, never covering quiz UI |
| 4.5 | Vignette + a themed playfield frame so the world does not end in a hard line against the HUD |
| 4.6 | Optional: 2-frame animated water/lava/void, sine-warped |

**Acceptance**: motion in the scene even when the player is standing still; no
frame-time regression beyond 1 ms on the target device; reduced-motion honoured.

---

### Phase 5 — Props and composition (2 days)

| # | Task |
|---|---|
| 5.1 | Rule-based prop placement: grid-snapped, no overlap, minimum spacing, clustered into coherent sites (a village, a courtyard, a shrine) instead of 2% per cell |
| 5.2 | Prop set per theme: 12–20 pieces (well, altar, palm, pillar, cart, rubble, fence, torch, tomb, cistern) |
| 5.3 | Draw props in y-sorted order with entities so the player can walk in front of and behind them |
| 5.4 | Retire `houses-and-buildings400.png` from the world layer entirely |

**Acceptance**: no overlapping props; no prop blocking a corridor; the player can
walk behind a prop and be correctly occluded.

---

### Phase 6 — Asset pack migration (optional, 2–4 days)

Only if Phase 1–5 with the current tilesheet is not enough.

| Candidate | License | Notes |
|---|---|---|
| Kenney *Tiny Dungeon* / *Tiny Town* | CC0 | 16 px; needs `CELL_SIZE` 25 → 32 and a collision regression pass |
| Cainos *Pixel Art Top Down – Basic* | Free, attribution | 16/32 px, clean autotiles, good props |
| *Sprout Lands* | Free, attribution | Soft palette, good for `earth` |
| LPC / Liberated Pixel Cup | CC-BY-SA 3.0 + GPL | **Avoid** unless share-alike is acceptable for app-store distribution |

**One pack only.** Mixing packs is the current problem; mixing new packs recreates
it. Bible-specific props (altar, scroll, oil lamp, cistern) will not exist in any
pack — budget a small commission or generation pass for ~15 hero props.

`CELL_SIZE` is used by collision, the server, map generators and mission layouts
([Constants.js:4](../src/shared/Constants.js#L4)). Changing it to 32 is a real
regression risk; treat it as a separate, tested change and only do it if the chosen
pack demands it.

## 7. Performance budget

Target: hold the current frame rate on a mid-range Android at DPR 2, 400 px logical
width.

| Layer | Budget |
|---|---|
| Ground fill + pattern | ≤ 2 draw ops |
| Wall layer | ≤ 400 `drawImage`, ≤ 2 ms |
| Contact shadows | 1 `drawImage` per solid entity |
| Lighting overlay | 1 fill + 1 gradient + 1 `drawImage` |
| Particles | ≤ 40 sprites |
| **World layer total** | **≤ 4 ms** |

Chunk caching (pre-render 512×512 world chunks, LRU, ~6×6 visible) is a fallback
only if the merged-rect approach is not fast enough. Do not build it up front.

## 8. Risks

1. **Theme tinting can make pixel art muddy.** Verify each palette against the final
   tileset before committing; a bad hue-shift can look worse than one neutral theme.
2. **Y-sorting props changes draw order** and can introduce new occlusion bugs around
   doors and tight corridors.
3. **Lighting overlay on low-end GPUs** — a full-playfield `multiply` composite every
   frame is not free; half resolution and a static vignette are the mitigations.
4. **`CELL_SIZE` change** ripples through collision, the server, and every mission
   layout. Highest-risk item in the plan; keep it isolated and last.
5. **Invisible scope creep into sprite rework** — this plan touches environment only.
   If the art-direction decision is A (pixel), a small sprite-matching pass may be
   needed, but that is a separate decision.
6. **Multiple view modes.** `Renderer3D`, `RendererThreeJS`, `WaveRenderer`,
   `ScriptureMazeRenderer` and `OverlandRenderer` all exist. Nothing here should
   touch them; verify none of them import the changed helpers.

## 9. Verification

Per CLAUDE.md, after every client-side change:

1. Bump `?v=` in `index.html` for each modified `.js`, including new files.
2. `./restart-server.sh` — never kill node processes manually.
3. Refresh only after the server has restarted.

Checks:

- `node test/game-integration-test.js` still passes (no server change expected).
- Solo mission, levels 1–5: each theme visually distinct; floor never shows the page
  gradient; no seams at DPR 1 and 2.
- All five map styles (`classic`, `narrow`, `labyrinth`, `open`, `city`) render
  without autotile errors.
- 2.5D and 3D view modes unchanged (`?viewMode=2.5d`, `?viewMode=3d`).
- `?perf=1` on a mid-range Android: world layer ≤ 4 ms, no frame-time regression
  versus the Phase 0 baseline.
- Reduced-motion OS setting: no particles, no parallax drift, no lighting pulse.
- Multiplayer room: walls still sync, no desync introduced.

## 10. Out of scope

- 3D and 2.5D rendering (see `plans/graphics-update-plan.md`)
- Overland map, menus, sermon viewer, VOTD, review mode
- Quiz / HUD / modal chrome (a separate, smaller "UI chrome" job)
- Gameplay, balance, spawning, collision behaviour
- Localisation
- Audio

## 11. Open questions

1. **Art direction**: A (strict pixel, recommended), B (illustrated), or C (status quo)?
2. **Target device floor**: which phone must hold 60 fps? This sets the budget in §7.
3. **Ambition**: "clean and readable" (Phases 1–3, ~4 days) or "atmospheric premium"
   (Phases 1–5, ~10 days)?
4. **Budget** for a paid asset pack or commissioned Bible-specific props?
5. **`CELL_SIZE`**: willing to pay the regression risk of 25 → 32 to use a standard
   32 px pack, or stay at 25 and rescale art?

## 12. Suggested first slice

Ship **Phase 0 + Phase 1 + Phase 3** as one change: ground fill, walkable floor,
seam-free merged walls, camera culling, contact shadows, and five theme palettes.

- Roughly 2 days.
- No new art assets.
- Removes most of the "poor graphics" impression.
- De-risks everything after it by proving the layout can be read from the art alone.

Then re-collect feedback on screenshots before spending money on Phase 2 and 6.

---

## 13. Implementation status — Phase 0 + Phase 1

Branch: `feat/2d-backgrounds-phase1`
Scope shipped: Phase 0 (baseline + instrumentation) and Phase 1 (ground and
readability) from §6. Phase 2 onward is not started.

### 13.1 What shipped

| Ref | Task | Where |
|---|---|---|
| Phase 0 | Perf overlay behind `?perf=1` (frame time, per-layer ms, wall rects drawn/total, wall cells, buildings, DPR) | `Renderer.drawPerfOverlay`, `_perf` counters in `Renderer.drawGame` |
| Phase 0 | Dev-only theme override behind `?theme=<name>` for capturing every palette | `Renderer.themeOverride` |
| Phase 0 | Repeatable before/after capture script | `scripts/capture-2d-themes.js` |
| Phase 0 | Before/after reference images | `docs/graphics/2d-phase1/` |
| 1.1 | Per-theme ground fill across the playfield (replaces the see-through canvas) | `Renderer.drawGround` |
| 1.2 | Walkable space is now the ground layer; walls are drawn *on top* of it (visual inversion fixed) | `Renderer.drawWalls` |
| 1.3 | Patterns anchored to world coordinates (no swimming), integer-stable | `drawGround` / `drawWalls` `ox`/`oy` |
| 1.4 | Wall cells merged into rectangles | `src/client/WallRects.js` |
| 1.5 | Rectangles culled to the camera before drawing | `WallRects.query` + binary search over `y` |
| 1.6 | Contact shadows under players, monsters, healing points, collectibles, NPCs; drop shadow under wall footprints | `Renderer.drawShadows`, `_stampShadow` |
| 1.7 | Stable per-cell shading — no per-rectangle toning, which would seam where rectangles meet | `drawWalls` pass 1 |
| 1.7b | Edge-aware shading: faces/outline painted only where the neighbouring cell is walkable (fixes internal seams, see §13.7) | `drawWalls` pass 2, `WallRects.exposedRuns` |
| — | Building placements cached once per level, overlap-free, camera-culled | `Renderer._buildBuildings` |
| — | Theme palette module | `src/client/TerrainThemes.js` |
| — | Unit tests for merging, culling, palettes | `test/wallrects-test.js` |

### 13.2 Measured results

| Metric | Before | After |
|---|---|---|
| Wall cells iterated per frame (`classic`) | ~11,700 | 0 (440 rectangles considered instead) |
| Wall draws per frame at 512×394 viewport (level 1) | ~11,700 cells | ~57 rectangles |
| Merged rectangles, level 1 | — | ~440 (from 2,188 cells) |
| Merged rectangles, `classic` | — | ~44 (from ~11,700 cells) |
| Distinct ground tiles | 1 | 5 procedural themes |
| Visually distinct level themes | 0 of 5 | 5 of 5 |
| Frame time (headless Chromium, 512×600) | not measured | 0.6–1.5 ms |
| Console errors | — | none |

Merging was verified to be exact — same covered area, no gaps, no overlaps — across
all five map generators (`classic`, `narrow`, `labyrinth`, `open`, `city`).

### 13.3 Deviations from the written plan

1. **`TerrainThemes.js` landed in Phase 1, not Phase 3.** Task 1.1 asks for a
   per-theme ground, which needs a palette. The module currently holds ground and
   wall colours only; Phase 3 adds cap/face accents, ambient light and particle
   type to the same file.
2. **The old grass tileset is no longer used for the world.** Analysis of
   `images/terrains/terrain256.png` showed every tile has a hard border baked in
   (bottom-to-top seam energy 58–143 across all 64 tiles), so no tile tiles
   seamlessly — which is what produced the graph-paper look. Phase 1 therefore uses
   procedural ground and wall textures generated at runtime, in the theme palette.
   They are seamless by construction and cost no download. Phase 2 replaces them
   with a real tileset.
3. **Building placement was fixed now rather than in Phase 5.** The old code
   rebuilt a `Set` of every wall for every candidate cell on every frame
   (effectively O(n²)) and allowed houses to overlap. Placements are now computed
   once per level, rejection-sampled against a 4×4 cell occupancy grid. Removing
   the painted buildings entirely is still Phase 2.4 / 5.4.
4. **`?theme=` was added in Phase 0.** Phase 0 asks for a five-theme "before" set,
   but the engineering question and the runtime both ignore `terrainTheme` today,
   so there was no way to produce one. It is a render-only override and does not
   touch game state.

### 13.4 Verified

- `node test/wallrects-test.js` — 30 passing.
- `node test/game-integration-test.js` — behaviour identical to `master` (the
  "monster is not moving" result in that script is pre-existing on `master` and
  unrelated to rendering).
- Manual, all five themes at 512×600 and 400×600: no page gradient inside the
  playfield, no seams, walkable vs blocked readable without collision feedback.
- `?perf=1` and default loads: no console errors.
- 2.5D and 3D paths untouched — `Renderer3D extends Renderer` but overrides
  `drawGame` without calling `super`, so the new layer code never runs there.

### 13.5 How to reproduce

```bash
./restart-server.sh
node test/wallrects-test.js
node scripts/capture-2d-themes.js after   # writes docs/graphics/2d-phase1/
```

Then open `http://localhost:3500/?perf=1` for the overlay, or
`http://localhost:3500/?theme=void` to preview a single palette.

### 13.7 Post-review fix — internal seams on large wall masses

**Reported:** level 2 showed unwanted horizontal lines between tiles.

**Cause.** Walls are drawn from merged rectangles, but every rectangle was painted
with a full-width lit top face, a shaded bottom face and a 1px outline on all four
sides, regardless of what was on the other side of that edge. A merged rectangle is
only an approximation of a wall mass: where two rectangles meet *inside* one solid
mass, there is no visible edge to shade. Level 1 (`city`, small isolated blocks)
never exposed this because every edge of every block is a real silhouette. Level 2
(`classic`) merges ~11,700 cells into ~40 large rectangles, so their shared interior
edges drew two faces and two outlines each — reading as horizontal shelf lines
across the wall mass.

**Fix.** Bodies are filled first with no toning at all (any per-rectangle tint shows
up as a seam). Shading is then painted per rectangle but only on the spans where the
neighbouring cell is walkable, using an occupancy set keyed on grid coordinates
(`Renderer._buildWallCellSet`, `WallRects.exposedRuns`). Per-rectangle random
lightening/darkening was dropped for the same reason: it produced faint tone steps
at rectangle boundaries.

**Evidence.** `docs/graphics/2d-phase1/level2-seams-before.png` and
`level2-seams-after.png` show the same `classic` + `earth` camera before and after;
the "before" image was produced by blanking the occupancy set, which restores the
previous unconditional painting.

**Testing.** `WallRects.exposedRuns` was extracted from the renderer so the run
coalescing is unit-testable; `node test/wallrects-test.js` now covers full,
partial, empty, trailing and shared-boundary runs (38 assertions).

**Cost.** The edge pass is bounded by the perimeter of the visible rectangles, not
their area: wall rendering measured 0.1 ms at 512×600 with 16 rectangles drawn.

### 13.8 New QA tool

`tools/terrain-preview.html?map=<style>&theme=<name>` renders only the world layer
for any map generator and theme, with camera sliders and no gameplay. It exists
because map/theme combinations like level 2's `classic` + `earth` are otherwise only
reachable by playing through a level, and because the death timer makes in-game
inspection unreliable. It loads the same `Renderer`, `TerrainThemes` and `WallRects`
as the game, so what it shows is what ships.

### 13.9 First-level density

**Reported:** level 1 feels flat next to level 2, and the order might be swapped so
the better-looking world opens the game.

**Measured cause.** It was not the theme. Prop placement assumed a 100px building on
a 100px solid footprint, but the city map's houses were 2x2 cells (50px), so
`_isSafeForBuilding` rejected almost every candidate:

| map style | wall cells | buildings placed (before) |
|---|---|---|
| city (level 1) | 2,124 | **8** |
| classic (level 2) | 11,722 | 156 |

Eight props in a 3000x3000 world meant level 1 was a regular grid of bare stone
blocks with nothing in it.

**Decision:** keep the level order and fix the density. Swapping would only move the
flat world to second place; the city map would still be the weakest world in the
game.

**Changes.**

1. **Plot-based placement.** Props are placed per solid square plot found from the
   wall grid, and scaled to that plot, instead of a fixed 100px sprite centred on a
   random cell. The sprite therefore always fits its footprint and never overhangs
   walkable ground (the old placement could).
2. **Density from exposure.** A plot with open ground on two or more sides is a
   standalone building and is placed at 92%; a plot embedded in a large wall mass
   stays at 35% so level 2's masses keep their organic spacing.
3. **City footprints enlarged to 4x4 cells (100px)**, with a one-cell courtyard
   between houses and the existing 4-cell streets. At 2x2 the 100px house art was
   drawn at 50% and read as tiles rather than buildings. This is a layout change for
   every map that uses `GridCity` (level 1 and the chapter 3 city mission).
4. **Covered plots render the prop, not the block.** Where a building exactly covers
   a wall rectangle, the block's body and edge shading are skipped so the prop is not
   framed by a stone plinth. The match includes width and height on purpose: on maps
   where large masses merge into one rectangle, a small plot can share that
   rectangle's origin, and matching on position alone blanked entire masses.
5. **Soft contact shadows** under buildings, from the same sprite used for entities.
   A hard shadow band read as a bar under each house.

**Result.**

| | before | after |
|---|---|---|
| buildings, city map | 8 | 212 |
| buildings, classic | 156 | 205 |
| city house footprint | 50px | 100px |

**Cache-busting fix.** `src/shared/map-generators/*.js` were loaded with no `?v=`
parameter, so the service worker kept serving the old `GridCity.js` after the change
— the game rendered the new placement against the old 2x2 map. All six generator
script tags now carry `?v=1.1`.

**Tests.** `node test/city-map-test.js` (8 assertions): 4x4 plots exist in quantity,
no 2x2 plots remain, a 48px player fits at the spawn, spawn does not collide, and the
world border is solid.

**Not changed.** Level order, difficulty, monsters and bosses are untouched. The
`open` map used by the chapter 0 starter mission is still sparse (7 props) — it is
mostly open ground with a few hollow structures, so plot-based placement has little
to attach to; that map needs its own composition pass.

### 13.6 Follow-ups this branch does not do

- Wall blocks are plain shaded rectangles; Phase 2 autotiling and Phase 3 lighting
  are what will make them read as architecture rather than blocks.
- The area below the playfield (verse text, quiz answers) still shows the page
  gradient. That is "UI chrome", explicitly out of scope in §10.
- `service-worker.js` precaches `/src/client/Renderer.js` without a query string.
  The script tag uses `?v=`, so the new file loads, but Phase 2 should add the new
  modules to the precache list.
