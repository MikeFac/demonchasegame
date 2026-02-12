require('dotenv').config();
const mongoose = require('mongoose');
const VerseSong = require('./src/server/models/VerseSong');
const fs = require('fs');
const path = require('path');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('🎵 Debugging Music Playback\n');

  // Get completed verses
  const completed = await VerseSong.find({
    generationStatus: 'completed',
    status: 'active'
  }).select('verseReference audioUrl sunoId').limit(10);

  console.log(`Found ${completed.length} completed verses:\n`);

  let filesFound = 0;
  let filesMissing = 0;

  completed.forEach(v => {
    const filePath = '.' + v.audioUrl;
    const fullPath = path.join(__dirname, 'public', v.audioUrl);
    const exists = fs.existsSync(fullPath);

    console.log(`${v.verseReference}:`);
    console.log(`  audioUrl: ${v.audioUrl}`);
    console.log(`  file exists: ${exists ? '✓' : '✗ MISSING'}`);

    if (exists) {
      const stats = fs.statSync(fullPath);
      console.log(`  file size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
      filesFound++;
    } else {
      filesMissing++;
    }
    console.log();
  });

  console.log(`Summary: ${filesFound} files found, ${filesMissing} files missing`);

  if (filesMissing > 0) {
    console.log('\n⚠️  Missing audio files detected!');
    console.log('The database says songs are "completed" but audio files do not exist.');
    console.log('This will cause the browser to get 404 errors when trying to play songs.');
    console.log('\nSolution: Songs need to be regenerated to download the audio files.');
  }

  process.exit(0);
})();
