# FUN Mode Implementation Plan

## Overview

A new game mode optimized for arcade-style action rather than Bible verse learning. Players can succeed through combat skill alone, with quizzes providing optional bonuses rather than being required for progress.

## Target Audience

- Players who find the learning aspect intimidating
- Ad traffic from non-religious audiences
- Casual gamers wanting quick entertainment
- Players who want a lower-pressure introduction to the game

## Core Design Principles

1. **Combat-first**: Shooting demons is the primary mechanic
2. **Quizzes optional**: Correct answers give bonuses, not requirements
3. **Fast-paced**: Higher speed, more enemies, frequent action
4. **Forgiving**: Easy to survive without perfect play

---

## Implementation Details

### 1. GameConfig Preset

Add new preset to `src/shared/GameConfig.js`:

```javascript
fun: {
  name: 'Fun Mode',
  description: 'Arcade action! Fast combat, lots of ammo, optional quizzes',
  multipliers: {
    monsterHealth: 0.5,           // Easier to kill
    monsterDamage: 0.5,           // Less punishing
    monsterSpeed: 1.2,            // Faster enemies (more exciting)
    spawnRate: 0.6,               // 40% faster spawning (more enemies)
    healingSpawnRate: 0.5,        // More frequent healing
    maxMonsters: 1.5              // 50% more enemies on screen
  },
  meleeHitProbabilityNoAnswer: 0.8,  // 80% hit chance without quiz
  startingAmmo: 50,                  // Start with lots of ammo
  ammoRegenRate: 1,                  // Regenerate 1 ammo per second
  quizBonusHealth: 20,               // Bonus HP for correct answers
  quizBonusAmmo: 10                  // Bonus ammo for correct answers
}
```

### 2. Ammo System Changes

**Current behavior**: Ammo required to attack, earned only by answering quizzes.

**FUN mode behavior**:
- Start with 50 ammo
- Regenerate 1 ammo/second automatically
- Correct quiz answers grant +10 ammo (bonus, not requirement)
- Melee attacks work 80% of time without ammo/quiz

### 3. Quiz Behavior Changes

**Current behavior**: Must answer correctly to deal damage.

**FUN mode behavior**:
- Quizzes still appear when attacking demons
- Player can ignore quiz and still deal damage (80% melee hit chance)
- Correct answer rewards:
  - +20 HP
  - +10 ammo
  - Temporary damage boost (5 seconds, 2x damage)
- Incorrect answer: no penalty (just no bonus)
- Quiz auto-dismisses after 5 seconds if ignored

### 4. Player Stats

| Stat | Normal Mode | FUN Mode |
|------|-------------|----------|
| Starting Health | 60 | 100 |
| Max Health | 100 | 150 |
| Starting Ammo | 0 | 50 |
| Ammo Regen | None | 1/sec |
| Player Speed | Normal | 1.3x |

### 5. Monster Configuration

| Setting | Normal Mode | FUN Mode |
|---------|-------------|----------|
| Monster Health | 100% | 50% |
| Monster Damage | 100% | 50% |
| Monster Speed | 100% | 120% |
| Spawn Rate | Normal | 40% faster |
| Max Concurrent | Normal | 150% |

### 6. Visual/UI Differences

- Different HUD color scheme (more vibrant, arcade feel)
- "FUN MODE" badge in corner
- Ammo counter always visible with regen indicator
- Bonus popups for correct answers (+20 HP! +10 Ammo!)
- Faster death animations
- More particle effects on kills

---

## Menu Integration

### Main Menu Changes

Add new button between "Solo Game" and "Multiplayer":

```
[ Solo Game ]    [ FUN Mode ]    [ Multiplayer ]
```

Button styling:
- Brighter color (e.g., orange/gold)
- Star/sparkle icon
- Tooltip: "Arcade action mode - no quiz required!"

### Flow

1. User clicks "FUN Mode"
2. Game starts immediately with FUN preset
3. No config screen (unlike Solo Game)
4. Offline mode by default

---

## URL Parameter Support

Support direct linking for ads:
- `https://dcgame.4you.tel/?mode=fun` - Start FUN mode
- `https://dcgame.4you.tel/?mode=fun&play=1` - FUN mode + auto-start

---

## Code Changes Required

### Server/Shared Files

| File | Changes |
|------|---------|
| `src/shared/GameConfig.js` | Add `fun` preset |
| `src/shared/Constants.js` | Add ammo regen constants |

### Client Files

| File | Changes |
|------|---------|
| `game.js` | FUN mode logic, ammo regen, bonus handling |
| `index.html` | Menu button, cache version bump |
| `src/client/QuizManager.js` | Optional quiz handling, bonus rewards |
| `src/client/Renderer.js` | FUN mode HUD styling |

---

## Implementation Order

1. **Phase 1: Core Mechanics** (2-3 hours)
   - Add FUN preset to GameConfig
   - Implement ammo regeneration
   - Change melee hit probability
   - Adjust starting stats

2. **Phase 2: Quiz Integration** (1-2 hours)
   - Make quizzes optional
   - Add bonus rewards for correct answers
   - Remove penalty for wrong/ignored answers

3. **Phase 3: UI/Menu** (1-2 hours)
   - Add menu button
   - FUN mode HUD styling
   - Bonus popups

4. **Phase 4: Polish** (1 hour)
   - URL parameter support
   - Testing and balance tweaks

**Total estimated time: 5-8 hours**

---

## Testing Checklist

- [ ] FUN mode starts from menu button
- [ ] Ammo regenerates over time
- [ ] Can kill monsters without answering quizzes
- [ ] Correct answers give bonuses
- [ ] Wrong answers have no penalty
- [ ] More monsters spawn
- [ ] Player moves faster
- [ ] URL parameter `?mode=fun` works
- [ ] Normal mode unaffected

---

## Future Enhancements (Out of Scope)

- Leaderboards for FUN mode
- Achievement system
- Power-up pickups
- Boss monsters
- Different weapon types
- Multiplayer FUN mode
