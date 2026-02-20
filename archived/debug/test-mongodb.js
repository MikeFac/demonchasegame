#!/usr/bin/env node
/**
 * Test MongoDB connectivity and VerseSong model
 */
require('dotenv').config();
const mongoose = require('mongoose');
const VerseSong = require('./src/server/models/VerseSong');

async function testMongoDB() {
  console.log('🧪 Testing MongoDB Connection...\n');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('📍 Connection URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@'));

  try {
    console.log('\n⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!\n');

    // Check if VerseSong collection exists and count documents
    console.log('📊 Checking VerseSong collection...');
    const count = await VerseSong.countDocuments();
    console.log(`   Total verses in database: ${count}`);

    if (count === 0) {
      console.log('   ⚠️  No verses found. You need to seed the database.\n');
      console.log('   Run one of these seeding scripts:');
      console.log('   - node scripts/seed-one-verse-per-category.js');
      console.log('   - node scripts/seed-top-verses.js\n');
    } else {
      // Show a sample
      console.log('\n   📝 Sample verses:');
      const samples = await VerseSong.find().limit(3);
      samples.forEach(v => {
        console.log(`      - ${v.verseReference}: ${v.generationStatus} (${v.status})`);
      });
    }

    // Test verse lookup
    console.log('\n🔍 Testing verse lookup...');
    const testRef = 'John 3:16';
    const verse = await VerseSong.findOne({ verseReference: testRef });
    if (verse) {
      console.log(`✅ Found: ${verse.verseReference}`);
      console.log(`   Generation Status: ${verse.generationStatus}`);
      console.log(`   Audio URL: ${verse.audioUrl || 'not available'}`);
    } else {
      console.log(`❌ Not found: ${testRef}`);
      console.log('   The verse-song endpoint will try to create and queue it.');
    }

    console.log('\n✅ MongoDB setup is working correctly!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MongoDB is running:');
    console.error('   - Check with: mongosh --eval "db.version()"');
    console.error('2. Verify credentials in .env MONGODB_URI');
    console.error('3. Check MongoDB auth database settings');
    console.error('4. Try connecting manually with mongosh using the same URI\n');
    process.exit(1);
  }
}

testMongoDB();
