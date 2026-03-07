#!/usr/bin/env node
/**
 * Wait for a specific batch log's VerseSong records to reach terminal states.
 *
 * Usage:
 *   node scripts/wait-for-song-batch-completion.js <log-file> [--poll-ms 30000] [--timeout-minutes 30]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { pollSunoStatus } = require('../src/server/services/SunoService');

function parseArgs(argv) {
  const options = {
    logFile: argv[0] ? path.resolve(argv[0]) : null,
    pollMs: 30000,
    timeoutMinutes: 30
  };

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--poll-ms') {
      options.pollMs = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === '--timeout-minutes') {
      options.timeoutMinutes = parseInt(argv[i + 1], 10);
      i++;
    }
  }

  return options;
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
    console.error('Usage: node scripts/wait-for-song-batch-completion.js <log-file> [--poll-ms 30000] [--timeout-minutes 30]');
    process.exit(1);
  }

  if (!fs.existsSync(options.logFile)) {
    console.error(`Log file not found: ${options.logFile}`);
    process.exit(1);
  }

  const startedAt = Date.now();
  const batchLog = JSON.parse(fs.readFileSync(options.logFile, 'utf8'));
  const recordIds = batchLog.entries.map(entry => entry.recordId).filter(Boolean);

  console.log(`Waiting for batch ${batchLog.batchId}`);
  console.log(`Tracking ${recordIds.length} records`);
  console.log(`Poll interval: ${options.pollMs}ms`);
  console.log(`Timeout: ${options.timeoutMinutes} minutes`);
  console.log('');

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    while (true) {
      const songs = await VerseSong.find({ _id: { $in: recordIds } }).lean();
      const byId = new Map(songs.map(song => [song._id.toString(), song]));

      for (const entry of batchLog.entries) {
        const song = byId.get(entry.recordId);
        if (!song) {
          entry.status = 'missing_record';
          entry.generationError = 'VerseSong record not found';
          continue;
        }

        entry.status = song.generationStatus;
        entry.generationRequestId = song.generationRequestId || null;
        entry.generationAttempts = song.generationAttempts || 0;
        entry.generationError = song.generationError || null;
        entry.audioUrl = song.audioUrl || null;
        entry.sunoId = song.sunoId || null;
        entry.updatedAt = song.updatedAt;
      }

      batchLog.summary = summarize(batchLog.entries);
      batchLog.lastObservedAt = new Date().toISOString();
      fs.writeFileSync(options.logFile, JSON.stringify(batchLog, null, 2));

      const processingEntries = batchLog.entries.filter(entry => entry.status === 'processing');
      for (const entry of processingEntries) {
        pollSunoStatus(entry.recordId).catch(err => {
          console.error(`Polling error for ${entry.verseReference}: ${err.message}`);
        });
      }

      console.log(`[${new Date().toISOString()}] ${JSON.stringify(batchLog.summary)}`);

      const unresolved = batchLog.entries.filter(entry => (
        entry.status !== 'completed' &&
        entry.status !== 'failed' &&
        entry.status !== 'missing_record'
      ));

      if (unresolved.length === 0) {
        console.log('\nAll tracked records reached terminal states.');
        break;
      }

      const elapsedMinutes = (Date.now() - startedAt) / 60000;
      if (elapsedMinutes >= options.timeoutMinutes) {
        console.log('\nTimed out waiting for batch completion.');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, options.pollMs));
    }
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
