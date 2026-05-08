#!/usr/bin/env node
/**
 * Generate devotionals for the first 3 verses in each category.
 * 
 * Usage:
 *   node scripts/generate-devotionals-first3.js
 * 
 * Requires MONGODB_URI and OPENROUTER_API_KEY in .env
 * Skips verses that already have a completed devotional.
 * Adds a 3-second delay between generations to be kind to the API.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Sermon = require('../src/server/models/Sermon');
const { generateSermonText } = require('../src/server/services/SermonService');
const { loadSelectedVerses } = require('../bible-verses');

const START_OFFSET_PER_CATEGORY = 3; // start from the 4th verse (index 3)
const TARGET_PER_CATEGORY = 3; // how many to generate
const DELAY_MS = 3000; // 3s between API calls

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 300000 // 5 minutes (sermon generation can take > 1 minute)
    });
    console.log('✅ Connected to MongoDB\n');

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY not set in .env');
      process.exit(1);
    }

    const allVerses = loadSelectedVerses();

    // Group verses by category, preserving order
    const byCategory = {};
    for (const verse of allVerses) {
      if (!byCategory[verse.Category]) {
        byCategory[verse.Category] = [];
      }
      byCategory[verse.Category].push(verse);
    }

    const categories = Object.keys(byCategory).sort();
    console.log(`📊 Categories: ${categories.length}`);
    console.log(`🎯 Target: ${TARGET_PER_CATEGORY} verses per category (starting at offset ${START_OFFSET_PER_CATEGORY})\n`);
    console.log('═'.repeat(60) + '\n');

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const category of categories) {
      const verses = byCategory[category];
      const start = Math.min(START_OFFSET_PER_CATEGORY, verses.length);
      const end = Math.min(START_OFFSET_PER_CATEGORY + TARGET_PER_CATEGORY, verses.length);
      const targetCount = Math.max(0, end - start);
      console.log(`📚 ${category} (${targetCount} verses: index ${start} to ${end - 1})`);

      for (let i = start; i < end; i++) {
        const verse = verses[i];

        // Check if already exists
        const existing = await Sermon.findOne({
          verseReference: verse.Reference,
          lang: 'en',
          generationStatus: 'completed'
        });

        if (existing) {
          console.log(`   ⏭️  ${verse.Reference} (already exists)`);
          totalSkipped++;
          continue;
        }

        // Generate new devotional
        try {
          console.log(`   🔄 ${verse.Reference} — generating...`);
          const result = await generateSermonText(verse.Reference, verse.Text, category, 'en');

          const sermon = new Sermon({
            verseReference: verse.Reference,
            lang: 'en',
            verseText: verse.Text,
            category: category,
            pages: result.pages,
            prayer: result.prayer,
            model: result.model,
            generationStatus: 'completed'
          });
          await sermon.save();

          console.log(`   ✅ ${verse.Reference} — ${result.pages.length} pages`);
          totalGenerated++;

          // Rate limit
          if (i < end - 1 || categories.indexOf(category) < categories.length - 1) {
            await sleep(DELAY_MS);
          }
        } catch (err) {
          console.log(`   ❌ ${verse.Reference} — ${err.message}`);
          totalErrors++;

          // Save failed record for retry later
          const failed = new Sermon({
            verseReference: verse.Reference,
            lang: 'en',
            verseText: verse.Text,
            category: category,
            pages: [],
            prayer: '',
            generationStatus: 'failed',
            generationError: err.message
          });
          await failed.save().catch(() => {});
        }
      }
      console.log();
    }

    console.log('═'.repeat(60));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Generated: ${totalGenerated}`);
    console.log(`   ⏭️  Skipped:   ${totalSkipped} (already exist)`);
    console.log(`   ❌ Errors:    ${totalErrors}`);
    console.log(`   📚 Total:     ${totalGenerated + totalSkipped} / ${categories.length * TARGET_PER_CATEGORY}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
