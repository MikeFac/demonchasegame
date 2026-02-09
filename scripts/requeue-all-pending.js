const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get pending songs (those without generation request IDs)
    const pending = await VerseSong.find({ 
      $or: [
        { generationStatus: 'pending', generationRequestId: null },
        { generationStatus: 'pending', generationRequestId: '' }
      ]
    });

    console.log(`🔄 Found ${pending.length} songs pending generation\n`);

    if (pending.length === 0) {
      console.log('All songs already queued!');
      process.exit(0);
    }

    console.log(`🚀 Queuing ${pending.length} songs (2s stagger, will take ${pending.length * 2 / 60}min)\n`);

    for (let i = 0; i < pending.length; i++) {
      const song = pending[i];
      
      // Queue with longer delay to ensure all get initiated
      setTimeout(() => {
        generateVerseSong(song._id)
          .then(() => {
            console.log(`✅ Queued: ${song.verseReference}`);
          })
          .catch(err => {
            console.error(`❌ Error queuing ${song.verseReference}: ${err.message}`);
          });
      }, i * 2000);
    }

    // Keep process alive long enough for all queuing to happen
    const keepAliveTime = (pending.length * 2000) + 10000;
    console.log(`\n⏱️  Keeping process alive for ${keepAliveTime / 1000}s to complete queueing...\n`);

    setTimeout(() => {
      console.log('✅ Queuing complete. Closing connection.');
      process.exit(0);
    }, keepAliveTime);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
