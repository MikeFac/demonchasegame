const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const processing = await VerseSong.find({ generationStatus: 'processing' }).limit(5);
    
    console.log(`📊 Processing Songs (${processing.length}):\n`);
    for (const song of processing) {
      console.log(`${song.verseReference}:`);
      console.log(`  - Task ID: ${song.generationRequestId}`);
      console.log(`  - Status: ${song.generationStatus}`);
      console.log(`  - Attempts: ${song.generationAttempts}`);
      console.log(`  - Last Updated: ${song.updatedAt}`);
      console.log();
    }
    
    const completed = await VerseSong.find({ generationStatus: 'completed' });
    console.log(`✅ Completed: ${completed.length} songs\n`);
    
    if (completed.length > 0) {
      console.log('Completed songs:');
      for (const song of completed.slice(0, 3)) {
        console.log(`  - ${song.verseReference}: ${song.audioUrl}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
