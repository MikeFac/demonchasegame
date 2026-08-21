const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { assertKieAiEnabled } = require('../src/server/services/KieAiGate');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_API_KEY = process.env.KIE_API_KEY;

async function downloadAndStoreAudio(audioUrl, verseReference) {
  try {
    const audioDir = path.join(__dirname, '../public/audio');
    await fs.mkdir(audioDir, { recursive: true });

    const fileName = `${verseReference.replace(/\s+/g, '-')}-${Date.now()}.mp3`;
    const filePath = path.join(audioDir, fileName);

    console.log(`   📥 Downloading audio...`);
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    await fs.writeFile(filePath, response.data);
    console.log(`   ✅ Saved: ${fileName}`);

    return filePath;
  } catch (err) {
    console.error(`   ❌ Download error: ${err.message}`);
    throw err;
  }
}

async function processCompletedSongs() {
  try {
    assertKieAiEnabled();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const processing = await VerseSong.find({ generationStatus: 'processing' });
    console.log(`🔄 Processing ${processing.length} songs...\n`);

    let completed = 0;
    let failed = 0;

    for (const song of processing) {
      try {
        console.log(`Checking ${song.verseReference}...`);

        const statusResponse = await axios.get(
          `${KIE_API_BASE}/generate/record-info?taskId=${song.generationRequestId}`,
          {
            headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
            timeout: 30000
          }
        );

        if (statusResponse.data.code !== 200) {
          throw new Error(`API Error: ${statusResponse.data.msg}`);
        }

        const { status } = statusResponse.data.data;

        if (status === 'SUCCESS') {
          const sunoData = statusResponse.data.data.response?.sunoData?.[0];
          if (!sunoData?.audioUrl) {
            throw new Error('No audio URL in response');
          }

          const audioPath = await downloadAndStoreAudio(sunoData.audioUrl, song.verseReference);

          song.sunoId = sunoData.id;
          song.audioUrl = `/public/audio/${path.basename(audioPath)}`;
          song.audioPath = audioPath;
          song.duration = sunoData.duration;
          song.generationStatus = 'completed';
          song.generatedAt = new Date();
          song.status = 'active';
          await song.save();

          console.log(`   ✅ Completed!\n`);
          completed++;
        } else if (status === 'FAILED') {
          song.generationStatus = 'failed';
          song.generationError = 'Generation failed on kie.ai';
          song.generationAttempts = (song.generationAttempts || 0) + 1;
          await song.save();
          console.log(`   ❌ Failed\n`);
          failed++;
        } else {
          console.log(`   ⏳ Still processing (status: ${status})\n`);
        }
      } catch (err) {
        console.error(`   Error: ${err.message}\n`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Completed: ${completed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏳ Still processing: ${processing.length - completed - failed}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

processCompletedSongs();
