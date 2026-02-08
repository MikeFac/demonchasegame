# Verse-to-Song Learning System for dcgame

## Executive Summary

Create an **educational music system** where dcgame players learn Scripture verses by listening to songs with exact verse text. Each verse category gets its own musical style to enhance memorization through varied sonic experiences.

**Goals**:
- Enhance Scripture memorization through music immersion
- Store educational songs (exact text) separately from creative raymasongs
- Start with top 5 verses per category (50-75 verses total)
- Auto-generate missing verses on-demand (non-blocking)
- Track learning effectiveness (playCount vs learnCount)

---

## 1. Data Models

### 1.1 VerseSong Schema

**File**: `src/server/models/VerseSong.js`

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VerseSongSchema = new Schema({
  // Verse Identifier (Primary Key)
  verseReference: {
    type: String,
    required: true,
    unique: true,
    index: true
    // e.g. "John 3:16"
  },

  book: String,           // "John"
  chapter: Number,        // 3
  startVerse: Number,     // 16
  endVerse: Number,       // Optional, for ranges
  category: String,       // From bible-verses.js (e.g., "Love", "Courage")
  verseText: String,      // Full verse text (for generation prompt)

  // Song Generation & Storage
  sunoId: {
    type: String,
    index: true
    // Suno API ID for this generated song
  },
  audioUrl: String,       // e.g. "/content/audio/john-3-16.mp3"
  audioPath: String,      // Local file path on server
  duration: Number,       // Seconds

  // Generation Metadata
  generationStyle: String,  // "pop", "rock", "acoustic", etc.
  generationPrompt: String, // Exact lyrics sent to Suno
  generationRequestId: {
    type: String,
    index: true
    // For polling Suno status
  },
  generationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  generationAttempts: {
    type: Number,
    default: 0
  },
  generationError: String,
  generatedAt: Date,

  // Usage & Learning Analytics
  playCount: {
    type: Number,
    default: 0
  },
  learnCount: {
    type: Number,
    default: 0
    // Times player answered quiz correctly while/after hearing song
  },
  averageRetention: {
    type: Number,
    default: 0
    // 0-1 estimate: learnCount / (playCount || 1)
  },
  lastPlayedAt: Date,

  // Status & Quality
  status: {
    type: String,
    enum: ['active', 'archived', 'failed_generation'],
    default: 'active',
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
VerseSongSchema.index({ generationStatus: 1, generationRequestId: 1 });
VerseSongSchema.index({ playCount: -1 });
VerseSongSchema.index({ category: 1 });

module.exports = mongoose.model('VerseSong', VerseSongSchema);
```

### 1.2 CategoryStyle Schema

**File**: `src/server/models/CategoryStyle.js`

Maps verse categories to musical styles. Stored in MongoDB so it's editable without code changes.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategoryStyleSchema = new Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    index: true
    // e.g. "Love", "Courage", "Joy", "Wisdom", "Knowledge", "Faith", etc.
  },

  // Suno Style Descriptor
  // Recommendations: https://platform.suno.ai/docs/styles
  generationStyle: {
    type: String,
    required: true
    // e.g. "pop", "rock", "acoustic", "disco", "celtic", "yacht rock"
  },

  // Human-readable description
  description: String,
  // e.g. "Fast-paced disco with strings—designed to evoke joy"

  // Override defaults
  generationDuration: {
    type: Number,
    default: 120
    // Seconds
  },
  repeatCount: {
    type: Number,
    default: 3
    // How many times to repeat the verse text
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CategoryStyle', CategoryStyleSchema);
```

---

## 2. Category-to-Style Mapping

**Actual Categories from bible-verses.js** (22 total):

| # | Category | Verses | Style | Description | Vibe |
|---|----------|--------|-------|-------------|------|
| 1 | **Wisdom** | 187 | acoustic | Fingerpicking, minimal arrangement | Introspective, timeless, deep |
| 2 | **Purity** | 102 | ambient | Atmospheric pads, minimal rhythm | Clean, clear, transcendent |
| 3 | **Faith** | 101 | yacht rock + aor | Smooth vocals, polished production | Trustworthy, polished, uplifting |
| 4 | **Love** | 99 | pop | Melodic hooks, relatable lyrics | Warm, accessible, sing-along |
| 5 | **Knowledge** | 99 | celtic | Flutes, strings, folk elements | Mystical, scholarly, flowing |
| 6 | **Joy** | 99 | disco | Upbeat strings, bass, horn sections | Party, celebratory, energetic |
| 7 | **Praise** | 98 | gospel | Spiritual vocals, call-and-response | Celebratory, communal, uplifting |
| 8 | **Humility** | 98 | folk | Storytelling, acoustic guitar | Humble, grounded, connected |
| 9 | **Healing** | 98 | soul | Soulful vocals, warmth, groove | Compassionate, warm, restorative |
| 10 | **Hope** | 97 | uplifting pop | Bright synths, major keys, building | Optimistic, forward-moving, bright |
| 11 | **Endurance** | 96 | rock | Guitar-driven, powerful drums | Bold, determined, powerful |
| 12 | **Forgiveness** | 94 | r&b | Smooth grooves, soulful | Compassionate, understanding, healing |
| 13 | **Prosperity** | 84 | jazz | Smooth horns, complex rhythms | Rich, sophisticated, flowing |
| 14 | **Focus** | 84 | lo-fi | Chill beats, atmospheric | Steady, meditative, concentrating |
| 15 | **Identity** | 72 | indie rock | Honest vocals, introspective | Authentic, direct, self-aware |
| 16 | **Prophecy** | 45 | electronic | Synths, future-forward soundscape | Visionary, transcendent, mysterious |
| 17 | **Deliverance** | 21 | hip-hop | Strong beat, rhythmic spoken word | Powerful, liberating, confident |
| 18 | **Power** | 20 | metal | Heavy guitars, intense drums | Fierce, unstoppable, commanding |
| 19 | **Good News** | 19 | pop rock | Energetic, uplifting, hooky | Exciting, spreading, energetic |
| 20 | **Courage** | 15 | rock | Guitar-driven, powerful drums | Bold, fearless, defiant |
| 21 | **Intercession** | 3 | worship | Reverent, spacious, meditative | Prayerful, spiritual, intimate |
| 22 | **ShareGospel** | 1 | contemporary pop | Modern, catchy, relatable | Accessible, inviting, engaging |

**Rationale**:
- Each style activates different emotional/cognitive pathways → better memorization
- Disco's repetitive bass = Joy sticks in your head
- Yacht rock's polish = Faith feels trustworthy
- Acoustic's intimacy = Wisdom feels reflective
- Celtic's storytelling = Knowledge feels deep
- Soul's warmth = Healing feels restorative
- Rock's power = Courage & Endurance feel determined

---

## 3. Server-Side Implementation

### 3.1 Initialize Category Styles (Script)

**File**: `scripts/seed-category-styles.js`

```javascript
const mongoose = require('mongoose');
const CategoryStyle = require('../src/server/models/CategoryStyle');

const styles = [
  {
    category: 'Joy',
    generationStyle: 'disco',
    description: 'Upbeat disco with strings—evokes celebration and happiness',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Love',
    generationStyle: 'pop',
    description: 'Melodic pop with relatable hooks—warm and accessible',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Courage',
    generationStyle: 'rock',
    description: 'Guitar-driven rock with powerful drums—bold and energizing',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Wisdom',
    generationStyle: 'acoustic',
    description: 'Fingerpicking acoustic—introspective and timeless',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Knowledge',
    generationStyle: 'celtic',
    description: 'Celtic flutes and strings—mystical and flowing',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Faith',
    generationStyle: 'yacht rock + aor',
    description: 'Smooth yacht rock with polished production—uplifting and trustworthy',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Forgiveness',
    generationStyle: 'soul',
    description: 'Soulful vocals with warmth—healing and compassionate',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Peace',
    generationStyle: 'ambient',
    description: 'Atmospheric pads with minimal rhythm—calming and meditative',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Hope',
    generationStyle: 'uplifting pop',
    description: 'Bright synths in major keys—optimistic and forward-moving',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Strength',
    generationStyle: 'metal',
    description: 'Heavy guitars and intense drums—powerful and determined',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Compassion',
    generationStyle: 'folk',
    description: 'Storytelling folk with acoustic guitar—humane and gentle',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Gratitude',
    generationStyle: 'reggae',
    description: 'Laid-back reggae groove—thankful and warm',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Humility',
    generationStyle: 'gospel',
    description: 'Spiritual gospel vocals—humble and communal',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Patience',
    generationStyle: 'lo-fi',
    description: 'Chill lo-fi beats—steady and meditative',
    generationDuration: 120,
    repeatCount: 3
  },
  {
    category: 'Truth',
    generationStyle: 'indie rock',
    description: 'Honest indie rock—authentic and thoughtful',
    generationDuration: 120,
    repeatCount: 3
  }
];

async function seedStyles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const style of styles) {
      await CategoryStyle.updateOne(
        { category: style.category },
        style,
        { upsert: true }
      );
    }

    console.log('✅ Category styles seeded');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
}

seedStyles();
```

**Run**:
```bash
node scripts/seed-category-styles.js
```

### 3.2 API Endpoint: Get Song for Verse

**File**: `src/server/routes/verseSong.js`

```javascript
const express = require('express');
const router = express.Router();
const VerseSong = require('../models/VerseSong');
const CategoryStyle = require('../models/CategoryStyle');
const { generateVerseSong } = require('../services/SunoService');

/**
 * GET /api/verse-song?ref=John+3:16
 *
 * Returns song for a verse, or triggers generation if missing.
 * Does NOT block on generation—returns immediately with status.
 */
router.get('/', async (req, res) => {
  try {
    const { ref } = req.query;

    if (!ref) {
      return res.status(400).json({ error: 'Missing ref parameter' });
    }

    // Try to find existing verse song
    let verseSong = await VerseSong.findOne({ verseReference: ref });

    if (verseSong && verseSong.status === 'active' && verseSong.audioUrl) {
      // Found a completed song—return it
      return res.json({
        verseReference: ref,
        audioUrl: verseSong.audioUrl,
        status: 'ready',
        playCount: verseSong.playCount,
        learnCount: verseSong.learnCount
      });
    }

    if (verseSong && verseSong.generationStatus === 'processing') {
      // Still generating—tell client to use fallback music
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Song is being generated. Using fallback music.'
      });
    }

    if (verseSong && verseSong.generationStatus === 'failed') {
      // Previous generation failed—queue retry
      verseSong.generationStatus = 'pending';
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();
      return res.json({
        verseReference: ref,
        status: 'pending_generation',
        message: 'Retrying generation. Using fallback music.'
      });
    }

    // No record exists—create one and queue generation
    if (!verseSong) {
      verseSong = await createAndQueueVerseSong(ref);
    }

    res.json({
      verseReference: ref,
      status: 'pending_generation',
      message: 'Song queued for generation. Using fallback music.',
      generationStatus: verseSong.generationStatus
    });
  } catch (err) {
    console.error('Error in /api/verse-song:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper: Create VerseSong record and queue generation
 */
async function createAndQueueVerseSong(verseReference) {
  // Parse reference (e.g., "John 3:16" → book: "John", chapter: 3, startVerse: 16)
  const parts = verseReference.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) {
    throw new Error(`Invalid verse reference format: ${verseReference}`);
  }

  const book = parts[1].trim();
  const chapter = parseInt(parts[2], 10);
  const startVerse = parseInt(parts[3], 10);
  const endVerse = parts[4] ? parseInt(parts[4], 10) : undefined;

  // Get verse text from bible-verses.js (loaded in server)
  const globalVerses = require('../../bible-verses');
  const verseObj = globalVerses.find(v => v.Reference === verseReference);
  const verseText = verseObj?.Text || `[Verse: ${verseReference}]`;
  const category = verseObj?.Category || 'General';

  // Get generation style for this category
  const categoryStyle = await CategoryStyle.findOne({ category });
  const style = categoryStyle?.generationStyle || 'pop';

  // Create verse song record
  const verseSong = new VerseSong({
    verseReference,
    book,
    chapter,
    startVerse,
    endVerse,
    category,
    verseText,
    generationStyle: style,
    generationStatus: 'pending',
    generationAttempts: 0
  });

  await verseSong.save();

  // Queue generation (asynchronous, non-blocking)
  setImmediate(() => {
    generateVerseSong(verseSong._id).catch(err => {
      console.error(`Error generating song for ${verseReference}:`, err);
    });
  });

  return verseSong;
}

/**
 * POST /api/verse-song/record-play
 *
 * Track when a verse song is played and whether player learned the verse.
 */
router.post('/record-play', async (req, res) => {
  try {
    const { verseReference, playDurationMs, wasLearned } = req.body;

    if (!verseReference) {
      return res.status(400).json({ error: 'Missing verseReference' });
    }

    const verseSong = await VerseSong.findOne({ verseReference });
    if (!verseSong) {
      return res.status(404).json({ error: 'Verse song not found' });
    }

    // Increment counters
    verseSong.playCount = (verseSong.playCount || 0) + 1;
    if (wasLearned) {
      verseSong.learnCount = (verseSong.learnCount || 0) + 1;
    }

    // Update retention estimate (rolling average)
    const totalPlays = verseSong.playCount;
    const prevRetention = verseSong.averageRetention || 0;
    verseSong.averageRetention =
      (prevRetention * (totalPlays - 1) + (wasLearned ? 1 : 0)) / totalPlays;

    verseSong.lastPlayedAt = new Date();
    await verseSong.save();

    res.json({
      verseReference,
      playCount: verseSong.playCount,
      learnCount: verseSong.learnCount,
      averageRetention: verseSong.averageRetention
    });
  } catch (err) {
    console.error('Error recording play:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 3.3 Suno Service: Generate & Poll

**File**: `src/server/services/SunoService.js`

```javascript
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
        }
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
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
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
    const response = await axios.get(audioUrl, { responseType: 'stream' });

    // Create directory structure: /content/audio/[book]/
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
```

### 3.4 Cron Job: Cleanup Failed Generations & Retry

**File**: `src/server/jobs/retryFailedGenerations.js`

```javascript
const VerseSong = require('../models/VerseSong');
const { generateVerseSong } = require('../services/SunoService');

/**
 * Retry failed generation attempts (max 3 per verse)
 * Run every 30 minutes
 */
async function retryFailedGenerations() {
  try {
    const failed = await VerseSong.find({
      generationStatus: 'failed',
      generationAttempts: { $lt: 3 }
    }).limit(10);

    console.log(`🔄 Retrying ${failed.length} failed generations...`);

    for (const verseSong of failed) {
      verseSong.generationStatus = 'pending';
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();

      // Queue generation
      setImmediate(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Retry error for ${verseSong.verseReference}:`, err);
        });
      });
    }
  } catch (err) {
    console.error('Error in retryFailedGenerations:', err);
  }
}

module.exports = { retryFailedGenerations };
```

**Register in server.js**:
```javascript
const { retryFailedGenerations } = require('./src/server/jobs/retryFailedGenerations');

// Retry failed generations every 30 minutes
setInterval(retryFailedGenerations, 30 * 60 * 1000);
```

### 3.5 Bulk Seeding Script: Top 5 Verses per Category

**File**: `scripts/seed-top-verses.js`

```javascript
const mongoose = require('mongoose');
const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');

/**
 * Seed top 5 verses from each category (from bible-verses.js)
 * This creates ~75 VerseSong records and queues generation.
 */
async function seedTopVerses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const globalVerses = require('../bible-verses');

    // Group verses by category
    const byCategory = {};
    for (const verse of globalVerses) {
      if (!byCategory[verse.Category]) {
        byCategory[verse.Category] = [];
      }
      byCategory[verse.Category].push(verse);
    }

    console.log(`Found ${Object.keys(byCategory).length} categories`);

    let totalCreated = 0;

    for (const [category, verses] of Object.entries(byCategory)) {
      // Take first 5 verses from this category
      const topVerses = verses.slice(0, 5);

      for (const verse of topVerses) {
        // Check if already exists
        const existing = await VerseSong.findOne({ verseReference: verse.Reference });
        if (existing) {
          console.log(`⏭️  Skipping ${verse.Reference} (already exists)`);
          continue;
        }

        // Get category style
        const categoryStyle = await CategoryStyle.findOne({ category });
        const style = categoryStyle?.generationStyle || 'pop';

        // Create verse song
        const verseSong = new VerseSong({
          verseReference: verse.Reference,
          book: verse.Reference.split(' ')[0],
          chapter: parseInt(verse.Reference.split(' ')[1].split(':')[0], 10),
          startVerse: parseInt(verse.Reference.split(':')[1], 10),
          category: verse.Category,
          verseText: verse.Text,
          generationStyle: style,
          generationStatus: 'pending',
          generationAttempts: 0
        });

        await verseSong.save();
        totalCreated++;
        console.log(`✨ Created: ${verse.Reference} (${category} → ${style})`);
      }
    }

    console.log(`\n✅ Seeded ${totalCreated} verses. Now queue generation...`);

    // Queue all pending verses for generation
    const pending = await VerseSong.find({ generationStatus: 'pending' });
    const { generateVerseSong } = require('../src/server/services/SunoService');

    for (const verseSong of pending) {
      setImmediate(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Error generating ${verseSong.verseReference}:`, err);
        });
      });
    }

    console.log(`🚀 Queued ${pending.length} verses for generation`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
}

seedTopVerses();
```

**Run**:
```bash
node scripts/seed-top-verses.js
```

---

## 4. Client-Side Integration

### 4.1 VerseSongService (new)

**File**: `dcgame/src/client/VerseSongService.js`

```javascript
/**
 * VerseSongService - Fetches and tracks educational verse songs
 * Non-blocking: queries server but plays fallback music while generating
 */
(function() {
  class VerseSongService {
    constructor() {
      this.cache = {}; // Session cache
      this.currentVerse = null;
    }

    /**
     * Get song for a verse reference
     * Returns null immediately if not ready; queues generation in background
     */
    async getSongForVerse(verseReference) {
      // Check session cache first
      if (this.cache[verseReference]) {
        return this.cache[verseReference];
      }

      try {
        const response = await fetch(
          `/api/verse-song?ref=${encodeURIComponent(verseReference)}`
        );

        if (!response.ok) {
          console.warn(`Error fetching song for ${verseReference}:`, response.status);
          return null;
        }

        const data = await response.json();

        // Cache the response
        this.cache[verseReference] = data;

        return data;
      } catch (err) {
        console.error(`Error fetching verse song for ${verseReference}:`, err);
        return null;
      }
    }

    /**
     * Record that a verse song was played
     */
    async recordPlay(verseReference, playDurationMs, wasLearned) {
      try {
        await fetch('/api/verse-song/record-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verseReference,
            playDurationMs,
            wasLearned
          })
        });
      } catch (err) {
        console.error(`Error recording play for ${verseReference}:`, err);
        // Fail silently—don't disrupt gameplay
      }
    }

    /**
     * Get cached data without fetching
     */
    getCached(verseReference) {
      return this.cache[verseReference] || null;
    }

    /**
     * Clear cache (e.g., on new game session)
     */
    clearCache() {
      this.cache = {};
    }
  }

  window.VerseSongService = new VerseSongService();
})();
```

### 4.2 Integrate with MusicManager

Modify **`dcgame/src/client/MusicManager.js`**:

```javascript
// In the IIFE, add:

/**
 * Play a song for a specific verse (educational learning music)
 * Non-blocking: query happens in background
 */
async function playVerseTrack(verseReference) {
  try {
    const verseTrack = await VerseSongService.getSongForVerse(verseReference);

    if (verseTrack && verseTrack.status === 'ready' && verseTrack.audioUrl) {
      // Song is ready—play it
      playTrackUrl(verseTrack.audioUrl);
      currentVerseReference = verseReference;
      console.log(`Now playing: ${verseReference}`);
      return true;
    } else {
      // Song not ready yet—use fallback
      console.log(`Song pending for ${verseReference}—using fallback music`);
      return false;
    }
  } catch (err) {
    console.error(`Error playing verse track for ${verseReference}:`, err);
    return false;
  }
}

/**
 * Play URL directly (helper)
 */
function playTrackUrl(audioUrl) {
  stop();

  currentAudio = new Audio(audioUrl);
  currentAudio.volume = isMuted ? 0 : volume;
  currentAudio.loop = true;

  currentAudio.play()
    .then(() => {
      isPlaying = true;
    })
    .catch((err) => {
      console.error('Error playing audio:', err);
      isPlaying = false;
    });
}

/**
 * Track current verse for analytics
 */
let currentVerseReference = null;

/**
 * Report that player learned a verse (call after quiz success)
 */
function recordVerseLearned(verseReference) {
  if (verseReference && VerseSongService) {
    const duration = currentAudio?.currentTime * 1000 || 0;
    VerseSongService.recordPlay(verseReference, duration, true);
  }
}

// Export public API
window.MusicManager = {
  init,
  playTrack,
  playVerseTrack,  // NEW
  stop,
  pause,
  togglePlay,
  toggleMute,
  setVolume,
  getState,
  getTracks,
  getIsPlaying,
  getIsMuted,
  recordVerseLearned, // NEW
  destroy
};
```

### 4.3 Call from game.js

In **`dcgame/game.js`**, when a verse is selected:

```javascript
// After pickQualityVerse() or when displaying a verse:
async function displayVerse(verse) {
  // ... existing code ...

  // Try to play verse-specific learning music (non-blocking)
  const played = await MusicManager.playVerseTrack(verse.Reference);

  if (!played) {
    console.log(`Verse song not ready for ${verse.Reference}`);
    // Continue with whatever music is currently playing
  }
}

// When player answers correctly:
function handleCorrectAnswer(verseReference) {
  // ... existing code ...

  // Track learning
  MusicManager.recordVerseLearned(verseReference);
}
```

---

## 5. File Structure

```
dcgame/
├── server.js
├── game.js
├── index.html
├── src/
│   ├── server/
│   │   ├── models/
│   │   │   ├── VerseSong.js        (NEW)
│   │   │   ├── CategoryStyle.js     (NEW)
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── verseSong.js         (NEW)
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── SunoService.js       (NEW)
│   │   │   └── ...
│   │   ├── jobs/
│   │   │   ├── retryFailedGenerations.js (NEW)
│   │   │   └── ...
│   │   └── Game.js
│   ├── client/
│   │   ├── MusicManager.js          (UPDATE)
│   │   ├── VerseSongService.js      (NEW)
│   │   ├── InputHandler.js
│   │   ├── Renderer.js
│   │   ├── UILayout.js
│   │   └── ...
│   ├── shared/
│   │   ├── Constants.js
│   │   └── ...
│   └── ...
├── scripts/
│   ├── seed-category-styles.js      (NEW)
│   ├── seed-top-verses.js           (NEW)
│   └── ...
├── public/
│   ├── content/
│   │   └── audio/                   (NEW - audio files stored here)
│   └── ...
└── ...
```

---

## 6. Implementation Phases

### **Phase 1: Models & Infrastructure** (1 day)
- [x] Design VerseSong & CategoryStyle schemas
- [ ] Create models
- [ ] Seed CategoryStyle mappings
- [ ] Set up routes

### **Phase 2: Suno Integration** (2 days)
- [ ] Implement SunoService (generate + poll)
- [ ] Set up audio storage (`/public/content/audio/`)
- [ ] Test generation pipeline
- [ ] Debug Suno API calls

### **Phase 3: Seeding** (1 day)
- [ ] Run seed script for top 5 verses per category
- [ ] Monitor generation queue
- [ ] Handle failures & retries

### **Phase 4: Client Integration** (1 day)
- [ ] Add VerseSongService
- [ ] Modify MusicManager
- [ ] Update game.js to call verse songs
- [ ] Test end-to-end

### **Phase 5: Analytics & Polish** (Ongoing)
- [ ] Monitor playCount vs learnCount
- [ ] A/B test music styles
- [ ] Iterate based on player feedback

---

## 7. Environment Variables

Add to `dcgame/.env` or deployment config:

```bash
MONGODB_URI=mongodb://...
KIE_API_KEY=44d68cf6de11a17b2fa235f4c0d8a5db
```

---

## 8. Monitoring & Debugging

### Check Pending Generations
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
const VerseSong = require('./src/server/models/VerseSong');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const pending = await VerseSong.find({ generationStatus: 'pending' });
  console.log('Pending:', pending.length);
  const processing = await VerseSong.find({ generationStatus: 'processing' });
  console.log('Processing:', processing.length);
  const completed = await VerseSong.find({ generationStatus: 'completed' });
  console.log('Completed:', completed.length);
  const failed = await VerseSong.find({ generationStatus: 'failed' });
  console.log('Failed:', failed.length);
  process.exit();
});
"
```

### Check Learning Effectiveness
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
const VerseSong = require('./src/server/models/VerseSong');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const songs = await VerseSong.find({ playCount: { \$gt: 0 } }).sort({ learnCount: -1 }).limit(10);
  songs.forEach(s => {
    console.log(\`\${s.verseReference}: ${s.learnCount}/${s.playCount} learned (\${(s.averageRetention * 100).toFixed(0)}%)\`);
  });
  process.exit();
});
"
```

---

## 9. Success Criteria

- ✅ Top 75 verses (5 per category) have AI-generated songs with exact verse text
- ✅ Each category has distinct musical style (disco/pop/rock/etc.)
- ✅ dcgame can query and play verse songs without blocking
- ✅ Learning effectiveness tracked (learnCount > 50% of playCount)
- ✅ Songs stored locally on dcgame server
- ✅ Generation cost controlled (batch of top 5 per category)
