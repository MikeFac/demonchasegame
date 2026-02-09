const mongoose = require('mongoose');
require('dotenv').config();

const CategoryStyle = require('../src/server/models/CategoryStyle');
const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update Prosperity category style
    const style = await CategoryStyle.findOneAndUpdate(
      { category: 'Prosperity' },
      { generationStyle: '80s soft rock, yacht rock, AOR, upbeat' },
      { new: true }
    );
    
    console.log(`✅ Updated Prosperity category style:`);
    console.log(`   From: jazz`);
    console.log(`   To: ${style.generationStyle}\n`);
    
    // Reset both Prosperity songs
    const songs = await VerseSong.find({ category: 'Prosperity' });
    
    console.log(`🔄 Resetting ${songs.length} Prosperity songs for re-generation:\n`);
    
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
