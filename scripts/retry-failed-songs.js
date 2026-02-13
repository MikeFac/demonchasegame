const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Reset failed verses back to pending
    const result = await VerseSong.updateMany(
      { generationStatus: 'failed' },
      { generationStatus: 'pending', generationAttempts: 0 }
    );

    console.log(`✨ Reset ${result.modifiedCount} failed verses back to pending\n`);

    // Queue pending verses for generation
    const pending = await VerseSong.find({ generationStatus: 'pending' });

    console.log(`🚀 Queuing ${pending.length} verses for generation (staggered by 2s)...\n`);

    for (let i = 0; i < pending.length; i++) {
      const verseSong = pending[i];

      setTimeout(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Error generating ${verseSong.verseReference}:`, err.message);
        });
      }, i * 2000);
    }

    console.log(`✅ All ${pending.length} verses queued for generation`);
    console.log('Check progress with: node test/verse-song-test.js\n');

    const keepAliveTime = (pending.length * 2000) + 5000;
    setTimeout(() => {
      console.log(`✅ All ${pending.length} songs queued. Daemon will process generation and downloads.`);
      process.exit(0);
    }, keepAliveTime);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
