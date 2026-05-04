/**
 * VerseSongService - Fetches and tracks educational verse songs
 * Non-blocking: queries server but plays fallback music while generating
 */
(function() {
  class VerseSongService {
    constructor() {
      this.cache = {};
      this.currentVerse = null;
    }

    _getLang() {
      return typeof I18n !== 'undefined' ? I18n.getLang() : 'en';
    }

    async getSongForVerse(verseReference) {
      if (this.cache[verseReference]) {
        return this.cache[verseReference];
      }

      try {
        const response = await fetch(
          `/api/verse-song?ref=${encodeURIComponent(verseReference)}&lang=${this._getLang()}`
        );

        if (!response.ok) {
          console.warn(`Error fetching song for ${verseReference}:`, response.status);
          return null;
        }

        const data = await response.json();

        // Cache the response
        this.cache[verseReference] = data;

        return data;
      } catch (err) {
        console.error(`Error fetching verse song for ${verseReference}:`, err);
        return null;
      }
    }

    /**
     * Record that a verse song was played
     */
    async recordPlay(verseReference, playDurationMs, wasLearned) {
      try {
        await fetch('/api/verse-song/record-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verseReference,
            playDurationMs,
            wasLearned,
            lang: this._getLang()
          })
        });
      } catch (err) {
        console.error(`Error recording play for ${verseReference}:`, err);
        // Fail silently—don't disrupt gameplay
      }
    }

    /**
     * Get cached data without fetching
     */
    getCached(verseReference) {
      return this.cache[verseReference] || null;
    }

    /**
     * Clear cache (e.g., on new game session)
     */
    clearCache() {
      this.cache = {};
    }
  }

  window.VerseSongService = new VerseSongService();
})();
