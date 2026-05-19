const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  help: {
    type: String,
    default: ''
  }
}, { _id: false });

const StudyPlanVariantSchema = new mongoose.Schema({
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
  sourceLang: {
    type: String,
    default: 'en'
  },
  sourceStudyPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPlanSource'
  },
  generationMethod: {
    type: String,
    enum: ['translate'],
    default: 'translate'
  },
  promptVersion: {
    type: String,
    default: 'study-plan-translation-v1'
  },
  devotionalText: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  questions: {
    type: [QuestionSchema],
    default: []
  },
  application: {
    type: String,
    default: ''
  },
  prayer: {
    type: String,
    default: ''
  },
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

StudyPlanVariantSchema.index({ verseReference: 1, lang: 1 }, { unique: true });
StudyPlanVariantSchema.index({ sourceStudyPlanId: 1 });
StudyPlanVariantSchema.index({ verseReference: 1, createdAt: -1 });

module.exports = mongoose.model('StudyPlanVariant', StudyPlanVariantSchema);
