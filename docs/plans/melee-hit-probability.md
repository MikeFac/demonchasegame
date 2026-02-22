# Melee Hit Probability Without Quiz Answer

**Status:** In Progress  
**Created:** 2026-02-22  
**Last Updated:** 2026-02-22

---

## Summary

Add a configurable probability for melee attacks to succeed even when the player hasn't answered the current quiz question correctly. This improves accessibility for new players while maintaining quiz incentives.

---

## Problem

Currently, melee combat is binary:
- Quiz answered correctly → Attack always hits
- Quiz not answered → Attack never hits

This creates frustration for:
- New players who don't know verses yet
- Players struggling with a particular verse
- Situations where a player is "stuck" and can't progress

---

## Solution

Allow a configurable probability of landing a melee hit even without answering the quiz:
- Quiz answered correctly → 100% hit chance (unchanged)
- Quiz not answered → Probability-based hit chance

The monster still damages the player regardless, so this doesn't remove risk.

---

## Configuration

Uses existing difficulty presets (Easy/Normal/Hard):

| Difficulty | Hit Probability | Rationale |
|------------|-----------------|-----------|
| Easy | 20% | Welcoming to new players |
| Normal | 10% | Helps but doesn't replace learning |
| Hard | 0% | Must know verses to succeed (current behavior) |
| Custom | 10% | Default for custom configurations |

---

## Implementation Details

### Files Modified

1. **src/server/config/GameConfig.js** - Add `meleeHitProbabilityNoAnswer` to presets
2. **game.js** - Apply probability in melee combat logic

### GameConfig Changes

```javascript
// Add to each preset in PRESETS object
meleeHitProbabilityNoAnswer: 0.5  // Easy
meleeHitProbabilityNoAnswer: 0.3  // Normal  
meleeHitProbabilityNoAnswer: 0.0  // Hard
```

### game.js Changes

In the melee combat section (~line 2200):

```javascript
// Determine if attack hits
let attackHits = false;
if (isAnswerCorrect === true) {
    attackHits = true;  // Always hit if answered correctly
} else if (meleeHitProbabilityNoAnswer > 0 && Math.random() < meleeHitProbabilityNoAnswer) {
    attackHits = true;  // Probability-based hit without answer
}

if (attackHits) {
    // ... existing attack code
}
```

---

## User Experience

- Player enters melee range with monster
- Quiz is displayed but player doesn't know the answer
- Player still has a chance to land attacks (based on difficulty)
- Monster continues to damage player
- Player learns verses through repeated exposure while still participating

---

## Success Metrics

- Reduced early game drop-off (new players stay longer)
- Increased session duration for struggling players
- No significant decrease in quiz completion rate

---

## Future Enhancements (Not in Scope)

- Visual feedback for "near miss" attacks
- Combo system that increases probability with consecutive attacks
- Special items that boost probability temporarily

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-22 | Claude | Initial plan and implementation |
