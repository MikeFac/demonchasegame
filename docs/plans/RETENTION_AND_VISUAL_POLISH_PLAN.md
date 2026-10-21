# Retention & Visual Polish Plan — Step 0: Easy Graphics Wins

**Status:** proposed, ready to start  
**Branch:** `feat/step0-visual-juice`  
**Worktree:** `/home/michael/proj/dcgame-step0`  
**Base:** `low-poly-3d` @ `c5190ff`  
**Created:** 2026-10-22

> This plan follows the engine-feasibility research. The short version: do not replace the engine. Make the first five minutes look and feel better, then earn the right to build more.

---

## 1. Context and constraints

- Solo developer, **no animator**, **no art budget**.
- Focus cast: **3 characters** — the player, Fear, and Doubt (swap Condemnation in if its silhouette reads better at 64 px).
- The real problem is the chicken-and-egg of getting and retaining users, not the engine.
- The repo already has: 1,655 verses, 21 categories, 9 language bundles, 5 quiz modes, 118 generated missions, 9 chapters, guest multiplayer, VPS deployment, PWA, and a 19 MB offline APK.
- Therefore: **graphics is a first-impression and feel problem, not a content problem.** Step 0 is deliberately small and visual-only.

---

## 2. Strategy in one page

| Priority | Lever | Effect | Cost |
|---|---|---|---|
| 1 | First 5 minutes (clarity, first win) | Highest retention impact | Days |
| 2 | Daily habit (verse + streak + reminder) | High | Days |
| 3 | Group/social accountability | High for this audience | Days–weeks |
| 4 | Cohort distribution (one group at a time) | High, no ad spend | Free |
| 5 | **Visual juice on the 3 characters** | **Moderate — mostly first impression** | **Days (this branch)** |
| 6 | More content/missions | Low until 1–4 are fixed | Weeks |

**Principle:** graphics buy the first impression; habit and group retain. Step 0 improves the first impression and combat feel without touching gameplay, the server, the quiz, or the 19 MB APK.

---

## 3. Step 0 — Easy graphics wins (this branch)

### 3.0 Goal

Make the 2D game look crisp on modern phones, fix the HUD collisions, and make combat feel substantially better — using procedural effects and an AI-assisted art pass on three characters. No engine change, no animation pipeline, no gameplay redesign.

### 3.0 Non-goals

- No Phaser/Godot migration.
- No sprite-sheet animation pipeline (that is a later, gated experiment).
- No server/protocol changes.
- No quiz/learning logic changes.
- No 3D renderer work beyond ensuring the 3D modes still load.
- No new content (missions, demons, languages).

### 3.0 Definition of done

- 2D renders at device pixel ratio, still laid out at the logical 320–420 px width.
- The top HUD has no text collisions at 320, 360, 400, or 420 px.
- Combat has hit flash, hit-stop, knockback, death burst, spawn effect, and low-health feedback.
- The player, Fear, and Doubt have a coherent AI-assisted art pass.
- All 5 quiz modes still work.
- Multiplayer room join and state sync still work.
- No console errors; 3D modes still load.
- Before/after screenshots at 320/400/420 px are committed under `output/`.

---

### 3.1 High-DPI canvas (do first)

**Why:** the game currently renders at a logical width of roughly 400 px and then the browser upscales it. Everything is blurry on a 2× or 3× phone. `devicePixelRatio` is not used anywhere.

**Current code:**

- `game.js` — `getOptimalCanvasWidth()`, `ensureCanvasSize()`, `handleResize()`.
- `index.html` — `#gameCanvas` (800×600 initial bitmap), `#gameCanvasStack`.
- The renderer reads `this.canvas.width` for layout in **47** places; `game.js` has **33** `canvas.width` references; `InputHandler` 10; `ReviewMode` 23; `UILayout` 1.

**Implementation:**

1. Add `src/client/Viewport.js` (IIFE, `window.Viewport`) loaded after `Constants.js` and before `UILayout.js`.
2. `Viewport` owns:
   - `width` / `height` — logical CSS-pixel size (the current 320–600 × up-to-600 values).
   - `dpr` — `Math.min(window.devicePixelRatio || 1, 2)`.
   - `apply(canvas)` — sets `canvas.width = width * dpr`, `canvas.height = height * dpr`, `canvas.style.width = width + 'px'`, `canvas.style.height = height + 'px'`, then `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
   - `clear(ctx)` — `ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();`
3. In `ensureCanvasSize()` and `handleResize()`, compute the logical size, call `Viewport.apply(canvas)`, and keep `canvas.width/height` as the **bitmap** size only.
4. Replace layout reads of `canvas.width` / `canvas.height` with `Viewport.width` / `Viewport.height` in:
   - `src/client/Renderer.js` — all 47 references, especially `drawTopBar`, `drawHUD`, `drawLearnVersesButton`, quiz layouts.
   - `src/client/InputHandler.js` — coordinate conversion; use `getBoundingClientRect()` and `Viewport.width / rect.width` for robustness.
   - `src/client/ReviewMode.js`, `src/client/VerseTestScreen.js`, `src/client/VotdLearningMode.js` — they draw on the same canvas.
   - `src/client/UILayout.js` — pass the logical width into layout helpers rather than reading the canvas.
5. Do **not** touch `RendererThreeJS` / `worldCanvas3D` in this step; the 3D canvases have their own sizing and are out of scope.

**Pitfalls:**

- Assigning `canvas.width` resets the context transform; always re-apply `Viewport.apply()` after a resize.
- Any `fillRect(0, 0, canvas.width, …)` now overdraws by the DPR factor; use logical dimensions.
- Nested `ctx.save()/restore()` is safe as long as the DPR transform is applied before the outer save.
- Do not change the logical layout size — only the bitmap resolution.

**Acceptance:**

- Text and sprites are crisp at 2× on a phone.
- Layout at 400 px logical is pixel-identical to before (modulo sharpness).
- Taps land on the same targets at 320/360/400/420 px.
- 3D modes still load.

**Effort:** 1–2 days.  
**Commit:** `feat(viewport): render 2D at device pixel ratio`

---

### 3.2 HUD layout — no collisions at 320 px

**Why:** at 400 px the top bar currently draws the category, the Learn Verses button, the speed control, the hamburger, the health/XP/level/ammo stats line, the game level, and “Demons left: N/M” in the same vertical band. The screenshots show them overlapping. This is the cheapest visible quality win in the game.

**Current code:**

- `Renderer.drawTopBar()` — category, Learn Verses button, speed control, hamburger.
- `Renderer.drawHUD()` — stats line at `QUALITY_LINE_HEIGHT - 7`, game level at `y = 40`, demons-left right-aligned at `QUALITY_LINE_HEIGHT - 7`.
- `UILayout.playableTop = QUALITY_LINE_HEIGHT + BUTTON_HEIGHT`.
- i18n keys: `ui.statsLine`, `hud.demonsLeft`, `ui.learnVersesHere`.

**Implementation:**

1. Add a second HUD row below the existing quality line:
   - **Row 1** (existing quality line): category chip left, Learn button center, speed + hamburger right.
   - **Row 2** (new, ~24 px): health bar + numeric HP on the left; XP/level compact chip; ammo icon/count; “Demons N/M” right-aligned.
2. Add `HUD_ROW_HEIGHT` to `UILayout` and update `playableTop` to `QUALITY_LINE_HEIGHT + HUD_ROW_HEIGHT`. Check camera, spawn zones, and input offsets that depend on `playableTop`.
3. Replace raw text with measured/truncated text. At 320 px, abbreviate via i18n (do not hardcode shorter English):
   - `hud.demonsLeft` already exists; add a short form if needed.
   - Keep numbers right-aligned and never let the row exceed the viewport.
4. Draw health as a bar (red/green) plus numeric text; move the game level into the stats row; remove the floating top-right level number.
5. Keep the existing fonts for now; this step is layout clarity, not typography.
6. 3D control overlap is a separate `RendererThreeJS`/`InputHandler3D` task — note it, do not fix it here.

**Acceptance:**

- No overlap at 320/360/400/420 px.
- Every label is localized.
- The playable area is not obscured.
- Input still maps correctly after the row shift.

**Effort:** 1–2 days.  
**Commit:** `feat(hud): two-row top bar with no collisions at 320px`

---

### 3.3 Procedural juice — the biggest feel win

**Why:** the sprites are static PNGs. The game already has screen shake, damage numbers, death particles, and flash messages, but combat still reads as flat. Procedural motion and feedback can make the existing art feel animated without a single new frame.

**Current code:**

- `game.js` — `screenShake`, `damageNumbers`, `deathParticles`, `flashMessages`; render loop calls `renderer.drawGame(...)`.
- `Renderer.drawGame()` — applies screen shake, draws world, restores, draws HUD and quiz.
- `Renderer.drawMonsters()`, `drawPlayers()`, `drawBullets()`, `drawDeathParticles()`.
- `SoundEffects.js` — procedural WebAudio SFX already exist.

**Implementation:**

1. Add `src/client/VisualJuice.js` (IIFE, `window.VisualJuice`) with pure functions:
   - `idle(t, seed)` → `{ dy, sx, sy }`
   - `walk(t, speed)` → `{ lean, bob }`
   - `attack(t)` → `{ dx, dy, sx, sy }` (anticipation → lunge → recover)
   - `hitFlash(entity, now)` → `0..1`
   - `knockback(entity, now)` → `{ dx, dy }`
   - `lowHealthVignette(hpFraction)` → alpha
   - `spawnRing(x, y)`, `dust(x, y)`, `hitSpark(x, y)`, `deathBurst(x, y)`, `soulWisp(x, y)`
   - `hitStop(ms)` — sets a **visual-only** timestamp; the client renderer holds the last frame for 50–80 ms. Never stop the server or input timestamps.
2. Add per-entity visual state in `game.js` when state arrives: `spawnAt`, `lastHitAt`, `attackAt`, `lastFootstepAt`, `seed`, `knockback`.
3. In `Renderer.drawMonsters()` / `drawPlayers()`:
   - Apply idle/walk/attack transforms around the sprite center.
   - Draw hit flash: precompute a white-tinted copy of each sprite once (offscreen canvas) and draw it over the sprite with the flash alpha. Do not regenerate per frame.
   - Apply knockback offset (visual only; the authoritative position stays server-owned).
4. Extend the effects array with typed particles: `spark`, `dust`, `smoke`, `ash`, `soul`, `ring`. Draw in a new `Renderer.drawEffects()`.
5. Wire events:
   - `playerShoot` → set `attackAt`, muzzle flash, recoil.
   - `bulletHit` → hit spark, hit flash, knockback, hit-stop 50 ms.
   - `monsterKilled` → death burst + soul wisp.
   - Monster spawn → smoke ring + scale-in.
   - Player damage → red vignette, shake, heavy hit sound.
   - Correct answer (`window.onQuizCorrectAnswer`) → gold radial burst + ammo trail + stronger shake.
   - Low HP (< 30%) → pulsing red vignette.
6. Accessibility: respect `prefers-reduced-motion` (or add an Options toggle) to disable shake/hit-stop.
7. Keep it visual: no changes to `GameEngine`, `MonsterManager`, `BulletManager`, or any socket event payload.

**Acceptance:**

- Hitting a demon reads clearly: flash, spark, knockback, number, sound.
- Killing a demon reads clearly: burst, fade, soul wisp.
- Correct answer feels rewarding.
- No desync, no input lag, no change to server state.
- 60 fps on desktop; no regression on a mid-range phone.

**Effort:** 3–5 days.  
**Commit:** `feat(juice): procedural combat feedback and hit-stop`

---

### 3.4 AI art pass — player, Fear, Doubt

**Why:** the player sees these three characters in the first five minutes. Improving them has disproportionate impact. No animator required.

**Current assets:**

- Player: `images/player1-sprite96.png` (96 px; collision `PLAYER_WIDTH/HEIGHT = 48` in `src/shared/Constants.js`).
- Fear: `images/monsters/fear_demon.png`.
- Doubt: `images/monsters/doubt_spirit.png`.
- Swap: `images/monsters/condemnation_demon.png`.
- Effects: `images/effects/explosion2.png`, `images/effects/red-particle-burst__1_-removebg-preview.png`.
- Backgrounds: `images/backgrounds/forest.png`, `lake.png`, `mountains.png`.

**Style guide (write this down before generating):**

- 3/4 top-down view; consistent light from top-left.
- One dark outline; limited palette (12–16 colours).
- 96×96 or 128×128, transparent background.
- Silhouette must read at 64 px and 32 px.
- Colour identity: Fear = cold violet/red; Doubt = desaturated blue-grey; Condemnation = iron/ochre; Player = warm blue/gold.
- Keep the existing category-affinity colour logic in `LevelConfig.js`; do not recolour the HUD to match.

**AI workflow (no animator):**

1. Generate 8–12 variants per character with local Flux/SDXL (16 GB is enough for FP8/quantised) or a free cloud image tool.
2. Use one shared style reference sheet (all three characters together) to keep the palette and proportions coherent.
3. Pick by **silhouette at 64 px**, not by detail.
4. Upscale, remove the background, clean edges, unify the palette with a shared LUT.
5. Export PNG with alpha. Keep the sprite dimensions unless you also update `Constants` and the renderer; do not silently change collision size.
6. Generate a small VFX set: smoke puff, spark, ash, holy light, impact ring (64 px, 4–8 frames or a single animated puff).
7. Optional: one menu/overworld background layer in the same style.
8. Review generated art for doctrinal/visual problems before shipping. Do not generate Scripture text.

**Acceptance:**

- Three characters pass the 64 px silhouette test.
- Consistent palette and outline across all three.
- Assets under ~1 MB total.
- No dimension/collision regressions.
- Screenshots at 400 px.

**Effort:** 3–5 days (can run in parallel with 3.1–3.3).  
**Commit:** `feat(art): step-0 cast and VFX pass`

---

### 3.5 Audio polish (optional, cheap)

**Why:** procedural audio is already there; small layers make the juice land.

- Add pitch/volume variation to existing SFX so repeats do not fatigue.
- Add a soft whoosh on attack and a low heartbeat under 30% HP.
- Duck music for ~300 ms on a correct answer.
- Keep the existing mute/volume controls working.
- No new licensed assets.

**Effort:** 1–2 days.  
**Commit:** `feat(audio): layered combat SFX`

---

### 3.6 Regression and screenshots

Run and record:

- 5 quiz modes: first letter, missing word, category match, true/false, cloze.
- Solo mission flow and one multiplayer room join.
- `npm run test:three-views` and `npm run test:3d-runtime` (3D unaffected).
- `node test/game-integration-test.js` if the server is running.
- Screenshots at 320/360/400/420 px, before and after, under `output/step0/`.
- Browser console: no errors.
- APK is built from `dcgame-app`, not this repo; syncing this branch into the lite app is a separate task. Do not rebuild the APK here.

---

### 3.7 Order of work

1. **3.1 Viewport/DPR** — foundation; everything else depends on logical dimensions.
2. **3.2 HUD layout** — depends on 3.1.
3. **3.3 VisualJuice core** — hit flash + hit-stop + knockback first (biggest feel win), then particles.
4. **3.4 AI art pass** — can run in parallel; drop-in assets.
5. **3.5 Audio** — after the juice hooks exist.
6. **3.6 Regression** — before merging.

### 3.8 Risks

| Risk | Mitigation |
|---|---|
| DPR refactor touches 100+ `canvas.width` reads | Introduce `Viewport` first; replace mechanically; test input at 320/420 |
| HUD row shift breaks camera/spawn/input | Update `playableTop` in one place; screenshot and play a mission |
| Hit-stop feels laggy in multiplayer | Cap at 50–80 ms; visual-only; never pause the server or input |
| AI art style drift | One reference sheet, one palette LUT, silhouette test at 64 px |
| Sprite dimension change breaks collision | Keep `PLAYER_WIDTH/HEIGHT` independent; verify spawn/collision |
| Effects hurt low-end performance | Cap particles; pool objects; test on a mid-range phone |

---

## 4. Step 1 — First five minutes (after Step 0)

Goal: a new player gets a correct answer, kills a demon, and learns one verse without confusion.

- Watch 10 new users play; time to first correct answer, first kill, first verse learned.
- Remove menus/steps before the first game; make “Start Here” the default path.
- One clear goal per screen; no modal stacking.
- Fix the quiz prompt/answer hierarchy so the verse and blanks are unmistakable.
- Add a one-line “why this matters” on the first correct answer.
- Acceptance: median time-to-first-correct under 60 seconds; no user asks “what do I do?”

---

## 5. Step 2 — Daily habit

The raw materials already exist; surface them.

- **Verse of the Day** with the damage bonus (`VersOfTheDayManager.js`).
- **Daily challenge** (`game.js`) — currently localStorage-only and hidden.
- **Streak** — show it on the menu; add one grace day / streak repair.
- **Local notification** in the Android app via `@capacitor/local-notifications` — free, offline, no server. “Your verse for today is ready.”
- **Share card** — “I learned 3 verses today” with a link to the web game.
- **Weekly mission** — the mission compiler already makes this cheap.
- Measure D1/D7 by cohort.

---

## 6. Step 3 — One cohort, not a launch

Pick **one** youth group, school class, or church small group (10–30 people). Run a 4-week challenge.

- Guest join: the lobby already allows a username-only join; Clerk is optional. Make the link/code flow one tap.
- Web link first (no install); APK for offline retention.
- Print the existing category booklet/QR (`src/server/print/bookletBuilder.js`) and hand it out at the session.
- Weekly group leaderboard that resets; group streak.
- Measure activation, D1, D7, session 2 return, group join rate.
- Interview 5 users; fix the biggest drop-off; repeat with another cohort.

---

## 7. Metrics

Add or verify these events in `src/client/Analytics.js`:

| Event | Why |
|---|---|
| `session_start` with `cohort` param | Attribute cohorts from a link |
| `first_correct_answer` (exists) | Activation |
| `first_monster_kill` | Time-to-fun |
| `first_mission_complete` | Activation |
| `verse_learned` | Learning value |
| `daily_challenge_complete` | Habit |
| `group_join` | Social loop |
| `day_return` (D1/D7) | Retention |

Success at small scale: 20 users, **D1 ≥ 40%**, **D7 ≥ 20%**, **3+ sessions/week** for the retained group. If D1 < 30%, fix onboarding, not art. If D7 < 10%, fix habit/social, not content.

---

## 8. 30-day schedule

| Week | Work |
|---|---|
| 1 | 3.1 Viewport/DPR, 3.2 HUD, first-session audit |
| 2 | 3.3 Juice, 3.4 AI art, 3.5 Audio |
| 3 | Step 2 habit: streak UI, daily challenge, notification, share card |
| 4 | Step 3: run one 20-person cohort, measure, interview |

---

## 9. What not to do

- Do not build a 3D→2D animation pipeline before 20 retained users.
- Do not add more demons, missions, or languages.
- Do not run paid ads at current retention.
- Do not let AI generate verse text.
- Do not change the server protocol or quiz logic in Step 0.
- Do not ship AI art without a human review pass.

---

## 10. Handoff prompt

Copy this into the new agent session started in `/home/michael/proj/dcgame-step0`:

```text
You are working in /home/michael/proj/dcgame-step0, a git worktree of the
VerseBattles/Demon Chase repo on branch feat/step0-visual-juice, based on
low-poly-3d at c5190ff. The main checkout at /home/michael/proj/dcgame stays
on low-poly-3d; do not switch it.

READ FIRST:
1. docs/plans/RETENTION_AND_VISUAL_POLISH_PLAN.md  (this plan)
2. AGENT.md  (cache-busting, restart rules, architecture gotchas)
3. docs/architecture/TECHNICAL_OVERVIEW.md
4. src/client/Renderer.js, game.js (render loop + ensureCanvasSize/handleResize),
   src/client/UILayout.js, src/client/InputHandler.js

YOUR TASK: Step 0 only — the easy graphics changes. Specifically:
- 3.1 High-DPI canvas via a new src/client/Viewport.js (logical size vs bitmap
  size; devicePixelRatio capped at 2; reapply transform after every resize).
- 3.2 Two-row HUD; no text collisions at 320/360/400/420 px; update
  UILayout.playableTop accordingly.
- 3.3 Procedural juice in a new src/client/VisualJuice.js: idle/walk/attack
  transforms, hit flash, knockback, hit-stop (50–80 ms, visual-only), hit spark,
  death burst, spawn ring, low-health vignette, correct-answer burst.
- 3.4 AI art pass on the player, Fear, and Doubt (or Condemnation): consistent
  palette/outline, 96/128 px, silhouette test at 64 px, small VFX set.
- 3.5 Optional audio layering.
- 3.6 Regression + before/after screenshots at 320/400/420 px.

HARD CONSTRAINTS:
- Visual-only. Do not change GameEngine, MonsterManager, BulletManager, server
  payloads, quiz logic, mission logic, or scoring.
- Keep all 5 quiz modes and 9 languages working.
- Do not touch RendererThreeJS/Renderer3D except to confirm they still load.
- No new dependencies unless you explain why.
- After changing any client JS, bump its ?v= in index.html (AGENT.md rule) and
  restart with ./restart-server.sh. Never kill node manually.
- Commit in small conventional commits, one per section (3.1, 3.2, 3.3, 3.4,
  3.5, 3.6). Do not commit generated output screenshots unless the plan says to.

START BY:
1. Run git status, git branch --show-current, and confirm the worktree is clean.
2. Read the plan and the four files above.
3. Implement 3.1 Viewport/DPR and verify with a screenshot at 400 px logical on a
   2x device (Chrome DevTools device emulation is fine).
4. Then 3.2 HUD, then 3.3 juice, then 3.4 art.

DEFINITION OF DONE:
- Crisp 2D at 2x; identical logical layout at 400 px.
- No HUD collisions at 320/360/400/420 px.
- Combat has flash/hit-stop/knockback/particles and still syncs in multiplayer.
- Player/Fear/Doubt share one coherent style.
- 5 quiz modes, solo mission, and one multiplayer room verified.
- No console errors; 3D modes load.
- Screenshots and a short summary of what changed and what was deferred.

If a task requires a gameplay/server change, stop and ask. Do not “fix” unrelated
bugs in this branch.
```

---

## 11. Branch and worktree commands

```bash
# Inspect
cd /home/michael/proj/dcgame-step0
git status
git branch --show-current        # feat/step0-visual-juice
git log --oneline -5

# Run
./restart-server.sh              # preferred
# or: node server.js

# Cache-busting: bump ?v= in index.html for every changed client JS file.
# Then restart.

# Commit examples
git add src/client/Viewport.js src/client/Renderer.js game.js index.html
git commit -m "feat(viewport): render 2D at device pixel ratio"

# When done, merge into low-poly-3d (or open a PR)
```

**Note:** `low-poly-3d` is 5 commits behind `master`; `master` contains a security
commit (`d812c60` — stop serving app root). Before deploying or merging, merge
`master` into the branch or cherry-pick that commit. Do not deploy the branch
without it.

---

## Appendix A — Why not animation frames yet

The 3-character pilot is deliberately **static art + procedural motion**. A
sprite-sheet pipeline (PixelLab 8-direction, or Tripo/Mixamo → Blender bake) is a
separate 2–5 day experiment to run only after Step 1/2 show retention. If you do
test it, test one character first and gate on: reads at 96 px, ≤ 1 MB per
character, ≤ 1 hour render time, no quiz regression.

## Appendix B — Art direction checklist

- [ ] One reference sheet with all three characters.
- [ ] 64 px and 32 px silhouette test.
- [ ] Shared 12–16 colour palette.
- [ ] One outline weight.
- [ ] Consistent top-left lighting.
- [ ] Transparent background, clean alpha.
- [ ] No Scripture text in generated images.
- [ ] Human review for doctrinal/visual issues.
- [ ] Assets optimized (PNG/WebP, < 1 MB total).

## Appendix C — Screenshot matrix

| Width | What to check |
|---|---|
| 320 | HUD collisions, quiz buttons, text truncation |
| 360 | Most common Android width |
| 400 | Current default logical width |
| 420 | Upper mobile cap |
| 600 | Desktop/tablet max |
