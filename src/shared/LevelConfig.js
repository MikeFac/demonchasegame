const ALL_DEMON_TYPES = [
    'Blindness', 'Condemnation', 'Confusion', 'Deception', 'Depression', 'Despair',
    'Doubt', 'Fear', 'Goliath', 'Ignorance', 'Infirmity', 'Poverty', 'Pride',
    'Shame', 'Strife', 'Swarm', 'Temptation', 'Unbelief'
];

function buildAffinityRow(boosts, penalties) {
    var row = {};
    ALL_DEMON_TYPES.forEach(function (demonType) {
        row[demonType] = 1.0;
    });

    Object.keys(boosts).forEach(function (demonType) {
        row[demonType] = boosts[demonType];
    });

    Object.keys(penalties).forEach(function (demonType) {
        row[demonType] = penalties[demonType];
    });

    return row;
}

const LevelConfig = {
    combatMatrix: {
        affinities: {
            Courage: buildAffinityRow(
                { Fear: 1.6, Goliath: 1.5, Shame: 1.3, Despair: 1.25, Strife: 1.2 },
                { Deception: 0.9, Temptation: 0.95 }
            ),
            Endurance: buildAffinityRow(
                { Despair: 1.5, Depression: 1.35, Poverty: 1.2, Strife: 1.15 },
                { Deception: 0.9, Blindness: 0.95 }
            ),
            Faith: buildAffinityRow(
                { Fear: 1.6, Goliath: 1.5, Doubt: 1.5, Unbelief: 1.4, Despair: 1.2 },
                { Pride: 0.95, Strife: 0.9 }
            ),
            Focus: buildAffinityRow(
                { Confusion: 1.45, Temptation: 1.35, Swarm: 1.25, Deception: 1.2 },
                { Poverty: 0.9, Shame: 0.95 }
            ),
            Forgiveness: buildAffinityRow(
                { Condemnation: 1.55, Shame: 1.35, Pride: 1.2, Strife: 1.15 },
                { Swarm: 0.9, Blindness: 0.95 }
            ),
            'Good News': buildAffinityRow(
                { Unbelief: 1.45, Condemnation: 1.35, Fear: 1.2, Despair: 1.2 },
                { Temptation: 0.9, Pride: 0.95 }
            ),
            Healing: buildAffinityRow(
                { Infirmity: 1.6, Depression: 1.25, Shame: 1.25, Poverty: 1.2 },
                { Pride: 0.95, Strife: 0.9 }
            ),
            Hope: buildAffinityRow(
                { Despair: 1.6, Depression: 1.35, Fear: 1.2, Poverty: 1.15 },
                { Pride: 0.95, Temptation: 0.9 }
            ),
            Identity: buildAffinityRow(
                { Shame: 1.55, Condemnation: 1.35, Pride: 1.25, Fear: 1.15 },
                { Swarm: 0.9, Poverty: 0.95 }
            ),
            Knowledge: buildAffinityRow(
                { Ignorance: 1.6, Blindness: 1.35, Deception: 1.2, Confusion: 1.15 },
                { Poverty: 0.9, Despair: 0.95 }
            ),
            Love: buildAffinityRow(
                { Shame: 1.35, Strife: 1.3, Condemnation: 1.2, Poverty: 1.15 },
                { Pride: 0.9, Temptation: 0.95 }
            ),
            Power: buildAffinityRow(
                { Pride: 1.55, Swarm: 1.4, Condemnation: 1.25, Fear: 1.15 },
                { Deception: 0.9, Doubt: 0.95 }
            ),
            Prophecy: buildAffinityRow(
                { Deception: 1.45, Blindness: 1.3, Unbelief: 1.25, Temptation: 1.2 },
                { Strife: 0.9, Poverty: 0.95 }
            ),
            Wisdom: buildAffinityRow(
                { Confusion: 1.55, Deception: 1.45, Ignorance: 1.35, Temptation: 1.15 },
                { Swarm: 0.9, Fear: 0.95 }
            )
        },
        defaultMultiplier: 1.0
    },
    levelData: {
        1: {
            qualities: ['Faith', 'Courage', 'Knowledge'],
            monsters: ['Fear', 'Ignorance', 'Blindness', 'Doubt', 'Confusion'],
            boss: {
                demonType: 'Fear',
                label: 'Fear Guard'
            },
            monsterDamageFactor: 1,
            playerSpeed: 5,
            monsterSpeed: 5,
            spawnRate: 12000, // Higher early pressure so level 1 doesn't feel empty
            maxMonsters: 45, // 50% more concurrent monsters than the previous 30
            monstersToKill: 12, // Keep level 1 short while the overall spawn pressure stays higher
            maxHealingPoints: 2, // Level 1 should feel tighter and less forgiving
            terrainTheme: 'stone'
        },
        2: {
            qualities: ['Love', 'Wisdom', 'Healing'],
            monsters: ['Strife', 'Confusion', 'Infirmity', 'Poverty', 'Shame', 'Deception', 'Fear'],
            boss: {
                demonType: 'Shame',
                label: 'Shame Guard'
            },
            monsterDamageFactor: 1.35,
            playerSpeed: 6,
            monsterSpeed: 6,
            spawnRate: 9500, // Slightly slower pace to soften the jump from level 1
            maxMonsters: 24,
            monstersToKill: 18,
            terrainTheme: 'earth'
        },
        3: {
            qualities: ['Forgiveness', 'Good News', 'Focus'],
            monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt', 'Despair', 'Pride', 'Strife'],
            boss: {
                demonType: 'Condemnation',
                label: 'Condemnation Guard'
            },
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
            boss: {
                demonType: 'Temptation',
                label: 'Temptation Guard'
            },
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
            boss: {
                demonType: 'Pride',
                label: 'Pride Guard'
            },
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
    },

    getBestCategoryForMonster: function (monsterType) {
        var matrix = this.combatMatrix || {};
        var affinities = matrix.affinities || {};
        var defaultMultiplier = typeof matrix.defaultMultiplier === 'number' ? matrix.defaultMultiplier : 1.0;
        var bestCategory = null;
        var bestMultiplier = defaultMultiplier;

        Object.keys(affinities).forEach(function (category) {
            var categoryMultipliers = affinities[category] || {};
            var multiplier = typeof categoryMultipliers[monsterType] === 'number'
                ? categoryMultipliers[monsterType]
                : defaultMultiplier;

            if (multiplier > bestMultiplier) {
                bestMultiplier = multiplier;
                bestCategory = category;
            }
        });

        return bestCategory;
    },

    getLevelBossConfig: function (level) {
        var levelEntry = this.levelData && this.levelData[level];
        return levelEntry && levelEntry.boss ? levelEntry.boss : null;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelConfig;
} else {
    window.LevelConfig = LevelConfig;
}
