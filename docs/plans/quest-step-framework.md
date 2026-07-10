# Quest Step Framework — Multi-Stage Mission Design

**Status:** Specification
**Created:** 2026-07-10
**Depends on:** Mission DSL, MissionCompiler, MissionValidator, StoryMissionEngine, StoryState

---

## Goal

Extend the Mission DSL to support **multi-step quest chains** with learning
objectives, NPC dialogue gates, and item-based prerequisites. Instead of a linear
sequence of rooms → boss, missions become a DAG of quest steps where each step can:

- Require one or more **prerequisite steps** to be completed first
- Require a **learned skill** (granted by an NPC dialogue) before the step unlocks
- Require a **collected item** from a prior step (e.g. "learn A to defeat B, collect
  object X, learn C with X to beat enemy D")
- Gate the **final boss** behind all key steps being completed

This makes the game more interesting by tying learning objectives to NPC dialogues
mid-game and creating a dependency graph the player must navigate.

---

## How It Works Today

The current spec is strictly linear:

```
intro → room-1 → room-2 → ... → room-N → boss → outro
```

`MissionCompiler.compile()` wires `nextPhase` pointers in room order. The
`winCondition` field exists in the spec but the compiler ignores it — phases
advance linearly via `nextPhase` and the engine walks that linked list.

There is no concept of:
- Branching paths (room B available only after room A)
- Skill gating (must talk to NPC to "learn" something before a door opens)
- Item prerequisites (must hold object X before step Y unlocks)
- Conditional transitions (boss phase only after all key steps done)

---

## Design: `questSteps[]` — Backward-Compatible Extension

### Spec-Level Changes

Add an optional `questSteps` array to the mission spec. When present, the compiler
builds a **DAG of phases** instead of a linear chain. When absent, the existing
`rooms[]` linear behavior is preserved (full backward compatibility).

```json
{
  "schemaVersion": 1,
  "id": "armor-of-god-01",
  "name": "The Armor of God",
  "difficulty": "medium",
  "contentMode": "biblical",
  "objective": "Learn the full armor of God, then confront the Adversary.",
  "questSteps": [
    {
      "id": "learnBelt",
      "npc": { "npcId": "paul", "npcName": "Paul", "portrait": "images/npcs/paul.png",
               "lines": ["Stand therefore, having fastened on the belt of truth."] },
      "grantsSkill": "truthBelt",
      "prerequisites": []
    },
    {
      "id": "collectBreastplate",
      "type": "supplyCache",
      "collectible": { "id": "breastplate", "label": "Breastplate of Righteousness", "count": 1 },
      "guard": { "demonType": "Condemnation" },
      "prerequisites": ["learnBelt"],
      "requiredSkill": "truthBelt"
    },
    {
      "id": "learnShoes",
      "npc": { "npcId": "paul", "lines": ["Having put on the readiness of the gospel of peace."] },
      "grantsSkill": "gospelShoes",
      "prerequisites": ["collectBreastplate"]
    },
    {
      "id": "collectShield",
      "type": "supplyCache",
      "collectible": { "id": "shield", "label": "Shield of Faith", "count": 1 },
      "guard": { "demonType": "Doubt" },
      "prerequisites": ["learnShoes"],
      "requiredSkill": "gospelShoes"
    },
    {
      "id": "learnHelmet",
      "npc": { "npcId": "paul", "lines": ["Take up the helmet of salvation."] },
      "grantsSkill": "salvationHelmet",
      "prerequisites": ["collectShield"]
    },
    {
      "id": "collectSword",
      "type": "supplyCache",
      "collectible": { "id": "sword", "label": "Sword of the Spirit", "count": 1 },
      "guard": { "demonType": "Deception" },
      "prerequisites": ["learnHelmet"],
      "requiredSkill": "salvationHelmet"
    },
    {
      "id": "finalBoss",
      "type": "bossArena",
      "prerequisites": ["collectSword"],
      "requiredSkill": "salvationHelmet",
      "requiredItems": ["breastplate", "shield", "sword"]
    }
  ],
  "boss": {
    "demonType": "Pride",
    "label": "The Adversary",
    "stats": { "healthMultiplier": 8, "damageMultiplier": 3.5, "sizeMultiplier": 1.5 }
  },
  "outro": { "lines": ["You stood firm. The armor held."], "endMission": true }
}
```

### QuestStepSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique step id |
| `type` | enum | no | `learn` (default if `npc` present), `supplyCache`, `combatArena`, `ruinPuzzle`, `shrine`, `narrative`, `bossArena` |
| `npc` | DialogueSpec | cond. | NPC dialogue for `learn` steps. When present and no `type`, defaults to `learn`. |
| `grantsSkill` | string | no | Skill id granted when this step completes (for `learn` steps) |
| `prerequisites` | string[] | no | Step ids that must be completed before this step unlocks. Default `[]`. |
| `requiredSkill` | string | no | A skill that must have been granted before this step is accessible |
| `requiredItems` | string[] | no | Collectible ids that must be in the player's inventory before this step unlocks |
| `collectible` | CollectibleSpec | no | For `supplyCache` steps |
| `guard` | GuardSpec | no | For `supplyCache`/`combatArena` steps |
| `puzzle` | PuzzleSpec | no | For `ruinPuzzle` steps |
| `position` | enum | no | Map sector for placement |
| `label` | string | no | Display label |
| `combatOverrides` | CombatOverrides | no | Per-step combat tuning |

### Skill System

Skills are simple string keys. When a `learn` step completes, the engine records
the skill in `StoryState.learnedSkills`. Steps with `requiredSkill` are locked
until that skill is present. Skills persist for the duration of the mission.

### Item Prerequisites

`requiredItems` checks `StoryState.collectedObjects` — the player must have
collected at least one of each listed item id. This enables "collect X, then
use X to unlock step Y" chains.

### Phase Graph Compilation

The compiler performs a **topological sort** of `questSteps` based on
`prerequisites`, then builds a phase graph:

1. **Hub phase** — A special `questHub` phase is created. When the player
   completes a step, they return to the hub, which shows which steps are now
   unlocked. This is rendered as a simple choice screen: "Where do you go next?"
2. **Step phases** — Each quest step becomes one or more phases (dialogue for
   learn steps, combatCollect for supplyCache, etc.).
3. **Hub transitions** — After a step completes, the engine checks which steps
   are newly unlocked and the hub offers them as choices.
4. **Boss phase** — The `finalBoss` step (or `spec.boss` if no `finalBoss` step
   exists) is wired after all prerequisite steps.

### Engine Flow (StoryMissionEngine)

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐     ┌────────────┐                 │
              │ questHub │────►│ learnBelt  │─────────────────┘
              │  (choose)│     │ (dialogue) │
              └──────────┘     └────────────┘
                    │
                    ▼
              ┌──────────────┐     ┌────────────┐
              │  questHub    │────►│collectBP   │
              │ (BP unlocked)│     │(combatColl)│
              └──────────────┘     └────────────┘
                    │
                    ▼
              ┌──────────────┐     ┌────────────┐
              │  questHub    │────►│ learnShoes │
              │ (shoes unlk) │     │ (dialogue) │
              └──────────────┘     └────────────┘
                    │
                   ...
                    │
                    ▼
              ┌──────────────┐     ┌────────────┐
              │  questHub    │────►│ finalBoss  │
              │ (all done)   │     │ (combat)   │
              └──────────────┘     └────────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │  outro   │
                                    └──────────┘
```

### `questHub` Phase Type

A new phase type `questHub` is added. It is a choice screen:

- Shows completed steps (greyed out / checkmark)
- Shows unlocked-but-incomplete steps (clickable)
- Shows locked steps (greyed out with lock icon + hint: "Requires: X")
- Clicking an unlocked step transitions to that step's first phase
- When all required steps are complete, the boss option appears

### StoryState Changes

```js
// New fields in StoryState:
this.learnedSkills = {};          // skillId → true
this.completedSteps = {};         // stepId → true
this.availableSteps = [];         // currently-unlocked step ids

// New methods:
grantSkill(skillId)              // mark skill as learned
hasSkill(skillId)                 // check skill
markStepComplete(stepId)          // mark step done
isStepUnlocked(step)              // check prereqs + skills + items
getUnlockedSteps(allSteps)        // return list of step ids that can be entered now
areAllRequiredStepsComplete()    // check if boss is unlockable
```

### StoryMissionEngine Changes

```js
// New phase type handlers:
_enterPhase(phaseId)
  - if phase.type === 'questHub': emit storyPhase with available steps list
  - if phase.type === 'learn': treat as dialogue, grant skill on completion

// _handleStoryInput:
  - if phase.type === 'questHub': handle step selection → enter that step's phases
  - if phase.type === 'learn': advance dialogue, grant skill on dialogue complete

// _advancePhase:
  - if current step chain is done → return to questHub
  - if questHub and all required steps done → offer boss transition
```

### MissionValidator Changes

New validation checks for `questSteps`:

- **Q1:** No cycles in the prerequisite graph (topological sort succeeds)
- **Q2:** Every `prerequisite` references an existing step id
- **Q3:** Every `requiredSkill` is granted by some step's `grantsSkill`
- **Q4:** Every `requiredItems` id appears in some step's `collectible.id`
- **Q5:** At least one step (or `spec.boss`) has no prerequisites that depend on
  it (the graph is grounded)
- **Q6:** The boss step (or `spec.boss`) is reachable from the first step
- **Q7:** All steps are reachable from the initial state (no orphaned steps)
- **Q8:** A `learn` step must have `npc` with at least one line

### AI Prompt Changes

The system prompt gains a new section explaining the quest step framework,
with guidance on when to use it (multi-step learning missions) vs. the simple
linear format (short missions). A few-shot example demonstrates a full quest
chain.

---

## Backward Compatibility

- If `questSteps` is absent, the compiler uses the existing `rooms[]` linear
  path. No changes to existing missions.
- If `questSteps` is present, `rooms[]` is ignored (or can be omitted entirely).
- The `boss` and `outro` fields work the same way in both modes.
- The compiled mission JSON uses the same `storyPhases` array — `questHub` is
  just a new phase type alongside `dialogue`, `combat`, `combatCollect`, `puzzle`.

---

## Implementation Order

1. **StoryState.js** — Add `learnedSkills`, `completedSteps`, skill/step methods
2. **MissionCompiler.js** — Add `compileQuestSteps()` that builds the DAG + hub
3. **StoryMissionEngine.js** — Handle `questHub` and `learn` phase types
4. **MissionValidator.js** — Add Q1-Q8 quest step validation
5. **StoryMissionRenderer.js** — Render `questHub` choice screen + `learn` phases
6. **ai-mission-prompt.md** — Add quest step documentation + few-shot example
7. **Sample spec** — "Armor of God" quest chain for testing