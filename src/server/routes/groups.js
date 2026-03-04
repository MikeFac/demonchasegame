const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const PlayerProgress = require('../models/PlayerProgress');
const { requireAuth } = require('../middleware/clerkAuth');

const MAX_GROUPS_PER_USER = 10;

function generateGroupCode(name) {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'GRP';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
}

async function getUniqueCode(name) {
  let code = generateGroupCode(name);
  let attempts = 0;
  while (await Group.findOne({ code, status: 'active' }) && attempts < 20) {
    code = generateGroupCode(name);
    attempts++;
  }
  if (attempts >= 20) {
    throw new Error('Unable to generate unique group code');
  }
  return code;
}

/**
 * POST /api/groups
 * Create a new group. Creator is automatically joined.
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { name, description } = req.body;
        
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Group name is required' });
        }
        
        const trimmedName = name.trim();
        if (trimmedName.length < 3 || trimmedName.length > 50) {
            return res.status(400).json({ error: 'Group name must be 3-50 characters' });
        }
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.groups.length >= MAX_GROUPS_PER_USER) {
            return res.status(400).json({ error: `You can only join up to ${MAX_GROUPS_PER_USER} groups` });
        }
        
        const code = await getUniqueCode(trimmedName);
        
        const group = new Group({
            code,
            name: trimmedName,
            description: description?.trim() || '',
            createdBy: user._id,
            memberCount: 1
        });
        
        await group.save();
        
        user.groups.push({ groupId: group._id, joinedAt: new Date() });
        await user.save();
        
        res.status(201).json({
            success: true,
            group: {
                _id: group._id,
                code: group.code,
                name: group.name,
                description: group.description,
                memberCount: group.memberCount,
                createdAt: group.createdAt
            }
        });
    } catch (error) {
        console.error('Create group error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Group code already exists. Please try again.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/groups/join
 * Join a group by code.
 */
router.post('/join', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { code } = req.body;
        
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Group code is required' });
        }
        
        const normalizedCode = code.toUpperCase().trim();
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const group = await Group.findOne({ code: normalizedCode, status: 'active' });
        if (!group) {
            return res.status(404).json({ error: 'Group not found. Check the code and try again.' });
        }
        
        const alreadyMember = user.groups.some(g => g.groupId.equals(group._id));
        if (alreadyMember) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }
        
        if (user.groups.length >= MAX_GROUPS_PER_USER) {
            return res.status(400).json({ error: `You can only join up to ${MAX_GROUPS_PER_USER} groups` });
        }
        
        user.groups.push({ groupId: group._id, joinedAt: new Date() });
        await user.save();
        
        group.memberCount += 1;
        await group.save();
        
        res.json({
            success: true,
            group: {
                _id: group._id,
                code: group.code,
                name: group.name,
                description: group.description,
                memberCount: group.memberCount
            }
        });
    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/groups/mine
 * Get all groups the current user belongs to.
 */
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        
        const user = await User.findOne({ clerkId }).populate('groups.groupId');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const groups = user.groups
            .filter(g => g.groupId && g.groupId.status === 'active')
            .map(g => ({
                _id: g.groupId._id,
                code: g.groupId.code,
                name: g.groupId.name,
                description: g.groupId.description,
                memberCount: g.groupId.memberCount,
                joinedAt: g.joinedAt,
                isCreator: g.groupId.createdBy.equals(user._id)
            }));
        
        res.json({ groups });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/groups/:groupId
 * Get details for a specific group.
 */
router.get('/:groupId', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { groupId } = req.params;
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isMember = user.groups.some(g => g.groupId.equals(groupId));
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        
        const group = await Group.findById(groupId);
        if (!group || group.status !== 'active') {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.json({
            group: {
                _id: group._id,
                code: group.code,
                name: group.name,
                description: group.description,
                memberCount: group.memberCount,
                createdAt: group.createdAt,
                isCreator: group.createdBy.equals(user._id)
            }
        });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/groups/:groupId/leaderboard
 * Get leaderboard for a group.
 * Query params: period (weekly, monthly, all-time)
 */
router.get('/:groupId/leaderboard', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { groupId } = req.params;
        const { period = 'weekly' } = req.query;
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isMember = user.groups.some(g => g.groupId.equals(groupId));
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        
        const group = await Group.findById(groupId);
        if (!group || group.status !== 'active') {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        const allMembers = await User.find({
            'groups.groupId': groupId,
            status: 'active'
        }).select('_id username displayName');
        
        const memberIds = allMembers.map(m => m._id);
        
        let dateFilter = {};
        const now = new Date();
        if (period === 'weekly') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { updatedAt: { $gte: weekAgo } };
        } else if (period === 'monthly') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { updatedAt: { $gte: monthAgo } };
        }
        
        const progressRecords = await PlayerProgress.find({
            userId: { $in: memberIds },
            ...dateFilter
        }).select('userId totalXP versesLearned');
        
        const userStatsMap = new Map();
        progressRecords.forEach(p => {
            userStatsMap.set(p.userId.toString(), {
                totalXP: p.totalXP || 0,
                versesLearned: p.versesLearned || [],
                versesList: p.versesLearned || []
            });
        });
        
        const leaderboard = allMembers.map(member => {
            const stats = userStatsMap.get(member._id.toString()) || { totalXP: 0, versesLearned: [], versesList: [] };
            return {
                userId: member._id,
                username: member.username,
                displayName: member.displayName,
                totalXP: stats.totalXP,
                versesLearned: stats.versesLearned.length,
                versesList: stats.versesList
            };
        });
        
        leaderboard.sort((a, b) => b.versesLearned - a.versesLearned || b.totalXP - a.totalXP);
        
        const rankedLeaderboard = leaderboard.slice(0, 50).map((entry, index) => ({
            rank: index + 1,
            ...entry
        }));
        
        let yourRank = null;
        let yourStats = null;
        const yourIndex = leaderboard.findIndex(e => e.userId.equals(user._id));
        if (yourIndex >= 0) {
            yourRank = yourIndex + 1;
            yourStats = {
                totalXP: leaderboard[yourIndex].totalXP,
                versesLearned: leaderboard[yourIndex].versesLearned
            };
        }
        
        res.json({
            group: {
                _id: group._id,
                name: group.name,
                code: group.code
            },
            period,
            entries: rankedLeaderboard,
            yourRank,
            yourStats,
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/groups/:groupId/leave
 * Leave a group.
 */
router.post('/:groupId/leave', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { groupId } = req.params;
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const memberIndex = user.groups.findIndex(g => g.groupId.equals(groupId));
        if (memberIndex === -1) {
            return res.status(400).json({ error: 'You are not a member of this group' });
        }
        
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        if (group.createdBy.equals(user._id)) {
            return res.status(400).json({ error: 'Group creator cannot leave. Delete the group instead.' });
        }
        
        user.groups.splice(memberIndex, 1);
        await user.save();
        
        group.memberCount = Math.max(0, group.memberCount - 1);
        await group.save();
        
        res.json({ success: true, message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/groups/:groupId
 * Delete a group (creator only).
 */
router.delete('/:groupId', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { groupId } = req.params;
        
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        if (!group.createdBy.equals(user._id)) {
            return res.status(403).json({ error: 'Only the group creator can delete this group' });
        }
        
        group.status = 'deleted';
        await group.save();
        
        await User.updateMany(
            { 'groups.groupId': groupId },
            { $pull: { groups: { groupId: groupId } } }
        );
        
        res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
