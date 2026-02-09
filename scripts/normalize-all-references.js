const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

const VerseSong = require('../src/server/models/VerseSong');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const songs = await VerseSong.find({});
    console.log(`📊 Found ${songs.length} songs to normalize\n`);

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const existingFiles = await fs.readdir(audioDir).catch(() => []);

    let updated = 0;
    let renamed = 0;
    let errors = [];

    for (const song of songs) {
      const normalized = normalizeReference(song.verseReference);

      if (normalized !== song.verseReference) {
        console.log(`📝 Normalizing: "${song.verseReference}" → "${normalized}"`);

        // Update database
        const oldUrl = song.audioUrl;
        const newUrl = `/audio/${normalized}.mp3`;

        // Check if old audio file exists and rename it
        if (song.audioUrl && song.audioPath) {
          const oldAudioPath = song.audioPath;
          const newAudioPath = path.join(audioDir, `${normalized}.mp3`);

          try {
            if (existingFiles.includes(path.basename(oldAudioPath))) {
              await fs.rename(oldAudioPath, newAudioPath);
              console.log(`   📂 Renamed: ${path.basename(oldAudioPath)} → ${normalized}.mp3`);
              renamed++;
            }
          } catch (err) {
            errors.push(`Failed to rename ${oldAudioPath}: ${err.message}`);
          }
        }

        song.verseReference = normalized;
        song.audioUrl = newUrl;
        song.audioPath = path.join(audioDir, `${normalized}.mp3`);

        await song.save();
        updated++;
        console.log(`   ✅ Database updated\n`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`📊 SUMMARY:`);
    console.log(`   ✅ Updated: ${updated} references`);
    console.log(`   📂 Renamed: ${renamed} audio files`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERROR LOG:');
      for (const error of errors) {
        console.log(`   ${error}`);
      }
    }

    console.log('\n✅ Normalization complete!');
    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
