/**
 * Export locally generated songs for production migration
 *
 * Usage:
 *   node scripts/export-songs-for-production.js
 *
 * This script:
 * 1. Exports all active VerseSong records from local MongoDB
 * 2. Creates a JSON file with all song metadata
 * 3. Lists the audio files to copy to production
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportSongs() {
  try {
    // Connect to local MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const VerseSong = require('../src/server/models/VerseSong');

    // Find all active songs
    const songs = await VerseSong.find({ status: 'active' })
      .lean()
      .exec();

    console.log(`\n📊 Found ${songs.length} active songs\n`);

    // Export metadata as JSON
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSongs: songs.length,
      songs: songs.map(s => ({
        verseReference: s.verseReference,
        verseReferenceFull: s.verseReferenceFull || null,
        book: s.book,
        chapter: s.chapter,
        startVerse: s.startVerse,
        endVerse: s.endVerse || null,
        category: s.category,
        verseText: s.verseText,
        generationStyle: s.generationStyle,
        audioUrl: s.audioUrl,
        duration: s.duration || 120,
        playCount: s.playCount || 0,
        learnCount: s.learnCount || 0,
        averageRetention: s.averageRetention || 0
      }))
    };

    // Write to JSON file
    const exportPath = path.join(__dirname, '../songs-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Exported metadata to: ${exportPath}`);

    // List audio files to copy
    const audioDir = path.join(__dirname, '../public/audio');
    const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
    console.log(`\n📁 Audio files to copy: ${audioFiles.length}`);

    const audioListPath = path.join(__dirname, '../audio-files-list.txt');
    fs.writeFileSync(audioListPath, audioFiles.join('\n'));
    console.log(`✅ Audio list saved to: ${audioListPath}`);

    // Summary
    console.log(`\n📋 PRODUCTION SETUP INSTRUCTIONS:\n`);
    console.log(`1. Copy songs-export.json to production server`);
    console.log(`2. Copy /public/audio/*.mp3 files to production /audio/ directory`);
    console.log(`3. Run: node scripts/import-songs-from-local.js\n`);

    // Show distribution by category
    const byCategory = {};
    songs.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });

    console.log('📚 Songs by Category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

exportSongs();
