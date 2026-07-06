# Story-Driven Mission — "David & Goliath: Faith Over Fear"

> Plan saved from interactive planning session. Execute on branch `feature/story-mission`.

---

## Confirmed decisions

| Item | Decision |
|---|---|
| Architecture | Hybrid `StoryMissionEngine` owning a `GameEngine` for combat phases |
| Branch | `feature/story-mission` off `main` |
| Mission | David & Goliath (1 Sam 16-17), Faith over Fear, 5 phases |
| Placement | Standalone featured mission, top-center of overland map, visually distinct |
| NPC portraits | Placeholder PNGs (canvas-drawn colored circle + initial) in `images/npcs/`; real art swappable later |
| Sermon link | Yes — closing dialogue "Read devotional" button → `SermonViewer.open({ currentReference: '1 Samuel 17:47' })` |
| Music | Per-phase `phaseTracks` slot in JSON, all `null` for v1; fallback to `MusicManager.playTrack(0)` (existing "Mind of the Spirit"). Zero `MusicManager.js` edits. |
| Localization | Day one. New `story` block in all 9 locale files. **Real Spanish translation in `es.json`**; other 8 locales get English placeholder (matches existing fallback behavior at `i18n.js:235`). |

---

## Architecture (Hybrid)

`StoryMissionEngine` does **not** subclass `GameEngine`. It owns one:

```js
class StoryMissionEngine {
  constructor(emitter, storyConfig, roomId) {
    this.emitter = emitter;
    this.storyConfig = storyConfig;       // mission JSON + phases
    this.phase = 'intro';                 // story state machine
    this.combatEngine = null;             // lazily created for combat phases
    this.storyState = new StoryState(storyConfig);
  }
  start() { this._enterPhase('intro'); }
  stop() { if (this.combatEngine) this.combatEngine.stop(); }
  handleInput(playerId, event, data) { /* route to story UI or combat engine */ }

  _enterPhase(phaseId) {
    // 'intro' | 'collectStones' | 'puzzle' | 'bossFight' | 'victory'
    if (phaseId === 'bossFight') {
      this.combatEngine = new GameEngine(this.emitter, this._buildCombatConfig(), this.roomId);
      this.combatEngine.start();
      // hook into combat end -> _enterPhase('victory')
    } else {
      if (this.combatEngine) { this.combatEngine.stop(); this.combatEngine = null; }
      this.emitter.emit('storyPhase', this.storyState.snapshot());
    }
  }
}
```

This keeps the combat loop untouched (no risk to multiplayer or existing missions) while letting the story layer drive pacing. The `GameEngine` is configured from a **fixed-monster mission config** (Goliath as `isBoss: true`, `behavior: 'guard'`, plus a few Fear/Doubt adds) — exactly the pattern already used by `intro-01` in `missions/chapter0-start-here.json`.

---

## The Mission (David & Goliath) — 5 Phases

| # | Phase ID | Type | Player Action | Biblical Beat |
|---|----------|------|---------------|---------------|
| 1 | `intro` | dialogue | Click to advance Samuel's lines | 1 Sam 16: "The Lord looks at the heart" |
| 2 | `collectStones` | collect | Walk to 5 smooth stones in the field | 1 Sam 17:40 |
| 3 | `puzzle` | puzzle | Cloze: "The battle is the ___'s" (1 Sam 17:47) | Teaching |
| 4 | `bossFight` | combat | Reuse GameEngine; defeat Goliath (Fear boss) + 2 adds | 1 Sam 17 |
| 5 | `victory` | dialogue | David's closing words + "Read devotional" button → SermonViewer | 1 Sam 17:50 |

---

## File plan

### New files (no core engine edits)
- `src/shared/story/StoryMissionEngine.js` — orchestrator + phase state machine; owns a `GameEngine` instance for combat.
- `src/shared/story/StoryState.js` — phase/objective/dialogue-index tracking.
- `src/shared/story/StoryContentProvider.js` — loads `missions/story-david-goliath.json`.
- `src/client/StoryMissionLauncher.js` — mirrors `WaveGameLauncher.js`: render loop, input routing, ModeManager integration, music switching, end-game return.
- `src/client/StoryMissionRenderer.js` — dialogue/portrait/objective-HUD/puzzle rendering; delegates combat frames to existing `Renderer`.
- `src/client/StoryDialogueOverlay.js` — typed-text dialogue box + portrait + "Continue" (and "Read devotional" when `phase.sermonRef` set).
- `src/client/StoryPuzzleScreen.js` — cloze puzzle UI (inline pattern from `WaveGameLauncher.js:407-442`).
- `missions/story-david-goliath.json` — mission definition (schema below).
- `images/npcs/samuel.png`, `images/npcs/david.png` — placeholder portraits.
- `test/test-story-mission.js` — ad-hoc test walking all 5 phases with a mock emitter.

### Existing files modified (surgical, minimal)
| File | Change | ~LOC |
|---|---|---|
| `game.js` | `story` branch in `startMission()` (mirrors `game.js:4136-4185`); `ensureNpcImagesLoaded()` helper (mirrors `game.js:699`); register `'storyMission'` mode in `initializeModeManager()` (mirrors `game.js:1664-1681`) | ~42 |
| `src/client/OverlandRenderer.js` | `drawFeaturedMission()` top-center node + distinct icon + click handling | ~40 |
| `src/shared/MissionClient.js` | Pass `storyPhases, npcs, specialObjects, puzzles, combatConfig, music` through in `missionToGameConfig()` | ~8 |
| `missions/chapters.json` | Add `featuredMissions: [{ id: "david-01", worldId: "featured", nameKey, ... }]` | ~10 |
| `public/locales/en.json` | Add `story.david.*` block (full English copy) | ~25 keys |
| `public/locales/es.json` | Add `story.david.*` block (real Spanish translation) | ~25 keys |
| `public/locales/{hi,hi-rom,id,ja,kr,lg,zw}.json` | Add `story.david.*` block with English placeholder | ~25 keys each |
| `index.html` | Add 5 `<script src=...?v=1.0>` tags; bump `?v=` on modified `game.js`, `OverlandRenderer.js`, `MissionClient.js` | ~12 |

**Untouched:** `GameEngine.js`, `GameLifecycle.js`, `MonsterManager.js`, `CollectibleManager.js`, `MusicManager.js`, `SoundEffects.js`, `Renderer.js`, `QuizManager.js`, `ProgressManager.js`, `WallGrid.js`, `Constants.js`, `LevelConfig.js`.

---

## Mission JSON (final)

```json
{
  "id": "david-01",
  "gameMode": "story",
  "name": "David & Goliath: Faith Over Fear",
  "description": "Anointed by Samuel, gather five stones, arm your heart with the Word, and face the giant.",
  "qualities": ["Faith", "Courage"],
  "mapStyle": "open",
  "xpMultiplier": 1.5,
  "music": {
    "phaseTracks": { "intro": null, "collectStones": null, "puzzle": null, "bossFight": null, "victory": null },
    "fallbackTrackIndex": 0
  },
  "storyPhases": [
    { "id": "intro",         "type": "dialogue", "npcId": "samuel", "i18nLines": ["story.david.intro.1", "story.david.intro.2"], "nextPhase": "collectStones" },
    { "id": "collectStones", "type": "collect", "targetCount": 5, "objectType": "smoothStone", "nextPhase": "puzzle" },
    { "id": "puzzle",         "type": "puzzle",   "puzzleId": "courageCloze", "nextPhase": "bossFight" },
    { "id": "bossFight",      "type": "combat",   "nextPhase": "victory" },
    { "id": "victory",        "type": "dialogue", "npcId": "david", "i18nLines": ["story.david.victory.1", "story.david.victory.2"], "sermonRef": "1 Samuel 17:47", "endMission": true }
  ],
  "npcs": [
    { "id": "samuel", "nameKey": "story.david.npc.samuel", "portrait": "images/npcs/samuel.png", "position": { "x": 1500, "y": 1500 } },
    { "id": "david",  "nameKey": "story.david.npc.david",  "portrait": "images/npcs/david.png",  "position": { "x": 1500, "y": 1500 } }
  ],
  "specialObjects": [
    { "id": "smoothStone", "labelKey": "story.david.object.stone", "count": 5, "spawnArea": { "x": 800, "y": 800, "w": 1400, "h": 1400 } }
  ],
  "puzzles": [
    { "id": "courageCloze", "mode": "cloze", "verseRef": "1 Samuel 17:47", "i18nPrompt": "story.david.puzzle.prompt", "answer": "Lord" }
  ],
  "combatConfig": {
    "monsters": ["Fear", "Doubt"],
    "monsterDamageFactor": 1.1, "monsterSpeed": 5, "playerSpeed": 5,
    "maxMonsters": 6, "monstersToKill": 1, "spawnRate": 999,
    "randomSpawnsEnabled": false, "disableLevelBoss": true,
    "fixedMonsters": [
      { "x": 1500, "y": 600, "demonType": "Fear", "isBoss": true, "label": "Goliath",
        "behavior": { "type": "guard", "patrolRadius": 200 },
        "stats": { "healthMultiplier": 6.0, "damageMultiplier": 3.0, "sizeMultiplier": 1.5 },
        "spawnTrigger": { "type": "immediate", "value": 0 } },
      { "x": 1100, "y": 800, "demonType": "Doubt", "spawnTrigger": { "type": "immediate", "value": 0 }, "stats": { "healthMultiplier": 1.0 } },
      { "x": 1900, "y": 800, "demonType": "Fear",  "spawnTrigger": { "type": "immediate", "value": 0 }, "stats": { "healthMultiplier": 1.0 } }
    ]
  }
}
```

All player-facing strings are `t('story.david.*')` keys. The `t(key, ...args)` API already supports `{0}` substitution (`i18n.js:279-299`).

---

## Localization blocks (new `story` key)

### `public/locales/en.json` — full English
```json
"story": {
  "david": {
    "title": "David & Goliath: Faith Over Fear",
    "description": "Anointed by Samuel, gather five stones, arm your heart with the Word, and face the giant.",
    "npc": { "samuel": "Samuel", "david": "David" },
    "object": { "stone": "Smooth Stone" },
    "intro": {
      "1": "The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart.",
      "2": "You are chosen. Now go — gather five smooth stones from the brook, for the battle ahead is the Lord's."
    },
    "puzzle": { "prompt": "Fill in the blank: 'The battle is the ___'s.'" },
    "victory": {
      "1": "So David triumphed over the Philistine with a sling and a stone — no sword in hand.",
      "2": "Faith over fear. The battle was the Lord's. Walk in that same courage."
    },
    "hud": { "stonesCollected": "Stones: {0} / {1}", "objective": "Objective: {0}" },
    "buttons": { "continue": "Continue", "readDevotional": "Read devotional", "next": "Next" }
  }
}
```

### `public/locales/es.json` — real Spanish translation
```json
"story": {
  "david": {
    "title": "David y Goliat: Fe sobre el temor",
    "description": "Ungido por Samuel, recoge cinco piedras, arma tu corazón con la Palabra y enfrenta al gigante.",
    "npc": { "samuel": "Samuel", "david": "David" },
    "object": { "stone": "Piedra lisa" },
    "intro": {
      "1": "El Señor no mira lo que mira el hombre. El hombre mira lo exterior, pero el Señor mira el corazón.",
      "2": "Eres elegido. Ahora ve — recoge cinco piedras lisas del arroyo, porque la batalla por delante es del Señor."
    },
    "puzzle": { "prompt": "Completa el espacio: 'La batalla es del ___.'" },
    "victory": {
      "1": "Así David triunfó sobre el filisteo con una honda y una piedra — sin espada en la mano.",
      "2": "Fe sobre el temor. La batalla fue del Señor. Camina con ese mismo valor."
    },
    "hud": { "stonesCollected": "Piedras: {0} / {1}", "objective": "Objetivo: {0}" },
    "buttons": { "continue": "Continuar", "readDevotional": "Leer devocional", "next": "Siguiente" }
  }
}
```

### Other 7 locales (`hi, hi-rom, id, ja, kr, lg, zw`)
Same `story.david.*` keys with the English value as placeholder (mirrors `_fallbackStrings` behavior at `i18n.js:235`).

---

## Music integration (no MusicManager changes)

`StoryMissionLauncher` orchestrates per phase:

```js
function _applyPhaseMusic(phaseId) {
  var tracks = (currentMission.music && currentMission.music.phaseTracks) || {};
  var phaseUrl = tracks[phaseId];
  MusicManager.stop();
  if (phaseUrl) {
    MusicManager.playTrackUrl(phaseUrl, false, { loop: true, playbackType: 'track' });
  } else {
    // Fallback: default dungeon track (index 0)
    MusicManager.playTrack((currentMission.music && currentMission.music.fallbackTrackIndex) || 0);
  }
}
```

The JSON has `phaseTracks` per phase (all `null` for v1, meaning fallback is used), and a `fallbackTrackIndex` that defaults to `0` (the existing "Mind of the Spirit" track). Dropping a URL into any `phaseTracks` slot later requires zero code changes.

---

## Sermon link

In the `victory` phase, `StoryDialogueOverlay` renders an extra "Read devotional" button when `phase.sermonRef` is present. Click handler:

```js
if (window.SermonViewer) {
  SermonViewer.open({ currentReference: phase.sermonRef });
}
```

Same pattern as `WaveGameLauncher.js:714-715` opening the song library. No SermonViewer edits needed.

---

## Implementation phases (one commit each)

### A. Scaffolding
1. `git checkout -b feature/story-mission`
2. Add `StoryMissionEngine` skeleton (phase state machine, no-op `_enterPhase`).
3. Add `StoryMissionLauncher` skeleton (render loop, input stubs).
4. Add `story` branch in `game.js:startMission()`.
5. Register `'storyMission'` mode in `initializeModeManager()`.
6. Add `missions/story-david-goliath.json` (intro phase only).
7. Add `story` block to all 9 locale files (English + real Spanish + 7 placeholders).
8. Add 5 `<script ...?v=1.0>` tags in `index.html`.
9. Generate placeholder `images/npcs/samuel.png` + `images/npcs/david.png`.
10. Verify: clicking the featured node logs "StoryMissionEngine: entering phase intro".

### B. Story rendering + collectibles
11. `StoryMissionRenderer`: NPC portrait + typed-text dialogue (`StoryDialogueOverlay`).
12. `StoryState`: dialogue index, advance on click/space.
13. "Collect 5 stones" objective banner + stones-collected HUD.
14. Spawn 5 `smoothStone` special objects on the open map (new `specialObjects` array in story state — **separate from** `gameState.collectibles`, so `CollectibleManager` untouched). Proximity pickup via input handler.
15. `ensureNpcImagesLoaded()` helper in `game.js` (mirrors `ensureDemonImagesLoaded()` at `game.js:699`).

### C. Puzzle phase
16. `StoryPuzzleScreen`: cloze puzzle UI (inline pattern from `WaveGameLauncher.js:407-442`).
17. On correct: emit `puzzleSolved` → advance to `bossFight`.

### D. Combat phase (reuse GameEngine)
18. `_enterPhase('bossFight')`: instantiate `GameEngine` with `missionClient.missionToGameConfig(combatConfig)`.
19. `StoryMissionRenderer` delegates combat frames to `new Renderer(canvas, ctx).drawGame(...)`.
20. Hook `combatEngine.emitter.on('gameEnded', ...)` → advance to `victory`.
21. End-game: call existing `completeMission(3)` + `returnToOverland()` (same as wave mode at `game.js:4160-4165`).

### E. Polish & integration
22. `OverlandRenderer.drawFeaturedMission()` — top-center node, distinct icon, click handling.
23. Music switching via `_applyPhaseMusic()` in `StoryMissionLauncher` (no `MusicManager.js` edits).
24. Sermon link button in `victory` dialogue → `SermonViewer.open({ currentReference: '1 Samuel 17:47' })`.
25. Bump all `?v=` on modified/new scripts in `index.html` per CLAUDE.md.
26. `./restart-server.sh` + manual playtest.
27. `test/test-story-mission.js` — mock emitter, walk all 5 phases, assert transitions + objective completion + puzzle gating + sermon ref present.

---

## Safety
- **Branch isolation** — `main` untouched.
- **No core engine edits** — `GameEngine`, `MonsterManager`, `GameLifecycle`, `CollectibleManager`, `MusicManager` reused as-is; existing missions unaffected.
- **Mode isolation** — `ModeManager.start('storyMission', ...)` auto-stops any other running mode (`ModeManager.js:38-40`).
- **Cache-busting** — every new/modified `.js` gets `?v=` bump (CLAUDE.md rule).
- **Server restart** — `./restart-server.sh` after every code change (never manual kill).
- **Localization gate** — no hardcoded player-facing strings; everything via `t('story.david.*')`.

---

## Key references (file:line)

- Wave dispatch pattern: `game.js:4136-4185`
- Scripture maze dispatch pattern: `game.js:4188-4226`
- ModeManager wave registration: `game.js:1664-1681`
- ModeManager auto-stops prior mode: `src/client/ModeManager.js:38-40`
- Demon image loading: `game.js:680-699` (`ensureDemonImagesLoaded`)
- Cloze puzzle inline builder: `WaveGameLauncher.js:407-442`
- SermonViewer open pattern: `WaveGameLauncher.js:714-715`
- MusicManager API: `src/client/MusicManager.js` (`playTrack`, `playTrackUrl`, `stop`)
- i18n `t()` with `{0}` substitution: `i18n.js:279-299`
- Locale fallback: `i18n.js:235` (`_fallbackStrings`)
- MissionClient.missionToGameConfig: `src/shared/MissionClient.js:99-144`
- Fixed monster spawn pattern: `missions/chapter0-start-here.json:29-70`
- GameEngine constructor + gameState shape: `src/shared/GameEngine.js:43-121`
- GameLifecycle victory/defeat: `src/shared/GameLifecycle.js:19-117`
- CollectibleManager (untouched): `src/shared/entities/CollectibleManager.js`
- ProgressManager.completeMission API: `src/client/ProgressManager.js:114`