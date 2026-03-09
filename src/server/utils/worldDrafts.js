function slugifyMissionId(text, fallback) {
    var base = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 32);

    return base || fallback;
}

function trimString(value, maxLength) {
    return String(value || '').trim().substring(0, maxLength);
}

function defaultObjectives(monstersToKill) {
    return {
        type: 'elimination',
        monstersToKill: monstersToKill
    };
}

function normalizeFixedMonster(entry) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    var x = Number(entry.x);
    var y = Number(entry.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }

    var patrolPath = Array.isArray(entry.behavior && entry.behavior.patrolPath)
        ? entry.behavior.patrolPath.map(function (point) {
            return {
                x: Number(point.x) || 0,
                y: Number(point.y) || 0
            };
        }).slice(0, 20)
        : [];

    return {
        x: x,
        y: y,
        demonType: trimString(entry.demonType || 'Fear', 40) || 'Fear',
        behavior: {
            type: ['chaser', 'patrol', 'guardian', 'guard', 'wanderer'].includes(entry.behavior && entry.behavior.type)
                ? entry.behavior.type
                : 'chaser',
            patrolRadius: Number(entry.behavior && entry.behavior.patrolRadius) || 0,
            patrolPath: patrolPath
        },
        stats: {
            healthMultiplier: Number(entry.stats && entry.stats.healthMultiplier) || 1.0,
            damageMultiplier: Number(entry.stats && entry.stats.damageMultiplier) || 1.0,
            speedMultiplier: Number(entry.stats && entry.stats.speedMultiplier) || 1.0
        },
        spawnTrigger: {
            type: ['immediate', 'proximity', 'timer', 'killCount'].includes(entry.spawnTrigger && entry.spawnTrigger.type)
                ? entry.spawnTrigger.type
                : 'immediate',
            value: Number(entry.spawnTrigger && entry.spawnTrigger.value) || 0
        },
        isBoss: Boolean(entry.isBoss),
        label: trimString(entry.label, 80)
    };
}

function categoryToQualities(category) {
    return [trimString(category || 'Faith', 60) || 'Faith'];
}

function createStarterMissions(worldName) {
    var safeWorldName = trimString(worldName || 'My World', 100) || 'My World';

    return [
        {
            id: 'mission-faith',
            name: 'Faith Trial',
            description: 'A gentle opening mission for ' + safeWorldName + '.',
            difficulty: 'easy',
            category: 'Faith',
            mapStyle: 'classic',
            spawnRate: 18000,
            monsterTypes: ['Fear', 'Doubt', 'Unbelief'],
            qualities: ['Faith', 'Courage'],
            monsters: ['Fear', 'Doubt', 'Unbelief'],
            monsterDamageFactor: 1.0,
            monsterSpeed: 5,
            playerSpeed: 5,
            maxMonsters: 18,
            monstersToKill: 10,
            xpMultiplier: 1.0,
            objectives: defaultObjectives(10)
        },
        {
            id: 'mission-wisdom',
            name: 'Wisdom Path',
            description: 'A mid-tier mission focused on confusion and deception.',
            difficulty: 'normal',
            category: 'Wisdom',
            mapStyle: 'labyrinth',
            spawnRate: 12000,
            monsterTypes: ['Confusion', 'Deception', 'Ignorance'],
            qualities: ['Wisdom', 'Knowledge'],
            monsters: ['Confusion', 'Deception', 'Ignorance'],
            monsterDamageFactor: 1.2,
            monsterSpeed: 6,
            playerSpeed: 5,
            maxMonsters: 22,
            monstersToKill: 14,
            xpMultiplier: 1.15,
            objectives: defaultObjectives(14)
        },
        {
            id: 'mission-healing',
            name: 'Healing Stand',
            description: 'A stronger mission built around endurance and recovery.',
            difficulty: 'normal',
            category: 'Healing',
            mapStyle: 'open',
            spawnRate: 11000,
            monsterTypes: ['Infirmity', 'Depression', 'Shame'],
            qualities: ['Healing', 'Hope'],
            monsters: ['Infirmity', 'Depression', 'Shame'],
            monsterDamageFactor: 1.35,
            monsterSpeed: 7,
            playerSpeed: 6,
            maxMonsters: 24,
            monstersToKill: 16,
            xpMultiplier: 1.25,
            objectives: defaultObjectives(16)
        }
    ];
}

function createStarterChapters(missions) {
    return [
        {
            id: 'chapter-1',
            name: 'Chapter 1',
            description: 'Starter chapter for this custom world.',
            nodeShape: 'shield',
            theme: 'stone',
            missionIds: missions.map(function (mission) { return mission.id; })
        }
    ];
}

function normalizeMission(mission, index) {
    if (!mission || typeof mission !== 'object') {
        return null;
    }

    var name = trimString(mission.name || ('Mission ' + (index + 1)), 100) || ('Mission ' + (index + 1));
    var id = slugifyMissionId(mission.id || name, 'mission-' + (index + 1));
    var monsterTypes = Array.isArray(mission.monsterTypes)
        ? mission.monsterTypes.filter(Boolean).map(function (value) { return trimString(value, 40); }).slice(0, 12)
        : [];

    return {
        id: id,
        name: name,
        description: trimString(mission.description, 300),
        difficulty: ['easy', 'normal', 'hard'].includes(mission.difficulty) ? mission.difficulty : 'normal',
        category: trimString(mission.category || 'Faith', 60) || 'Faith',
        mapStyle: ['classic', 'narrow', 'labyrinth', 'open', 'city'].includes(mission.mapStyle) ? mission.mapStyle : 'classic',
        spawnRate: typeof mission.spawnRate === 'number' && mission.spawnRate > 0 ? mission.spawnRate : 15000,
        monsterTypes: monsterTypes.length ? monsterTypes : ['Fear', 'Doubt'],
        qualities: Array.isArray(mission.qualities) && mission.qualities.length
            ? mission.qualities.slice(0, 5).map(function (value) { return trimString(value, 60); }).filter(Boolean)
            : categoryToQualities(mission.category),
        monsters: Array.isArray(mission.monsters) && mission.monsters.length
            ? mission.monsters.slice(0, 8).map(function (value) { return trimString(value, 40); }).filter(Boolean)
            : (monsterTypes.length ? monsterTypes : ['Fear', 'Doubt']),
        monsterDamageFactor: typeof mission.monsterDamageFactor === 'number' && mission.monsterDamageFactor > 0 ? mission.monsterDamageFactor : 1.0,
        monsterSpeed: typeof mission.monsterSpeed === 'number' && mission.monsterSpeed > 0 ? mission.monsterSpeed : 5,
        playerSpeed: typeof mission.playerSpeed === 'number' && mission.playerSpeed > 0 ? mission.playerSpeed : 5,
        maxMonsters: typeof mission.maxMonsters === 'number' && mission.maxMonsters > 0 ? mission.maxMonsters : 20,
        monstersToKill: typeof mission.monstersToKill === 'number' && mission.monstersToKill > 0 ? mission.monstersToKill : 10,
        xpMultiplier: typeof mission.xpMultiplier === 'number' && mission.xpMultiplier > 0 ? mission.xpMultiplier : 1.0,
        objectives: mission.objectives && typeof mission.objectives === 'object' ? mission.objectives : defaultObjectives(10),
        customVerses: Array.isArray(mission.customVerses) ? mission.customVerses.slice(0, 20) : [],
        fixedMonsters: Array.isArray(mission.fixedMonsters) ? mission.fixedMonsters.map(normalizeFixedMonster).filter(Boolean).slice(0, 200) : [],
        randomSpawnsEnabled: mission.randomSpawnsEnabled !== false,
        randomSpawnBudget: typeof mission.randomSpawnBudget === 'number' && mission.randomSpawnBudget >= 0
            ? mission.randomSpawnBudget
            : undefined
    };
}

function normalizeChapter(chapter, index, missions) {
    if (!chapter || typeof chapter !== 'object') {
        return null;
    }

    var defaultMissionIds = missions.map(function (mission) { return mission.id; });
    var missionIds = Array.isArray(chapter.missionIds)
        ? chapter.missionIds.filter(function (missionId) {
            return defaultMissionIds.includes(missionId);
        })
        : defaultMissionIds;

    return {
        id: slugifyMissionId(chapter.id || ('chapter-' + (index + 1)), 'chapter-' + (index + 1)),
        name: trimString(chapter.name || ('Chapter ' + (index + 1)), 100) || ('Chapter ' + (index + 1)),
        description: trimString(chapter.description, 300),
        nodeShape: ['shield', 'heart', 'sword', 'star', 'cross'].includes(chapter.nodeShape) ? chapter.nodeShape : 'shield',
        theme: trimString(chapter.theme || 'stone', 40) || 'stone',
        missionIds: missionIds.length ? missionIds : defaultMissionIds
    };
}

function createStarterWorldPayload(input) {
    var missions = createStarterMissions(input.name);
    return {
        name: trimString(input.name, 100),
        description: trimString(input.description, 500),
        visibility: ['private', 'unlisted', 'public'].includes(input.visibility) ? input.visibility : 'private',
        chapters: createStarterChapters(missions),
        missions: missions,
        status: 'draft'
    };
}

function normalizeWorldPayload(input, options) {
    var payload = input || {};
    var settings = options || {};
    var requireName = settings.requireName !== false;

    var name = payload.name !== undefined ? trimString(payload.name, 100) : undefined;
    if (requireName && (!name || name.length < 2)) {
        return { error: 'World name must be at least 2 characters' };
    }

    var missions = undefined;
    if (payload.missions !== undefined) {
        if (!Array.isArray(payload.missions)) {
            return { error: 'missions must be an array' };
        }
        missions = payload.missions.map(normalizeMission).filter(Boolean);
        if (!missions.length) {
            return { error: 'World must include at least one mission' };
        }
    }

    var chapters = undefined;
    if (payload.chapters !== undefined) {
        if (!Array.isArray(payload.chapters)) {
            return { error: 'chapters must be an array' };
        }
        chapters = payload.chapters;
    }

    if (!missions && !chapters && settings.createStarterIfEmpty) {
        return { value: createStarterWorldPayload(payload) };
    }

    if (missions && !chapters) {
        chapters = createStarterChapters(missions);
    }

    if (chapters && !missions) {
        return { error: 'missions are required when chapters are provided' };
    }

    var normalized = {};

    if (name !== undefined) normalized.name = name;
    if (payload.description !== undefined) normalized.description = trimString(payload.description, 500);
    if (payload.visibility !== undefined) {
        if (!['private', 'unlisted', 'public'].includes(payload.visibility)) {
            return { error: 'visibility must be private, unlisted, or public' };
        }
        normalized.visibility = payload.visibility;
    }
    if (payload.status !== undefined) {
        if (!['draft', 'published', 'archived'].includes(payload.status)) {
            return { error: 'status must be draft, published, or archived' };
        }
        normalized.status = payload.status;
    }

    if (missions) normalized.missions = missions;
    if (chapters && missions) {
        normalized.chapters = chapters.map(function (chapter, index) {
            return normalizeChapter(chapter, index, missions);
        }).filter(Boolean);
    }

    return { value: normalized };
}

module.exports = {
    createStarterWorldPayload: createStarterWorldPayload,
    normalizeMission: normalizeMission,
    normalizeWorldPayload: normalizeWorldPayload
};
