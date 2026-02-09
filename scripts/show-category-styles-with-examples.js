const mongoose = require('mongoose');
require('dotenv').config();

const CategoryStyle = require('../src/server/models/CategoryStyle');
const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const styles = await CategoryStyle.find().sort({ category: 1 });
    const songs = await VerseSong.find({ generationStatus: 'completed' });
    
    console.log('\n📚 CATEGORY → MUSICAL STYLE MAPPING\n');
    console.log('═'.repeat(70));
    
    for (const style of styles) {
      const song = songs.find(s => s.category === style.category);
      const example = song 
        ? `${song.verseReference} (${song.duration}s)`
        : 'No song generated';
      
      const genreDisplay = style.generationStyle.toUpperCase();
      console.log(`\n${style.category.padEnd(20)} → ${genreDisplay.padEnd(20)} [${example}]`);
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
