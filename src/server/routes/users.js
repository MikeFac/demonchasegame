const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlayerProgress = require('../models/PlayerProgress');
const { requireAuth } = require('../middleware/clerkAuth');

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile and progress summary.
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        
        let user = await User.findOne({ clerkId });
        
        if (!user) {
            return res.status(404).json({ error: 'User not registered in game database', needsRegistration: true });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
        
        const progress = await PlayerProgress.findOne({ userId: user._id });
        
        res.json({
            user,
            progress: progress || null
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/users/register
 * Completes the registration process (consent, age gate, username).
 * Clerk auth is already verified by middleware — this creates the local DB record.
 */
router.post('/register', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const { username, agreedToTerms, agreedToPrivacy, ageVerified } = req.body;
        
        // 1. Validate consent checkboxes
        if (!agreedToTerms || !agreedToPrivacy) {
            return res.status(400).json({ error: 'You must agree to the Terms and Privacy Policy' });
        }

        if (!ageVerified) {
            return res.status(400).json({ error: 'You must be 16 or older to register' });
        }

        // 2. Validate username (Mongoose validators will also catch, but give better errors)
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }
        const trimmed = username.trim();
        if (trimmed.length < 3 || trimmed.length > 20) {
            return res.status(400).json({ error: 'Username must be 3–20 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        // 3. Check if already registered
        const existingUser = await User.findOne({ clerkId });
        if (existingUser) {
            return res.status(400).json({ error: 'User already registered' });
        }

        // 4. Check username availability
        const usernameTaken = await User.findOne({ username: trimmed });
        if (usernameTaken) {
            return res.status(409).json({ error: 'Username is already taken' });
        }

        // 5. Pull email/avatar from Clerk session claims if available
        const sessionClaims = req.auth.session || {};

        // 6. Create User
        const user = new User({
            clerkId,
            username: trimmed,
            email: sessionClaims.email || null,
            avatarUrl: sessionClaims.image_url || null,
            agreedToTerms: true,
            agreedToPrivacy: true,
            ageVerified: true,
            consentDate: new Date(),
            lastLoginAt: new Date()
        });

        await user.save();

        // 7. Initialize PlayerProgress
        const progress = new PlayerProgress({
            userId: user._id,
            completedMissions: [],
            totalXP: 0
        });

        await progress.save();

        res.status(201).json({
            message: 'Registration successful',
            user,
            progress
        });
    } catch (error) {
        if (error.code === 11000) {
            // Mongoose duplicate key — could be username or clerkId
            const field = error.keyPattern.username ? 'Username' : 'Account';
            return res.status(409).json({ error: `${field} is already taken` });
        }
        if (error.name === 'ValidationError') {
            // Mongoose validation errors — extract first message
            const firstError = Object.values(error.errors)[0];
            return res.status(400).json({ error: firstError.message });
        }
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/users/me
 * Update profile (display name).
 */
router.patch('/me', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const user = await User.findOne({ clerkId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { displayName } = req.body;
        if (displayName !== undefined) {
            user.displayName = String(displayName).trim().substring(0, 50);
        }

        await user.save();
        res.json({ user });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/users/me
 * Delete account and all associated data (GDPR).
 */
router.delete('/me', requireAuth, async (req, res) => {
    try {
        const clerkId = req.auth.userId;
        const user = await User.findOne({ clerkId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Delete progress
        await PlayerProgress.deleteOne({ userId: user._id });
        
        // Soft-delete user (keep record for audit, mark as deleted)
        user.status = 'deleted';
        user.email = null;
        user.displayName = null;
        user.avatarUrl = null;
        await user.save();

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
