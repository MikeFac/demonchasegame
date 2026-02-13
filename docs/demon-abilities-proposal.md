# Demon Special Abilities Proposal

To make the game more dynamic and strategically interesting, distinct behavioral patterns and special abilities can be assigned to different demon types.

**Important**: Each special ability only has a certain **activation chance** per trigger event (per tick for auras, per hit for on-contact effects, per AI update for movement abilities). This prevents abilities from being overwhelming and keeps gameplay fair. All activation chances are configured in `src/shared/Constants.js` under the `DEMON_ABILITIES` section.

---

## 1. The Paralyzers (Mind)
**Demons**: `Fear`, `Doubt`, `Depression`, `Despair`
**Theme**: Fear paralyzes and stops forward momentum.
**Ability**: **"Freezing Aura"**
- **Activation**: Always active when player is within radius (passive aura)
- **Effect**: When a player is within a certain radius (150px), their movement speed is slowed by 40%.
- **Counter**: Requires shooting from a distance; creates tension when they close in.
- **Implementation**: Server adds `freezeAura` flag to these demon types. Client checks proximity and reduces player move speed.

## 2. The Misleaders (Confusion)
**Demons**: `Confusion`, `Deception`, `Ignorance`, `Blindness`
**Theme**: Confusion makes it hard to discern direction or truth.
**Ability**: **"Erratic Movement"**
- **Activation**: 30% chance per movement update to zig-zag instead of moving normally
- **Effect**: Instead of chasing directly, they move in unpredictable zig-zag patterns, making them harder to hit.
- **Counter**: Requires careful aim and patience.
- **Implementation**: Server applies random angle offsets to movement direction during chase/walk updates.

### Spirit of Ignorance (Future)
*   **Theme**: Keeps the player in the dark, hindering growth.
*   **Ability**: **"Veil of Ignorance"**
    *   **Effect**: 20% chance on attack to apply a "Silenced" state.
    *   **Consequence**: Player cannot access **Verse Tests** or **Review Mode** for 45 seconds.
    *   **Visual**: A gray fog obscures the UI buttons for these modes.

## General Gameplay Enhancements (Health)
*   **Health Regeneration**: Gained primarily through passing Verse Tests.
*   **Verse Test Reward**: **+20 Health** (increased from 10) for each passed test.
*   **Low Health Warning**: Flashes a message when health is critical: *"Health can be recovered through Passing Verse Tests"* or *"Find Healing Points"*.

## 3. The Strongholds (Defense)
**Demons**: `Pride`, `Condemnation`, `Unbelief`
**Theme**: Pride and Unbelief are hard walls to break down.
**Ability**: **"Armored Shell"**
- **Activation**: Always active (passive)
- **Effect**:
    - They have significantly higher HP (2x base health).
    - **Pride Shield**: `Pride` requires 3 hits before taking ANY damage (armor absorbs first 3 hits).
- **Counter**: Sustained fire; focus fire.
- **Implementation**: Server applies health multiplier on spawn. Pride gets `armorHits` counter that absorbs damage.

## 4. The Thieves (Resource)
**Demons**: `Poverty`, `Temptation (Jezebel)`, `Shame`
**Theme**: These demons rob you of your spiritual inheritance and resources.
**Ability**: **"Spirit Drain"**
- **Activation**: 40% chance per hit on player (alongside normal damage)
- **Effect**: On hit, besides Health damage, they also drain:
    - **Poverty**: Drains 5 XP (Experience).
    - **Temptation**: Drains 5 Spirit (Ammo).
- **Counter**: High priority targets to protect progression.
- **Implementation**: Client checks demon type on hit, rolls chance, applies drain and shows flash message.

## 5. The Aggressors (Combat)
**Demons**: `Strife`, `Swarm`
**Theme**: Direct, overwhelming conflict.
**Ability**: **"Dash & Multiply"**
- **Strife Dash**: 15% chance per movement update to lunge at 3x speed towards the player.
    - Dash lasts 500ms with a 5-second cooldown between dashes.
- **Swarm Split** (Future/Hard): Upon death, splits into 2 smaller "mini-swarms" with low HP but high speed.
- **Counter**: Keep moving; Area of Effect (AoE) attacks.
- **Implementation**: Server checks dash chance and cooldown timer. During dash, speed multiplied by 3x.

## 6. The Debuffers (Body) — Future
**Demons**: `Infirmity`
**Theme**: Physical weakness.
**Ability**: **"Wither"**
- **Activation**: 25% chance on contact
- **Effect**: Projectiles or contact apply a "Wither" status that stops Health Regeneration for 10 seconds.
- **Counter**: Avoid at all costs; prioritize safe positioning.

---

## Activation Chance Summary

| Ability | Demons | Trigger | Chance | Constant Key |
|---------|--------|---------|--------|-------------|
| Freezing Aura | Fear, Doubt, Depression, Despair | Proximity (passive) | Always | `FREEZE_AURA_RADIUS`, `FREEZE_AURA_SLOW` |
| Erratic Movement | Confusion, Deception, Ignorance, Blindness | Per move update | 30% | `ERRATIC_CHANCE` |
| Armored Shell | Pride, Condemnation, Unbelief | Passive | Always | `STRONGHOLD_HP_MULTIPLIER` |
| Pride Shield | Pride | On damage | Always (3 hits) | `PRIDE_ARMOR_HITS` |
| Spirit Drain (XP) | Poverty | On hit to player | 40% | `DRAIN_CHANCE`, `POVERTY_XP_DRAIN` |
| Spirit Drain (Ammo) | Temptation | On hit to player | 40% | `DRAIN_CHANCE`, `TEMPTATION_AMMO_DRAIN` |
| Dash Attack | Strife | Per move update | 15% | `DASH_CHANCE`, `DASH_SPEED_MULT` |

## Implementation Difficulty
- **Easy**: Freezing Aura (proximity slow), Armored Shell (HP buff + Pride shield), Spirit Drain (XP/Ammo drain on hit)
- **Medium**: Dash Attack (Strife lunge), Erratic Movement (zig-zag patterns)
- **Hard**: Splitting enemies (Swarm - requires new entity creation logic), Inverted controls (Deception - client input changes), Veil of Ignorance (UI lockout)
