const ClassicMaze = require('./ClassicMaze');
const NarrowPaths = require('./NarrowPaths');
const ComplexLabyrinth = require('./ComplexLabyrinth');
const OpenPlains = require('./OpenPlains');
const GridCity = require('./GridCity');

const GENERATORS = {
    'classic': ClassicMaze,
    'narrow': NarrowPaths,
    'labyrinth': ComplexLabyrinth,
    'open': OpenPlains,
    'city': GridCity
};

/**
 * Generates a map based on the requested style.
 * @param {string} style - One of: 'classic', 'narrow', 'labyrinth', 'open', 'city'
 * @param {number} width 
 * @param {number} height 
 * @param {number} cellSize 
 */
function generateMap(style, width, height, cellSize) {
    const generator = GENERATORS[style] || ClassicMaze;
    console.log(`Generating map with style: ${style || 'classic (default)'}`);
    return generator(width, height, cellSize);
}

module.exports = {
    generateMap,
    AVAILABLE_STYLES: Object.keys(GENERATORS)
};
