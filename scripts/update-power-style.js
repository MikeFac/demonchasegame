const mongoose = require('mongoose');
require('dotenv').config();

const CategoryStyle = require('../src/server/models/CategoryStyle');
const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update Power category style
    const style = await CategoryStyle.findOneAndUpdate(
      { category: 'Power' },
      { generationStyle: 'disco synthwave' },
      { new: true }
    );
    
    console.log(`✅ Updated Power category style:`);
    console.log(`   From: metal`);
    console.log(`   To: ${style.generationStyle}\n`);
    
    // Reset Acts 1:8 for re-generation
    const song = await VerseSong.findOneAndUpdate(
      { verseReference: 'Acts 1:8' },
      {
        generationStatus: 'pending',
        generationRequestId: null,
        generationError: null,
        generationAttempts: 0,
        sunoId: null,
        audioUrl: null,
        audioPath: null,
        duration: null,
        generatedAt: null
      },
      { new: true }
    );
    
    console.log(`✅ Reset Acts 1:8 for re-generation:`);
    console.log(`   Status: pending`);
    console.log(`   Category: ${song.category}`);
    console.log(`   New Style: disco synthwave\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
