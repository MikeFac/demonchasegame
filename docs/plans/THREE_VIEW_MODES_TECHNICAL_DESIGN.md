# Three View Modes Technical Design

Status: core implementation complete on the `low-poly-3d` branch; real-phone
profiling and authored positional monster audio remain validation/polish gates.

## Implementation Checkpoint — 2026-08-17

Phases 1–5 and the automated portion of Phase 7 are implemented. The game now
has canonical `2d`, `third-person`, and `first-person` modes, legacy preference
migration, profile-specific Three.js cameras and controls, center-ray FPS
combat, wall-aware 2.5D aim assist, mode-correct WebGL recovery, and diagnostic
text state for every mode.

The first suspense pass is also active: first person has shorter fog, real wall
occlusion, no target-biased camera framing, no through-wall targeting, and no
local-player mesh obstructing the view. Authored positional monster sounds are
not yet included because the repository does not contain a suitable licensed
cue set; that work should be evaluated with real audio assets rather than an
unrelated placeholder sound.

Automated verification is provided by `npm run test:three-views`, with legacy
3D/runtime coverage in `npm run test:3d-runtime` and asset-budget validation in
`npm run validate:3d`. The remaining release gate is the ten-minute profile of
both mesh modes on a representative Android phone.

## Outcome

Offer three clearly different ways to play the same VerseBattles game:

1. **2D Classic** — the existing top-down Canvas game.
2. **2.5D Adventure** — the existing elevated, third-person low-poly Three.js
   presentation.
3. **3D First Person** — a true eye-level low-poly mode with mesh monsters,
   centered aiming, wall occlusion, and suspense-oriented presentation.

All three modes must use the same game state, missions, collision rules,
monster behavior, quiz flow, damage rules, networking, and progression. This is
a renderer, camera, input, and aiming split—not three separate games.

## Why Three Modes

The modes solve different player needs:

| Mode | Primary strength | Principal trade-off |
|---|---|---|
| 2D Classic | Clarity, accessibility, lowest device cost | Least immersive |
| 2.5D Adventure | Character visibility and spatial awareness | Walls reveal more of the encounter, reducing suspense |
| 3D First Person | Occlusion, scale, surprise, and presence | Aiming and navigation need more careful controls |

The current low-poly renderer is real 3D, but its elevated chase camera makes
it a 2.5D experience from the player's perspective. The new first-person mode
must reuse those real meshes. The existing software ray-cast `Renderer3D`,
which draws billboard monsters, is not the target first-person experience.

## Goals

- Preserve the existing 2D mode without visual or control regressions.
- Preserve the current low-poly chase-camera experience as 2.5D Adventure.
- Add a genuine eye-level first-person view using the same Three.js scene and
  GLB/procedural mesh assets as 2.5D.
- Make monsters disappear behind walls and require the player to face the
  target, creating suspense without expensive graphics.
- Keep continuous press-and-hold rotation.
- Keep quizzes, HUD, menus, mission state, and combat rules shared.
- Sustain the existing mid-range phone budgets.
- Ensure WebGL loss or restoration never changes the apparent camera mode.

## Non-Goals for the First Slice

- A separate FPS game engine or separate level format.
- Vertical level design, jumping, crouching, or physics-driven movement.
- Unrestricted look up/down. The current maps and combat are planar, so yaw-only
  aiming is the correct first implementation.
- Real-time shadows, multiple dynamic lights, post-processing, or high-resolution
  PBR assets.
- A detailed first-person weapon model. A crosshair, shot effect, and hit/miss
  feedback are enough for the first playable slice.
- Replacing server or shared monster AI.
- Shipping billboard monsters under the **3D First Person** label.

## Current Baseline

The branch already has the main technical ingredients:

- `Renderer` and `InputHandler` implement 2D Classic.
- `RendererThreeJS` renders low-poly walls, players, mesh monsters, pickups,
  animated GLB assets, and visual shot tracers.
- `RendererThreeJS._updateCamera()` currently implements the elevated chase
  camera and automatically biases its target toward a nearby monster.
- `InputHandler3D` already provides frame-rate-independent held rotation at 120
  degrees per second, forward movement, and fire input.
- `tryHandle3DFire()` currently selects the nearest monster inside a broad
  frontal cone. It does not use the screen crosshair or stop selection at a
  wall.
- `Renderer3D` is a software ray-cast renderer with billboard entities. It is a
  legacy/degraded renderer, despite its name.
- WebGL context recovery retains a cached frame and waits for a complete
  restored mesh frame before exposing the live canvas.

The safest implementation extends these boundaries instead of duplicating the
Three.js scene and entity synchronization code.

## Canonical Mode Model

Use descriptive internal identifiers rather than making `3d` mean two things:

| Canonical value | Menu label | Renderer | Camera profile |
|---|---|---|---|
| `2d` | 2D Classic | `Renderer` | top-down |
| `third-person` | 2.5D Adventure | `RendererThreeJS` | chase |
| `first-person` | 3D First Person | `RendererThreeJS` | eye-level |

A central immutable view-mode registry should contain the label key, renderer
family, camera profile, input profile, and capability requirement. Startup,
settings, the in-game menu, diagnostics, and tests must consult that registry
instead of repeating string comparisons.

### Compatibility and preference migration

`normalizeViewMode()` must accept legacy and test aliases:

| Input | Canonical result |
|---|---|
| `2d` | `2d` |
| `3d` | `third-person` |
| `2.5d` | `third-person` |
| `third-person` | `third-person` |
| `fps` | `first-person` |
| `first-person` | `first-person` |
| missing or unknown | `2d` |

Mapping the old `3d` preference to `third-person` preserves the experience a
returning player explicitly selected. Once loaded, write the canonical value
back to `preferredViewMode`. New URLs should use
`?viewMode=third-person` or `?viewMode=first-person`; old
`?viewMode=3d` links must continue to work.

The current binary in-game “switch view” action should become a three-choice
view picker. Selecting a different renderer profile may continue to reload the
page in the first implementation, because that gives clear ownership of WebGL
and input listeners and avoids hot-switch lifecycle bugs.

## Architecture

```text
Game state / missions / networking / quiz / combat consequences
                            |
                    View-mode registry
                   /          |          \
            2D Classic    2.5D Adventure   3D First Person
            Renderer      RendererThreeJS  RendererThreeJS
            InputHandler  3D chase profile FPS profile
```

### Renderer selection

`getRendererClassForViewMode()` should select only the renderer family. The
renderer instance must also receive the canonical mode or camera profile:

- `2d` creates `Renderer`.
- `third-person` creates `RendererThreeJS` with `cameraProfile: 'chase'`.
- `first-person` creates `RendererThreeJS` with
  `cameraProfile: 'first-person'`.

Do not create a second Three.js renderer class containing copies of world sync,
asset loading, mesh pools, context recovery, or diagnostics. Camera-specific
behavior belongs behind small profile methods in `RendererThreeJS`.

As a cleanup after the three modes are stable, `RendererThreeJS` should inherit
directly from `Renderer`, with shared HUD behavior extracted where needed.
Renaming or removing its current `Renderer3D` inheritance is not required for
the first slice and should not be combined with the camera change.

### Input selection

The input family also receives a profile:

- 2D retains the current click/touch movement behavior.
- 2.5D retains the controls players have already tested, including continuous
  held turning and its current forward behavior.
- First person uses continuous yaw, hold-to-move, and centered fire.

The input handler should expose mode-neutral movement intent:

```text
forward: -1..1
turn: -1..1 or accumulated yaw radians
fire: queued press count
lookDelta: optional yaw delta for mouse/touch drag
```

The main game loop remains responsible for applying movement through the
existing collision and game-speed rules.

## Camera Design

### 2.5D chase profile

Preserve the current behavior as the regression baseline:

- camera behind and above the player;
- player character visible;
- camera position may interpolate for smooth following;
- modest automatic monster framing remains allowed;
- existing field of view, fog, and recovery snapshot behavior remain intact.

Any refactor must first reproduce the current screenshot and camera diagnostics
before first-person behavior is added.

### First-person profile

Use the player's existing `viewAngle` as yaw:

- camera world position: `(player.x, eyeHeight, player.y)`;
- initial eye height: approximately 70–80% of the player mesh height, clamped to
  a stable configured value for procedural and authored player assets;
- look target: the camera position plus the planar forward vector;
- field of view: start at 68–70 degrees;
- near plane: small enough to avoid clipping nearby walls without exposing
  geometry behind the player;
- pitch: fixed at the horizon for the MVP;
- roll: always zero;
- camera position follows the collision position directly, without chase-camera
  interpolation that would create lag or wall clipping;
- head bob is off by default and, if added later, must be subtle and optional.

The local player's mesh is hidden only in first-person mode. Remote multiplayer
players remain visible. Hiding must be applied by player identity, not by
turning off the entire player mesh pool.

The current nearest-monster camera framing must be disabled in first-person.
The camera may never rotate or lean toward a target on the player's behalf.

### Crosshair and interface layer

Draw a small high-contrast crosshair at the center of the playable 3D viewport
on the existing 2D interface canvas. It must account for the top HUD and quiz
regions rather than blindly using the full canvas center.

Crosshair states may communicate:

- neutral aim;
- valid target;
- confirmed hit;
- blocked or miss feedback.

Do not permanently identify enemies through walls. A target state is allowed
only after the aim ray reaches a visible monster.

## First-Person Combat and Line of Sight

Changing only the camera would leave the existing broad-cone auto-targeting in
place and make shots feel dishonest. First-person therefore needs an explicit
aim resolver.

### Aim ray

For yaw-only levels, resolve the shot in the shared game plane:

1. Start at the player collision center.
2. Cast along `player.viewAngle` to the configured maximum range.
3. Find the nearest wall intersection using the current wall geometry or
   `WallGrid` adapter.
4. Intersect the same ray with living monster collision circles or boxes.
5. Choose the nearest monster only when its intersection is closer than the
   nearest wall.
6. Return a structured result: `monster`, `wall`, `miss`, distance, and world
   impact point.

This 2D gameplay-plane ray is deterministic, cheap, and consistent with the
existing collision map. A Three.js visual raycast must not become the authority
because rendered meshes and procedural fallbacks can have different shapes.

### Mode-specific aiming policy

- **2D Classic:** retain existing click/projectile combat unchanged.
- **2.5D Adventure:** retain the current frontal aim-assist cone initially, but
  add the same wall line-of-sight rejection so a concealed monster cannot be
  selected.
- **3D First Person:** use only the center aim ray. A small configurable monster
  collision radius is acceptable for phone usability, but do not search a
  separate wide cone after a miss.

All successful results continue through `handlePlayerAttack()` so affinity,
damage, hit reactions, death, mission progress, and networking behavior remain
shared. The resolver changes target acquisition, not combat consequences.

### Shot presentation

- Spawn the visual energy bolt from a point just below/right of the camera or
  from the player origin, but terminate it at the authoritative impact point.
- Show a short wall spark for a blocked shot and a subtle muzzle flash for a
  miss so every accepted fire input has readable feedback.
- Preserve the existing shot-tracer cap and automatic cleanup.
- A shot with no target should still consume the normal fire cooldown and play
  feedback; otherwise repeated misses feel like ignored input.

## Controls

### Desktop MVP

- `W` / Up: hold to move forward.
- `S` / Down: hold to move backward, subject to the same collision rules.
- `A` / Left and `D` / Right: hold for continuous yaw.
- `F` or Enter: fire.
- Mouse drag on the 3D play area: yaw; pointer lock can follow after the basic
  mode is stable.
- Escape: pause or release pointer lock before any menu action.

Strafing is not required in the MVP. Keeping A/D as turn controls matches the
tested phone-oriented control scheme and the planar dungeon design.

### Phone MVP

- Hold-forward and optional hold-back controls on the lower left.
- A large fire control on the right.
- Drag horizontally on an unobstructed right-side look zone to turn.
- Retain left/right hold buttons as an accessibility fallback.
- Releasing movement stops movement; first-person should not use an indefinite
  forward toggle by default.

Quiz, review, pause, game-over, and story overlays must clear held movement,
turn, drag, and fire state. Window blur, touch cancellation, and visibility
changes must do the same.

## Suspense Without Expensive Rendering

The suspense should come primarily from missing information, not darkness or
GPU-heavy effects:

- walls and doorways fully occlude monsters;
- no automatic camera framing, enemy arrows, or minimap in first person;
- shorter first-person fog distance than the elevated mode;
- monster idle sounds, footsteps, or growls audible before visual contact;
- stereo or HRTF panning based on relative monster direction where browser
  audio support permits it;
- distinct monster silhouettes, emissive eyes, hit flashes, and readable attack
  anticipation;
- sparse pools of light and baked/vertex color variation rather than dynamic
  shadows;
- brief proximity or damage vignette, never a permanent dark full-screen filter.

The scene must remain bright enough for phone use. Suspense comes from corners,
sound, timing, and scale—not from making navigation illegible.

## WebGL Capability and Recovery

Both mesh modes require Three.js/WebGL. Capability detection must remain cached
and must not create a probe per frame.

The user-facing fallback rules are:

- If WebGL cannot initialize, explain that the selected mesh mode is unavailable
  and offer 2D Classic. Do not silently show billboard monsters under either
  low-poly label.
- If a live WebGL context is temporarily lost, show the latest cached frame from
  the same camera profile and keep the HUD responsive.
- Keep the cached frame visible until one complete restored mesh frame has been
  rendered.
- Include canonical view mode and camera profile in the recovery snapshot
  signature so a first-person snapshot cannot appear in 2.5D or vice versa.

`Renderer3D` may remain temporarily as a legacy diagnostic/degraded renderer,
but it should not be selected as the normal fallback for the two public mesh
modes. This removes the previous risk of an apparent switch between an elevated
mesh view and a billboard first-person view.

## Performance and Asset Budgets

Both mesh modes share the limits in `LOW_POLY_3D_TECHNICAL_DESIGN.md` and
`LOW_POLY_3D_PHONE_PROFILE.md`:

| Budget | Target | Hard maximum |
|---|---:|---:|
| Frame rate | 30 fps sustained | no interval below 24 fps for more than 2 seconds |
| Draw calls | 75 | 100 |
| Visible triangles | 100,000 | 150,000 |
| GPU texture memory | 48 MB | 64 MB |
| Pixel ratio | 0.75 target | internal canvas capped at 800x600 |
| Dynamic lights | 0 | hemisphere plus one directional light |
| Real-time shadows | 0 | 0 |

First-person may hide the local player and cull more geometry behind walls, but
it can also make nearby surfaces cover more pixels. Measure it independently;
do not assume it is automatically faster or slower than 2.5D.

Use the same manifest and mesh assets in both modes. Failed authored assets must
fall back to procedural **mesh** monsters in `RendererThreeJS`, not billboards.

## State, Diagnostics, and Test Hooks

`window.render_game_to_text()` and `window.lowPoly3DStats` should expose enough
state to distinguish and test the modes:

- canonical `viewMode`;
- renderer identity and camera profile;
- player position and `viewAngle`;
- camera position, target, field of view, and eye height;
- whether the local player mesh is visible;
- crosshair/aim result type, target id, impact distance, and blocking wall;
- input movement/turn state;
- draw calls, triangles, asset fallbacks, GPU identity, and context events;
- recovery snapshot mode/profile.

The text state should describe only relevant visible/interactive entities and
must state that game `(x, y)` maps to Three.js `(x, 0, z)`.

## Implementation Sequence

### Phase 1: Mode registry and migration

- Add the three canonical modes and labels to both settings selectors.
- Migrate legacy `3d` preferences and URLs to `third-person`.
- Replace binary view switching with a three-choice picker.
- Pass the selected profile to renderer and input construction.

Success: all three values select and persist correctly; 2D and legacy `3d`
still launch the expected existing experiences.

### Phase 2: Profile refactor with no visual change

- Move the current chase camera logic behind a `chase` profile.
- Parameterize `RendererThreeJS` and `InputHandler3D` by canonical mode/profile.
- Preserve the existing 2.5D screenshot, movement, firing, diagnostics, and
  context recovery behavior.

Success: 2.5D is behaviorally unchanged after the refactor.

### Phase 3: First-person camera and HUD

- Add the eye-level camera profile.
- Hide only the local player mesh.
- Disable target-biased framing.
- Add the centered crosshair and first-person diagnostics.

Success: the player can navigate at eye level, monsters are real meshes, and
walls naturally conceal them.

### Phase 4: Honest first-person shooting

- Add the gameplay-plane wall/monster aim resolver.
- Route first-person fire through center-ray results.
- Add wall impact, miss, hit, and visual tracer feedback.
- Add line-of-sight rejection to 2.5D aim assist.

Success: aligned visible monsters can be hit, walls block shots, off-target
shots miss, and every fire input produces feedback.

### Phase 5: Desktop and mobile controls

- Add hold-forward/back behavior for FPS.
- Add mouse/touch drag yaw while retaining held turn buttons.
- Clear held state across every overlay, blur, cancellation, death, and pause.
- Add pointer lock only after non-pointer-lock controls pass.

Success: a new player can move, turn, aim, fire, stop, and answer a quiz without
stuck input on desktop and phone.

### Phase 6: Suspense pass

- Tune first-person fog and sight distance.
- Add inexpensive positional monster cues and readable attack anticipation.
- Remove information leaks such as target framing or through-wall indicators.
- Keep brightness and quiz readability within the existing visual direction.

Success: monsters can be heard before they are seen, corners matter, and the
mode remains readable rather than merely dark.

### Phase 7: Recovery, regression, and phone gate

- Verify cached recovery frames never cross camera profiles.
- Run complete 2D, 2.5D, and FPS gameplay regressions.
- Profile both mesh modes for ten minutes on the target Android phone.
- Record controls, heat, battery, draw calls, triangles, FPS, and context loss.

Success: all mode acceptance criteria pass and both mesh modes remain within the
existing real-phone budgets.

## Test Matrix

| Scenario | 2D | 2.5D | First person |
|---|:---:|:---:|:---:|
| Menu selection, URL, persistence, reload | Yes | Yes | Yes |
| Start mission, move, collide, stop | Yes | Yes | Yes |
| Continuous turn and release without drift | N/A | Yes | Yes |
| Visible target hit and death | Yes | Yes | Yes |
| Off-target fire misses | Existing behavior | Aim assist | Required |
| Wall blocks target/shot | Existing behavior | Required | Required |
| Quiz opens, input clears, answer resumes | Yes | Yes | Yes |
| Pause, blur, touch cancel, game over | Yes | Yes | Yes |
| Local/remote multiplayer player visibility | Yes | Yes | Yes |
| Forced WebGL loss and exact-view recovery | N/A | Yes | Yes |
| Authored asset failure uses proper fallback | N/A | Mesh | Mesh |
| Ten-minute real-phone profile | Baseline | Required | Required |

Automated browser tests must use short action bursts with pauses, inspect both
screenshots and `render_game_to_text()`, and review console errors. Test each
mode in a fresh page to avoid renderer, input-listener, or local-state leakage.

## Acceptance Criteria

The feature is ready for user validation when:

- all three modes are explicitly selectable and retain their preference;
- old `viewMode=3d` links open 2.5D Adventure;
- 2D remains visually and behaviorally unchanged;
- 2.5D remains the current elevated real-mesh presentation;
- first-person uses an eye-level camera and never displays the local player in
  front of the camera;
- first-person monsters are Three.js meshes or procedural mesh fallbacks;
- a wall always prevents a first-person shot from selecting a monster behind it;
- a miss gives feedback without damaging a nearby off-crosshair monster;
- no overlay leaves movement or turning stuck;
- WebGL restoration shows only a cached frame from the active camera profile;
- both mesh modes pass the real-phone performance gate.

## Key Risks and Mitigations

### First-person reveals collision or scale problems

Mitigation: keep camera at the authoritative player center, use a configured eye
height, test wall corners and narrow passages, and correct environment scale in
the renderer adapter rather than changing map data.

### Aiming is too difficult on a phone

Mitigation: enlarge the gameplay-plane monster hit radius modestly, reduce turn
sensitivity, add drag sensitivity settings, and measure misses. Do not restore
a hidden wide auto-target cone.

### Motion causes discomfort

Mitigation: yaw-only MVP, stable horizon, no camera-follow lag, head bob off by
default, modest FOV, and continuous sensitivity controls.

### Three mode names create migration bugs

Mitigation: one registry and normalizer, canonical stored values, alias tests,
and no scattered `viewMode === '3d'` checks.

### Billboard fallback undermines the product promise

Mitigation: use procedural Three.js mesh fallbacks for asset failure and an
explicit 2D fallback for WebGL capability failure. Keep the software billboard
renderer out of the public mesh-mode selection path.

### Scope expands before player validation

Mitigation: finish the seven phases with the existing CC0/procedural asset set,
then run the already planned 20–30-player cohort. Do not purchase a full asset
library solely to finish this mode split.

## Recommended First Deliverable

Implement Phases 1–4 as one thin vertical slice:

- three selectable and migrated mode values;
- unchanged 2D and 2.5D paths;
- eye-level first-person mesh view with crosshair;
- wall-respecting center-ray shooting with hit/miss feedback.

That slice is enough to test the core product hypothesis: whether genuine
first-person occlusion and aiming restore suspense while preserving the Bible
learning and combat loop.
