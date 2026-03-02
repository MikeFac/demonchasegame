const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const World = require('../models/World');
const WorldMap = require('../models/WorldMap');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/clerkAuth');

/**
 * Helper: generate a short share code (8 alphanumeric chars, uppercase).
 */
function generateShareCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Helper: sanitize a string into a URL-safe slug.
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

/**
 * Helper: resolve a User from a Clerk ID.
 * Returns the user or sends a 404 and returns null.
 */
async function resolveUser(req, res) {
    const user = await User.findOne({ clerkId: req.auth.userId });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return null;
    }
    return user;
}

/**
 * Helper: resolve a World from a slug and verify ownership.
 * Returns { world, user } or sends an error and returns null.
 */
async function resolveOwnedWorld(req, res) {
    const user = await resolveUser(req, res);
    if (!user) return null;

    const world = await World.findOne({ slug: req.params.slug });
    if (!world) {
        res.status(404).json({ error: 'World not found' });
        return null;
    }

    if (!world.authorId.equals(user._id)) {
        res.status(403).json({ error: 'You do not own this world' });
        return null;
    }

    return { world, user };
}

// ===================================================================
// LIST, SHARE LOOKUP, & READ
// ===================================================================

/**
 * GET /api/worlds
 * List public worlds. Authenticated users also see their own + joined worlds.
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        let query = { visibility: 'public', status: 'published' };

        if (req.auth) {
            const user = await User.findOne({ clerkId: req.auth.userId });
            if (user) {
                query = {
                    $or: [
                        { visibility: 'public', status: 'published' },
                        { authorId: user._id },
                        { _id: { $in: user.worldsJoined } }
                    ]
                };
            }
        }

        const worlds = await World.find(query)
            .select('slug name description authorUsername visibility status playCount rating createdAt')
            .sort({ updatedAt: -1 })
            .limit(50);

        res.json({ worlds });
    } catch (error) {
        console.error('Error fetching worlds:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/worlds/share/:code
 * Lookup a world by its short share code.
 * MUST be registered before /:slug to avoid Express matching "share" as a slug.
 */
router.get('/share/:code', async (req, res) => {
    try {
        const world = await World.findOne({ shareCode: req.params.code.toUpperCase() });
        if (!world) return res.status(404).json({ error: 'Invalid share code' });

        res.json({
            world: {
                slug: world.slug,
                name: world.name,
                description: world.description,
                authorUsername: world.authorUsername,
                playCount: world.playCount,
                rating: world.rating
            }
        });
    } catch (error) {
        console.error('Error looking up share code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/worlds/:slug
 * Get full world details. Respects visibility rules.
 */
router.get('/:slug', optionalAuth, async (req, res) => {
    try {
        const world = await World.findOne({ slug: req.params.slug });
        if (!world) return res.status(404).json({ error: 'World not found' });

        // Visibility check
        if (world.visibility === 'private') {
            if (!req.auth) {
                return res.status(403).json({ error: 'This world is private' });
            }
            const user = await User.findOne({ clerkId: req.auth.userId });
            if (!user || (!world.authorId.equals(user._id) && !user.worldsJoined.includes(world._id))) {
                return res.status(403).json({ error: 'This world is private' });
            }
        }

        // Increment play count (loose — not per-unique-user, just a simple counter)
        world.playCount = (world.playCount || 0) + 1;
        await world.save();

        res.json({ world });
    } catch (error) {
        console.error('Error fetching world:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================================================================
// CREATE, UPDATE, DELETE
// ===================================================================

/**
 * POST /api/worlds
 * Create a new world.
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const user = await resolveUser(req, res);
        if (!user) return;

        const { name, description, visibility, chapters, missions } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'World name must be at least 2 characters' });
        }

        const slug = `${slugify(name.trim())}-${Date.now().toString(36)}`;
        const shareCode = (visibility !== 'private') ? generateShareCode() : undefined;

        const world = new World({
            name: name.trim(),
            description: description ? String(description).trim().substring(0, 500) : '',
            visibility: visibility || 'private',
            chapters: chapters || [],
            missions: missions || [],
            authorId: user._id,
            authorUsername: user.username,
            slug,
            shareCode
        });

        await world.save();

        user.worldsCreated.push(world._id);
        await user.save();

        res.status(201).json({ world });
    } catch (error) {
        console.error('Error creating world:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/worlds/:slug
 * Update world (author only).
 */
router.patch('/:slug', requireAuth, async (req, res) => {
    try {
        const result = await resolveOwnedWorld(req, res);
        if (!result) return;
        const { world } = result;

        const { name, description, visibility, chapters, missions, status } = req.body;

        if (name !== undefined) world.name = String(name).trim().substring(0, 100);
        if (description !== undefined) world.description = String(description).trim().substring(0, 500);
        if (visibility !== undefined && ['private', 'unlisted', 'public'].includes(visibility)) {
            world.visibility = visibility;
            // Generate share code if making non-private and none exists
            if (visibility !== 'private' && !world.shareCode) {
                world.shareCode = generateShareCode();
            }
        }
        if (chapters !== undefined) world.chapters = chapters;
        if (missions !== undefined) world.missions = missions;
        if (status !== undefined && ['draft', 'published', 'archived'].includes(status)) {
            world.status = status;
        }

        await world.save();
        res.json({ world });
    } catch (error) {
        console.error('Error updating world:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/worlds/:slug
 * Delete world and its maps (author only).
 */
router.delete('/:slug', requireAuth, async (req, res) => {
    try {
        const result = await resolveOwnedWorld(req, res);
        if (!result) return;
        const { world, user } = result;

        // Delete all associated maps
        await WorldMap.deleteMany({ worldId: world._id });

        // Remove from user's worldsCreated
        user.worldsCreated = user.worldsCreated.filter(id => !id.equals(world._id));
        await user.save();

        await World.deleteOne({ _id: world._id });

        res.json({ message: 'World deleted successfully' });
    } catch (error) {
        console.error('Error deleting world:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================================================================
// JOIN & SHARE
// ===================================================================

/**
 * POST /api/worlds/:slug/join
 * Join a world by slug.
 */
router.post('/:slug/join', requireAuth, async (req, res) => {
    try {
        const user = await resolveUser(req, res);
        if (!user) return;

        const world = await World.findOne({ slug: req.params.slug });
        if (!world) return res.status(404).json({ error: 'World not found' });

        // Check visibility
        if (world.visibility === 'private') {
            return res.status(403).json({ error: 'Cannot join a private world without an invitation' });
        }

        // Already joined?
        if (user.worldsJoined.some(id => id.equals(world._id))) {
            return res.status(200).json({ message: 'Already joined', world });
        }

        user.worldsJoined.push(world._id);
        await user.save();

        world.uniquePlayerCount = (world.uniquePlayerCount || 0) + 1;
        await world.save();

        res.json({ message: 'Joined world successfully', world });
    } catch (error) {
        console.error('Error joining world:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================================================================
// MAP DATA
// ===================================================================

/**
 * POST /api/worlds/:slug/maps
 * Add or generate a map for a mission in this world (author only).
 */
router.post('/:slug/maps', requireAuth, async (req, res) => {
    try {
        const result = await resolveOwnedWorld(req, res);
        if (!result) return;
        const { world } = result;

        const { missionId, name, generatorType, seed, parameters, wallData, terrainData, width, height } = req.body;

        if (!missionId || !generatorType) {
            return res.status(400).json({ error: 'missionId and generatorType are required' });
        }

        const map = new WorldMap({
            worldId: world._id,
            missionId,
            name: name || `Map for ${missionId}`,
            generatorType,
            seed: seed || Math.floor(Math.random() * 1000000),
            parameters: parameters || {},
            wallData,
            terrainData,
            width: width || 3200,
            height: height || 3200
        });

        await map.save();

        world.mapIds.push(map._id);
        await world.save();

        res.status(201).json({ map });
    } catch (error) {
        console.error('Error creating map:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/worlds/:slug/maps/:missionId
 * Get the map data for a specific mission.
 */
router.get('/:slug/maps/:missionId', optionalAuth, async (req, res) => {
    try {
        const world = await World.findOne({ slug: req.params.slug });
        if (!world) return res.status(404).json({ error: 'World not found' });

        const map = await WorldMap.findOne({
            worldId: world._id,
            missionId: req.params.missionId
        });

        if (!map) return res.status(404).json({ error: 'Map not found for this mission' });

        res.json({ map });
    } catch (error) {
        console.error('Error fetching map:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
