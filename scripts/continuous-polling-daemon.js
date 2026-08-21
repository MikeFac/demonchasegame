const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { assertKieAiEnabled } = require('../src/server/services/KieAiGate');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_API_KEY = process.env.KIE_API_KEY;
const POLL_INTERVAL = 10000; // Check every 10 seconds

let isPolling = false;

async function downloadAndStoreAudio(audioUrl, verseReference) {
  try {
    const baseDir = path.join(process.cwd(), 'public', 'audio');
    await fs.mkdir(baseDir, { recursive: true });

    const filename = verseReference
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/:/g, '-')
      .replace(/[^\w-]/g, '') + '.mp3';

    const filePath = path.join(baseDir, filename);

    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    await fs.writeFile(filePath, response.data);
    return filePath;
  } catch (err) {
    console.error(`Download error for ${verseReference}: ${err.message}`);
    throw err;
  }
}

async function pollAllPending() {
  assertKieAiEnabled();
  if (isPolling) return;
  isPolling = true;

  try {
    const pending = await VerseSong.find({ 
      generationStatus: { $in: ['pending', 'processing'] }
    });

    if (pending.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ All songs completed!`);
      return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] 🔍 Checking ${pending.length} songs...`);

    for (const song of pending) {
      try {
        if (song.generationStatus === 'pending' && !song.generationRequestId) {
          // Skip pending songs that haven't been queued yet
          continue;
        }

        const statusResponse = await axios.get(
          `${KIE_API_BASE}/generate/record-info?taskId=${song.generationRequestId}`,
          {
            headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
            timeout: 30000
          }
        );

        if (statusResponse.data.code !== 200) {
          console.log(`⚠️  ${song.verseReference}: API error ${statusResponse.data.code}`);
          continue;
        }

        const { status } = statusResponse.data.data;

        if (status === 'SUCCESS') {
          const sunoData = statusResponse.data.data.response?.sunoData?.[0];
          if (sunoData?.audioUrl) {
            try {
              const audioPath = await downloadAndStoreAudio(sunoData.audioUrl, song.verseReference);
              
              song.sunoId = sunoData.id;
              song.audioUrl = `/public/audio/${path.basename(audioPath)}`;
              song.audioPath = audioPath;
              song.duration = sunoData.duration;
              song.generationStatus = 'completed';
              song.generatedAt = new Date();
              song.status = 'active';
              await song.save();

              console.log(`✅ ${song.verseReference}`);
            } catch (err) {
              console.error(`❌ ${song.verseReference}: Download failed - ${err.message}`);
            }
          }
        } else if (status === 'FAILED') {
          song.generationStatus = 'failed';
          song.generationError = 'Generation failed';
          song.generationAttempts = (song.generationAttempts || 0) + 1;
          await song.save();
          console.log(`❌ ${song.verseReference}: Generation failed`);
        } else {
          console.log(`⏳ ${song.verseReference}: ${status}`);
        }
      } catch (err) {
        console.error(`Error checking ${song.verseReference}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Polling cycle error: ${err.message}`);
  } finally {
    isPolling = false;
  }
}

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`🚀 Starting continuous polling daemon (every ${POLL_INTERVAL/1000}s)\n`);

    // Poll immediately, then every POLL_INTERVAL
    setInterval(pollAllPending, POLL_INTERVAL);
    await pollAllPending(); // First check immediately

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down daemon...');
  process.exit(0);
});

start();
