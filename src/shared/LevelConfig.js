const LevelConfig = {
    combatMatrix: {
        affinities: {
            Faith: { Fear: 1.5, Doubt: 1.5, Confusion: 1.2 },
            Wisdom: { Confusion: 1.5, Deception: 1.5, Ignorance: 1.3 },
            Healing: { Infirmity: 1.5, Shame: 1.3, Poverty: 1.2 },
            Power: { Pride: 1.5, Swarm: 1.4, Condemnation: 1.2 }
        },
        defaultMultiplier: 1.0
    },
    levelData: {
        1: {
            qualities: ['Faith', 'Courage', 'Knowledge'],
            monsters: ['Fear', 'Ignorance', 'Blindness', 'Doubt', 'Confusion'],
            monsterDamageFactor: 1,
            playerSpeed: 5,
            monsterSpeed: 5,
            spawnRate: 16000, // 20% faster spawning than the previous 20s interval
            maxMonsters: 30, // 20% more concurrent monsters than the previous 25
            monstersToKill: 15, // Increased by 50% (was 10)
            terrainTheme: 'stone'
        },
        2: {
            qualities: ['Love', 'Wisdom', 'Healing'],
            monsters: ['Strife', 'Confusion', 'Infirmity', 'Poverty', 'Shame', 'Deception', 'Fear'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 7,
            spawnRate: 8400, // 20% slower spawn pace than previous 7s interval
            maxMonsters: 26, // 10% up from the reduced 24, still below the old 30
            monstersToKill: 21, // Reduced clear target to make the level shorter overall
            terrainTheme: 'earth'
        },
        3: {
            qualities: ['Forgiveness', 'Good News', 'Focus'],
            monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt', 'Despair', 'Pride', 'Strife'],
            monsterDamageFactor: 1.5,
            playerSpeed: 6,
            monsterSpeed: 9,
            spawnRate: 6000, // 6s interval
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
            spawnRate: 5000, // 5s interval
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
            spawnRate: 4000, // 4s interval
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
    ],

    getCombatAffinityMultiplier: function (category, monsterType) {
        var matrix = this.combatMatrix || {};
        var affinities = matrix.affinities || {};
        var defaultMultiplier = typeof matrix.defaultMultiplier === 'number' ? matrix.defaultMultiplier : 1.0;

        if (!category || !monsterType) return defaultMultiplier;
        if (!affinities[category]) return defaultMultiplier;

        var multiplier = affinities[category][monsterType];
        return typeof multiplier === 'number' ? multiplier : defaultMultiplier;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelConfig;
} else {
    window.LevelConfig = LevelConfig;
}
