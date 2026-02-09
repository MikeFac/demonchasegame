const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const song = await VerseSong.findOne({ verseReference: 'Acts 1:8' });
    
    console.log(`\n📀 Acts 1:8 - Power Category\n`);
    console.log(`Status: ${song.generationStatus}`);
    console.log(`Style: disco synthwave`);
    console.log(`Duration: ${song.duration}s`);
    console.log(`File: ${song.audioUrl}`);
    console.log(`\nPlay with:\n  mpv ${song.audioUrl.replace('/public/', '~/proj/dcgame/public/')}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
