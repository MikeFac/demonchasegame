const fs = require('fs');

try {
    const content = fs.readFileSync('bible-verses.js', 'utf8');
    // Extract the array part or simple eval
    // We wrap it to return the data
    const evalCode = content + '; return loadSelectedVerses();';
    const loader = new Function(evalCode);
    const verses = loader();

    console.log(`Loaded ${verses.length} verses.`);

    const cleaned = verses.map(v => ({
        Id: v.Id,
        // RENAME Name -> Category
        Category: v.Name || v.category || v.Category,
        Reference: v.Reference,
        Text: v.Text
    }));

    // Check if Category is missing
    if (cleaned.some(v => !v.Category)) {
        console.warn("Warning: Some verses likely missing Category field.");
    }

    const newContent = `function loadSelectedVerses() {
  return ${JSON.stringify(cleaned, null, 2)};
}

// Validation for Node.js usage
if (typeof module !== 'undefined') {
  module.exports = loadSelectedVerses;
}
`;

    fs.writeFileSync('bible-verses.js', newContent);
    console.log('Successfully cleaned bible-verses.js (Renamed Name -> Category)');
} catch (err) {
    console.error('Error cleaning file:', err);
    process.exit(1);
}
