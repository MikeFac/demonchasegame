const mongoose = require('mongoose');
require('dotenv').config();

const CategoryStyle = require('../src/server/models/CategoryStyle');
const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update Knowledge category style
    const style = await CategoryStyle.findOneAndUpdate(
      { category: 'Knowledge' },
      { generationStyle: 'Celtic, Haunting Melody, Disco' },
      { new: true }
    );
    
    console.log(`✅ Updated Knowledge category style:`);
    console.log(`   From: celtic`);
    console.log(`   To: ${style.generationStyle}\n`);
    
    // Reset Knowledge songs
    const songs = await VerseSong.find({ category: 'Knowledge' });
    
    console.log(`🔄 Resetting ${songs.length} Knowledge songs for re-generation:\n`);
    
    for (const song of songs) {
      await VerseSong.findByIdAndUpdate(song._id, {
        generationStatus: 'pending',
        generationRequestId: null,
        generationError: null,
        generationAttempts: 0,
        sunoId: null,
        audioUrl: null,
        audioPath: null,
        duration: null,
        generatedAt: null
      });
      
      console.log(`   ✅ ${song.verseReference}`);
    }
    
    console.log();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
