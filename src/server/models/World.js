const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * World Schema
 * Represents a collection of chapters and missions created by a user.
 */
const WorldSchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  
  // Author
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: String,
  
  // Visibility & sharing
  visibility: { 
    type: String, 
    enum: ['private', 'unlisted', 'public'], 
    default: 'private' 
  },
  shareCode: { type: String, unique: true, sparse: true },  // Short code for sharing
  
  // Content structure (Chapters)
  chapters: [{
    id: String,
    name: String,
    description: String,
    nodeShape: { type: String, enum: ['shield', 'heart', 'sword', 'star', 'cross'] },
    theme: String,
    missionIds: [String],
    unlockRequirement: {
      chapterId: String,
      missionsCompleted: Number
    }
  }],
  
  // Mission definitions (stored inline for portability)
  missions: [{
    id: String,
    name: String,
    description: String,
    difficulty: { type: String, default: 'normal' },
    category: String,
    mapStyle: String,
    spawnRate: Number,
    monsterTypes: [String],
    qualities: [String],
    monsters: [String],
    monsterDamageFactor: Number,
    monsterSpeed: Number,
    playerSpeed: Number,
    maxMonsters: Number,
    monstersToKill: Number,
    xpMultiplier: Number,
    objectives: Schema.Types.Mixed,
    customVerses: [Schema.Types.Mixed],  // Optional custom verse sets
    fixedMonsters: [{
      x: Number,
      y: Number,
      demonType: String,
      behavior: {
        type: String,
        patrolRadius: Number,
        patrolPath: [{ x: Number, y: Number }]
      },
      stats: {
        healthMultiplier: Number,
        damageMultiplier: Number,
        speedMultiplier: Number
      },
      spawnTrigger: {
        type: { type: String },
        value: Number
      },
      isBoss: Boolean,
      label: String
    }],
    randomSpawnsEnabled: { type: Boolean, default: true },
    randomSpawnBudget: Number
  }],
  
  // Reference to physical map data
  mapIds: [{ type: Schema.Types.ObjectId, ref: 'WorldMap' }],
  
  // External Incentives (for Pastors/Parents)
  externalRewards: [{
    title: { type: String, required: true },  // e.g., "Pizza Night"
    description: String,
    requirement: {
      type: { type: String, enum: ['xp', 'missions', 'stars', 'verses'], required: true },
      value: { type: Number, required: true }, // e.g., 5000 XP or 10 Missions
      worldId: String                           // Optional: specific to a chapter
    },
    status: { type: String, enum: ['active', 'archived'], default: 'active' }
  }],
  
  // Engagement Stats
  playCount: { type: Number, default: 0 },
  uniquePlayerCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  
  // World Gameplay Settings
  maxPlayers: { type: Number, default: 4 },
  gameMode: { type: String, default: 'mission' },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('World', WorldSchema);
