/**
 * Generate Luganda verse songs for 1 verse per remaining category
 * (Prayer, Prophecy, Prosperity, Purity, Wisdom) using Suno via kie.ai API.
 * Creates VerseSong MongoDB entries ready for a Luganda game version.
 *
 * Style: Luganda Uganda Afro-pop
 *
 * Usage: KIE_API_KEY=your_key node scripts/generate-luganda-songs.js
 *
 * Options:
 *   --dry-run    Show what would be generated without calling the API
 *   --poll       Also poll for completion and download audio
 *
 * Cost: ~USD 0.06 per song via kie.ai
 */

const mongoose = require('mongoose');
require('dotenv').config();

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const VerseSong = require('../src/server/models/VerseSong');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const PROGRESS_FILE = path.join(__dirname, '..', '.luganda-songs-progress.json');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const BATCH_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 120;

const STYLE = 'Luganda Uganda Afro-pop, East African worship, warm vocals, sing the exact lyrics only, no ad-libs, no nonsense syllables, no extra words, short scripture song';

const CATEGORIES = ['Prayer', 'Prophecy', 'Prosperity', 'Purity', 'Wisdom'];
const LANG = 'lg';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function callKieAI(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      reject(new Error('KIE_API_KEY environment variable required'));
      return;
    }

    const url = new URL(`${KIE_API_BASE}${urlPath}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function buildLyrics(verseText, repeatCount) {
  const text = (verseText || '').trim();
  if (!text) return text;
  const wordCount = text.split(/\s+/).length;
  const minRepeats = Math.max(1, Math.ceil(32 / wordCount));
  const repeats = Math.max(repeatCount || 1, minRepeats);
  return Array(repeats).fill(text).join('\n\n');
}

function normalizeReference(ref) {
  return ref
    .toLowerCase()
    .replace(/[:\s]+/g, '-')
    .replace(/[^\w-]/g, '');
}

function parseLugandaReference(ref) {
  const parts = ref.match(/^([\dA-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) return null;
  return {
    book: parts[1].trim(),
    chapter: parseInt(parts[2], 10),
    startVerse: parseInt(parts[3], 10),
    endVerse: parts[4] ? parseInt(parts[4], 10) : undefined
  };
}

function pickVersePerCategory(translatedVerses) {
  const picks = [];
  for (const category of CATEGORIES) {
    const categoryVerses = translatedVerses.filter(v => v.Category === category);
    if (categoryVerses.length === 0) {
      console.log(`  ⚠️  No translated verses found for ${category}`);
      continue;
    }
    const pick = categoryVerses[Math.floor(categoryVerses.length / 2)];
    picks.push({ category, verse: pick });
  }
  return picks;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      console.log('Could not load progress file, starting fresh');
    }
  }
  return { songs: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

async function downloadAudio(audioUrl, filename) {
  await fs.promises.mkdir(AUDIO_DIR, { recursive: true });
  const filePath = path.join(AUDIO_DIR, filename);

  return new Promise((resolve, reject) => {
    const protocol = audioUrl.startsWith('https') ? https : http;
    protocol.get(audioUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadAudio(res.headers.location, filename).then(resolve, reject);
      }
      const stream = require('fs').createWriteStream(filePath);
      res.pipe(stream);
      stream.on('finish', () => {
        console.log(`  📥 Saved: ${filePath}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function findOrCreateVerseSong(verse, category) {
  const lugandaRef = verse.Reference || verse.EnglishRef;
  const normRef = normalizeReference(lugandaRef);
  const dbRef = normRef;

  let song = await VerseSong.findOne({ verseReference: dbRef });
  if (song) {
    console.log(`  ⏭️  DB entry exists: ${dbRef} (status: ${song.generationStatus})`);
    return song;
  }

  const parsed = parseLugandaReference(lugandaRef);

  song = new VerseSong({
    verseReference: dbRef,
    verseReferenceFull: `${lugandaRef} (Luganda)`,
    version: 1,
    book: parsed ? parsed.book : verse.EnglishRef.split(/\d/)[0].trim(),
    chapter: parsed ? parsed.chapter : 0,
    startVerse: parsed ? parsed.startVerse : 0,
    endVerse: parsed ? parsed.endVerse : undefined,
    category,
    verseText: verse.Text,
    generationStyle: STYLE,
    generationStatus: 'pending',
    generationAttempts: 0,
    language: LANG
  });

  await song.save();
  console.log(`  ✨ Created DB entry: ${dbRef}`);
  return song;
}

async function generateSong(song) {
  const lyrics = buildLyrics(song.verseText, 4);
  const title = `${song.verseReferenceFull || song.verseReference} - ${song.category} (Luganda)`;

  const body = {
    prompt: lyrics,
    customMode: true,
    instrumental: false,
    model: 'V4_5',
    title,
    style: STYLE,
    callBackUrl: 'https://httpbin.org/post'
  };

  console.log(`\n🎵 Generating: ${title}`);
  console.log(`   Lyrics preview: ${lyrics.slice(0, 80)}...`);

  const response = await callKieAI('POST', '/generate', body);

  if (response.code !== 200) {
    throw new Error(`KIE API Error: ${response.code} - ${response.msg}`);
  }

  const taskId = response.data?.taskId;
  if (!taskId) {
    throw new Error('No taskId in response');
  }

  song.generationRequestId = taskId;
  song.generationPrompt = lyrics;
  song.generationStatus = 'processing';
  await song.save();

  console.log(`  ✅ Queued: taskId=${taskId}`);
  return taskId;
}

async function pollForCompletion(song) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const response = await callKieAI('GET', `/generate/record-info?taskId=${song.generationRequestId}`);
    if (response.code !== 200) {
      console.log(`  ⚠️  Poll error: ${response.code}`);
      continue;
    }

    const { status } = response.data || {};
    const sunoData = response.data?.response?.sunoData?.[0];

    if (status === 'SUCCESS' && sunoData?.audioUrl) {
      console.log(`  ✅ Complete: ${song.verseReference}`);

      const filename = `${song.verseReference}-${sunoData.id}.mp3`;
      await downloadAudio(sunoData.audioUrl, filename);

      song.sunoId = sunoData.id;
      song.audioUrl = `/audio/${filename}`;
      song.audioPath = path.join(AUDIO_DIR, filename);
      song.duration = sunoData.duration || 120;
      song.generationStatus = 'completed';
      song.generatedAt = new Date();
      song.status = 'active';
      await song.save();

      return sunoData;
    } else if (status === 'FAILED') {
      song.generationStatus = 'failed';
      song.generationError = 'Generation failed on kie.ai';
      song.generationAttempts = (song.generationAttempts || 0) + 1;
      await song.save();
      throw new Error(`Generation failed for ${song.verseReference}`);
    } else {
      process.stdout.write(`  ⏳ [${i + 1}/${MAX_POLLS}] ${status}...\r`);
    }
  }

  song.generationStatus = 'failed';
  song.generationError = 'Polling timeout';
  await song.save();
  throw new Error(`Polling timeout for ${song.verseReference}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const shouldPoll = args.includes('--poll');

  if (!process.env.KIE_API_KEY) {
    console.error('Error: KIE_API_KEY environment variable required');
    console.error('Usage: KIE_API_KEY=your_key node scripts/generate-luganda-songs.js [--dry-run] [--poll]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const lgFile = path.join(__dirname, '..', 'bible-verses-lg.js');
  if (!fs.existsSync(lgFile)) {
    console.error('Error: bible-verses-lg.js not found. Run translate-luganda-remaining.js first.');
    process.exit(1);
  }

  const lgContent = fs.readFileSync(lgFile, 'utf8');
  const lgMatch = lgContent.match(/return\s*\[([\s\S]*)\];\s*\n\}/);
  if (!lgMatch) {
    console.error('Error: Could not parse bible-verses-lg.js');
    process.exit(1);
  }
  const translatedVerses = eval('[' + lgMatch[1] + ']');

  console.log(`Total translated verses available: ${translatedVerses.length}`);
  const availableCategories = [...new Set(translatedVerses.map(v => v.Category))];
  console.log(`Categories available: ${availableCategories.join(', ')}\n`);

  const picks = pickVersePerCategory(translatedVerses);
  if (picks.length === 0) {
    console.error('No verses available to generate songs for.');
    process.exit(1);
  }

  console.log('Selected verses:\n');
  for (const { category, verse } of picks) {
    console.log(`  ${category}: ${verse.EnglishRef} → ${verse.Reference}`);
    console.log(`    "${verse.Text.slice(0, 80)}..."`);
  }

  if (dryRun) {
    console.log('\n--dry-run: Would create VerseSong entries and generate via kie.ai.');
    console.log(`Estimated cost: ${picks.length} songs × $0.06 = $${(picks.length * 0.06).toFixed(2)}`);
    await mongoose.disconnect();
    return;
  }

  const progress = loadProgress();
  const processedCategories = new Set(progress.songs.map(s => s.category));

  for (const { category, verse } of picks) {
    if (processedCategories.has(category)) {
      console.log(`\n⏭️  Skipping ${category} - already processed`);
      continue;
    }

    const songEntry = {
      category,
      englishRef: verse.EnglishRef,
      lugandaRef: verse.Reference,
      verseText: verse.Text,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const song = await findOrCreateVerseSong(verse, category);
      songEntry.dbId = song._id.toString();
      songEntry.dbRef = song.verseReference;

      if (song.generationStatus === 'completed' && song.audioUrl) {
        console.log(`  ✅ Already completed: ${song.verseReference}`);
        songEntry.status = 'completed';
        songEntry.audioUrl = song.audioUrl;
        songEntry.taskId = song.generationRequestId;
        progress.songs.push(songEntry);
        saveProgress(progress);
        processedCategories.add(category);
        continue;
      }

      if (song.generationStatus === 'processing' && song.generationRequestId && !shouldPoll) {
        console.log(`  ⏳ Already processing: taskId=${song.generationRequestId}`);
        songEntry.status = 'processing';
        songEntry.taskId = song.generationRequestId;
        progress.songs.push(songEntry);
        saveProgress(progress);
        processedCategories.add(category);
        continue;
      }

      if (!song.generationRequestId || song.generationStatus === 'pending' || song.generationStatus === 'failed') {
        const taskId = await generateSong(song);
        songEntry.taskId = taskId;
        songEntry.status = 'processing';
      }

      if (shouldPoll && song.generationRequestId) {
        try {
          await pollForCompletion(song);
          songEntry.status = 'completed';
          songEntry.audioUrl = song.audioUrl;
          songEntry.sunoId = song.sunoId;
          songEntry.duration = song.duration;
        } catch (pollErr) {
          console.error(`  ❌ Polling failed: ${pollErr.message}`);
          songEntry.status = 'polling_failed';
          songEntry.error = pollErr.message;
        }
      }

      progress.songs.push(songEntry);
      saveProgress(progress);
      processedCategories.add(category);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      songEntry.status = 'failed';
      songEntry.error = err.message;
      progress.songs.push(songEntry);
      saveProgress(progress);
      processedCategories.add(category);
    }

    if (picks.length > 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('\n=== Summary ===');
  for (const song of progress.songs) {
    const icon = song.status === 'completed' ? '✅' : song.status === 'failed' ? '❌' : '⏳';
    console.log(`  ${icon} ${song.category}: ${song.englishRef} → ${song.lugandaRef}`);
    console.log(`     DB: ${song.dbRef || 'N/A'} [${song.status}]`);
    if (song.audioUrl) console.log(`     Audio: ${song.audioUrl}`);
    if (song.taskId) console.log(`     Task: ${song.taskId}`);
  }

  if (!shouldPoll) {
    const processing = progress.songs.filter(s => s.status === 'processing' || s.status === 'pending');
    if (processing.length > 0) {
      console.log('\nSongs submitted to kie.ai. To poll for completion + download + update DB:');
      console.log('  KIE_API_KEY=... node scripts/generate-luganda-songs.js --poll\n');
      console.log('Or check tasks manually:');
      for (const s of processing) {
        if (s.taskId) {
          console.log(`  curl -H "Authorization: Bearer $KIE_API_KEY" "${KIE_API_BASE}/generate/record-info?taskId=${s.taskId}"`);
        }
      }
    }
  }

  console.log(`\nProgress: ${PROGRESS_FILE}`);
  console.log(`Cost: ${progress.songs.filter(s => s.taskId).length} songs × $0.06 = $${(progress.songs.filter(s => s.taskId).length * 0.06).toFixed(2)}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  try { await mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
