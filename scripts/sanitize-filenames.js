const fs = require('fs').promises;
const path = require('path');

async function main() {
  try {
    const audioDir = '/home/michael/proj/dcgame/public/audio';
    const files = await fs.readdir(audioDir);
    
    console.log('🔧 Sanitizing filenames...\n');
    
    for (const file of files) {
      if (file.includes(':')) {
        const oldPath = path.join(audioDir, file);
        const newFile = file.replace(/:/g, '-');
        const newPath = path.join(audioDir, newFile);
        
        await fs.rename(oldPath, newPath);
        console.log(`✅ ${file}`);
        console.log(`   → ${newFile}\n`);
      }
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
