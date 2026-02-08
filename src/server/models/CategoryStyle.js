const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategoryStyleSchema = new Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    index: true
    // e.g. "Love", "Courage", "Joy", "Wisdom", "Knowledge", etc.
  },

  // Suno Style Descriptor
  generationStyle: {
    type: String,
    required: true
    // e.g. "pop", "rock", "acoustic", "disco", "celtic", "yacht rock"
  },

  // Human-readable description
  description: String,
  // e.g. "Fast-paced disco with strings—designed to evoke joy"

  // Override defaults
  generationDuration: {
    type: Number,
    default: 120
    // Seconds
  },
  repeatCount: {
    type: Number,
    default: 3
    // How many times to repeat the verse text
  },

  // Metadata
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

module.exports = mongoose.model('CategoryStyle', CategoryStyleSchema);
