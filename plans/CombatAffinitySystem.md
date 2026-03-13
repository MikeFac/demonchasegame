# Technical Design: Combat Affinity & Ranged Attacks

## Overview

The goal is to increase player retention ("stickiness") by rewarding the player for learning verse categories and recognizing monster types. This system bridges the educational content (Verse Categories) with the core action gameplay (Combat).

## 1. Flexible Affinity Matrix

To ensure the system is easy to balance and extend, we will implement a "Combat Matrix". This matrix defines how different Verse Categories interact with specific Monster Types.

### Proposed Structure (in `LevelConfig.js`)

```javascript
const CombatMatrix = {
  affinities: {
    Faith: { Fear: 1.5, Doubt: 1.5, Confusion: 1.2 },
    Wisdom: { Confusion: 1.5, Deception: 1.5, Ignorance: 1.3 },
    Healing: { Infirmity: 1.5, Shame: 1.3, Poverty: 1.2 },
    Power: { Pride: 1.5, Swarm: 1.4, Condemnation: 1.2 },
  },
  defaultMultiplier: 1.0,
};
```

## 2. Technical Implementation

### A. Core Engine Changes (`GameEngine.js`)

- The `GameEngine` needs to track which "Quality" or "Category" the player is currently "channeling" (the category of the last successful verse answered).
- This state should be added to the `player` object in `gameState`.

### B. Bullet Damage Calculation (`BulletManager.js`)

- When a bullet hits a monster, the `BulletManager` will check the attacker's current category.
- It will look up the `CombatMatrix` to see if there is a multiplier for that category vs. that monster type.
- `Final Damage = Base Damage * Matrix Multiplier`.

### C. Visual Feedback (vFX)

- **Critical Hit Popup**: If a multiplier > 1.0 is applied, show a "STRONG!" or "CRITICAL!" text popup at the monster's location.
- **Color Tinting**: Change the bullet's color or trail based on the current verse category (e.g., Gold for Faith, Blue for Wisdom).

## 3. Ranged Demon Attacks (Arrows)

To increase the skill ceiling, we will introduce "Ranged Monsters".

### Mechanics

- **Detection Range**: Ranged monsters will stop moving toward the player once they reach a `FIRE_RANGE` (e.g., 200px).
- **Firing Cycle**: They will follow a "Aim -> Fire -> Cooldown" cycle.
- **Projectiles**: Use a new projectile entity (Arrow) similar to player bullets, but colliding with players.
- **Dodging**: Players can dodge arrows by moving perpendicular to the trajectory or using wall corners as cover.

### Configuration

Update `LevelConfig.js` to define which monsters are ranged:

```javascript
monsters: {
    "Deception": { type: "ranged", projectile: "arrow", fireRate: 3000 },
    "Fear": { type: "melee", speed: 5 }
}
```

## 4. Rollout Plan

1.  **Phase 1**: Implement the `CombatMatrix` data structure in `LevelConfig.js`.
2.  **Phase 2**: Update `BulletManager.js` to apply damage multipliers based on categories.
3.  **Phase 3**: Add visual indicators for "Strong" hits.
4.  **Phase 4**: Implement the first Ranged Monster type (e.g., "Deception" firing arrows).

## 5. Beginner Readability Layer

As affinity becomes more important, the game should not rely on players discovering the system by trial and error alone.

### Implemented cue

When a player takes repeated hits from the same demon without dealing damage back, the game now shows a floating hint above the player:

- `Flee and Learn`
- `{best counter category}`

### Why this matters

- It turns confusion into a clear recovery action.
- It teaches that demons have category weaknesses without forcing a heavy tutorial.
- It makes the learning flow feel strategically relevant rather than optional.

### Balance guidance

If affinity multipliers are increased further:

- keep wrong-category combat possible, but clearly weaker
- make strong-category combat noticeably better within a single encounter
- preserve this hint as a beginner bridge rather than a permanent dependency

## 6. Optional Level Bosses

To give affinity a clearer tactical payoff, each level can include one optional boss encounter.

### Boss design

- one boss per level
- same demon taxonomy as normal monsters
- `guard` behavior
- `3.0x` health multiplier
- `1.5x` damage multiplier
- `1.5x` size multiplier

### Spawn design

- spawn near a valid map corner instead of in the central combat lanes
- prefer one of the four corners where the boss fully fits
- if an exact corner tile is blocked, search inward from that corner until a safe location is found

### Progression role

- boss kills do **not** count as required for level completion
- boss kills should award a large bonus so the encounter remains meaningful

### System benefit

This creates a stronger loop:

- normal enemies advance the level
- boss enemies test deeper mastery
- affinity matters more because there is now a high-value target where category choice is strategically important
