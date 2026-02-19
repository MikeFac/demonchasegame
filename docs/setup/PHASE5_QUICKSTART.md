# Phase 5 - Quick Start Guide

## 🚀 Start Seeding (1 Song Per Category = 22 Total)

### 5-Minute Setup

**1. Create .env file**
```bash
cp .env.example .env
```

Edit `.env` and add:
```
MONGODB_URI=mongodb://localhost:27017/dcgame
KIE_API_KEY=your-actual-api-key-here
```

**2. Install MongoDB** (if needed)
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas
```

**3. Verify connection**
```bash
node test/verse-song-test.js
# Should show: ✅ Connected
```

**4. Seed category styles** (one-time)
```bash
node scripts/seed-category-styles.js
# Output: ✅ All category styles seeded successfully!
```

---

## 🎵 Start Generation

**Terminal 1: Start server**
```bash
node server.js
# Watch for: ✅ Connected to MongoDB for VerseSong
```

**Terminal 2: Seed 1 verse per category**
```bash
node scripts/seed-one-verse-per-category.js
# Output: 🚀 Queuing 22 verses for generation
```

**Terminal 3: Monitor progress**
```bash
node test/verse-song-test.js
# Repeat every 2-5 minutes
```

---

## ⏱️ Timeline

| Phase | Time | Status |
|-------|------|--------|
| Queuing | 5 min | ✅ Complete immediately |
| First Song | 10 sec | 📝 Queued to Suno |
| Songs 2-22 | 2-5 min each | ⏳ Generating in parallel |
| **All 22** | **45 min - 2 hours** | 🎵 Done! |

---

## 🔍 Monitor Generation

Watch the server logs (Terminal 1):
```
📝 Queued generation for John 3:16
📝 Queued generation for Proverbs 3:5
...
✅ Completed: John 3:16 → /content/audio/john-3-16.mp3
✅ Completed: Proverbs 3:5 → /content/audio/proverbs-3-5.mp3
```

Or run the test utility:
```bash
node test/verse-song-test.js
```

Shows:
```
   Generation Status:
   - Pending: 18
   - Processing: 2
   - Completed: 2
   - Failed: 0
   Progress: 9%
```

---

## 🎮 Test in Game (Once 1+ Songs Complete)

### API Test
```bash
curl "http://localhost:3500/api/verse-song?ref=John+3:16"
```

Response (if ready):
```json
{
  "verseReference": "John 3:16",
  "audioUrl": "/content/audio/john-3-16.mp3",
  "status": "ready"
}
```

### Browser Test
1. Open http://localhost:3500
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Paste:
```javascript
const song = await window.VerseSongService.getSongForVerse("John 3:16");
await window.MusicManager.playVerseTrack("John 3:16");
```
5. **You should hear music!** 🎵

### Play Game
1. Start game
2. Select any quality (category)
3. Display verse
4. **Music should play** if song is ready
5. Answer quiz correctly
6. Learning is tracked automatically

---

## ✅ Success Indicators

- ✅ All 22 queries show `status: "ready"`
- ✅ Audio files in `/public/content/audio/` (22 MP3s)
- ✅ Music plays in browser test
- ✅ Music plays during gameplay
- ✅ Learning tracked (playCount increments)

---

## 🆘 Troubleshooting

### "MONGODB_URI not set"
→ Create .env file with MONGODB_URI

### "Connection refused"
→ Is MongoDB running? `mongosh` should connect

### "Songs not generating"
→ Check server logs for Suno API errors
→ Verify KIE_API_KEY is valid

### "Music not playing in game"
→ Check that songs are completed: `node test/verse-song-test.js`
→ Check browser console (F12) for errors

**Full guide**: See SEEDING_INSTRUCTIONS.md

---

## 📊 Expected Results

After ~2 hours:

| Metric | Expected |
|--------|----------|
| Songs Complete | 22/22 (100%) |
| Failed | 0-1 |
| Categories Tested | 22 |
| Audio Storage | ~100-150 MB |
| Learning Tracked | Yes ✅ |

---

## 🎯 Next Steps

Once all 22 songs complete:

### Option A: Expand to 5 Per Category
```bash
node scripts/seed-top-verses.js
# Queues ~110 songs (top 5 from each category)
# ~4-8 hours of generation
```

### Option B: Adjust Styles
If any category seems to underperform:
1. Edit CategoryStyle in MongoDB
2. Change the `generationStyle`
3. Re-generate that category

### Option C: Full Analysis
Check learning effectiveness:
```bash
node test/verse-song-test.js  # View playCount/learnCount
```

---

## 📝 Key Files

- **SEEDING_INSTRUCTIONS.md** - Complete step-by-step guide
- **IMPLEMENTATION_STATUS.md** - Full architecture overview
- **.env.example** - Configuration template
- **scripts/seed-one-verse-per-category.js** - The seeding script
- **test/verse-song-test.js** - Progress monitor

---

## Status: 🟢 READY TO SEED

All infrastructure complete. Just run the 3 commands above and watch the songs generate!

**Expected time**: 45 min to 2 hours for 22 test songs

Enjoy! 🎵
