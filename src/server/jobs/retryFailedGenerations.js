const VerseSong = require('../models/VerseSong');
const { generateVerseSong } = require('../services/SunoService');

/**
 * Retry failed generation attempts (max 3 per verse)
 * Run every 30 minutes
 */
async function retryFailedGenerations() {
  try {
    const failed = await VerseSong.find({
      generationStatus: 'failed',
      generationAttempts: { $lt: 3 }
    }).limit(10);

    if (failed.length > 0) {
      console.log(`🔄 Retrying ${failed.length} failed generations...`);
    }

    for (const verseSong of failed) {
      verseSong.generationStatus = 'pending';
      verseSong.generationAttempts = (verseSong.generationAttempts || 0) + 1;
      await verseSong.save();

      // Queue generation
      setImmediate(() => {
        generateVerseSong(verseSong._id).catch(err => {
          console.error(`Retry error for ${verseSong.verseReference}:`, err);
        });
      });
    }
  } catch (err) {
    console.error('Error in retryFailedGenerations:', err);
  }
}

module.exports = { retryFailedGenerations };
