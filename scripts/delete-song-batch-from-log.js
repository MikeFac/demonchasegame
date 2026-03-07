#!/usr/bin/env node
/**
 * Delete all VerseSong records and audio files referenced by a batch log.
 *
 * Usage:
 *   node scripts/delete-song-batch-from-log.js <log-file>
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

async function main() {
  const logFileArg = process.argv[2];
  if (!logFileArg) {
    console.error('Usage: node scripts/delete-song-batch-from-log.js <log-file>');
    process.exit(1);
  }

  const logFile = path.resolve(logFileArg);
  if (!fs.existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    process.exit(1);
  }

  const batchLog = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const recordIds = batchLog.entries.map(entry => entry.recordId).filter(Boolean);

  let deletedFiles = 0;
  let missingFiles = 0;

  for (const entry of batchLog.entries) {
    if (!entry.audioUrl) {
      continue;
    }

    const filePath = path.join(process.cwd(), 'public', entry.audioUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deletedFiles++;
    } else {
      missingFiles++;
    }
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const result = await VerseSong.deleteMany({
      _id: { $in: recordIds.map(id => new mongoose.Types.ObjectId(id)) }
    });

    batchLog.deletedAt = new Date().toISOString();
    batchLog.deletionSummary = {
      deletedMongoRecords: result.deletedCount,
      deletedFiles,
      missingFiles
    };
    fs.writeFileSync(logFile, JSON.stringify(batchLog, null, 2));

    console.log(JSON.stringify(batchLog.deletionSummary, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
