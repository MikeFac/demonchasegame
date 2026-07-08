# Enterable Room Structure Pattern

This pattern was introduced while integrating the David and Goliath mission into the core game loop. It makes random-map structures usable as authored story spaces instead of decorative wall clusters.

## Problem

The player sprite is 48px wide, while the default OpenPlains cell size is usually 25px. A one-cell doorway looks open, but is mechanically too narrow for reliable collision-free entry. Small hollow buildings also leave too little space for a collectible, a guard demon, and the player.

## Room Sizing Rules

- Use hollow structures, not filled blocks, when the structure is meant to be entered.
- Minimum practical room footprint: `7x7` cells.
- Preferred story room footprint: `10x10` to `12x12` cells.
- Doorway width: `3` cells minimum.
- Clear an entry pad outside each doorway so random adjacent walls do not create a choke point.
- Keep authored interactables at least 2 cells away from walls when possible.
- Keep 48px monsters away from the inner wall by using center-ish guard coordinates, not coordinates adjacent to the wall.

## OpenPlains Implementation

`src/shared/map-generators/OpenPlains.js` uses:

- `placeHollowBuilding(x, y, w, h, doorSide)` for enterable buildings.
- `carveClearArea(x, y, w, h)` for doorway pads and local clearance.
- Random OpenPlains buildings sized `7x7` to `12x12`.
- Deterministic story landmark structures aligned to David/Goliath stone placements.

The deterministic story landmark structures currently support:

- five smooth-stone rooms spread around the map
- one stone inside each room
- one guard demon inside each room
- a player-width entrance for each room

## Authoring Guidelines

When placing story objects in rooms:

- Define the room first, then place the collectible and guard inside it.
- Check the collectible with its real collision size, not just its center point.
- Check the guard with `Constants.MONSTER_WIDTH` and `Constants.MONSTER_HEIGHT`.
- Check the entrance with `Constants.PLAYER_WIDTH` and `Constants.PLAYER_HEIGHT`.
- Prefer explicit mission placements over generated circular placement when the story beat depends on spatial layout.
- Keep runtime wall-safety nudging as a fallback, not as the primary design tool.

## Regression Tests

Use these checks after changing room geometry or mission placements:

```bash
node test/test-open-plains-structures.js
node scripts/test-david-goliath-integrated.js
```

The structure test verifies:

- each authored stone point is clear
- each guard point is clear
- each room has a player-width entrance

The integrated browser test verifies:

- stones remain spread across the mission area
- stones are not inside generated walls
- stones are near enough to wall tiles to be considered inside landmark structures
- each stone has a distinct guard demon type

## Design Intent

Rooms should create small authored encounters inside the normal procedural map. They should not require a separate mission renderer or bespoke story movement loop. The core loop remains responsible for player movement, collision, monsters, combat, collectibles, and rendering.
