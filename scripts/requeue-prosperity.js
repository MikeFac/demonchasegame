const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const songs = await VerseSong.find({ category: 'Prosperity' });
    
    console.log(`\n🎵 Re-queuing ${songs.length} Prosperity songs with 80s soft rock, yacht rock, AOR, upbeat style...\n`);
    
    for (let i = 0; i < songs.length; i++) {
      setTimeout(() => {
        generateVerseSong(songs[i]._id).then(async () => {
          const updated = await VerseSong.findById(songs[i]._id);
          console.log(`✅ Queued: ${updated.verseReference}`);
          console.log(`   Style: 80s soft rock, yacht rock, AOR, upbeat`);
          console.log(`   Task ID: ${updated.generationRequestId}\n`);
        }).catch(err => {
          console.error(`Error: ${err.message}`);
        });
      }, i * 3000);
    }
    
    setTimeout(() => {
      console.log('Polling daemon will download when complete...\n');
      process.exit(0);
    }, 10000);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
