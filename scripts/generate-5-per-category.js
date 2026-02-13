const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');
const { loadSelectedVerses } = require('../bible-verses');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const globalVerses = loadSelectedVerses();
    const categories = await CategoryStyle.find().sort({ category: 1 });

    // Group verses by category
    const byCategory = {};
    for (const verse of globalVerses) {
      if (!byCategory[verse.Category]) {
        byCategory[verse.Category] = [];
      }
      byCategory[verse.Category].push(verse);
    }

    console.log(`📊 Generating up to 10 songs per category...\n`);
    console.log('═'.repeat(70) + '\n');

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const errorLog = [];

    for (const category of categories) {
      const verses = byCategory[category.category] || [];
      const targetCount = Math.min(10, verses.length);

      console.log(`📚 ${category.category} (targeting ${targetCount}/${verses.length} verses)`);

      let categoryCreated = 0;
      let categoryErrors = 0;

      for (let i = 0; i < targetCount; i++) {
        const verse = verses[i];

        try {
          // Check if this specific verse combination already exists
          const existing = await VerseSong.findOne({ verseReference: verse.Reference });
          if (existing) {
            console.log(`   ⏭️  ${verse.Reference} (already exists)`);
            totalSkipped++;
            continue;
          }

          // Create new song
          const parts = verse.Reference.match(/^([\dA-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
          if (!parts) {
            throw new Error(`Invalid reference format: ${verse.Reference}`);
          }

          const verseSong = new VerseSong({
            verseReference: verse.Reference,
            book: parts[1].trim(),
            chapter: parseInt(parts[2], 10),
            startVerse: parseInt(parts[3], 10),
            endVerse: parts[4] ? parseInt(parts[4], 10) : undefined,
            category: verse.Category,
            verseText: verse.Text,
            generationStyle: category.generationStyle,
            generationStatus: 'pending',
            generationAttempts: 0
          });

          await verseSong.save();
          totalCreated++;
          categoryCreated++;
          console.log(`   ✨ ${verse.Reference}`);

        } catch (err) {
          totalErrors++;
          categoryErrors++;
          const errorMsg = `${verse.Reference}: ${err.message}`;
          errorLog.push(`   [${category.category}] ${errorMsg}`);
          console.log(`   ❌ ${verse.Reference} - ${err.message}`);
        }
      }

      console.log(`   → Created: ${categoryCreated}, Errors: ${categoryErrors}\n`);
    }

    console.log('═'.repeat(70));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✨ Created: ${totalCreated} new songs`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} (already exist)`);
    console.log(`   ❌ Errors: ${totalErrors}\n`);

    if (errorLog.length > 0) {
      console.log('❌ ERROR LOG:');
      for (const error of errorLog) {
        console.log(error);
      }
      console.log();
    }

    // Queue pending songs for generation
    const pending = await VerseSong.find({ generationStatus: 'pending' });
    console.log(`\n🚀 Queuing ${pending.length} pending songs for generation...\n`);
    console.log(`(This will take ${pending.length * 2 / 60}+ minutes at 2s stagger)\n`);

    for (let i = 0; i < pending.length; i++) {
      const verseSong = pending[i];

      setTimeout(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Error generating ${verseSong.verseReference}: ${err.message}`);
        });
      }, i * 2000);
    }

    // Keep process alive for queueing
    const keepAliveTime = (pending.length * 2000) + 5000;
    setTimeout(() => {
      console.log('✅ All songs queued. Daemon will process generation and downloads.\n');
      process.exit(0);
    }, keepAliveTime);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
