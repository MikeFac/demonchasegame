# Simple 3D Mode Implementation Plan

## Purpose

Add an optional mobile-friendly `3d` presentation mode to VerseBattles without disturbing the current 2D gameplay modes.

This mode is intended to make the game feel more immersive and tense, not to turn VerseBattles into a full FPS. The implementation should reuse the existing game engine, networking, missions, quiz flow, demon behaviors, and progression systems.

## Design Goals

- Keep the current 2D mode as the default and fully intact.
- Add 3D as an explicit, optional client mode.
- Reuse shared gameplay logic wherever possible.
- Support mobile-first controls.
- Keep rendering simple enough for phones.
- Preserve readability for quizzes and combat state.

## Non-Goals

- Full free-look first-person shooter controls
- Detailed 3D models or high-end graphics
- Dynamic shadows or advanced lighting
- Rewriting the game engine
- Replacing the existing 2D renderer or input handler

## High-Level Approach

The safe architecture is:

1. Keep one shared game engine and state model.
2. Add a new renderer and input handler for 3D mode.
3. Select the renderer/input pair once during game startup.
4. Avoid scattering `if (viewMode === '3d')` logic throughout the current 2D code.

## Proposed Client Structure

Existing modules remain the 2D path:

- `src/client/Renderer.js`
- `src/client/InputHandler.js`

New additive modules for 3D mode:

- `src/client/Renderer3D.js`
- `src/client/InputHandler3D.js`
- `src/client/HudRenderer3D.js` if the HUD needs a separate layout
- `src/client/ViewModeSelector.js` if startup selection needs its own abstraction

Shared systems that should remain reused:

- `src/shared/GameEngine.js`
- shared entity managers
- shared collision, bullets, monsters, and damage
- networking code
- quiz logic
- mission/world loading

## Startup Integration

### New config field

Add `viewMode` with allowed values:

- `2d` (default)
- `3d`

Possible sources:

- local storage preference
- settings toggle
- URL flag for testing
- device-specific default later if desired

### Initialization rule

Startup should choose the renderer/input pair once:

- `viewMode === '2d'` -> current renderer + current input handler
- `viewMode === '3d'` -> `Renderer3D` + `InputHandler3D`

This should happen near game initialization, not inside many downstream systems.

## Shared Data Contract for 3D Mode

The 3D client should consume existing game state with minimal new coupling.

### Data needed by `Renderer3D`

- player position
- player facing direction
- wall rectangles / map geometry
- monsters with type, position, size, hp, and behavior state where relevant
- bullets/projectiles
- pickups/items
- exits/objectives/doors
- damage and hit feedback events

### Data needed by `InputHandler3D`

- player current facing angle
- whether quiz overlays or menus are blocking movement
- whether player is alive / allowed to move / allowed to shoot

### Likely shared additions

The engine may need a clean way to expose or preserve:

- player yaw / facing angle
- stable wall geometry access
- monster home positions for `guard`

These additions should be generic enough to be useful to both 2D and 3D modes.

## 3D Rendering Model

## Visual Style

Keep visuals intentionally simple:

- flat or lightly shaded floor and ceiling
- extruded walls from current wall data
- billboard demons facing the camera
- billboard pickups/effects
- simple weapon/projectile visuals
- lightweight damage flash and hit indicators

The result should look more like a stylized dungeon crawler than a modern PC shooter.

## Camera Model

- fixed camera height
- yaw only
- no pitch / no look up-down
- optional slight screen bob later

## Movement Model

Initial 3D movement should be intentionally constrained:

- rotate left
- rotate right
- move forward
- optional move backward later

This keeps controls viable on phones and matches the desired atmosphere.

## Turning Behavior

Discrete turning is the preferred first implementation.

- one tap left = rotate `-30°`
- one tap right = rotate `+30°`

Rationale:

- mobile-friendly
- readable
- less motion sickness than free-look
- closer to dungeon-crawler navigation
- good fit for simplified combat

Optional later enhancement:

- holding a turn button repeats step rotation at a controlled interval

## Combat in 3D Mode

The gameplay rules should remain shared, but the presentation may be simplified.

### Recommended behavior

- retain the same bullet/damage systems
- use forward-facing firing from the player
- consider a mild aim assist or frontal hit cone if targeting feels awkward on mobile

### Must preserve

- affinity damage
- bullet hit events
- monster hp and death
- monster behaviors including `wander`, `chaser`, and `guard`

## Monster Representation

### Initial approach

Render demons as camera-facing billboards using existing monster art where possible.

Advantages:

- much cheaper than 3D models
- lower memory and render cost on phones
- fast path to prototype
- easy to keep demon identity readable

### Behavior compatibility

All current monster logic stays shared.

Special attention:

- `guard` demons should feel territory-based in 3D
- return-to-post behavior should remain visible and readable

## Mobile Input Design

## Controls

Initial mobile layout:

- left rotate button
- right rotate button
- forward button
- large fire button or auto-fire
- pause/menu button

Optional later:

- back button
- interact button
- hold-to-turn repeat

## Control Rules

- controls must be large and thumb-friendly
- quiz overlays must suspend movement cleanly
- combat UI and quiz UI must not visually conflict
- controls should remain legible in portrait decision flow and landscape gameplay if both are supported

## HUD and Overlay Behavior

The 3D mode should preserve the information players currently need:

- hp
- ammo
- active category / affinity context
- quiz prompts
- level progress

Possible implementation:

- reuse existing HUD state
- render it differently for 3D mode if needed

If the current HUD is too tied to 2D layout assumptions, create a separate `HudRenderer3D`.

## Performance Constraints

The 3D mode must be designed around mobile limitations from the start.

### Guardrails

- low wall polygon count
- demons as billboards, not full models
- minimal transparent effects
- low-cost lighting
- cap visual effects count
- cap far visibility / draw distance if needed

### Fallback behavior

If performance is poor:

- allow users to switch back to 2D
- optionally auto-disable 3D on weak devices later

## Compatibility With Current Modes

This is the primary architectural constraint.

### Rules to avoid regressions

1. Do not rewrite the current renderer.
2. Do not rewrite the current input handler.
3. Do not branch deep inside many existing rendering methods.
4. Select mode early, then delegate to dedicated modules.
5. Keep shared game logic renderer-agnostic.

### Acceptable changes to current code

- small startup hook to select `viewMode`
- small shared state additions if truly needed by both modes
- minimal shared utilities for geometry/state access

## Rollout Plan

## Phase 1: Infrastructure

- add `viewMode` config
- add startup selection hook
- scaffold `Renderer3D.js`
- scaffold `InputHandler3D.js`

## Phase 2: Prototype Renderer

- render floor/ceiling
- render walls from existing geometry
- basic player camera
- no monsters yet

Success criteria:

- user can enter a map and see a stable 3D corridor view

## Phase 3: Prototype Controls

- tap left/right rotates `30°`
- hold forward moves player
- collisions still work

Success criteria:

- user can navigate a map on mobile without breaking shared movement logic

## Phase 4: Combat Entities

- render demons as billboards
- render bullets/projectiles
- show hit feedback
- show pickups

Success criteria:

- player can move, shoot, and kill demons in 3D mode

## Phase 5: HUD and Quiz Compatibility

- adapt or replace HUD layout
- ensure quiz prompts remain readable
- ensure menus/pause/help screens still work

Success criteria:

- full basic solo game loop works end-to-end

## Phase 6: Polish and Safety

- optimize mobile performance
- improve visibility/readability
- add settings toggle for 3D mode
- keep 2D as default

## Testing Strategy

### Unit / integration focus

- startup selects correct renderer/input pair
- 2D mode still initializes exactly as before
- 3D mode reads shared game state correctly
- turning by `30°` updates player yaw correctly
- collisions remain consistent

### Manual focus

- mobile usability
- quiz interruption/resume flow
- monster readability in 3D
- performance on real phones
- no regressions in existing 2D mode

## Risks

### Risk: current map data is too 2D-specific

Mitigation:

- add a geometry adapter instead of changing map generation format broadly

### Risk: mobile controls feel clumsy

Mitigation:

- use discrete turning
- keep movement simple
- allow aim assist if needed

### Risk: 3D mode hurts existing code quality

Mitigation:

- isolate in separate modules
- no invasive renderer branching

### Risk: phones overheat or perform poorly

Mitigation:

- keep graphics minimal
- use billboards
- add fallback to 2D

## Recommended First Deliverable

The first implementation milestone should be:

- optional `viewMode=3d`
- simple wall rendering
- `30°` left/right step turning
- forward movement
- no monsters yet or only one billboard monster for proof of concept

That milestone is enough to answer the important product question:

**Does a simple 3D presentation add atmosphere and tension without damaging usability?**

## Summary

This feature should be built as an additive client mode, not a fork and not a rewrite.

The safest path is:

1. keep one engine
2. add `Renderer3D`
3. add `InputHandler3D`
4. support discrete `30°` turns
5. keep 2D as the default and stable path

If this discipline is maintained, the 3D mode can be explored without disturbing the current game.
