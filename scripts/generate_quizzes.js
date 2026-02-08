const fs = require('fs');

// Simple list of common words to ignore for "Missing Word"
const STOP_WORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if', 'out', 'not', 'did', 'he', 'she', 'they', 'my', 'me', 'him', 'her', 'us', 'we']);

function loadVerses() {
    try {
        const content = fs.readFileSync('bible-verses.js', 'utf8');
        const evalCode = content + '; return loadSelectedVerses();';
        const loader = new Function(evalCode);
        return loader();
    } catch (err) {
        console.error("Failed to load verses:", err);
        process.exit(1);
    }
}

function saveVerses(verses) {
    const newContent = `function loadSelectedVerses() {
  return ${JSON.stringify(verses, null, 2)};
}

function organizeByCategory(verses) {
  const categorizedVerses = {};
  verses.forEach((verse) => {
    // Use Category field (standardized)
    const category = verse.Category;
    if (!categorizedVerses[category]) {
      categorizedVerses[category] = [];
    }
    categorizedVerses[category].push(verse);
  });
  return categorizedVerses;
}

if (typeof module !== 'undefined') {
  module.exports = { loadSelectedVerses, organizeByCategory };
}
`;
    fs.writeFileSync('bible-verses.js', newContent);
    console.log(`Saved ${verses.length} verses.`);
}

function getPlausibleDistractors(allWords, correctWord, count = 3) {
    const distractors = [];
    const correctLower = correctWord.toLowerCase();

    let attempts = 0;
    while (distractors.length < count && attempts < 200) {
        const candidate = allWords[Math.floor(Math.random() * allWords.length)];
        const candidateLower = candidate.toLowerCase();

        if (candidateLower !== correctLower &&
            !distractors.includes(candidate) &&
            candidate.length >= 3) {
            distractors.push(candidate);
        }
        attempts++;
    }
    return distractors;
}

// MAIN EXECUTION
const verses = loadVerses();
const allWords = [];

// 1. Build word corpus & standardize Category
verses.forEach(v => {
    // Standardize Category
    if (!v.Category && (v.Name || v.category)) {
        v.Category = v.Name || v.category;
    }
    delete v.Name; // cleanup
    delete v.category; // cleanup

    // Clean text for corpus
    const cleanText = v.Text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const words = cleanText.split(/\s+/);
    words.forEach(w => {
        if (w.length > 3 && !STOP_WORDS.has(w.toLowerCase())) {
            allWords.push(w);
        }
    });
});

// 2. Generate "Missing Word" Data
verses.forEach(v => {
    const text = v.Text;
    const words = text.split(/\s+/);

    const candidates = [];
    words.forEach((w, i) => {
        const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (clean.length > 4 && !STOP_WORDS.has(clean.toLowerCase())) {
            candidates.push({ index: i, word: w, clean: clean });
        }
    });

    if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        const distractors = getPlausibleDistractors(allWords, choice.clean);

        const pre = words.slice(0, choice.index).join(' ');
        const post = words.slice(choice.index + 1).join(' ');

        // We store this in a 'quizzes' object so we can have multiple types if needed
        v.quizData = {
            missingWord: {
                question: `${pre} _____ ${post}`.trim(),
                answer: choice.clean,
                options: [...distractors, choice.clean].sort(() => Math.random() - 0.5)
            }
        };
    }
});

saveVerses(verses);
