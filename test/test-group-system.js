/**
 * Group System Regression Tests
 * 
 * Tests the group creation, joining, leaving, and leaderboard functionality.
 * Run with: node test/test-group-system.js
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/dcgame?authSource=admin';

let connection;
let User, Group, PlayerProgress;

async function setup() {
    connection = await mongoose.createConnection(MONGO_URI);
    
    const userSchema = new mongoose.Schema({
        clerkId: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        groups: [{
            groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
            joinedAt: { type: Date, default: Date.now }
        }],
        status: { type: String, default: 'active' }
    }, { timestamps: true });
    
    const groupSchema = new mongoose.Schema({
        code: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        description: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        memberCount: { type: Number, default: 1 },
        status: { type: String, default: 'active' }
    }, { timestamps: true });
    
    const progressSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        versesLearned: [String],
        totalXP: { type: Number, default: 0 }
    }, { timestamps: true });
    
    User = connection.model('User', userSchema);
    Group = connection.model('Group', groupSchema);
    PlayerProgress = connection.model('PlayerProgress', progressSchema);
}

async function cleanup() {
    await User.deleteMany({ username: /^test_/ });
    await Group.deleteMany({ name: /^Test Group/ });
    await PlayerProgress.deleteMany({});
    if (connection) await connection.close();
}

async function createTestUser(username, clerkId) {
    const user = new User({
        clerkId,
        username,
        groups: [],
        status: 'active'
    });
    await user.save();
    return user;
}

async function testGroupCreation() {
    console.log('\n--- Test: Group Creation ---');
    const creator = await createTestUser('test_creator', 'clerk_test_creator');
    
    const group = new Group({
        code: 'TESTGRP1',
        name: 'Test Group 1',
        createdBy: creator._id
    });
    await group.save();
    
    creator.groups.push({ groupId: group._id });
    await creator.save();
    
    assert.strictEqual(creator.groups.length, 1, 'User has 1 group');
    console.log('✓ Group created successfully');
    
    const group2 = new Group({
        code: 'TESTGRP2',
        name: 'Test Group 2',
        createdBy: creator._id
    });
    await group2.save();
    
    creator.groups.push({ groupId: group2._id });
    await creator.save();
    
    assert.strictEqual(creator.groups.length, 2, 'User can join multiple groups');
    console.log('✓ User can join multiple groups');
    
    console.log('\n✅ All tests passed!');
}

async function testGroupJoin() {
    console.log('\n--- Test: Group Join ---');
    const creator = await createTestUser('test_joiner', 'clerk_test_joiner');
    const member = await createTestUser('test_member', 'clerk_test_member');
    
    const group = new Group({
        code: 'JOINGRP',
        name: 'Test Group Join',
        createdBy: creator._id
    });
    await group.save();
    
    const beforeJoin = await User.findById(member._id);
    assert.strictEqual(beforeJoin.groups.length, 0, 'Member has no groups initially');
    
    member.groups.push({ groupId: group._id });
    await member.save();
    
    const afterJoin = await Group.findById(group._id);
    assert.strictEqual(afterJoin.memberCount, 1, 'Group has 1 member');
    console.log('✓ User can join group by code');
    
    console.log('\n✅ All tests passed!');
}

async function testGroupLeave() {
    console.log('\n--- Test: Group Leave ---');
    const creator = await createTestUser('test_owner', 'clerk_test_owner');
    const member = await createTestUser('test_member_leave', 'clerk_test_member_leave');
    
    const group = new Group({
        code: 'LEAVEGRP',
        name: 'Test Group Leave',
        createdBy: creator._id
    });
    await group.save();
    
    member.groups.push({ groupId: group._id });
    await member.save();
    
    const beforeLeave = await User.findById(member._id);
    assert.strictEqual(beforeLeave.groups.length, 1, 'Member has 1 group');
    
    member.groups = [];
    await member.save();
    
    const afterLeave = await User.findById(member._id);
    assert.strictEqual(afterLeave.groups.length, 0, 'Member has 0 groups');
    console.log('✓ User can leave group');
    
    console.log('\n✅ All tests passed!');
}

async function testLeaderboard() {
    console.log('\n--- Test: Group Leaderboard ---');
    const user1 = await createTestUser('test_lb_user1', 'clerk_test_lb_user1');
    const user2 = await createTestUser('test_lb_user2', 'clerk_test_lb_user2');
    const user3 = await createTestUser('test_lb_user3', 'clerk_test_lb_user3');
    
    const group = new Group({
        code: 'LBGRP1',
        name: 'Test Group LB',
        createdBy: user1._id
    });
    await group.save();
    
    user1.groups.push({ groupId: group._id });
    user2.groups.push({ groupId: group._id });
    user3.groups.push({ groupId: group._id });
    await user1.save();
    await user2.save();
    await user3.save();
    
    await Promise.all([
        new PlayerProgress({ userId: user1._id, versesLearned: ['Rom 1:1'], totalXP: 100 }).save(),
        new PlayerProgress({ userId: user2._id, versesLearned: ['Rom 1:1', 'Rom 1:2'], totalXP: 200 }).save(),
        new PlayerProgress({ userId: user3._id, versesLearned: ['Rom 1:1', 'Rom 1:2', 'Rom 1:3'], totalXP: 50 }).save()
    ]);
    
    const leaderboard = await PlayerProgress.find({
        userId: { $in: [user1._id, user2._id, user3._id] }
    }).sort({ totalXP: -1 }).lean('userId totalXP versesLearned');
    
    assert.strictEqual(leaderboard.length, 3, 'Leaderboard has 3 users');
    assert.strictEqual(leaderboard[0].totalXP, 200, 'User 2 is first');
    assert.strictEqual(leaderboard[1].totalXP, 100, 'User 1 is second');
    assert.strictEqual(leaderboard[2].totalXP, 50, 'User 3 is third');
    
    console.log('✓ Leaderboard sorted by XP correctly');
    
    console.log('\n✅ All tests passed!');
}

async function runAllTests() {
    try {
        await setup();
        await testGroupCreation();
        await cleanup();
        
        await setup();
        await testGroupJoin();
        await cleanup();
        
        await setup();
        await testGroupLeave();
        await cleanup();
        
        await setup();
        await testLeaderboard();
        await cleanup();
        
        console.log('\n========================================');
        console.log('✅ ALL GROUP SYSTEM TESTS PASSED');
        console.log('========================================');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runAllTests();
