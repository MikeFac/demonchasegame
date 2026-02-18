var ClassicMaze, NarrowPaths, ComplexLabyrinth, OpenPlains, GridCity;

if (typeof module !== 'undefined' && module.exports) {
    ClassicMaze = require('./ClassicMaze');
    NarrowPaths = require('./NarrowPaths');
    ComplexLabyrinth = require('./ComplexLabyrinth');
    OpenPlains = require('./OpenPlains');
    GridCity = require('./GridCity');
} else {
    ClassicMaze = window.ClassicMaze;
    NarrowPaths = window.NarrowPaths;
    ComplexLabyrinth = window.ComplexLabyrinth;
    OpenPlains = window.OpenPlains;
    GridCity = window.GridCity;
}

var GENERATORS = {
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
    var generator = GENERATORS[style] || ClassicMaze;
    console.log('Generating map with style: ' + (style || 'classic (default)'));
    return generator(width, height, cellSize);
}

var MapGeneratorsExports = {
    generateMap: generateMap,
    AVAILABLE_STYLES: Object.keys(GENERATORS)
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapGeneratorsExports;
} else {
    window.MapGenerators = MapGeneratorsExports;
}
