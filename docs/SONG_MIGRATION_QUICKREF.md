# Song Migration Quick Reference

## Generate Songs Locally

```bash
# Generate 5 songs per category
node scripts/generate-5-per-category.js

# Monitor progress
node scripts/monitor-song-completion.js

# List completed
node scripts/list-completed-songs.js

# Retry failed
node scripts/retry-failed-songs.js
```

## Export from Local

```bash
# Export metadata + list audio files
node scripts/export-songs-for-production.js

# Creates:
# - songs-export.json (metadata)
# - audio-files-list.txt (file list)
```

## Transfer to Production

```bash
# Fastest: rsync
rsync -avz public/audio/ root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/
scp songs-export.json root@109.123.227.158:/tmp/

# Alternative: tar + scp
tar -czf audio-export.tar.gz -C public audio
scp audio-export.tar.gz root@109.123.227.158:/tmp/
ssh root@109.123.227.158 "cd /var/www/dcgame.4you.tel && tar -xzf /tmp/audio-export.tar.gz"
```

## Import to Production

```bash
ssh root@109.123.227.158
su - dcgame
cd /var/www/dcgame.4you.tel
node scripts/import-songs-from-local.js /tmp/songs-export.json
```

## Verify

```bash
# Check file count
ls -1 public/audio/*.mp3 | wc -l

# Check database
mongo "$MONGODB_URI" --eval 'db.versesongs.countDocuments({ status: "active" })'

# Test in browser
# Visit: http://localhost:3500
# Play a verse song, check network tab for /audio/*.mp3 requests
```

## Troubleshooting

```bash
# Database connection error
echo $MONGODB_URI  # Should be set in .env

# Import fails with duplicate key
# This is OK - script updates existing records

# Audio files missing on production
rsync -avz --delete public/audio/ root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/

# Permission denied
ssh root@109.123.227.158 "chown -R dcgame:dcgame /var/www/dcgame.4you.tel/public/audio"
```

## Complete Workflow (One Command)

```bash
# Export + transfer + import
node scripts/export-songs-for-production.js && \
rsync -avz public/audio/ root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/ && \
scp songs-export.json root@109.123.227.158:/tmp/ && \
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && node scripts/import-songs-from-local.js /tmp/songs-export.json'"
```

## Cost Tracking

```bash
# Estimate cost (at ~$0.05/song)
cat songs-export.json | jq '.totalSongs * 0.05'

# Check actual API usage
curl -H "Authorization: Bearer $KIE_API_KEY" https://api.kie.ai/api/v1/usage
```
