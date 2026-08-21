/**
 * Generate Swahili verse songs for 5 verses per category using Suno via kie.ai API.
 *
 * Creates VerseSong MongoDB entries ready for a Swahili game version.
 *
 * Style:
 * Upbeat Gospel Arbantone, energetic Kenyan Arbantone beat,
 * catchy male & female vocals, danceable but inspirational,
 * modern East African gospel vibe
 *
 * Usage: KIE_API_KEY=your_key node scripts/generate-zwahili-songs.js
 *
 * Options:
 *   --dry-run    Show what would be generated without calling the API
 *   --poll       Also poll for completion and download audio
 *   --refresh-progress-only   Rebuild the local progress file from Swahili DB rows only
 *   --only-ref=<db-ref>   Restrict the run to a single normalized verse reference
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
const { loadSelectedVersesZW } = require('../bible-verses-zw.js');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const PROGRESS_FILE = path.join(__dirname, '..', '.zwahili-songs-progress.json');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const BATCH_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 120;
const SONGS_PER_CATEGORY = 5;

const PRIMARY_STYLE = 'Upbeat Gospel Arbantone, energetic Kenyan Arbantone beat, catchy male & female vocals, danceable but inspirational, modern East African gospel vibe, sing the exact lyrics only, no ad-libs, no nonsense syllables, no extra words, short scripture song';
const SECONDARY_STYLE = 'Afro-Gospel, uplifting Afrobeats fusion, energetic percussion, joyful Christian praise vibe, sing the exact lyrics only, no ad-libs, no nonsense syllables, no extra words, short scripture song';

const LANG = 'zw';
const { assertKieAiEnabled } = require('../src/server/services/KieAiGate');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getKieApiKey() {
  return String(process.env.KIE_API_KEY || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function callKieAI(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    try { assertKieAiEnabled(); } catch (error) { reject(error); return; }
    const apiKey = getKieApiKey();
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
  return String(ref || '')
    .toLowerCase()
    .replace(/[:\s]+/g, '-')
    .replace(/[^\w-]/g, '');
}

function parseSwahiliReference(ref) {
  const parts = String(ref || '').match(/^([\dA-Za-zÀ-ÿ\u00C0-\u024F\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) return null;
  return {
    book: parts[1].trim(),
    chapter: parseInt(parts[2], 10),
    startVerse: parseInt(parts[3], 10),
    endVerse: parts[4] ? parseInt(parts[4], 10) : undefined
  };
}

function pickVersesPerCategory(translatedVerses, categories, countPerCategory) {
  const selectedRefs = new Set();
  const picksByCategory = new Map();
  const categorySelectionOrder = [...categories].sort((a, b) => {
    const aCount = translatedVerses.filter(v => v.Category === a).length;
    const bCount = translatedVerses.filter(v => v.Category === b).length;
    return aCount - bCount || a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  for (const category of categorySelectionOrder) {
    const categoryVerses = translatedVerses.filter(v => v.Category === category);
    if (categoryVerses.length === 0) {
      console.log(`  ⚠️  No translated verses found for ${category}`);
      continue;
    }

    const count = Math.min(countPerCategory, categoryVerses.length);
    const preferred = [];

    if (count === 1) {
      preferred.push(categoryVerses[Math.floor(categoryVerses.length / 2)]);
    } else {
      for (let i = 0; i < count; i++) {
        const index = Math.round((i * (categoryVerses.length - 1)) / (count - 1));
        const verse = categoryVerses[index];
        if (!preferred.includes(verse)) {
          preferred.push(verse);
        }
      }
    }

    for (const verse of categoryVerses) {
      if (preferred.length >= categoryVerses.length) break;
      if (!preferred.includes(verse)) {
        preferred.push(verse);
      }
    }

    const uniquePreferred = preferred.filter(verse =>
      !selectedRefs.has(normalizeReference(verse.Reference || verse.EnglishRef || ''))
    );
    const duplicateFallback = preferred.filter(verse =>
      selectedRefs.has(normalizeReference(verse.Reference || verse.EnglishRef || ''))
    );
    const chosen = [...uniquePreferred.slice(0, count)];

    for (const verse of duplicateFallback) {
      if (chosen.length >= count) break;
      if (!chosen.includes(verse)) {
        chosen.push(verse);
      }
    }

    for (const verse of chosen) {
      selectedRefs.add(normalizeReference(verse.Reference || verse.EnglishRef || ''));
    }

    picksByCategory.set(category, chosen);
  }

  return categories
    .filter(category => picksByCategory.has(category))
    .map(category => ({ category, verses: picksByCategory.get(category) }));
}

function buildCategoryStyleMap(categories) {
  const sortedCategories = [...categories].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const styleMap = new Map();

  for (let i = 0; i < sortedCategories.length; i++) {
    styleMap.set(
      sortedCategories[i],
      i % 2 === 0 ? PRIMARY_STYLE : SECONDARY_STYLE
    );
  }

  return styleMap;
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

function upsertProgressSong(progress, songEntry) {
  const songKey = normalizeReference(songEntry.dbRef || songEntry.swahiliRef || songEntry.englishRef || '');
  const existingIndex = progress.songs.findIndex(entry => {
    const entryKey = normalizeReference(entry.dbRef || entry.swahiliRef || entry.englishRef || '');
    return entryKey === songKey;
  });

  if (existingIndex >= 0) {
    progress.songs[existingIndex] = {
      ...progress.songs[existingIndex],
      ...songEntry
    };
    return;
  }

  progress.songs.push(songEntry);
}

function statusFromDbSong(song) {
  if (!song) return 'pending';
  if (song.generationStatus === 'completed' && song.audioUrl) return 'completed';
  if (song.generationStatus === 'processing' && song.generationRequestId) return 'processing';
  if (song.generationStatus === 'failed') return 'failed';
  return song.generationStatus || 'pending';
}

async function rebuildProgressFromDb(targetVerseMap) {
  const verseRefs = [...targetVerseMap.keys()];
  if (verseRefs.length === 0) {
    return { songs: [] };
  }

  const songs = await VerseSong.find(
    {
      language: LANG,
      verseReference: { $in: verseRefs }
    },
    {
      _id: 1,
      verseReference: 1,
      verseReferenceFull: 1,
      verseText: 1,
      category: 1,
      generationStyle: 1,
      generationStatus: 1,
      generationRequestId: 1,
      audioUrl: 1,
      sunoId: 1,
      duration: 1
    }
  ).lean();

  return {
    songs: songs
      .map(song => {
        const target = targetVerseMap.get(song.verseReference);
        if (!target) return null;
        return {
          category: target.category,
          style: song.generationStyle || target.style,
          englishRef: target.englishRef,
          swahiliRef: target.swahiliRef,
          verseText: song.verseText || target.verseText,
          status: statusFromDbSong(song),
          dbId: String(song._id),
          dbRef: song.verseReference,
          taskId: song.generationRequestId || undefined,
          audioUrl: song.audioUrl || undefined,
          sunoId: song.sunoId || undefined,
          duration: song.duration || undefined
        };
      })
      .filter(Boolean)
  };
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
      const stream = fs.createWriteStream(filePath);
      res.pipe(stream);
      stream.on('finish', () => {
        console.log(`  📥 Saved: ${filePath}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function findOrCreateVerseSong(verse, category, style) {
  const swahiliRef = verse.Reference || verse.EnglishRef;
  const dbRef = normalizeReference(swahiliRef);

  let song = await VerseSong.findOne({ verseReference: dbRef, language: LANG });
  if (song) {
    console.log(`  ⏭️  DB entry exists: ${dbRef} (status: ${song.generationStatus})`);
    return song;
  }

  const parsed = parseSwahiliReference(swahiliRef);

  song = new VerseSong({
    verseReference: dbRef,
    verseReferenceFull: `${swahiliRef} (Swahili)`,
    version: 1,
    book: parsed ? parsed.book : String(verse.EnglishRef || '').split(/\d/)[0].trim(),
    chapter: parsed ? parsed.chapter : 0,
    startVerse: parsed ? parsed.startVerse : 0,
    endVerse: parsed ? parsed.endVerse : undefined,
    category,
    verseText: verse.Text,
    generationStyle: style,
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
  const title = `${song.verseReferenceFull || song.verseReference} - ${song.category} (Swahili)`;
  const style = song.generationStyle || PRIMARY_STYLE;

  const body = {
    prompt: lyrics,
    customMode: true,
    instrumental: false,
    model: 'V4_5',
    title,
    style,
    callBackUrl: 'https://httpbin.org/post'
  };

  console.log(`\n🎵 Generating: ${title}`);
  console.log(`   Style: ${style}`);
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
    }

    if (status === 'FAILED') {
      song.generationStatus = 'failed';
      song.generationError = 'Generation failed on kie.ai';
      song.generationAttempts = (song.generationAttempts || 0) + 1;
      await song.save();
      throw new Error(`Generation failed for ${song.verseReference}`);
    }

    process.stdout.write(`  ⏳ [${i + 1}/${MAX_POLLS}] ${status}...\r`);
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
  const refreshProgressOnly = args.includes('--refresh-progress-only');
  const onlyRefArg = args.find(arg => arg.startsWith('--only-ref='));
  const onlyRef = onlyRefArg ? normalizeReference(onlyRefArg.split('=').slice(1).join('=')) : null;

  if (!process.env.KIE_API_KEY) {
    console.error('Error: KIE_API_KEY environment variable required');
    console.error('Usage: KIE_API_KEY=your_key node scripts/generate-zwahili-songs.js [--dry-run] [--poll]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const translatedVerses = loadSelectedVersesZW();
  if (!Array.isArray(translatedVerses) || translatedVerses.length === 0) {
    console.error('Error: No Swahili translated verses loaded from bible-verses-zw.js');
    process.exit(1);
  }

  console.log(`Total translated verses available: ${translatedVerses.length}`);
  const availableCategories = [...new Set(translatedVerses.map(v => v.Category))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const categoryStyleMap = buildCategoryStyleMap(availableCategories);

  console.log(`Categories available: ${availableCategories.join(', ')}\n`);

  const picks = pickVersesPerCategory(translatedVerses, availableCategories, SONGS_PER_CATEGORY);
  if (picks.length === 0) {
    console.error('No verses available to generate songs for.');
    process.exit(1);
  }

  const filteredPicks = onlyRef
    ? picks
        .map(({ category, verses }) => ({
          category,
          verses: verses.filter(verse =>
            normalizeReference(verse.Reference || verse.EnglishRef || '') === onlyRef
          )
        }))
        .filter(entry => entry.verses.length > 0)
    : picks;

  if (onlyRef && filteredPicks.length === 0) {
    console.error(`No Swahili target verse matched --only-ref=${onlyRef}`);
    process.exit(1);
  }

  const targetVerseMap = new Map();
  for (const { category, verses } of filteredPicks) {
    const categoryStyle = categoryStyleMap.get(category) || PRIMARY_STYLE;
    for (const verse of verses) {
      const verseKey = normalizeReference(verse.Reference || verse.EnglishRef || '');
      targetVerseMap.set(verseKey, {
        category,
        style: categoryStyle,
        englishRef: verse.EnglishRef,
        swahiliRef: verse.Reference,
        verseText: verse.Text
      });
    }
  }

  console.log(`Selected verses (${SONGS_PER_CATEGORY} per category):\n`);
  for (const { category, verses } of filteredPicks) {
    console.log(`  ${category}:`);
    console.log(`    Style: ${categoryStyleMap.get(category)}`);
    for (const verse of verses) {
      console.log(`    ${verse.EnglishRef} → ${verse.Reference}`);
      console.log(`      "${verse.Text.slice(0, 80)}..."`);
    }
  }

  let progress = loadProgress();
  progress = await rebuildProgressFromDb(targetVerseMap);
  saveProgress(progress);
  const processedRefs = new Set(
    progress.songs
      .filter(s => s.status !== 'failed')
      .map(s => normalizeReference(s.dbRef || s.swahiliRef || s.englishRef || ''))
      .filter(Boolean)
  );

  if (refreshProgressOnly) {
    const counts = progress.songs.reduce((acc, song) => {
      const key = song.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log('\n--refresh-progress-only: Rebuilt progress from Swahili DB rows only.');
    console.log(`Tracked songs: ${progress.songs.length}`);
    console.log(`Status counts: ${JSON.stringify(counts)}`);
    console.log(`Progress: ${PROGRESS_FILE}`);
    await mongoose.disconnect();
    return;
  }

  if (dryRun) {
    console.log('\n--dry-run: Would create VerseSong entries and generate via kie.ai.');
    const estimatedSongs = filteredPicks.reduce((total, entry) => total + entry.verses.length, 0);
    console.log(`Estimated cost: ${estimatedSongs} songs × $0.06 = $${(estimatedSongs * 0.06).toFixed(2)}`);
    await mongoose.disconnect();
    return;
  }

  for (const { category, verses } of filteredPicks) {
    console.log(`\n🎼 ${category}`);
    const categoryStyle = categoryStyleMap.get(category) || PRIMARY_STYLE;

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      const songEntry = {
        category,
        style: categoryStyle,
        englishRef: verse.EnglishRef,
        swahiliRef: verse.Reference,
        verseText: verse.Text,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const verseKey = normalizeReference(verse.Reference || verse.EnglishRef || '');
      if (processedRefs.has(verseKey) && !shouldPoll) {
        console.log(`  ⏭️  Skipping ${verse.Reference} - already processed`);
        continue;
      }

      try {
        const song = await findOrCreateVerseSong(verse, category, categoryStyle);
        songEntry.dbId = song._id.toString();
        songEntry.dbRef = song.verseReference;

        if (song.generationStatus === 'completed' && song.audioUrl) {
          console.log(`  ✅ Already completed: ${song.verseReference}`);
          songEntry.status = 'completed';
          songEntry.audioUrl = song.audioUrl;
          songEntry.taskId = song.generationRequestId;
          upsertProgressSong(progress, songEntry);
          saveProgress(progress);
          processedRefs.add(verseKey);
          continue;
        }

        if (song.generationStatus === 'processing' && song.generationRequestId && !shouldPoll) {
          console.log(`  ⏳ Already processing: taskId=${song.generationRequestId}`);
          songEntry.status = 'processing';
          songEntry.taskId = song.generationRequestId;
          upsertProgressSong(progress, songEntry);
          saveProgress(progress);
          processedRefs.add(verseKey);
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

        upsertProgressSong(progress, songEntry);
        saveProgress(progress);
        processedRefs.add(verseKey);
      } catch (err) {
        console.error(`  ❌ Failed: ${err.message}`);
        songEntry.status = 'failed';
        songEntry.error = err.message;
        upsertProgressSong(progress, songEntry);
        saveProgress(progress);
        processedRefs.add(verseKey);
      }

      const isLastCategory = category === filteredPicks[filteredPicks.length - 1]?.category;
      const isLastVerseInCategory = i === verses.length - 1;
      if (!(isLastCategory && isLastVerseInCategory)) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  console.log('\n=== Summary ===');
  for (const song of progress.songs) {
    const icon = song.status === 'completed' ? '✅' : song.status === 'failed' ? '❌' : '⏳';
    console.log(`  ${icon} ${song.category}: ${song.englishRef} → ${song.swahiliRef}`);
    console.log(`     DB: ${song.dbRef || 'N/A'} [${song.status}]`);
    if (song.audioUrl) console.log(`     Audio: ${song.audioUrl}`);
    if (song.taskId) console.log(`     Task: ${song.taskId}`);
  }

  if (!shouldPoll) {
    const processing = progress.songs.filter(s => s.status === 'processing' || s.status === 'pending');
    if (processing.length > 0) {
      console.log('\nSongs submitted to kie.ai. To poll for completion + download + update DB:');
      console.log('  KIE_API_KEY=... node scripts/generate-zwahili-songs.js --poll\n');
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
