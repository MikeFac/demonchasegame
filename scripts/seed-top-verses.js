const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');

/**
 * Seed top 5 verses from each category (from bible-verses.js)
 * This creates ~110 VerseSong records and queues generation.
 */
async function seedTopVerses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const globalVerses = require('../bible-verses');

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
      // Take first 5 verses from this category
      const topVerses = verses.slice(0, 5);

      for (const verse of topVerses) {
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

    console.log(`\n✅ Seeded ${totalCreated} new verses (skipped ${totalSkipped} existing)`);
    console.log('\nNow queuing generation for pending verses...\n');

    // Queue all pending verses for generation
    const pending = await VerseSong.find({ generationStatus: 'pending' });
    const { generateVerseSong } = require('../src/server/services/SunoService');

    console.log(`🚀 Queuing ${pending.length} verses for generation (max 3 concurrent)...`);

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

    console.log(`✅ All verses queued. Monitoring in background...\n`);

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

seedTopVerses();
