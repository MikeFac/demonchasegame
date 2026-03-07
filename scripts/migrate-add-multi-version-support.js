#!/usr/bin/env node
/**
 * Migration Script: Add Multi-Version Support
 * 
 * Run this ONCE to migrate existing database to support multiple songs per verse
 * 
 * What it does:
 * 1. Drops the old unique index on verseReference
 * 2. Adds version numbers to all existing songs (defaults to 1)
 * 3. Adds qualityScore (defaults to 50)
 * 4. Adds isActiveVersion (defaults to true)
 * 5. Creates new compound indexes
 * 
 * Usage:
 *   node scripts/migrate-add-multi-version-support.js
 * 
 * Requirements:
 *   - MongoDB connection (MONGODB_URI in .env)
 *   - Backup your database first!
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Database Migration: Multi-Version Support             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Safety check
  console.log('⚠️  WARNING: This will modify your database schema.');
  console.log('⚠️  Make sure you have a backup before proceeding.\n');

  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const collection = db.collection('versesongs');

  try {
    // Step 1: Check current state
    console.log('📊 Step 1/5: Checking current state...');
    const existingIndexes = await collection.indexes();
    const uniqueIndex = existingIndexes.find(idx => 
      idx.key && idx.key.verseReference === 1 && idx.unique === true
    );

    if (uniqueIndex) {
      console.log('   Found unique index on verseReference:', uniqueIndex.name);
    } else {
      console.log('   No unique index found on verseReference (may already be migrated)');
    }

    const totalSongs = await collection.countDocuments();
    console.log(`   Total songs in database: ${totalSongs}\n`);

    if (totalSongs === 0) {
      console.log('✅ No songs to migrate. Database is empty.');
      process.exit(0);
    }

    // Step 2: Drop old unique index
    console.log('🔧 Step 2/5: Dropping old unique index...');
    if (uniqueIndex) {
      try {
        await collection.dropIndex(uniqueIndex.name);
        console.log(`   ✅ Dropped index: ${uniqueIndex.name}\n`);
      } catch (err) {
        if (err.code === 27) {
          console.log('   ⚠️  Index does not exist (may have been dropped already)\n');
        } else {
          throw err;
        }
      }
    } else {
      console.log('   ⏭️  No unique index to drop\n');
    }

    // Step 3: Add version numbers to existing songs
    console.log('📝 Step 3/5: Adding version numbers to existing songs...');
    
    // Check if any songs already have version field
    const withVersion = await collection.countDocuments({ version: { $exists: true } });
    
    if (withVersion > 0) {
      console.log(`   ⚠️  ${withVersion} songs already have version numbers`);
      console.log('   Skipping version assignment\n');
    } else {
      // Assign version = 1 to all existing songs
      const result = await collection.updateMany(
        { version: { $exists: false } },
        { 
          $set: { 
            version: 1,
            qualityScore: 50,
            isActiveVersion: true
          } 
        }
      );
      console.log(`   ✅ Updated ${result.modifiedCount} songs with version=1\n`);
    }

    // Step 4: Create new compound indexes
    console.log('🔍 Step 4/5: Creating new indexes...');
    
    const indexes = [
      { key: { verseReference: 1, version: 1 }, unique: true, name: 'verseReference_1_version_1' },
      { key: { verseReference: 1, isActiveVersion: 1 }, name: 'verseReference_1_isActiveVersion_1' },
      { key: { verseReference: 1, qualityScore: -1 }, name: 'verseReference_1_qualityScore_-1' },
      { key: { qualityScore: -1, playCount: 1 }, name: 'qualityScore_-1_playCount_1' }
    ];

    for (const indexDef of indexes) {
      try {
        await collection.createIndex(indexDef.key, { 
          unique: indexDef.unique || false, 
          name: indexDef.name 
        });
        console.log(`   ✅ Created index: ${indexDef.name}`);
      } catch (err) {
        if (err.code === 85 || err.code === 86) {
          console.log(`   ⚠️  Index ${indexDef.name} already exists`);
        } else {
          console.log(`   ❌ Error creating index ${indexDef.name}:`, err.message);
        }
      }
    }
    console.log('');

    // Step 5: Verify migration
    console.log('✅ Step 5/5: Verifying migration...');
    
    const migratedSongs = await collection.countDocuments({
      version: { $exists: true },
      qualityScore: { $exists: true },
      isActiveVersion: { $exists: true }
    });

    console.log(`   ${migratedSongs}/${totalSongs} songs have all new fields`);

    const finalIndexes = await collection.indexes();
    console.log(`   Total indexes: ${finalIndexes.length}`);

    // Show sample
    const sample = await collection.findOne({});
    console.log('\n   Sample song after migration:');
    console.log(`   - verseReference: ${sample.verseReference}`);
    console.log(`   - version: ${sample.version}`);
    console.log(`   - qualityScore: ${sample.qualityScore}`);
    console.log(`   - isActiveVersion: ${sample.isActiveVersion}`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Migration Complete!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - ${totalSongs} songs migrated`);
    console.log('   - Unique constraint removed from verseReference');
    console.log('   - New compound indexes created');
    console.log('   - Ready for multi-version support!\n');
    console.log('Next steps:');
    console.log('   1. Test API endpoints with ?version=1 parameter');
    console.log('   2. Run: node scripts/generate-additional-versions.js');
    console.log('   3. Monitor quality scores with: node scripts/analyze-quality-scores.js\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    console.error('\nStack trace:', err.stack);
    process.exit(1);
  }
}

// Run migration
migrate();
