const Sermon = require('../models/Sermon');
const {
  DEFAULT_MODEL,
  ENGLISH_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION,
  ROMANIZATION_PROMPT_VERSION,
  generateEnglishDevotional,
  translateDevotionalToLanguage,
  transliterateHindiDevotionalToRomanized
} = require('./DevotionalGenerationService');

const generationJobs = new Map();
const creationLocks = new Map();

function normalizeLang(lang) {
  return (lang || 'en').toLowerCase();
}

function getSermonJobKey(verseReference, lang) {
  return `${normalizeLang(lang)}::${verseReference}`;
}

function getCreationKey(verseReference, lang) {
  return `create::${getSermonJobKey(verseReference, lang)}`;
}

async function findLatestSermon(verseReference, lang, generationStatus) {
  return Sermon.findOne({
    verseReference,
    lang: normalizeLang(lang),
    generationStatus
  }).sort({ createdAt: -1 });
}

async function findExistingSermon(verseReference, lang) {
  const completed = await findLatestSermon(verseReference, lang, 'completed');
  if (completed) {
    return completed;
  }

  const pending = await findLatestSermon(verseReference, lang, 'pending');
  if (pending) {
    return pending;
  }

  return findLatestSermon(verseReference, lang, 'failed');
}

async function createPendingSermon(verseReference, verseText, category, lang, overrides) {
  const sermon = new Sermon({
    verseReference,
    lang: normalizeLang(lang),
    verseText,
    category,
    generationStatus: 'pending',
    model: DEFAULT_MODEL,
    ...overrides
  });

  await sermon.save();
  return sermon;
}

async function createFailedSermon(verseReference, verseText, category, lang, errorMessage, overrides) {
  const sermon = new Sermon({
    verseReference,
    lang: normalizeLang(lang),
    verseText,
    category,
    generationStatus: 'failed',
    generationError: errorMessage,
    model: DEFAULT_MODEL,
    ...overrides
  });

  await sermon.save();
  return sermon;
}

async function updateSermonCompleted(sermon, result, overrides) {
  sermon.pages = result.pages;
  sermon.prayer = result.prayer;
  sermon.model = result.model || DEFAULT_MODEL;
  sermon.generationStatus = 'completed';
  sermon.generationError = undefined;
  Object.assign(sermon, overrides || {});
  await sermon.save();
  return sermon;
}

async function updateSermonFailed(sermon, errorMessage, overrides) {
  sermon.generationStatus = 'failed';
  sermon.generationError = errorMessage;
  Object.assign(sermon, overrides || {});
  await sermon.save();
  return sermon;
}

function triggerJob(jobKey, runner) {
  if (generationJobs.has(jobKey)) {
    return generationJobs.get(jobKey);
  }

  const job = runner().finally(function() {
    generationJobs.delete(jobKey);
  });

  generationJobs.set(jobKey, job);
  return job;
}

function withCreationLock(creationKey, runner) {
  if (creationLocks.has(creationKey)) {
    return creationLocks.get(creationKey);
  }

  const job = runner().finally(function() {
    creationLocks.delete(creationKey);
  });

  creationLocks.set(creationKey, job);
  return job;
}

async function getOrCreatePendingSermon(verseReference, verseText, category, lang, overrides) {
  const creationKey = getCreationKey(verseReference, lang);
  return withCreationLock(creationKey, async function() {
    const existing = await findExistingSermon(verseReference, lang);
    if (existing) {
      return existing;
    }
    return createPendingSermon(verseReference, verseText, category, lang, overrides);
  });
}

async function getOrCreateFailedSermon(verseReference, verseText, category, lang, errorMessage, overrides) {
  const creationKey = getCreationKey(verseReference, lang);
  return withCreationLock(creationKey, async function() {
    const existing = await findExistingSermon(verseReference, lang);
    if (existing) {
      if (existing.generationStatus === 'pending') {
        return updateSermonFailed(existing, errorMessage, overrides);
      }
      return existing;
    }
    return createFailedSermon(verseReference, verseText, category, lang, errorMessage, overrides);
  });
}

async function generateEnglishSermon(sermon) {
  try {
    const result = await generateEnglishDevotional(
      sermon.verseReference,
      sermon.verseText,
      sermon.category || 'General'
    );
    return updateSermonCompleted(sermon, result, {
      sourceLang: 'en',
      generationMethod: 'author',
      promptVersion: result.promptVersion || ENGLISH_PROMPT_VERSION
    });
  } catch (err) {
    console.error(`English sermon generation failed for ${sermon.verseReference}:`, err.message);
    return updateSermonFailed(sermon, err.message, {
      sourceLang: 'en',
      generationMethod: 'author',
      promptVersion: ENGLISH_PROMPT_VERSION
    });
  }
}

function triggerEnglishGeneration(sermon) {
  const jobKey = getSermonJobKey(sermon.verseReference, 'en');
  return triggerJob(jobKey, function() {
    return generateEnglishSermon(sermon);
  });
}

async function ensureEnglishSource(verseReference, verseText, category) {
  const existing = await findExistingSermon(verseReference, 'en');
  if (existing) {
    if (existing.generationStatus === 'pending') {
      triggerEnglishGeneration(existing);
    }
    return existing;
  }

  const sermon = await getOrCreatePendingSermon(verseReference, verseText, category, 'en', {
    sourceLang: 'en',
    generationMethod: 'author',
    promptVersion: ENGLISH_PROMPT_VERSION
  });
  if (sermon.generationStatus === 'pending') {
    triggerEnglishGeneration(sermon);
  }
  return sermon;
}

async function generateTranslatedSermon(sermon, sourceSermon) {
  try {
    const result = await translateDevotionalToLanguage(sourceSermon, sermon.verseText, sermon.lang);
    return updateSermonCompleted(sermon, result, {
      sourceLang: 'en',
      derivedFromSermonId: sourceSermon._id,
      generationMethod: 'translate',
      promptVersion: result.promptVersion || TRANSLATION_PROMPT_VERSION
    });
  } catch (err) {
    console.error(`Sermon translation failed for ${sermon.verseReference} (${sermon.lang}):`, err.message);
    return updateSermonFailed(sermon, err.message, {
      sourceLang: 'en',
      derivedFromSermonId: sourceSermon._id,
      generationMethod: 'translate',
      promptVersion: TRANSLATION_PROMPT_VERSION
    });
  }
}

function triggerTranslatedGeneration(sermon, sourceSermon) {
  const jobKey = getSermonJobKey(sermon.verseReference, sermon.lang);
  return triggerJob(jobKey, function() {
    return generateTranslatedSermon(sermon, sourceSermon);
  });
}

async function ensureTranslatedVariant(verseReference, verseText, category, lang, sourceSermon) {
  const existing = await findExistingSermon(verseReference, lang);
  if (existing) {
    if (existing.generationStatus === 'pending') {
      triggerTranslatedGeneration(existing, sourceSermon);
    }
    return existing;
  }

  const sermon = await getOrCreatePendingSermon(verseReference, verseText, category, lang, {
    sourceLang: 'en',
    derivedFromSermonId: sourceSermon._id,
    generationMethod: 'translate',
    promptVersion: TRANSLATION_PROMPT_VERSION
  });
  if (sermon.generationStatus === 'pending') {
    triggerTranslatedGeneration(sermon, sourceSermon);
  }
  return sermon;
}

async function generateRomanizedHindiSermon(sermon, hindiSermon) {
  try {
    const result = await transliterateHindiDevotionalToRomanized(hindiSermon, sermon.verseText);
    return updateSermonCompleted(sermon, result, {
      sourceLang: 'hi',
      derivedFromSermonId: hindiSermon._id,
      generationMethod: 'transliterate',
      promptVersion: result.promptVersion || ROMANIZATION_PROMPT_VERSION
    });
  } catch (err) {
    console.error(`Romanized Hindi sermon transliteration failed for ${sermon.verseReference}:`, err.message);
    return updateSermonFailed(sermon, err.message, {
      sourceLang: 'hi',
      derivedFromSermonId: hindiSermon._id,
      generationMethod: 'transliterate',
      promptVersion: ROMANIZATION_PROMPT_VERSION
    });
  }
}

function triggerRomanizedHindiGeneration(sermon, hindiSermon) {
  const jobKey = getSermonJobKey(sermon.verseReference, sermon.lang);
  return triggerJob(jobKey, function() {
    return generateRomanizedHindiSermon(sermon, hindiSermon);
  });
}

async function ensureRomanizedHindiVariant(verseReference, verseText, category) {
  const existing = await findExistingSermon(verseReference, 'hi-rom');
  if (existing) {
    if (existing.generationStatus === 'pending') {
      const hindiSermon = await findLatestSermon(verseReference, 'hi', 'completed');
      if (hindiSermon) {
        triggerRomanizedHindiGeneration(existing, hindiSermon);
      }
    }
    return existing;
  }

  const hindiSermon = await getOrGenerateSermon(verseReference, verseText, category, 'hi');
  if (hindiSermon.generationStatus === 'failed') {
    return getOrCreateFailedSermon(
      verseReference,
      verseText,
      category,
      'hi-rom',
      hindiSermon.generationError || 'Hindi devotional generation failed',
      {
        sourceLang: 'hi',
        derivedFromSermonId: hindiSermon._id,
        generationMethod: 'transliterate',
        promptVersion: ROMANIZATION_PROMPT_VERSION
      }
    );
  }

  if (hindiSermon.generationStatus !== 'completed') {
    return getOrCreatePendingSermon(verseReference, verseText, category, 'hi-rom', {
      sourceLang: 'hi',
      generationMethod: 'transliterate',
      promptVersion: ROMANIZATION_PROMPT_VERSION
    });
  }

  const sermon = await getOrCreatePendingSermon(verseReference, verseText, category, 'hi-rom', {
    sourceLang: 'hi',
    derivedFromSermonId: hindiSermon._id,
    generationMethod: 'transliterate',
    promptVersion: ROMANIZATION_PROMPT_VERSION
  });
  if (sermon.generationStatus === 'pending') {
    triggerRomanizedHindiGeneration(sermon, hindiSermon);
  }
  return sermon;
}

async function getOrGenerateSermon(verseReference, verseText, category, lang) {
  const sermonLang = normalizeLang(lang);
  const existing = await findExistingSermon(verseReference, sermonLang);

  if (existing && existing.generationStatus === 'completed') {
    return existing;
  }

  if (sermonLang === 'en') {
    if (existing && existing.generationStatus === 'pending') {
      triggerEnglishGeneration(existing);
      return existing;
    }
    if (existing && existing.generationStatus === 'failed') {
      return existing;
    }
    return ensureEnglishSource(verseReference, verseText, category);
  }

  if (sermonLang === 'hi-rom') {
    if (existing && existing.generationStatus === 'pending') {
      const hindiCompleted = await findLatestSermon(verseReference, 'hi', 'completed');
      if (hindiCompleted) {
        triggerRomanizedHindiGeneration(existing, hindiCompleted);
      } else {
        const hindiSermon = await getOrGenerateSermon(verseReference, verseText, category, 'hi');
        if (hindiSermon.generationStatus === 'failed') {
          return updateSermonFailed(
            existing,
            hindiSermon.generationError || 'Hindi devotional generation failed',
            {
              sourceLang: 'hi',
              derivedFromSermonId: hindiSermon._id,
              generationMethod: 'transliterate',
              promptVersion: ROMANIZATION_PROMPT_VERSION
            }
          );
        }
      }
      return existing;
    }
    if (existing && existing.generationStatus === 'failed') {
      return existing;
    }
    return ensureRomanizedHindiVariant(verseReference, verseText, category);
  }

  const englishSource = await ensureEnglishSource(verseReference, verseText, category);
  if (englishSource.generationStatus === 'completed') {
    if (existing && existing.generationStatus === 'pending') {
      triggerTranslatedGeneration(existing, englishSource);
      return existing;
    }
    if (existing && existing.generationStatus === 'failed') {
      return existing;
    }
    return ensureTranslatedVariant(verseReference, verseText, category, sermonLang, englishSource);
  }

  if (englishSource.generationStatus === 'failed') {
    if (existing) {
      if (existing.generationStatus === 'pending') {
        return updateSermonFailed(
          existing,
          englishSource.generationError || 'English devotional generation failed',
          {
            sourceLang: 'en',
            derivedFromSermonId: englishSource._id,
            generationMethod: 'translate',
            promptVersion: TRANSLATION_PROMPT_VERSION
          }
        );
      }
      return existing;
    }
    return getOrCreateFailedSermon(
      verseReference,
      verseText,
      category,
      sermonLang,
      englishSource.generationError || 'English devotional generation failed',
      {
        sourceLang: 'en',
        derivedFromSermonId: englishSource._id,
        generationMethod: 'translate',
        promptVersion: TRANSLATION_PROMPT_VERSION
      }
    );
  }

  if (existing) {
    return existing;
  }

  return getOrCreatePendingSermon(verseReference, verseText, category, sermonLang, {
    sourceLang: 'en',
    generationMethod: 'translate',
    promptVersion: TRANSLATION_PROMPT_VERSION
  });
}

async function regenerateSermon(verseReference, verseText, category, lang) {
  const sermonLang = normalizeLang(lang);
  await Sermon.deleteMany({ verseReference, lang: sermonLang });
  return getOrGenerateSermon(verseReference, verseText, category, sermonLang);
}

module.exports = {
  getOrGenerateSermon,
  regenerateSermon,
  generateSermonText: generateEnglishDevotional
};
