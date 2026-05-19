const StudyPlanSource = require('../models/StudyPlanSource');
const StudyPlanVariant = require('../models/StudyPlanVariant');
const { getOrGenerateSermon } = require('./SermonService');
const {
  DEFAULT_MODEL,
  ENGLISH_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION,
  generateEnglishStudyPlan,
  translateStudyPlanToLanguage
} = require('./StudyPlanGenerationService');

const generationJobs = new Map();
const creationLocks = new Map();

function normalizeLang(lang) {
  return (lang || 'en').toLowerCase();
}

function getJobKey(verseReference, lang) {
  return `${normalizeLang(lang)}::${verseReference}`;
}

function getCreationKey(verseReference, lang) {
  return `create::${getJobKey(verseReference, lang)}`;
}

function buildDevotionalText(sermon) {
  const pages = Array.isArray(sermon.pages) ? sermon.pages : [];
  const devotionalParts = [...pages];
  if (sermon.prayer) {
    devotionalParts.push(`Prayer:\n${sermon.prayer}`);
  }
  return devotionalParts.join('\n\n');
}

async function findLatestSource(verseReference) {
  return StudyPlanSource.findOne({ verseReference }).sort({ createdAt: -1 });
}

async function findLatestVariant(verseReference, lang) {
  return StudyPlanVariant.findOne({
    verseReference,
    lang: normalizeLang(lang)
  }).sort({ createdAt: -1 });
}

async function findExistingSource(verseReference) {
  const completed = await StudyPlanSource.findOne({ verseReference, generationStatus: 'completed' }).sort({ createdAt: -1 });
  if (completed) return completed;
  const pending = await StudyPlanSource.findOne({ verseReference, generationStatus: 'pending' }).sort({ createdAt: -1 });
  if (pending) return pending;
  return StudyPlanSource.findOne({ verseReference, generationStatus: 'failed' }).sort({ createdAt: -1 });
}

async function findExistingVariant(verseReference, lang) {
  const normalizedLang = normalizeLang(lang);
  const completed = await StudyPlanVariant.findOne({ verseReference, lang: normalizedLang, generationStatus: 'completed' }).sort({ createdAt: -1 });
  if (completed) return completed;
  const pending = await StudyPlanVariant.findOne({ verseReference, lang: normalizedLang, generationStatus: 'pending' }).sort({ createdAt: -1 });
  if (pending) return pending;
  return StudyPlanVariant.findOne({ verseReference, lang: normalizedLang, generationStatus: 'failed' }).sort({ createdAt: -1 });
}

async function createPendingSource(verseReference, verseText, category, overrides) {
  const source = new StudyPlanSource({
    verseReference,
    verseText,
    category,
    generationStatus: 'pending',
    model: DEFAULT_MODEL,
    ...overrides
  });
  await source.save();
  return source;
}

async function createFailedSource(verseReference, verseText, category, errorMessage, overrides) {
  const source = new StudyPlanSource({
    verseReference,
    verseText,
    category,
    generationStatus: 'failed',
    generationError: errorMessage,
    model: DEFAULT_MODEL,
    ...overrides
  });
  await source.save();
  return source;
}

async function updateSourceCompleted(source, result, overrides) {
  source.title = result.title;
  source.summary = result.summary;
  source.questions = result.questions;
  source.application = result.application;
  source.prayer = result.prayer;
  source.model = result.model || DEFAULT_MODEL;
  source.generationStatus = 'completed';
  source.generationError = undefined;
  Object.assign(source, overrides || {});
  await source.save();
  return source;
}

async function updateSourceFailed(source, errorMessage, overrides) {
  source.generationStatus = 'failed';
  source.generationError = errorMessage;
  Object.assign(source, overrides || {});
  await source.save();
  return source;
}

async function createPendingVariant(verseReference, verseText, category, lang, overrides) {
  const variant = new StudyPlanVariant({
    verseReference,
    verseText,
    category,
    lang: normalizeLang(lang),
    generationStatus: 'pending',
    model: DEFAULT_MODEL,
    ...overrides
  });
  await variant.save();
  return variant;
}

async function createFailedVariant(verseReference, verseText, category, lang, errorMessage, overrides) {
  const variant = new StudyPlanVariant({
    verseReference,
    verseText,
    category,
    lang: normalizeLang(lang),
    generationStatus: 'failed',
    generationError: errorMessage,
    model: DEFAULT_MODEL,
    ...overrides
  });
  await variant.save();
  return variant;
}

async function updateVariantCompleted(variant, result, overrides) {
  variant.title = result.title;
  variant.summary = result.summary;
  variant.questions = result.questions;
  variant.application = result.application;
  variant.prayer = result.prayer;
  variant.model = result.model || DEFAULT_MODEL;
  variant.generationStatus = 'completed';
  variant.generationError = undefined;
  Object.assign(variant, overrides || {});
  await variant.save();
  return variant;
}

async function updateVariantFailed(variant, errorMessage, overrides) {
  variant.generationStatus = 'failed';
  variant.generationError = errorMessage;
  Object.assign(variant, overrides || {});
  await variant.save();
  return variant;
}

function triggerJob(jobKey, runner) {
  if (generationJobs.has(jobKey)) {
    return generationJobs.get(jobKey);
  }
  const job = runner().finally(() => {
    generationJobs.delete(jobKey);
  });
  generationJobs.set(jobKey, job);
  return job;
}

function withCreationLock(creationKey, runner) {
  if (creationLocks.has(creationKey)) {
    return creationLocks.get(creationKey);
  }
  const job = runner().finally(() => {
    creationLocks.delete(creationKey);
  });
  creationLocks.set(creationKey, job);
  return job;
}

async function generateSourcePlan(sourceDoc) {
  try {
    const result = await generateEnglishStudyPlan(
      sourceDoc.verseReference,
      sourceDoc.verseText,
      sourceDoc.devotionalText,
      sourceDoc.category || 'General'
    );
    return updateSourceCompleted(sourceDoc, result, {
      generationMethod: 'source',
      promptVersion: result.promptVersion || ENGLISH_PROMPT_VERSION
    });
  } catch (err) {
    console.error(`Study plan source generation failed for ${sourceDoc.verseReference}:`, err.message);
    return updateSourceFailed(sourceDoc, err.message, {
      generationMethod: 'source',
      promptVersion: ENGLISH_PROMPT_VERSION
    });
  }
}

function triggerSourceGeneration(sourceDoc) {
  const jobKey = getJobKey(sourceDoc.verseReference, 'en');
  return triggerJob(jobKey, () => generateSourcePlan(sourceDoc));
}

async function generateVariantPlan(variantDoc, sourceDoc) {
  try {
    const result = await translateStudyPlanToLanguage(
      sourceDoc,
      variantDoc.verseText,
      sourceDoc.devotionalText,
      variantDoc.lang
    );
    return updateVariantCompleted(variantDoc, result, {
      sourceLang: 'en',
      sourceStudyPlanId: sourceDoc._id,
      generationMethod: 'translate',
      promptVersion: result.promptVersion || TRANSLATION_PROMPT_VERSION
    });
  } catch (err) {
    console.error(`Study plan translation failed for ${variantDoc.verseReference} (${variantDoc.lang}):`, err.message);
    return updateVariantFailed(variantDoc, err.message, {
      sourceLang: 'en',
      sourceStudyPlanId: sourceDoc._id,
      generationMethod: 'translate',
      promptVersion: TRANSLATION_PROMPT_VERSION
    });
  }
}

function triggerVariantGeneration(variantDoc, sourceDoc) {
  const jobKey = getJobKey(variantDoc.verseReference, variantDoc.lang);
  return triggerJob(jobKey, () => generateVariantPlan(variantDoc, sourceDoc));
}

async function ensureSourceStudyPlan(verseReference, verseText, category, devotionalText, sermonId) {
  const existing = await findExistingSource(verseReference);
  if (existing) {
    if (existing.generationStatus === 'pending') {
      triggerSourceGeneration(existing);
    }
    return existing;
  }

  const sourceDoc = await withCreationLock(getCreationKey(verseReference, 'en'), async () => {
    const current = await findExistingSource(verseReference);
    if (current) return current;
    return createPendingSource(verseReference, verseText, category, {
      sourceLang: 'en',
      generationMethod: 'source',
      promptVersion: ENGLISH_PROMPT_VERSION,
      devotionalText,
      sourceSermonId: sermonId || undefined
    });
  });

  if (sourceDoc.generationStatus === 'pending') {
    triggerSourceGeneration(sourceDoc);
  }
  return sourceDoc;
}

async function ensureVariantStudyPlan(verseReference, verseText, category, lang, sourceDoc) {
  const existing = await findExistingVariant(verseReference, lang);
  if (existing) {
    if (existing.generationStatus === 'pending') {
      triggerVariantGeneration(existing, sourceDoc);
    }
    return existing;
  }

  const variantDoc = await withCreationLock(getCreationKey(verseReference, lang), async () => {
    const current = await findExistingVariant(verseReference, lang);
    if (current) return current;
    return createPendingVariant(verseReference, verseText, category, lang, {
      sourceLang: 'en',
      sourceStudyPlanId: sourceDoc._id,
      generationMethod: 'translate',
      promptVersion: TRANSLATION_PROMPT_VERSION,
      devotionalText: sourceDoc.devotionalText
    });
  });

  if (variantDoc.generationStatus === 'pending') {
    triggerVariantGeneration(variantDoc, sourceDoc);
  }
  return variantDoc;
}

async function getOrGenerateStudyPlan(verseReference, verseText, category, lang) {
  const normalizedLang = normalizeLang(lang);
  const sermon = await getOrGenerateSermon(verseReference, verseText, category, 'en');

  if (sermon.generationStatus === 'failed') {
    if (normalizedLang === 'en') {
      const existing = await findExistingSource(verseReference);
      if (existing) {
        return updateSourceFailed(existing, sermon.generationError || 'English devotional generation failed', {
          sourceSermonId: sermon._id,
          devotionalText: buildDevotionalText(sermon)
        });
      }
      return createFailedSource(
        verseReference,
        verseText,
        category,
        sermon.generationError || 'English devotional generation failed',
        {
          sourceSermonId: sermon._id,
          devotionalText: buildDevotionalText(sermon)
        }
      );
    }

    const existingVariant = await findExistingVariant(verseReference, normalizedLang);
    if (existingVariant) {
      return updateVariantFailed(existingVariant, sermon.generationError || 'English devotional generation failed', {
        sourceStudyPlanId: existingVariant.sourceStudyPlanId,
        devotionalText: buildDevotionalText(sermon)
      });
    }
    return createFailedVariant(
      verseReference,
      verseText,
      category,
      normalizedLang,
      sermon.generationError || 'English devotional generation failed',
      {
        devotionalText: buildDevotionalText(sermon)
      }
    );
  }

  if (sermon.generationStatus !== 'completed') {
    return {
      verseReference,
      lang: normalizedLang,
      generationStatus: 'pending',
      generationError: null
    };
  }

  const devotionalText = buildDevotionalText(sermon);
  const sourcePlan = await ensureSourceStudyPlan(
    verseReference,
    verseText,
    category,
    devotionalText,
    sermon._id
  );

  if (sourcePlan.generationStatus !== 'completed') {
    return sourcePlan;
  }

  if (normalizedLang === 'en') {
    return sourcePlan;
  }

  return ensureVariantStudyPlan(verseReference, verseText, category, normalizedLang, sourcePlan);
}

async function regenerateStudyPlan(verseReference, verseText, category, lang) {
  const normalizedLang = normalizeLang(lang);
  await StudyPlanSource.deleteMany({ verseReference });
  await StudyPlanVariant.deleteMany({ verseReference, lang: normalizedLang });
  return getOrGenerateStudyPlan(verseReference, verseText, category, normalizedLang);
}

module.exports = {
  getOrGenerateStudyPlan,
  regenerateStudyPlan
};
