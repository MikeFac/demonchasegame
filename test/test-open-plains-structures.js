const assert = require('assert');
const Constants = require('../src/shared/Constants');
const WallGrid = require('../src/shared/WallGrid');
const MapGeneratorFactory = require('../src/shared/map-generators');

const map = MapGeneratorFactory.generateMap('open', 2000, 2000, Constants.CELL_SIZE);
const wallGrid = new WallGrid(map.grid, map.rows, map.cols, Constants.CELL_SIZE);

const storyLocations = [
  { stone: { x: 450, y: 450 }, guard: { x: 560, y: 520 }, entry: { x: 475, y: 615 } },
  { stone: { x: 1550, y: 450 }, guard: { x: 1530, y: 530 }, entry: { x: 1585, y: 615 } },
  { stone: { x: 1000, y: 900 }, guard: { x: 1075, y: 900 }, entry: { x: 1000, y: 1115 } },
  { stone: { x: 550, y: 1550 }, guard: { x: 575, y: 1500 }, entry: { x: 625, y: 1400 } },
  { stone: { x: 1550, y: 1550 }, guard: { x: 1550, y: 1500 }, entry: { x: 1535, y: 1400 } }
];

storyLocations.forEach((location, index) => {
  assert.strictEqual(
    wallGrid.collides(location.stone.x, location.stone.y, 28, 22),
    false,
    `Story stone ${index + 1} should be inside a clear OpenPlains structure`
  );
  assert.strictEqual(
    wallGrid.collides(location.guard.x, location.guard.y, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT),
    false,
    `Story guard ${index + 1} should fit inside the same structure`
  );
  assert.strictEqual(
    wallGrid.collides(location.entry.x, location.entry.y, Constants.PLAYER_WIDTH, Constants.PLAYER_HEIGHT),
    false,
    `Structure ${index + 1} should have a player-width entrance`
  );
});

console.log('test-open-plains-structures passed');
