# Mission DSL & Schema Specification

**Status:** Specification (not yet implemented)
**Created:** 2026-07-08
**Depends on:** existing mission JSON, StoryMissionEngine, map-generators, GameConfig

---

## Goal

A generation-friendly Mission DSL + deterministic compiler + validator that lets an AI
(or human author) describe a mission at a high level and get back a **safe, playable,
fully-validated** mission JSON that the existing engine can run without bespoke code.

**Non-goal:** AI writing `game.js` or `StoryMissionEngine.js` source code. AI only writes
the high-level spec described here.

---

## Two-Layer Design

```
            (AI / human author writes this)
                         │
                         ▼
                ┌────────────────────┐
                │   Mission Spec      │   ← Mission DSL (this document)
                │   (high-level)      │     theme, objective, rooms, guards,
                └────────────────────┘     puzzles, boss, win condition
                         │
                         ▼
                ┌────────────────────┐
                │  Mission Compiler   │   ← deterministic, no AI in this layer
                │  (placement, coords)│     expands rooms → coordinates,
                └────────────────────┘     guards → fixedMonsters, etc.
                         │
                         ▼
                ┌────────────────────┐
                │  Mission Validator  │   ← rejects impossible/unsafe missions
                │  (schema + safety)  │     asset refs, reachability, win path
                └────────────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │  Mission JSON       │   ← existing schema, consumed by
                │  (engine format)    │     StoryMissionEngine / MissionClient
                └────────────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │  Smoke Test Runner  │   ← optional, runs critical path in a
                │  (headless browser) │     browser before mission is accepted
                └────────────────────┘
```

Only the top layer (Mission Spec) is intended for AI generation. The lower three layers
are deterministic and strict.

---

## Layer 1 — Mission Spec (the DSL)

The DSL is intentionally smaller than the engine's full mission JSON. It uses
**named primitives** instead of raw coordinates. Coordinates are produced by the
compiler, never written by the author.

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | int | yes | `1` |
| `id` | string | yes | URL-safe slug, unique within the chapter/world |
| `name` | string | yes | Display name |
| `description` | string | yes | Short description shown on overland UI |
| `theme` | string | yes | Free-text theme tag (e.g. `"desert rescue"`, `"faith under fire"`) |
| `tone` | enum | no | `adventure` \| `horror` \| `meditative` \| `combat` \| `puzzle`. Default `adventure`. Affects suggested music + palette (compiler may map). |
| `difficulty` | enum | yes | `easy` \| `medium` \| `hard`. Drives compiler's multiplier selection (see Difficulty Mapping). |
| `contentMode` | enum | no | `biblical` \| `secular`. Default `biblical`. In `secular` mode, `verseRef`/`sermonRef`/`qualities` are optional and the compiler must not inject Bible references. |
| `world` | WorldSpec | no | World size + map style. If omitted, compiler chooses based on `rooms.length`. **Note: future work will make this parameterizable; for now the compiler uses fixed defaults.** |
| `objective` | string | yes | One-line natural-language objective shown to the player. Compiler does not parse this; it is display text only. |
| `winCondition` | WinCondition | yes | Structured win condition (see below). |
| `intro` | DialogueSpec | no | Optional opening dialogue phase |
| `rooms` | RoomSpec[] | yes (≥1) | Ordered list of room/encounter definitions |
| `boss` | BossSpec | no | Optional boss encounter appended after `rooms` |
| `outro` | DialogueSpec | no | Optional closing dialogue / victory text |
| `qualities` | string[] | no | Combat affinity categories (e.g. `["Faith","Courage"]`). Required if `contentMode=biblical` and combat uses affinities. |
| `quizSource` | QuizSourceSpec | no | Which verse categories to draw quiz questions from. Default: derive from `qualities`. |
| `i18n` | I18nSpec | no | Localization strings (see below). If omitted, the compiler generates keys from `id` and the validator rejects raw inline text for dialogue. |
| `authorId` | string | no | `system` for built-in, userId for future user missions. Default `system`. |

### WorldSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `size` | enum \| `{width,height}` | no | `compact` (2000×2000) \| `standard` (3000×3000) \| `large` (4000×4000) \| explicit `{width,height}`. Default chosen by compiler based on `rooms.length` (see Sizing Heuristic). **Future: parameterizable.** |
| `mapStyle` | enum | no | `classic` \| `narrow` \| `labyrinth` \| `open` \| `city`. Default `open`. |

### RoomSpec

A room is a self-contained encounter inside the map. The compiler turns each room into
hollow-building geometry + (optional) collectibles + (optional) guard monster(s) +
(optinal) puzzle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique within mission |
| `type` | enum | yes | See Room Types below |
| `position` | enum | no | `nw` \| `n` \| `ne` \| `w` \| `center` \| `e` \| `sw` \| `s` \| `se` \| `auto`. Default `auto` (compiler spreads rooms). |
| `guard` | GuardSpec | no | Guard demon(s) for the room |
| `collectible` | CollectibleSpec | no | Object to collect inside the room |
| `puzzle` | PuzzleSpec | no | Puzzle triggered on entry or on collect |
| `label` | string | no | Display label for the room (e.g. `"Supply Cache"`) |
| `triggerOn` | enum | no | `enter` \| `collect` \| `clear`. When the room's event fires. Default depends on `type`. |
| `combatOverrides` | CombatOverrides | no | Per-room combat tuning merged over difficulty-derived defaults (see GAP-1) |

#### Room Types

| Type | Description | Default `triggerOn` |
|------|-------------|---------------------|
| `supplyCache` | A room with a collectible, optionally guarded | `collect` |
| `ruinPuzzle` | A room with a puzzle (no combat required to advance) | `enter` |
| `combatArena` | A room cleared by defeating its guard(s) | `clear` |
| `bossArena` | Reserved for `boss` field; usually not listed in `rooms` directly | `clear` |
| `narrative` | Pure dialogue room, no combat/collect | `enter` |
| `shrine` | Heals/restores the player on enter; optional small guard | `enter` |

#### GuardSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `demonType` | string | yes | Must be a known demon type (see Asset Registry) |
| `count` | int | no | Default 1 |
| `behavior` | enum | no | `guard` \| `patrol` \| `aggressive`. Default `guard`. |
| `patrolRadius` | int | no | Pixels. Default 140. |
| `stats` | GuardStats | no | Health/damage/size multipliers |

#### GuardStats

| Field | Type | Default |
|-------|------|---------|
| `healthMultiplier` | number | 1.0 |
| `damageMultiplier` | number | 1.0 |
| `sizeMultiplier` | number | 1.0 |

#### CollectibleSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Object id (e.g. `smoothStone`, `waterSkin`) |
| `label` | string | yes | Display label |
| `count` | int | yes | How many to place (e.g. 5 stones) |
| `icon` | string | no | Optional icon path. Falls back to compiler default. |
| `required` | bool | no | If true, all must be collected to advance. Default true. |

#### PuzzleSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique puzzle id |
| `mode` | enum | yes | `cloze` \| `categoryMatch` \| `trueFalse` \| `missingWord` \| `firstLetter` \| `symbolChoice` (symbolChoice is non-verse, secular) |
| `verseRef` | string | cond. | Required when `mode != symbolChoice` and `contentMode=biblical` |
| `prompt` | string | yes | Prompt text (or i18n key) |
| `answer` | string | cond. | Required for `cloze`/`missingWord` |
| `options` | string[] | cond. | Required for `cloze`/`categoryMatch`/`symbolChoice` |

### BossSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `demonType` | string | yes | Must be a known demon type, OR a custom boss name declared in `customBosses` |
| `label` | string | yes | Display label (e.g. `"Goliath"`) |
| `stats` | GuardStats | no | Default `{healthMultiplier: 6, damageMultiplier: 3, sizeMultiplier: 1.5}` |
| `minions` | MinionSpec[] | no | Supporting monsters in the boss arena |
| `required` | bool | no | If true (default), boss must die for victory |
| `combatOverrides` | CombatOverrides | no | Per-boss combat tuning merged over difficulty-derived defaults (see GAP-1) |
| `id` | string | no | Logical boss id for `winCondition.bossId` reference. Default: lowercase `demonType` (see GAP-5) |

#### MinionSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `demonType` | string | yes | |
| `count` | int | no | Default 2 |
| `stats` | GuardStats | no | |

#### CombatOverrides

Optional per-room or per-boss combat tuning. The compiler merges these over the
difficulty-derived defaults. Use this when a room needs different pacing (e.g. slower
monsters in a collection phase) without writing the full engine `combatConfig` block.

| Field | Type | Description |
|-------|------|-------------|
| `monsterDamageFactor` | number | Multiplier on monster damage |
| `monsterSpeed` | number | Monster speed in px/tick |
| `playerSpeed` | number | Player speed in px/tick |
| `maxMonsters` | int | Max concurrent monsters |
| `monstersToKill` | int | Kill count to end combat (compiler sets to 99 for `supplyCache` rooms — see GAP-2) |
| `spawnRate` | int | Spawn interval in **milliseconds** (≥ 1000) |
| `randomSpawnsEnabled` | bool | Default false for story missions |
| `randomSpawnBudget` | int | Max random spawns if enabled |

### WinCondition

The structured win condition. One of:

| `type` | Required fields | Description |
|--------|------------------|-------------|
| `collect` | `objectId`, `count` | Collect N of `objectId` across all rooms |
| `defeatBoss` | `bossId` (optional) | Defeat the mission's boss. `bossId` matches `BossSpec.id` (default: lowercase `demonType`, case-insensitive) |
| `clearRooms` | `count` (optional) | Clear N rooms (combat arenas) |
| `solvePuzzles` | `count` | Solve N puzzles |
| `sequence` | `steps: WinCondition[]` | All steps must pass in order |
| `any` | `steps: WinCondition[]` | Any one step passing wins |

`sequence` is the most common. Example for David & Goliath:

```json
{
  "type": "sequence",
  "steps": [
    { "type": "collect", "objectId": "smoothStone", "count": 5 },
    { "type": "solvePuzzles", "count": 1 },
    { "type": "defeatBoss", "bossId": "goliath" }
  ]
}
```

### DialogueSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `npcId` | string | no | References an NPC in `npcs` (see below) |
| `npcName` | string | cond. | Required if `npcId` omitted (anonymous narrator) |
| `lines` | string[] | yes | 1+ lines of dialogue (raw text OR i18n keys) |
| `portrait` | string | no | Portrait image path |
| `position` | enum | no | Where to place the NPC: same enum as RoomSpec.position. Default `center`. |
| `sermonRef` | string | no | Optional scripture reference to display |
| `endMission` | bool | no | If true, mission ends after this dialogue (for outro) |

> If `npcs` array is not provided, the compiler synthesizes one NPC per dialogue phase.

### QuizSourceSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categories` | string[] | no | Verse categories to draw from (e.g. `["Faith","Courage"]`). If omitted, derived from mission `qualities`. |
| `pool` | string | no | `"local"` \| `"all"`. Default `local` (loaded bible-verses.js). |
| `count` | int | no | Max questions to load. Default 20. |

### I18nSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prefix` | string | no | Key prefix, e.g. `"story.david"`. Default `mission.<id>`. |
| `strings` | object | no | Map of key → localized text. Validator requires either full i18n or none. |

---

## Layer 2 — Mission Compiler (deterministic)

The compiler is a pure function: `compile(spec) → missionJSON`. It MUST be deterministic
given the same input (no `Math.random` for placement; use seeded PRNG keyed off mission
`id` so regeneration is stable).

### Responsibilities

1. **World sizing** — apply `world.size` or fall back to Sizing Heuristic.
2. **Room placement** — convert `RoomSpec.position` to concrete coordinates using the
   Sizing Heuristic, producing non-overlapping hollow-building footprints compatible
   with the chosen `mapStyle`. Reuse `placeHollowBuilding` / `carveClearArea` patterns
   from `OpenPlains.js` (see `rooms-structure.md`).
3. **Guard → fixedMonsters** — expand each `GuardSpec` into one or more `fixedMonsters`
   entries with concrete `x,y`, `behavior`, `stats`, `spawnTrigger: immediate`. Also set
   `guardDemonType` on the matching `specialObjects.placements` entry (see GAP-4).
4. **Collectible → specialObjects** — expand `CollectibleSpec` into `specialObjects[]`
   with `spawnArea` and `placements` (one per `count`), assigning each placement to a
   room's interior.
5. **Puzzle → puzzles[]** — pass through with compiler-default options if author omitted.
6. **Boss → combatConfig** — build a dedicated `combatConfig` block for the boss arena,
   with the boss as the first `fixedMonsters` entry (`isBoss: true`) and minions after.
   `monstersToKill: 1`, `disableLevelBoss: true`, `randomSpawnsEnabled: false`.
7. **Phase graph** — build `storyPhases[]` from `intro` → `rooms` (in order) → `boss`
   → `outro`, wiring `nextPhase` ids. Each room's `triggerOn` determines the phase
   `type` (`collect`/`puzzle`/`combat`/`dialogue`). A `supplyCache` room with a
   `collectible` always produces a `combatCollect` phase with `monstersToKill: 99`
   (endless combat — ends on collect, not kill count — see GAP-2). A `combatArena`
   room produces a `combat` phase with `monstersToKill` = guard count.
8. **Dialogue → storyPhase dialogue** — convert each `DialogueSpec` to a phase with
   `i18nLines`, `npcId`, `sermonRef`, `endMission`. NPC positions are **cosmetic and
   phase-bound**: the compiler places intro NPCs near the player spawn and outro NPCs
   near the boss arena (where the player just won), not at a fixed world position
   (see GAP-3).
9. **Difficulty mapping** — see below. Per-room/per-boss `combatOverrides` are merged
   over the difficulty-derived defaults (see GAP-1).
10. **i18n key generation** — if `i18n.strings` omitted, generate keys under
    `mission.<id>.` and the validator will reject raw inline text. If provided, pass
    through and validator confirms keys match the generated ones.
11. **Music hint mapping** — map `tone` to `music.phaseTracks` placeholders (left null
    until a music asset registry exists).

### Sizing Heuristic (default, used when `world.size` omitted)

| `rooms.length` | `world.size` |
|----------------|--------------|
| 1–3 | `compact` (2000×2000) |
| 4–6 | `standard` (3000×3000) |
| 7+ | `large` (4000×4000) |

> **Future:** the `world` block will gain explicit width/height parameters and a
> `scale` knob. The DSL already accepts `{width,height}` so this is forward-compatible.
> The compiler currently ignores custom values beyond the three presets; that is a
> documented limitation until parameterized map sizes ship.

### Room Placement Algorithm

Given N rooms and a world of size W×H:

1. Divide the world into a 3×3 grid of sectors (nw, n, ne, w, center, e, sw, s, se).
2. For each room with explicit `position`, reserve that sector.
3. Rooms with `position: auto` are assigned to remaining sectors, balanced so no two
   rooms share a sector unless >9 rooms exist (then split sectors).
4. Within each sector, compute a room footprint of `10×10` to `12×12` cells (cell = 25px),
   centered in the sector, leaving ≥4 cells margin to sector boundary.
5. Validate each footprint is wall-clearable using the map generator's `carveClearArea`.
6. Record the building footprint + doorway + interior-center coordinate as the room's
   `placement`. Collectibles go at interior-center; guards go offset ~80px from center
   but ≥2 cells from any interior wall.

### Difficulty Mapping

The compiler maps `difficulty` to a `GameConfig` preset and adjusts `GuardStats`
defaults:

| Spec `difficulty` | Preset | Guard default `healthMultiplier` | Boss default `healthMultiplier` |
|--------------------|--------|----------------------------------|--------------------------------|
| `easy` | `easy` | 0.7 | 4.0 |
| `medium` | `normal` | 1.0 | 6.0 |
| `hard` | `hard` | 1.5 | 9.0 |

Author-supplied `stats` override these defaults.

---

## Layer 3 — Mission Validator

The validator is a pure function: `validate(missionJSON, spec) → ValidationResult`.
It MUST reject any mission the engine cannot safely run. A mission that passes
validation is guaranteed loadable; it is not guaranteed *fun*.

### ValidationResult

```ts
{
  ok: boolean,
  errors:   ValidationError[],   // blocking — mission cannot be used
  warnings: ValidationWarning[]  // non-blocking — quality concerns
}
```

### Validation Checks (blocking errors)

**A. Schema shape**
1. All required top-level fields present and correctly typed (id, name, description,
   objective, winCondition, rooms[]).
2. `schemaVersion === 1`.
3. No unknown room types, puzzle modes, win-condition types, or behaviors.

**B. Asset references**
4. Every `demonType` (guards, boss, minions) exists in the Asset Registry
   (`LevelConfig.ALL_DEMON_TYPES` or `customBosses`).
5. Every `puzzle.mode` is one of the supported QuizManager modes
   (`firstLetter`, `missingWord`, `categoryMatch`, `trueFalse`, `cloze`) or the secular
   `symbolChoice`.
6. Every `puzzle.verseRef` (when present) resolves in the loaded verse corpus.
7. Every `collectible.icon` and `npc.portrait` path, when present, must resolve to an
   existing file under `public/` (or be explicitly marked as a runtime fallback).
8. Every `quizSource.categories` entry exists in the verse category index.

**C. Phase graph integrity**
9. Every `nextPhase` target exists as a phase `id`.
10. No cycles in the phase graph except explicit `endMission` terminations.
11. At least one phase has `endMission: true` OR the graph reaches a terminal node
    that emits `storyEnded`.
12. Every `puzzleId` referenced by a phase exists in `puzzles[]`.
13. Every `objectType` referenced by a `collect`/`combatCollect` phase exists in
    `specialObjects[]`.
14. Every `npcId` referenced by a `dialogue` phase exists in `npcs[]` (or is
    synthesized by the compiler).

**D. Reachability**
15. Every collectible placement coordinate is wall-clear (using `WallGrid.collides`
    with the room's hollow-building geometry).
16. Every guard coordinate is wall-clear using `Constants.MONSTER_WIDTH/HEIGHT`.
17. Every room has at least one doorway ≥ `Constants.PLAYER_WIDTH + 2 cells` wide.
18. The player spawn point (compiler default: world center, or sector `center`) is
    wall-clear and reachable from every room via the generated map (BFS over the
    WallGrid free cells).
19. The boss arena is reachable from at least one room's doorway.

**E. Win path feasibility**
20. For `winCondition.type === 'collect'`: total `count` across all matching
    `specialObjects` ≥ `winCondition.count`.
21. For `winCondition.type === 'defeatBoss'`: a boss with `required: true` exists and
    is placed in a `combatConfig.fixedMonsters` entry with `isBoss: true`.
22. For `winCondition.type === 'solvePuzzles'`: at least `count` puzzles exist and
    are referenced by reachable puzzle phases.
23. For `winCondition.type === 'sequence'`: each step is individually feasible (recurse).
24. For `winCondition.type === 'any'`: at least one step is feasible.
25. **No impossible dead-ends:** the phase graph does not require defeating a monster
    that the win condition does not include unless the phase has a non-combat fallback
    path. (I.e. an optional combat room may be unbeatable, but a *required* combat room
    must contribute to the win condition.)
26. **Victory is achievable:** there exists at least one path through the phase graph
    that satisfies the win condition without requiring impossible combat
    (e.g. `monstersToKill: 1` with no boss and no `fixedMonsters` is impossible).

**F. Combat sanity**
27. For every `combatConfig` / `collectCombatConfig`: `monstersToKill` ≤
    `fixedMonsters.length + (randomSpawnsEnabled ? Infinity : 0)` when
    `randomSpawnsEnabled: false`.
28. `maxMonsters ≥ fixedMonsters.length` (otherwise fixed monsters can never all spawn).
29. `spawnRate` is in milliseconds (≥ 1000). Validator rejects values < 1000 as likely
    seconds/milliseconds confusion (see CLAUDE.md gotcha).
30. No `spawnRate: 0` unless `randomSpawnsEnabled: false` and
    `randomSpawnBudget: 0`.

**G. World bounds**
31. Every coordinate (collectible, guard, boss, NPC) is within `world.width × world.height`
    with ≥ 1 cell margin.
32. Player spawn is within bounds.

### Validation Checks (non-blocking warnings)

W1. Room footprints overlap sector boundaries (placement may look cramped).
W2. More than 6 rooms in a `compact` world (spacing may feel tight).
W3. `boss.stats.healthMultiplier > 10` (likely unwinnable without strong ammo).
W4. `collectible.count > 8` (collectathon fatigue).
W5. No `outro` dialogue (mission ends abruptly).
W6. `i18n` keys present but missing entries for one or more languages in the active
    locale set.
W7. `puzzle.mode` not represented in `quizSource.categories` (may pull unrelated
    verses).
W8. Mission `objective` text mentions an action not represented in `winCondition`
    (cosmetic mismatch).
W9. `world.size` explicitly set to `{width,height}` (forward-compatible but not yet
    honored by compiler beyond presets — see Sizing Heuristic note).

---

## Layer 4 — Smoke Test Runner (optional, recommended)

After validation, run the mission in a headless browser via the existing
Playwright client (`scripts/web_game_playwright_client.js`):

1. Load the mission via a test-only URL param `?mission=<id>&testMode=1`.
2. Advance the critical path: skip dialogue, collect required objects, solve puzzles
   with known answers, defeat the boss with `fun` difficulty preset + cheats.
3. Assert: `storyEnded` event fires with `result: 'victory'` within 60s.
4. Capture console errors; fail on uncaught exceptions.

A mission that fails the smoke test is rejected even if it passed validation.

---

## Asset Registry

The validator needs a single source of truth for what assets exist. Define in a new
file `src/shared/MissionAssetRegistry.js`:

```js
{
  demonTypes: [...LevelConfig.ALL_DEMON_TYPES, /* + customBosses declared in spec */],
  mapStyles: ['classic','narrow','labyrinth','open','city'],
  puzzleModes: ['firstLetter','missingWord','categoryMatch','trueFalse','cloze','symbolChoice'],
  verseCategories: [.../* derived from bible-verses.js */],
  tones: ['adventure','horror','meditative','combat','puzzle'],
  difficulties: ['easy','medium','hard'],
  contentModes: ['biblical','secular']
}
```

Custom bosses declared in `spec.customBosses` are registered per-mission and the
validator accepts them only when listed there.

---

## End-to-End Example

### Spec (AI-generated, non-biblical)

```json
{
  "schemaVersion": 1,
  "id": "desert-rescue-01",
  "name": "Desert Rescue",
  "description": "Find the lost traveler before the sand wraith does.",
  "theme": "desert rescue",
  "tone": "adventure",
  "difficulty": "medium",
  "contentMode": "secular",
  "objective": "Collect 3 water skins, solve the ruin glyph, defeat the sand wraith.",
  "winCondition": {
    "type": "sequence",
    "steps": [
      { "type": "collect", "objectId": "waterSkin", "count": 3 },
      { "type": "solvePuzzles", "count": 1 },
      { "type": "defeatBoss", "bossId": "sandWraith" }
    ]
  },
  "rooms": [
    { "id": "cache-nw", "type": "supplyCache", "position": "nw",
      "collectible": { "id": "waterSkin", "label": "Water Skin", "count": 1 },
      "guard": { "demonType": "Fear", "behavior": "guard" } },
    { "id": "cache-e", "type": "supplyCache", "position": "e",
      "collectible": { "id": "waterSkin", "label": "Water Skin", "count": 1 },
      "guard": { "demonType": "Doubt", "behavior": "patrol", "patrolRadius": 160 } },
    { "id": "cache-s", "type": "supplyCache", "position": "s",
      "collectible": { "id": "waterSkin", "label": "Water Skin", "count": 1 },
      "guard": { "demonType": "Confusion", "behavior": "guard" } },
    { "id": "ruin-glyph", "type": "ruinPuzzle", "position": "center",
      "puzzle": {
        "id": "glyph-choice", "mode": "symbolChoice",
        "prompt": "Which glyph matches the temple inscription?",
        "answer": "sun",
        "options": ["sun","moon","wave","flame"]
      } }
  ],
  "boss": {
    "demonType": "sandWraith",
    "label": "Sand Wraith",
    "stats": { "healthMultiplier": 6, "damageMultiplier": 2.5, "sizeMultiplier": 1.5 },
    "minions": [ { "demonType": "Fear", "count": 2 } ]
  },
  "customBosses": [ "sandWraith" ],
  "outro": {
    "lines": ["The traveler is safe. The desert sleeps."],
    "endMission": true
  }
}
```

### Compiled output (abridged — engine JSON)

The compiler turns the above into the existing mission JSON shape consumed by
`StoryMissionEngine`, including `storyPhases`, `npcs`, `specialObjects` with concrete
coordinates, `puzzles`, `collectCombatConfig`, and `combatConfig`. Coordinates are
deterministic given the mission `id` seed; the author never wrote a single `x` or `y`.

---

## Implementation Plan (separate from this spec)

This document only defines the schema and validation rules. Implementation work is
tracked separately and should deliver, in order:

1. `src/shared/MissionAssetRegistry.js` — registry of known assets.
2. `src/shared/MissionCompiler.js` — pure `compile(spec) → missionJSON`.
3. `src/shared/MissionValidator.js` — pure `validate(missionJSON, spec) → result`.
4. `test/test-mission-compiler.js` — unit tests with David/Goliath spec as golden case.
5. `test/test-mission-validator.js` — unit tests for each error/warning rule.
6. `scripts/generate_mission.js` — CLI: takes a spec JSON, compiles, validates, writes
   mission JSON to `missions/`.
7. Smoke-test integration in the existing Playwright harness (optional gating).
8. AI system prompt + few-shot examples for spec generation (separate doc).

---

## Open Questions

- Should `winCondition` allow `repeat` / `daily` flags for replayable missions?
  (Defer until single-playthrough works.)
- Should `secular` mode hide the sermon button entirely or replace with a generic
  "reflection" panel? (Defer; for now the validator only checks that no `verseRef`/
  `sermonRef` is present in secular mode.)
- Map size parameterization: the DSL accepts explicit `{width,height}` but the compiler
  only honors the three presets today. Full parameterization is future work and will
  require updating the Sizing Heuristic, room placement algorithm, and validation
  bounds checks (items 31–32) to use the explicit values. **Do not implement yet.**
- Should the compiler support a `customMapGenerator` hook for authors who want a
  bespoke map style? (Defer; current 5 styles cover the design space.)

---

## Gap Analysis

The DSL was validated by hand-writing the existing David & Goliath mission in spec
format. See `docs/plans/mission-dsl-gap-analysis.md` for the full analysis. Five gaps
were found and all have been incorporated into this spec:

1. **GAP-1:** Added `combatOverrides` to `RoomSpec` and `BossSpec` for per-phase combat
   tuning.
2. **GAP-2:** Compiler rule: `supplyCache` + `collectible` → `combatCollect` phase with
   `monstersToKill: 99` (endless combat, ends on collect).
3. **GAP-3:** Compiler rule: NPC positions are cosmetic and phase-bound (intro near
   player spawn, outro near boss arena).
4. **GAP-4:** Compiler rule: set `guardDemonType` on `specialObjects.placements` to
   match the room's guard demon type.
5. **GAP-5:** Added `id` field to `BossSpec` (default: lowercase `demonType`) for
   `winCondition.bossId` reference.

The sample spec is at `missions/specs/david-goliath-01.spec.json`.