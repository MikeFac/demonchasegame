# 3D Combat Prototype — Plan

Implementation branch: `low-poly-3d`

Technical contract: `docs/plans/LOW_POLY_3D_TECHNICAL_DESIGN.md`

Current milestone: procedural Three.js vertical slice first, generated GLB
assets second. The procedural fallback lets camera, combat readability, and
mobile performance be measured before committing to a full asset batch.

## Goal
One playable combat level in stylized low-poly 3D (Three.js, WebGL) running on a mid-range Android phone, using an AI-generated asset pipeline. Validates the AI-art workflow and mobile performance before any production commitment.

## Decisions locked
- **Visual target**: Retro/stylized low-poly (Sproggiwood / Moonlighter-tier).
- **Scope**: Combat (dungeon) view only. Overland map, menus, sermon viewer, votd mode stay 2D.
- **Platform**: Mobile-first. Mid-range Android target.
- **Phase**: Prototype first — validate before production commitment.
- **Monster rendering**: Low-poly 3D meshes (Mixamo-rigged), not billboards.
- **Canvas setup**: Two stacked canvases — WebGL below for 3D world, 2D canvas above for HUD/quiz/modals.

## Existing infrastructure you get for free
- **`viewMode` switch** (`game.js:1923` `getRendererClassForViewMode`) — already routes to `Renderer3D` when `viewMode==='3d'`. Repoint to the new `RendererThreeJS` class; 2D stays the default.
- **`drawGame(...)` contract** (`Renderer.js:49`) — 13-arg signature. The 3D renderer implements the same interface; everything downstream (HUD, quiz, modals, menus) keeps working.
- **Walls sent once** via `onWalls` (`game.js:4441`) as a flat boolean grid + wall list. Build Three.js wall meshes once, cache, reuse.
- **Per-frame data** arrives as plain objects: `gameState.players/monsters/bullets/healingPoints/collectibles`, local `player` (with client-side `viewAngle`, `isMoving`, `currentFrame`), `camera`, `screenShake`, `damageNumbers`, `deathParticles`.

## Files to write/modify

### 1. `src/client/RendererThreeJS.js` (new, ~600–900 lines)
Implements `drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake, damageNumbers, deathParticles, mouseX, mouseY)`.

- **Scene init** (once): perspective camera (~60° FOV), hemispheric light + one directional light. No real-time shadows on mobile — use baked AO or fake blob shadows. Fog for depth culling.
- **Wall geometry** (built on `onWalls`): one `InstancedMesh` of low-poly wall cubes per `terrainTheme`. Reuse existing palette (stone/earth/crystal) as low-sat PBR materials.
- **Floor**: one large plane with tiled AI-generated texture.
- **Player**: low-poly capsule + Mixamo-rigged mesh. Use `player.viewAngle` for facing. Health bar as small 3D plane above.
- **Monsters**: low-poly meshes (Mixamo-rigged). `freezeAura` → translucent sphere; `armorHits` → ring mesh; `isDashing` → motion trail; `isAttacked` → white flash material swap.
- **Bullets**: small glowing spheres or stretched quads. Requires server change — bullets currently broadcast only `{id,x,y,playerCode}` (`BulletManager.js:143-150`). Add `vx, vy` (or `angle`) so 3D renderer can orient them. ~5-line change.
- **Healing points / collectibles**: floating low-poly meshes (cross, shield) with slow spin animation.
- **Damage numbers / death particles**: keep as 2D overlay (project 3D world position → screen, draw on the 2D HUD canvas). They're UI, not world geometry.
- **Camera**: follow-player third-person. Position = `player.x/y` + offset rotated by `player.viewAngle`. Clamp to world bounds (`Constants.WORLD_WIDTH/HEIGHT = 3000`). Map `screenShake` to camera jitter.
- **HUD/quiz/modals**: do NOT touch. They're already drawn on the 2D canvas context — the second stacked canvas handles this. The 3D renderer just leaves the WebGL framebuffer composited behind.

### 2. `src/client/InputHandler3D.js` (modify existing)
Adjust click raycasting (screen → 3D world plane) for movement targets and monster clicks. Movement already sets `player.viewAngle` (`game.js:6561`) — keep that.

### 3. `src/shared/entities/BulletManager.js` (modify, ~5 lines)
Add `vx, vy` to the stripped projection at `BulletManager.js:143-150`. Client interpolates bullet direction; 3D renderer orients projectiles. No impact on 2D renderer (it ignores these fields).

### 4. `game.js` (modify `getRendererClassForViewMode` at line 1923)
Route `viewMode==='3d'` to `RendererThreeJS` instead of `Renderer3D`. Also route 2D HUD draws to the `hudCanvas` context when `viewMode==='3d'`.

### 5. `index.html`
- Add second `<canvas id="hudCanvas">` stacked above the WebGL canvas.
- Add `<script src="libs/three.min.js?v=1.0"></script>` before `Renderer3D.js` (line 1756). Vendor the file locally (don't CDN on mobile — offline matters).
- Add `<script src="src/client/RendererThreeJS.js?v=1.0"></script>` after `Renderer3D.js`.
- Bump `?v=` on `game.js`, `Renderer3D.js`, `InputHandler3D.js`, `BulletManager.js`.
- `./restart-server.sh`.

## AI asset pipeline (prototype quantity)

| Asset | Tool | Output | Cost est. |
|---|---|---|---|
| Floor textures (3 themes) | Flux/SDXL + upscaler | 512×512 PBR albedo + normal | ~$5 |
| Wall top/side textures | Flux/SDXL | 512×512 seamless | ~$5 |
| Demon meshes (3 types) | Meshy / Tripo3D → Blender cleanup → Mixamo auto-rig + stock animations (idle, walk, hit, death) | .glb, <5k tris each | ~$15 |
| Player mesh | same pipeline, one model | .glb | ~$5 |
| Low-poly dungeon props (torches, barrels, rubble) | Meshy / Tripo3D | .glb, <2k tris each, merged into one InstancedMesh | ~$15 |
| Skybox / ambient | Blockade Labs | equirectangular HDR | ~$10 |
| Audio | existing assets | reuse | $0 |

**Total: ~$50 in API credits.** The real cost is time cleaning up topology in Blender and enforcing a consistent art style (AI gives you assets, not cohesion). Pick one art-director reference image (e.g. *Sproggiwood* or *Moonlighter*) and prompt everything against it. Expect to iterate prompts 3–5× per asset.

## Mobile performance budget (mid-range Android, WebGL2)
- **Triangle budget**: <150k per frame. InstancedMesh for walls; <5k tris for all monsters combined.
- **Draw calls**: <100. Merge static props; instancing for walls.
- **Textures**: 2048×2048 atlas max; compress to WebGL2-supported formats (ASTC if available, else ETC2).
- **Lighting**: 1 directional + hemisphere only. **No real-time shadows** (kill mobile GPUs). Use baked blob shadows (a dark circle texture under each entity).
- **Post-processing**: none on mobile. No bloom, no SSAO. If needed, a cheap fog-only pass.
- **Resolution**: render at 0.75× device pixel ratio, upscale. Cap canvas at 800×600 internal.
- **Target**: 30fps on Snapdragon 6xx, 60fps on 8xx.

## Scope cuts for the prototype (explicit)
- **One combat level only** (level 1, `terrainTheme: 'stone'`).
- **3 demon types** rendered (Fear, Doubt, Condemnation) — enough to validate the pipeline.
- **No overland/menu/sermon/votd 3D.** Those stay 2D.
- **No multiplayer 3D validation** — solo only for v1. (Multiplayer should work since rendering is client-local, but not tested in prototype.)
- **No sound changes** — reuse existing audio.

## Verification
- `node test/game-integration-test.js` still passes (server logic untouched except bullet broadcast).
- Manual: load `?viewMode=3d`, play level 1 to victory, confirm quiz UI and HUD still draw on top via the 2D overlay canvas.
- Chrome DevTools Performance trace on mid-range Android (via remote debug) — confirm <100 draw calls, 30fps+.
- Lighthouse / WebGL inspector: confirm no post-processing passes, texture memory <64MB.

## Risks / unknowns to surface during prototype
1. **Canvas compositing**: Two stacked canvases is the chosen approach. WebGL canvas below, 2D HUD canvas above. Small index.html change; game.js routes 2D HUD draws to the `hudCanvas` context when `viewMode==='3d'`.
2. **AI art cohesion**: biggest risk. Six tools, six styles. Pick one art-director reference image and prompt everything against it. Expect to iterate prompts 3–5× per asset.
3. **Mixamo retarget quality**: AI-generated topology is often messy. May need manual cleanup in Blender before rigging. Budget time for this.
4. **Battery/thermal on mobile**: even low-poly WebGL drains fast. If 30fps sustained overheats a mid-range phone in 10 min, that's a hard product constraint — surface this before committing to production.
5. **Bullet orientation**: requires the 5-line server change to `BulletManager.js` broadcast. Without it, 3D bullets can't be oriented (must infer from frame deltas — janky).

## Build sessions (estimated 2–3)

### Session 1 — Renderer scaffolding + scene
- Two-canvas setup in index.html.
- Vendor `libs/three.min.js`.
- `RendererThreeJS.js` skeleton: scene, camera, lights, fog.
- Wall `InstancedMesh` built from `onWalls` data.
- Floor plane with placeholder texture.
- Third-person follow camera using `player.viewAngle`.
- `getRendererClassForViewMode` repointed.
- Verify: `?viewMode=3d` shows a 3D dungeon with walls, player moves, 2D HUD still draws on top.

### Session 2 — Entities
- Player low-poly mesh + facing + health bar.
- 3 demon meshes (placeholder geometry first, AI assets later) with auras/armor/dash/flash effects.
- Bullet spheres (with `vx, vy` from server change).
- Collectibles + healing points with spin animation.
- Blob shadows under all entities.
- `InputHandler3D` raycasting update.
- `BulletManager.js` broadcast change.
- Verify: full combat loop plays in 3D, quiz still works, victory triggers.

### Session 3 — AI assets + mobile tuning
- Run AI asset pipeline, integrate real meshes/textures.
- Blender cleanup + Mixamo rigging for demons + player.
- Mobile perf pass: draw-call merge, texture compression, DPR scaling.
- Chrome remote-debug trace on mid-range Android.
- Final verification: 30fps sustained, <100 draw calls, <64MB textures, full level-1 victory in 3D.

## Inventory reference (from codebase exploration)

### Combat-world `drawXXX` methods to replace (Renderer.js)
- `drawWalls` — `Renderer.js:1977` (reads `walls[].x/y/width/height/type`, `terrainTheme`)
- `drawPlayers` — `Renderer.js:1585` (iterates `gameState.players`)
- `drawPlayer` — `Renderer.js:1604` (reads `x, y, width, height, state, currentFrame, facingDirection, health, maxHealth, username`)
- `drawMonsters` — `Renderer.js:1763` (reads `demonType, x, y, width, height, freezeAura, armorHits, isDashing, isAttacked, health, maxHealth, showHealth, isBoss, bossLabel`)
- `drawHealingPoints` — `Renderer.js:2187`
- `drawCollectibles` — `Renderer.js:2209` (reads `type`: sword|belt|helmet|breastplate|sandals|shield)
- `drawBullets` — `Renderer.js:2440` (reads `x, y` only — needs `vx, vy`)
- `drawDamageNumbers` — `Renderer.js:2831` (keep as 2D overlay)
- `drawDeathParticles` — `Renderer.js:3222` (keep as 2D overlay)
- `drawMonsterTooltip` — `Renderer.js:2874`
- `drawCombatHint` — `Renderer.js:3156`

### Non-combat methods (do NOT port to 3D)
`drawTopBar`, `drawHUD`, `drawMenuPanel`, `drawCategoryPicker`, `drawInventoryHUD`, `displayBibleVerse`, `displayQuizOptions`, `displayClozeOptions`, `drawGameOverModal`, `drawMissionTaskCard`, `drawOnboardingGuide`, `drawFlashMessages`, `drawGoalsPanel`, `drawMissionLogPanel`, `drawStartHereSummaryModal`, `drawIntroMissionPitchModal`, `drawStoryPauseOverlay`, `drawQuestHubOverlay`, `drawSpeedPrompt`, `drawLoadingScreen`, `drawDailyChallenge`, `drawVerseCounter`, `drawMessages`, `drawFrozenIndicator`, `drawHamburgerButton`, `drawLearnVersesButton`, `drawSpeedControl`, `drawVerseTestButton`, `OverlandRenderer`, `ReviewMode`, `SermonViewer`, `VotdLearningMode`, `VotdTestMode`, `VotdMenuOverlay`.

### Game loop call site
- `gameLoop(generation)` — `game.js:6057`
- Combat branch (`gameMode === 'game'`) — `game.js:6164`
- `drawGame(...)` call — `game.js:6329`
- Camera compute — `game.js:6647-6652` (clamp to `WORLD_WIDTH/HEIGHT = 3000`)
- Screen shake — `game.js:2154`, applied via `ctx.translate` in `Renderer.drawGame` (`Renderer.js:67-70`)

### Wall data structure
- `WallGrid(grid, rows, cols, cellSize)` — `WallGrid.js:6`
- `grid[row][col]` booleans; `cellSize` default 25 (`Constants.CELL_SIZE`)
- Sent once via `'walls'` socket event → `clientWalls` array + `clientWallGrid`
- Each wall: `{ x, y, width, height, type }` (type is cosmetic 0–15)

### Level config (LevelConfig.js)
- Per-level: `qualities`, `monsters`, `boss`, `monsterDamageFactor`, `playerSpeed`, `monsterSpeed`, `spawnRate`, `maxMonsters`, `monstersToKill`, `maxHealingPoints`, `terrainTheme`
- Arena size: `Constants.WORLD_WIDTH/WORLD_HEIGHT = 3000`
- Wall layout: from map generator (style in room/game config)

### Per-entity broadcast state
- **Monsters**: `id, x, y, width, height, behaviorType, demonType, health, maxHealth, showHealth, isAttacked, armorHits, freezeAura, isDashing, isBoss, bossLabel` (no facing/angle — omnidirectional)
- **Players**: `x, y, width, height, health, maxHealth, code, color, username, xp, score, level, ammo, state, canAttack, currentCombatCategory` + client-only `isMoving, currentFrame, frameTimer, facingDirection, viewAngle`
- **Bullets**: `id, x, y, playerCode` ONLY (needs `vx, vy` added)

### Script tag order in index.html (insertion points)
- Three.js: insert before `Renderer3D.js` (line 1756)
- `RendererThreeJS.js`: insert after `Renderer3D.js` (line 1756)
- `hudCanvas`: add near `<canvas id="gameCanvas">` (line 1672)
- Cache-busting: bump `?v=` on `game.js`, `Renderer3D.js`, `InputHandler3D.js`, `BulletManager.js`

### Combat-relevant constants (Constants.js)
- `WORLD_WIDTH/HEIGHT: 3000`, `CELL_SIZE: 25`
- `CANVAS_WIDTH: 400`, `CANVAS_HEIGHT: 600`
- `MONSTER_WIDTH/HEIGHT: 48`, `PLAYER_WIDTH/HEIGHT: 48`, `BULLET_RADIUS: 4`
- `QUALITY_LINE_HEIGHT: 45`, `BUTTON_HEIGHT: 21` (playable area top = 66px)
- `FREEZE_AURA_RADIUS: 150`, `BOSS_SIZE_MULTIPLIER: 1.5`
- Wall/floor colors hardcoded in `Renderer.drawWalls` palette (`Renderer.js:1988`): stone/earth/crystal
