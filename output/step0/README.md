# Step 0 evidence — viewport, HUD, juice, art, audio

Branch: `feat/step0-visual-juice`  
Base: `low-poly-3d` @ `c5190ff`

## Before / after

| Logical width | Before (base commit) | After |
|---|---|---|
| 320 | `before/hud-320.png` | `after/hud-320.png` |
| 360 | `before/hud-360.png` | `after/hud-360.png` |
| 400 | `before/hud-400.png` | `after/hud-400.png` |
| 420 | `before/hud-420.png` | `after/hud-420.png` |

Composite: `before-after-grid.png`

The "before" images are rendered from the base commit via Playwright
request interception (`scripts/capture-step0-before.js`), so no worktree or
copy of the repository is created. They show the old single-row HUD collisions
and the 1× bitmap being upscaled on a 2× device.

After images are captured at `deviceScaleFactor: 2` with logical widths
320/360/400/420. The canvas bitmap is 2× and the 2D transform is 2×, while all
layout remains in logical pixels.

## Art

- Focus cast reference: `../../docs/art/step0-cast-reference.png`
- Full 18-type demon reference: `../../docs/art/demon-cast-reference.png`
- Full demon contact sheet: `art/demon-cast-contact.png`
- Silhouette tests (64 px / 32 px): `art/silhouettes-64.png`,
  `art/demon-silhouettes-64.png`
- In-game cast: `art/ingame-cast.png`
- Close-up: `art/ingame-fear-close.png`
- Full cast lineup (in-game): `art/ingame-cast-lineup.png`
- Trio attempt: `art/ingame-trio.png`

Notes: `../../docs/art/step0-art-notes.md`.

All 18 demon types now share the Step 0 palette/outline pass; Goliath uses a
192 px source and the rest use 128 px sources, with destination/collision sizes
unchanged.

## 3D controls

- `3d/first-person-controls.png`
- `3d/third-person-controls.png`
- `3d/first-person-320-controls.png`

The 3D controls now sit in one compact row above the quiz/verse block. FIRE was
moved off the score badge, and the row lifts automatically for the taller
discipleship grid. Targets stay at the accessible 58 px (first-person) / 48 px
(third-person) minimum. The shared layout function drives both drawing and hit
areas.

## Quiz modes

Five forced modes at 400 px logical:

- `quiz/first_letter.png`
- `quiz/missing_word.png`
- `quiz/category_match.png`
- `quiz/true_false.png`
- `quiz/cloze.png`

## Solo mission

`solo-mission.png` — `chapter0 / intro-01` ("First Victory") started, player
spawned, HUD and onboarding guide targeting the new health row.

## Regression results

Run:

```bash
node scripts/test-step0-regression.js
npm run test:three-views
node scripts/test-multiplayer-regression.js
node test/game-integration-test.js
```

Results recorded during this pass:

- `node scripts/test-step0-regression.js` — passed. 4 widths at DPR 2,
  5/5 quiz modes generated and answered correctly (ammo reward increased),
  solo mission reached `game` mode.
- All 18 demon sprites load at 128 px (Goliath 192 px) in-game; the full-cast
  lineup screenshot is `art/ingame-cast-lineup.png`. No page errors.
- `npm run test:three-views` — passed; 2D, third-person and first-person modes
  load and switch.
- `node scripts/test-multiplayer-regression.js` — passed. A 2-player room was
  created/joined, both clients reached `game`, 240 px of movement synced, and
  the disconnected player was marked `disconnected` on the peer.
- `npm run test:3d-runtime` — times out in this environment because the
  headless SwiftShader GPU renders 3D at roughly <1 fps, and the assertion
  requires the short-lived shot tracer and the health drop in the same poll.
  Manual deterministic check with the same setup: `tryHandle3DFire` accepted,
  monster health `10 → 8`, tracer count `1`, no browser errors. The 3D runtime
  itself loads and renders.
- `node test/game-integration-test.js` — runs, but reports the pre-existing
  "monster is not moving" check. No engine/server files were changed in this
  branch; this is unchanged behaviour from the base.

Browser console: no page errors in the Step 0 harness. The multiplayer
harness logs the expected headless autoplay policy error for background music
(`NotAllowedError: play() failed because the user didn't interact...`).

## Not done here

- APK is built from the separate `dcgame-app` repo; not rebuilt.
- 3D control/HUD overlap is intentionally left to the `RendererThreeJS` task.
- No sprite-sheet animation pipeline; procedural motion only.
