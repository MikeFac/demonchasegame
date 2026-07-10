# Mission DSL Gap Analysis — David & Goliath Spec

**Date:** 2026-07-08
**Spec:** `missions/specs/david-goliath-01.spec.json`
**Source mission:** `missions/featured-david-goliath.json`

This is the result of hand-writing the existing David & Goliath mission in the new DSL
format (defined in `docs/plans/mission-dsl-schema.md`) to find gaps before writing any
compiler/validator code.

---

## What the DSL handled cleanly

- **`winCondition`** expresses the 3-step sequence (collect 5 → solve 1 → defeat boss)
  in 8 lines. The existing engine JSON has no equivalent — the phase graph encodes this
  implicitly. This is a clear readability win.
- **`intro`/`outro` dialogue** map cleanly to the existing `storyPhases` dialogue
  entries. `endMission: true` on outro is preserved.
- **Rooms as named positions** (`nw`, `n`, `ne`, `sw`, `se`, `center`) replace the five
  raw coordinate pairs in `specialObjects.placements` and `collectCombatConfig.fixedMonsters`.
  The author says *where*; the compiler will say *exactly*.
- **Guards per room** — each `supplyCache` room's `guard` maps to one `fixedMonsters`
  entry. Distinct demon types per stone come naturally from per-room authoring.
- **Boss + minions** — the `boss` block maps cleanly to the existing `combatConfig` with
  `isBoss: true` on the boss entry and the two minion entries after.
- **Puzzle** — the `courageCloze` puzzle maps cleanly to a `puzzles[]` entry and a
  `storyPhases` puzzle phase.
- **`difficulty: medium`** correctly maps to the `normal` GameConfig preset used.
- **i18n** — the existing `story.david.*` keys are preserved via the `i18n.strings` map.

---

## Gaps found (need DSL/schema changes)

### GAP-1: Per-phase combat config overrides (HIGH)

The existing mission has **two different combat configs**:
- `collectCombatConfig` (collection phase): slower monsters, `monstersToKill: 99`,
  `monsterDamageFactor: 0.9`, `maxMonsters: 8`
- `combatConfig` (boss phase): faster monsters, `monstersToKill: 1`,
  `monsterDamageFactor: 1.1`, `maxMonsters: 6`

The DSL as specified has no way to express per-phase combat tuning. The spec currently
says the compiler derives combat config from `difficulty` + `GuardStats` only.

**Workaround used in spec:** Added top-level `collectCombatConfig` and `combatConfig`
blocks as **escape hatches** — pass-through to the compiled JSON. This works but
bypasses the DSL's abstraction.

**Recommended fix:** Add an optional `combatOverrides` field to `RoomSpec` and
`BossSpec` that lets the author tune per-room/per-boss combat without writing the full
engine block:

```json
"combatOverrides": {
  "monsterDamageFactor": 0.9,
  "monsterSpeed": 4,
  "maxMonsters": 8,
  "monstersToKill": 99,
  "spawnRate": 16000,
  "randomSpawnsEnabled": false
}
```

The compiler merges these over the difficulty-derived defaults. The top-level escape
hatch stays for advanced authors but should be rarely needed.

**Action:** Update `docs/plans/mission-dsl-schema.md` — add `combatOverrides` to
`RoomSpec` and `BossSpec`.

---

### GAP-2: `monstersToKill: 99` as "endless combat" sentinel (MEDIUM)

The collection phase uses `monstersToKill: 99` to mean *"don't end on kill count —
end on collect"*. This is a magic number hack in the existing engine code, and the DSL
should make it explicit.

**Recommended fix:** Add an `endCondition` enum to `RoomSpec` (or rely on `type`):
- `supplyCache` rooms with a `collectible` should always end on **collect**, never on
  kill count. The compiler should set `monstersToKill: 99` (or a cleaner sentinel) and
  the validator should confirm the phase is `combatCollect`, not `combat`.
- Document that `monstersToKill` is compiler-controlled, not author-controlled, except
  in `combatArena` rooms where `clear` is the trigger.

**Action:** Clarify in the spec that `supplyCache` + `collectible` implies
`endCondition: collect`. No schema change needed, but the compiler section needs this
rule spelled out.

---

### GAP-3: NPC positioning vs player spawn (LOW)

Both NPCs (Samuel for intro, David for outro) have `position: { x: 1000, y: 1000 }` in
the existing JSON — the world center. In the DSL I used `position: "center"` for both.
This is fine for a 2000×2000 world, but if the boss arena is also at `center`, the
intro NPC and the boss overlap spatially.

**Why it works today:** The intro and boss phases never run simultaneously, so NPC
position and boss position never coexist visually.

**Recommended fix:** No schema change needed. The compiler should place intro NPCs at
the player spawn area and outro NPCs near the boss arena (where the player just won).
Document this as a compiler rule: *dialogue NPC position is cosmetic and phase-bound;
the compiler places NPCs near the player's expected location at that phase, not at a
fixed world position.*

**Action:** Add a compiler rule note in the spec.

---

### GAP-4: `guardDemonType` on specialObject placements (LOW)

The existing JSON puts `guardDemonType` on each `specialObjects.placements` entry AND
duplicates the guard as a `fixedMonsters` entry. The DSL correctly treats the guard as
a room property (not a collectible property), which is cleaner. But the compiled output
needs to preserve the `guardDemonType` field on placements because `StoryMissionEngine`
or the client renderer may read it.

**Recommended fix:** No DSL change. Compiler responsibility: when expanding a room's
`guard` + `collectible`, set `guardDemonType` on each `specialObjects.placements` entry
to match the room's guard demon type. Document this in the compiler section.

**Action:** Add to compiler responsibilities in the spec.

---

### GAP-5: `bossId` in `winCondition` vs boss `demonType` (LOW)

The `winCondition` step `{ "type": "defeatBoss", "bossId": "goliath" }` uses a logical
id, but the boss spec uses `"demonType": "Goliath"` (capital G, a demon type, not an
id). These don't match and there's no `id` field on `BossSpec`.

**Recommended fix:** Add an optional `id` field to `BossSpec` (default: lowercase
`demonType`). `winCondition.bossId` references this id. When omitted, the validator
matches by `demonType` (case-insensitive).

**Action:** Add `id` to `BossSpec` in the spec.

---

## What was deliberately NOT expressed (compiler's job)

These appear in the engine JSON but the author should NOT write them — the compiler
generates them:

- `specialObjects[].spawnArea` — derived from world size + room positions
- `specialObjects[].placements[].x/y` — derived from room interior centers
- `fixedMonsters[].x/y` — derived from room interior, offset from collectible
- `fixedMonsters[].spawnTrigger` — always `{ type: "immediate", value: 0 }` for story
  missions (author never needs to change this)
- `storyPhases[]` — the compiler builds the phase graph from `intro` → `rooms` →
  `boss` → `outro` and wires `nextPhase` ids
- `npcs[].position.x/y` — derived from `position` enum
- `music` — compiler fills placeholders from `tone`; left null until asset registry
  exists
- `gameMode: "story"` and `storyIntegration: "coreLoop"` — compiler always sets these
  for spec-authored missions

This is the core value of the DSL: ~130 lines of engine JSON → ~100 lines of intent,
with zero coordinates.

---

## Verdict

The DSL can express the David & Goliath mission. One real gap (`combatOverrides`
per-phase, GAP-1) needs a schema addition. The rest are compiler rules or minor field
additions. No fundamental redesign needed.

**Next action:** Update `docs/plans/mission-dsl-schema.md` with the 5 gap fixes, then
proceed to build the Mission Compiler with this spec as the golden test case.