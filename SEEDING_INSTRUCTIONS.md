# Phase 5: Seeding Instructions

## Prerequisites

### 1. MongoDB Setup

You need a MongoDB instance. Choose one:

**Option A: Local MongoDB** (Development)
```bash
# Install MongoDB locally
# macOS with Homebrew:
brew install mongodb-community
brew services start mongodb-community

# Verify it's running:
mongosh
# Should show: test>
```

**Option B: MongoDB Cloud** (Production)
```bash
# Create free account at: https://www.mongodb.com/cloud/atlas
# Create cluster and get connection string
# Format: mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### 2. kie.ai API Key

1. Sign up at https://kie.ai
2. Get your API key from dashboard
3. Note it for .env file

### 3. Create .env File

Copy .env.example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb://localhost:27017/dcgame
KIE_API_KEY=your-actual-api-key
PORT=3500
```

**Save and don't commit .env** (already in .gitignore)

---

## Seeding Steps

### Step 1: Verify MongoDB Connection
```bash
node test/verse-song-test.js
```

Expected output:
```
🧪 Verse-Song System Test

1️⃣  Connecting to MongoDB...
✅ Connected
```

If it fails:
- Check MONGODB_URI in .env
- Verify MongoDB is running
- Check connection string format

### Step 2: Seed Category Styles (One-time)

Initialize the 22 category→style mappings:

```bash
node scripts/seed-category-styles.js
```

Expected output:
```
✅ Connected to MongoDB
✨ Seeded: Wisdom → acoustic
✨ Seeded: Purity → ambient
... (22 total)
✅ All category styles seeded successfully!
```

**This only needs to run once.** If you run it again, it will skip existing entries.

### Step 3: Start the Server

In one terminal, keep the server running:

```bash
node server.js
```

Expected output:
```
✅ Connected to MongoDB for VerseSong
🔄 Retry job scheduled (30 minute interval)
Server running on port 3500
```

### Step 4: Seed One Verse Per Category (22 verses)

In another terminal:

```bash
node scripts/seed-one-verse-per-category.js
```

Expected output:
```
✅ Connected to MongoDB
Found 22 categories

✨ Created: John 3:16 (Love → pop)
✨ Created: Proverbs 3:5-6 (Wisdom → acoustic)
... (22 total)

✅ Seeded 22 verses (skipped 0 existing)

Now queuing generation for pending verses...

🚀 Queuing 22 verses for generation (staggered by 2s)...

✅ All 22 verses queued for generation
```

**The script exits after queuing.** Generation happens in the background!

### Step 5: Monitor Generation Progress

In the same terminal as step 4, or a new terminal:

```bash
node test/verse-song-test.js
```

Run this **periodically** to check status. You should see something like:

```
🧪 Verse-Song System Test

2️⃣  Checking VerseSong documents...
✅ Found 22 verse songs

   Generation Status:
   - Pending: 15
   - Processing: 3
   - Completed: 4
   - Failed: 0
```

**Expected timeline**:
- First song ~10 seconds
- Each song ~2-5 minutes
- All 22 songs: ~45 minutes to 2 hours

### Step 6: Check Server Logs

Watch the server terminal (from step 3) for completion messages:

```
📝 Queued generation for John 3:16 (ID: req_xyz...)
✅ Completed: John 3:16 → /content/audio/john-3-16.mp3
```

---

## Testing a Completed Song

Once at least 1 song is completed, test the API:

```bash
curl "http://localhost:3500/api/verse-song?ref=John+3:16"
```

**If ready**:
```json
{
  "verseReference": "John 3:16",
  "audioUrl": "/content/audio/john-3-16.mp3",
  "status": "ready",
  "playCount": 0,
  "learnCount": 0
}
```

**If still processing**:
```json
{
  "verseReference": "John 3:16",
  "status": "pending_generation",
  "message": "Song is being generated. Using fallback music."
}
```

---

## Browser Testing (Once Songs Ready)

1. Open http://localhost:3500 in browser
2. Start game (any quality/category)
3. Open browser console (F12 → Console tab)
4. Try:

```javascript
// Fetch a verse song
const song = await window.VerseSongService.getSongForVerse("John 3:16");
console.log(song);
// Expected: { verseReference, audioUrl, status: "ready", ... }

// Play it
const wasPlayed = await window.MusicManager.playVerseTrack("John 3:16");
console.log(wasPlayed);  // true if ready, false if pending
```

5. You should **hear music** if the song is ready!

---

## Troubleshooting

### "MONGODB_URI not set" Error
- Create .env file in dcgame root directory
- Add: `MONGODB_URI=mongodb://localhost:27017/dcgame`
- Restart: `node server.js`

### MongoDB Connection Refused
- Is MongoDB running? `mongosh` should connect
- Check MONGODB_URI format
- For Atlas (cloud): verify IP whitelist includes your IP

### "KIE_API_KEY not set" Error
- Add to .env: `KIE_API_KEY=your-actual-key`
- Restart server

### Songs Not Generating
1. Check server logs for Suno API errors
2. Verify KIE_API_KEY is valid
3. Check MongoDB has CategoryStyle entries (from step 2)
4. Run: `node test/verse-song-test.js`

### Songs Not Downloaded
1. Verify `/public/content/audio/` directory exists
2. Check disk space: `df -h`
3. Check directory permissions: `ls -la public/content/`

### No Music Playing in Game
1. Check browser console for errors (F12)
2. Check VerseSongService is loaded: `window.VerseSongService` in console
3. Verify songs are completed: `node test/verse-song-test.js`
4. Manually test: `curl "http://localhost:3500/api/verse-song?ref=John+3:16"`

---

## What Happens Next

After songs complete:
1. Play dcgame normally
2. Select a quality (category)
3. Display verse → **Music plays** (if available)
4. Answer quiz correctly → Learning tracked
5. Check analytics: `node test/verse-song-test.js`

---

## Full Seeding (Later)

Once you verify one song from each category works, expand to 5 per category:

```bash
node scripts/seed-top-verses.js
```

This queues ~110 songs (5 × 22 categories) = ~4-8 hours of generation

---

## Keeping Things Running

For long-term monitoring:

```bash
# Terminal 1: Server (keep running)
node server.js

# Terminal 2: Watch progress (run periodically)
watch -n 60 "node test/verse-song-test.js"

# Terminal 3: Check logs
tail -f server.log  # If you redirect output
```

---

## Success Checklist

- ✅ .env created with MONGODB_URI and KIE_API_KEY
- ✅ MongoDB connection verified
- ✅ Category styles seeded (22 entries)
- ✅ Server running without errors
- ✅ One verse per category seeded (22 songs)
- ✅ Generation started (check server logs)
- ✅ At least 1 song completed
- ✅ API returns "ready" status for completed song
- ✅ Music plays in browser console test
- ✅ Game plays music during gameplay

Once all ✅, Phase 5 is complete!

---

## Questions?

Refer to:
1. **VERSE_SONG_SETUP.md** - Detailed setup guide
2. **IMPLEMENTATION_STATUS.md** - Full status
3. **Server logs** - Check for specific errors
4. **test/verse-song-test.js** - Diagnostic utility
