# Sound Effects Implementation Plan

## Overview
Add impactful sound effects to enhance the game's "juice" and player feedback. Target: Tier 1 polish (essential audio feedback for all major game actions).

**Sound Library**: Mixkit.co (zero licensing hassles, no attribution required)

---

## Required Sound Effects

### 1. Bullet Hit Impact
**When**: Bullet collides with monster (BulletManager collision detection)

**Search Criteria (Mixkit.co)**:
- Primary: "bullet impact"
- Alternative: "metal hit", "punch impact", "small impact"
- Duration: 0.1-0.3 seconds
- Tone: Sharp, punchy, metallic

**File**: `bullet_impact.mp3` or `bullet_hit.mp3`

**Integration Point**:
- File: `src/server/entities/BulletManager.js` line 84
- Currently: No sound
- Add: Emit sound event to client, client plays locally

---

### 2. Monster Death Explosion (Upgrade)
**When**: Monster health reaches 0 (particle burst plays)

**Search Criteria (Mixkit.co)**:
- Primary: "small explosion"
- Alternative: "debris impact", "burst", "shatter"
- Duration: 0.5-1 second
- Tone: Explosive, satisfying, with decay/echo

**File**: `monster_explosion.mp3` or `demon_death.mp3`

**Integration Point**:
- File: `game.js` line 394 (onMonsterKilled callback)
- Currently: `demonDies.play()` (basic sound)
- Replace: With better explosion sound

---

### 3. Player Damage/Hit (Upgrade)
**When**: Monster damages player (melee attack)

**Search Criteria (Mixkit.co)**:
- Primary: "whoosh hit"
- Alternative: "punch", "body impact", "damage"
- Duration: 0.2-0.4 seconds
- Tone: Heavy, painful, with low-end thump

**File**: `player_damage.mp3` or `player_hurt.mp3`

**Integration Point**:
- File: `game.js` line 1013
- Currently: `playerHit.play()` (exists but may need upgrade)
- Replace/upgrade: Better impact sound

---

### 4. Healing Pickup
**When**: Player collects healing point (+20 health)

**Search Criteria (Mixkit.co)**:
- Primary: "powerup"
- Alternative: "chime", "magic", "restore", "pickup"
- Duration: 0.5-1 second
- Tone: Bright, uplifting, positive (major key)

**File**: `heal_pickup.mp3` or `health_restore.mp3`

**Integration Point**:
- File: `game.js` line 1054
- Currently: `healingRecharge.play()` (exists but may need upgrade)
- Replace/upgrade: More satisfying heal sound

---

### 5. Level Up Fanfare
**When**: Player gains a level (XP threshold reached)

**Search Criteria (Mixkit.co)**:
- Primary: "level up"
- Alternative: "achievement", "fanfare", "success", "win"
- Duration: 1-2 seconds
- Tone: Triumphant, celebratory, musical

**File**: `level_up.mp3`

**Integration Point**:
- File: Currently no level-up sound
- Add to: `game.js` function `updatePlayerLevel()` (line 1280)
- Trigger: When `player.level` increases

---

### 6. Shield Activation (Optional - Tier 2)
**When**: Player activates shield power-up

**Search Criteria (Mixkit.co)**:
- Primary: "shield"
- Alternative: "energy shield", "force field", "magic barrier"
- Duration: 0.5-1 second
- Tone: Protective, futuristic, energy-like

**File**: `shield_activate.mp3`

**Integration Point**:
- Add when shield system is polished (future)

---

## Mixkit.co Search Strategy

### How to Find Sounds

1. **Go to**: https://mixkit.co/free-sound-effects/

2. **Search categories**:
   - Game sounds
   - Impacts and hits
   - Explosions
   - UI sounds
   - Whooshes and transitions

3. **For each effect**:
   - Search using primary term
   - Preview 3-5 options
   - Download best match (MP3 format)
   - Rename to match our naming convention

4. **Download all to**: `/home/michael/proj/dcgame/sounds/`

---

## File Naming Convention

| Effect | Filename |
|--------|----------|
| Bullet hit | `bullet_impact.mp3` |
| Monster death | `monster_explosion.mp3` |
| Player damage | `player_damage.mp3` |
| Heal pickup | `heal_pickup.mp3` |
| Level up | `level_up.mp3` |
| Shield activate | `shield_activate.mp3` |

**Rationale**: Clear, descriptive, lowercase with underscores (Unix-friendly)

---

## Implementation Steps

### Phase 1: Download Assets (10 mins)
- [ ] Create `/sounds/` directory
- [ ] Search and download 5 core sounds from Mixkit
- [ ] Rename files to convention
- [ ] Test play in browser (sanity check)

### Phase 2: Load Sounds (15 mins)
- [ ] Update `game.js` to load new sound files
- [ ] Add Audio objects for each sound
- [ ] Verify loading in browser console

### Phase 3: Integrate Sounds (30 mins)
- [ ] Add bullet impact sound (client-side on bullet hit)
- [ ] Replace/upgrade monster death sound
- [ ] Replace/upgrade player damage sound
- [ ] Replace/upgrade heal pickup sound
- [ ] Add level-up sound trigger

### Phase 4: Volume Balancing (10 mins)
- [ ] Test all sounds together
- [ ] Adjust volume levels for consistency
- [ ] Ensure no sound is too loud/quiet

### Phase 5: Testing (10 mins)
- [ ] Play through game killing monsters
- [ ] Verify all sounds trigger correctly
- [ ] Check for timing issues (overlapping sounds)
- [ ] Test with music on/off

---

## Technical Notes

### Current Sound Loading Pattern
```javascript
// game.js lines 220-227
const demonDies = new Audio(`${scriptDirectory}/demon_dies.mp3`);
const playerHit = new Audio(`${scriptDirectory}/player_hit.mp3`);
const healingRecharge = new Audio(`${scriptDirectory}/healing_recharge.mp3`);
```

### New Sounds to Add
```javascript
const bulletImpact = new Audio(`${scriptDirectory}/sounds/bullet_impact.mp3`);
const monsterExplosion = new Audio(`${scriptDirectory}/sounds/monster_explosion.mp3`);
const playerDamage = new Audio(`${scriptDirectory}/sounds/player_damage.mp3`);
const healPickup = new Audio(`${scriptDirectory}/sounds/heal_pickup.mp3`);
const levelUp = new Audio(`${scriptDirectory}/sounds/level_up.mp3`);
```

### Sound Triggering Pattern
```javascript
// Example: Bullet hit
if (bulletHitMonster) {
    bulletImpact.play();
}
```

---

## Quality Criteria

### Good Sound Effect Checklist
- [ ] Clear, not muffled
- [ ] Appropriate duration (not too long)
- [ ] Matches the action visually
- [ ] Not jarring or annoying on repeat
- [ ] Works with background music
- [ ] Feels satisfying/impactful

### Avoid
- ❌ Sounds over 2 seconds (except music)
- ❌ Too realistic (e.g., real gunshots - keep it game-like)
- ❌ Low bitrate/quality
- ❌ Sounds with background noise

---

## Expected Impact

**Before**: Basic or missing audio feedback, feels flat
**After**: Every action has satisfying audio response, game feels polished

**Estimated Polish Increase**: 6.5/10 → 7.5/10 (audio alone adds 1 point)

---

## Future Enhancements (Tier 2+)

- Footstep sounds (when player walks)
- Ambient sounds per level (wind, water, city noise)
- Monster attack telegraph sound (warning before hit)
- Quiz correct/incorrect sounds (ding/buzz)
- Shield deactivation sound (when shield expires)
- Multiple variations per sound (avoid repetition)

---

## Resources

- **Mixkit Sound Effects**: https://mixkit.co/free-sound-effects/
- **License**: Free for commercial use, no attribution required
- **Format**: MP3 (browser-compatible)
- **Documentation**: https://mixkit.co/license/#sfxFree

---

## Notes

- All Mixkit sounds are royalty-free for commercial use
- No account required for download
- File sizes typically 50-500 KB (very lightweight)
- MP3 format works across all browsers
- Can replace sounds later without code changes
