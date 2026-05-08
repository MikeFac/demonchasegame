const mongoose = require('mongoose');

const SermonSchema = new mongoose.Schema({
  verseReference: {
    type: String,
    required: true,
    index: true
  },
  lang: {
    type: String,
    default: 'en',
    index: true
  },
  verseText: {
    type: String,
    required: true
  },
  category: String,

  // Paginated sermon content — each element is one screen of text
  pages: {
    type: [String],
    default: []
  },
  // Concluding prayer (displayed as the final page)
  prayer: {
    type: String,
    default: ''
  },

  // Generation metadata
  model: {
    type: String,
    default: 'openrouter/auto'
  },
  generationStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  generationError: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index: find most recent sermon for a verse in a specific language
SermonSchema.index({ verseReference: 1, lang: 1, createdAt: -1 });

module.exports = mongoose.model('Sermon', SermonSchema);
