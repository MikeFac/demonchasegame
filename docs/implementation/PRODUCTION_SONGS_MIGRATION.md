# Production Songs Migration Guide

> **Status note (2026-03-08):** Historical migration guide for an earlier batch. Verify current batch tooling and export scripts before using this as a live runbook.

## Overview

This guide walks through migrating 79 locally-generated verse songs to production, including both the MongoDB database records and audio files.

## What's Included

- **79 VerseSong database records** with full metadata
- **76 audio files** (some verses don't have audio yet, in progress)
- **Normalized verse references** (e.g., `psalms118-6`) for consistent lookups
- **Full distribution**: 21 categories with 1-5 songs each

## Prerequisites

1. Production server with SSH access (root@109.123.227.158)
2. MongoDB running and accessible with `MONGODB_URI` set in `.env`
3. `/audio` directory exists on production server

## Step 1: Copy Audio Files to Production

```bash
# From local development machine:
scp -r /home/michael/proj/dcgame/public/audio/* root@109.123.227.158:/var/www/dcgame.4you.tel/audio/

# Verify files copied
ssh root@109.123.227.158 "su - dcgame -c 'ls -1 /var/www/dcgame.4you.tel/audio/*.mp3 | wc -l'"
# Should show: 76
```

## Step 2: Copy Export File to Production

```bash
# From local development machine:
scp /home/michael/proj/dcgame/songs-export.json root@109.123.227.158:/var/www/dcgame.4you.tel/

# Verify file exists
ssh root@109.123.227.158 "su - dcgame -c 'ls -lh /var/www/dcgame.4you.tel/songs-export.json'"
```

## Step 3: Run Import Script on Production

```bash
# SSH to production server
ssh root@109.123.227.158

# Become dcgame user
su - dcgame

# Navigate to app directory
cd /var/www/dcgame.4you.tel

# Run import script
node scripts/import-songs-from-local.js songs-export.json

# Expected output:
# ✅ Connected to MongoDB
# 📥 Importing 79 songs...
# ✅ Import complete!
#    Created: 79 new songs
#    Updated: 0 existing songs
#    Errors: 0
```

## Step 4: Verify Songs in Production

```bash
# Check how many songs are active
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const VerseSong = require('./src/server/models/VerseSong');
  const count = await VerseSong.countDocuments({ status: 'active' });
  console.log('Active songs:', count);

  const sample = await VerseSong.findOne({ status: 'active' }).lean();
  if (sample) {
    console.log('Sample:', sample.verseReference, '→', sample.audioUrl);
  }
  process.exit(0);
});
"
```

## Step 5: Restart Server

```bash
pm2 restart dcgame-staging
```

## Step 6: Test in Browser

1. Navigate to http://dcgame.4you.tel
2. Start a solo game
3. Answer quiz questions to trigger verse selection
4. Listen for educational music to play 🎵
5. Check browser console for:
   - `"🎵 Playing educational music for: Psalms 118:6"` ✅

## Reference Format

The system now supports both reference formats:

| Format | Location | Example |
|--------|----------|---------|
| **Normalized** | Database & filenames | `psalms118-6` |
| **Full** | Client/API queries | `Psalms 118:6` |

The endpoint automatically normalizes incoming requests before database lookup:
```
Client sends: "Psalms 118:6"
   ↓ (normalizeReference)
Endpoint queries: { verseReference: "psalms118-6" }
   ↓ (found in DB)
Returns: /audio/psalms118-6.mp3
```

## One-Line Quick Setup

If all files are ready and you want to do everything at once:

```bash
# Run this from dcgame user on production server
cd /var/www/dcgame.4you.tel && \
node scripts/import-songs-from-local.js songs-export.json && \
pm2 restart dcgame-staging
```

## Troubleshooting

### Issue: "songs-export.json not found"
**Solution:** Make sure you copied the file in Step 2

### Issue: "Module not found: VerseSong"
**Solution:** Make sure you're running from the app directory: `cd /var/www/dcgame.4you.tel`

### Issue: "MongoDB connection failed"
**Solution:** Check that MONGODB_URI is set:
```bash
grep MONGODB_URI .env
echo $MONGODB_URI
```

### Issue: "Audio files not found" in browser console
**Solution:** Verify audio files are in correct location:
```bash
ls /var/www/dcgame.4you.tel/audio/psalms118-6.mp3
```

If files are in wrong location, move them:
```bash
mv /var/www/dcgame.4you.tel/public/audio/* /var/www/dcgame.4you.tel/audio/
```

## Songs Summary

```
Total: 79 songs
Categories: 21

Distribution:
  Healing: 5
  Joy: 5
  Focus: 5
  Praise: 5
  Endurance: 5
  Good News: 5
  Courage: 4
  Faith: 4
  Wisdom: 4
  Knowledge: 4
  Humility: 4
  Forgiveness: 4
  Identity: 4
  Deliverance: 4
  Prosperity: 3
  Purity: 3
  Hope: 3
  Power: 3
  Intercession: 2
  Prophecy: 2
  Love: 1
```

## API Changes

The `/api/verse-song` endpoint now:
1. Accepts both normalized and full verse references
2. Queries database using normalized format
3. Falls back to original format for backward compatibility
4. Returns audioUrl immediately if song is active
5. Queues generation if song doesn't exist yet

No client-side changes needed - fully backward compatible.

## Next Steps

1. After verifying songs play in browser
2. Consider deleting the old seeding instructions or marking them as deprecated
3. Update deployment scripts to always include song data migration
4. Consider automating this in CD/CI pipeline
