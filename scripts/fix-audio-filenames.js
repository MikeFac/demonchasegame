#!/usr/bin/env node
/**
 * Fix audio filename mismatches
 * Renames verse song audio files to match database expectations
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const VerseSong = require('../src/server/models/VerseSong');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');

async function fixAudioFilenames() {
  console.log('🔧 Fixing audio filename mismatches...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

    console.log(`📁 Found ${files.length} MP3 files in ${audioDir}\n`);

    let renamed = 0;
    let updated = 0;

    for (const file of files) {
      const oldPath = path.join(audioDir, file);

      // Try to extract verse reference from filename
      // Handles formats like: "Psalms-118-6-timestamp.mp3" or "john3-16.mp3"
      let verseRef = null;

      // Try format: "Book-Chapter-Verse" or "Book-Chapter-Verse-Verse2"
      const match = file.match(/^([A-Za-z]+)-(\d+)-(\d+)(?:-(\d+))?/);
      if (match) {
        const book = match[1];
        const chapter = match[2];
        const verse = match[3];
        const endVerse = match[4];

        // Reconstruct verse reference
        verseRef = endVerse ? `${book} ${chapter}:${verse}-${endVerse}` : `${book} ${chapter}:${verse}`;
      }

      if (!verseRef) {
        console.log(`⚠️  Skipped (couldn't parse): ${file}`);
        continue;
      }

      const normalizedRef = normalizeReference(verseRef);
      const expectedFilename = normalizedRef + '.mp3';
      const newPath = path.join(audioDir, expectedFilename);

      // Check if file already has correct name
      if (file === expectedFilename) {
        console.log(`✅ Already correct: ${file}`);
        continue;
      }

      // Rename file to match normalized format
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`✏️  Renamed: ${file} → ${expectedFilename}`);
        renamed++;

        // Update database to use correct audioUrl
        const result = await VerseSong.updateOne(
          { verseReference: normalizedRef },
          { audioUrl: `/audio/${expectedFilename}` }
        );

        if (result.modifiedCount > 0) {
          console.log(`   📝 Updated database entry for ${normalizedRef}`);
          updated++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Renamed: ${renamed} files`);
    console.log(`   Updated: ${updated} database entries\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixAudioFilenames();
