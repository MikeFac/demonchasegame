# Production Verse Songs Setup

## Problem
Verse songs are not playing in production because the seeding script hasn't been run yet.

## Solution: Run Seeding Script

### Quick Start (5 minute setup)

```bash
# 1. SSH to production server
ssh root@109.123.227.158

# 2. Become dcgame user
su - dcgame

# 3. Navigate to app directory
cd /var/www/dcgame.4you.tel

# 4. Run seeding script (generates 22 songs - 1 per category)
node scripts/seed-one-verse-per-category.js

# Expected output:
# ✅ Connected to MongoDB
# ✨ Created: Psalms 118:6 (Wisdom → modern_edm)
# ✨ Created: 1 Corinthians 15:57 (Victory → orchestral)
# ... (total 22 verses)
```

### Monitor Generation Progress

While seeding runs (in another terminal):

```bash
ssh root@109.123.227.158
su - dcgame
cd /var/www/dcgame.4you.tel

# Option 1: Watch logs
tail -f ~/.pm2/logs/dcgame-staging-out.log | grep -i "song\|suno\|completed"

# Option 2: Run test script (polls database)
node test/verse-song-test.js

# Expected progress:
# ⏳ Processing: 22 (waiting for generation)
# ... (after 10-20 minutes)
# ✅ Ready: 22 (all generated!)
```

### Full Rollout (110 songs - 5 per category)

For more variety, seed 5 verses per category:

```bash
node scripts/seed-top-verses.js
```

Expected time: 2-3 hours (songs generated in parallel)

---

## What This Does

1. **Loads 22 Bible verses** (1 per category) from `bible-verses.js`
2. **Creates VerseSong records** in MongoDB with metadata
3. **Queues generation** asynchronously (non-blocking)
4. **SunoService polls** Suno API every 5 seconds for completion
5. **Downloads audio** when ready to `/audio/{normalized-ref}.mp3`
6. **Updates database** with status='active' and audioUrl

## After Seeding

### Verify Songs Are Ready
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

### Test in Browser
1. Navigate to http://dcgame.4you.tel
2. Start a solo game
3. Answer quiz questions to trigger verse selection
4. Listen for educational music to play
5. Check browser console for:
   - `"🎵 Playing educational music for: Psalms 118:6"` ✅
   - `"⏳ Verse song pending..."` (still generating)

---

## Troubleshooting

### Issue: Seeding script fails with "Cannot find module"
**Solution:** Ensure you're in `/var/www/dcgame.4you.tel` directory

### Issue: No songs being generated
**Solution:** Check that MongoDB is running and KIE_API_KEY is set in `.env`
```bash
grep KIE_API_KEY .env
echo $MONGODB_URI
```

### Issue: Polls timeout after 20 minutes
**Solution:** Generation is slow or failed. Run retry job:
```bash
grep -r "retryFailedGenerations" src/server/
node scripts/retry-failed-generations.js
```

### Issue: "KIE API Error: 401"
**Solution:** KIE_API_KEY in `.env` is invalid or expired. Update with valid key:
```bash
nano .env  # Edit KIE_API_KEY=sk-...
pm2 restart dcgame-staging
```

---

## Performance Notes

- **Non-blocking:** Song generation happens asynchronously, game loops unaffected
- **Graceful degradation:** Missing songs = fallback to default background music
- **First poll:** 10 seconds after queuing (Suno needs time to start)
- **Polling interval:** 5 seconds per attempt (max 20 minutes total)
- **Parallel generation:** Multiple songs can generate simultaneously

---

## Architecture

```
Seed Script (seed-one-verse-per-category.js)
    ↓
Creates VerseSong records in MongoDB
    ↓
SunoService.generateVerseSong() queued
    ↓
Calls Suno API via kie.ai (provides lyrics)
    ↓
Polls every 5 seconds for status=SUCCESS
    ↓
Downloads audio to /audio/{normalized-ref}.mp3
    ↓
Updates database: status='active', audioUrl='/audio/...'
    ↓
Client fetches /api/verse-song?ref=Psalms+118:6
    ↓
Returns audioUrl, MusicManager plays it
    ↓
🎵 Verse song plays during quiz!
```

---

## Next Time

To avoid manual seeding in future deployments, add to deployment script:

```bash
# In deployment script or pm2 ecosystem.config.js
node scripts/seed-one-verse-per-category.js &  # Run in background
```

Or set up automatic seeding on server start (optional feature).
