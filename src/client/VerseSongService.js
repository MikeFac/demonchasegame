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
      if (typeof I18n !== 'undefined') {
        if (typeof I18n.getContentLang === 'function') {
          return I18n.getContentLang();
        }
        return I18n.getLang();
      }
      return 'en';
    }

    _resolveLookupReference(verseReference) {
      if (!verseReference || typeof verseReference !== 'string') {
        return verseReference;
      }

      const trimmed = verseReference.trim();
      if (!trimmed) {
        return trimmed;
      }

      const maybeResolveFromList = (list) => {
        if (!Array.isArray(list)) return null;
        const match = list.find((verse) => verse && verse.Reference === trimmed && verse.EnglishRef);
        return match ? match.EnglishRef : null;
      };

      if (typeof window !== 'undefined') {
        if (window.organizedVerses && typeof window.organizedVerses === 'object') {
          for (const verses of Object.values(window.organizedVerses)) {
            const resolved = maybeResolveFromList(verses);
            if (resolved) {
              return resolved;
            }
          }
        }

        if (Array.isArray(window.allVerses)) {
          const resolved = maybeResolveFromList(window.allVerses);
          if (resolved) {
            return resolved;
          }
        }

        if (Array.isArray(window.reviewItems)) {
          const resolved = maybeResolveFromList(window.reviewItems);
          if (resolved) {
            return resolved;
          }
        }
      }

      return trimmed;
    }

    _shouldAutoGenerateMissingSongs() {
      return typeof window === 'undefined' || window.autoGenerateVerseSongs !== false;
    }

    async getSongForVerse(verseReference) {
      const lookupReference = this._resolveLookupReference(verseReference);
      const cacheKey = `${this._getLang()}::${lookupReference}`;

      if (this.cache[cacheKey]) {
        return this.cache[cacheKey];
      }

      try {
        const response = await fetch(
          `/api/verse-song?ref=${encodeURIComponent(lookupReference)}&lang=${this._getLang()}` +
          `&generate=${this._shouldAutoGenerateMissingSongs() ? 'true' : 'false'}`
        );

        if (!response.ok) {
          console.warn(`Error fetching song for ${lookupReference}:`, response.status);
          return null;
        }

        const data = await response.json();

        // Cache the response
        this.cache[cacheKey] = data;

        return data;
      } catch (err) {
        console.error(`Error fetching verse song for ${lookupReference}:`, err);
        return null;
      }
    }

    /**
     * Record that a verse song was played
     */
    async recordPlay(verseReference, playDurationMs, wasLearned) {
      try {
        const lookupReference = this._resolveLookupReference(verseReference);
        await fetch('/api/verse-song/record-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verseReference: lookupReference,
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
      const lookupReference = this._resolveLookupReference(verseReference);
      const cacheKey = `${this._getLang()}::${lookupReference}`;
      return this.cache[cacheKey] || null;
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
