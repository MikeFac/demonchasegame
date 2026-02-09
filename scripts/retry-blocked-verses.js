const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Reset these blocked verses for retry with modified approach
    const blocked = await VerseSong.find({
      verseReference: { $in: ['Matthew 5:8', 'Matthew 6:13'] }
    });
    
    console.log(`Retrying ${blocked.length} blocked verses...\n`);
    
    for (const song of blocked) {
      // Clear previous attempt
      song.generationStatus = 'pending';
      song.generationRequestId = null;
      song.generationError = null;
      song.generationAttempts = (song.generationAttempts || 0) + 1;
      await song.save();
      
      console.log(`Reset: ${song.verseReference}`);
    }
    
    console.log('\nRequeuing for generation...\n');
    
    // Queue them again
    for (let i = 0; i < blocked.length; i++) {
      setTimeout(() => {
        generateVerseSong(blocked[i]._id)
          .then(() => {
            console.log(`✅ Requeued: ${blocked[i].verseReference}`);
          })
          .catch(err => {
            console.error(`Error: ${err.message}`);
          });
      }, i * 3000);
    }
    
    setTimeout(() => {
      console.log('\nDone requeuing. Daemon will handle completion.');
      process.exit(0);
    }, 10000);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
