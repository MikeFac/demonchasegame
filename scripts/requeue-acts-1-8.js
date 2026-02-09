const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const song = await VerseSong.findOne({ verseReference: 'Acts 1:8' });
    
    console.log(`\n🎵 Re-queuing Acts 1:8 with DISCO SYNTHWAVE style...\n`);
    
    await generateVerseSong(song._id);
    
    const updated = await VerseSong.findById(song._id);
    console.log(`✅ Queued for generation:`);
    console.log(`   Verse: ${updated.verseReference}`);
    console.log(`   Style: disco synthwave`);
    console.log(`   Task ID: ${updated.generationRequestId}`);
    console.log(`   Status: ${updated.generationStatus}\n`);
    console.log('Polling daemon will download when complete...\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
