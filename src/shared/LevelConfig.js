const LevelConfig = {
    levelData: {
        1: {
            qualities: ['Faith', 'Courage', 'Knowledge'],
            monsters: ['Fear', 'Ignorance'],
            monsterDamageFactor: 1,
            playerSpeed: 5,
            monsterSpeed: 5,
            spawnRate: 10000,
            maxMonsters: 8,
            terrainTheme: 'stone'
        },
        2: {
            qualities: ['Love', 'Wisdom', 'Healing'],
            monsters: ['Strife', 'Confusion', 'Infirmity'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 7,
            spawnRate: 8000,
            maxMonsters: 10,
            terrainTheme: 'earth'
        },
        3: {
            qualities: ['Forgiveness', 'Good News', 'Focus'],
            monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 9,
            spawnRate: 5000,
            maxMonsters: 12,
            terrainTheme: 'crystal'
        },
        4: {
            qualities: ['Endurance', 'Hope', 'Prophecy'],
            monsters: ['Despair', 'Weariness', 'Deception', 'Temptation'],
            monsterDamageFactor: 2.0,
            playerSpeed: 7,
            monsterSpeed: 10,
            spawnRate: 4000,
            maxMonsters: 14,
            terrainTheme: 'shadow'
        },
        5: {
            qualities: ['Power', 'Identity', 'ShareGospel'],
            monsters: ['Pride', 'Doubt', 'Fear', 'Condemnation', 'Unbelief'],
            monsterDamageFactor: 2.5,
            playerSpeed: 8,
            monsterSpeed: 12,
            spawnRate: 3000,
            maxMonsters: 16,
            terrainTheme: 'void'
        }
    },

    levelXPRequirements: [
        0,    // Level 1
        30,   // Level 2
        100,  // Level 3
        200,  // Level 4
        350,  // Level 5
        500   // Level 6
    ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelConfig;
} else {
    window.LevelConfig = LevelConfig;
}
