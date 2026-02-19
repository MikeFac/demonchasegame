# Verse of the Day Feature Implementation Plan

**Date:** 2026-02-16
**Status:** PENDING
**Worktree:** Yes

## Context

The Demon Chase Game is a multiplayer Bible verse quiz game where players answer quizzes to defeat demons. To increase user retention and engagement with the Bible, we're adding a "Verse of the Day" feature that provides daily memorization challenges with progressive learning and meditation modes.

Players will receive a different verse each day, engage in guided memorization/meditation, and earn a +20% damage bonus for the day if they complete the test. This creates a daily engagement hook and reinforces Scripture memorization.

## Approach

The implementation reuses existing architectural patterns:
- **Menu integration**: Existing menu system (game.js callback handler, Renderer.js menu items, InputHandler.js click detection)
- **Full-screen overlays**: Same pattern as ReviewMode.js and VerseTestScreen
- **Audio playback**: Existing Web Audio API (SoundEffects.js) for fanfare, HTML5 Audio for verse narration
- **Bonus system**: Reuse existing multiplier pattern (Sword/Breastplate buffs in game.js) but apply it to all damage
- **localStorage**: Existing string-based pattern used by daily challenge, versesLearned, etc.
- **Quiz logic**: Reuse quiz utilities from QuizManager.js (generateFirstLetterQuiz)

### Architecture Decision: Mode-Based State Machine

The VOTD feature uses three full-screen modes (like ReviewMode):
1. **VOTD Splash** - Initial "Verse of the Day selected" screen (quick transition)
2. **VOTD Learning** - Progressive memorization/review mode
3. **VOTD Test** - 50% words hidden challenge

All three replace the game view entirely (set `gameMode = 'votd'`), ensuring clean separation from gameplay.

## Implementation Tasks

### Task 1: Core VOTD Manager (VersOfTheDayManager.js)
**File:** `src/client/VersOfTheDayManager.js`

Responsible for VOTD state management and bonus tracking.

**Methods:**
- `selectVersOfTheDay()` - Returns verse object for today (consistent rotation or hash-based)
- `getToday()` - Returns YYYY-MM-DD string
- `getTodayVerse()` - Returns cached verse or selects new one
- `getBonusMultiplier()` - Returns 1.2 if bonus earned today, else 1.0
- `earnBonus()` - Sets localStorage flag for today's completion
- `isBonusActive()` - Checks if today's date matches stored bonus date
- `clearExpiredBonus()` - Clears bonus if date changed

**State:**
- `todayVerse` - Current verse object
- `selectedDate` - Cache key for today

**Key decisions:**
- Verse selection: Use modulo (date as number % verseList.length) for deterministic daily rotation
- Bonus duration: One calendar day (expires at midnight)
- Storage: `localStorage.votdBonus = { date: "YYYY-MM-DD", earned: true }`

---

### Task 2: VOTD Learning Mode (VotdLearningMode.js)
**File:** `src/client/VotdLearningMode.js`

Progressive memorization interface with word-removal iterations.

**Structure:** Similar to ReviewMode.js—IIFE with private state, exports `window.VotdLearningMode`

**Methods:**
- `start(verseObj)` - Initialize learning mode, play verse audio
- `showPhase(phase)` - Render current phase ('presentation' | 'review1' | 'review2' | ... | 'testOption')
- `progressReview()` - Increment words hidden, move to next iteration
- `launchTest()` - Transition to VotdTestMode
- `exitLearningMode()` - Return to game

**State:**
- `currentVerse` - Verse being learned
- `wordsHidden` - Number of words removed (starts at 1)
- `maxWordsHidden` - 50% of verse (Math.ceil(verseWords.length / 2))

**Rendering:**
- Phase 1 (Presentation): Large verse text + audio playback + "Tap to Continue"
- Phase 2+ (Review): Verse with N blanks + audio + quiz (first letters)
  - Quiz: 1 correct letter + 5 distractors per blank
  - Randomized distractor selection (avoid real letters)
  - Visual feedback (green correct, red wrong)

**Key reuse:**
- `generateFirstLetterQuiz()` from QuizManager.js (can extract into utility)
- Audio playback: Use existing verse audio paths (ReviewMode pattern: `"GEN-1-1.ogg"` format)
- Verse text rendering: Reuse `displayVerseWithBlanks()` logic from ReviewMode

---

### Task 3: VOTD Test Mode (VotdTestMode.js)
**File:** `src/client/VotdTestMode.js`

Final assessment with 50% words hidden and bonus reward.

**Structure:** Similar to VotdLearningMode.js

**Methods:**
- `start(verseObj)` - Initialize test with 50% words hidden
- `render()` - Draw verse with blanks + input interface
- `handleSubmit(letterSequence)` - Validate user input
- `showSuccess()` - Fanfare + confetti animation
- `showFailure(correctSequence)` - Show correct answers + retry option
- `exitTestMode()` - Return to game

**State:**
- `currentVerse` - Verse being tested
- `hiddenWordCount` - Always 50% of total
- `hiddenIndices` - Array of word positions that are blanks
- `correctLetters` - Expected first letters (in order)

**Success Flow:**
1. User types/clicks all first letters correctly
2. Play success fanfare (`playFanfare()` from SoundEffects.js)
3. Draw confetti animation (new method: `drawConfetti()`)
4. Show message: "Verse Complete! +20% Damage Bonus Today"
5. Call `VersOfTheDayManager.earnBonus()`
6. Auto-return to game after 3 seconds

**Failure Flow:**
1. Show which letters were wrong
2. Display correct answers
3. Offer "Try Again" or "Review Again"

**Input Method:**
- For each missing word: Show 6 clickable buttons (1 correct letter + 5 distractors)
- User clicks buttons in sequence to answer all blanks
- Same approach as first-letter quiz in QuizManager.js

---

### Task 4: Menu Integration (game.js)
**File:** `game.js`

Add VOTD to game menu and damage bonus calculation.

**Changes:**

a) **Add VOTD state variable** (after line 224):
```javascript
let votdMode = null; // 'learning' | 'test' | null
```

b) **Add menu item handler** (in onMenuItemClick, line 1155):
```javascript
case 'verseCotD': // "Verse of the Day" menu item
    votdMode = 'learning';
    VotdLearningMode.start(VersOfTheDayManager.getTodayVerse());
    menuOpen = false;
    break;
```

c) **Add damage bonus to bullet damage** (in BulletManager collision, line 78):
```javascript
const votdBonus = VersOfTheDayManager.getBonusMultiplier();
const damage = (hasSword
    ? Constants.BULLET_DAMAGE * Constants.SWORD_DAMAGE_MULTIPLIER
    : Constants.BULLET_DAMAGE) * votdBonus;
```

d) **NO change to monster damage** - Monster damage calculations remain unchanged (incoming damage is not affected by VOTD bonus)

e) **Add gameMode handling** (in game loop):
```javascript
// At start of game loop (after mode check)
if (votdMode === 'learning') {
    VotdLearningMode.render();
} else if (votdMode === 'test') {
    VotdTestMode.render();
}
```

---

### Task 5: Renderer Integration (Renderer.js)
**File:** `src/client/Renderer.js`

**Changes:**

a) **Add VOTD menu item** (in `drawMenuPanel`, line 189):
```javascript
// Add to items array:
{ label: "Verse of the Day", id: 'verseCotD' }
```

b) **Add HUD indicator for bonus** (in main game rendering):
```javascript
if (VersOfTheDayManager.isBonusActive()) {
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.font = 'bold 14px Arial';
    ctx.fillText('+20% Damage to Bullets', UILayout.getHamburgerButtonX() - 120, 30);
}
```

c) **Ensure VOTD rendering happens** (if full-screen mode):
- VOTD modes are full-screen (replace game view)
- No need to render game objects when `gameMode === 'votd'`

---

### Task 6: InputHandler Integration (InputHandler.js)
**File:** `src/client/InputHandler.js`

Add input detection for VOTD modes.

**Changes:**

a) **Add VOTD click detection** (at top of onGameClick, after ReviewMode check):
```javascript
if (gameMode === 'votd' && votdMode === 'learning') {
    VotdLearningMode.handleClick(x, y);
    return;
} else if (gameMode === 'votd' && votdMode === 'test') {
    VotdTestMode.handleClick(x, y);
    return;
}
```

---

### Task 7: Audio & Animations (SoundEffects.js / Renderer.js)
**Files:** `src/client/SoundEffects.js`, `src/client/Renderer.js`

**Changes:**

a) **Add fanfare sound** (in SoundEffects.js):
```javascript
function playFanfare() {
    // C-E-G-C major chord arpeggio with rising pitch
    // 4 notes: C5, E5, G5, C6 with 150ms spacing
    // Use existing oscillator pattern
}
```

b) **Add confetti animation** (in Renderer.js):
```javascript
function drawConfetti() {
    // Particle system: 50-100 particles
    // Each: random color, position, falling/spinning motion
    // Fade out over 3-5 seconds
}
```

---

### Task 8: Test & Integration
**Verify:**
- [ ] VOTD displays on login (select verse, show splash)
- [ ] Menu item appears and opens learning mode
- [ ] Learning mode: verse displays + audio plays
- [ ] Learning mode: click continues to quiz
- [ ] Learning mode: first-letter quiz works (1 word → 2 words → ... → 50%)
- [ ] Learning mode: "Test Now" transitions to test mode
- [ ] Test mode: 50% words hidden
- [ ] Test mode: input validation works
- [ ] Test mode: success shows fanfare + confetti
- [ ] Test mode: bonus stored in localStorage
- [ ] Bonus multiplier applied to outgoing damage (bullets)
- [ ] Bonus multiplier applied to incoming damage (reduction)
- [ ] HUD indicator shows "+20% Damage" when bonus active
- [ ] Bonus expires at midnight (localStorage date check)
- [ ] Multiple playthroughs on same day show persistent bonus
- [ ] New day resets to new verse

---

## File Structure Summary

### New Files
- `src/client/VersOfTheDayManager.js` - State & bonus management
- `src/client/VotdLearningMode.js` - Progressive memorization interface
- `src/client/VotdTestMode.js` - Final assessment & reward
- `.claude/plans/verse-of-day-feature.md` - This plan

### Modified Files
- `game.js` - Menu handler, damage bonus, mode management
- `src/client/Renderer.js` - Menu item, HUD indicator
- `src/client/InputHandler.js` - VOTD click detection
- `src/client/SoundEffects.js` - Fanfare sound (optional enhancement)

### No Changes Required
- `ReviewMode.js` - Keep separate (distinct from VOTD)
- `QuizManager.js` - Reuse utilities (first-letter quiz logic)
- `Constants.js` - No new constants needed (reuse existing)
- Server-side files - All VOTD is client-side (localStorage-based)

---

## Verification Checklist

**Functional Testing:**
- [ ] Verse of the Day selected consistently (same verse all day)
- [ ] Learning mode progression works (1→2→...→50% words)
- [ ] Test mode with exactly 50% words hidden
- [ ] First-letter quiz with correct + distractor validation
- [ ] Success state: fanfare sound, confetti, bonus message
- [ ] Bonus applied to outgoing damage only (bullets), not monster incoming damage
- [ ] Bonus persists across multiple game sessions on same day
- [ ] Bonus expires and new verse appears on new calendar day

**Integration Testing:**
- [ ] Game plays normally without VOTD interaction
- [ ] Menu item visible and clickable
- [ ] Exiting VOTD returns to game cleanly
- [ ] No errors in browser console
- [ ] localStorage keys don't conflict with existing data

---

## Open Questions for User Approval

1. **Verse Selection**: All users see the same VOTD each day (deterministic rotation)
   - **Decision (User)**: Same verse for all users on same day

2. **Input Method**: Click buttons per blank (6 buttons: 1 correct + 5 distractors per missing word)
   - **Decision (User)**: Click buttons for accessibility and visual interaction

3. **Difficulty Scaling**: Should VOTD difficulty adjust by player level?
   - Current plan: No (same verse for all, but test difficulty is fixed at 50%)
   - Alternative: Yes (longer verses for high-level players)

4. **Bonus Type**: Apply only to bullet damage (player attacks), not monster damage (incoming)
   - **Decision (User)**: Bonus applies to bullet damage only. Monster incoming damage is not affected, no protection bonus.

5. **Fanfare Audio**: Generate via Web Audio API (like existing SFX) or use a pre-recorded file?
   - Current plan: Web Audio API (no external files needed)

**Please confirm the above decisions before implementation begins.**

---

## Critical Implementation Notes

**Reusable Patterns:**
- First-letter quiz generation: Extract from `QuizManager.generateFirstLetterQuiz()` and reuse (avoid duplication)
- Verse audio paths: Use same format as ReviewMode.js (`"GEN-1-1.ogg"`)
- Menu item integration: Follow exact same callback pattern as existing menu items

**Potential Pitfalls:**
- localStorage date format must be consistent (use `YYYY-MM-DD`)
- Damage multiplier must be applied AFTER other multipliers (order matters for game balance)
- Make sure VOTD modes fully replace game view (no overlapping rendering)
- Confetti animation should not block input or cause performance issues

**Testing Strategy:**
- Unit test VersOfTheDayManager methods (localStorage interactions)
- Integration test full flow: Login → VOTD splash → Learning → Test → Bonus applied
- Manual testing on multiple days to verify bonus expiration
