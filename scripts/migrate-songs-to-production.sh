#!/bin/bash
#
# One-command song migration: Local → Production
# Usage: ./scripts/migrate-songs-to-production.sh
#

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Song Migration: Local → Production                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check for required files
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Step 1: Export songs from local database
echo "📦 Step 1/4: Exporting songs from local database..."
node scripts/export-songs-for-production.js

if [ ! -f "songs-export.json" ]; then
    echo "❌ Error: Export failed - songs-export.json not created"
    exit 1
fi

# Show what we're about to transfer
TOTAL_SONGS=$(cat songs-export.json | jq '.totalSongs')
AUDIO_COUNT=$(ls -1 public/audio/*.mp3 2>/dev/null | wc -l)

echo ""
echo "📊 Ready to migrate:"
echo "   - $TOTAL_SONGS songs in database"
echo "   - $AUDIO_COUNT audio files"
echo ""

# Confirm before proceeding
read -p "Continue with migration to production? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Step 2: Transfer audio files
echo ""
echo "🚀 Step 2/4: Transferring audio files to production..."

rsync -avz --progress \
    public/audio/ \
    root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/

if [ $? -ne 0 ]; then
    echo "❌ Error: Audio file transfer failed"
    exit 1
fi

# Step 3: Transfer JSON metadata
echo ""
echo "📋 Step 3/4: Transferring song metadata..."

scp songs-export.json root@109.123.227.158:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ Error: Metadata transfer failed"
    exit 1
fi

# Step 4: Import into production database
echo ""
echo "💾 Step 4/4: Importing songs into production database..."

ssh root@109.123.227.158 << 'EOF'
su - dcgame << 'INNER_EOF'
cd /var/www/dcgame.4you.tel
node scripts/import-songs-from-local.js /tmp/songs-export.json
INNER_EOF
EOF

if [ $? -ne 0 ]; then
    echo "❌ Error: Import failed"
    exit 1
fi

# Success!
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Migration Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "   - $TOTAL_SONGS songs migrated"
echo "   - $AUDIO_COUNT audio files transferred"
echo ""
echo "🌐 Next steps:"
echo "   1. Visit: https://dcgame.4you.tel"
echo "   2. Play a verse to verify audio loads"
echo "   3. Check browser network tab for /audio/*.mp3 requests"
echo ""
