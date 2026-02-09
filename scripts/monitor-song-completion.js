const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const VerseSong = require('../src/server/models/VerseSong');

const logFile = path.join(__dirname, '../song-generation.log');

function logMessage(msg) {
  const timestamp = new Date().toLocaleString();
  const logLine = `[${timestamp}] ${msg}`;
  console.log(logLine);
  fs.appendFileSync(logFile, logLine + '\n');
}

async function checkProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const songs = await VerseSong.find({});
    const completed = songs.filter(s => s.generationStatus === 'completed').length;
    const processing = songs.filter(s => s.generationStatus === 'processing').length;
    const pending = songs.filter(s => s.generationStatus === 'pending').length;
    const failed = songs.filter(s => s.generationStatus === 'failed').length;
    
    const total = songs.length;
    const percent = Math.round((completed / total) * 100);
    
    logMessage(`📊 PROGRESS: ${completed}/${total} (${percent}%) | Processing: ${processing} | Pending: ${pending} | Failed: ${failed}`);
    
    await mongoose.connection.close();
    
    // If all completed, return true for deployment trigger
    if (completed === total && pending === 0 && processing === 0) {
      logMessage(`\n🎉 ALL ${total} SONGS COMPLETED! Ready for deployment.\n`);
      return true;
    }
    
    return false;
  } catch (err) {
    logMessage(`❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  logMessage('🚀 Starting song completion monitor (checks every 30 minutes)');
  logMessage(`Log file: ${logFile}\n`);
  
  let checkCount = 0;
  const maxChecks = 240; // ~8 hours
  
  async function checkAndSchedule() {
    checkCount++;
    const allDone = await checkProgress();
    
    if (allDone) {
      logMessage('✅ Deployment trigger: All songs completed!');
      process.exit(0); // Exit signal for parent script
    }
    
    if (checkCount < maxChecks) {
      setTimeout(checkAndSchedule, 30 * 60 * 1000); // 30 minutes
    } else {
      logMessage('⏱️ Max monitoring time reached (8 hours)');
      process.exit(1);
    }
  }
  
  // Check immediately first
  await checkAndSchedule();
}

main();
