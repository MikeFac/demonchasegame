---
name: verse-song-production-migration
description: Use when working on VerseBattles/DCGame verse songs and you need to compare local vs production song inventories, back up production MongoDB first, and migrate only missing local songs and audio files to production. Also use when the user asks whether local songs exist in production, wants better local songs added to production, or asks to migrate verse-song versions safely.
---

# Verse Song Production Migration

Use this skill for VerseBattles/DCGame verse-song sync work.

## Workflow

1. Back up production MongoDB before any import.
2. Export the current local song inventory with `node scripts/export-songs-for-production.js`.
3. Query production over SSH for the current completed active `VerseSong` inventory.
4. Diff local vs production by `verseReference + version`.
5. If songs are missing, transfer only the missing audio files plus a filtered export JSON.
6. Import only the missing songs on production with `node scripts/import-songs-from-local.js`.
7. Verify production totals after import.

## Production backup

Run over SSH before any migration:

```bash
ssh root@109.123.227.158 "mkdir -p /home/dcgame/backups && mongodump --uri='mongodb://admin:secret@localhost:27017/dcgame?authSource=admin' --archive=/home/dcgame/backups/dcgame-pre-song-migration-$(date +%Y%m%d_%H%M%S).archive --gzip"
```

## Local export

Use the project’s existing export script:

```bash
node scripts/export-songs-for-production.js
```

This writes:
- `songs-export.json`
- `audio-files-list.txt`

## Production inventory query

Use SSH and query only completed active songs with audio:

```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && node -e \"require(\"dotenv\").config(); const mongoose=require(\"mongoose\"); const VerseSong=require(\"./src/server/models/VerseSong\"); (async()=>{ await mongoose.connect(process.env.MONGODB_URI); const songs=await VerseSong.find({status:\"active\", generationStatus:\"completed\", audioUrl:{$exists:true,$ne:null}}, {verseReference:1, version:1, audioUrl:1, audioPath:1, _id:0}).lean(); console.log(JSON.stringify({songs}, null, 2)); await mongoose.disconnect(); process.exit(0); })().catch(err=>{ console.error(err); process.exit(1); });\"'"`
```

## Diff rule

Compare local vs production by:

```text
${verseReference}::${version || 1}
```

Do not rely on raw counts alone. Counts can differ while most songs already match.

## Transfer and import

If songs are missing:

1. Create a filtered JSON export containing only missing songs.
2. Transfer only those audio files and the filtered JSON.
3. Copy audio files into `/var/www/dcgame.4you.tel/public/audio/`.
4. Run:

```bash
node scripts/import-songs-from-local.js /tmp/<filtered-export>.json
```

## Important constraints

- Always back up production first.
- Prefer missing-only migration over full replacement.
- Do not drop or replace the entire `versesongs` collection for routine sync.
- Verify the exact missing song list before importing.
- Report the backup path, the missing songs, and the final production totals.

## Relevant project files

- `scripts/export-songs-for-production.js`
- `scripts/import-songs-from-local.js`
- `scripts/migrate-songs-to-production.sh`
- `docs/setup/VERSE_SONGS_PRODUCTION_SETUP.md`
- `docs/setup/deploying-updates.md`
