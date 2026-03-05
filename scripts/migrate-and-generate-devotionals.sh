#!/bin/bash
# migrate-and-generate-devotionals.sh
# Run from local machine. Steps:
# 1. Backs up production sermons collection
# 2. Copies local sermon data to production
# 3. Deploys the generation script
# 4. Runs the generation script on production

set -e

PROD_HOST="root@109.123.227.158"
PROD_USER="dcgame"
PROD_DIR="/var/www/dcgame.4you.tel"
LOCAL_EXPORT="/tmp/local_sermons_export.json"
REMOTE_EXPORT="/tmp/local_sermons_import.json"

echo "═══════════════════════════════════════════════════"
echo "  Devotional Migration & Generation Pipeline"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Backup production sermons collection
echo "📦 Step 1: Backing up production sermons collection..."
BACKUP_FILE="/tmp/prod_sermons_backup_$(date +%Y%m%d_%H%M%S).json"
ssh $PROD_HOST "su - $PROD_USER -c 'mongosh --quiet \"mongodb://admin:secret@localhost:27017/dcgame?authSource=admin\" --eval \"JSON.stringify(db.sermons.find().toArray())\"'" >"$BACKUP_FILE"
BACKUP_COUNT=$(python3 -c "import json; print(len(json.load(open('$BACKUP_FILE'))))" 2>/dev/null || echo "?")
echo "   ✅ Backed up $BACKUP_COUNT sermons to $BACKUP_FILE"
echo ""

# Step 2: Export local sermons
echo "📤 Step 2: Exporting local sermons..."
mongosh --quiet "mongodb://admin:secret@localhost:27017/dcgame?authSource=admin" \
    --eval 'JSON.stringify(db.sermons.find({generationStatus:"completed"}).toArray())' \
    >"$LOCAL_EXPORT"
LOCAL_COUNT=$(python3 -c "import json; print(len(json.load(open('$LOCAL_EXPORT'))))")
echo "   ✅ Exported $LOCAL_COUNT completed sermons"
echo ""

# Step 3: Copy local sermons to production
echo "📥 Step 3: Copying local sermons to production..."
scp "$LOCAL_EXPORT" "$PROD_HOST:$REMOTE_EXPORT"
echo "   ✅ Uploaded to $PROD_HOST:$REMOTE_EXPORT"
echo ""

# Step 4: Import local sermons into production (skip existing)
echo "🔄 Step 4: Importing local sermons into production..."
ssh $PROD_HOST "su - $PROD_USER -c 'mongosh --quiet \"mongodb://admin:secret@localhost:27017/dcgame?authSource=admin\" --eval \"
  const data = JSON.parse(cat(\\\"$REMOTE_EXPORT\\\"));
  let imported = 0, skipped = 0;
  for (const doc of data) {
    const exists = db.sermons.findOne({verseReference: doc.verseReference, generationStatus: \\\"completed\\\"});
    if (exists) { skipped++; continue; }
    delete doc._id;
    db.sermons.insertOne(doc);
    imported++;
  }
  print(\\\"Imported: \\\" + imported + \\\", Skipped: \\\" + skipped + \\\" (already exist)\\\");
\"'"
echo ""

# Step 5: Deploy latest code (includes the generation script)
echo "🚀 Step 5: Deploying latest code to production..."
ssh $PROD_HOST "su - $PROD_USER -c 'cd $PROD_DIR && git pull origin user-reg'"
echo ""

# Step 6: Run the generation script on production
echo "⚡ Step 6: Running devotional generation (first 3 per category)..."
echo "   This will take approximately 3 minutes..."
echo ""
ssh $PROD_HOST "su - $PROD_USER -c 'cd $PROD_DIR && node scripts/generate-devotionals-first3.js'"
echo ""

echo "═══════════════════════════════════════════════════"
echo "  ✅ Complete! Devotionals generated on production."
echo "═══════════════════════════════════════════════════"
