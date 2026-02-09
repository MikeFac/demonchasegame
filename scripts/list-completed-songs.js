const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const completed = await VerseSong.find({ generationStatus: 'completed' }).sort({ generatedAt: -1 });
    
    console.log(`\n✅ Completed Songs (${completed.length}):\n`);
    
    for (const song of completed) {
      console.log(`📀 ${song.verseReference} (${song.category})`);
      console.log(`   Duration: ${song.duration}s`);
      console.log(`   URL: ${song.audioUrl}\n`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
