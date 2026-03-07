#!/usr/bin/env node
/**
 * Merge mixed-format VerseSong duplicates into a normalized multi-version set.
 *
 * Default behavior is dry-run only. In apply mode this script will:
 * - normalize verseReference to the canonical normalized form
 * - keep one canonical winner per (normalized verseReference, version)
 * - move colliding duplicates to the next free version number
 *
 * It never deletes songs. It only reports likely exact-duplicate audio so those
 * rows can be reviewed separately before any archival policy is applied.
 *
 * Usage:
 *   node scripts/merge-duplicate-verse-song-references.js
 *   node scripts/merge-duplicate-verse-song-references.js --apply
 *   node scripts/merge-duplicate-verse-song-references.js --report-file logs/maintenance/merge-report.json
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const VerseSong = require('../src/server/models/VerseSong');
const { normalizeReference } = require('../src/server/utils/ReferenceNormalizer');

function parseArgs(argv) {
  const options = {
    apply: false,
    reportFile: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--report-file') {
      options.reportFile = argv[i + 1];
      i++;
    }
  }

  return options;
}

function defaultReportFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'logs', 'maintenance', `verse-song-duplicate-merge-${timestamp}.json`);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getCanonicalFullReference(groupSongs) {
  const explicitFull = groupSongs
    .map(song => song.verseReferenceFull)
    .find(Boolean);
  if (explicitFull) {
    return explicitFull;
  }

  const legacyDisplay = groupSongs
    .map(song => song.verseReference)
    .find(ref => ref && ref !== normalizeReference(ref));
  return legacyDisplay || null;
}

function getTimestamp(value) {
  const ms = value ? new Date(value).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function resolveAudioPath(song) {
  if (song.audioPath && fs.existsSync(song.audioPath)) {
    return song.audioPath;
  }

  if (!song.audioUrl) {
    return null;
  }

  if (song.audioUrl.startsWith('/audio/')) {
    const candidate = path.join(process.cwd(), 'public', song.audioUrl.replace(/^\//, ''));
    return fs.existsSync(candidate) ? candidate : null;
  }

  if (song.audioUrl.startsWith('/public/audio/')) {
    const candidate = path.join(process.cwd(), song.audioUrl.replace(/^\//, ''));
    return fs.existsSync(candidate) ? candidate : null;
  }

  return null;
}

function getAudioInfo(song) {
  const resolvedPath = resolveAudioPath(song);
  let fileSize = null;

  if (resolvedPath) {
    try {
      fileSize = fs.statSync(resolvedPath).size;
    } catch (err) {
      fileSize = null;
    }
  }

  return {
    resolvedPath,
    fileSize
  };
}

function scoreSong(song, canonicalRef) {
  let score = 0;

  if (song.audioUrl) score += 1000;
  if (song.generationStatus === 'completed') score += 500;
  if (song.status === 'active') score += 200;
  if (song.sunoId) score += 100;
  if (song.verseReference === canonicalRef) score += 50;
  if (song.verseReferenceFull) score += 25;
  if (song.isActiveVersion) score += 10;
  score += Math.min(song.playCount || 0, 100);
  score += getTimestamp(song.updatedAt) / 1e13;

  return score;
}

function compareSongs(a, b, canonicalRef) {
  const scoreDiff = scoreSong(b, canonicalRef) - scoreSong(a, canonicalRef);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const createdDiff = getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return String(a._id).localeCompare(String(b._id));
}

function toReportSong(song) {
  const audioInfo = getAudioInfo(song);

  return {
    id: String(song._id),
    verseReference: song.verseReference,
    verseReferenceFull: song.verseReferenceFull || null,
    version: song.version || 1,
    generationStatus: song.generationStatus || null,
    status: song.status || null,
    isActiveVersion: song.isActiveVersion !== undefined ? song.isActiveVersion : null,
    hasAudio: Boolean(song.audioUrl),
    audioUrl: song.audioUrl || null,
    audioPath: song.audioPath || null,
    resolvedAudioPath: audioInfo.resolvedPath,
    fileSize: audioInfo.fileSize,
    duration: song.duration ?? null,
    sunoId: song.sunoId || null,
    playCount: song.playCount || 0,
    updatedAt: song.updatedAt || null
  };
}

function nextFreeVersion(usedVersions) {
  let version = 1;
  while (usedVersions.has(version)) {
    version++;
  }
  usedVersions.add(version);
  return version;
}

function buildDuplicateSignals(primary, secondary) {
  const primaryInfo = getAudioInfo(primary);
  const secondaryInfo = getAudioInfo(secondary);
  const signals = [];

  if (primary.sunoId && secondary.sunoId && primary.sunoId === secondary.sunoId) {
    signals.push('same_suno_id');
  }

  if (primary.audioUrl && secondary.audioUrl && primary.audioUrl === secondary.audioUrl) {
    signals.push('same_audio_url');
  }

  if (primaryInfo.resolvedPath && secondaryInfo.resolvedPath && primaryInfo.resolvedPath === secondaryInfo.resolvedPath) {
    signals.push('same_resolved_audio_path');
  }

  if (
    primary.duration !== undefined &&
    primary.duration !== null &&
    secondary.duration !== undefined &&
    secondary.duration !== null &&
    primary.duration === secondary.duration
  ) {
    signals.push('same_duration');
  }

  if (
    primaryInfo.fileSize !== null &&
    secondaryInfo.fileSize !== null &&
    primaryInfo.fileSize === secondaryInfo.fileSize
  ) {
    signals.push('same_file_size');
  }

  return {
    signals,
    likelyExactDuplicate: (
      signals.includes('same_suno_id') ||
      signals.includes('same_audio_url') ||
      signals.includes('same_resolved_audio_path') ||
      (signals.includes('same_duration') && signals.includes('same_file_size'))
    ),
    sameDurationOnly: signals.length === 1 && signals[0] === 'same_duration'
  };
}

function buildUpdateOperation(song, canonicalRef, canonicalFullReference, targetVersion) {
  const updates = {};

  if (song.verseReference !== canonicalRef) {
    updates.verseReference = canonicalRef;
  }

  if (targetVersion !== (song.version || 1)) {
    updates.version = targetVersion;
  }

  if (!song.verseReferenceFull && canonicalFullReference) {
    updates.verseReferenceFull = canonicalFullReference;
  }

  return updates;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const reportFile = options.reportFile ? path.resolve(options.reportFile) : defaultReportFile();

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const songs = await VerseSong.find({})
      .sort({ verseReference: 1, version: 1, createdAt: 1 })
      .lean();

    const groups = new Map();
    for (const song of songs) {
      const canonicalRef = normalizeReference(song.verseReferenceFull || song.verseReference);
      if (!groups.has(canonicalRef)) {
        groups.set(canonicalRef, []);
      }
      groups.get(canonicalRef).push(song);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      apply: options.apply,
      totalSongs: songs.length,
      totalGroups: groups.size,
      affectedGroups: 0,
      plannedNormalizationUpdates: 0,
      plannedVersionMoves: 0,
      likelyExactDuplicatePairs: 0,
      sameDurationOnlyPairs: 0,
      groups: []
    };

    const applyOperations = [];

    for (const [canonicalRef, groupSongs] of groups.entries()) {
      const distinctRefs = [...new Set(groupSongs.map(song => song.verseReference))];
      const hasMixedReferences = distinctRefs.length > 1;
      const hasVersionCollision = new Set(groupSongs.map(song => `${song.version || 1}`)).size !== groupSongs.length;

      if (!hasMixedReferences && !hasVersionCollision) {
        continue;
      }

      report.affectedGroups++;
      const canonicalFullReference = getCanonicalFullReference(groupSongs);
      const usedVersions = new Set(groupSongs.map(song => song.version || 1));
      const byVersion = new Map();

      for (const song of groupSongs) {
        const version = song.version || 1;
        if (!byVersion.has(version)) {
          byVersion.set(version, []);
        }
        byVersion.get(version).push(song);
      }

      const normalizedSingles = [];
      const collisionResolutions = [];

      const orderedVersions = [...byVersion.keys()].sort((a, b) => a - b);
      for (const version of orderedVersions) {
        const versionSongs = byVersion.get(version).slice().sort((a, b) => compareSongs(a, b, canonicalRef));
        const winner = versionSongs[0];
        const winnerUpdates = buildUpdateOperation(winner, canonicalRef, canonicalFullReference, version);

        if (versionSongs.length === 1) {
          if (Object.keys(winnerUpdates).length > 0) {
            normalizedSingles.push({
              winner: toReportSong(winner),
              updates: winnerUpdates
            });
            report.plannedNormalizationUpdates++;
            applyOperations.push({
              id: String(winner._id),
              updates: winnerUpdates
            });
          }
          continue;
        }

        const losers = [];
        for (const loser of versionSongs.slice(1)) {
          const targetVersion = nextFreeVersion(usedVersions);
          const loserUpdates = buildUpdateOperation(loser, canonicalRef, canonicalFullReference, targetVersion);
          const duplicateSignals = buildDuplicateSignals(winner, loser);

          losers.push({
            song: toReportSong(loser),
            targetVersion,
            updates: loserUpdates,
            duplicateSignals
          });

          report.plannedVersionMoves++;
          if (duplicateSignals.likelyExactDuplicate) {
            report.likelyExactDuplicatePairs++;
          } else if (duplicateSignals.sameDurationOnly) {
            report.sameDurationOnlyPairs++;
          }

          applyOperations.push({
            id: String(loser._id),
            updates: loserUpdates
          });
        }

        const winnerNeedsUpdate = Object.keys(winnerUpdates).length > 0;
        if (winnerNeedsUpdate) {
          report.plannedNormalizationUpdates++;
          applyOperations.push({
            id: String(winner._id),
            updates: winnerUpdates
          });
        }

        collisionResolutions.push({
          version,
          winner: toReportSong(winner),
          winnerUpdates: winnerUpdates,
          losers
        });
      }

      report.groups.push({
        canonicalVerseReference: canonicalRef,
        canonicalFullReference,
        distinctVerseReferences: distinctRefs,
        songCount: groupSongs.length,
        normalizedSingles,
        collisionResolutions
      });
    }

    if (options.apply) {
      for (const operation of applyOperations) {
        if (Object.keys(operation.updates).length === 0) {
          continue;
        }

        await VerseSong.updateOne(
          { _id: operation.id },
          { $set: operation.updates }
        );
      }
    }

    ensureDir(reportFile);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(JSON.stringify({
      apply: options.apply,
      totalSongs: report.totalSongs,
      affectedGroups: report.affectedGroups,
      plannedNormalizationUpdates: report.plannedNormalizationUpdates,
      plannedVersionMoves: report.plannedVersionMoves,
      likelyExactDuplicatePairs: report.likelyExactDuplicatePairs,
      sameDurationOnlyPairs: report.sameDurationOnlyPairs,
      reportFile
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
