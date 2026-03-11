Original prompt: Check the implementation of docs/multi-version-songs-implementation-plan.md and test it. Make 2 new songs in each category for the first 2 verses and create a log of what was created so we can also migrate later to production.

2026-03-08:
- Updated Suno prompt instructions to start singing within 3 seconds and use the full verse text exactly as provided.
- Added targeted scripts for batch generation, retry from batch log, waiting for batch completion, and exporting a batch-only production payload.
- Applied the local MongoDB multi-version migration after confirming the old unique verseReference index was still present.
- Generated and completed the tracked 42-song batch for the first two verses in each category.
- Current testing goal: verify local backend behavior and do a lightweight browser smoke pass before production migration.

- Use ./restart-server.sh for all local server restarts; do not invoke node server.js directly.
- Investigating learn-mode verse-song playback first before the planned song browser feature.
- Implemented first pass fix in MusicManager: verse songs no longer loop like background tracks and active verse songs are no longer interrupted on every quiz verse transition.
- Reworked verse-song prompt generation so only verse text is sent as lyrics; generation guidance now goes in the style field to avoid sung instructions.
- Shifted category styles toward shorter one-pass songs and replaced metal with a softer style; rock categories now use 80s rock.
- Added batch deletion support and changed the category batch generator to one-per-category with an optional --onesong mode.
- Added a saved plan for a Learn Mode song library and admin archive/delete workflow in docs/song-library-and-admin-delete-plan.md.
- Started the read-only implementation: new /api/verse-song/library endpoint with optional auth-admin flag, a SongLibraryOverlay client, and a new Learn Mode music icon entry point that opens the library.
- Polished the read-only overlay: added search/filter, collapsible categories, current-verse highlighting, clearer playback state, and a stop-audio control.
- Added the admin-only archive/delete path:
  - server route `POST /api/verse-song/:id/archive-delete`
  - filesystem-first archive into `archived/deleted-songs/YYYY-MM-DD/`
  - manifest + JSONL deletion log
  - client delete control only when `isSongAdmin` is true
- Corrected the music entry point location after user feedback: the quavers icon is now also on the Review/Learn screen in `ReviewMode.js`, not just the VOTD learning screen.
- Verification:
  - `node --check src/server/routes/verseSong.js`
  - `node --check src/client/SongLibraryOverlay.js`
  - `node --check src/client/VotdLearningMode.js`
  - Browser-verified `/api/verse-song/library` via headless Chrome dump-dom; endpoint returned grouped song JSON (`totalCategories: 22`, `totalSongs: 211`).
  - Browser screenshot of the main menu/VOTD modal captured at `logs/browser-captures/song-library-home.png`.
  - End-to-end Learn Mode smoke test via Playwright:
    - entered VOTD Learn Mode
    - clicked the quavers icon
    - verified overlay open state
    - filtered to `Romans 10:17`
    - clicked play and confirmed one row switched to `Stop`
  - Guest auth smoke:
    - overlay showed `0` delete buttons when unauthenticated
    - `POST /api/verse-song/fake-song-id/archive-delete` returned `401`
  - Review/Learn screen smoke:
    - opened the same screen the user screenshotted
    - clicked the new quavers icon there
    - verified the song library overlay opened with `22` category sections
  - Browser artifacts:
    - `logs/browser-captures/votd-learning-before-library.png`
    - `logs/browser-captures/song-library-overlay-attempt.png`
    - `logs/browser-captures/song-library-filtered-play.png`
    - `logs/browser-captures/review-mode-song-library.png`
- Follow-up TODO:
  - Test the archive/delete path end-to-end while logged in as `michaelfackerell@gmail.com`.

2026-03-08:
- Started implementing `plans/CombatAffinitySystem.md` core combat-category path.
- Added a shared combat affinity matrix in `src/shared/LevelConfig.js`.
- Wired `quizCorrect` to persist the answered category on the server/offline engine player state as `currentCombatCategory`.
- Updated bullet collision to apply affinity multipliers and emit richer `bulletHit` payloads for client feedback.
- Added initial engine coverage in `test/test-game-engine.js`.
- Investigated multiplayer movement for non-host players and found the client `onWalls` handler was force-teleporting every player to the shared spawn instead of the server-assigned per-player position. Patched `game.js` to prefer the authoritative player position and stop pushing the wrong spawn back to the server.

2026-03-09:
- Added audience-specific landing pages:
  - `youth-pastors.html`
  - `parents.html`
  - `players.html`
- Added dedicated routes in `server.js`:
  - `/youth-pastors`
  - `/parents`
  - `/players`
- Reused `public/landing-pages.css` as a shared marketing stylesheet and extended it for screenshot cards.
- Added landing analytics in `public/landing-analytics.js` using the existing GA4 measurement ID `G-673VQ9VE50`.
- Landing analytics now emit:
  - `landing_page_view`
  - `landing_cta_click`
- Added screenshot-only query helpers that do not affect normal gameplay:
  - `/?capture=tutorial`
  - `/?capture=worlds`
- Captured and saved landing assets:
  - `public/landing/menu-screen.png`
  - `public/landing/tutorial-screen.png`
  - `public/landing/worlds-screen.png`
  - `public/landing/gameplay-screen.png`
- Verification:
  - `node --check server.js`
  - `node --check game.js`
- Follow-up TODO:
  - browser-smoke the three landing-page routes once the local server is running in a stable foreground/background session again
  - decide whether to add a fourth audience page for Christian schools or homeschool groups
  - simple 3D mode technical plan added at `docs/plans/SIMPLE_3D_MODE_IMPLEMENTATION_PLAN.md`

2026-03-09:
- Advanced optional `viewMode=3d` without touching the default 2D path:
  - 3D fire helper now applies damage whenever a demon is clearly in front of the player, instead of reusing the 2D melee hit-chance gate.
  - Relaxed the 3D targeting cone slightly to make the `FIRE` button more usable while still requiring the player to face the demon.
  - Added world-space 3D rendering for healing pickups as explicit glowing crosses.
  - Added cheap projected death-burst rendering for demon deaths in 3D mode.
- Verification:
  - `node --check game.js`
  - `node --check src/client/Renderer3D.js`
  - `node --check src/client/InputHandler3D.js`
  - Local server restart via `./restart-server.sh`
  - Headless browser smoke on `http://localhost:3500/?mode=solo&viewMode=3d`
    - screenshots captured under `output/web-game/3d-smoke/`, `output/web-game/3d-fire/`, and `output/web-game/3d-healcheck/`
    - browser run showed only expected autoplay-audio `NotAllowedError` noise after scripted load
- Follow-up TODO:
  - browser-capture a scene with a visible healing pickup after movement so the new cross rendering is visually confirmed in-frame
  - browser-capture a confirmed demon kill in 3D mode to visually confirm the death burst
  - if the 3D fire interaction still feels unreliable on device, add a small muzzle-flash or "NO TARGET" feedback cue rather than loosening aiming much further

2026-03-10:
- Adjusted learn-mode music handoff:
  - entering `ReviewMode` now pauses active `MusicManager` playback and remembers whether it was active
  - leaving `ReviewMode` resumes music only when returning to actual `game`
  - entering `VotdLearningMode` still pauses active music, but now resumes it on exit back to `game`
  - added `MusicManager.resume()` so paused tracks/verse songs resume in place rather than restarting from the beginning
- Verification:
  - `node --check src/client/MusicManager.js`
  - `node --check src/client/ReviewMode.js`
  - `node --check src/client/VotdLearningMode.js`
  - browser automation from `?mode=solo` confirmed:
    - background music plays in `game`
    - music pauses in `review`
    - music resumes on return to `game`
    - music pauses in `votd` learning mode
    - music resumes on return to `game`

2026-03-10:
- Added a first-pass internal content workflow:
  - new `/content-maker` route with `X-Robots-Tag: noindex, nofollow`
  - new protected `/api/content-maker/*` endpoints gated by Clerk auth plus the allowlisted email `michaelfackerell@gmail.com`
  - internal draft storage under `content-maker/drafts/`
  - first UI for brief fields, starter generation, draft loading, and draft saving
- Added an initial missions-leader article draft at:
  - `content-maker/drafts/missions-browser-based-scripture-memory-tools.json`
- Verification:
  - `node --check server.js`
  - `node --check src/server/routes/contentMaker.js`
  - headless browser smoke of `/content-maker` while signed out
    - confirmed the route renders the gated shell rather than draft content
    - confirmed the signed-out state settles to `Signed out` with a `Sign In` button
    - screenshot captured at `output/web-game/shot-0.png`
- Follow-up TODO:
  - browser-smoke `/content-maker` while signed in as the allowlisted Clerk account

2026-03-10:
- Added a dedicated missions audience landing page:
  - `missions.html`
  - new route `/missions`
- Updated the internal missions draft and content-maker defaults to point at `/missions` as the primary missions CTA
- Verification:
  - `node --check server.js`
  - headless browser smoke of `/missions`
    - page rendered correctly with hero, CTA buttons, and missions-specific framing
    - screenshot captured at `output/web-game/shot-0.png`

2026-03-10:
- Added a first structured discipleship content-pack example:
  - `content-maker/packs/commandments-promises-of-jesus.json`
- The pack stays within the narrow-extension model:
  - Jesus-centered
  - mobile-friendly question types only
  - context cards, reflections, and mission framing without turning Learn mode into a full LMS

2026-03-10:
- Created branch `hybrid-discipleship-pack` and started the parallel mission-type implementation.
- Added a first-pass discipleship mission adapter:
  - `src/client/DiscipleshipMissionManager.js`
  - converts pack units into pseudo-verse entries for shared gameplay compatibility
- Added a new discipleship mission chapter:
  - `missions/chapter4-jesus-teachings.json`
  - chapter metadata added to `missions/chapters.json`
- Threaded `missionType`, `packId`, and `unitIds` through:
  - `src/shared/MissionClient.js`
  - `src/server/missionLoader.js`
  - `src/shared/GamePlayerHandler.js`
- Updated runtime behavior:
  - `game.js` now supports mission-specific content overrides for discipleship missions
  - `QuizManager.js` can build gameplay quizzes directly from pack question entries
  - `ReviewMode.js` can render discipleship context/reflection content instead of only verse text
- Verification:
  - `node --check game.js`
  - `node --check src/client/QuizManager.js`
  - `node --check src/client/ReviewMode.js`
  - `node --check src/client/DiscipleshipMissionManager.js`
  - JSON parse checks for `missions/chapters.json` and `missions/chapter4-jesus-teachings.json`
  - browser smoke still reaches the app shell, but no end-to-end discipleship mission launch has been confirmed yet
- Follow-up TODO:
  - test launching `chapter4` missions from overland
  - verify question rotation and answer reveal behavior in an actual discipleship mission
  - verify Review mode next/prev/category behavior on discipleship entries
  - decide whether to hide verse-audio/devotional actions for discipleship entries

2026-03-10:
- Regression smoke after the discipleship branch changes:
  - restarted local server via `./restart-server.sh`
  - headless browser smoke of standard solo play still reaches active gameplay from `/`
    - screenshot showed normal verse-question combat HUD with no launch regression
  - headless browser smoke of overland via `#btnMissions` still renders chapters/missions correctly
    - chapter4 `The Teachings of Jesus` appears as a separate locked chapter beneath the existing three
  - headless browser smoke of starting the first standard verse mission still reaches gameplay
    - screenshot showed `Faith` mission combat with the expected cloze verse question
  - headless browser smoke of `Learn Verses` on the same standard verse mission still opens Review/Learn mode correctly
    - screenshot showed the normal devotional verse screen for `Romans 10:17`
- Current confidence:
  - existing solo play works
  - existing overland/verse mission start works
  - existing overland `Learn Verses` path for verse missions works
- Still unverified:
  - actual launch/playthrough of a new `discipleship` mission
  - completion/return-to-overland flow after a discipleship mission

2026-03-10:
- Tested the new discipleship path directly and via the overland screen.
- Direct launch check:
  - browser-evaluated `startMission('chapter4', 'jesus-01')`
  - mission entered gameplay successfully with discipleship content
  - screenshot: `output/web-game/discipleship-direct-start.png`
- Overland accessibility:
  - chapter4 is intentionally locked until chapter3 progress is complete
  - with seeded local `missionProgress`, overland showed `The Teachings of Jesus` unlocked and selectable
  - selected `Kingdom Call`, and both `Start Mission` / `Learn Verses` buttons appeared as expected
- Found and fixed a regression in the discipleship `Learn Verses` path:
  - error: `ReferenceError: organizedVerses is not defined`
  - cause: `organizedVerses` had been used as an implicit global in the legacy flow, but the new discipleship review path reached it earlier
  - fix: declared `let organizedVerses = {};` near the shared content state in `game.js`
- Post-fix verification:
  - overland `Learn Verses` for `Kingdom Call` now opens Review/Learn correctly
  - screenshot: `output/web-game/discipleship-overland-learn.png`
- Remaining TODO:
  - play through a discipleship mission far enough to confirm completion and return-to-overland behavior

2026-03-10:
- Changed chapter4 `The Teachings of Jesus` from a progression-gated chapter to an independent track.
- Updated `missions/chapters.json` so chapter4 now has `unlockRequirement: null`.
- Verification:
  - `chapters.json` parses successfully
  - browser smoke with fresh local progress shows:
    - chapter1 unlocked
    - chapter2 and chapter3 still locked
    - chapter4 unlocked and selectable as a separate track
  - screenshot: `output/web-game/discipleship-track-unlocked.png`

2026-03-11:
- Added a new discipleship mission in chapter4 using the new promises pack:
  - mission id `jesus-04`
  - mission name `Peace, Mercy, and Life`
  - pack id `promises-of-jesus-peace-rest-forgiveness-mercy-eternal-life`
- Updated `missions/chapter4-jesus-teachings.json` and `missions/chapters.json` so the mission appears in the independent Jesus track with no prerequisites.
- Normalized discipleship track monster lists to supported existing monster keys only:
  - `jesus-03`: `Discouragement` -> `Despair`
  - `jesus-04`: `Death` -> `Despair`
- Verification:
  - mission manifests parse successfully
  - browser smoke confirmed chapter4 now shows 4 missions on the Missions screen
  - browser smoke confirmed selecting the fourth node and pressing `Start Mission` launches gameplay successfully
  - startup gameplay screenshot captured at `output/web-game/jesus-04-start/shot-0.png`
- Expanded the promises pack question pool for `jesus-04`:
  - increased from 33 total questions to 99 total questions
  - each of the 11 units now has 9 authored questions instead of 3
- Tuned the mission length so the larger pool is more likely to appear in one run:
  - `maxMonsters`: 28 -> 32
  - `monstersToKill`: 18 -> 24
  - `spawnRate`: 14 -> 13
  - `xpMultiplier`: 1.45 -> 1.5
- Reworked the Missions screen from node-only overland markers into a readable mission list:
  - chapter headers plus one-line clickable mission entries
  - mission title and learning subtitle visible in the list
  - fixed bottom action bar with `Mission Learning` first and `Start Mission` second
  - scrollable mission viewport with mouse-wheel and touch-drag support
- Updated latest discipleship mission copy for clearer curriculum framing:
  - `Jesus on Peace, Mercy, and Life`
  - `Promises of peace, rest, forgiveness, mercy, and eternal life from the teachings of Jesus.`
- Verification:
  - `node --check` passed for `src/client/OverlandRenderer.js`, `src/client/InputHandler.js`, and `game.js`
  - browser screenshots confirm the new mission list layout and scroll behavior:
    - `output/web-game/missions-scroll-small-before.png`
    - `output/web-game/missions-scroll-small-after.png`

2026-03-10:
- Adjusted discipleship-mission answer UI without affecting standard verse missions.
- Implemented a discipleship-only multi-choice layout in:
  - `src/client/Renderer.js`
  - `src/client/InputHandler.js`
- New behavior for discipleship questions with more than 2 options:
  - 2-column grid instead of a single cramped row
  - taller buttons
  - wrapped answer text inside each button
  - removed the redundant `Choose the best answer` label to avoid fighting the prompt text
- Also hardened `QuizManager.pickQualityVerse()` for injected discipleship categories so missing `qualityIndex` entries no longer crash mission startup.
- Verification:
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node --check src/client/QuizManager.js`
  - browser smoke of `startMission('chapter4', 'jesus-01')`
  - screenshot: `output/web-game/discipleship-grid-layout.png`
