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

const StudyPlanSourceSchema = new mongoose.Schema({
  verseReference: {
    type: String,
    required: true,
    index: true
  },
  verseText: {
    type: String,
    required: true
  },
  category: String,
  sourceSermonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sermon'
  },
  generationMethod: {
    type: String,
    enum: ['source'],
    default: 'source'
  },
  promptVersion: {
    type: String,
    default: 'study-plan-english-v1'
  },
  sourceLang: {
    type: String,
    default: 'en'
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

StudyPlanSourceSchema.index({ verseReference: 1, sourceLang: 1 }, { unique: true });
StudyPlanSourceSchema.index({ verseReference: 1, createdAt: -1 });

module.exports = mongoose.model('StudyPlanSource', StudyPlanSourceSchema);
