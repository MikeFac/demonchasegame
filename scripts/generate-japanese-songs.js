/**
 * Generate Japanese verse songs for 2 verses per category using Suno via kie.ai API.
 *
 * Creates VerseSong MongoDB entries ready for a Japanese game version.
 *
 * Style:
 * Category-specific Japanese prompts using J-pop, anime pop-rock, city pop,
 * singer-songwriter ballad, electro-pop, and worship-adjacent variants.
 *
 * Usage: KIE_API_KEY=your_key node scripts/generate-japanese-songs.js
 *
 * Options:
 *   --dry-run    Show what would be generated without calling the API
 *   --poll       Also poll for completion and download audio
 *   --refresh-progress-only   Rebuild the local progress file from Japanese DB rows only
 *   --only-ref=<db-ref>   Restrict the run to a single normalized verse reference
 *   --force-new-version   Create a fresh version even if a completed Japanese song already exists
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
const { loadSelectedVersesJA } = require('../bible-verses-deepseek-v4-pro.ja-kana.js');

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const PROGRESS_FILE = path.join(__dirname, '..', '.japanese-songs-progress.json');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const BATCH_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 120;
const SONGS_PER_CATEGORY = 2;
const LANG = 'ja';

function withJapaneseLyricRules(style) {
  return [
    style,
    'Japanese scripture song',
    'vocals start immediately on the first beat',
    'sing clear intelligible Japanese words throughout',
    'sing the exact supplied lyrics only',
    'no humming',
    'no vocalizing',
    'no instrumental intro',
    'no long instrumental break',
    'no spoken words',
    'no ad-libs',
    'no nonsense syllables',
    'no extra words',
    'short scripture song'
  ].join(', ');
}

const PRIMARY_STYLE = withJapaneseLyricRules(
  'uplifting J-pop worship, bright melodic hook, polished modern production, warm synths, clean drums, hopeful chorus, church-friendly and memorable'
);
const { assertKieAiEnabled } = require('../src/server/services/KieAiGate');

const CATEGORY_STYLE_PROMPTS = {
  Courage: withJapaneseLyricRules(
    'anime opening style pop rock, energetic J-rock guitars, bold chorus, determined youthful lead vocal, strong forward momentum'
  ),
  Deliverance: withJapaneseLyricRules(
    'Japanese pop-rap worship, rhythmic verse delivery, punchy beat, melodic chorus, victorious and liberating energy'
  ),
  Endurance: withJapaneseLyricRules(
    'acoustic J-rock worship, steady drums, driving guitars, resilient build, persevering and encouraging mood'
  ),
  Faith: withJapaneseLyricRules(
    'uplifting J-pop worship, bright melodic chorus, polished synth-pop production, warm bass, trustworthy and hopeful tone'
  ),
  Focus: withJapaneseLyricRules(
    'minimal lo-fi Japanese piano pop, light beat, calm atmosphere, meditative focus, intimate and steady'
  ),
  Forgiveness: withJapaneseLyricRules(
    'modern Japanese singer-songwriter ballad, gentle piano and guitar, compassionate vocal tone, restorative emotional warmth'
  ),
  'Good News': withJapaneseLyricRules(
    'bright J-pop worship, catchy chorus, accessible melodic writing, welcoming and uplifting feel'
  ),
  Healing: withJapaneseLyricRules(
    'gentle Japanese worship ballad, soft piano, warm pads, tender lead vocal, soothing and restorative'
  ),
  Hope: withJapaneseLyricRules(
    'cinematic anime ending ballad, uplifting emotional lift, shimmering piano and strings, hopeful expansive chorus'
  ),
  Humility: withJapaneseLyricRules(
    'acoustic Japanese folk singer-songwriter, understated arrangement, sincere vocal, grounded and humble tone'
  ),
  Identity: withJapaneseLyricRules(
    'dreamy city pop ballad, warm electric piano, smooth bass, reflective and emotionally searching atmosphere'
  ),
  Joy: withJapaneseLyricRules(
    'upbeat city pop worship, bright groove, playful bassline, sparkling keys, celebratory and danceable'
  ),
  Knowledge: withJapaneseLyricRules(
    'atmospheric Japanese art pop, reflective piano and ambient layers, thoughtful vocal tone, wise and contemplative mood'
  ),
  Love: withJapaneseLyricRules(
    'warm J-pop ballad, heartfelt melody, clean contemporary arrangement, affectionate and inviting tone'
  ),
  Power: withJapaneseLyricRules(
    'anime opening symphonic rock, big drums, soaring strings, heroic chorus, intense and cinematic energy'
  ),
  Praise: withJapaneseLyricRules(
    'festival-style J-pop worship, bright claps and drums, major-key chorus, joyful communal celebration'
  ),
  Prayer: withJapaneseLyricRules(
    'intimate piano-led singer-songwriter devotional, sparse arrangement, reverent tone, prayerful and direct'
  ),
  Prophecy: withJapaneseLyricRules(
    'electro-pop inspired by Vocaloid production, futuristic synth textures, dramatic lift, visionary and mysterious feel'
  ),
  Prosperity: withJapaneseLyricRules(
    'polished city pop, optimistic groove, glossy keys and bass, confident but tasteful uplift'
  ),
  Purity: withJapaneseLyricRules(
    'airy ambient piano pop, light textures, clean vocal tone, serene and uncluttered atmosphere'
  ),
  Wisdom: withJapaneseLyricRules(
    'acoustic Japanese singer-songwriter reflection, tasteful piano and guitar, calm mature vocal, thoughtful and timeless mood'
  )
};

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
        Authorization: `Bearer ${apiKey}`,
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

function getDbReferenceSource(verse) {
  return verse.EnglishRef || verse.Reference || '';
}

function getDisplayReference(verse) {
  return verse.Reference || verse.EnglishRef || getDbReferenceSource(verse);
}

function parseLocalizedReference(ref) {
  const parts = String(ref || '').match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
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
      console.log(`  No translated verses found for ${category}`);
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
      !selectedRefs.has(normalizeReference(getDbReferenceSource(verse)))
    );
    const duplicateFallback = preferred.filter(verse =>
      selectedRefs.has(normalizeReference(getDbReferenceSource(verse)))
    );
    const chosen = [...uniquePreferred.slice(0, count)];

    for (const verse of duplicateFallback) {
      if (chosen.length >= count) break;
      if (!chosen.includes(verse)) {
        chosen.push(verse);
      }
    }

    for (const verse of chosen) {
      selectedRefs.add(normalizeReference(getDbReferenceSource(verse)));
    }

    picksByCategory.set(category, chosen);
  }

  return categories
    .filter(category => picksByCategory.has(category))
    .map(category => ({ category, verses: picksByCategory.get(category) }));
}

function buildCategoryStyleMap(categories) {
  const styleMap = new Map();
  for (const category of categories) {
    styleMap.set(category, CATEGORY_STYLE_PROMPTS[category] || PRIMARY_STYLE);
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
  const songKey = normalizeReference(songEntry.dbRef || songEntry.japaneseRef || songEntry.englishRef || '');
  const existingIndex = progress.songs.findIndex(entry => {
    const entryKey = normalizeReference(entry.dbRef || entry.japaneseRef || entry.englishRef || '');
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
          japaneseRef: target.japaneseRef,
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
        console.log(`  Saved: ${filePath}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function findOrCreateVerseSong(verse, category, style, options = {}) {
  const { forceNewVersion = false } = options;
  const displayRef = getDisplayReference(verse);
  const dbRefSource = getDbReferenceSource(verse);
  const dbRef = normalizeReference(dbRefSource);

  let song = await VerseSong.findOne({ verseReference: dbRef, language: LANG }).sort({ version: -1 });
  if (song && !forceNewVersion) {
    console.log(`  DB entry exists: ${dbRef} (status: ${song.generationStatus})`);
    return song;
  }

  const parsed = parseLocalizedReference(displayRef);
  const nextVersion = (song?.version || 0) + 1;

  song = new VerseSong({
    verseReference: dbRef,
    verseReferenceFull: `${displayRef} (Japanese)`,
    version: nextVersion,
    book: parsed ? parsed.book : String(displayRef || '').split(/\d/)[0].trim(),
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
  console.log(`  Created DB entry: ${dbRef} v${nextVersion}`);
  return song;
}

async function generateSong(song) {
  const lyrics = buildLyrics(song.verseText, 4);
  const title = `${song.verseReferenceFull || song.verseReference} - ${song.category} (Japanese)`;
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

  console.log(`\nGenerating: ${title}`);
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

  console.log(`  Queued: taskId=${taskId}`);
  return taskId;
}

async function pollForCompletion(song) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const response = await callKieAI('GET', `/generate/record-info?taskId=${song.generationRequestId}`);
    if (response.code !== 200) {
      console.log(`  Poll error: ${response.code}`);
      continue;
    }

    const { status } = response.data || {};
    const sunoData = response.data?.response?.sunoData?.[0];

    if (status === 'SUCCESS' && sunoData?.audioUrl) {
      console.log(`  Complete: ${song.verseReference}`);

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

    if (status === 'FAILED' || status === 'SENSITIVE_WORD_ERROR' || status === 'REVIEWING') {
      const errorDetail = response.data?.response?.sunoData?.[0]?.reason || status;
      song.generationStatus = 'failed';
      song.generationError = `kie.ai status: ${errorDetail}`;
      song.generationAttempts = (song.generationAttempts || 0) + 1;
      await song.save();
      throw new Error(`Generation ${status.toLowerCase()} for ${song.verseReference}: ${errorDetail}`);
    }

    process.stdout.write(`  [${i + 1}/${MAX_POLLS}] ${status}...\r`);
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
  const forceNewVersion = args.includes('--force-new-version');
  const onlyRefArg = args.find(arg => arg.startsWith('--only-ref='));
  const onlyRef = onlyRefArg ? normalizeReference(onlyRefArg.split('=').slice(1).join('=')) : null;

  if (!dryRun && !process.env.KIE_API_KEY) {
    console.error('Error: KIE_API_KEY environment variable required');
    console.error('Usage: KIE_API_KEY=your_key node scripts/generate-japanese-songs.js [--dry-run] [--poll]');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const translatedVerses = loadSelectedVersesJA();
  if (!Array.isArray(translatedVerses) || translatedVerses.length === 0) {
    console.error('Error: No Japanese translated verses loaded from bible-verses-deepseek-v4-pro.ja-kana.js');
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
            normalizeReference(getDbReferenceSource(verse)) === onlyRef
          )
        }))
        .filter(entry => entry.verses.length > 0)
    : picks;

  if (onlyRef && filteredPicks.length === 0) {
    console.error(`No Japanese target verse matched --only-ref=${onlyRef}`);
    process.exit(1);
  }

  const targetVerseMap = new Map();
  for (const { category, verses } of filteredPicks) {
    const categoryStyle = categoryStyleMap.get(category) || PRIMARY_STYLE;
    for (const verse of verses) {
      const verseKey = normalizeReference(getDbReferenceSource(verse));
      targetVerseMap.set(verseKey, {
        category,
        style: categoryStyle,
        englishRef: verse.EnglishRef,
        japaneseRef: getDisplayReference(verse),
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
      .filter(s => s.status === 'completed' || s.status === 'processing')
      .map(s => normalizeReference(s.dbRef || s.japaneseRef || s.englishRef || ''))
      .filter(Boolean)
  );

  if (refreshProgressOnly) {
    const counts = progress.songs.reduce((acc, song) => {
      const key = song.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log('\n--refresh-progress-only: Rebuilt progress from Japanese DB rows only.');
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
    console.log(`\n${category}`);
    const categoryStyle = categoryStyleMap.get(category) || PRIMARY_STYLE;

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      const songEntry = {
        category,
        style: categoryStyle,
        englishRef: verse.EnglishRef,
        japaneseRef: getDisplayReference(verse),
        verseText: verse.Text,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const verseKey = normalizeReference(getDbReferenceSource(verse));
      if (processedRefs.has(verseKey) && !shouldPoll && !forceNewVersion) {
        console.log(`  Skipping ${verse.Reference} - already processed`);
        continue;
      }

      try {
        const song = await findOrCreateVerseSong(verse, category, categoryStyle, { forceNewVersion });
        songEntry.dbId = song._id.toString();
        songEntry.dbRef = song.verseReference;
        songEntry.version = song.version;

        if (song.generationStatus === 'completed' && song.audioUrl && !forceNewVersion) {
          console.log(`  Already completed: ${song.verseReference}`);
          songEntry.status = 'completed';
          songEntry.audioUrl = song.audioUrl;
          songEntry.taskId = song.generationRequestId;
          upsertProgressSong(progress, songEntry);
          saveProgress(progress);
          processedRefs.add(verseKey);
          continue;
        }

        if (song.generationStatus === 'processing' && song.generationRequestId && !shouldPoll && !forceNewVersion) {
          console.log(`  Already processing: taskId=${song.generationRequestId}`);
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
          } catch (pollErr) {
            console.error(`  Poll failed: ${pollErr.message}`);
            songEntry.status = 'failed';
            songEntry.error = pollErr.message;
          }
        }

        processedRefs.add(verseKey);
      } catch (err) {
        console.error(`  Failed for ${verse.Reference}: ${err.message}`);
        songEntry.status = 'failed';
        songEntry.error = err.message;
      }

      upsertProgressSong(progress, songEntry);
      saveProgress(progress);

      if (!shouldPoll && i < verses.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  console.log('\nDone!');
  console.log(`Progress saved to: ${PROGRESS_FILE}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\nFatal error:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors on fatal exit
  }
  process.exit(1);
});
