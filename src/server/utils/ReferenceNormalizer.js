/**
 * Normalize verse references to canonical format
 * Examples:
 *   "John 3:16" → "john-3-16"
 *   "1 Corinthians 15:57" → "1corinthians-15-57"
 *   "Matthew 18:21-22" → "matthew-18-21-22"
 */

function normalizeReference(reference) {
  if (!reference) return '';

  return reference
    .toLowerCase()           // Lowercase
    .replace(/\s+/g, '')    // Remove all spaces
    .replace(/:/g, '-')     // Colons to dashes
    .replace(/[^\w-]/g, ''); // Remove non-word chars except dashes
}

/**
 * Extract book name from reference (without numbers)
 * Examples:
 *   "John 3:16" → "John"
 *   "1 Corinthians 15:57" → "1 Corinthians"
 */
function extractBook(reference) {
  if (!reference) return '';

  const match = reference.match(/^([A-Za-z\s0-9]+?)\s+(\d+)/);
  return match ? match[1].trim() : reference;
}

module.exports = {
  normalizeReference,
  extractBook
};
