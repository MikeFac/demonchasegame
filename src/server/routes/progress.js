const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlayerProgress = require('../models/PlayerProgress');
const { requireAuth } = require('../middleware/clerkAuth');

/**
 * GET /api/progress
 * Fetch the current authenticated user's progress.
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const user = await User.findOne({ clerkId });
        
        if (!user) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        const progress = await PlayerProgress.findOne({ userId: user._id });
        res.json(progress);
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/progress/sync
 * Sync client-side progress (localStorage) with server-side progress (MongoDB).
 * Uses a "Merge" strategy: Latest wins or set union for arrays.
 */
router.post('/sync', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { clientProgress, syncVersion } = req.body;
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        let dbProgress = await PlayerProgress.findOne({ userId: user._id });

        if (!dbProgress) {
            // Should be created at registration, but just in case:
            dbProgress = new PlayerProgress({ userId: user._id });
        }

        // Initialize Map if not present
        if (!dbProgress.missionStars) {
            dbProgress.missionStars = new Map();
        }

        // --- Basic Merge Strategy: Union of Arrays, Max of numbers ---
        
        // 1. Completed Missions (Set Union)
        const completedMissions = new Set([
            ...(dbProgress.completedMissions || []),
            ...(clientProgress.completedMissions || [])
        ]);
        dbProgress.completedMissions = Array.from(completedMissions);

        // 2. Mission Stars (Map - Best Score wins)
        if (clientProgress.missionStars) {
            for (const [missionId, stars] of Object.entries(clientProgress.missionStars)) {
                const existingStars = dbProgress.missionStars.get(missionId) || 0;
                dbProgress.missionStars.set(missionId, Math.max(existingStars, stars));
            }
        }

        // 3. XP (Highest wins)
        dbProgress.totalXP = Math.max(dbProgress.totalXP, clientProgress.totalXP || 0);

        // 4. Update Other Stats
        dbProgress.monstersDefeated = Math.max(dbProgress.monstersDefeated, clientProgress.monstersDefeated || 0);
        dbProgress.highestLevel = Math.max(dbProgress.highestLevel, clientProgress.highestLevel || 1);

        // 5. Unlocked Worlds (Set Union)
        const unlockedWorlds = new Set([
            ...(dbProgress.unlockedWorlds || []),
            ...(clientProgress.unlockedWorlds || [])
        ]);
        dbProgress.unlockedWorlds = Array.from(unlockedWorlds);

        // 6. Verses Learned (Set Union - unique verse references)
        const versesLearned = new Set([
            ...(dbProgress.versesLearned || []),
            ...(clientProgress.versesLearned || [])
        ]);
        dbProgress.versesLearned = Array.from(versesLearned);

        dbProgress.lastSyncedAt = new Date();
        dbProgress.syncVersion = (dbProgress.syncVersion || 0) + 1;

        await dbProgress.save();

        // Also update User profile total XP
        user.totalXP = dbProgress.totalXP;
        await user.save();

        res.json({
            message: 'Progress synced successfully',
            progress: dbProgress
        });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

module.exports = router;
