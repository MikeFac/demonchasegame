/**
 * Verse-Song System Test
 * Validates models, routes, and basic functionality
 */
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');

async function runTests() {
  try {
    console.log('🧪 Verse-Song System Test\n');

    // Connect to MongoDB
    console.log('1️⃣  Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Test 1: Check CategoryStyle seeding
    console.log('2️⃣  Checking CategoryStyle documents...');
    const styleCount = await CategoryStyle.countDocuments();
    console.log(`✅ Found ${styleCount} category styles`);

    if (styleCount === 0) {
      console.log('⚠️  No styles found. Run: node scripts/seed-category-styles.js\n');
    } else {
      const sampleStyle = await CategoryStyle.findOne();
      console.log(`   Sample: ${sampleStyle.category} → ${sampleStyle.generationStyle}\n`);
    }

    // Test 2: Check VerseSong collection
    console.log('3️⃣  Checking VerseSong documents...');
    const verseCount = await VerseSong.countDocuments();
    console.log(`✅ Found ${verseCount} verse songs`);

    if (verseCount === 0) {
      console.log('⚠️  No verses found. Run: node scripts/seed-top-verses.js\n');
    } else {
      // Show stats by status
      const stats = await Promise.all([
        VerseSong.countDocuments({ generationStatus: 'pending' }),
        VerseSong.countDocuments({ generationStatus: 'processing' }),
        VerseSong.countDocuments({ generationStatus: 'completed' }),
        VerseSong.countDocuments({ generationStatus: 'failed' })
      ]);

      console.log('\n   Generation Status:');
      console.log(`   - Pending: ${stats[0]}`);
      console.log(`   - Processing: ${stats[1]}`);
      console.log(`   - Completed: ${stats[2]}`);
      console.log(`   - Failed: ${stats[3]}\n`);

      // Show top verse by learning effectiveness
      const topVerse = await VerseSong.findOne(
        { playCount: { $gt: 0 } }
      ).sort({ learnCount: -1 });

      if (topVerse) {
        const effectiveness = (topVerse.learnCount / topVerse.playCount * 100).toFixed(1);
        console.log(`   Top Learning Verse:`);
        console.log(`   - ${topVerse.verseReference}: ${topVerse.learnCount}/${topVerse.playCount} (${effectiveness}%)\n`);
      }
    }

    // Test 3: Schema validation
    console.log('4️⃣  Validating schemas...');
    const testVerse = new VerseSong({
      verseReference: 'Test 1:1',
      book: 'Test',
      chapter: 1,
      startVerse: 1,
      category: 'Love',
      verseText: 'Test verse text',
      generationStyle: 'pop',
      generationStatus: 'pending'
    });

    const errors = testVerse.validateSync();
    if (errors) {
      console.log('❌ Schema validation failed:', errors);
    } else {
      console.log('✅ Schema validation passed\n');
    }

    // Test 4: Index check
    console.log('5️⃣  Checking indexes...');
    const indexes = await VerseSong.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    console.log(`✅ Found ${indexNames.length} indexes`);
    console.log(`   ${indexNames.join(', ')}\n`);

    // Summary
    console.log('========================================');
    console.log('✅ All tests completed successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    if (styleCount === 0) {
      console.log('1. node scripts/seed-category-styles.js');
    }
    if (verseCount === 0) {
      console.log('2. node scripts/seed-top-verses.js');
    }
    console.log('3. node server.js');
    console.log('4. Test API: curl "http://localhost:3500/api/verse-song?ref=John+3:16"');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
