require('dotenv').config();
const mongoose = require('mongoose');
const VerseSong = require('./src/server/models/VerseSong');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Checking verses without matching audio files:\n');

  // Check a few specific verses that reported "no file found"
  const testVerses = ['psalms103-2-3', 'john3-16', 'romans15-13', 'james1-5'];

  for (const ref of testVerses) {
    const verse = await VerseSong.findOne({ verseReference: ref })
      .select('verseReference audioUrl sunoId generationStatus generationError status');

    if (verse) {
      console.log(`${verse.verseReference}:`);
      console.log(`  audioUrl: ${verse.audioUrl}`);
      console.log(`  sunoId: ${verse.sunoId}`);
      console.log(`  generationStatus: ${verse.generationStatus}`);
      console.log(`  generationError: ${verse.generationError}`);
      console.log(`  status: ${verse.status}\n`);
    }
  }

  process.exit(0);
})();
