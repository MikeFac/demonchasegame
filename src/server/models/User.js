const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Schema
 * Represents a registered player authenticated via Clerk.js.
 * 
 * Consent fields do NOT have defaults — they must be explicitly set to `true`
 * during registration. This prevents accidental creation of users without consent.
 */
const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true, index: true },
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must be at most 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    trim: true
  },
  displayName: String,
  email: String,               // From Clerk, for account recovery
  avatarUrl: String,           // From Clerk profile
  
  // Consent tracking — no defaults, must be set explicitly
  agreedToTerms: { type: Boolean, required: true },
  agreedToPrivacy: { type: Boolean, required: true },
  ageVerified: { type: Boolean, required: true },     // Confirmed ≥16
  consentDate: { type: Date, required: true },
  
  // Game profile
  totalXP: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  totalPlayTime: { type: Number, default: 0 },      // seconds
  
  // World creation
  worldsCreated: [{ type: Schema.Types.ObjectId, ref: 'World' }],
  worldsJoined: [{ type: Schema.Types.ObjectId, ref: 'World' }],
  
  // Group memberships (one-to-many: user can belong to multiple groups)
  groups: [{
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'deleted'], 
    default: 'active' 
  },
  lastLoginAt: Date
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
