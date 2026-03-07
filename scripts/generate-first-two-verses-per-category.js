#!/usr/bin/env node
/**
 * Create new song versions for the first N verses in each category.
 *
 * Default result: 1 new song per category, with optional one-song test mode.
 *
 * Usage:
 *   node scripts/generate-first-two-verses-per-category.js
 *   node scripts/generate-first-two-verses-per-category.js 2
 *   node scripts/generate-first-two-verses-per-category.js --count 3
 *   node scripts/generate-first-two-verses-per-category.js --dry-run
 *   node scripts/generate-first-two-verses-per-category.js --onesong
 *   node scripts/generate-first-two-verses-per-category.js --log-file logs/song-batches/custom.json
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const { loadSelectedVerses } = require('../bible-verses');
const VerseSong = require('../src/server/models/VerseSong');
const CategoryStyle = require('../src/server/models/CategoryStyle');
const { generateVerseSong } = require('../src/server/services/SunoService');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');

function parseArgs(argv) {
  const options = {
    dryRun: false,
    logFile: null,
    oneSong: false,
    category: null,
    countPerCategory: 1,
    maxExisting: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (arg === '--onesong') {
      options.oneSong = true;
    } else if (arg === '--category') {
      options.category = argv[i + 1];
      i++;
    } else if (arg === '--count') {
      options.countPerCategory = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === '--max-existing') {
      options.maxExisting = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === '--log-file') {
      options.logFile = argv[i + 1];
      i++;
    } else if (!arg.startsWith('-') && !Number.isNaN(parseInt(arg, 10))) {
      options.countPerCategory = parseInt(arg, 10);
    }
  }

  if (!Number.isInteger(options.countPerCategory) || options.countPerCategory < 1) {
    throw new Error('countPerCategory must be a positive integer');
  }
  if (options.maxExisting !== null && (!Number.isInteger(options.maxExisting) || options.maxExisting < 0)) {
    throw new Error('maxExisting must be a non-negative integer');
  }

  return options;
}

function getVersesPerCategory(countPerCategory) {
  const verses = loadSelectedVerses();
  const selected = [];
  const categoryCounts = new Map();

  for (const verse of verses) {
    const currentCount = categoryCounts.get(verse.Category) || 0;
    if (currentCount >= countPerCategory) {
      continue;
    }

    selected.push(verse);
    categoryCounts.set(verse.Category, currentCount + 1);
  }

  return selected;
}

function parseVerseReference(reference) {
  const parts = reference.match(/^([A-Za-z0-9\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!parts) {
    throw new Error(`Invalid verse reference format: ${reference}`);
  }

  return {
    book: parts[1].trim(),
    chapter: parseInt(parts[2], 10),
    startVerse: parseInt(parts[3], 10),
    endVerse: parts[4] ? parseInt(parts[4], 10) : undefined
  };
}

function defaultLogFilePath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'logs', 'song-batches', `${timestamp}-songs-per-category.json`);
}

function writeLogFile(logFile, payload) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(payload, null, 2));
}

async function createSongVersion(target, dryRun) {
  const normalizedRef = normalizeReference(target.Reference);
  const existingVersions = await VerseSong.find({
    verseReference: normalizedRef
  }).sort({ version: -1 }).lean();

  const nextVersion = (existingVersions[0]?.version || 0) + 1;
  const styleDoc = await CategoryStyle.findOne({ category: target.Category }).lean();
  const parsed = parseVerseReference(target.Reference);

  const logEntry = {
    category: target.Category,
    verseReference: target.Reference,
    normalizedVerseReference: normalizedRef,
    existingVersionCount: existingVersions.length,
    newVersion: nextVersion,
    generationStyle: styleDoc?.generationStyle || 'pop',
    dryRun,
    status: dryRun ? 'planned' : 'creating'
  };

  if (dryRun) {
    return logEntry;
  }

  const verseSong = new VerseSong({
    verseReference: normalizedRef,
    verseReferenceFull: target.Reference,
    version: nextVersion,
    book: parsed.book,
    chapter: parsed.chapter,
    startVerse: parsed.startVerse,
    endVerse: parsed.endVerse,
    category: target.Category,
    verseText: target.Text,
    generationStyle: styleDoc?.generationStyle || 'pop',
    generationStatus: 'pending',
    generationAttempts: 0,
    status: 'active',
    isActiveVersion: true,
    qualityScore: 50
  });

  await verseSong.save();

  logEntry.recordId = verseSong._id.toString();
  logEntry.status = 'queued';

  try {
    await generateVerseSong(verseSong._id);
    const refreshed = await VerseSong.findById(verseSong._id).lean();
    logEntry.status = refreshed.generationStatus;
    logEntry.generationRequestId = refreshed.generationRequestId || null;
    logEntry.generationAttempts = refreshed.generationAttempts || 0;
    logEntry.generationError = refreshed.generationError || null;
  } catch (err) {
    logEntry.status = 'failed';
    logEntry.generationError = err.message;
  }

  return logEntry;
}

async function filterTargetsByExistingCount(targets, maxExisting) {
  if (maxExisting === null) {
    return targets;
  }

  const filtered = [];

  for (const target of targets) {
    const normalizedRef = normalizeReference(target.Reference);
    const existingCount = await VerseSong.countDocuments({ verseReference: normalizedRef });
    if (existingCount < maxExisting) {
      filtered.push(target);
    }
  }

  return filtered;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let selectedTargets = getVersesPerCategory(options.countPerCategory);
  if (options.category) {
    selectedTargets = selectedTargets.filter(target => target.Category === options.category);
    if (selectedTargets.length === 0) {
      throw new Error(`No category found for --category ${options.category}`);
    }
  }
  selectedTargets = await filterTargetsByExistingCount(selectedTargets, options.maxExisting);
  const targets = options.oneSong ? selectedTargets.slice(0, 1) : selectedTargets;
  const logFile = options.logFile ? path.resolve(options.logFile) : defaultLogFilePath();
  const batchId = path.basename(logFile, '.json');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Multi Verse Per Category Song Generation        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Targets: ${targets.length} verse(s) across ${targets.length} category slot(s)`);
  console.log(`Count per category: ${options.countPerCategory}`);
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'live queue'}${options.oneSong ? ' + one-song test' : ''}${options.category ? ` + category=${options.category}` : ''}${options.maxExisting !== null ? ` + maxExisting<${options.maxExisting}` : ''}`);
  console.log(`Log: ${logFile}`);
  console.log('');

  const batchLog = {
    batchId,
    createdAt: new Date().toISOString(),
    purpose: options.oneSong
      ? 'Create one new version for a single category test verse'
      : `Create one new version for the first ${options.countPerCategory} verse(s) in each category`,
    dryRun: options.dryRun,
    oneSong: options.oneSong,
    category: options.category,
    countPerCategory: options.countPerCategory,
    maxExisting: options.maxExisting,
    totalTargets: targets.length,
    entries: []
  };

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    for (const target of targets) {
      console.log(`• ${target.Category}: ${target.Reference}`);
      const entry = await createSongVersion(target, options.dryRun);
      batchLog.entries.push(entry);
      writeLogFile(logFile, batchLog);

      if (!options.dryRun) {
        console.log(`  v${entry.newVersion} -> ${entry.status}${entry.generationRequestId ? ` (${entry.generationRequestId})` : ''}`);
      }
    }

    const summary = batchLog.entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});

    batchLog.summary = summary;
    batchLog.completedAt = new Date().toISOString();
    writeLogFile(logFile, batchLog);

    console.log('');
    console.log('Summary:');
    Object.entries(summary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('');
    console.log(`Batch log written to ${logFile}`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
