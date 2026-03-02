const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * PlayerProgress Schema
 * Stores mission progress, stars, and XP for a specific user.
 * This is synced with the client-side ProgressManager (localStorage).
 */
const PlayerProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Mission progress (mirrors ProgressManager localStorage structure)
  completedMissions: [String],
  currentWorldId: { type: String, default: 'chapter1' },
  unlockedWorlds: [String],
  missionStars: { type: Map, of: Number },   // missionId → stars (1-3)
  
  // Verse learning progress
  versesLearned: [String],                    // verse references mastered
  verseAttempts: { type: Map, of: Number },   // verseRef → attempt count
  dailyChallengeStreak: { type: Number, default: 0 },
  lastDailyChallengeDate: String,
  
  // Game stats
  totalXP: { type: Number, default: 0 },
  highestLevel: { type: Number, default: 1 },
  monstersDefeated: { type: Number, default: 0 },
  
  // Sync metadata
  lastSyncedAt: Date,
  syncVersion: { type: Number, default: 0 }  // Optimistic concurrency
}, { 
  timestamps: true 
});

// One progress record per user
PlayerProgressSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('PlayerProgress', PlayerProgressSchema);
