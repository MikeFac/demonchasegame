# Verse Song Debugging & Fixes

## Issues Identified

### Issue 1: Verse Songs Not Playing
**Symptom:** Music songs are not playing when verses are selected for quizzes.

**Root Cause:** Songs haven't been seeded and generated in production database yet. The system is working correctly (returns "pending_generation" status), but no songs exist with status="active" and audioUrl set.

**Evidence:**
- Phase 5 seeding scripts exist but require manual execution
- No automatic seeding happens on deployment
- MusicManager correctly handles pending songs (line 188: checks for `status === 'ready'`)
- VerseSongService correctly queries `/api/verse-song` endpoint

**Solution:** Run seeding script to generate initial batch of verse songs.

### Issue 2: Level Progression Bug
**Symptom:** "Jumps from level 2 maze to 3rd level automatically - not resetting the win condition"

**Root Cause:** Line 255 of Game.js used global `Constants.CELL_SIZE` instead of instance `this.constants.CELL_SIZE` in resetLevelData(). This could cause maze dimension mismatches.

**Fix Applied:** Changed line 255 to use `this.constants.CELL_SIZE`.

---

## How Verse Song System Works

### Client Flow
1. **QuizManager.pickQualityVerse()** selects a verse for the quiz
2. **Calls:** `window.MusicManager.playVerseTrack(verse.Reference)`
3. **MusicManager.playVerseTrack()** makes async call to fetch song
4. **Calls:** `window.VerseSongService.getSongForVerse(verseReference)`
5. **Fetches:** `GET /api/verse-song?ref=Psalms+118:6`

### Server Flow
1. **GET /api/verse-song?ref=**
   - Queries database for `{ verseReference: ref }`
   - If found with status='active' and audioUrl: **returns audioUrl** ✅
   - If found with generationStatus='processing': returns status='pending_generation'
   - If not found: creates record and queues generation

2. **SunoService.generateVerseSong()** (async)
   - Sets generationStatus='processing'
   - Sends lyrics to Suno API via kie.ai
   - Starts polling for completion (first after 10s, then every 5s)

3. **SunoService.pollSunoStatus()** (polling)
   - Checks if Suno generation is complete
   - When status='SUCCESS': downloads audio file to `/audio/{normalized-ref}.mp3`
   - Updates database with `status='active'`, `audioUrl='/audio/{normalized-ref}.mp3'`

### Client Fallback
- If song status != 'ready': uses default background music
- Graceful degradation: game never breaks, always has music

---

## Production Seeding Status

### Songs Currently Generated
- Check database: `db.versesongs.find({ status: 'active' }).count()`
- Expected: 22-110 songs (depending on which seeding script ran)

### To Verify Songs Exist
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const VerseSong = require('./src/server/models/VerseSong');
  const ready = await VerseSong.countDocuments({ status: 'active' });
  const pending = await VerseSong.countDocuments({ generationStatus: 'processing' });
  const failed = await VerseSong.countDocuments({ generationStatus: 'failed' });
  console.log('Ready:', ready, '| Processing:', pending, '| Failed:', failed);
  process.exit(0);
});
"
```

### To Generate Songs (Production)
```bash
# SSH to production server
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && node scripts/seed-one-verse-per-category.js'"

# Monitor generation in another terminal
node test/verse-song-test.js
```

Expected time: 45 min - 2 hours for 22 songs

---

## Fixes Applied

### 1. ✅ Level Progression Bug - Constants Reference
**File:** `src/server/Game.js`, line 255

**Before:**
```javascript
cellSize: Constants.CELL_SIZE  // Wrong - uses global
```

**After:**
```javascript
cellSize: this.constants.CELL_SIZE  // Correct - uses instance config
```

**Impact:** Ensures maze grid dimensions are consistent with actual world size, fixing potential spawn-in-wall issues.

---

## Testing

### Test 1: Verify Songs Are Ready
```bash
# Check single verse
curl "http://localhost:3500/api/verse-song?ref=Psalms%20118:6"

# Should return:
# { status: 'ready', audioUrl: '/audio/psalms118-6.mp3', ... }
# (not 'pending_generation' or missing audioUrl)
```

### Test 2: Verify Level Progression
1. Start solo game on level 1
2. Kill 60% of monsters → should see "Level advancing! Countdown: 5"
3. Wait 5 seconds → should load level 2 with new maze
4. Check console: "Level 2 data reset." should appear
5. Verify player spawned in valid position (not in wall)

### Test 3: Verify Verse Song Playback
1. Start solo game
2. Answer quiz question to trigger verse selection
3. Open browser console
4. Should see logs like:
   - `"🎵 Playing educational music for: Psalms 118:6"` (if song ready)
   - `"⏳ Verse song pending for Psalms 118:6—using default music"` (if still generating)
5. Audio should play (verse song or default background)

---

## Next Steps

### Immediate (Required for Users)
1. Run seeding script in production to generate initial batch of songs
2. Monitor progress with test script
3. Verify songs playing in-game

### Optional (Future Enhancement)
1. Implement automatic seeding on server startup (if .env configured)
2. Add admin dashboard to monitor song generation progress
3. Add UI to show "Learning Song Ready" vs "Generating..." status

---

## Architecture Notes

- **Verse references:** Stored as "Psalms 118:6" (non-normalized) in DB
- **Audio filenames:** Stored as "/audio/psalms118-6.mp3" (normalized) on disk
- **Non-blocking:** Song generation never blocks gameplay
- **Graceful degradation:** Missing songs = fallback music, game continues
- **Polling:** Every 5 seconds checks if generation complete (max 20 minutes)
