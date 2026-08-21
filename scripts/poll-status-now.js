const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const axios = require('axios');
const { assertKieAiEnabled } = require('../src/server/services/KieAiGate');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_API_KEY = process.env.KIE_API_KEY;

async function checkStatus(verseSongId) {
  try {
    assertKieAiEnabled();
    const verseSong = await VerseSong.findById(verseSongId);
    if (!verseSong) {
      console.error(`Song not found: ${verseSongId}`);
      return;
    }

    console.log(`\n🔍 Checking status for: ${verseSong.verseReference}`);
    console.log(`   Task ID: ${verseSong.generationRequestId}`);

    const statusResponse = await axios.get(
      `${KIE_API_BASE}/generate/record-info?taskId=${verseSong.generationRequestId}`,
      {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
        timeout: 30000
      }
    );

    console.log(`   API Response Code: ${statusResponse.data.code}`);
    if (statusResponse.data.code !== 200) {
      console.log(`   Error: ${statusResponse.data.msg}`);
      return;
    }

    const { status } = statusResponse.data.data;
    console.log(`   Generation Status: ${status}`);

    if (statusResponse.data.data.response?.sunoData?.[0]) {
      const audio = statusResponse.data.data.response.sunoData[0];
      console.log(`   ✅ Audio URL: ${audio.audioUrl}`);
      console.log(`   Duration: ${audio.duration}s`);
    }
  } catch (err) {
    console.error(`   Error: ${err.message}`);
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const processing = await VerseSong.find({ generationStatus: 'processing' });
    console.log(`\n📊 Checking ${processing.length} processing songs...\n`);

    for (const song of processing) {
      await checkStatus(song._id);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
