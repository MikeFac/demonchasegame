const LevelConfig = {
    levelData: {
        1: {
            qualities: ['Faith', 'Courage', 'Knowledge'],
            monsters: ['Fear', 'Ignorance'],
            monsterDamageFactor: 1,
            playerSpeed: 5,
            monsterSpeed: 5,
            spawnRate: 10000,
            maxMonsters: 8
        },
        2: {
            qualities: ['Love', 'Wisdom', 'Healing'],
            monsters: ['Strife', 'Confusion', 'Infirmity'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 7,
            spawnRate: 8000,
            maxMonsters: 10
        },
        3: {
            qualities: ['Forgiveness', 'Good News', 'Focus'],
            monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 9,
            spawnRate: 5000,
            maxMonsters: 12
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
