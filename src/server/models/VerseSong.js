const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VerseSongSchema = new Schema({
  // Verse Identifier (Primary Key - now supports multiple versions)
  verseReference: {
    type: String,
    required: true,
    index: true
    // e.g. "John 3:16" or "john-3-16" (normalized)
  },

  verseReferenceFull: {
    type: String,
    // Original format with proper spacing/capitalization
    // e.g. "John 3:16"
  },

  version: {
    type: Number,
    default: 1,
    min: 1
    // Version number for multi-song support (1, 2, 3, etc.)
  },

  book: String,           // "John"
  chapter: Number,        // 3
  startVerse: Number,     // 16
  endVerse: Number,       // Optional, for ranges
  category: String,       // From bible-verses.js (e.g., "Love", "Courage")
  verseText: String,      // Full verse text (for generation prompt)

  // Song Generation & Storage
  sunoId: {
    type: String,
    index: true
    // Suno API ID for this generated song (unique per generation)
  },
  audioUrl: String,       // e.g. "/audio/john-3-16-abc123.mp3"
  audioPath: String,      // Local file path on server
  duration: Number,       // Seconds

  // Generation Metadata
  generationStyle: String,  // "pop", "rock", "acoustic", etc.
  generationPrompt: String, // Exact lyrics sent to Suno
  generationRequestId: {
    type: String,
    index: true
    // For polling Suno status
  },
  generationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  generationAttempts: {
    type: Number,
    default: 0
  },
  generationError: String,
  generatedAt: Date,

  // Usage & Learning Analytics
  playCount: {
    type: Number,
    default: 0
  },
  learnCount: {
    type: Number,
    default: 0
    // Times player answered quiz correctly while/after hearing song
  },
  averageRetention: {
    type: Number,
    default: 0
    // 0-1 estimate: learnCount / (playCount || 1)
  },
  lastPlayedAt: Date,

  // Quality Metrics
  qualityScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
    // Effectiveness score: (learnCount / playCount) * 100
    // Higher = better learning outcomes
  },

  // Status & Quality
  status: {
    type: String,
    enum: ['active', 'archived', 'failed_generation'],
    default: 'active',
    index: true
  },

  isActiveVersion: {
    type: Boolean,
    default: true,
    index: true
    // false if retired due to low qualityScore
    // Inactive versions won't be selected for playback
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
VerseSongSchema.index({ verseReference: 1, version: 1 }, { unique: true }); // One song per version
VerseSongSchema.index({ verseReference: 1, isActiveVersion: 1 }); // Active versions lookup
VerseSongSchema.index({ verseReference: 1, qualityScore: -1 }); // Best quality first
VerseSongSchema.index({ generationStatus: 1, generationRequestId: 1 });
VerseSongSchema.index({ playCount: -1 });
VerseSongSchema.index({ category: 1 });
VerseSongSchema.index({ qualityScore: -1, playCount: 1 }); // Quality + rotation

module.exports = mongoose.model('VerseSong', VerseSongSchema);
