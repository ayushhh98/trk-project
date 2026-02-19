
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Commission = require('./src/models/Commission');
require('dotenv').config({ path: './.env' });

// Copy of the function to test logic in isolation (or I could import it if I exported it, but it's not exported)
// Actually better to just run the query logic or simulate the endpoint behavior.
// But I can also just require the route file? No, it's a router. 
// I will just copy the logic to test it with the same inputs.

const PRACTICE_REFERRAL_RATES = {
    1: { percent: 10, usdt: 10 },
    '2-5': { percent: 2, usdt: 2 },
    '6-10': { percent: 1, usdt: 1 },
    '11-15': { percent: 0.5, usdt: 0.5 },
    '16-50': { percent: 0.25, usdt: 0.25 },
    '51-100': { percent: 0.10, usdt: 0.10 }
};

const getRateByLevel = (level) => {
    if (level === 1) return PRACTICE_REFERRAL_RATES[1];
    if (level >= 2 && level <= 5) return PRACTICE_REFERRAL_RATES['2-5'];
    if (level >= 6 && level <= 10) return PRACTICE_REFERRAL_RATES['6-10'];
    if (level >= 11 && level <= 15) return PRACTICE_REFERRAL_RATES['11-15'];
    if (level >= 16 && level <= 50) return PRACTICE_REFERRAL_RATES['16-50'];
    if (level >= 51 && level <= 100) return PRACTICE_REFERRAL_RATES['51-100'];
    return { percent: 0, usdt: 0 };
};

const getTeamStatsRealTime = async (userId, maxLevels = 100) => {
    const stats = {
        totalMembers: 0,
        activeToday: 0,
        tier1Count: 0,
        tier2Count: 0,
        levelStats: []
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Fetch Real Commission Data Aggregated by Level
    const commissionStats = await Commission.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                status: 'credited'
            }
        },
        {
            $group: {
                _id: "$level",
                totalEarned: { $sum: "$amount" }
            }
        }
    ]);

    // Create a map for quick lookup: { level: totalEarned }
    const earningsMap = {};
    commissionStats.forEach(stat => {
        earningsMap[stat._id] = stat.totalEarned;
    });

    // 2. BFS for Member Counts
    let currentLevelIds = [userId];
    const visited = new Set();
    visited.add(userId.toString());

    for (let level = 1; level <= maxLevels; level++) {
        const nextLevelIds = [];
        const rate = getRateByLevel(level);

        const realEarnings = earningsMap[level] || 0;

        const levelData = {
            level,
            members: 0,
            active: 0,
            reward: rate.usdt,
            percent: rate.percent,
            totalEarned: realEarnings // REAL DATA
        };

        const members = await User.find({ referredBy: { $in: currentLevelIds } })
            .select('_id lastLoginAt referralCode referrals ' +
                'walletAddress activation deposits');

        if (members.length === 0) break;

        for (const member of members) {
            const memberIdStr = member._id.toString();
            if (visited.has(memberIdStr)) continue;
            visited.add(memberIdStr);

            levelData.members++;

            const isOnline = member.lastLoginAt && member.lastLoginAt >= startOfDay;
            if (isOnline) {
                levelData.active++;
            }

            if (member.activation?.tier === 'tier1') stats.tier1Count++;
            if (member.activation?.tier === 'tier2') stats.tier2Count++;

            nextLevelIds.push(member._id);
        }

        stats.totalMembers += levelData.members;
        stats.activeToday += levelData.active;
        stats.levelStats.push(levelData);

        currentLevelIds = nextLevelIds;
        if (currentLevelIds.length === 0) break;
    }

    return stats;
};

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Use the user ID we found in previous debug step
        // User: newuser_... ID: 6991cf07c7fb54ab537c933c
        // Or find one dynamically
        const referrer = await User.findOne({ 'referrals.0': { $exists: true } });
        if (!referrer) {
            console.log('No referrer found.');
            return;
        }

        console.log(`Testing stats for User: ${referrer._id} (${referrer.email})`);

        const stats = await getTeamStatsRealTime(referrer._id);
        console.log('=== REAL TIME STATS ===');
        console.log(JSON.stringify(stats, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
