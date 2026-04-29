# Multi-Version Song Support - Implementation Plan

**Status**: Phase 1 Complete, Phase 2 In Progress  
**Date**: 2026-03-08  
**Goal**: Support multiple song versions per verse to increase variety and quality

---

## Problem Statement

Previously, the system only allowed **ONE song per verse** due to a unique constraint on `verseReference`. This limited variety and prevented A/B testing of different musical styles for the same verse.

### Issues with Single-Version Approach:
- No variety (players hear the same song every time)
- Can't test different musical styles
- Can't retire low-quality songs without losing the verse entirely
- No quality scoring or analytics per version
- Wasted kie.ai credits if a generated song is poor quality

---

## Solution Overview

Implement **multi-version support** where each verse can have multiple song versions (v1, v2, v3, etc.). The system will:
- Randomly select from available versions for variety
- Track quality scores based on learning outcomes
- Auto-retire low-performing versions
- Allow generation of replacement versions
- Support A/B testing of different styles

---

## Implementation Phases

### ✅ Phase 1: Database Schema Changes (COMPLETE)

**Files Modified:**
- `src/server/models/VerseSong.js` - Updated schema
- `src/server/services/SunoService.js` - Auto-assign version numbers

**Schema Changes:**
```javascript
// OLD (single version)
verseReference: { type: String, unique: true }  // ❌ Only one song per verse

// NEW (multi-version)
verseReference: { type: String, index: true }   // ✅ Multiple versions allowed
version: { type: Number, default: 1 }           // Version number (1, 2, 3...)
qualityScore: { type: Number, default: 50 }     // 0-100 effectiveness score
isActiveVersion: { type: Boolean, default: true } // false if retired
```

**New Indexes:**
- `{ verseReference: 1, version: 1 }` (unique) - One song per version
- `{ verseReference: 1, isActiveVersion: 1 }` - Active versions lookup
- `{ verseReference: 1, qualityScore: -1 }` - Best quality first
- `{ qualityScore: -1, playCount: 1 }` - Quality + rotation

**Migration Scripts Created:**
- `scripts/migrate-add-multi-version-support.js` - Migrate existing database
- `scripts/backup-database.js` - Backup before migration

---

### ✅ Phase 2: API Selection Logic (COMPLETE)

**Files Modified:**
- `src/server/routes/verseSong.js` - Multi-version selection

**API Changes:**

**GET /api/verse-song?ref=John+3:16**
```javascript
// OLD: Always returns the same song
{ audioUrl: "/audio/john-3-16.mp3", status: "ready" }

// NEW: Returns random version from available versions
{
  audioUrl: "/audio/john-3-16-abc123.mp3",
  version: 2,
  totalVersions: 3,
  qualityScore: 75,
  status: "ready"
}
```

**POST /api/verse-song/record-play**
```javascript
// NEW: Track which version was played
{
  verseReference: "John 3:16",
  version: 2,  // ✨ Now tracks version
  wasLearned: true
}

// Response includes quality metrics:
{
  playCount: 15,
  learnCount: 12,
  averageRetention: 0.80,
  qualityScore: 80  // ✨ Calculated from retention
}
```

**Selection Strategy:**
- Query all active versions for verse
- Sort by `qualityScore` (highest first)
- Random selection from top versions
- Fallback to any version if specific version not found

---

### ✅ Phase 3: Generation Scripts (COMPLETE)

**Files Created:**
- `scripts/generate-additional-versions.js` - Generate N versions per verse

**Usage:**
```bash
# Generate 3 versions per verse (dry run)
node scripts/generate-additional-versions.js 3 --dry-run

# Actually generate versions
node scripts/generate-additional-versions.js 3

# Generate 2 versions per verse
node scripts/generate-additional-versions.js 2
```

**How It Works:**
1. Finds all verses with at least one completed song
2. Checks how many versions each verse already has
3. Creates new version records for verses that need more
4. Queues generation with 2-second stagger
5. Auto-assigns version numbers (v1, v2, v3...)

---

### ✅ Phase 4: Migration Tools (COMPLETE)

**Files Updated:**
- `scripts/export-songs-for-production.js` - Export multi-version data
- `scripts/import-songs-from-local.js` - Import with version support

**Files Created:**
- `scripts/migrate-songs-to-production.sh` - One-command migration
- `scripts/backup-database.js` - Pre-migration backup

**Migration Workflow:**
```bash
# 1. Backup database
node scripts/backup-database.js

# 2. Run migration (local)
node scripts/migrate-add-multi-version-support.js

# 3. Generate additional versions
node scripts/generate-additional-versions.js 3

# 4. Export + transfer to production
./scripts/migrate-songs-to-production.sh
```

**Export Format:**
```json
{
  "exportedAt": "2026-03-08T12:00:00Z",
  "totalSongs": 450,
  "songs": [
    {
      "verseReference": "john-3-16",
      "version": 1,
      "sunoId": "abc123",
      "audioUrl": "/audio/john-3-16-abc123.mp3",
      "qualityScore": 75
    },
    {
      "verseReference": "john-3-16",
      "version": 2,
      "sunoId": "def456",
      "audioUrl": "/audio/john-3-16-def456.mp3",
      "qualityScore": 82
    }
  ]
}
```

---

### 🔜 Phase 5: Quality Analytics (NEXT)

**TODO:**
- [ ] Create `scripts/analyze-quality-scores.js` - View quality distribution
- [ ] Add auto-retire logic for low-quality versions (qualityScore < 30)
- [ ] Create dashboard to view version performance
- [ ] Add weighted random selection (prefer high qualityScore)
- [ ] Implement style rotation (pop, rock, acoustic per version)

**Auto-Retire Logic:**
```javascript
// In record-play endpoint
if (verseSong.playCount > 10 && verseSong.qualityScore < 30) {
  verseSong.isActiveVersion = false;
  // Queue replacement generation
  queueReplacementGeneration(verseReference);
}
```

---

### 🔜 Phase 6: Advanced Features (FUTURE)

**Planned Features:**
- [ ] User preferences (favorite/mute specific versions)
- [ ] A/B testing dashboard
- [ ] Style preferences per category
- [ ] Monthly auto-generation of new versions
- [ ] Cost tracking and budget limits

---

## Testing Checklist

### Local Testing
- [x] Server starts without errors
- [ ] Migration script runs successfully
- [ ] API returns multiple versions
- [ ] Random selection works
- [ ] Version tracking in record-play
- [ ] Quality score calculation
- [ ] Export includes version data
- [ ] Import handles multiple versions

### Production Testing
- [ ] Backup created successfully
- [ ] Migration completed without data loss
- [ ] API responds correctly
- [ ] Audio files load in browser
- [ ] Version selection varies on refresh
- [ ] Analytics track correctly

---

## Usage Examples

### Generate New Versions

```bash
# See what would be generated (dry run)
node scripts/generate-additional-versions.js 3 --dry-run

# Generate 3 versions per verse
node scripts/generate-additional-versions.js 3

# Monitor progress
node scripts/monitor-song-completion.js
```

### Check Version Distribution

```bash
# MongoDB query
mongo "$MONGODB_URI" --eval '
  db.versesongs.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$verseReference", versions: { $sum: 1 } } },
    { $group: { _id: "$versions", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ])
'

# Output:
# 1 version: 50 verses
# 2 versions: 30 verses
# 3 versions: 20 verses
```

### Migrate to Production

```bash
# One-command migration
./scripts/migrate-songs-to-production.sh

# Or manual steps:
node scripts/export-songs-for-production.js
rsync -avz public/audio/ root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/
scp songs-export.json root@109.123.227.158:/tmp/
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && node scripts/import-songs-from-local.js /tmp/songs-export.json'"
```

---

## Database Schema (Final)

```javascript
{
  verseReference: String,        // "john-3-16" (normalized)
  verseReferenceFull: String,    // "John 3:16" (original)
  version: Number,               // 1, 2, 3...
  sunoId: String,                // Unique per generation
  
  book: String,                  // "John"
  chapter: Number,               // 3
  startVerse: Number,            // 16
  endVerse: Number,              // Optional (for ranges)
  category: String,              // "Faith", "Love", etc.
  verseText: String,             // Full verse text
  
  audioUrl: String,              // "/audio/john-3-16-abc123.mp3"
  audioPath: String,             // Local file path
  duration: Number,              // Seconds
  
  generationStyle: String,       // "pop", "rock", etc.
  generationStatus: String,      // "pending", "processing", "completed", "failed"
  
  playCount: Number,             // Times played
  learnCount: Number,            // Times learned
  averageRetention: Number,      // 0-1 (learnCount / playCount)
  qualityScore: Number,          // 0-100 (averageRetention * 100)
  isActiveVersion: Boolean,      // false if retired
  
  lastPlayedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Cost Considerations

**kie.ai API Cost:** ~$0.05 per song

**Example Budget:**
- 100 verses × 3 versions = 300 songs
- 300 songs × $0.05 = **$15.00**

**Cost-Saving Strategies:**
1. Generate locally first (test before production)
2. Use `--dry-run` to preview
3. Monitor quality scores
4. Only regenerate low-quality versions
5. Set monthly budget limits

---

## Rollback Plan

If issues arise in production:

```bash
# 1. Restore database from backup
mongorestore --uri="$MONGODB_URI" --archive=backups/versesongs-YYYY-MM-DD.archive

# 2. Revert code changes
git revert <commit-hash>

# 3. Restart server
pm2 restart dcgame-staging

# 4. Verify single-version API works
curl "https://dcgame.4you.tel/api/verse-song?ref=John+3:16"
```

---

## Success Metrics

**After 30 days, measure:**
- [ ] Average quality score > 60
- [ ] Player retention rate improved
- [ ] Song variety (versions per verse)
- [ ] Low-quality songs auto-retired
- [ ] Cost per quality song < $0.10

---

## Next Steps

1. **Fix syntax errors** in verseSong.js ✅ DONE
2. **Test locally** with small dataset
3. **Run migration** on local database
4. **Generate 2-3 versions** for 10 test verses
5. **Monitor quality scores** for 1 week
6. **Deploy to production** with full migration
7. **Generate 3 versions** for all verses
8. **Implement analytics dashboard**

---

## Documentation References

- **Migration Guide**: `docs/song-migration-workflow.md`
- **Quick Reference**: `docs/SONG_MIGRATION_QUICKREF.md`
- **API Documentation**: See `src/server/routes/verseSong.js` comments
- **Schema Documentation**: See `src/server/models/VerseSong.js` comments

---

## Support & Troubleshooting

**Common Issues:**

1. **"Unique constraint error"** - Run migration script first
2. **"Version not found"** - Check `isActiveVersion: true` in database
3. **"Audio file missing"** - Run `rsync` to transfer files
4. **"Quality score stuck at 50"** - Need more play data (10+ plays)

**Debug Commands:**
```bash
# Check version distribution
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(async () => { const VerseSong = require('./src/server/models/VerseSong'); const stats = await VerseSong.aggregate([{ \$match: { status: 'active' } }, { \$group: { _id: '\$verseReference', versions: { \$sum: 1 } } }, { \$group: { _id: '\$versions', count: { \$sum: 1 } } }]); console.log(stats); process.exit(0); })"

# Test API locally
curl "http://localhost:3500/api/verse-song?ref=John+3:16"
```

---

**Last Updated**: 2026-03-08  
**Maintained By**: Development Team  
**Related Issues**: Multi-version song support, quality scoring, A/B testing
