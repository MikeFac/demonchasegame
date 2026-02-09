#!/usr/bin/env node
/**
 * Sync audio URLs in database to match actual files on disk
 * Updates audioUrl to include Suno ID: /audio/verse-reference-sunoId.mp3
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const VerseSong = require('../src/server/models/VerseSong');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');

async function syncAudioUrls() {
  console.log('🔄 Syncing audio URLs with actual files...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

    console.log(`📁 Found ${files.length} MP3 files\n`);

    let updated = 0;
    let notFound = 0;

    // Get all verses from database
    const allVerses = await VerseSong.find({});
    console.log(`📚 Found ${allVerses.length} verses in database\n`);

    for (const verse of allVerses) {
      const normalizedRef = normalizeReference(verse.verseReference);

      // Find matching file for this verse (could be multiple with different Suno IDs)
      const matchingFiles = files.filter(f => f.startsWith(normalizedRef + '-'));

      if (matchingFiles.length === 0) {
        console.log(`❌ No file found: ${verse.verseReference} (${normalizedRef})`);
        notFound++;
        continue;
      }

      if (matchingFiles.length === 1) {
        // Single file for this verse
        const filename = matchingFiles[0];
        const newAudioUrl = `/audio/${filename}`;

        if (verse.audioUrl !== newAudioUrl) {
          await VerseSong.updateOne(
            { _id: verse._id },
            { audioUrl: newAudioUrl }
          );
          console.log(`✅ Updated: ${verse.verseReference}`);
          console.log(`   → ${newAudioUrl}`);
          updated++;
        } else {
          console.log(`✓ Already correct: ${verse.verseReference}`);
        }
      } else {
        // Multiple files for this verse - pick the first one or the one matching sunoId
        let selectedFile = matchingFiles[0];

        if (verse.sunoId) {
          // Try to find the file with matching Suno ID
          const sunoIdFile = matchingFiles.find(f => f.includes(verse.sunoId));
          if (sunoIdFile) {
            selectedFile = sunoIdFile;
          }
        }

        const newAudioUrl = `/audio/${selectedFile}`;
        if (verse.audioUrl !== newAudioUrl) {
          await VerseSong.updateOne(
            { _id: verse._id },
            { audioUrl: newAudioUrl }
          );
          console.log(`✅ Updated (multi-file): ${verse.verseReference}`);
          console.log(`   → ${newAudioUrl}`);
          updated++;
        }
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Not found: ${notFound}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

syncAudioUrls();
