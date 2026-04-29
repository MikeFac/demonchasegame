# Song Migration Workflow: Local → Production

This guide explains how to generate songs locally (using kie.ai credits) and migrate them to production without losing your work.

## Why Generate Locally?

- **Test new styles** before committing to production
- **Avoid breaking production** with experimental changes
- **Develop multi-version support** safely
- **Use local kie.ai credits** instead of production budget

## Prerequisites

- Local MongoDB running with song data
- `KIE_API_KEY` in local `.env` file
- SSH access to production server (`root@109.123.227.158`)

---

## Step 1: Generate Songs Locally

### Generate New Songs

```bash
# Generate 5 songs per category (default)
node scripts/generate-5-per-category.js

# Generate specific verses
node scripts/seed-top-verses.js

# Generate additional versions (after multi-version support is added)
node scripts/generate-additional-versions.js
```

### Monitor Generation

```bash
# Watch generation progress
node scripts/monitor-song-completion.js

# List completed songs
node scripts/list-completed-songs.js

# Check status of pending songs
node scripts/poll-status-now.js
```

### Retry Failed Songs

```bash
# Retry all failed generations
node scripts/retry-failed-songs.js

# Re-queue specific category
node scripts/requeue-knowledge.js
node scripts/requeue-prosperity.js
```

---

## Step 2: Export Songs from Local

```bash
# Export all active songs to JSON + list audio files
node scripts/export-songs-for-production.js
```

This creates:
- `songs-export.json` - All song metadata (verse, version, sunoId, audioUrl, etc.)
- `audio-files-list.txt` - List of all MP3 files to copy

### What Gets Exported

- Verse reference + version number (for multi-version support)
- Suno ID (unique identifier for each generated song)
- Audio URL and file path
- Category, style, duration
- Play count, learn count, quality score
- All metadata needed to recreate in production

---

## Step 3: Transfer Files to Production

### Option A: rsync (Recommended - Fastest)

```bash
# Sync audio files (preserves Suno IDs in filenames)
rsync -avz --progress \
  public/audio/ \
  root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/

# Copy export JSON
scp songs-export.json root@109.123.227.158:/tmp/
```

### Option B: tar + scp (For Large Batches)

```bash
# Create compressed archive
tar -czf audio-export.tar.gz -C public audio

# Upload to production
scp audio-export.tar.gz root@109.123.227.158:/tmp/

# Extract on production server
ssh root@109.123.227.158 << 'EOF'
  cd /var/www/dcgame.4you.tel
  tar -xzf /tmp/audio-export.tar.gz
  mv songs-export.json . # if copied separately
EOF
```

### Option C: scp (Simple but Slower)

```bash
# Copy all audio files
scp -r public/audio/*.mp3 root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/

# Copy export JSON
scp songs-export.json root@109.123.227.158:/tmp/
```

---

## Step 4: Import Songs to Production

```bash
# SSH into production server
ssh root@109.123.227.158

# Switch to dcgame user
su - dcgame

# Navigate to app directory
cd /var/www/dcgame.4you.tel

# Import songs from JSON
node scripts/import-songs-from-local.js /tmp/songs-export.json
```

### What the Import Does

1. **Checks for existing songs** by verse reference + version (or sunoId)
2. **Creates new records** for songs that don't exist
3. **Updates existing records** with new metadata
4. **Sets status to 'active'** for all imported songs
5. **Verifies audio files** exist on disk
6. **Reports version distribution** (how many verses have 1, 2, 3+ versions)

---

## Step 5: Verify Production

### Check Database

```bash
# On production server
su - dcgame
cd /var/www/dcgame.4you.tel

# List completed songs
node scripts/list-completed-songs.js

# Monitor completion
node scripts/monitor-song-completion.js
```

### Check Audio Files

```bash
# Verify files exist
ls -lh public/audio/ | wc -l

# Check file sizes
du -sh public/audio/
```

### Test in Browser

1. Visit https://dcgame.4you.tel
2. Start a game
3. Answer quiz questions to trigger verse music
4. Check browser console for "🎵 Now playing verse song: John 3:16"
5. Verify audio plays correctly

---

## Workflow for Multi-Version Support

### Local Development

```bash
# 1. Generate 3 versions per verse
node scripts/generate-additional-versions.js 3

# 2. Monitor quality scores over time
node scripts/analyze-quality-scores.js

# 3. Export all versions
node scripts/export-songs-for-production.js

# 4. Transfer to production
rsync -avz public/audio/ root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/
scp songs-export.json root@109.123.227.158:/tmp/
```

### Production Deployment

```bash
# 5. Import to production
ssh root@109.123.227.158
su - dcgame
cd /var/www/dcgame.4you.tel
node scripts/import-songs-from-local.js /tmp/songs-export.json

# 6. Restart server to pick up new songs
pm2 restart dcgame-staging

# 7. Verify multi-version support
node -e "
  const mongoose = require('mongoose');
  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const VerseSong = require('./src/server/models/VerseSong');
    const versions = await VerseSong.aggregate([
      { \$match: { status: 'active' } },
      { \$group: { _id: '\$verseReference', versions: { \$sum: 1 } } },
      { \$sort: { versions: -1 } }
    ]);
    console.log('Verses with multiple versions:', versions.filter(v => v.versions > 1).length);
    process.exit(0);
  });
"
```

---

## Troubleshooting

### Export Issues

**Problem**: `Error: VerseSong not found`

**Solution**: Make sure you have songs in local database
```bash
# Check local database
mongo "$MONGODB_URI" --eval 'db.versesongs.countDocuments({ status: "active" })'
```

### Transfer Issues

**Problem**: `rsync: failed to connect`

**Solution**: Check SSH connection
```bash
ssh root@109.123.227.158 "echo 'Connection OK'"
```

**Problem**: `Permission denied` on production

**Solution**: Check file permissions
```bash
ssh root@109.123.227.158 "chown -R dcgame:dcgame /var/www/dcgame.4you.tel/public/audio"
```

### Import Issues

**Problem**: `E11000 duplicate key error`

**Solution**: The import script handles this by updating existing records. If you see this error, the script is working correctly (skipping duplicates).

**Problem**: `Audio file not found`

**Solution**: Make sure audio files were transferred before running import
```bash
ssh root@109.123.227.158 "ls -l /var/www/dcgame.4you.tel/public/audio/ | wc -l"
```

---

## Cost Management

### Track kie.ai Usage

```bash
# Estimate cost (local)
cat songs-export.json | jq '.totalSongs * 0.05'
# Assuming ~$0.05 per song

# Check monthly usage
curl -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/api/v1/usage
```

### Budget Limits

Set environment variable to prevent runaway generation:

```bash
# In .env
KIE_MONTHLY_BUDGET=50  # $50 USD limit
```

---

## Best Practices

1. **Generate in batches**: 10-20 songs at a time to monitor quality
2. **Test locally first**: Always test new styles locally before production
3. **Version control exports**: Keep `songs-export.json` in git (without audio files)
4. **Backup before import**: Always backup production database before large imports
5. **Monitor quality scores**: Use analytics to retire low-performing versions
6. **Use rsync**: Faster and more reliable than scp for large batches

---

## Automation (Advanced)

### Continuous Sync Script

Create `scripts/sync-local-to-production.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Syncing local songs to production..."

# Export
echo "📦 Exporting songs..."
node scripts/export-songs-for-production.js

# Transfer audio
echo "🚀 Transferring audio files..."
rsync -avz --delete public/audio/ \
  root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/

# Transfer JSON
echo "📋 Transferring metadata..."
scp songs-export.json root@109.123.227.158:/tmp/

# Import
echo "💾 Importing to production database..."
ssh root@109.123.227.158 << 'EOF'
su - dcgame << 'INNER_EOF'
cd /var/www/dcgame.4you.tel
node scripts/import-songs-from-local.js /tmp/songs-export.json
INNER_EOF
EOF

echo "✅ Sync complete!"
```

Make executable:
```bash
chmod +x scripts/sync-local-to-production.sh
./scripts/sync-local-to-production.sh
```

---

## Summary

The workflow is:
1. **Generate locally** → Test new songs safely
2. **Export to JSON** → Preserve all metadata
3. **Transfer files** → rsync audio + scp JSON
4. **Import to production** → Update production database
5. **Verify** → Test in browser, check database

This ensures you never lose locally generated songs and can iterate quickly without affecting production users.
