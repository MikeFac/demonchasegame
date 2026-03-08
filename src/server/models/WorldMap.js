const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * WorldMap Schema
 * Stores the physical layout and generation parameters for a specific mission map.
 */
const WorldMapSchema = new Schema({
  worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
  missionId: { type: String, required: true }, // Which mission this map belongs to
  name: String,
  
  // Map generation parameters (so maps can be regenerated or modified)
  generatorType: { 
    type: String, 
    enum: ['classic', 'narrow', 'labyrinth', 'open', 'city', 'custom'],
    required: true 
  },
  seed: Number,               // For deterministic regeneration
  parameters: {               // Generator-specific parameters
    streetSpacing: Number,
    roadWidth: Number,
    buildingDensity: Number,
    wallDensity: Number,
    mazeWidth: Number,
    mazeHeight: Number
  },
  
  // Saved map data (for custom-edited or stable maps)
  wallData: Schema.Types.Mixed,      // Stored wall array/objects
  terrainData: Schema.Types.Mixed,   // Terrain/decoration data (trees, bushes, etc.)
  customWalls: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],
  removedWalls: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],
  playerSpawn: {
    x: Number,
    y: Number
  },
  
  // Visual Metadata
  width: Number,              // Map width in pixels
  height: Number,             // Map height in pixels
  theme: String               // Visual theme override
}, { 
  timestamps: true 
});

module.exports = mongoose.model('WorldMap', WorldMapSchema);
