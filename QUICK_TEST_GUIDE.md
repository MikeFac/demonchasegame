# Quick Test Guide - Daily Challenge, Verse Counter, Game-Over Modal

**Server Status:** ✅ Running on http://localhost:3500

## Visual Test Steps (5 minutes)

### 1. Daily Challenge (Bottom-Left Corner)
```
Expected: "Daily: 0/5 (First Letter)"
```

**Test Steps:**
1. Open game at http://localhost:3500
2. Start Solo game
3. Look at **bottom-left corner** of screen
4. You should see: `Daily: 0/5 (First Letter)`
5. Answer a **First Letter** quiz correctly
6. Counter should increment: `Daily: 1/5 (First Letter)`
7. Answer 4 more First Letter quizzes correctly
8. At 5/5, text should change to: `✓ Daily Challenge Complete!` (green)

**Browser Console Check:**
```javascript
localStorage.getItem('dailyChallengeProgress')  // Should be "5"
localStorage.getItem('dailyChallengeCompleted') // Should be "true"
```

---

### 2. Verse Counter (Top-Left, Below Stats)
```
Expected: "Verses Learned: 0 / 1618" with yellow progress bar
```

**Test Steps:**
1. Look at **top-left area** (below health/XP stats)
2. You should see: `Verses Learned: 0 / 1618` with yellow text
3. A yellow progress bar should appear below the text
4. Answer a **First Letter** quiz correctly (e.g., "John 3:16")
5. Counter should increment: `Verses Learned: 1 / 1618`
6. Progress bar should fill slightly
7. Answer the **same verse** again
8. Counter should **NOT** increment (de-duplication works)
9. Answer a **Missing Word** or **Category Match** quiz correctly
10. Counter should **NOT** increment (only First Letter counts)

**Browser Console Check:**
```javascript
localStorage.getItem('versesLearned')     // Should match displayed count
localStorage.getItem('learned_John_3:16') // Should be "true" for learned verses
```

---

### 3. Game-Over Modal (Center Screen)
```
Expected: Full-screen modal with stats and "Try Again" button
```

**Test Steps:**
1. Play game and **let monsters attack you** (don't answer quizzes)
2. Wait for health to reach 0
3. A modal should appear with:
   - ⚫ Full-screen dark overlay
   - 🔴 Red "GAME OVER" title
   - 📊 Stats:
     - "Level Reached: 1" (or higher)
     - "Monsters Killed: X"
     - "Verses Learned: Y" (your progress)
     - "Time Played: Xm Ys"
   - 🟢 Green "Try Again" button
4. Click the **"Try Again"** button
5. Page should reload completely
6. After reload, check that:
   - Daily challenge progress is **preserved**
   - Verse counter is **preserved**

**Browser Console Check:**
```javascript
// Should log before modal appears:
"Game Over - Final Stats: {level: 1, monstersKilled: 5, versesLearned: 2, timePlayed: 120}"
```

---

## Quick Integration Test (10 minutes)

**Complete Cycle:**
1. ✅ Start game (Daily: 0/5, Verses: 0/1618)
2. ✅ Answer 5 First Letter quizzes correctly
3. ✅ See "Daily Challenge Complete!" message
4. ✅ Check verse counter increased (should be 5 if all unique)
5. ✅ Let health reach 0 (game over)
6. ✅ See modal with correct stats
7. ✅ Click "Try Again"
8. ✅ Reload and verify:
   - Daily challenge shows "✓ Daily Challenge Complete!"
   - Verse counter shows previous count (5/1618)

---

## Expected Console Logs

**On Game Start:**
```
Daily Challenge: 0/5 (Completed: false)
Verses Learned: 0/1618
Game initialized
```

**After First Letter Correct Answer:**
```
📖 Verse learned! Total: 1/1618
```

**After 5th First Letter Answer:**
```
🎉 Daily challenge completed! Bonus +20 XP
📖 Verse learned! Total: 5/1618
```

**On Death:**
```
Game Over - Final Stats: {level: 1, monstersKilled: 3, versesLearned: 5, timePlayed: 180}
```

---

## Troubleshooting

### Daily Challenge not showing?
- Check bottom-left corner (y = canvas.height - 30)
- Try answering First Letter quizzes specifically
- Check localStorage: `localStorage.getItem('dailyChallengeProgress')`

### Verse Counter not incrementing?
- Only **First Letter** quizzes count
- Same verse won't count twice
- Check localStorage: `localStorage.getItem('versesLearned')`

### Modal not appearing?
- Make sure health actually reached 0
- Check console for errors
- Try: `console.log(gameOverModalVisible)` in browser

### "Try Again" not working?
- Make sure you're clicking the green button
- Button is centered in modal
- Check console for click detection logs

---

## Reset Testing Data

**Clear Daily Challenge:**
```javascript
localStorage.removeItem('dailyChallengeDate')
localStorage.removeItem('dailyChallengeProgress')
localStorage.removeItem('dailyChallengeCompleted')
location.reload()
```

**Clear Verse Counter:**
```javascript
// Clear all learned verses
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('learned_')) {
        localStorage.removeItem(key)
    }
})
localStorage.removeItem('versesLearned')
location.reload()
```

**Clear Everything:**
```javascript
localStorage.clear()
location.reload()
```

---

## Screenshots to Verify

1. **Daily Challenge Progress:** Bottom-left shows "Daily: 3/5 (First Letter)"
2. **Daily Challenge Complete:** Bottom-left shows "✓ Daily Challenge Complete!" (green)
3. **Verse Counter:** Top-left shows "Verses Learned: 10 / 1618" with yellow bar
4. **Game-Over Modal:** Full modal with stats and "Try Again" button

---

## Production Deployment

Once local testing passes:

```bash
# Add and commit changes
git add game.js src/client/QuizManager.js src/client/Renderer.js src/client/InputHandler.js
git commit -m "feat: Add daily challenge, verse counter, and game-over modal"

# Push to remote
git push origin master

# Deploy to production (SSH as root first)
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull' && kill \$(pgrep -f 'node /var/www/dcgame.4you.tel/server.js')"
```

---

**Test Status:** Ready for verification
**Server:** http://localhost:3500 (running)
**Estimated Test Time:** 5-10 minutes

✅ All features implemented and syntax-verified!
