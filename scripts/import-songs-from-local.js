/**
 * Import songs exported from local development to production MongoDB
 *
 * Usage (on production server):
 *   node scripts/import-songs-from-local.js songs-export.json
 *
 * This script:
 * 1. Reads the JSON export from local development
 * 2. Creates VerseSong records in production database
 * 3. Verifies audio files exist
 * 4. Updates all songs to status='active'
 * 5. Supports multiple versions per verse (identified by version number or sunoId)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importSongs() {
  const exportFile = process.argv[2];

  if (!exportFile) {
    console.error('❌ Usage: node scripts/import-songs-from-local.js <songs-export.json>');
    process.exit(1);
  }

  if (!fs.existsSync(exportFile)) {
    console.error(`❌ File not found: ${exportFile}`);
    process.exit(1);
  }

  try {
    // Connect to production MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const VerseSong = require('../src/server/models/VerseSong');

    // Read export file
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`\n📥 Importing ${exportData.songs.length} songs...`);
    console.log(`   Exported at: ${exportData.exportedAt}\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const songData of exportData.songs) {
      try {
        // Check if song already exists (by version + verseReference, or by sunoId)
        let existing;
        
        if (songData.version) {
          // Multi-version support: check by verseReference + version
          existing = await VerseSong.findOne({
            verseReference: songData.verseReference,
            version: songData.version
          });
        } else if (songData.sunoId) {
          // Fallback: check by sunoId (unique per generation)
          existing = await VerseSong.findOne({
            sunoId: songData.sunoId
          });
        } else {
          // Legacy: check by verseReference only (single version)
          existing = await VerseSong.findOne({
            verseReference: songData.verseReference
          });
        }

        if (existing) {
          // Update existing song with new data
          Object.assign(existing, {
            status: 'active',
            audioUrl: songData.audioUrl,
            audioPath: songData.audioPath || existing.audioPath,
            duration: songData.duration,
            category: songData.category,
            generationStyle: songData.generationStyle,
            verseText: songData.verseText,
            generationStatus: 'completed',
            sunoId: songData.sunoId || existing.sunoId,
            version: songData.version || existing.version || 1,
            qualityScore: songData.qualityScore || existing.qualityScore || 50,
            isActiveVersion: songData.isActiveVersion !== undefined ? songData.isActiveVersion : existing.isActiveVersion
          });
          await existing.save();
          skipped++;
          console.log(`   ✓ Updated: ${songData.verseReference} v${songData.version || 1}`);
        } else {
          // Create new song
          const newSong = new VerseSong({
            verseReference: songData.verseReference,
            verseReferenceFull: songData.verseReferenceFull,
            version: songData.version || 1,
            sunoId: songData.sunoId,
            book: songData.book,
            chapter: songData.chapter,
            startVerse: songData.startVerse,
            endVerse: songData.endVerse,
            category: songData.category,
            verseText: songData.verseText,
            generationStyle: songData.generationStyle,
            audioUrl: songData.audioUrl,
            audioPath: songData.audioPath,
            duration: songData.duration,
            playCount: songData.playCount || 0,
            learnCount: songData.learnCount || 0,
            averageRetention: songData.averageRetention || 0,
            qualityScore: songData.qualityScore || 50,
            isActiveVersion: songData.isActiveVersion !== undefined ? songData.isActiveVersion : true,
            status: 'active',
            generationStatus: 'completed'
          });
          await newSong.save();
          imported++;
          console.log(`   ✨ Created: ${songData.verseReference} v${songData.version || 1}`);
        }
      } catch (err) {
        console.error(`  ❌ Error importing ${songData.verseReference}:`, err.message);
        errors++;
      }
    }

    console.log('\n✅ Import complete!');
    console.log(`   Created: ${imported} new songs`);
    console.log(`   Updated: ${skipped} existing songs`);
    console.log(`   Errors: ${errors}`);

    // Verify all songs are active
    const activeCount = await VerseSong.countDocuments({ status: 'active' });
    console.log(`\n📊 Total active songs in database: ${activeCount}`);

    // Show version distribution
    const versionStats = await VerseSong.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$verseReference', versions: { $sum: 1 } } },
      { $group: { 
          _id: '$versions', 
          count: { $sum: 1 } 
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📚 Version Distribution:');
    versionStats.forEach(stat => {
      console.log(`   ${stat._id} version(s): ${stat.count} verses`);
    });

    // Show samples
    const samples = await VerseSong.find({ status: 'active' })
      .sort({ verseReference: 1, version: 1 })
      .limit(10)
      .lean()
      .exec();

    console.log('\n📋 Sample songs now in database:');
    samples.forEach(s => {
      const versionLabel = s.version ? ` v${s.version}` : '';
      console.log(`   ✓ ${s.verseReference}${versionLabel} → ${s.audioUrl}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

importSongs();
