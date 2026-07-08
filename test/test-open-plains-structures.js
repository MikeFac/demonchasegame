const assert = require('assert');
const Constants = require('../src/shared/Constants');
const WallGrid = require('../src/shared/WallGrid');
const MapGeneratorFactory = require('../src/shared/map-generators');

const map = MapGeneratorFactory.generateMap('open', Constants.WORLD_WIDTH, Constants.WORLD_HEIGHT, Constants.CELL_SIZE);
const wallGrid = new WallGrid(map.grid, map.rows, map.cols, Constants.CELL_SIZE);

const storyLocations = [
  { stone: { x: 650, y: 650 }, guard: { x: 760, y: 720 }, entry: { x: 675, y: 815 } },
  { stone: { x: 2350, y: 650 }, guard: { x: 2275, y: 730 }, entry: { x: 2335, y: 815 } },
  { stone: { x: 1500, y: 1300 }, guard: { x: 1620, y: 1275 }, entry: { x: 1550, y: 1440 } },
  { stone: { x: 850, y: 2300 }, guard: { x: 970, y: 2200 }, entry: { x: 935, y: 2150 } },
  { stone: { x: 2250, y: 2300 }, guard: { x: 2175, y: 2200 }, entry: { x: 2235, y: 2150 } }
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
