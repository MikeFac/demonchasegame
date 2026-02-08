# Verse-to-Song Learning System - Setup & Testing

## Prerequisites

1. **MongoDB Instance**
   - Local or remote MongoDB server
   - Access credentials

2. **Environment Variables**
   ```bash
   # In .env or deployment config:
   MONGODB_URI=mongodb://[user:pass@]host:port/database
   KIE_API_KEY=<your-kie.ai-api-key>
   ```

3. **Node Dependencies**
   ```bash
   npm install mongoose axios
   ```

## Setup Steps

### 1. Seed Category Styles (One-time)

Initialize the 22 category-to-style mappings:

```bash
node scripts/seed-category-styles.js
```

**Expected Output**:
```
✅ Connected to MongoDB
✨ Seeded: Wisdom → acoustic
✨ Seeded: Purity → ambient
... (22 total)
✅ All category styles seeded successfully!
```

### 2. Start the Server

```bash
node server.js
```

**Expected Output**:
```
✅ Connected to MongoDB for VerseSong
🔄 Retry job scheduled (30 minute interval)
Server running on port 3500
```

### 3. Seed Top 5 Verses per Category

Start the game (any player) to initialize VerseSongs, OR bulk-seed:

```bash
node scripts/seed-top-verses.js
```

**Expected Output**:
```
✅ Connected to MongoDB
Found 22 categories

✨ Created: John 3:16 (Love → pop)
✨ Created: Romans 12:2 (Wisdom → acoustic)
... (top 5 per category)

✅ Seeded 110 new verses (skipped 0 existing)
Queuing generation for pending verses...
🚀 Queuing 110 verses for generation...
```

**What Happens Next**:
- Server queues 110 verses for Suno generation
- Background polling starts ~10 seconds after each generation request
- Songs download as they complete to `/public/content/audio/`
- Generation takes ~2-5 minutes per verse (Suno processing time)

### 4. Monitor Progress

**Check Database Status**:
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
const VerseSong = require('./src/server/models/VerseSong');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const stats = await Promise.all([
    VerseSong.countDocuments({ generationStatus: 'pending' }),
    VerseSong.countDocuments({ generationStatus: 'processing' }),
    VerseSong.countDocuments({ generationStatus: 'completed' }),
    VerseSong.countDocuments({ generationStatus: 'failed' })
  ]);

  console.log('📊 VerseSong Status:');
  console.log('  Pending:', stats[0]);
  console.log('  Processing:', stats[1]);
  console.log('  Completed:', stats[2]);
  console.log('  Failed:', stats[3]);
  process.exit();
});
"
```

**Check Server Logs**:
```
📝 Queued generation for John 3:16 (ID: req_xyz...)
✅ Completed: John 3:16 → /content/audio/john-3-16.mp3
```

## API Testing

### 1. Request a Verse Song

```bash
curl "http://localhost:3500/api/verse-song?ref=John+3:16"
```

**Response (Ready)**:
```json
{
  "verseReference": "John 3:16",
  "audioUrl": "/content/audio/john-3-16.mp3",
  "status": "ready",
  "playCount": 0,
  "learnCount": 0
}
```

**Response (Pending)**:
```json
{
  "verseReference": "John 3:16",
  "status": "pending_generation",
  "message": "Song queued for generation. Using fallback music.",
  "generationStatus": "pending"
}
```

### 2. Record a Play/Learning Event

```bash
curl -X POST "http://localhost:3500/api/verse-song/record-play" \
  -H "Content-Type: application/json" \
  -d '{
    "verseReference": "John 3:16",
    "playDurationMs": 120000,
    "wasLearned": true
  }'
```

**Response**:
```json
{
  "verseReference": "John 3:16",
  "playCount": 1,
  "learnCount": 1,
  "averageRetention": 1.0
}
```

## Client-Side Testing

### Manual Test in Browser Console

```javascript
// 1. Check if VerseSongService is loaded
window.VerseSongService
// Expected: VerseSongService instance

// 2. Fetch a verse song
const song = await window.VerseSongService.getSongForVerse("John 3:16");
console.log(song);
// Expected: { verseReference, audioUrl, status, ... }

// 3. Play the verse song (once ready)
await window.MusicManager.playVerseTrack("John 3:16");
// Expected: true if ready, false if pending

// 4. Simulate learning
window.MusicManager.recordVerseLearned("John 3:16", true);
// Records to server in background
```

## Troubleshooting

### Songs Not Generating
1. **Check KIE_API_KEY**: `echo $KIE_API_KEY` (should be 32-char hex)
2. **Check server logs** for Suno API errors
3. **Check MongoDB** for failed records: `generationStatus: 'failed'`
4. **Manual retry**: Run `node scripts/seed-top-verses.js` again

### Songs Not Downloading
1. **Check `/public/content/audio/` exists**: `mkdir -p public/content/audio`
2. **Check disk space** (MP3s are ~2-5MB each)
3. **Check network** - audio download failing?
4. **Check Suno response** - is `audio_url` valid?

### Client Not Finding Songs
1. **Check Network tab** in DevTools for `/api/verse-song` calls
2. **Check browser console** for VerseSongService errors
3. **Clear cache**: `window.VerseSongService.clearCache()`
4. **Restart browser** (JavaScript cache)

## File Structure

```
dcgame/
├── public/content/audio/
│   ├── john-3-16.mp3
│   ├── romans-12-2.mp3
│   └── ... (one per verse)
│
├── src/
│   ├── client/
│   │   ├── VerseSongService.js
│   │   └── MusicManager.js (updated)
│   │
│   ├── server/
│   │   ├── models/
│   │   │   ├── VerseSong.js
│   │   │   └── CategoryStyle.js
│   │   │
│   │   ├── routes/
│   │   │   └── verseSong.js
│   │   │
│   │   ├── services/
│   │   │   └── SunoService.js
│   │   │
│   │   └── jobs/
│   │       └── retryFailedGenerations.js
│   │
│   └── shared/
│       └── ... (unchanged)
│
├── scripts/
│   ├── seed-category-styles.js
│   └── seed-top-verses.js
│
├── server.js (updated)
└── index.html (updated)
```

## Next Steps

### Phase 4: Integration with game.js
- [ ] Import `MusicManager.playVerseTrack()` in game.js
- [ ] Call when verse is selected
- [ ] Call `recordVerseLearned()` when player answers correctly
- [ ] Test end-to-end in actual gameplay

### Phase 5: Analytics & Monitoring
- [ ] Dashboard showing playCount/learnCount per verse
- [ ] Learning effectiveness analysis
- [ ] A/B test different styles per category
- [ ] Iterate based on player feedback

## Performance Notes

- **Polling interval**: 5 seconds (configurable in SunoService.js)
- **Max polling time**: 20 minutes per verse
- **Concurrent generations**: Staggered by 2s to avoid API rate limits
- **Cache**: VerseSongService caches results in sessionStorage
- **Retry**: Failed generations auto-retry every 30 minutes (max 3 attempts)

## Monitoring & Maintenance

**Daily**:
- Check server logs for Suno API errors
- Monitor failed generation count

**Weekly**:
- Analyze learning effectiveness (learnCount / playCount ratio)
- Identify most/least effective verse-style pairs
- Consider adjusting styles if retention is low (<50%)

**Monthly**:
- Generate cost analysis (Suno API usage)
- Player feedback analysis
- Plan style adjustments or new categories
