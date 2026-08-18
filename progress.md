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

2026-03-31:
- Created branch `feature/start-here-ftue` from the current Wave Assault branch so FTUE mission work can continue without losing that code path.
- Disabled automatic first-play `Start Here` launch behind `START_HERE_AUTO_LAUNCH_ENABLED = false`; the mission still exists under Missions.
- Reworked `missions/chapter0-start-here.json` first slice:
  - opening encounter now starts with one weak fixed demon
  - `Fear Guard` now uses `spawnTrigger: { type: "killCount", value: 1 }`
  - removed the extra simultaneous opening demon
  - mission quiz settings now request `cloze: 100`
- Added step-driven Start Here guidance in `game.js`:
  - `move_intro`
  - `answer_intro`
  - `first_kill`
  - `learn_gate`
  - `finish`
- Suppressed the overlapping combat hint while the onboarding guide is active.
- Added a Learn-mode return hook so the tutorial can detect “opened Learn and came back.”
- Verification:
  - `node --check game.js`
  - `node --check src/client/ReviewMode.js`
  - `node --check src/shared/MissionClient.js`
  - `node --check src/server/missionLoader.js`
  - JSON parse check for `missions/chapter0-start-here.json`
  - Playwright/browser smoke:
    - Missions screen renders `Start Here` / `First Victory`
    - direct in-browser `startMission('chapter0','intro-01')` launches gameplay successfully
    - screenshot: `output/web-game/start-here-direct/shot-0.png`
- Runtime finding:
  - mission-level quiz settings arrive correctly as `{ firstLetter: 0, missingWord: 0, categoryMatch: 0, trueFalse: 0, cloze: 100 }`
  - but the first generated quiz still starts as `first_letter`
  - manually calling `QuizManager.pickQualityVerse()` immediately after launch switches it to `cloze`
- Next TODO:
  - fix mission startup ordering so Start Here regenerates its first quiz after mission quiz settings are applied
  - rerun Playwright after that fix and then validate the full teaching loop beyond the first prompt

2026-03-31:
- Fixed the Start Here first-quiz ordering bug in `game.js`:
  - when mission quiz settings arrive for Start Here, the client now regenerates the current quiz once so the opening prompt matches the mission config
- Playwright verification after the fix:
  - direct `startMission('chapter0','intro-01')` launch now opens with:
    - `currentQuiz.mode = "cloze"`
    - `questionLabel = "Fill in the blanks:"`
  - artifacts:
    - `output/web-game/start-here-direct-fixed/shot-0.png`
    - `output/web-game/start-here-direct-fixed/state-0.json`
- Basic Solo regression smoke:
  - `#btnSolo` launches normal gameplay with `currentMission: null`
  - screenshot confirms standard map/combat view still renders:
    - `output/web-game/basic-solo-regression/shot-0.png`
  - runtime state confirms the generic correct-answer path still works:
    - before: `isAnswerCorrect = null`, `answerFullVerse = null`
    - after correct answer: `isAnswerCorrect = true`, verse answer revealed, ammo increased
  - artifact:
    - `output/web-game/basic-solo-regression/state-0.json`
- Remaining FTUE TODO:
  - play through more of Start Here end-to-end
  - tune the guard encounter and Learn-return step based on real play feel, not just startup correctness

2026-03-31:
- Automated FTUE slice testing after startup fixes:
  - `output/web-game/start-here-slice-2/state-0.json`
  - confirmed first demon can be killed through the real gameplay path
  - confirmed tutorial advances from `move_intro` / `answer_intro` into `learn_gate`
  - confirmed `Fear Guard` spawns after kill 1
- Automated Learn-return FTUE slice:
  - `output/web-game/start-here-learn-return/state-0.json`
  - before Learn: `step = "learn_gate"`
  - after Learn return: `step = "finish"`, `learnOpened = true`, `learnReturned = true`
  - post-return guide now instructs: `Use what you learned`
  - screenshot: `output/web-game/start-here-learn-return/shot-0.png`
- Remaining UI issue:
  - stacked toast/flash messages can crowd the finish-step guide near the bottom of the screen
  - likely worth suppressing some generic toast messaging during Start Here so the authored FTUE prompts stay visually dominant
  - `public/landing/gameplay-screen.png`
- Verification:
  - `node --check server.js`
  - `node --check game.js`
- Follow-up TODO:
  - browser-smoke the three landing-page routes once the local server is running in a stable foreground/background session again
  - decide whether to add a fourth audience page for Christian schools or homeschool groups
  - simple 3D mode technical plan added at `docs/plans/SIMPLE_3D_MODE_IMPLEMENTATION_PLAN.md`

2026-03-31:
- Verified the Start Here post-mission summary/CTA implementation with a dedicated local Playwright helper:
  - added `scripts/test-start-here-summary.js`
- Summary overlay validation:
  - direct summary invocation shows the intended modal with all three CTA buttons
  - screenshot: `output/web-game/start-here-summary-final/summary-direct.png`
  - state: `output/web-game/start-here-summary-final/summary-direct-state.json`
- End-to-end FTUE completion validation:
  - confirmed the current mission completion path still requires the second kill (`monstersToKill: 2` in `missions/chapter0-start-here.json`), so the Fear Guard kill remains the actual win gate
  - verified the Start Here completion path displays the custom summary overlay instead of the normal game-over modal
  - screenshot: `output/web-game/start-here-summary-final/summary-end-to-end.png`
  - state: `output/web-game/start-here-summary-final/summary-end-to-end-state.json`
- CTA verification:
  - `Play Missions` clears the summary, clears `currentMission`, and returns the player to `overland`
  - state: `output/web-game/start-here-summary-final/summary-missions-action-state.json`
- Errors/log capture:
  - `output/web-game/start-here-summary-final/errors.json`

2026-03-31:
- Added reusable local test-script documentation:
  - `docs/test-scripts.md`
- Added `scripts/test-multiplayer-regression.js` for focused multiplayer regression:
  - registers two temporary users via `/api/register`
  - creates and starts a real room via socket events
  - opens two headless clients on `/?room=<roomId>`
  - verifies two-player join state
  - verifies position sync from one client to the other
  - verifies disconnect handling using the real grace-period behavior (`state: "disconnected"`)
- Successful multiplayer regression artifacts:
  - `output/web-game/multiplayer-regression/room.json`
  - `output/web-game/multiplayer-regression/initial-state.json`
  - `output/web-game/multiplayer-regression/post-move-state.json`
  - `output/web-game/multiplayer-regression/disconnect-state.json`
  - `output/web-game/multiplayer-regression/pageA-final.png`
  - `output/web-game/multiplayer-regression/logs.json`
- Verified results:
  - both clients received distinct player codes
  - both clients saw `connectedPlayers: 2`
  - remote position sync updated from `x: 725` to `x: 965` across clients
  - after closing one client, the remaining client kept the remote player with `state: "disconnected"` as expected
- Residual log noise in the multiplayer run:
  - autoplay audio `NotAllowedError` in headless Chrome
  - Clerk development-key warning

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

2026-05-19:
- Started the Study Plan feature implementation from `plans/StudyPlanLocalizationArchitecturePlan.md`.
- Added backend study-plan models and generation services:
  - `src/server/models/StudyPlanSource.js`
  - `src/server/models/StudyPlanVariant.js`
  - `src/server/services/StudyPlanGenerationService.js`
  - `src/server/services/StudyPlanService.js`
- Wired `/api/sermon/study-plan` and `/api/sermon/study-plan/regenerate`.
- Added `src/client/StudyPlanViewer.js` and loaded it from `index.html`.
- Wired study-plan entry points from:
  - `src/client/ReviewMode.js`
  - `src/client/SermonViewer.js`
- Added study-plan overlay precedence in Review, VOTD learning, and Sermon viewers so the study plan renders above devotional content.
- Added study-plan locale strings in:
  - `src/client/i18n.js`
  - `public/locales/en.json`
  - `public/locales/ja.json`
- Verification so far:
  - `node --check src/client/ReviewMode.js`
  - `node --check src/client/VotdLearningMode.js`
  - `node --check src/client/SermonViewer.js`
  - `node --check src/client/i18n.js`
  - `node --check src/server/services/StudyPlanService.js`
  - `node --check src/server/services/StudyPlanGenerationService.js`
  - `node --check src/server/routes/sermon.js`
  - `node --check src/server/models/StudyPlanSource.js`
  - `node --check src/server/models/StudyPlanVariant.js`
  - `node --check src/client/StudyPlanViewer.js`
  - JSON parse check for `public/locales/en.json` and `public/locales/ja.json`
- Next smoke step:
  - browser-verify that the new `Study Plan` button shows on the Review screen and opens the overlay cleanly over both Review and Sermon flows.

2026-05-19:
- Browser smoke passed for the Review-screen Study Plan UI:
  - screenshot with the button visible in the lower-center of the verse screen: `output/web-game/study-plan-smoke-2/shot-0.png`
  - clicking the button opens the full-screen study-plan overlay: `output/web-game/study-plan-open-confirm/shot-0.png`
- Layout adjustment made after the first smoke so the button no longer overlaps the verse text.
- Backend note:
  - the study-plan generation request currently fails upstream because the OpenRouter key is over limit
  - the viewer correctly stays in loading/error flow instead of crashing
- Follow-up TODO:
  - once API capacity is restored, rerun the study-plan smoke to confirm the generated content screen and retry button path

2026-05-18:
- Followed `plans/JapaneseIntegrationPlan.md` with a scoped Japanese-only gameplay integration.
- Added `ja` to both language selectors in `index.html`.
- Loaded both Japanese bundles in `index.html`, with `bible-verses-deepseek-v4-pro.ja-kana.js` after `bible-verses-deepseek-v4-pro.ja.js` so gameplay uses the latest kana-annotated data.
- Wired `game.js` to select `loadSelectedVersesJA()` anywhere verse bundles are chosen by language.
- Extended `src/client/i18n.js` fallback capability data for `ja` and added `quiz.firstKana`.
- Added Japanese locale metadata in `public/locales/ja.json`, including explicit `quizCapabilities`.
- Updated `src/client/QuizManager.js` so Japanese `first_letter` mode uses `quizData.firstKana.candidates` to build kana-answer quizzes instead of Latin-letter generation.
- Added `plans/JapaneseGameplayTestPlan.md`.
- Verification:
  - `node --check game.js`
  - `node --check src/client/QuizManager.js`
  - `node --check src/client/i18n.js`
  - parsed `public/locales/ja.json`
  - verified `bible-verses-deepseek-v4-pro.ja-kana.js` contains `220` verses and `0` missing `firstKana`
  - browser smoke artifact: `output/web-game/japanese-menu-smoke/shot-0.png`
    - main menu rendered with `日本語` selected
  - browser smoke artifact: `output/web-game/japanese-first-kana-puppeteer-3.png`
    - live solo flow reached Japanese gameplay with first-kana prompt visible at the bottom of the canvas
- Residual finding:
  - Japanese gameplay triggered existing `/api/verse-song` reference-format errors because that route still expects non-Japanese verse-reference formatting; this did not block quiz rendering, but song lookup is not fully locale-safe yet

2026-04-01:
- Investigated the new Flash Run / Scripture Maze mode.
- Added explicit canvas pointer controls:
  - on-screen `LEFT/RIGHT/UP/DOWN` buttons
  - tap-to-steer from either the buttons or the maze area relative to the player
  - pointer/touch prompt answering and a one-tap `FIRE` button
- Removed the renderer's per-frame canvas resize/context reset, which was forcing an expensive full canvas reinitialization every frame.
- Tightened demon path selection so demons recover from blocked directions faster and prefer to keep moving instead of dithering at turns.
- Increased default Scripture Maze movement speeds slightly to improve responsiveness after the input fix.

2026-04-01:
- Added a first-draft standalone `Scripture Maze` mode:
  - `src/shared/ScriptureMazeConfig.js`
  - `src/shared/ScriptureMazeEngine.js`
  - `src/client/ScriptureMazeRenderer.js`
  - `src/client/ScriptureMazeLauncher.js`
- Wired the mode into the shell:
  - added script includes in `index.html`
  - added LocalNetwork support for offline scripture-maze runs
- Added one authored mission path:
  - `missions/chapter6-scripture-maze.json`
  - added `chapter6` entry to `missions/chapters.json`
- Remaining TODO:
  - patch `game.js` mode registration and mission launch wiring
  - smoke-test the mission in browser and fix launch/input/render issues

2026-04-01:
- Finished the main app wiring for the first-draft `Scripture Maze` mode:
  - added `ModeManager` registration in `game.js`
  - added mission launch branch in `startMission()`
  - `gameLoop()` now yields while `window.gameMode === 'scriptureMaze'`
- Added focused smoke-test coverage:
  - generic Playwright client run to open Missions:
    - `output/web-game/scripture-maze-missions/shot-0.png`
  - direct mission launch script:
    - `scripts/test-scripture-maze.js`
    - artifacts:
      - `output/web-game/scripture-maze-direct/shot-0.png`
      - `output/web-game/scripture-maze-direct/state-0.json`
- Verified from direct smoke state:
  - mission launches into `mode: "scriptureMaze"`
  - player, demons, prompt node, ammo/progress counters, and message all serialize through `render_game_to_text`
  - no browser error artifact file was produced in the smoke run
- Residual issue:
  - headless screenshot still shows stale/transparent shared-canvas visuals behind the maze overlay even after renderer reset attempts
  - state and lifecycle look correct, but the rendered surface still needs follow-up in a real browser/dev loop

2026-04-01:
- Resolved the remaining standalone-mode shell issue for `Scripture Maze`:
  - the stale visuals were not a renderer bug; the fixed-position splash screen was still visible during fast direct mission launches and bleeding into canvas screenshots
  - `src/client/ScriptureMazeLauncher.js` now force-hides `#splashScreen`, `#quickStartOverlay`, and `#votdModal` before taking over the canvas
  - applied the same overlay cleanup in `src/client/WaveGameLauncher.js` so the other standalone mission mode does not regress in the same path
- Verification:
  - `node --check src/client/ScriptureMazeLauncher.js`
  - `node --check src/client/WaveGameLauncher.js`
  - reran `node scripts/test-scripture-maze.js`
  - fresh screenshot `output/web-game/scripture-maze-direct/shot-0.png` now shows only the maze scene with no splash bleed-through

2026-04-01:
- Implemented the compatibility-first mode shell from `plans/ModeManagerImplementationPlan.md`:
  - added `src/client/ModeManager.js`
  - loaded it from `index.html`
  - registered `menu`, `soloDungeon`, `wave`, `overland`, and `review` in `game.js`
  - routed the main shell launches through `ModeManager.start(...)` while keeping `window.gameMode` as a compatibility mirror
  - forwarded resize handling through `ModeManager.handleResize(...)`
  - added `startReviewModeManaged(...)` so review launches use the manager instead of ad hoc direct calls
- Added compatibility adoption hooks for legacy-owned transitions:
  - `src/client/ReviewMode.js` now adopts `review` on enter and `soloDungeon` on return-to-game
  - `src/client/WaveGameLauncher.js` now adopts `wave` on start and `menu` on stop
- Added focused browser validation script:
  - `scripts/test-mode-manager-smoke.js`
- Verification:
  - `node --check game.js`
  - `node --check src/client/ModeManager.js`
  - `node --check src/client/ReviewMode.js`
  - `node --check src/client/WaveGameLauncher.js`
  - `node --check scripts/test-mode-manager-smoke.js`
  - browser smoke `node scripts/test-mode-manager-smoke.js`
  - artifacts under `output/web-game/mode-manager-smoke/`
  - verified managed transitions:
    - menu -> `menu`
    - solo launch -> `soloDungeon`
    - overland launch -> `overland`
    - review launch/return -> `review` then back to `overland`
    - wave mission launch -> `wave`
    - wave menu leave -> back to `overland`
- Residual note:
  - the review-mode screenshot still shows the green combat tip toast carried over from dungeon gameplay; this looked pre-existing and was not addressed in the mode-manager refactor
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

2026-03-23:
- Fixed the new missions `Wave Assault` branch issues on `feature/wave-assault-mode`.
- Wave mode fixes:
  - stopped implicit auto-fire in `src/client/WaveGameLauncher.js`
    - removed startup auto-fire
    - pointer movement now updates position without forcing `fire=true`
    - mouse/touch only fire while actively pressed
  - sped up the first verse challenge in `src/shared/WaveConfig.js` and `src/shared/WaveGameEngine.js`
    - first quiz now appears after ~4.5s
    - recurring wave quizzes now use a shorter interval than the original 15s delay
  - fixed demon sprite loading for missions-launched wave mode in `game.js`
    - demon asset URLs now resolve from a stable asset base URL
    - added `ensureDemonImagesLoaded()` so wave mode can preload demon sprites even when `init()` has not run
    - wave mission start now loads demon sprites before launching the wave renderer
  - fixed wave quiz data setup for direct missions launch
    - `game.js` now ensures verse data is loaded/exposed to `window.organizedVerses` on the wave mission path
    - `src/client/QuizManager.js` now initializes its local `vQuality` state safely instead of relying on an undeclared global
    - wave mission start now seeds `window.vQuality` from mission qualities when needed
- Verification:
  - `node --check game.js`
  - `node --check src/client/QuizManager.js`
  - `node --check src/client/WaveGameLauncher.js`
  - `node --check src/shared/WaveGameEngine.js`
  - `node --check src/shared/WaveConfig.js`
  - restarted local server via `./restart-server.sh`
  - headless browser smoke via Playwright against `startMission('chapter5', 'wave-01')`
    - final summary file: `output/web-game/wave-assault-smoke/summary.json`
    - no browser console/page errors in final run
    - quiz overlay visibly rendered with real verse content
    - screenshot: `output/web-game/wave-assault-smoke/wave-quiz-window.png`
    - demon sprites rendered as actual art rather than fallback text blocks
    - screenshot: `output/web-game/wave-assault-smoke/wave-after-click.png`

2026-03-23:
- Follow-up wave-assault tuning after commit `748d9a1`.
- Updated the wave quiz interaction in `src/client/WaveGameLauncher.js`:
  - quiz open now cancels active firing and suppresses immediate follow-on pointer clicks
  - each question enforces a 2 second answer lockout before buttons become clickable
  - each quiz pause now asks 2 questions instead of 1
  - answer format changed from obvious missing-word options to 6-letter first-letter choices
  - quiz progress now shows `Question 1 / 2` and `Question 2 / 2`
- Added a failed-quiz weapon lockout in `src/shared/WaveConfig.js` and `src/shared/WaveGameEngine.js`:
  - constant `QUIZ_FAIL_FIRE_LOCKOUT_MS = 15000`
  - incorrect quiz answers now disable firing for 15 seconds
  - engine state now carries remaining `fireDisabledMs`
- Verification:
  - `node --check src/client/WaveGameLauncher.js`
  - `node --check src/shared/WaveGameEngine.js`
  - `node --check src/shared/WaveConfig.js`
  - direct local engine check confirmed:
    - incorrect answer sets ~15s fire lockout
    - projectiles do not spawn while locked
    - projectiles resume after lockout expires
  - headless browser smoke captured under `output/web-game/wave-assault-quiz-v2/`
    - summary: `output/web-game/wave-assault-quiz-v2/summary.json`
    - initial buttons disabled during lockout
    - 6 answer buttons rendered
    - first correct answer advanced to `Question 2 / 2`
    - second stage started locked again for the enforced delay
    - overlay closed after the second correct answer

2026-03-13:
- Added a first pass at optional level bosses.
- Documented the design in:
  - `docs/plans/ONBOARDING_CLARITY_PLAN.md`
  - `plans/CombatAffinitySystem.md`
- Level config now defines one boss per level from the existing demon roster.
- Bosses now:
  - spawn near a safe map corner
  - use `guard` behavior
  - have `3x` health
  - have `1.5x` damage
  - have `1.5x` width and height
  - do not count toward `monstersToKill`
  - award a large XP bonus on kill
- Updated monster movement collision checks to respect per-monster width/height so oversized bosses do not move as if they were normal-size.
- Updated renderer and kill feedback so bosses are visibly labeled and boss kills show a larger reward message.
- Verification pending:
  - syntax checks
  - browser smoke to confirm corner spawn and boss rendering

2026-03-12:
- Added a contextual combat struggle hint:
  - tracks hits taken from the same demon without dealing damage back
  - after 2 hits, shows a floating hint above the player: `Flee and Learn` + the best counter-category for that demon
  - resets on successful damage and expires automatically after a short duration
- Added `LevelConfig.getBestCategoryForMonster(monsterType)` so the hint recommends the strongest learnable category from the combat affinity matrix.
- Added renderer support for the floating hint bubble in `src/client/Renderer.js`.
- Added a localhost-only test hook in `game.js`:
  - `window.__combatHintDebug.simulateHits(monsterType, count)`
  - `window.__combatHintDebug.snapshot()`
  - gated to `localhost` / `127.0.0.1` only so it does not expose on production.
- Verification:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/shared/LevelConfig.js`
  - restarted local server via `./restart-server.sh`
  - Playwright smoke still reached gameplay, but the generic client was interrupted by the existing autoplay-audio console error before writing state
  - final deterministic browser verification used the localhost-only test hook:
    - confirmed `combatHint` is `null` before simulated pressure
    - confirmed 2 simulated hits produce `combatHint.line1 = "Flee and Learn"`
    - confirmed recommended category was populated (`Courage` in the recorded run)
    - confirmed the canvas actually drew `Flee and Learn` and the category text
    - screenshot: `output/web-game/combat-hint-final-check.png`
    - JSON log: `output/web-game/combat-hint-final-check.json`
- Follow-up UI adjustment:
  - moved the floating combat hint higher above the player and clamped it below the HUD so it is less likely to be crowded out by the onboarding modal
  - increased combat hint text and box sizing substantially so the message is readable during live play

2026-03-12:
- Added direct Reddit Pixel integration without GTM:
  - new `public/reddit-analytics.js`
  - landing pages now load Reddit analytics before `landing-analytics.js`
  - `index.html` now loads Reddit analytics before `src/client/Analytics.js`
  - `src/client/Analytics.js` now emits a one-time Reddit custom event for `start_game_after_landing`
- Local verification:
  - JS parse check passed for `public/reddit-analytics.js`, `public/landing-analytics.js`, and `src/client/Analytics.js`
  - Playwright smoke reached the main app after clicking `/youth-pastors` hero CTA; screenshot artifact at `output/web-game/shot-0.png`
  - Playwright smoke recorded one transient pageerror (`Cannot read properties of undefined (reading 'length')`) during the splash-to-app pass, but a targeted Puppeteer verification of the Reddit path showed no page errors
  - Puppeteer verification with stubbed `window.rdt` confirmed:
    - `/youth-pastors` fires `PageVisit` with `{ audience: "youth_pastors", page_path: "/youth-pastors" }`
    - clicking the landing CTA stores `redditLandingIntent` in `sessionStorage`
    - first `#btnSolo` game start after landing fires one Reddit `Custom` event with `customEventName: "start_game_after_landing"`
    - landing intent is consumed after the event
    - menu hides and canvas shows on game start
- Follow-up TODO:
  - verify in Reddit Events Manager / Pixel Helper against the live pixel, not just the local stub
  - if the transient Playwright pageerror reappears in normal use, capture the stack and fix the underlying script path
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

2026-03-11:
- Reworked the Three Circles pack into a brokenness-first version after reviewing alternative public trainings that start from brokenness rather than God's design.
- Added a new discipleship mission:
  - `jesus-05`
  - `Three Circles: Brokenness to Gospel`
  - backed by `content-maker/packs/three-circles-gospel-conversation.json`
- Verification:
  - mission manifests parse successfully
  - browser screenshot confirms the mission appears in the discipleship list:
    - `output/web-game/three-circles-mission-list.png`
  - browser screenshot confirms the mission starts correctly:
    - `output/web-game/three-circles-mission-start.png`

2026-03-11:
- Added a new discipleship mission for the 411 disciple-making tool:
  - `jesus-06`
  - `411: Why, Who, What, When`
  - backed by `content-maker/packs/411-disciple-making-training.json`
- Verification:
  - mission manifests and pack JSON parse successfully
  - browser screenshot confirms the mission appears in the discipleship list:
    - `output/web-game/411-mission-list.png`
  - direct mission launch reaches gameplay:
    - `output/web-game/411-mission-start.png`
  - note: the captured gameplay screenshot landed before the first question prompt visibly rendered, so only launch into gameplay was confirmed in that artifact

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

2026-03-12:
- Brightened 3D gameplay visuals in `src/client/Renderer3D.js` to favor a high-visibility daylight look over the previous darker dungeon presentation.
- Increased sky and floor brightness, reduced heavy shadowing, lifted wall lighting, and made 3D touch controls easier to read against the brighter scene.
- Created a retrievable backup bundle for the current demon-strike splash:
  - `backups/dcgame/splash-automation-2026-03-12/splash_strike.png`
  - `backups/dcgame/splash-automation-2026-03-12/antigravity-source/`
  - `backups/dcgame/splash-automation-2026-03-12/README.md`

2026-03-12:
- Increased the startup splash visible duration by another 0.5s in `index.html` by moving the fade start from `2500ms` to `3000ms`.
- Kept the downstream menu/VOTD timing aligned by moving the `VotdMenuOverlay` auto-show delay from `3500ms` to `4000ms`.
- Verification:
  - `node --check src/client/Renderer3D.js`
  - restarted app with `./restart-server.sh`
  - Playwright smoke on `http://localhost:3500/?viewMode=3d` clicking `#btnSolo`
  - screenshot confirmed brightened 3D scene: `output/web-game/shot-0.png`
- Fixed a boss melee-range bug: enlarged bosses could block movement at their larger collision radius while combat still used the old fixed 60px range, so they could appear to touch the player without ever engaging. Combat range now scales from the monster width with a small padding.
- Tightened default solo pressure after play feedback: normal/custom balance no longer grants free melee hits without a correct answer, opening spawn density increased to 35%% of max with a floor of 6, and level bosses now use chaser behavior instead of guard so they remain threatening even when the player has ammo.
- Increased level 1 pressure again: faster spawn rate, 50%% more concurrent monsters, and a 50%% larger kill target so the opening level feels active and gives clearer progression. Added HUD text for "Demons to defeat: x out of m". Fixed the lingering free-hit issue by resetting the client melee-no-answer chance to 0.0 between games and by default. Boss speed multipliers are now applied, and bosses were set to 2x speed.
- Removed the last client-side fallback melee hit path. Close-range attacks now only fire when the current answer state is explicitly correct, so normal play cannot chip down demons without learning/answering first.
- Restored probabilistic no-answer melee only for FUN mode. The fallback now requires the server-provided noQuizPenalty flag, so normal mode stays quiz-gated while FUN mode can still land chance-based melee hits without making them guaranteed.
- Rebalanced level 1 pacing again: required kills reduced to 12 so the level stays short even with the denser spawn field. Bosses were made much tougher by doubling the previous boss HP and damage multipliers again (now 6x health, 3x damage relative to normal base stats).

2026-03-13:
- Added a low-risk first-pass onboarding mission instead of changing the core solo loop:
  - new public chapter `chapter0` / `Start Here` at the top of `missions/chapters.json`
  - new mission file `missions/chapter0-start-here.json`
  - mission `intro-01` / `First Victory` uses `open` map, two fixed demons, no random spawns, no level boss
- Kept the core game changes small:
  - `game.js` now routes the menu Solo button through a tiny helper that auto-launches `chapter0/intro-01` only once per browser via `localStorage`
  - standard mission launch now passes through `fixedMonsters`, `randomSpawnsEnabled`, `randomSpawnBudget`, and `disableLevelBoss`
  - `GameConfig`, `LocalNetwork`, and `GameEngine` were updated just enough to honor `disableLevelBoss`
  - `GamePlayerHandler` now skips the default opening monster wave when a mission already defines its own authored encounter
- Verification:
  - `node --check game.js`
  - `node --check src/shared/MissionClient.js`
  - `node --check src/server/missionLoader.js`
  - `node --check src/client/LocalNetwork.js`
  - `node --check src/shared/GameConfig.js`
  - `node --check src/shared/GameEngine.js`
  - `node --check src/shared/GamePlayerHandler.js`
  - JSON parse check for `missions/chapters.json` and `missions/chapter0-start-here.json`
  - Browser smoke after `./restart-server.sh`:
    - Missions view shows `Start Here` first with `First Victory`
    - fresh Solo click launches the authored onboarding encounter instead of the normal opening swarm
    - screenshots:
      - `output/web-game/onboarding-missions/shot-0.png`
      - `output/web-game/onboarding-solo/shot-0.png`
- Follow-up TODO:
  - add one or two mission-specific onboarding prompts if the current first-pass mission still feels too implicit
  - consider a short post-mission return hook that sends the player either to Missions or back to normal solo with clearer "come back" framing

2026-03-13:
- Added onboarding mission v2 first slice:
  - `First Victory` second encounter now includes a guard-style mini-boss (`Fear Guard`) in `missions/chapter0-start-here.json`
  - added mission-specific onboarding guide state in `game.js`
  - added canvas-rendered onboarding highlights/arrows in `src/client/Renderer.js`
- Current onboarding guide flow:
  - initial HUD explainer
  - answer-area guidance after player movement
  - `Learn Verses Here` guidance after first kill while the guard boss remains alive
- Verification:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - mission JSON parse check for `missions/chapter0-start-here.json`
  - browser smoke screenshots:
    - `output/web-game/onboarding-v2-hud/shot-0.png`
    - `output/web-game/onboarding-v2-answer/shot-0.png`
    - `output/web-game/onboarding-v2-answer-2/shot-0.png`
- Follow-up TODO:
  - the existing combat hint can visually overlap with the new onboarding HUD prompt at mission start; consider suppressing the combat hint during the opening onboarding cue window

2026-03-14:
- Fixed learn deeplink session teardown so review mode no longer leaves an active solo session running underneath.
- Added a dedicated gameplay-detach step before deeplink learn review starts and stopped non-game loop player sync from running in review/overland states.
- Verification: node --check game.js
- 2026-03-14: Fixed learn deeplink review startup so it always selects a valid category with verses on first render instead of waiting for a manual category change.
- 2026-03-14: Matched learn-mode startup to category-reselection behavior by forcing an immediate first review render and resetting hasPlayed on entry.
- 2026-03-14: Unified learn-mode startup and category-reselection review reset logic so first render uses the same state initialization path.
- 2026-03-14: Fixed learn-mode blank-screen runtime error by declaring currentReviewVerseIndex inside ReviewMode.js and cache-busting ReviewMode again.
- 2026-03-14: Added explicit review/deeplink cleanup on return-to-menu and before next solo launch to avoid learn-mode state contaminating later starts.
- 2026-03-14: Returning to the main menu now performs a full teardown via showMainMenu(), sets gameMode=menu, stops the live loop chain, and disables canvas pointer events while the menu is visible.
- 2026-03-14: Added explicit menu mode to the main loop and raised menu z-index while hiding/neutralizing the canvas, so returning from learn cannot keep rendering review behind the menu.
- 2026-03-14: Fixed main menu buttons after learn deeplink by initializing menu button listeners for all entry paths, not just the standard menu branch.
- 2026-03-14: When exiting the learn deeplink to overland, the app now strips mode=learn/quality/category from the URL via history.replaceState. Also shortened the HUD copy from "Demons to defeat" to "Demons left" for fit/readability.
- 2026-03-14: Added GA onboarding mission funnel events for Start Here: mission started, move completed, first kill, learn opened, mission finished (complete/failed).
- 2026-03-14: Simplified learn-route music fix by resuming MusicManager on review exit to overland as well as exit back to game.

2026-03-31:
- Updated Wave Assault menu and Cloze behavior:
  - added a wave-mode menu button with `Songs`, `Affinity Help`, `Restart Mission`, and `Leave Mission`
  - `Leave Mission` now returns to overland without awarding mission completion
  - `Restart Mission` re-launches the same wave mission instead of doing a full page reload
  - wave quiz prompt now treats the "2 answers" request as one verse with 2 blanks, answered progressively as `Blank 1 / 2`, `Blank 2 / 2`
- Verification:
  - `node --check src/client/WaveGameLauncher.js`
  - `node --check game.js`
  - local server restart via `./restart-server.sh`
  - headless Playwright smoke captured under `output/web-game/wave-menu-smoke/`
    - `summary.json` shows the new menu items
    - `wave-menu-open.png` confirms the menu is visible in wave mode
  - headless Playwright smoke captured under `output/web-game/wave-cloze-smoke/`
    - `summary.json` shows `Blank 1 / 2` and a single verse with two blanks
    - `wave-quiz.png` confirms the one-verse/two-blank cloze UI rendered with 6 letter choices

2026-05-18:
- Fixed Japanese verse-song lookup for localized references.
- Server change in `src/server/routes/verseSong.js`:
  - added `ja` support to `getLocalizedVerseBundle()`
  - server now loads `bible-verses-deepseek-v4-pro.ja-kana.js` and can resolve Japanese `Reference` values to `EnglishRef` before parsing
- Client change in `src/client/VerseSongService.js`:
  - `_resolveLookupReference()` now also checks `window.allVerses`, so localized refs can still map to `EnglishRef` before `organizedVerses` exists
- Verification:
  - `node --check src/server/routes/verseSong.js`
  - `node --check src/client/VerseSongService.js`
  - local API smoke for `ローマ人への手紙 10:17` in `lang=ja` returned normal queueing instead of `Invalid verse reference format`
  - local DB showed a Japanese verse-song row with `verseReferenceFull: ローマ人への手紙 10:17` and `generationStatus: processing`
- Follow-up TODO:
  - implement a proper per-language song-style layer for live `/api/verse-song` generation
  - current language-specific genre/style logic mostly exists only in batch scripts (`generate-korean-songs.js`, `generate-hindi-songs.js`, `generate-indonesian-songs.js`, `generate-zwahili-songs.js`)
  - the live server path still relies on the shared `CategoryStyle` collection, so Japanese category-specific genre defaults need a non-destructive live override mechanism rather than reusing the English/global style table

2026-07-07:
- Investigated the broken `featured/david-01` story mission visuals.
- Found the direct cause in `src/client/StoryMissionRenderer.js`: story combat and combatCollect phases were bypassing the normal sprite pipeline and drawing placeholder circles with demon names.
- Updated `src/client/StoryMissionLauncher.js` to preload the existing player sprite, healing pickup image, and standard demon images for story mode.
- Fixed a launcher/runtime bug uncovered during smoke testing:
  - `StoryMissionLauncher`'s internal emitter now implements `on` and `removeListener` in addition to `emit`
  - without that, story missions failed when entering combat because `StoryMissionEngine._startCombat()` subscribes to `gameEnded`
- Updated `src/client/StoryMissionRenderer.js` so story combat phases now render:
  - the existing `player1-sprite96.png` player sheet instead of a blue circle
  - standard demon icons from `images/monsters/*` instead of red circles with text labels
  - healing pickups via the existing healing sprite when available
  - a lightweight world backdrop/grid so the story arena is readable without fallback placeholder styling
- Added a reusable browser smoke script:
  - `scripts/test-story-visual-smoke.js`
  - launches the story mission directly into `collectStones` and `bossFight` for screenshot verification
- Verification completed:
  - `node --check src/client/StoryMissionLauncher.js`
  - `node --check src/client/StoryMissionRenderer.js`
  - `node --check scripts/test-story-visual-smoke.js`
  - `node test/test-story-mission.js`
- Browser smoke completed outside the sandbox:
  - `node scripts/test-story-visual-smoke.js`
  - screenshots:
    - `output/web-game/story-david-goliath-smoke/collect-phase.png`
    - `output/web-game/story-david-goliath-smoke/boss-phase.png`
  - logs:
  - `output/web-game/story-david-goliath-smoke/errors.json`

2026-07-07:
- Started the safer integrated story migration path without changing live mission behavior.
- Added migration/rollback plan:
  - `docs/storymode/integrated-migration-plan.md`
  - includes phase gates, stop conditions, and rollback patch commands
  - documents the core-loop story pause requirement before deeper story work begins
- Added target regression harness:
  - `scripts/test-david-goliath-integrated.js`
  - default mode expects `featured/david-01` to launch through the core game loop (`gameMode === "game"`)
  - `--expect-legacy-story-mode` verifies the current known state while the standalone story path is still active
  - captures state/screenshots under `output/web-game/david-goliath-integrated/`
- Updated `docs/test-scripts.md` with the new migration regression script and artifact list.
- Verification completed:
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
- Phase 0 artifact confirms current blocker:
  - `output/web-game/david-goliath-integrated/summary.json`
  - `gameMode: "story"`
  - `modeManagerId: "story"`
  - standalone `storyMenuVisible: true`
- Next migration gate:
  - add the generic core-loop story pause/dialogue scaffold behind a disabled flag or debug-only trigger
  - do not route David/Goliath through it until baseline regressions remain green
- Environment note:
  - browser smoke still requires running Chrome outside the sandbox in this environment; in-sandbox Playwright/Chrome launch hit Linux sandbox/crashpad restrictions before app code loaded

2026-07-07:
- Completed Phase 1 of the integrated story migration path: generic core-loop story pause scaffold.
- Added core pause helpers in `game.js`:
  - `enterStoryPause(options)`
  - `exitStoryPause(options)`
  - `isStoryPaused()`
  - `handleStoryPauseClick(x, y)`
  - `advanceStoryPause()`
- Added localhost-only debug hook:
  - `window.__storyPauseDebug.enterDemo()`
  - `window.__storyPauseDebug.advance()`
  - `window.__storyPauseDebug.exit()`
  - `window.__storyPauseDebug.snapshot()`
- Behavior implemented:
  - render loop keeps drawing the normal world
  - LocalNetwork engine stops while story pause is active and restarts on exit
  - movement targets and 3D forward movement are cleared on pause
  - movement/combat/collection processing exits early while paused
  - Enter/Space advances story pause dialogue
  - canvas clicks are consumed by story pause before gameplay controls
  - existing DOM toasts are cleared when story pause opens so dialogue remains unobstructed
- Added renderer support:
  - `Renderer.drawStoryPauseOverlay(storyPause)`
  - story pause suppresses the speed prompt while active
- Added input support:
  - `InputHandler` consumes clicks while `window.isStoryPaused()`
- Added regression script:
  - `scripts/test-story-pause-scaffold.js`
  - artifacts under `output/web-game/story-pause-scaffold/`
- Updated `docs/test-scripts.md` with the story pause scaffold test.
- Rollback patch saved before Phase 1:
  - `/tmp/david-goliath-story-before-phase-1.patch`
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node --check scripts/test-story-pause-scaffold.js`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
- Known baseline issue:
  - `node test/test-game-engine.js` still fails 1 assertion unrelated to Phase 1
  - hidden assertion is `No monsters initially`
  - current engine instantiation already contains one monster before `addPlayer`, so this appears to predate the story pause scaffold
- Next migration gate:
  - Phase 2 should route only the David/Goliath intro dialogue into this core-loop pause system behind an explicit flag
  - do not add stones/puzzle/Goliath choreography in the same phase

2026-07-07:
- Completed Phase 2 of the integrated story migration path: opt-in David/Goliath intro dialogue in the core loop.
- Rollback patch saved before Phase 2:
  - `/tmp/david-goliath-story-before-phase-2.patch`
- Added an explicit integration flag:
  - `localStorage.dcgame_integratedStoryIntro=true`
  - or URL param `?integratedStoryIntro=1`
- Default behavior is unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher when the flag is off
- Flag-on behavior:
  - `featured/david-01` launches through normal Solo/core-loop gameplay
  - mission state is marked with `storyIntegration: "coreLoopIntro"`
  - the collect-combat config is mapped into the normal custom mission config path
  - Samuel intro dialogue opens through `enterStoryPause()`
  - player/gameplay updates pause during dialogue and resume afterward
  - DOM toasts are suppressed while story pause is active so dialogue stays readable
- Updated `scripts/test-david-goliath-integrated.js`:
  - `--expect-legacy-story-mode` verifies the safe fallback path
  - `--enable-integrated-intro` verifies the opt-in core-loop intro path
  - checks story pause state, movement freeze during dialogue, and click-target movement after resume
  - corrected the movement sampler to use the real 2D click-target movement model instead of arrow keys
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/initial.png`
  - `output/web-game/david-goliath-integrated/after-move.png`
- Verification completed:
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check scripts/test-story-pause-scaffold.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js` (required unsandboxed Chromium because in-sandbox Playwright hit sandbox_host_linux)
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issues unchanged:
  - `node test/test-game-engine.js` still fails outside this phase
  - exposed failures in the latest run were `No monsters initially` and a randomized `At least one healing point spawns in a reachable range`
  - direct state check showed the engine has 1 monster immediately after construction; the healing-point assertion depends on the random spawn position
- Next migration gate:
  - Phase 3 should add smooth stones as normal core-loop collectibles behind the same integration flag
  - keep legacy fallback until stones, puzzle, boss, and completion all pass repeatedly

2026-07-08:
- Completed Phase 3 of the integrated story migration path: smooth stones as normal core-loop collectibles.
- Rollback patch saved before Phase 3:
  - `/tmp/david-goliath-story-before-phase-3.patch`
- Default behavior remains unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher while the integration flag is off
- Flag-on behavior added:
  - authored `smoothStone` collectibles are seeded into the normal `gameState.collectibles` array after the LocalNetwork engine starts
  - the stones render through the normal `Renderer.drawCollectibles()` path with a distinct glowing stone style
  - core HUD shows `Smooth Stone: collected / 5`
  - collecting a story stone updates `window.__integratedStoryState`, removes the stone via the normal `collectCollectible` engine path, and does not add `smoothStone` to Armor of God inventory
  - after five stones, integrated story state marks `phaseId: "collectStones"` as `complete: true`
  - no puzzle/boss transition is triggered yet; Phase 4 should attach puzzle pause deliberately
- Updated `scripts/test-david-goliath-integrated.js`:
  - captures `collectibles`, `inventory`, and `integratedStoryState`
  - verifies five stones are seeded in the core loop
  - uses real collision collection by moving the browser player onto each stone
  - verifies counter reaches 5, stones are removed, and inventory is unchanged
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-intro.png`
  - `output/web-game/david-goliath-integrated/after-stones.png`
  - `output/web-game/david-goliath-integrated/after-stones.json`
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue unchanged:
  - `node test/test-game-engine.js` still fails outside this phase; latest run reported `Passed: 43, Failed: 1`
  - previous expanded diagnostics showed the hidden failure can be `No monsters initially`, and a randomized healing-point reachability assertion may also fail depending on spawn position
- Next migration gate:
  - Phase 4 should use the reusable story pause system for the courage cloze puzzle after stones reach 5
  - keep the puzzle behind the same integration flag and keep legacy fallback intact

2026-07-08:
- Completed Phase 4 of the integrated story migration path: courage cloze puzzle through the reusable core story pause.
- Rollback patch saved before Phase 4:
  - `/tmp/david-goliath-story-before-phase-4.patch`
- Default behavior remains unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher while the integration flag is off
- Flag-on behavior added:
  - after the fifth smooth stone is collected, the core game loop enters a `storyPause` of type `puzzle`
  - puzzle content is built from the existing `courageCloze` mission config and localized `story.david.puzzle.prompt`
  - wrong answer keeps the story pause active and shows `Try again`
  - correct answer marks `window.__integratedStoryState.puzzleComplete = true`, records `phaseId: "puzzle"` and `nextPhase: "bossFight"`, and shows Continue
  - Continue exits story pause and resumes normal gameplay
  - Goliath/boss combat is intentionally not spawned in this phase
- Updated renderer:
  - `Renderer.drawStoryPauseOverlay()` now supports both dialogue and puzzle layouts
  - puzzle layout renders answer options as canvas buttons and only shows Continue after a correct answer
- Updated `scripts/test-david-goliath-integrated.js`:
  - verifies puzzle opens after five stones
  - clicks wrong answer (`king`) and verifies pause remains active
  - clicks correct answer (`Lord`) and verifies integrated puzzle state completes
  - clicks Continue and verifies gameplay resumes
  - verifies Phase 4 does not spawn Goliath yet
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-stones.png`
  - `output/web-game/david-goliath-integrated/after-puzzle-wrong.png`
  - `output/web-game/david-goliath-integrated/after-puzzle-correct.png`
  - `output/web-game/david-goliath-integrated/after-puzzle-resume.png`
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue unchanged:
  - `node test/test-game-engine.js` still fails outside this phase; latest run reported `Passed: 42, Failed: 2`
  - previous diagnostics showed hidden failures can be `No monsters initially` and randomized healing-point reachability
- Next migration gate:
  - Phase 5 should spawn Goliath as a normal fixed boss monster only after `puzzleComplete`
  - keep the legacy fallback and integration flag intact until boss victory/completion is proven

2026-07-08:
- Completed Phase 5 of the integrated story migration path: Goliath spawns as a normal core-loop fixed boss monster.
- Rollback patch saved before Phase 5:
  - `/tmp/david-goliath-story-before-phase-5.patch`
- Default behavior remains unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher while the integration flag is off
- Flag-on behavior added:
  - clicking Continue after the completed courage puzzle starts `bossFight`
  - collect-phase demons are cleared before boss phase
  - random spawns are disabled for boss phase
  - `monstersKilled` resets to 0 and `monstersToKill` becomes 1
  - the authored `combatConfig.fixedMonsters` boss entry spawns through `network.engine.monsterManager.spawnFixedMonsters([bossConfig])`
  - integrated story state records `phaseId: "bossFight"`, `nextPhase: "victory"`, `bossStarted: true`, and `boss.label: "Goliath"`
  - Goliath renders through the existing normal demon/boss renderer with boss label and health bar
- Updated `scripts/test-david-goliath-integrated.js`:
  - verifies Goliath appears as `isBoss: true` and `label: "Goliath"`
  - verifies core kill target is 1 in boss phase
  - verifies integrated story state enters `bossFight`
  - captures a visual boss-focused screenshot by moving the test player near Goliath
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-puzzle-resume.png`
  - `output/web-game/david-goliath-integrated/after-boss-focus.png`
  - `output/web-game/david-goliath-integrated/after-boss-focus.json`
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue unchanged:
  - `node test/test-game-engine.js` still fails outside this phase; latest run reported `Passed: 42, Failed: 2`
- Next migration gate:
  - Phase 6 should handle Goliath defeat into victory dialogue and mission completion
  - decide whether to keep only boss or reintroduce authored adds after victory/completion is stable

2026-07-08:
- Completed Phase 6 of the integrated story migration path: Goliath defeat opens David victory dialogue and completes the mission back to overland.
- Rollback patch saved before Phase 6:
  - `/tmp/david-goliath-story-before-phase-6.patch`
- Default behavior remains unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher while the integration flag is off
- Flag-on behavior added:
  - Goliath defeat suppresses the generic game-over modal
  - integrated story state advances to `phaseId: "victory"` and enters a reusable dialogue story pause
  - final victory Continue marks the integrated story mission complete, calls normal mission completion, and returns to overland
  - the overland mission list shows David/Goliath as Completed after the integrated flow finishes
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.json`
- Verification completed:
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/InputHandler.js`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
- Known baseline issue unchanged:
  - `node test/test-game-engine.js` fails outside this phase

2026-07-08:
- Completed Phase 7 of the integrated story migration path: generalized the integration gate naming without changing gameplay behavior.
- Rollback patch saved before Phase 7:
  - `/tmp/david-goliath-story-before-phase-7.patch`
- Default behavior remains unchanged:
  - `featured/david-01` still uses the legacy standalone story launcher while the integration flag is off
- Flag-on behavior changed:
  - preferred opt-in flag is now `localStorage.dcgame_integratedStory=true`
  - preferred URL opt-in is now `?integratedStory=1`
  - mission runtime state now uses `storyIntegration: "coreLoop"`
  - `localStorage.dcgame_integratedStoryIntro=true`, `?integratedStoryIntro=1`, and `--enable-integrated-intro` remain compatibility aliases during migration
  - launch debug state is now exposed as `window.__integratedStoryLaunchState`, with `window.__integratedStoryIntroState` retained as an alias
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-intro.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.png`
  - latest `summary.json` reported `storyIntegration: "coreLoop"`, 36 assertions, 0 failures, and final mode `overland`
- Verification completed:
  - `git diff --check`
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-story`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue unchanged:
  - `node test/test-game-engine.js` still fails outside this phase; latest run reported `Passed: 43, Failed: 1`
- Next migration gate:
  - do not retire standalone story combat yet
  - next safe phase should either promote the integrated path behind a mission-level/config flag or improve core story overlay polish before deleting legacy story code

2026-07-08:
- Completed Phase 8 of the integrated story migration path: mission-level promotion switch with forced legacy rollback.
- Rollback patch saved before Phase 8:
  - `/tmp/david-goliath-story-before-phase-8.patch`
- Default behavior remains unchanged:
  - `featured/david-01` now explicitly has `storyIntegration: "legacy"` in `missions/featured-david-goliath.json`
  - changing that field to `"coreLoop"` is the one-line promotion switch, but it was not flipped in this phase
- Routing behavior added:
  - `storyIntegration: "coreLoop"` routes David/Goliath through the integrated core-loop story director by default
  - `localStorage.dcgame_integratedStory=true` and `?integratedStory=1` still force the integrated route
  - `localStorage.dcgame_forceLegacyStory=true` and `?legacyStory=1` force the standalone legacy story path even when mission config is promoted
  - integrated launch now copies the mission object and sets runtime `storyIntegration: "coreLoop"` without mutating the mission catalog object
  - localhost-only `window.__storyIntegrationMissionOverrides` supports config-promotion regression tests without changing the mission file
- Updated `scripts/test-david-goliath-integrated.js`:
  - added `--simulate-core-loop-config`
  - added `--force-legacy-story`
  - captures `configuredStoryIntegration` in state snapshots
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected after simulated config promotion:
  - `output/web-game/david-goliath-integrated/after-intro.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.png`
  - latest `summary.json` reported `simulateCoreLoopConfig: true`, `storyIntegration: "coreLoop"`, `configuredStoryIntegration: "coreLoop"`, 36 assertions, 0 failures, and final mode `overland`
- Verification completed:
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node -e "JSON.parse(require('fs').readFileSync('missions/featured-david-goliath.json','utf8')); console.log('OK')"`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-story`
  - `node scripts/test-david-goliath-integrated.js --simulate-core-loop-config`
  - `node scripts/test-david-goliath-integrated.js --simulate-core-loop-config --force-legacy-story --expect-legacy-story-mode`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-story-mission.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
  - `git diff --check`
  - `node test/test-game-engine.js` (latest run passed: `Passed: 44, Failed: 0`)
- Next migration gate:
  - run this promoted-config simulation gate at least once more after any cleanup
  - then flip `missions/featured-david-goliath.json` from `storyIntegration: "legacy"` to `"coreLoop"` in a separate promotion phase
  - do not remove standalone story combat until after promoted default behavior has passed repeatedly

2026-07-08:
- Completed Phase 9 of the integrated story migration path: David/Goliath is now promoted to the core-loop story director by default.
- Rollback patch saved before Phase 9:
  - `/tmp/david-goliath-story-before-phase-9.patch`
- Promotion change:
  - `missions/featured-david-goliath.json` now has `storyIntegration: "coreLoop"`
  - a plain `node scripts/test-david-goliath-integrated.js` now validates the full integrated story path without localStorage/URL opt-in flags
  - forced rollback remains available through `localStorage.dcgame_forceLegacyStory=true`, `?legacyStory=1`, or `node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode`
- Updated `scripts/test-david-goliath-integrated.js`:
  - detects runtime `storyIntegration: "coreLoop"` and runs full integrated assertions even with no CLI opt-in flag
  - fails explicitly if `--expect-legacy-story-mode` is requested but the legacy path is not reached
- Updated docs:
  - `docs/test-scripts.md`
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected after the final promoted default run:
  - `output/web-game/david-goliath-integrated/after-intro.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.png`
  - latest `summary.json` reported no opt-in flags, `integratedStoryDetected: true`, `shouldRunIntegratedStoryAssertions: true`, `storyIntegration: "coreLoop"`, 36 assertions, 0 failures, and final mode `overland`
- Verification completed:
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check game.js`
  - `node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('missions/featured-david-goliath.json','utf8')).missions.find(x=>x.id==='david-01'); console.log(m.storyIntegration); if(m.storyIntegration!=='coreLoop') process.exit(1);"`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-story`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-intro`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-story-mission.js`
  - `node test/test-guard-behavior.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-fixed-monster-spawns.js` (first run hit the known spawn-count flake, immediate rerun passed)
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
  - `git diff --check`
- Known baseline issue:
  - `node test/test-game-engine.js` failed twice with the hidden `Passed: 43, Failed: 1` pattern seen earlier in the migration; this is outside the promoted mission path
- Next migration gate:
  - leave standalone story code in place for at least one more cleanup/polish pass
  - next safe phase should remove obsolete opt-in naming or improve integrated story overlay polish, not delete the legacy story combat loop yet

2026-07-08:
- Completed Phase 10 of the integrated story migration path: story pause overlay readability polish and small naming cleanup.
- Rollback patch saved before Phase 10:
  - `/tmp/david-goliath-story-before-phase-10.patch`
- Overlay polish:
  - story pause now darkens the full lower interaction area, so quiz prompts/buttons behind the overlay no longer compete with story content
  - dialogue overlay height is increased for better separation from bottom UI
  - puzzle overlay remains large enough for options while scrubbing underlying gameplay UI
  - compact phase badges were added:
    - `Story Moment`
    - `Courage Check`
    - `Victory`
    - future labels for `Gather Stones` and `Face Goliath`
- Naming cleanup:
  - removed the unused `isIntegratedStoryIntroEnabled()` helper from `game.js`
  - kept legacy aliases `dcgame_integratedStoryIntro`, `?integratedStoryIntro=1`, and `--enable-integrated-intro` functional for rollback compatibility
- Updated docs:
  - `docs/storymode/integrated-migration-plan.md`
- Browser artifacts inspected after promoted default run:
  - `output/web-game/david-goliath-integrated/after-puzzle-wrong.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - latest `summary.json` reported 36 assertions, 0 failures, `integratedStoryDetected: true`, and final mode `overland`
- Verification completed:
  - `node --check src/client/Renderer.js`
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-story-mission.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue:
  - `node test/test-game-engine.js` still hit the hidden `Passed: 43, Failed: 1` intermittent pattern seen earlier in the migration
- Next migration gate:
  - keep legacy story combat in place for now
  - next safe phase is to extract the integrated story director out of `game.js` behind identical tests, or run another promoted-default soak before removing legacy code

2026-07-08:
- Completed Phase 11 of the integrated story migration path: extracted pure core story director helpers out of `game.js`.
- Rollback patch saved before Phase 11:
  - `/tmp/david-goliath-story-before-phase-11.patch`
- Extraction boundary:
  - new `src/client/CoreStoryDirector.js` owns pure mission logic:
    - forced legacy / integrated override flag handling
    - localhost-only mission override for regression tests
    - David/Goliath mission detection
    - collect-combat config building
    - intro/puzzle/victory pause option builders
    - smooth-stone collectible seed building
  - `game.js` still owns stateful game-loop wiring:
    - story pause state
    - engine start/stop during pause
    - integrated story state mutation
    - collectible mutation
    - boss phase mutation
    - mission completion and overland return
  - `index.html` now loads `CoreStoryDirector.js` before `game.js`
- Browser artifacts inspected after the final promoted default run:
  - `output/web-game/david-goliath-integrated/after-puzzle-wrong.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/david-goliath-integrated/after-victory-complete.png`
  - latest `summary.json` reported 36 assertions, 0 failures, `integratedStoryDetected: true`, and final mode `overland`
- Verification completed:
  - `node --check src/client/CoreStoryDirector.js`
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js`
  - `node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode`
  - `node scripts/test-story-pause-scaffold.js`
  - `node test/test-story-mission.js`
  - `node test/test-guard-behavior.js`
  - `node test/test-fixed-monster-spawns.js`
  - `node scripts/test-mode-manager-smoke.js`
  - `node scripts/test-start-here-summary.js`
  - `node test/test-game-config.js` (prints existing assertion noise but exits 0)
  - `node /home/michael/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:3500/ --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Known baseline issue:
  - `node test/test-game-engine.js` hit the hidden `Passed: 43, Failed: 1` intermittent pattern seen earlier
- Next migration gate:
  - keep standalone story combat in place
  - next safe extraction is to move stateful integrated story runtime into a small adapter/controller, or run another promoted-default soak before deleting legacy story code

2026-07-08:
- Completed Phase 12 mission-content polish for the integrated David/Goliath path.
- Mission changes:
  - five smooth stones now use explicit authored placements spread across the open map
  - collect-phase guard demons now use five distinct types: `Fear`, `Shame`, `Doubt`, `Confusion`, `Unbelief`
  - `CoreStoryDirector.buildCollectibleSeed()` supports explicit `specialObjects[].placements` with the old generated circular layout preserved as fallback
- Runtime safety:
  - story collectibles are nudged to the nearest nearby clear tile if the random OpenPlains wall layout would place an authored story stone inside generated walls
  - seeded collectibles retain `authoredX`, `authoredY`, and `positionAdjusted` for browser-test/debug visibility
- Regression updates:
  - `scripts/test-david-goliath-integrated.js` now asserts:
    - five story stones remain spread out (`minimumStoneDistance >= 650`)
    - story stones do not collide with generated walls
    - collect phase spawns all five expected guard demon types
  - the same script now captures `stone-1-guard.png` through `stone-5-guard.png` for visual inspection of the guarded stones
  - `test/test-story-mission.js` now checks distinct collect-phase guard types and five explicit stone placements
- Visual artifacts inspected:
  - `output/web-game/david-goliath-integrated/stone-1-guard.png`
  - `output/web-game/david-goliath-integrated/stone-2-guard.png`
  - `output/web-game/david-goliath-integrated/stone-3-guard.png`
  - `output/web-game/david-goliath-integrated/stone-4-guard.png`
  - `output/web-game/david-goliath-integrated/stone-5-guard.png`
  - `output/web-game/shot-0.png` from the standard web-game client mission-menu smoke
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/CoreStoryDirector.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node -e "JSON.parse(require('fs').readFileSync('missions/featured-david-goliath.json','utf8')); console.log('OK')"`
  - `node test/test-story-mission.js`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js`
  - `node test/test-fixed-monster-spawns.js` (first run hit known opening-count flake once; rerun passed)
  - `node test/test-guard-behavior.js`
  - `node "$HOME/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js" --url http://localhost:3500/ --click-selector '#btnMissions' --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1`
- Rollback patch for this phase:
  - save/update current phase diff at `/tmp/david-goliath-story-phase-12.patch`
  - rollback command: `git apply -R /tmp/david-goliath-story-phase-12.patch`

2026-07-08:
- Completed Phase 13 polish for David/Goliath integrated mission structures and boss completion.
- Map/structure changes:
  - `OpenPlains` now generates larger hollow buildings with three-cell doorways instead of narrow one-cell openings
  - added five deterministic enterable landmark structures around the David/Goliath smooth-stone coordinates
  - collect-phase guard demons were nudged deeper inside the landmark structures so 48px monster sprites do not overlap walls
- Boss completion fix:
  - integrated David/Goliath victory now requires an explicit Goliath/boss kill event
  - generic `_endGame('victory')` events during the boss phase are blocked until `bossDefeated === true`
  - the browser regression now verifies that premature victory leaves the mission in `bossFight`, keeps Goliath alive, and does not open the generic game-over modal
- Regression updates:
  - added `test/test-open-plains-structures.js` to assert stone points, guard points, and player-width entrances are clear in OpenPlains
  - `scripts/test-david-goliath-integrated.js` now records `nearWallCount`, `engineEnded`, and an `after-premature-victory` snapshot
  - integrated browser test now asserts stones are inside enterable landmark structures and that victory only starts after a boss kill event
- Visual artifacts inspected:
  - `output/web-game/david-goliath-integrated/stone-1-guard.png`
  - `output/web-game/david-goliath-integrated/stone-4-guard.png`
  - `output/web-game/david-goliath-integrated/after-premature-victory.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
  - `output/web-game/shot-0.png`
- Verification completed:
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check src/shared/map-generators/OpenPlains.js`
  - `node --check test/test-open-plains-structures.js`
  - `node test/test-open-plains-structures.js`
  - `node test/test-story-mission.js`
  - JSON parse check for `missions/featured-david-goliath.json`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js` (42 assertions, 0 failures, 0 console errors, 0 page errors)
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node scripts/test-story-pause-scaffold.js`
  - `node "$HOME/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js" --url http://localhost:3500/ --click-selector '#btnMissions' --actions-json '{"steps":[{"buttons":[],"frames":20}]}' --iterations 1` (only existing module-type warning from the skill package)
- Rollback for this phase:
  - pre-phase file backups: `/tmp/david-goliath-story-phase-13-backup/`
  - targeted phase patch: `/tmp/david-goliath-story-phase-13.patch`

2026-07-08:
- Completed Phase 14 follow-up for reusable rooms, Goliath victory hardening, and Goliath art.
- Documentation:
  - added `rooms-structure.md`
  - documented enterable room sizing rules, 3-cell doorways, clear entry pads, authored object/guard placement rules, and the regression tests to run after room changes
- Victory-condition hardening:
  - added `gameState.requireBossKillForVictory` support in `src/shared/GameEngine.js`
  - David/Goliath boss phase now sets `requireBossKillForVictory = true`
  - engine kill-count victory is ignored while a required boss is still alive
  - premature generic victory events reset the engine-ended state and kill count instead of advancing the story
  - integrated browser regression now checks both:
    - engine kill-count threshold does not end the mission while Goliath is alive
    - direct generic victory is blocked until Goliath is defeated
- Goliath art:
  - generated a new Goliath giant source image using built-in image generation with chroma-key background
  - removed the background locally and saved the final transparent 512x512 sprite:
    - `images/monsters/goliath_giant.png`
  - source chroma image retained for traceability:
    - `output/imagegen/goliath_giant_chroma.png`
  - wired `Goliath` into:
    - `missions/featured-david-goliath.json`
    - `game.js` demon sprite loading
    - `src/client/StoryMissionLauncher.js`
    - `src/shared/LevelConfig.js`
    - `src/shared/entities/MonsterManager.js`
- UI polish:
  - story pause now clears/suppresses combat hints so the generic "A demon is attacking!" prompt cannot cover victory dialogue
- Visual artifacts inspected:
  - `images/monsters/goliath_giant.png`
  - `output/web-game/david-goliath-integrated/after-boss-focus.png`
  - `output/web-game/david-goliath-integrated/after-premature-victory.png`
  - `output/web-game/david-goliath-integrated/after-boss-victory.png`
- Verification completed:
  - `node --check game.js`
  - `node --check src/shared/GameEngine.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check src/shared/LevelConfig.js`
  - `node --check src/shared/entities/MonsterManager.js`
  - `node --check src/client/StoryMissionLauncher.js`
  - `node test/test-open-plains-structures.js`
  - `node test/test-story-mission.js`
  - JSON parse check for `missions/featured-david-goliath.json`
  - alpha validation for `images/monsters/goliath_giant.png`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js` (44 assertions, 0 failures, 0 console errors, 0 page errors)
  - `node test/test-fixed-monster-spawns.js`
  - `node test/test-guard-behavior.js`
  - `node scripts/test-story-pause-scaffold.js` (first run hit a Chrome launch SIGTRAP/crashpad flake; immediate rerun passed)
  - standard web-game Playwright client mission-menu smoke (only existing skill package module-type warning)

2026-07-11:
- Added quest-flow navigation policy for generated quest-step missions:
  - `questFlow.mode: "hub"` remains the default and preserves the choice-screen flow.
  - `questFlow.mode: "continuous"` keeps unlocked objectives in one running maze.
- Converted Armor of God to `continuous`:
  - intro → learnBelt → breastplate/guard active in the maze → learnShoes unlocks after collection, without a hub return.
  - generated guards and collectibles carry their owning step id; locked guards are no longer spawned until their step unlocks.
- AI mission generation review/fix:
  - `generate_ai_mission.js` previously truncated the system prompt at the first nested Markdown fence, omitting later quest-step rules; it now extracts the complete system-prompt section.
- Added browser regression `scripts/test-quest-continuous-coreloop.js` and updated the hub regression to force its legacy flow only inside the test.
- Verification:
  - `node test/test-mission-compiler.js` (145 passed)
  - `node test/test-mission-validator.js` (44 passed)
  - `node scripts/generate_mission.js missions/specs/armor-of-god-01.spec.json --check`
  - `node scripts/test-quest-continuous-coreloop.js` (Chrome; passed, no page errors)
  - `node scripts/test-quest-hub-coreloop.js` (Chrome legacy hub override; passed, no page errors)

2026-07-11:
- Added a persisted Options setting: `Shuffle verse order within each category`.
  - Off by default; saved under `localStorage.randomizeVerseOrder`.
  - When enabled, QuizManager uses one shuffle bag per category: each verse is shown once in randomized order before repeats, and a new cycle avoids immediately repeating its last verse.
- Added `scripts/test-random-verse-order.js` browser regression.
- Verification:
  - `node --check game.js`
  - `node --check src/client/QuizManager.js`
  - prescribed Playwright client game-load smoke
  - `node scripts/test-random-verse-order.js`: setting persisted and selected 8 distinct Faith verses; no page errors.
  - inspected `output/web-game/random-verse-order/01-settings-enabled.png` and `02-gameplay-shuffled.png`.

2026-07-11:
- Added a persisted Options setting: `Automatically generate missing verse songs`.
  - Enabled by default; saved under `localStorage.autoGenerateVerseSongs`.
  - When disabled, existing verse songs still load, while missing songs receive a non-mutating `unavailable` response and fall back to normal background music.
  - Server accepts `generate=false` on `/api/verse-song` and returns before any create, retry, or stale-generation requeue operation.
- Added `scripts/test-verse-song-generation-setting.js` browser regression.
- Verification:
  - `node --check game.js`, `node --check src/client/VerseSongService.js`, and `node --check src/server/routes/verseSong.js`
  - focused Chrome regression passed with no page errors
  - request URLs used `generate=false`; missing test reference had `0` VerseSong records after the test
  - existing Romans 10:17 song returned `ready`
  - inspected `output/web-game/verse-song-generation-setting/01-generation-disabled.png`.

2026-07-11:
- Added first-pass in-maze NPC proximity conversations for generated story missions.
  - Dialogue specs can now opt into `interaction: { trigger: "proximity", radius, once }`.
  - Compiler creates persistent `npcInteractions` with deterministic world placement.
  - Main 2D game loop renders talkable NPCs, shows `Tap NPC or press E` in range, opens dialogue on interaction, and marks one-time conversations complete.
  - Updated the AI mission prompt and DSL schema with the supported JSON shape and authoring guidance.
- Added `scripts/test-npc-proximity-interaction.js` and compiler coverage.
- Verification:
  - `node test/test-mission-compiler.js` (148 passed)
  - `node test/test-mission-validator.js` (44 passed)
  - `node scripts/test-npc-proximity-interaction.js` (Chrome; passed, no page errors)
  - prescribed Playwright client smoke (only existing module-type warning)
  - inspected `output/web-game/npc-proximity-interaction/01-nearby-npc.png` and `02-npc-dialogue.png`.

2026-07-11:
- Strengthened the AI mission generator system prompt to require a compact story arc alongside each playable task:
  - setup/stakes in the intro, a concrete matching objective/win condition, a meaningful middle beat for suitable 3+ room missions, a consequential climax, and a resolved outro.
  - added a copyable `narrative` room + proximity-NPC JSON pattern for optional exploration/story texture.
  - clarified that proximity interactions belong on room dialogue, not automatic intro/outro phases.
- Verification: `node scripts/generate_ai_mission.js "Create a mission where a frightened village needs help" --dry-run` included the new `Story-Driven Mission Construction` and in-maze story beat guidance in the actual system prompt.

2026-07-11:
- Added Ollama Cloud support to `scripts/generate_ai_mission.js`.
  - The script now loads `.env`, accepts `--provider auto|ollama|openrouter`, defaults Ollama missions to `glm-5.2`, and still supports OpenRouter fallback.
  - Added `--max-tokens` so generation budget is explicit.
  - `.env.example` now documents `OLLAMA_API_KEY`.
- Live model check against `https://ollama.com/api/tags` showed `glm-5.2`, `minimax-m2.7`, and newer `minimax-m3` are available.
- Current blocker for live AI mission generation: local `.env` does not yet contain `OLLAMA_API_KEY`.
- Verification:
  - `node --check scripts/generate_ai_mission.js`
  - `node scripts/generate_ai_mission.js --help`
  - `node scripts/generate_ai_mission.js "Create a mission where a frightened village needs help" --provider ollama --dry-run`
  - missing-key path exits cleanly before network call.

2026-07-11:
- Generated and registered the AI story mission `trials-of-grace`.
  - Created `missions/specs/trials-of-grace.spec.json` with continuous quest flow, linked prerequisites, learned verse skills, symbolic collectibles, a mid-story setback, and a Despair boss.
  - Recompiled to `missions/generated/trials-of-grace.json`.
  - Added `trials-of-grace` to `missions/generated.json` and `missions/chapters.json`.
  - Added five 96x96 NPC icon assets under `images/npcs/`: Elder Marcus, Sister Ruth, Brother Timothy, Broken Pilgrim, and Sister Miriam.
  - Adjusted the generated spec so learn/story NPCs compile into six in-maze proximity interactions.
- Verification:
  - `node scripts/generate_ai_mission.js ... --provider ollama --model glm-5.2 --save-spec --out missions/generated/trials-of-grace.json`
  - `node scripts/generate_mission.js missions/specs/trials-of-grace.spec.json --out missions/generated/trials-of-grace.json`
  - JSON parse checks for spec, generated mission, and generated aggregate.
  - `node test/test-mission-validator.js` (44 passed)
  - `node test/test-mission-compiler.js` (148 passed)
  - browser mission-client check confirmed Generated chapter includes `trials-of-grace` and loads it with 16 phases, 6 NPC interactions, and no page errors.
  - browser mission-start smoke loaded `currentMission.id = trials-of-grace` with 6 NPC interactions and no page errors.
  - inspected `output/web-game/trials-of-grace-menu/gameplay-smoke.png`.

2026-07-11:
- Iterated on AI mission pacing after play feedback that the mission felt too slow and sparse.
  - Updated `docs/plans/ai-mission-prompt.md` so future generated continuous quests prefer compact/open maps, quick first action, nearby first objectives, and more visible combat density.
  - Retuned `missions/specs/trials-of-grace.spec.json` from a 4000x4000 labyrinth to a 2200x2200 open map.
  - Moved the first NPC to the center/spawn area and the first guarded collectible directly north of spawn.
  - Increased guarded objective counts so the compiled mission now has 13 spread-out fixed demons instead of 5.
  - Fixed `src/shared/MissionCompiler.js` so `guard.count` spreads fixed monsters inside the room instead of stacking them on one coordinate.
  - Recompiled `missions/generated/trials-of-grace.json` and refreshed `missions/generated.json`.
- Verification:
  - `node scripts/generate_mission.js missions/specs/trials-of-grace.spec.json --out missions/generated/trials-of-grace.json`
  - `node test/test-mission-compiler.js` (148 passed)
  - `node test/test-mission-validator.js` (44 passed)
  - browser mission-start smoke confirmed world `2200x2200`, `mapStyle=open`, 13 fixed monsters, first NPC at `{1100,1100}`, first object at `{1100,400}`, and no page errors.
  - inspected `output/web-game/trials-of-grace-menu/pacing-smoke.png`.
- Rollback for this phase:
  - pre-phase file backups: `/tmp/david-goliath-story-phase-14-backup/`
  - targeted phase patch: `/tmp/david-goliath-story-phase-14.patch`

2026-07-08:
- Completed Phase 15 fix for premature David/Goliath victory during stone collection.
- Root cause:
  - Phase 14 blocked generic kill-count victory only after the boss phase had started.
  - During `collectStones`, the legacy kill-count and level-complete paths could still trigger after guard demons were killed.
- Fix:
  - added `gameState.disableKillCountVictory` support in `src/shared/GameEngine.js`
  - David/Goliath integrated collect phase now sets `disableKillCountVictory = true`
  - boss phase clears the collect lock and relies on `requireBossKillForVictory = true`
  - generic premature victory blocking now applies to the whole active integrated story, not just the boss phase
  - legacy `game.js` level-complete banner/send path now respects `disableKillCountVictory`
- Regression updates:
  - `scripts/test-david-goliath-integrated.js` now forces `monstersKilled >= monstersToKill` during `collectStones`
  - test asserts no generic victory modal, engine does not end, and story remains in `collectStones`
  - captured artifact: `output/web-game/david-goliath-integrated/after-collect-threshold.png`
- Visual artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-collect-threshold.png`
  - `output/web-game/shot-0.png`
- Verification completed:
  - `node --check game.js`
  - `node --check src/shared/GameEngine.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-story` (46 assertions, 0 failures, 0 page errors)
  - `node test/test-story-mission.js`
  - `node test/test-open-plains-structures.js`
  - `node test/test-fixed-monster-spawns.js` (first run hit a spawn-position flake; immediate rerun passed)
  - `node test/test-guard-behavior.js`
  - standard web-game Playwright client mission-menu smoke (sandboxed run hit Chromium sandbox SIGTRAP; escalated rerun passed with only existing skill package module-type warning)
- Rollback for this phase:
  - pre-phase file backups: `/tmp/david-goliath-story-phase-15-backup/`
  - targeted phase patch: `/tmp/david-goliath-story-phase-15.patch`

2026-07-08:
- Completed Phase 16 pacing improvements for David/Goliath.
- Gameplay pacing:
  - David/Goliath now uses a compact `2000x2000` core-loop world instead of the default `3000x3000`
  - smooth stones, guards, NPC positions, Goliath, and boss adds were moved into the smaller arena
  - collect-phase random spawns are disabled so the authored guard encounters carry the pacing
- Guidance:
  - boss phase now periodically shows a flash popup pointing toward Goliath
  - popup text uses directional/banded wording such as `Find Goliath: NORTH (far)`
  - hint starts when the boss phase begins and stops after Goliath is defeated or story victory starts
- Engine/config support:
  - `GameConfig.createFromCustomBalance` now supports per-mission `world` and `constants` overrides
  - `CoreStoryDirector` and `LocalNetwork` pass mission world overrides into the core engine
  - `game.js` movement and camera clamps now use the active engine world size instead of global constants
- Room structure:
  - OpenPlains story landmark rooms now use proportional map positions
  - landmark rooms reserve a clear buffer before placement so random wall clusters cannot block authored entrances
- Regression updates:
  - integrated browser test now asserts the compact `2000x2000` arena
  - integrated browser test now asserts a Goliath direction popup appears in boss phase
  - room structure test now targets the compact David/Goliath coordinates and was run repeatedly to catch random-overlap failures
- Visual artifacts inspected:
  - `output/web-game/david-goliath-integrated/after-boss-focus.png`
  - `output/web-game/shot-0.png`
- Verification completed:
  - `node --check game.js`
  - `node --check scripts/test-david-goliath-integrated.js`
  - `node --check src/shared/GameConfig.js`
  - `node --check src/client/CoreStoryDirector.js`
  - `node --check src/client/LocalNetwork.js`
  - `node --check src/shared/map-generators/OpenPlains.js`
  - `node test/test-story-mission.js`
  - `for i in 1 2 3; do node test/test-open-plains-structures.js || exit 1; done`
  - `./restart-server.sh`
  - `node scripts/test-david-goliath-integrated.js --enable-integrated-story` (48 assertions, 0 failures, 0 page errors)
  - standard web-game Playwright client mission-menu smoke (only existing skill package module-type warning)

2026-07-12:
- Completed mission objective/NPC usability improvements for generated continuous quest missions.
- Gameplay/UI fixes:
  - active mission objectives now produce a runtime task log with active, completed, and locked sections
  - the HUD shows a compact current-task card with progress and directional hints
  - the Goals menu opens a mission-specific log when a mission task log is available
  - NPC interactions are filtered by unlocked objective state, so future NPCs do not clutter the maze
  - NPC conversations tied to unfinished steps can repeat until that step is completed
  - completed-step NPCs are hidden after the objective state changes
  - mission log rendering now takes priority over the first-run speed prompt
- AI mission compiler fixes:
  - generated NPC interactions at the same coordinates are automatically spread apart to avoid icon overwrites
  - dialogue construction accepts narrative/dialogue quest steps as well as explicit NPC learn steps
  - regenerated `trials-of-grace` mission output; Brother Timothy is offset from Elder Marcus instead of overlapping
- Verification completed:
  - `node --check game.js`
  - `node --check src/client/Renderer.js`
  - `node --check src/client/CoreStoryDirector.js`
  - `node --check src/shared/MissionCompiler.js`
  - `node test/test-mission-compiler.js` (148 passed)
  - `node test/test-mission-validator.js` (44 passed)
  - standard web-game Playwright basic play regression (`output/web-game/basic-play-regression-mission-ui/shot-0.png`)
  - scripted Playwright mission regression for `generated/trials-of-grace`, including opening Goals -> Mission Log with no console errors (`output/web-game/trials-of-grace-menu/mission-log-overlay-regression.png`)

2026-07-12:
- Created rollback commit `dd5a166` (`Improve mission guidance and NPC interactions`) before changing combat quizzes.
- Added JSON-driven mission combat quiz policy:
  - hard mode restriction through `combatQuiz.allowedModes`
  - `focusVerseReference` plus configurable `focusVerseTestPercent`
  - progressive leading-word cloze through `progressiveStartCloze.initialWords` and `additionalWordsPerFight`
  - progression resets when the configured mission changes and is capped naturally by verse length
- Configured Trials of Grace for only double-letter (`first_letter`) and cloze questions at 50/50, Hebrews 11:1 at a 70% focus rate, and 2 -> 3 -> 4 -> ... starting-word removal.
- MissionCompiler now preserves `quizSettings` and `combatQuiz` in both room and quest-step missions; MissionValidator rejects invalid percentages, modes, totals, and progression values.
- Updated the AI mission system prompt so future generated specs can author the same policy.
- Added `scripts/test-mission-combat-quiz.js` for real browser coverage of allowed modes, focus sampling, focus reference, and per-fight cloze word counts.
- Verification:
  - `node --check src/client/QuizManager.js`
  - `node --check src/shared/MissionCompiler.js`
  - `node --check src/shared/MissionValidator.js`
  - `node test/test-mission-compiler.js` (152 passed)
  - `node test/test-mission-validator.js` (48 passed)
  - basic Solo Playwright smoke with no new console errors (`output/web-game/mission-combat-quiz-basic/shot-0.png`)
  - mission combat Playwright regression passed with a 70%-configured focus sample and no page errors (`output/web-game/mission-combat-quiz/progressive-cloze.png`)

2026-07-12:
- Refined Trials of Grace mission quiz behavior after playtesting:
  - current-objective card is now neutral grey at 58% opacity so gameplay remains visible behind it
  - progressive cloze fight count is scoped to the active quest task and resets to 1 when the task changes
  - collection tasks explicitly map to the verse taught immediately before them
  - configured collection tasks cannot complete until a guaranteed full cloze of their focus verse is passed
  - player damage is suppressed while the mandatory final focus test is active
  - the task log changes to `Final verse test: <reference>` while the completion gate is pending
- Added Mission JSON/AI prompt fields:
  - `combatQuiz.taskFocusVerseReferences`
  - `combatQuiz.finalFocusVerseTest`
- Browser regression now verifies 1 -> 2 progression within a task, reset to 1 on a new task, task-specific verse selection, pending completion gate, full-verse final cloze, shield protection, and completion after passing.
- Visual artifacts inspected:
  - `output/web-game/mission-combat-quiz/progressive-cloze.png`
  - `output/web-game/mission-combat-quiz/final-focus-test.png`

2026-07-12:
- Fixed mandatory final focus tests being replaced before the player could finish them.
- Root cause: the global 20-second verse rotation interval and other calls to `pickQualityVerse()` remained active during the full-verse final cloze.
- Final focus tests now hold an exclusive quiz lock:
  - timed and event-driven calls to both quiz-picking methods return without changing the quiz
  - repeated task-completion events keep the existing pending test instead of restarting it
  - category picker changes are disabled until the final test ends
  - wrong answers still show feedback and intentionally retry the same final focus test
- Playwright regression simulates 24 forced rotation attempts plus repeated completion events after two words have been answered, and asserts the reference, answer count, and current-word position remain unchanged.

2026-08-15 — low-poly 3D prototype:
- User request: create branch `low-poly-3d`, choose a 3D asset-generation
  pipeline, and begin a phone-friendly true-mesh implementation rather than
  billboard monsters.
- Created and switched to branch `low-poly-3d` while preserving the existing
  dirty worktree and unrelated user files.
- Added `docs/plans/LOW_POLY_3D_TECHNICAL_DESIGN.md` with renderer, coordinate,
  camera, fallback, asset, visual-direction, and mobile performance contracts.
- Selected Tripo image-to-model -> Smart LowPoly -> rig/retarget as the first
  character pipeline to test; Meshy 6 remains the all-in-one alternative.
- Added Three.js 0.185.1 to `package.json`, an ES-module runtime bridge, browser
  import map, and `RendererThreeJS` selection with fallback to `Renderer3D`.
- Added procedural true-3D prototype geometry:
  - third-person chase camera
  - faceted player, demon families, NPCs, healing crosses, collectibles, bullets
  - instanced low-poly walls, solid floor, fog, cheap lighting, blob shadows
  - existing 2D HUD/quiz/menu/mission overlays remain on the transparent canvas
- Added bullet `vx`/`vy` to client state for 3D projectile orientation.
- Added `public/assets/3d/manifest.json` and export conventions with procedural
  fallbacks until generated GLBs pass validation.
- Performance optimization: horizontally merged 11k-12k wall cells into roughly
  300-370 instanced wall runs. Browser samples dropped from ~142k visible
  triangles to ~4k-5.5k, with 28-76 draw calls and 18-19 active monsters.
- Added `window.render_game_to_text` low-poly debug state including positions,
  combat state, renderer revision, draw calls, triangles, and wall counts.
- Verification:
  - `node --check game.js`
  - `node --check src/client/RendererThreeJS.js`
  - `node --check src/shared/entities/BulletManager.js`
  - `node test/game-integration-test.js` completed; it still reports its known
    monster-movement diagnostic warning unrelated to this renderer work
  - Playwright Three.js runs with no page-error file after import-map fix
  - visually inspected captures through the ground and wall-lighting fixes
  - headed WebGL capture confirmed the intermittent blank headless screenshots
    are a capture/compositing artifact; live renderer state remained valid
  - wrapped WebGL and HUD canvases in one responsive relative stack
  - added wall-aware camera distance, spawn-correction snapping, and a higher
    action-RPG camera angle to reduce maze-wall obstruction
  - verified discrete turning (`0 -> 0.524 -> 1.047` radians) and forward
    movement state through Playwright/Puppeteer input
  - default 2D Solo still renders through the new canvas wrapper
  - latest artifacts: `output/web-game/low-poly-3d-headed/`,
    `output/web-game/low-poly-3d-controls-final/`, and
    `output/web-game/low-poly-3d-2d-regression/`
- Next TODOs:
  - load the asset manifest and one GLB while retaining procedural fallback
  - create one Fear concept turnaround, generate 3D candidates, clean/remesh,
    rig, and integrate idle/walk/hit/death clips
  - add camera obstruction handling and projected 2D damage/health feedback
  - verify full answer -> ammo -> fire -> hit -> death -> victory chain
  - profile a 10-minute run on a real mid-range Android device

2026-08-15 — authored low-poly asset pipeline (points 1–7 started):
- Committed the procedural prototype on `low-poly-3d` as `b2c7e9e` (`Start
  low-poly 3D prototype`) using an explicit 11-file allowlist; unrelated dirty
  worktree files were not staged.
- Added Fear v1 art direction, the exact four-view concept prompt, four Tripo
  candidate intents, and a 12-point silhouette/topology/riggability scorecard.
- Added a machine-readable candidate tracker. Generation is waiting for service
  credentials: `TRIPO_API_KEY`, `MESHY_API_KEY`, and `OPENAI_API_KEY` are unset.
- Local cleanup/rig tooling is also unavailable (`blender`, `gltfpack`, and
  `adb` were not found), so no fabricated mesh, rig, or phone result is claimed.
- Added `scripts/validate-low-poly-assets.mjs` to enforce GLB 2.0 structure,
  triangle/material/texture budgets, skin presence, canonical animation clips,
  and no embedded cameras/lights before manifest activation.
- Added manifest-driven GLB loading, skinned-scene cloning, automatic character
  height normalization, canonical clip playback, live fallback-to-authored
  upgrades, and procedural fallback on missing/failed files.
- Added `scripts/test-low-poly-3d-runtime.mjs` and the real-device checklist in
  `docs/plans/LOW_POLY_3D_PHONE_PROFILE.md`.
- Verification:
  - syntax checks passed for runtime, renderer, and validator
  - asset manifest validation passed with four intentional procedural fallbacks
  - headed mission runtime passed with no browser errors or load failures
  - measured 16 draw calls and 7,284 triangles with one Fear monster
  - short software-rendered desktop RAF sample was 22.8 FPS and is not treated
    as the Android result
  - runtime artifact: `output/web-game/low-poly-3d-runtime-budget/result.json`

2026-08-15 — 3D monster visibility diagnosis:
- Reproduced the report in a headed browser on `chapter0/intro-01`, with the
  speed prompt suppressed so the gameplay view could be inspected.
- Fear is spawned and present in both server/debug state and the Three.js scene:
  one visible monster, health 10, with 16–17 draw calls and no browser errors.
- Root cause is camera/UI framing, not spawning or asset loading. At the initial
  player position Fear's center projects above the viewport (`NDC y=1.067`).
  After moving 50 units it projects at `y=0.964`, roughly 11 CSS pixels from the
  top, behind the top HUD/onboarding card; only a purple sliver is visible.
- Forward movement then stops at the maze wall at x=1550, so repeatedly pressing
  forward does not bring the monster farther into view.
- Captures and state: `output/web-game/low-poly-3d-monster-visibility/`.
- Recommended next fix: widen/reframe the chase camera and reserve a top safe
  area for projected enemies/onboarding targets, then test navigation around the
  first wall and a non-tutorial combat mission.

2026-08-15 — 3D monster visibility fix:
- Reframed the Three.js chase camera from a close 58°/120-unit view to a higher
  70°/280-unit action-RPG view (380-unit height) with 180 units of look-ahead.
- Added a restrained 22% focus toward the nearest living monster within 700
  units, excluding enemies substantially behind the player. This keeps combat
  targets in view without snapping the camera directly onto them.
- Added camera target/framing and per-monster projected/on-screen data to
  `render_game_to_text` for deterministic visibility regression checks.
- Strengthened `scripts/test-low-poly-3d-runtime.mjs`: it now suppresses the
  one-time speed prompt and fails when active monsters are outside the viewport
  or underneath the top HUD safe area.
- Headed verification:
  - Fear moved from off-screen `NDC y=1.067` to `y=0.191`, fully visible below
    the onboarding card in the final screenshot
  - player remained safely framed at `y=-0.412`
  - three left turns plus forward movement navigated around the first wall and
    advanced onboarding from `Move here` to the answer tutorial
  - runtime budget passed at 21 draw calls / 7,836 triangles
  - no browser, page, or asset-load errors
  - default 2D renderer still starts with the WebGL canvas hidden
- Artifacts: `output/web-game/low-poly-3d-camera-safe-final/`,
  `output/web-game/low-poly-3d-camera-safe-route/`, and
  `output/web-game/low-poly-3d-camera-safe-2d/`.

2026-08-15 — intermittent 3D blank-screen recovery:
- Reproduced alternating blue/blank composites during headed turn captures.
- Framebuffer instrumentation sampled 277 render frames with active draw calls,
  scene color, and no persistently blank Three.js frame, isolating the issue
  from camera/world generation.
- A retained-drawing-buffer experiment did not eliminate the problem and was
  removed because it costs mobile memory/bandwidth.
- Direct stress diagnostics then caught transient WebGL context loss/restoration
  around compositor pressure. The canvas stayed mounted while its presented
  world buffer disappeared, leaving only the blue canvas background.
- Added explicit `webglcontextlost`/`webglcontextrestored` handling:
  - prevent default so the context can restore
  - immediately hide the invalid WebGL buffer and paint a sky/ground recovery
    frame
  - render the existing software raycast 3D world and HUD on subsequent frames
    while WebGL is unavailable
  - reset the mesh camera and return automatically to true Three.js rendering
    when restoration completes
  - expose loss/restore counts and recovery status in stats/debug state
- Forced-loss verification captured the software maze instead of blue at
  `output/web-game/low-poly-3d-context-recovery/02-recovery-fallback.png`.
- Restoration state passed: `three -> software-3d-recovery -> three`, with
  context counters `losses: 1`, `restores: 1` and canvas visibility restored.
- Turning input remained live during recovery (`viewAngle 0 -> 0.524`) and was
  preserved when mesh rendering resumed.
- Post-fix headed runtime remained under budget at 23 draw calls / 7,356
  triangles, showed Fear and the maze, and had no page or asset errors.
- Default 2D still starts as `Renderer` with the WebGL canvas hidden.

2026-08-15 — stable-perspective WebGL recovery:
- User playtesting identified that the previous recovery was visibly switching
  between the intended third-person 2.5D view and the inherited first-person
  ray-cast renderer. This confirmed that context recovery was firing, but the
  fallback itself introduced a second visual glitch.
- Removed the `super.drawGame(...)` recovery path entirely. The Three.js
  renderer now refreshes a low-frequency cached copy of its latest successful
  2.5D world frame on a dedicated canvas beneath the live HUD.
- During a WebGL interruption the invalid world canvas is hidden and the cached
  2.5D frame is shown; HUD, quiz, overlays, and controls continue updating. On
  restoration, the mesh canvas resumes automatically with the same player view
  angle. No first-person renderer is instantiated or drawn.
- Forced context-loss verification passed:
  - state transition `three -> three-snapshot-recovery -> three`
  - cached frame was fully opaque with substantial scene-color variance
  - recovery screenshot retained the player, Fear monster, maze, and the same
    third-person camera composition
  - turning remained active (`0 -> -0.524` radians) and survived restoration
  - no browser/page errors
- Normal 3D regression passed at 23 calls / 7,752 triangles with Fear on screen,
  no context loss, and no asset failures. Default 2D regression retained the
  `Renderer` class while both 3D canvases stayed hidden.
- Inspected artifacts:
  - `output/web-game/low-poly-3d-snapshot-recovery-forced/02-during-recovery.png`
  - `output/web-game/low-poly-3d-snapshot-recovery-runtime/runtime.png`
  - `output/web-game/low-poly-3d-snapshot-recovery-2d/runtime.png`

2026-08-15 — seamless recovery handoff and non-blocking snapshots:
- Follow-up playtesting reported smaller residual glitches. Two remaining
  renderer timing hazards were identified:
  - the restored WebGL canvas was exposed immediately on the context event,
    before its first complete post-restore mesh frame
  - the 2.5D recovery snapshot was synchronously copied from the GPU every
    500ms, which could itself produce a recurring main-thread/GPU hitch
- WebGL restoration now remains covered by the cached 2.5D layer until a full
  `webgl.render()` call finishes. Only then are the layers swapped, preventing
  the invalid/empty restored buffer from appearing for a frame.
- The initial recovery image is still captured synchronously before active play
  so a fallback is guaranteed. Periodic refreshes now use asynchronous
  `ImageBitmap` copies once per second. Browsers without `createImageBitmap`
  retain the initial valid image instead of performing recurring synchronous
  copies during play.
- Three consecutive forced loss/restore cycles passed. Instrumentation verified
  the recovery layer remained visible before and after every first restored
  render call; final state was 3 losses / 3 restores, live Three.js visible,
  cached layer hidden, turn angle preserved, and no browser errors.
- Normal runtime remained within geometry budgets at 21 calls / 7,776 triangles
  with Fear visible. Default 2D remained on `Renderer` with both 3D layers
  hidden and no errors.
- Inspected artifacts:
  - `output/web-game/low-poly-3d-seamless-handoff-forced/during-recovery.png`
  - `output/web-game/low-poly-3d-seamless-handoff-forced/after-recovery.png`
  - `output/web-game/low-poly-3d-seamless-handoff-runtime/runtime.png`
  - `output/web-game/low-poly-3d-seamless-handoff-2d/runtime.png`

2026-08-16 — idle glitch isolation and live GPU diagnostics:
- User reported that smaller glitches still occurred regularly while completely
  idle. Removed timer-driven recovery updates altogether. The cache now uses a
  signature of player position, view angle, wall revision, and asset revision;
  it performs one async refresh only after a changed view settles for 350ms.
- A 12-second idle audit confirmed zero `createImageBitmap` calls and zero
  recovery-canvas draws. A turn produced exactly one settled async refresh.
- Despite zero snapshot work, the local Chromium context reset repeatedly while
  idle. GPU inspection identified its backend as Vulkan SwiftShader (software).
  Isolation tests then produced the same resets with an empty Three.js scene
  and even after replacing every WebGL render call with a no-op. Therefore the
  local automated browser's reset cadence is independent of this game's scene,
  geometry, movement, and snapshot logic; it cannot establish whether the
  user's real browser has the same software-GPU failure.
- Added opt-in `?debug3d=1` diagnostics on the live HUD showing:
  - LIVE / LOST / RESTORE FRAME state
  - hardware vs software GPU classification and renderer name
  - context loss/restore counts
  - recovery snapshot count and whether the cached layer is visible
- Stats and `render_game_to_text` now retain GPU identity and recent context
  events for evidence-based diagnosis.
- Diagnostic visual inspected at
  `output/web-game/low-poly-3d-live-diagnostics/diagnostics.png`; it correctly
  showed SOFTWARE GPU, two loss/restore cycles, and a stable snapshot count of
  one. Default 2D guard passed with neither 3D canvas instantiated or visible.
- Next required evidence: run the user's actual browser at
  `?viewMode=3d&debug3d=1` and compare the loss count immediately before and
  after a visible glitch. If it increments, choose a software/unstable-GPU
  rendering strategy; if it remains fixed, investigate non-WebGL camera or
  compositor transitions instead.

2026-08-16 — fixed per-frame WebGL context leak (root cause):
- User's DevTools capture confirmed repeated real Three.js `Context Lost` /
  `Context Restored` events in normal idle play.
- Renderer lifecycle tracing found the root cause: `gameLoop()` called
  `getRendererClassForViewMode()` every animation frame. In 3D mode that called
  `RendererThreeJS.isSupported()`, which created a new throwaway WebGL context
  every frame. Chrome eventually exceeded its active-context limit and evicted
  the game context, producing the regular blank/recovery glitches.
- Fixed both ownership boundaries:
  - renderer class selection now occurs only when a renderer must actually be
    instantiated
  - `RendererThreeJS.isSupported()` caches its result, creates only one probe,
    and explicitly releases that probe with `WEBGL_lose_context`
- Added `supportProbeCount` to runtime diagnostics and a regression assertion
  requiring exactly one probe.
- Decisive verification on the same unstable SwiftShader browser:
  - before fix: 8 game-context losses in 12 seconds while idle
  - after fix: exactly two WebGL context creations total (one released probe,
    one game context), with no additional creations and 0 losses / 0 restores
    across 20 seconds idle
  - renderer identity and snapshot count stayed unchanged
  - a screenshot after the idle period also left context counters at zero
- Intentional forced loss still recovered correctly and retained the player's
  `-0.524` turn angle; five subsequent seconds had no spontaneous events.
- Default 2D instantiated `Renderer`, created zero WebGL contexts, kept both 3D
  layers hidden, and reported no errors.
- Inspected artifacts:
  - `output/web-game/low-poly-3d-context-leak-idle/after-20s-idle.png`
  - `output/web-game/low-poly-3d-context-leak-forced/after-forced-recovery.png`

2026-08-16 — visible 3D shots and finer turning:
- Identified why aligned shots caused damage without a visible projectile: the
  3D combat path is intentionally target-based/hitscan and bypasses the shared
  `BulletManager`, so `RendererThreeJS._syncBullets()` had nothing to draw.
- Added a visual-only low-poly energy bolt for accepted 3D shots. It travels
  from the player to the selected monster while preserving the existing damage
  timing, uses unlit shared geometry/materials, automatically expires, and is
  capped at six simultaneous tracers for mobile safety.
- Changed discrete left/right turns from 30 degrees to 15 degrees and made the
  movement code consume `InputHandler3D.turnStep` instead of duplicating a
  hard-coded angle.
- Browser verification confirmed:
  - one right input changed heading from `0` to `0.262` radians
  - an aligned Enter/fire input created one tracer and still reduced monster
    health by 2
  - the tracer automatically returned to zero active objects after travel
  - no console errors and 0 WebGL losses / 0 restores
- The standard web-game client completed gameplay captures for both the turn
  and aligned-fire paths. The older all-in-one low-poly runtime script later
  stalled in its browser harness and was terminated; syntax checks and the
  focused browser regressions passed.

2026-08-16 — continuous turning and first authored CC0 monster:
- Replaced discrete 15-degree turns with frame-rate-independent press-and-hold
  rotation at 120 degrees per second. Keyboard, mouse, and touch all accumulate
  held time; release, cancel, and window blur clear their states. Opposing held
  directions cancel each other.
- Added the zero-cost validation plan at
  `docs/plans/FREE_LOW_POLY_3D_VALIDATION_PLAN.md`, including the 20–30-player
  cohort, fixed activation/mission/D7/control gates, and a $0 pre-validation
  asset and advertising budget.
- Selected Quaternius's CC0 `Ghost_Skull.gltf` as the Fear pipeline proof after
  comparing it with larger demon models. Retained the original source and
  license under `resources/3d-source/quaternius-ultimate-monsters` and added a
  reproducible embedded-glTF-to-GLB converter.
- The authored asset passes its strict gate: 357,116-byte GLB, 3,146 triangles,
  one primitive, one material, one skin, 32x32 texture, canonical idle/walk/
  attack/hit/death clips, and no validator violations.
- Made accepted shots readable above wall depth with a longer-lived unlit 3D
  bolt plus a small projected glow on the interface canvas. Hitscan damage is
  unchanged and tracers remain capped at six and self-clean after travel.
- Final integrated browser regression passed:
  - authored `monster.fear` loaded with no fallback or asset failure
  - 19 or fewer draw calls and roughly 11,000 visible triangles
  - a held turn produced `0.105` radians with exactly `0` release drift
  - one visible tracer accompanied a 2-point hit and cleaned back to zero
  - one cached WebGL support probe, 0 losses / 0 restores, and no browser errors
- Default 2D regression retained `viewMode: 2d`, hid the WebGL canvas, rendered
  normal top-down gameplay, and produced no browser errors.
- Inspected artifacts:
  - `output/web-game/low-poly-3d-authored-ghost-skull-final/runtime.png`
  - `output/web-game/low-poly-3d-authored-ghost-skull-final/projectile.png`
  - `output/web-game/low-poly-3d-2d-regression-current/runtime.png`
- Remaining technical gate: profile on a real phone. Headless Chromium used a
  software SwiftShader GPU and reported about 23 FPS, so it is useful for
  correctness and budget checks but not a representative phone frame-rate
  measurement.

2026-08-17 — three view modes technical design:
- Added `docs/plans/THREE_VIEW_MODES_TECHNICAL_DESIGN.md` for three distinct
  experiences: 2D Classic, the current elevated low-poly 2.5D Adventure mode,
  and a genuine eye-level low-poly 3D First Person mode.
- The design keeps one game state and one Three.js world renderer for both mesh
  modes, with separate camera/input profiles rather than duplicated engines.
- Specified legacy `viewMode=3d` migration to `third-person`, centered
  wall-respecting first-person aiming, local-player mesh hiding, mode-correct
  WebGL recovery, suspense features, mobile performance budgets, diagnostics,
  a seven-phase implementation sequence, and an explicit regression matrix.
- No runtime code changed in this documentation-only step. Next recommended
  deliverable is Phases 1–4: three-mode selection, profile refactor, eye-level
  camera/crosshair, and honest wall-blocked shooting.

2026-08-17 — three view modes implemented:
- Added canonical `2d`, `third-person`, and `first-person` modes to both setup
  selectors and the in-game menu. Legacy `3d` and `2.5d` values migrate to
  `third-person`; `fps` migrates to `first-person`.
- Reused `RendererThreeJS` for both mesh modes with chase and first-person
  profiles. First person now uses a stable eye-level camera, hides only the
  local player, disables automatic monster framing, draws a centered crosshair,
  and uses shorter fog for suspense while retaining readable lighting.
- Added deterministic gameplay-plane ray aiming. First-person shots use the
  center ray, walls beat monsters, misses and wall impacts still produce
  feedback, and 2.5D aim assist can no longer select monsters through walls.
- Added hold-forward/back, simultaneous movement and continuous yaw, mouse and
  touch drag turning, and comprehensive held-input clearing for FPS. Existing
  2D input and 2.5D chase behavior remain separate profiles.
- Made WebGL capability fallback explicit to 2D rather than silently exposing
  billboard monsters. Recovery snapshots include the canonical mode/profile
  and remain visible until a complete restored frame from the same view.
- Added `npm run test:three-views`. It passes selection/migration, 2D isolation,
  unchanged chase-camera behavior, eye-level FPS behavior, no input drift,
  visible hits, wall-blocked shots, and forced context loss/restoration with no
  console or page errors.
- Final compatibility and budget gates pass: `npm run validate:3d`,
  `npm run test:3d-runtime`, and `npm run test:three-views`. The headless FPS
  scene used about 13 draw calls and 7,376 triangles; the 2.5D compatibility
  run used 17 draw calls and 10,158 triangles, both far below hard budgets.
- Remaining external gate: run both mesh modes for ten minutes on a target
  Android phone. Authored positional monster audio remains a later suspense
  polish item because a suitable licensed cue set is not yet in the project.

2026-08-17 — compact mesh-mode navigation controls:
- Committed the completed three-view implementation as `cd8d136` before the
  control-layout change.
- Centralized the drawn and tappable 3D control geometry in
  `get3DControlLayout()` so rendering and input always use identical bounds.
- Reduced 2.5D controls from the previous 64 px minimum to a 48–66 px compact
  range. First-person controls use a separate 58–76 px range because they are
  hold-to-move/turn targets and need more touch area.
- Bumped the affected client cache versions and restarted the local server.
- The standard web-game client ran both mesh modes, and the full three-view
  regression passed after exercising the resized 2.5D turn control and the
  first-person forward press/release path. Visual captures confirm more of the
  verse remains unobstructed with readable button glyphs and labels.

2026-08-18 — GPT-Image-2 references and first Tripo character pipeline:
- Generated two persistent GPT-Image-2 reference candidates for all 18 enemy
  types under `output/imagegen/demon-reference-candidates-gpt-image-2`, with
  contact sheets, the exact prompts, and a shortlist. Selected `fear-b.png` for
  the first end-to-end asset proof.
- Tripo H3.1 image-to-model produced a visually strong 40.33 MB Fear demon
  source for 30 credits. Smart retopology cost another 30 credits and produced
  a 2.99 MB textured GLB with 14,914 triangles; both source and retopologized
  outputs were downloaded immediately under `output/tripo`.
- Both high- and low-poly outputs passed Tripo's free riggability check as
  `biped`. Added resumable V3 generation, retopology, rigging, animation,
  topology-diagnostic, and GLB-analysis scripts under `scripts/`.
- Four rig attempts are recorded with task IDs in the output folder. The first
  three reached 99% and failed at Tripo's 20-minute service limit with error
  2018, consuming zero credits. This included both the legacy biped rigger and
  v2.5, so the failure was not a local polling or download problem.
- Local topology diagnostics found the retopologized GLB had 31 disconnected
  components, 131 boundary edges, and 22 non-manifold edges, though it had no
  invalid values, bad indices, degenerates, or duplicates. Created and visually
  checked a cleaned derivative with one component, zero non-manifold edges, and
  14,468 triangles; the full wings, horns, claws, texture, and silhouette remain
  intact in `rigged-and-animated/deformation-test/static-cleaned/shot-0.png`.
- Uploaded the cleaned GLB directly to bypass task-to-task resolution; it passed
  another free biped rig-check. Its v2.5 rig task remains a saved cloud task and
  can be queried without keeping a local poller open.
- Research conclusion: Tripo officially defines error 2018 as model complexity,
  not export compression. Tripo's game-ready recipe recommends P1 at a 5,000
  face limit. Adobe's Mixamo requirements specifically warn that large wings,
  tails, and other extra appendages can defeat a humanoid auto-rigger and call
  for a clean connected A/T-pose with clearly separated limbs.
- If the cleaned task also fails, do not retry the same asset again. Generate a
  wingless/tail-light A-pose body using Tripo P1 at about 5,000 faces, rig and
  animate the body, and attach simplified wings afterward as separate rigid or
  lightly skinned accessories. Then run the deterministic Three.js deformation
  viewer at quarter-cycle poses for idle, walk, attack, hit, and death.

2026-08-18 — proven P1 human player rig and Luna handoff:
- Used the built-in OpenAI image-generation tool to create a clean default-player
  A-pose reference matching the existing blue/gold palette. The permanent image
  and exact prompt are under `output/imagegen/player-rig-ready`.
- Tripo P1 generated the textured player at the strict 5,000-face ceiling in
  about ninety seconds: 4,976 triangles, one mesh/primitive/material, three
  texture images, 0.91 MB, and 50 credits. No separate retopology was required.
- The free check returned biped. Tripo v2.5 rigging succeeded for 25 credits and
  produced a 1.05 MB GLB with one skin and 28 joints.
- Five in-place animations succeeded for 50 credits and arrived in one 2.24 MB
  GLB: idle, walk, slash, hurt, and fall. Each clip targets 29 nodes through 87
  channels. `scripts/analyze-tripo-animation-glbs.mjs` records exact durations.
- Ran the standard web-game Playwright client through 20 deterministic poses
  (five clips at 0/25/50/75%). Every pose passed structural/browser checks with
  no console errors. Visual contact-sheet inspection found no detached limbs,
  collapsing, tearing, or exploding vertices.
- Gameplay caveat: `preset:hurt` is a dramatic airborne 13.875-second sequence,
  and `preset:slash` is 6.625 seconds. Deformation passes, but integration should
  trim or speed these rather than playing the full clips for routine events.
- Corrected rig-script accounting to sum each task's own `credits_consumed`
  instead of using the shared account balance delta, which is invalid when
  concurrent demon/player tasks freeze or consume credits. Recovery now reuses
  already-downloaded outputs and writes a final summary without resubmission.
- The cleaned/direct-upload Fear demon rig also succeeded in the background.
  Its five-clip animation task remains recorded for immediate download/testing;
  wing deformation needs an especially strict visual review.
- Added `docs/plans/LUNA_3D_ASSET_PIPELINE_RUNBOOK.md` with exact commands, paths,
  task IDs, credit guards, recovery rules, deformation gates, demon lessons,
  and the integration boundary. Luna can handle the repeatable pipeline; novel
  failures and final subtle visual judgment should be escalated to Terra/Sol.
- Recovered the completed Fear animation task with the corrected accounting:
  6.95 MB, 14,468 triangles, one skin, 88 joints, five clips, and 267 channels
  per clip. All 20 browser poses passed. Contact-sheet review shows coherent
  wing folding and sweeping without detached geometry or explosive stretching.
  Treat this as a featured/boss asset pending real-phone profiling, not the
  baseline for many simultaneous ordinary monsters.

2026-08-18 — authored runtime integration and two additional demons:
- Copied the validated animated player and Fear GLBs into
  `public/assets/3d/models/` and enabled them through the runtime manifest.
- Generated Doubt from `doubt-b.png` and Condemnation from
  `condemnation-b.png` with Tripo P1 at the 5,000-face limit. Doubt is 5,126
  triangles / 2.16 MB animated; Condemnation is 4,914 triangles / 2.65 MB.
- Both passed the free biped check, v2.5 rigging, five-clip animation retarget,
  and all 20 deterministic deformation poses with no browser errors. Contact
  sheets are saved under each character's `deformation-test/animated` folder.
- Enabled `monster.doubt` and `monster.condemnation` in the manifest alongside
  `monster.fear`; Tripo's `preset:*` clips are normalized by the validator to
  the game's canonical idle/walk/attack/hit/death roles.
- Runtime browser verification confirmed all four authored assets load with no
  asset failures in third-person and first-person modes. The existing three
  view-mode, firing, wall-blocking, and WebGL recovery regression passed.
- Tripo balance after the two new characters: 490 credits. Next gate is
  real-phone profiling and then integrating more enemy types in batches.

2026-08-18 — Fear facing correction:
- In the live 2.5D view, the authored Fear mesh was presenting its side because
  its local forward axis differed from the renderer's +Z contract. Added a
  Fear-only `rotationY` correction of 1.5708 radians in the runtime manifest.
- A controlled browser close-up now shows Fear presenting its front toward the
  player. The full three-view regression passed again with no browser errors.
- Other simple-looking demons are the remaining demon types without authored
  GLBs; they still use the documented procedural fallback until their own
  reference-to-P1-to-rig pipeline is completed.

2026-08-18 — first-person demon identification cue:
- Added a compact first-person target label below the crosshair, showing the
  demon type and current health when the line-of-sight aim resolver identifies
  a visible target (for example, `DEMON: Fear 10/10`).
- The identified type is retained briefly after a successful hit so it remains
  readable even if the target shifts behind cover on the next frame. The cue is
  first-person-only and does not alter 2.5D HUD layout or combat behavior.
- Bumped the RendererThreeJS cache version to `1.13`; syntax and the full
  three-view regression passed with no browser errors.

2026-08-18 — Confusion, Deception, and priority Ignorance batch:
- Generated all three from the prepared GPT-Image-2 candidates with Tripo P1
  at the 5,000-face limit. Their source meshes are 5,149, 5,044, and 4,633
  triangles respectively.
- All three passed biped rig checks, v2.5 rigging, five-clip animation
  retargeting, and 20/20 deterministic deformation poses. Contact sheets are
  saved in each character's `rigged-and-animated/deformation-test/animated`
  folder and show distinct silhouettes and coherent motion.
- Enabled `monster.confusion`, `monster.deception`, and `monster.ignorance` in
  the runtime manifest. Browser smoke tests confirmed each authored key loads
  with no asset failures; the three-view, firing, wall-blocking, and recovery
  regression passed again.
- This batch consumed 375 credits total. Tripo balance is 115 credits; pause
  further generation until phone profiling or a credit top-up.
## 2026-08-18 — Correct authored demon facing axes

- Applied the same +90° local Y-axis correction used for Fear to the remaining authored demon meshes (Doubt, Condemnation, Confusion, Deception, and Ignorance).
- This keeps each generated model's front-facing side aligned with the renderer's player-facing convention while preserving gameplay rotation and animation behavior.
- Low-poly asset validation and the full three-view browser regression both pass.

## 2026-08-18 — Correct Doubt front/back orientation

- Doubt uses the opposite local front axis from the other generated demons, so its manifest correction is `-90°` on Y rather than `+90°`.
