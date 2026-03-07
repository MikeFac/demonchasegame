#!/usr/bin/env node
/**
 * Export only the songs referenced by a batch log file.
 *
 * Usage:
 *   node scripts/export-song-batch-from-log.js <log-file>
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');

function usage() {
  console.error('Usage: node scripts/export-song-batch-from-log.js <log-file>');
  process.exit(1);
}

async function main() {
  const logFileArg = process.argv[2];
  if (!logFileArg) usage();

  const logFile = path.resolve(logFileArg);
  if (!fs.existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    process.exit(1);
  }

  const batchLog = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const recordIds = batchLog.entries.map(entry => entry.recordId).filter(Boolean);
  const batchId = batchLog.batchId || path.basename(logFile, '.json');

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const songs = await VerseSong.find({
      _id: { $in: recordIds },
      status: 'active',
      generationStatus: 'completed',
      audioUrl: { $exists: true, $ne: null }
    }).lean().exec();

    const exportData = {
      exportedAt: new Date().toISOString(),
      batchId,
      sourceLog: logFile,
      totalSongs: songs.length,
      songs: songs.map(s => ({
        verseReference: s.verseReference,
        verseReferenceFull: s.verseReferenceFull || null,
        version: s.version || 1,
        sunoId: s.sunoId || null,
        book: s.book,
        chapter: s.chapter,
        startVerse: s.startVerse,
        endVerse: s.endVerse || null,
        category: s.category,
        verseText: s.verseText,
        generationStyle: s.generationStyle,
        audioUrl: s.audioUrl,
        audioPath: s.audioPath || null,
        duration: s.duration || 120,
        playCount: s.playCount || 0,
        learnCount: s.learnCount || 0,
        averageRetention: s.averageRetention || 0,
        qualityScore: s.qualityScore || 50,
        isActiveVersion: s.isActiveVersion !== undefined ? s.isActiveVersion : true
      }))
    };

    const exportPath = path.join(process.cwd(), `${batchId}-songs-export.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    const audioFiles = songs
      .map(song => song.audioUrl)
      .filter(Boolean)
      .map(url => url.replace(/^\/audio\//, ''))
      .sort();

    const audioListPath = path.join(process.cwd(), `${batchId}-audio-files-list.txt`);
    fs.writeFileSync(audioListPath, audioFiles.join('\n') + (audioFiles.length ? '\n' : ''));

    console.log(`✅ Exported ${songs.length} songs to: ${exportPath}`);
    console.log(`✅ Wrote audio list to: ${audioListPath}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
