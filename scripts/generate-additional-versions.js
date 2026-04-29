#!/usr/bin/env node
/**
 * Generate additional song versions for existing verses
 * 
 * Usage:
 *   node scripts/generate-additional-versions.js [count] [--dry-run]
 * 
 * Examples:
 *   node scripts/generate-additional-versions.js 3        # 3 versions per verse
 *   node scripts/generate-additional-versions.js 2 --dry-run  # Test run
 */

const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function generateAdditionalVersions(targetPerVerse = 3, dryRun = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Generate Additional Song Versions                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No actual generation will occur\n');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all unique verse references that have at least one completed song
    const versesWithSongs = await VerseSong.aggregate([
      { $match: { status: 'active', generationStatus: 'completed' } },
      { $group: { _id: '$verseReference', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`📊 Found ${versesWithSongs.length} verses with songs\n`);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalQueued = 0;

    for (const verseData of versesWithSongs) {
      const { _id: verseReference, count: currentVersions } = verseData;

      // Check how many versions this verse already has
      const existingVersions = await VerseSong.find({
        verseReference,
        status: 'active'
      }).sort({ version: 1 });

      const needed = targetPerVerse - existingVersions.length;

      if (needed <= 0) {
        console.log(`   ✓ ${verseReference} already has ${existingVersions.length} version(s)`);
        totalSkipped++;
        continue;
      }

      console.log(`\n📝 ${verseReference} (${existingVersions.length} version(s), need ${needed} more)`);

      // Get the original song to copy metadata from
      const originalSong = existingVersions[0];

      for (let i = 0; i < needed; i++) {
        const nextVersion = (existingVersions[existingVersions.length - 1]?.version || 0) + 1;

        if (dryRun) {
          console.log(`   [DRY RUN] Would create version ${nextVersion}`);
          totalCreated++;
          continue;
        }

        // Create new version record
        const newVersion = new VerseSong({
          verseReference: originalSong.verseReference,
          verseReferenceFull: originalSong.verseReferenceFull,
          version: nextVersion,
          book: originalSong.book,
          chapter: originalSong.chapter,
          startVerse: originalSong.startVerse,
          endVerse: originalSong.endVerse,
          category: originalSong.category,
          verseText: originalSong.verseText,
          generationStyle: originalSong.generationStyle,
          generationStatus: 'pending',
          generationAttempts: 0,
          status: 'active',
          isActiveVersion: true,
          qualityScore: 50
        });

        await newVersion.save();
        totalCreated++;

        console.log(`   ✨ Created version ${nextVersion} (ID: ${newVersion._id})`);

        // Queue generation
        const delay = (totalQueued * 2000); // 2 second stagger
        
        setTimeout(() => {
          generateVerseSong(newVersion._id).catch(err => {
            console.error(`   ❌ Error queuing generation for ${verseReference} v${nextVersion}:`, err.message);
          });
        }, delay);

        totalQueued++;
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      Summary                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`   ✨ Created: ${totalCreated} new version records`);
    console.log(`   🚀 Queued: ${totalQueued} for generation`);
    console.log(`   ✓ Skipped: ${totalSkipped} (already have enough versions)`);
    console.log(`   ⏱️  Total time: ~${Math.ceil(totalQueued * 2 / 60)} minutes to queue\n`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No songs were queued.');
      console.log('   Run without --dry-run to actually generate songs.\n');
    } else {
      console.log('\n✅ Generation queued! Songs will be created in the background.');
      console.log('   Monitor progress with: node scripts/monitor-song-completion.js\n');
    }

    // Keep connection alive for a bit to allow queuing
    setTimeout(() => {
      console.log('\n✅ Script complete. Generation continues in background.');
      process.exit(0);
    }, (totalQueued * 2000) + 5000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
let targetPerVerse = 3;
let dryRun = false;

args.forEach(arg => {
  if (arg === '--dry-run' || arg === '-n') {
    dryRun = true;
  } else if (!isNaN(parseInt(arg))) {
    targetPerVerse = parseInt(arg);
  }
});

generateAdditionalVersions(targetPerVerse, dryRun);
