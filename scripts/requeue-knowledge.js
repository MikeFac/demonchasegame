const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const song = await VerseSong.findOne({ category: 'Knowledge' });
    
    console.log(`\n🎵 Re-queuing Knowledge song with Celtic, Haunting Melody, Disco style...\n`);
    
    await generateVerseSong(song._id);
    
    const updated = await VerseSong.findById(song._id);
    console.log(`✅ Queued: ${updated.verseReference}`);
    console.log(`   Style: Celtic, Haunting Melody, Disco`);
    console.log(`   Task ID: ${updated.generationRequestId}\n`);
    console.log('Polling daemon will download when complete...\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
