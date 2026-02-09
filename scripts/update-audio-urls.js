const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const completed = await VerseSong.find({ generationStatus: 'completed' });
    
    console.log('Updating audio URLs...\n');
    
    for (const song of completed) {
      const oldUrl = song.audioUrl;
      const newUrl = oldUrl.replace(/:/g, '-');
      
      song.audioUrl = newUrl;
      await song.save();
      
      console.log(`✅ ${song.verseReference}`);
      console.log(`   ${oldUrl} → ${newUrl}\n`);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
