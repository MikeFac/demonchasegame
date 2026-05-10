const assert = require('assert');
const express = require('express');
const http = require('http');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const verseSongRouter = require('../src/server/routes/verseSong');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');
const { buildGenerationPrompt, buildStylePrompt } = require('../src/server/services/SunoService');

const TEST_REFERENCE = 'Test Book 1:1';
const NORMALIZED_REFERENCE = normalizeReference(TEST_REFERENCE);
const LEGACY_REFERENCE = 'Legacy Book 2:3';
const KOREAN_REFERENCE = '고린도전서 16:13';
const KOREAN_DB_REFERENCE = '1-corinthians-16-13';

async function startTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/verse-song', verseSongRouter);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function seedTestSongs() {
  await VerseSong.deleteMany({
    $or: [
      { verseReference: { $in: [NORMALIZED_REFERENCE, LEGACY_REFERENCE] } },
      { verseReference: KOREAN_DB_REFERENCE, language: 'kr' }
    ]
  });

  await VerseSong.insertMany([
    {
      verseReference: NORMALIZED_REFERENCE,
      verseReferenceFull: TEST_REFERENCE,
      version: 1,
      category: 'Test',
      status: 'active',
      isActiveVersion: true,
      generationStatus: 'completed',
      audioUrl: '/audio/test-book-1-1-v1.mp3',
      playCount: 10,
      learnCount: 2,
      averageRetention: 0.2,
      qualityScore: 20
    },
    {
      verseReference: NORMALIZED_REFERENCE,
      verseReferenceFull: TEST_REFERENCE,
      version: 2,
      category: 'Test',
      status: 'active',
      isActiveVersion: true,
      generationStatus: 'completed',
      audioUrl: '/audio/test-book-1-1-v2.mp3',
      playCount: 2,
      learnCount: 2,
      averageRetention: 1,
      qualityScore: 100
    },
    {
      verseReference: NORMALIZED_REFERENCE,
      verseReferenceFull: TEST_REFERENCE,
      version: 3,
      category: 'Test',
      status: 'active',
      isActiveVersion: true,
      generationStatus: 'completed',
      audioUrl: '/audio/test-book-1-1-v3.mp3',
      playCount: 4,
      learnCount: 3,
      averageRetention: 0.75,
      qualityScore: 75
    }
  ]);

  await VerseSong.collection.insertOne({
    verseReference: LEGACY_REFERENCE,
    verseReferenceFull: LEGACY_REFERENCE,
    version: 1,
    category: 'Legacy',
    status: 'active',
    isActiveVersion: true,
    generationStatus: 'completed',
    audioUrl: '/audio/legacy-book-2-3-v1.mp3',
    playCount: 1,
    learnCount: 1,
    averageRetention: 1,
    qualityScore: 100
  });

  await VerseSong.insertOne({
    verseReference: KOREAN_DB_REFERENCE,
    verseReferenceFull: KOREAN_REFERENCE,
    version: 1,
    category: 'Courage',
    status: 'active',
    isActiveVersion: true,
    generationStatus: 'completed',
    audioUrl: '/audio/1-corinthians-16-13-kr-v1.mp3',
    language: 'kr',
    playCount: 5,
    learnCount: 4,
    averageRetention: 0.8,
    qualityScore: 80
  });
}

async function run() {
  let server;

  try {
    const prompt = buildGenerationPrompt('For God so loved the world...', 2);
    const stylePrompt = buildStylePrompt('pop');
    assert.ok(!prompt.includes('Create a scripture learning song.'));
    assert.ok(prompt.includes('For God so loved the world...'));
    assert.ok(prompt.split('For God so loved the world...').length > 3);
    assert.ok(stylePrompt.includes('cold open with singing'));
    assert.ok(stylePrompt.includes('first lyric begins at 0:00'));
    assert.ok(stylePrompt.includes('repeat the exact supplied lyrics only'));
    assert.ok(stylePrompt.includes('no nonsense syllables'));

    await mongoose.connect(process.env.MONGODB_URI);
    await seedTestSongs();

    const started = await startTestServer();
    server = started.server;

    const selectedVersions = new Set();

    for (let i = 0; i < 20; i++) {
      const response = await axios.get(`${started.baseUrl}/api/verse-song`, {
        params: { ref: TEST_REFERENCE }
      });

      assert.strictEqual(response.data.status, 'ready');
      assert.strictEqual(response.data.totalVersions, 3);
      assert.ok([1, 2, 3].includes(response.data.version));
      selectedVersions.add(response.data.version);
    }

    assert.ok(selectedVersions.size > 1, 'expected random selection across multiple versions');

    const legacyResponse = await axios.get(`${started.baseUrl}/api/verse-song`, {
      params: { ref: LEGACY_REFERENCE }
    });

    assert.strictEqual(legacyResponse.data.status, 'ready');
    assert.strictEqual(legacyResponse.data.version, 1);
    assert.strictEqual(legacyResponse.data.totalVersions, 1);
    assert.strictEqual(legacyResponse.data.audioUrl, '/audio/legacy-book-2-3-v1.mp3');

    const koreanResponse = await axios.get(`${started.baseUrl}/api/verse-song`, {
      params: { ref: KOREAN_REFERENCE, lang: 'kr' }
    });

    assert.strictEqual(koreanResponse.data.status, 'ready');
    assert.strictEqual(koreanResponse.data.version, 1);
    assert.strictEqual(koreanResponse.data.totalVersions, 1);
    assert.strictEqual(koreanResponse.data.audioUrl, '/audio/1-corinthians-16-13-kr-v1.mp3');

    const libraryResponse = await axios.get(`${started.baseUrl}/api/verse-song/library`, {
      params: { lang: 'en' }
    });

    const legacyCategory = libraryResponse.data.categories.find((entry) => entry.category === 'Legacy');
    assert.ok(legacyCategory, 'expected Legacy category in English song library');
    const legacyVerse = legacyCategory.verses.find((entry) => entry.verseReference === LEGACY_REFERENCE);
    assert.ok(legacyVerse, 'expected legacy verse in English song library');

    const recordPlayResponse = await axios.post(`${started.baseUrl}/api/verse-song/record-play`, {
      verseReference: TEST_REFERENCE,
      version: 2,
      wasLearned: true
    });

    assert.strictEqual(recordPlayResponse.data.version, 2);
    assert.strictEqual(recordPlayResponse.data.playCount, 3);
    assert.strictEqual(recordPlayResponse.data.learnCount, 3);
    assert.strictEqual(recordPlayResponse.data.averageRetention, 1);
    assert.strictEqual(recordPlayResponse.data.qualityScore, 100);

    const updatedVersionTwo = await VerseSong.findOne({
      verseReference: NORMALIZED_REFERENCE,
      version: 2
    }).lean();

    assert.strictEqual(updatedVersionTwo.playCount, 3);
    assert.strictEqual(updatedVersionTwo.learnCount, 3);

    const fallbackResponse = await axios.post(`${started.baseUrl}/api/verse-song/record-play`, {
      verseReference: TEST_REFERENCE,
      version: 999,
      wasLearned: false
    });

    assert.ok([1, 2, 3].includes(fallbackResponse.data.version));

    console.log('✅ Multi-version verse song tests passed');
    console.log(`   Randomly selected versions: ${Array.from(selectedVersions).sort().join(', ')}`);
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await VerseSong.deleteMany({
      $or: [
        { verseReference: { $in: [NORMALIZED_REFERENCE, LEGACY_REFERENCE] } },
        { verseReference: KOREAN_DB_REFERENCE, language: 'kr' }
      ]
    });
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('❌ Multi-version verse song tests failed:', err.message);
  process.exit(1);
});
