const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VerseSongSchema = new Schema({
  // Verse Identifier (Primary Key)
  verseReference: {
    type: String,
    required: true,
    unique: true,
    index: true
    // e.g. "John 3:16"
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
    // Suno API ID for this generated song
  },
  audioUrl: String,       // e.g. "/content/audio/john-3-16.mp3"
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

  // Status & Quality
  status: {
    type: String,
    enum: ['active', 'archived', 'failed_generation'],
    default: 'active',
    index: true
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
VerseSongSchema.index({ generationStatus: 1, generationRequestId: 1 });
VerseSongSchema.index({ playCount: -1 });
VerseSongSchema.index({ category: 1 });

module.exports = mongoose.model('VerseSong', VerseSongSchema);
