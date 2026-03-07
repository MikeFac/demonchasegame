#!/usr/bin/env node
/**
 * Retry a specific song generation batch from its JSON log file.
 *
 * Usage:
 *   node scripts/retry-song-batch-from-log.js <log-file> [--delay-ms 5000]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { generateVerseSong } = require('../src/server/services/SunoService');

function parseArgs(argv) {
  const args = {
    logFile: argv[0] ? path.resolve(argv[0]) : null,
    delayMs: 5000
  };

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--delay-ms') {
      args.delayMs = parseInt(argv[i + 1], 10);
      i++;
    }
  }

  return args;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function summarize(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.logFile) {
    console.error('Usage: node scripts/retry-song-batch-from-log.js <log-file> [--delay-ms 5000]');
    process.exit(1);
  }

  if (!fs.existsSync(options.logFile)) {
    console.error(`Log file not found: ${options.logFile}`);
    process.exit(1);
  }

  const batchLog = JSON.parse(fs.readFileSync(options.logFile, 'utf8'));
  batchLog.retryHistory = batchLog.retryHistory || [];

  console.log(`Retrying batch ${batchLog.batchId}`);
  console.log(`Entries: ${batchLog.entries.length}`);
  console.log(`Delay: ${options.delayMs}ms`);
  console.log('');

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    for (let i = 0; i < batchLog.entries.length; i++) {
      const entry = batchLog.entries[i];
      const verseSong = await VerseSong.findById(entry.recordId);

      if (!verseSong) {
        entry.status = 'missing_record';
        entry.generationError = 'VerseSong record not found';
        fs.writeFileSync(options.logFile, JSON.stringify(batchLog, null, 2));
        continue;
      }

      verseSong.generationStatus = 'pending';
      verseSong.generationError = undefined;
      await verseSong.save();

      console.log(`• ${entry.verseReference} v${entry.newVersion}`);

      try {
        await generateVerseSong(verseSong._id);
      } catch (err) {
        // generateVerseSong persists failures itself; keep log in sync below.
      }

      const refreshed = await VerseSong.findById(entry.recordId).lean();
      entry.status = refreshed.generationStatus;
      entry.generationRequestId = refreshed.generationRequestId || null;
      entry.generationAttempts = refreshed.generationAttempts || 0;
      entry.generationError = refreshed.generationError || null;

      batchLog.lastRetriedAt = new Date().toISOString();
      batchLog.summary = summarize(batchLog.entries);
      fs.writeFileSync(options.logFile, JSON.stringify(batchLog, null, 2));

      console.log(`  -> ${entry.status}${entry.generationRequestId ? ` (${entry.generationRequestId})` : ''}`);

      if (i < batchLog.entries.length - 1) {
        await sleep(options.delayMs);
      }
    }

    batchLog.retryHistory.push({
      retriedAt: new Date().toISOString(),
      delayMs: options.delayMs,
      summary: summarize(batchLog.entries)
    });
    batchLog.summary = summarize(batchLog.entries);
    fs.writeFileSync(options.logFile, JSON.stringify(batchLog, null, 2));

    console.log('');
    console.log('Summary:');
    Object.entries(batchLog.summary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log(`\nUpdated log: ${options.logFile}`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
