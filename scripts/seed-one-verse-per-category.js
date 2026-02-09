const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');

/**
 * Seed TWO verses from each category (44 total)
 * This creates ~44 VerseSong records and queues generation.
 * Good for testing before full rollout.
 */
async function seedTwoPerCategory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const { loadSelectedVerses } = require('../bible-verses');
    const globalVerses = loadSelectedVerses();

    // Group verses by category
    const byCategory = {};
    for (const verse of globalVerses) {
      if (!byCategory[verse.Category]) {
        byCategory[verse.Category] = [];
      }
      byCategory[verse.Category].push(verse);
    }

    console.log(`Found ${Object.keys(byCategory).length} categories\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const [category, verses] of Object.entries(byCategory)) {
      // Take FIRST TWO verses from this category
      const versesToSeed = verses.slice(0, 2); // Get up to 2 verses

      for (const verse of versesToSeed) {
        // Check if already exists
        const existing = await VerseSong.findOne({ verseReference: verse.Reference });
        if (existing) {
          console.log(`⏭️  Skipping ${verse.Reference} (already exists)`);
          totalSkipped++;
          continue;
        }

        // Get category style
        const categoryStyle = await CategoryStyle.findOne({ category });
        const style = categoryStyle?.generationStyle || 'pop';

        // Parse reference
        const parts = verse.Reference.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (!parts) {
          console.error(`⚠️  Invalid reference format: ${verse.Reference}`);
          continue;
        }

        // Create verse song
        const verseSong = new VerseSong({
          verseReference: verse.Reference,
          book: parts[1].trim(),
          chapter: parseInt(parts[2], 10),
          startVerse: parseInt(parts[3], 10),
          endVerse: parts[4] ? parseInt(parts[4], 10) : undefined,
          category: verse.Category,
          verseText: verse.Text,
          generationStyle: style,
          generationStatus: 'pending',
          generationAttempts: 0
        });

        await verseSong.save();
        totalCreated++;
        console.log(`✨ Created: ${verse.Reference} (${category} → ${style})`);
      }
    }

    console.log(`\n✅ Seeded ${totalCreated} verses (skipped ${totalSkipped} existing)`);
    console.log('\nNow queuing generation for pending verses...\n');

    // Queue all pending verses for generation
    const pending = await VerseSong.find({ generationStatus: 'pending' });
    const { generateVerseSong } = require('../src/server/services/SunoService');

    console.log(`🚀 Queuing ${pending.length} verses for generation (staggered by 2s)...\n`);

    // Queue with concurrency control (stagger the generation calls)
    for (let i = 0; i < pending.length; i++) {
      const verseSong = pending[i];

      // Stagger queue calls to avoid overwhelming the API
      setTimeout(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Error generating ${verseSong.verseReference}:`, err);
        });
      }, i * 2000); // 2 second delay between queue calls
    }

    console.log(`✅ All ${pending.length} verses queued for generation`);
    console.log('\nMonitoring in background...');
    console.log('Typical generation time: 2-5 minutes per verse');
    console.log('Check progress with: node test/verse-song-test.js\n');

    // Keep connection alive for a bit
    setTimeout(() => {
      console.log('Closing connection. Generation continues in background.');
      process.exit(0);
    }, 5000);
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  }
}

seedTwoPerCategory();
