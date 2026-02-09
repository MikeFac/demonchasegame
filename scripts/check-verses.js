const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const songs = await VerseSong.find({ 
      verseReference: { $in: ['Matthew 5:8', 'Matthew 6:13'] }
    });
    
    for (const song of songs) {
      console.log(`\n${song.verseReference}:`);
      console.log(`Text: ${song.verseText}`);
      console.log(`Status: ${song.generationStatus}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
