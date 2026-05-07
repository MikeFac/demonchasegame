const fs = require('fs');
const path = require('path');

const DEFAULT_FILES = [
  'public/locales/hi.json',
  'public/locales/hi-rom.json',
  'bible-verses-hi.js',
  'bible-verses-hi-rom.js'
];

const FIXES_FILE = path.join(__dirname, 'hindi-text-fixes.json');
const REPLACEMENT_CHAR = '\uFFFD';
const MIXED_SCRIPT_TOKEN_RE = /[A-Za-z][A-Za-z\u0900-\u097F]*[\u0900-\u097F][A-Za-z\u0900-\u097F]*|[\u0900-\u097F][A-Za-z\u0900-\u097F]*[A-Za-z][A-Za-z\u0900-\u097F]*/g;

function parseArgs(argv) {
  const args = {
    files: [],
    applyFixes: false,
    jsonOut: null
  };

  for (const arg of argv) {
    if (arg === '--apply-fixes') {
      args.applyFixes = true;
      continue;
    }
    if (arg.startsWith('--json-out=')) {
      args.jsonOut = arg.slice('--json-out='.length);
      continue;
    }
    if (arg.startsWith('--files=')) {
      args.files = arg
        .slice('--files='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return args;
}

function readFixes() {
  if (!fs.existsSync(FIXES_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(FIXES_FILE, 'utf8'));
}

function applyFixes(rootDir, files, fixesByFile) {
  const applied = [];

  for (const relativeFile of files) {
    const replacements = fixesByFile[relativeFile];
    if (!Array.isArray(replacements) || replacements.length === 0) {
      continue;
    }

    const absoluteFile = path.join(rootDir, relativeFile);
    let content = fs.readFileSync(absoluteFile, 'utf8');
    let changeCount = 0;

    for (const replacement of replacements) {
      if (!replacement || typeof replacement.from !== 'string' || typeof replacement.to !== 'string') {
        continue;
      }
      if (!content.includes(replacement.from)) {
        continue;
      }
      content = content.split(replacement.from).join(replacement.to);
      changeCount++;
    }

    if (changeCount > 0) {
      fs.writeFileSync(absoluteFile, content, 'utf8');
      applied.push({ file: relativeFile, changeCount });
    }
  }

  return applied;
}

function buildOccurrences(relativeFile, content) {
  const lines = content.split(/\n/);
  const occurrences = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (line.includes(REPLACEMENT_CHAR)) {
      occurrences.push({
        file: relativeFile,
        line: index + 1,
        issue: 'replacement_char',
        text: line.trim()
      });
    }

    const mixedTokens = line.match(MIXED_SCRIPT_TOKEN_RE);
    if (mixedTokens) {
      const uniqueTokens = Array.from(new Set(mixedTokens));
      for (const token of uniqueTokens) {
        occurrences.push({
          file: relativeFile,
          line: index + 1,
          issue: 'mixed_script_token',
          token,
          text: line.trim()
        });
      }
    }
  }

  return occurrences;
}

function summarizeOccurrences(occurrences) {
  const byFile = {};
  const mixedTokenCounts = {};

  for (const occurrence of occurrences) {
    if (!byFile[occurrence.file]) {
      byFile[occurrence.file] = {
        replacementCharLines: 0,
        mixedScriptLines: 0,
        totalIssues: 0
      };
    }
    byFile[occurrence.file].totalIssues++;

    if (occurrence.issue === 'replacement_char') {
      byFile[occurrence.file].replacementCharLines++;
    } else if (occurrence.issue === 'mixed_script_token') {
      byFile[occurrence.file].mixedScriptLines++;
      mixedTokenCounts[occurrence.token] = (mixedTokenCounts[occurrence.token] || 0) + 1;
    }
  }

  const topMixedTokens = Object.entries(mixedTokenCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 25)
    .map(([token, count]) => ({ token, count }));

  return { byFile, topMixedTokens };
}

function main() {
  const rootDir = path.join(__dirname, '..');
  const args = parseArgs(process.argv.slice(2));
  const files = args.files.length > 0 ? args.files : DEFAULT_FILES;

  if (args.applyFixes) {
    const applied = applyFixes(rootDir, files, readFixes());
    if (applied.length === 0) {
      console.log('No configured fixes applied.');
    } else {
      for (const entry of applied) {
        console.log(`Applied ${entry.changeCount} fix set(s) to ${entry.file}`);
      }
    }
  }

  const occurrences = [];
  for (const relativeFile of files) {
    const absoluteFile = path.join(rootDir, relativeFile);
    const content = fs.readFileSync(absoluteFile, 'utf8');
    occurrences.push(...buildOccurrences(relativeFile, content));
  }

  const summary = summarizeOccurrences(occurrences);
  const report = {
    generatedAt: new Date().toISOString(),
    files,
    summary,
    occurrences
  };

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    files: report.files,
    summary: report.summary,
    occurrenceCount: report.occurrences.length
  }, null, 2));

  if (args.jsonOut) {
    const outputPath = path.isAbsolute(args.jsonOut)
      ? args.jsonOut
      : path.join(rootDir, args.jsonOut);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Wrote report to ${outputPath}`);
  }
}

main();
