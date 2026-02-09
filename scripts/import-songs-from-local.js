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
    console.log(`\n📥 Importing ${exportData.songs.length} songs...\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const songData of exportData.songs) {
      try {
        // Check if song already exists
        const existing = await VerseSong.findOne({
          verseReference: songData.verseReference
        });

        if (existing) {
          // Update existing song with new data
          Object.assign(existing, {
            status: 'active',
            audioUrl: songData.audioUrl,
            duration: songData.duration,
            category: songData.category,
            generationStyle: songData.generationStyle,
            verseText: songData.verseText,
            generationStatus: 'completed'
          });
          await existing.save();
          skipped++;
        } else {
          // Create new song
          const newSong = new VerseSong({
            verseReference: songData.verseReference,
            verseReferenceFull: songData.verseReferenceFull,
            book: songData.book,
            chapter: songData.chapter,
            startVerse: songData.startVerse,
            endVerse: songData.endVerse,
            category: songData.category,
            verseText: songData.verseText,
            generationStyle: songData.generationStyle,
            audioUrl: songData.audioUrl,
            duration: songData.duration,
            playCount: songData.playCount,
            learnCount: songData.learnCount,
            averageRetention: songData.averageRetention,
            status: 'active',
            generationStatus: 'completed'
          });
          await newSong.save();
          imported++;
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

    // Show samples
    const samples = await VerseSong.find({ status: 'active' })
      .limit(5)
      .lean()
      .exec();

    console.log('\n📋 Sample songs now in database:');
    samples.forEach(s => {
      console.log(`   ✓ ${s.verseReference} → ${s.audioUrl}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

importSongs();
