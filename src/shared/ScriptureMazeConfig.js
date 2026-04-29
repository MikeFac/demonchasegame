(function () {
    'use strict';

    var DEFAULT_LAYOUT = [
        '###################',
        '#o...............o#',
        '#..###.....###....#',
        '#.................#',
        '#.###.##.#.##.###.#',
        '#.................#',
        '#..#....#.#....#..#',
        '#..#...........#..#',
        '#.......P.........#',
        '#..#...........#..#',
        '#..#....#.#....#..#',
        '#.................#',
        '#.###.##.#.##.###.#',
        '#o...............o#',
        '###################'
    ];

    var MAZES = {
        'faith-maze-01': {
            id: 'faith-maze-01',
            tileSize: 32,
            layout: DEFAULT_LAYOUT,
            playerSpawn: { col: 8, row: 8 },
            promptTiles: [
                { col: 1, row: 1 },
                { col: 17, row: 1 },
                { col: 1, row: 13 },
                { col: 17, row: 13 },
                { col: 9, row: 3 },
                { col: 9, row: 11 },
                { col: 4, row: 8 },
                { col: 14, row: 8 }
            ],
            demonSpawnTiles: [
                { col: 3, row: 2 },
                { col: 9, row: 2 },
                { col: 15, row: 2 },
                { col: 2, row: 7 },
                { col: 16, row: 7 },
                { col: 3, row: 12 },
                { col: 9, row: 12 },
                { col: 15, row: 12 }
            ]
        }
    };

    function cloneTile(tile) {
        return { col: tile.col, row: tile.row };
    }

    function createMissionConfig(mission) {
        mission = mission || {};
        var mazeId = mission.mazeId || 'faith-maze-01';
        var maze = MAZES[mazeId] || MAZES['faith-maze-01'];
        var missionQualities = Array.isArray(mission.qualities) && mission.qualities.length
            ? mission.qualities.slice()
            : ['Faith', 'Courage', 'Love', 'Hope'];
        var demonRoster = Array.isArray(mission.demonRoster) && mission.demonRoster.length
            ? mission.demonRoster.slice()
            : ['Fear', 'Doubt', 'Confusion', 'Fear', 'Doubt', 'Confusion'];

        return {
            id: mission.id || 'scripture-maze',
            name: mission.name || 'Scripture Maze',
            description: mission.description || '',
            mazeId: maze.id,
            tileSize: maze.tileSize,
            layout: maze.layout.slice(),
            width: maze.layout[0].length * maze.tileSize,
            height: maze.layout.length * maze.tileSize,
            playerSpawn: cloneTile(maze.playerSpawn),
            promptTiles: maze.promptTiles.map(cloneTile),
            demonSpawnTiles: maze.demonSpawnTiles.map(cloneTile),
            targetDemonsToEat: typeof mission.targetDemonsToEat === 'number'
                ? mission.targetDemonsToEat
                : (typeof mission.targetCorrectAnswers === 'number' ? mission.targetCorrectAnswers : 10),
            missionQualities: missionQualities,
            demonRoster: demonRoster,
            playerSpeed: typeof mission.playerSpeed === 'number' ? mission.playerSpeed : 134,
            demonSpeed: typeof mission.demonSpeed === 'number' ? mission.demonSpeed : 92,
            respawnMs: typeof mission.demonRespawnMs === 'number' ? mission.demonRespawnMs : 2600,
            promptRespawnMs: typeof mission.promptRespawnMs === 'number' ? mission.promptRespawnMs : 950,
            powerModeMs: typeof mission.powerModeMs === 'number' ? mission.powerModeMs : 7000,
            demonEatScore: typeof mission.demonEatScore === 'number' ? mission.demonEatScore : 120,
            missionType: mission.type || 'verse',
            qualities: missionQualities.slice(),
            packId: mission.packId || null,
            xpMultiplier: mission.xpMultiplier || 1.0
        };
    }

    var api = {
        MAZES: MAZES,
        createMissionConfig: createMissionConfig
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else if (typeof window !== 'undefined') {
        window.ScriptureMazeConfig = api;
    }
})();
