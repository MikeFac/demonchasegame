const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Group Schema
 * Represents a group (youth group, Bible study, etc.) that users can join.
 * Users can belong to multiple groups (one-to-many relationship).
 */
const GroupSchema = new Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    minlength: [4, 'Group code must be at least 4 characters'],
    maxlength: [20, 'Group code must be at most 20 characters'],
    match: [/^[A-Z0-9]+$/, 'Group code can only contain letters and numbers']
  },
  name: { 
    type: String, 
    required: true,
    minlength: [3, 'Group name must be at least 3 characters'],
    maxlength: [50, 'Group name must be at most 50 characters'],
    trim: true
  },
  description: { 
    type: String, 
    maxlength: [200, 'Description must be at most 200 characters'],
    default: ''
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  memberCount: { 
    type: Number, 
    default: 1 
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, { 
  timestamps: true 
});

GroupSchema.index({ createdBy: 1 });
GroupSchema.index({ status: 1 });

module.exports = mongoose.model('Group', GroupSchema);
