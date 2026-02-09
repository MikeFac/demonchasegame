const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const remaining = await VerseSong.find({ generationStatus: { $ne: 'completed' } }).sort({ verseReference: 1 });
    
    console.log(`\n📍 Remaining Songs (${remaining.length}):\n`);
    for (const song of remaining) {
      console.log(`${song.verseReference} (${song.category}) - ${song.generationStatus}`);
    }
    
    const completed = await VerseSong.find({ generationStatus: 'completed' });
    console.log(`\n✅ Completed: ${completed.length}/35`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
