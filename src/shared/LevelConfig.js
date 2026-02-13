const LevelConfig = {
    levelData: {
        1: {
            qualities: ['Faith', 'Courage', 'Knowledge'],
            monsters: ['Fear', 'Ignorance', 'Blindness', 'Doubt', 'Confusion'],
            monsterDamageFactor: 1,
            playerSpeed: 5,
            monsterSpeed: 5,
            spawnRate: 4000, // 4s interval
            maxMonsters: 25,
            monstersToKill: 15, // Increased by 50% (was 10)
            terrainTheme: 'stone'
        },
        2: {
            qualities: ['Love', 'Wisdom', 'Healing'],
            monsters: ['Strife', 'Confusion', 'Infirmity', 'Poverty', 'Shame', 'Deception', 'Fear'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 7,
            spawnRate: 3500, // 3.5s interval
            maxMonsters: 30,
            monstersToKill: 23, // Increased by 50% (was 15)
            terrainTheme: 'earth'
        },
        3: {
            qualities: ['Forgiveness', 'Good News', 'Focus'],
            monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt', 'Despair', 'Pride', 'Strife'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 9,
            spawnRate: 3000, // 3s interval
            maxMonsters: 35,
            monstersToKill: 30, // Increased by 50% (was 20)
            terrainTheme: 'crystal'
        },
        4: {
            qualities: ['Endurance', 'Hope', 'Prophecy'],
            monsters: ['Despair', 'Deception', 'Temptation', 'Swarm', 'Unbelief', 'Condemnation'],
            monsterDamageFactor: 2.0,
            playerSpeed: 7,
            monsterSpeed: 10,
            spawnRate: 2500, // 2.5s interval
            maxMonsters: 40,
            monstersToKill: 38, // Increased by 50% (was 25)
            terrainTheme: 'shadow'
        },
        5: {
            qualities: ['Power', 'Identity', 'Good News'],
            monsters: ['Pride', 'Doubt', 'Fear', 'Condemnation', 'Unbelief', 'Swarm', 'Temptation', 'Poverty'],
            monsterDamageFactor: 2.5,
            playerSpeed: 8,
            monsterSpeed: 12,
            spawnRate: 2000, // 2s interval
            maxMonsters: 50,
            monstersToKill: 45, // Increased by 50% (was 30)
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
