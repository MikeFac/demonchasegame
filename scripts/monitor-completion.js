const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

let checkCount = 0;
const MAX_CHECKS = 240; // 8 hours at 2min intervals

async function checkProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const songs = await VerseSong.find({});
    await mongoose.connection.close();

    const completed = songs.filter(s => s.generationStatus === 'completed').length;
    const processing = songs.filter(s => s.generationStatus === 'processing').length;
    const pending = songs.filter(s => s.generationStatus === 'pending').length;
    const failed = songs.filter(s => s.generationStatus === 'failed').length;
    
    const total = songs.length;
    const percent = Math.round((completed / total) * 100);
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ✅ ${completed}/${total} (${percent}%) | ⏳ ${processing} processing | 🔴 ${failed} failed`);

    checkCount++;
    
    if (completed === total) {
      console.log(`\n🎉 ALL ${total} SONGS COMPLETED!\n`);
      process.exit(0);
    }

    if (checkCount < MAX_CHECKS) {
      setTimeout(checkProgress, 120000); // Check every 2 minutes
    } else {
      console.log('\n⏱️  Maximum monitoring time reached. Songs may still be generating.');
      process.exit(0);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    checkCount++;
    if (checkCount < MAX_CHECKS) {
      setTimeout(checkProgress, 120000);
    } else {
      process.exit(1);
    }
  }
}

console.log('🔍 Starting progress monitor (checks every 2 minutes for 8 hours)\n');
checkProgress();
