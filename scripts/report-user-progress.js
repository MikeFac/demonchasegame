#!/usr/bin/env node
/**
 * User Learning Progress Report
 * 
 * Reports on user progress data stored in MongoDB.
 * 
 * Usage: node scripts/report-user-progress.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/dcgame?authSource=admin';

// Define schemas (minimal versions for querying)
const UserSchema = new mongoose.Schema({
    clerkId: String,
    username: String,
    email: String,
    totalXP: { type: Number, default: 0 },
    createdAt: Date
}, { collection: 'users' });

const PlayerProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedMissions: [String],
    missionStars: { type: Map, of: Number },
    versesLearned: [String],
    totalXP: { type: Number, default: 0 },
    monstersDefeated: { type: Number, default: 0 },
    highestLevel: { type: Number, default: 1 },
    dailyChallengeStreak: { type: Number, default: 0 },
    createdAt: Date,
    updatedAt: Date
}, { collection: 'playerprogresses' });

const User = mongoose.model('User', UserSchema);
const PlayerProgress = mongoose.model('PlayerProgress', PlayerProgressSchema);

async function generateReport() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB\n');
        console.log('='.repeat(60));
        console.log('USER LEARNING PROGRESS REPORT');
        console.log('Generated:', new Date().toISOString());
        console.log('='.repeat(60) + '\n');

        // Get all users
        const users = await User.find({}).sort({ createdAt: -1 });
        
        if (users.length === 0) {
            console.log('No registered users found.\n');
            return;
        }

        console.log(`Total Registered Users: ${users.length}\n`);

        // Aggregate stats
        let totalVersesLearned = 0;
        let totalMissionsCompleted = 0;
        let totalMonstersDefeated = 0;
        let totalXP = 0;

        // Per-user details
        console.log('-'.repeat(60));
        console.log('USER DETAILS');
        console.log('-'.repeat(60) + '\n');

        for (const user of users) {
            const progress = await PlayerProgress.findOne({ userId: user._id });
            
            console.log(`User: ${user.username || 'Unknown'}`);
            console.log(`  Email: ${user.email || 'N/A'}`);
            console.log(`  Registered: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
            
            if (progress) {
                const missionsCompleted = progress.completedMissions?.length || 0;
                const versesLearned = progress.versesLearned?.length || 0;
                const stars = progress.missionStars ? Object.fromEntries(progress.missionStars) : {};
                const totalStars = Object.values(stars).reduce((sum, s) => sum + s, 0);
                
                console.log(`  Missions Completed: ${missionsCompleted}`);
                console.log(`  Total Stars: ${totalStars}`);
                console.log(`  Verses Learned: ${versesLearned}`);
                if (progress.versesLearned && progress.versesLearned.length > 0) {
                    console.log(`  Recent Verses: ${progress.versesLearned.slice(-5).join(', ')}`);
                }
                console.log(`  Monsters Defeated: ${progress.monstersDefeated || 0}`);
                console.log(`  Highest Level: ${progress.highestLevel || 1}`);
                console.log(`  Daily Challenge Streak: ${progress.dailyChallengeStreak || 0}`);
                console.log(`  Total XP: ${progress.totalXP || 0}`);
                
                totalMissionsCompleted += missionsCompleted;
                totalVersesLearned += versesLearned;
                totalMonstersDefeated += progress.monstersDefeated || 0;
                totalXP += progress.totalXP || 0;
            } else {
                console.log(`  No progress data found`);
            }
            console.log('');
        }

        // Summary
        console.log('-'.repeat(60));
        console.log('AGGREGATE STATISTICS');
        console.log('-'.repeat(60) + '\n');
        
        console.log(`Total Users: ${users.length}`);
        console.log(`Total Missions Completed (all users): ${totalMissionsCompleted}`);
        console.log(`Total Verses Learned (all users): ${totalVersesLearned}`);
        console.log(`Total Monsters Defeated (all users): ${totalMonstersDefeated}`);
        console.log(`Total XP Earned (all users): ${totalXP}`);
        console.log(`Average XP per user: ${Math.round(totalXP / users.length)}`);
        console.log(`Average verses learned per user: ${(totalVersesLearned / users.length).toFixed(1)}`);
        
        // Progress collection count
        const progressCount = await PlayerProgress.countDocuments();
        console.log(`\nProgress records in database: ${progressCount}`);

        console.log('\n' + '='.repeat(60));
        console.log('END OF REPORT');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('Error generating report:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

generateReport();
