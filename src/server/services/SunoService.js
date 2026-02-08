const axios = require('axios');
const VerseSong = require('../models/VerseSong');
const CategoryStyle = require('../models/CategoryStyle');
const fs = require('fs').promises;
const path = require('path');

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_API_BASE = 'https://api.kie.ai/v1';

/**
 * Generate a song for a verse via Suno/kie.ai
 */
async function generateVerseSong(verseSongId) {
  try {
    const verseSong = await VerseSong.findById(verseSongId);
    if (!verseSong) {
      throw new Error(`VerseSong not found: ${verseSongId}`);
    }

    const categoryStyle = await CategoryStyle.findOne({ category: verseSong.category });
    const style = categoryStyle?.generationStyle || 'pop';
    const repeatCount = categoryStyle?.repeatCount || 3;

    // Build lyrics: verse text repeated 3x
    const lyrics = Array(repeatCount)
      .fill(verseSong.verseText)
      .join('\n\n')
      .trim();

    console.log(`📝 Calling Suno for ${verseSong.verseReference} (${style})...`);

    // Call Suno API via kie.ai
    const sunoResponse = await axios.post(
      `${KIE_API_BASE}/generate`,
      {
        title: `${verseSong.verseReference} - Scripture Learning`,
        tags: ['scripture', 'educational', 'memorization', verseSong.category.toLowerCase()],
        prompt: lyrics,
        style: style,
        duration_seconds: 120
      },
      {
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const { id: generationRequestId, status } = sunoResponse.data;

    // Update verse song with request ID
    verseSong.generationRequestId = generationRequestId;
    verseSong.generationPrompt = lyrics;
    verseSong.generationStatus = 'processing';
    await verseSong.save();

    console.log(`📝 Queued generation for ${verseSong.verseReference} (ID: ${generationRequestId})`);

    // Start polling (first poll after 10s, then check every 5s)
    setTimeout(() => {
      pollSunoStatus(verseSongId).catch(err => {
        console.error(`Error polling Suno status for ${verseSongId}:`, err);
      });
    }, 10000);
  } catch (err) {
    console.error(`Error generating verse song ${verseSongId}:`, err);

    const verseSong = await VerseSong.findById(verseSongId);
    if (verseSong) {
      verseSong.generationStatus = 'failed';
      verseSong.generationError = err.message;
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();
    }
  }
}

/**
 * Poll Suno API for generation status
 */
async function pollSunoStatus(verseSongId, pollCount = 0) {
  const MAX_POLLS = 240; // ~20 minutes with 5s interval
  const POLL_INTERVAL = 5000; // 5 seconds

  try {
    const verseSong = await VerseSong.findById(verseSongId);
    if (!verseSong || verseSong.generationStatus !== 'processing') {
      return; // Already completed or failed
    }

    // Check status with Suno
    const statusResponse = await axios.get(
      `${KIE_API_BASE}/generate/${verseSong.generationRequestId}`,
      {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
        timeout: 30000
      }
    );

    const { status, audio_url, image_url } = statusResponse.data;

    if (status === 'complete') {
      // Download and store audio file locally
      const audioPath = await downloadAndStoreAudio(
        audio_url,
        verseSong.verseReference
      );

      // Update verse song with completed info
      verseSong.sunoId = verseSong.generationRequestId;
      verseSong.audioUrl = `/content/audio/${path.basename(audioPath)}`;
      verseSong.audioPath = audioPath;
      verseSong.duration = 120; // Approximate
      verseSong.generationStatus = 'completed';
      verseSong.generatedAt = new Date();
      verseSong.status = 'active';
      await verseSong.save();

      console.log(`✅ Completed: ${verseSong.verseReference} → ${verseSong.audioUrl}`);
    } else if (status === 'error' || status === 'failed') {
      verseSong.generationStatus = 'failed';
      verseSong.generationError = statusResponse.data.error || 'Unknown error';
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();

      console.error(`❌ Failed: ${verseSong.verseReference} - ${verseSong.generationError}`);
    } else if (status === 'processing' || status === 'pending') {
      // Still processing—schedule next poll
      if (pollCount < MAX_POLLS) {
        setTimeout(() => {
          pollSunoStatus(verseSongId, pollCount + 1).catch(err => {
            console.error(`Polling error for ${verseSongId}:`, err);
          });
        }, POLL_INTERVAL);
      } else {
        // Timeout
        verseSong.generationStatus = 'failed';
        verseSong.generationError = 'Polling timeout (20+ minutes)';
        await verseSong.save();

        console.error(`⏱️ Timeout: ${verseSong.verseReference}`);
      }
    }
  } catch (err) {
    console.error(`Error polling Suno status for ${verseSongId}:`, err);

    const verseSong = await VerseSong.findById(verseSongId);
    if (verseSong) {
      verseSong.generationStatus = 'failed';
      verseSong.generationError = err.message;
      await verseSong.save();
    }
  }
}

/**
 * Download audio from Suno and store locally
 */
async function downloadAndStoreAudio(audioUrl, verseReference) {
  try {
    const response = await axios.get(audioUrl, { responseType: 'stream', timeout: 60000 });

    // Create directory structure: /public/content/audio/
    const baseDir = path.join(process.cwd(), 'public', 'content', 'audio');
    await fs.mkdir(baseDir, { recursive: true });

    // Filename: john-3-16.mp3
    const filename = verseReference
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/:/g, '-')
      .replace(/[^\w-]/g, '') + '.mp3';

    const filePath = path.join(baseDir, filename);

    // Write stream to file
    const writeStream = require('fs').createWriteStream(filePath);
    response.data.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`📥 Saved audio to ${filePath}`);
        resolve(filePath);
      });
      writeStream.on('error', reject);
    });
  } catch (err) {
    console.error(`Error downloading audio from ${audioUrl}:`, err);
    throw err;
  }
}

module.exports = {
  generateVerseSong,
  pollSunoStatus
};
