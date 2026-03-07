#!/usr/bin/env node
/**
 * Safely normalize VerseSong.verseReference values without orphaning songs.
 *
 * Safety rule:
 * - Only rewrite verseReference to the normalized canonical form when the
 *   target (normalized verseReference + version) does not already exist.
 * - Any same-version collision is reported for manual review and left unchanged.
 *
 * Usage:
 *   node scripts/safe-normalize-verse-song-references.js
 *   node scripts/safe-normalize-verse-song-references.js --apply
 *   node scripts/safe-normalize-verse-song-references.js --report-file logs/verse-song-ref-normalization.json
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
  return path.join(process.cwd(), 'logs', 'maintenance', `verse-song-ref-normalization-${timestamp}.json`);
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

function toReportSong(song) {
  return {
    id: String(song._id),
    verseReference: song.verseReference,
    verseReferenceFull: song.verseReferenceFull || null,
    version: song.version || 1,
    generationStatus: song.generationStatus,
    hasAudio: Boolean(song.audioUrl),
    audioUrl: song.audioUrl || null,
    sunoId: song.sunoId || null
  };
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
      mixedGroups: 0,
      safeUpdateCount: 0,
      blockedCollisionCount: 0,
      unchangedCount: 0,
      groups: []
    };

    for (const [canonicalRef, groupSongs] of groups.entries()) {
      const distinctRefs = [...new Set(groupSongs.map(song => song.verseReference))];
      if (distinctRefs.length <= 1) {
        continue;
      }

      report.mixedGroups++;
      const canonicalFullReference = getCanonicalFullReference(groupSongs);
      const byVersion = new Map();

      for (const song of groupSongs) {
        const version = song.version || 1;
        if (!byVersion.has(version)) {
          byVersion.set(version, []);
        }
        byVersion.get(version).push(song);
      }

      const safeUpdates = [];
      const blockedCollisions = [];
      const unchanged = [];

      for (const [version, versionSongs] of byVersion.entries()) {
        const alreadyCanonical = versionSongs.filter(song => song.verseReference === canonicalRef);
        const needsRewrite = versionSongs.filter(song => song.verseReference !== canonicalRef);

        if (needsRewrite.length === 0) {
          unchanged.push(...alreadyCanonical.map(toReportSong));
          continue;
        }

        if (alreadyCanonical.length > 0 || needsRewrite.length > 1) {
          blockedCollisions.push({
            version,
            reason: alreadyCanonical.length > 0
              ? 'canonical_version_already_exists'
              : 'multiple_noncanonical_rows_share_same_version',
            songs: versionSongs.map(toReportSong)
          });
          continue;
        }

        const candidate = needsRewrite[0];
        safeUpdates.push({
          id: String(candidate._id),
          from: candidate.verseReference,
          to: canonicalRef,
          verseReferenceFull: candidate.verseReferenceFull || canonicalFullReference,
          version,
          hasAudio: Boolean(candidate.audioUrl)
        });
      }

      report.safeUpdateCount += safeUpdates.length;
      report.blockedCollisionCount += blockedCollisions.length;
      report.unchangedCount += unchanged.length;

      report.groups.push({
        canonicalVerseReference: canonicalRef,
        canonicalFullReference,
        distinctVerseReferences: distinctRefs,
        songCount: groupSongs.length,
        safeUpdates,
        blockedCollisions,
        unchanged
      });
    }

    if (options.apply) {
      for (const group of report.groups) {
        for (const update of group.safeUpdates) {
          await VerseSong.updateOne(
            { _id: update.id },
            {
              $set: {
                verseReference: update.to,
                ...(update.verseReferenceFull ? { verseReferenceFull: update.verseReferenceFull } : {})
              }
            }
          );
        }
      }
    }

    ensureDir(reportFile);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(JSON.stringify({
      apply: options.apply,
      totalSongs: report.totalSongs,
      mixedGroups: report.mixedGroups,
      safeUpdateCount: report.safeUpdateCount,
      blockedCollisionCount: report.blockedCollisionCount,
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
