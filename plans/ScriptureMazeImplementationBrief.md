# Scripture Maze Implementation Brief

## Purpose

This brief translates the Scripture Maze concept into the minimum implementation needed for a first playable version, without over-generalizing too early.

The goal is to ship one authored alternative mode cleanly, using the current refactor direction:

- isolated launcher
- isolated engine
- isolated renderer
- explicit mode registration
- one mission path that launches it

## Scope For V1

The first playable version should include:

- one maze layout
- one authored mission
- one player avatar
- three demon behavior types
- one prompt type
- bullet-based empowerment only
- sudden-death rules

The first version should not include:

- procedural mazes
- multiple map themes
- touch-specific polish beyond baseline movement
- multiple prompt systems
- complex progression trees
- generalized mission-to-mode routing for many future modes

## Core Gameplay Rules

- Player moves in four directions through a fixed maze
- Demons roam continuously once play starts
- Touching a demon while unarmed kills the player instantly
- Scripture prompt nodes appear in the maze
- Completing a prompt correctly awards bullets
- Each bullet can kill one demon instantly
- Mission completes when the scripture-learning target is met
- Mission fails immediately on player death

## Recommended Architecture

Follow the wave-mode precedent, but keep the module names specific to this mode.

Suggested files:

- `src/client/ScriptureMazeLauncher.js`
- `src/client/ScriptureMazeRenderer.js`
- `src/client/ScriptureMazeInput.js`
- `src/shared/ScriptureMazeEngine.js`
- `src/shared/ScriptureMazeConfig.js`

If you later standardize folders like `src/client/modes/` and `src/shared/modes/`, these files can move then. For now, the goal is low-friction delivery.

## Responsibilities By Module

### `ScriptureMazeLauncher`

Responsible for:

- preparing canvas and UI state
- constructing engine, renderer, and input
- starting and stopping the mode
- wiring mission callbacks
- returning to overland on win/loss/exit

It should mirror the role of `WaveGameLauncher`, not the dungeon startup path.

### `ScriptureMazeEngine`

Responsible for:

- maze state
- player movement state
- demon state and AI updates
- collision detection
- scripture prompt node activation
- ammo gain
- shooting resolution
- win/loss detection

It should not know about DOM or mission screen widgets.

### `ScriptureMazeRenderer`

Responsible for:

- drawing maze walls and paths
- drawing player
- drawing demons
- drawing prompt nodes
- drawing bullets/ammo HUD
- drawing mission progress and loss/win overlays

It should consume engine state only.

### `ScriptureMazeInput`

Responsible for:

- keyboard movement
- optional pointer/touch adaptation if needed
- shoot action binding
- pause/leave bindings if desired

This keeps mode controls isolated from the dungeon input handler.

### `ScriptureMazeConfig`

Responsible for:

- maze definition
- demon spawn points
- prompt node positions
- mission-level tuning defaults

For V1, a static JSON-like config object is enough.

## Minimal Mission JSON Shape

For the first implementation, one mission-specific branch is acceptable.

Suggested mission fields:

```json
{
  "id": "maze-01",
  "name": "Scripture Maze: Faith Run",
  "description": "Navigate the maze, answer correctly, and earn bullets to destroy demons.",
  "gameMode": "scriptureMaze",
  "type": "verse",
  "qualities": ["Faith"],
  "packId": "foundations-faith",
  "mazeId": "faith-maze-01",
  "demonRoster": ["chaser", "ambusher", "wanderer"],
  "bulletsPerCorrect": 2,
  "targetCorrectAnswers": 6,
  "xpMultiplier": 1.5
}
```

The key point is that mission JSON should declare only authored content and tuning, not low-level engine internals.

## Mission Launch Integration

For now, add one explicit mission launch branch similar to the current wave-mode path.

Expected flow:

1. `startMission()` loads mission data
2. If `mission.gameMode === 'scriptureMaze'`, launch `ScriptureMazeLauncher`
3. `ModeManager.start('scriptureMaze', ...)` owns lifecycle
4. On completion, mark mission complete and return to overland
5. On failure or leave, return to overland without dungeon-state leakage

This is sufficient for one-mode-at-a-time development.

## Data To Reuse

Reuse existing systems where the fit is clean:

- mission loading
- pack loading
- verse/content lookup
- mission completion/progress persistence
- analytics hooks
- demon art assets
- audio services

Avoid forcing reuse of dungeon-specific systems such as:

- `GameEngine`
- dungeon map generation
- dungeon combat pacing
- health-based HUD and pickups
- default monster spawn logic

## First Prompt Design

Use one prompt type only for V1.

Recommended choice:

- category identification

Reason:

- shortest decision time
- easiest to present inline
- fits chase pacing best

Example interaction:

- player reaches a scripture node
- game pauses demon movement for a very short prompt window, or uses a lightweight overlay
- player chooses the matching category
- correct answer grants bullets and advances progress
- play resumes immediately

The prompt UI should be fast enough that the arcade loop stays intact.

## Demon Behavior Set For V1

Start with three simple roles:

- `chaser`: moves toward the player directly
- `ambusher`: targets the player’s projected tile ahead of movement
- `wanderer`: moves semi-randomly with loose player bias

That is enough to test whether pattern-based pressure is fun without implementing a full ghost AI suite.

## Maze Design Guidelines

The first maze should:

- be fully hand-authored
- fit on one screen
- have several loops
- include a central danger zone
- place prompt nodes near moderate-risk areas
- avoid visually noisy walls or clutter

Readability matters more than spectacle in V1.

## HUD For V1

Keep only:

- ammo count
- objective text
- progress count
- simple win/loss banner

Do not include:

- health bar
- inventory
- level-up UI
- complex buff indicators

## Success Criteria

The first version is successful if:

- players can understand the loop without explanation
- the mode feels clearly different from dungeon mode
- learning actions feel directly tied to survival/control
- the sudden-death rules feel fair
- one authored mission can be entered and exited cleanly

## Main Risks

### Risk 1: Prompting breaks pacing

If prompts are too modal or too long, the chase loop will collapse.

Mitigation:

- use one very fast prompt type
- keep prompt interactions short
- resume motion quickly

### Risk 2: Demon AI feels cheap rather than readable

If demons are too fast or too random, the mode feels unfair.

Mitigation:

- prioritize readable paths
- differentiate behaviors clearly
- tune speed conservatively first

### Risk 3: It feels like “dungeon mode in a maze”

If too much dungeon logic leaks in, the mode loses identity.

Mitigation:

- no health attrition
- no loot complexity
- no dungeon progression loop
- sudden-death plus ammo economy stays central

## Suggested Implementation Order

1. Create static maze config and placeholder mission tuning
2. Implement `ScriptureMazeEngine` with movement, collisions, and win/loss
3. Implement renderer with simple readable visuals
4. Implement input module and shooting
5. Add prompt-node interaction with one prompt type
6. Add launcher and `ModeManager` registration
7. Wire one mission branch in `startMission()`
8. Test clean entry, fail, win, restart, and return-to-overland flows

## Out Of Scope For This Brief

These can come later if the mode proves fun:

- generalized mission-to-mode registry
- multiple maze missions
- stronger enemy personality systems
- touch-first controls
- score chase leaderboard
- power pellets or temporary body-contact kill mode
- multiplayer version

## Recommendation

Build this as one sharply-defined authored mode, not as a framework.

If the first mission is fun, then generalize:

- reusable mode registration
- richer mission schema
- more maze archetypes
- additional learning prompt types
