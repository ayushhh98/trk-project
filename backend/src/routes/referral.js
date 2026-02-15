const express = require('express');
const User = require('../models/User');
const Commission = require('../models/Commission');
const auth = require('../middleware/auth');

const router = express.Router();

// Administrative Mock State for Practice Referral Rates (kept for reference/admin control)
let PRACTICE_REFERRAL_RATES = {
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

// Efficient BFS-based team calculation
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

    let currentLevelIds = [userId];
    const visited = new Set();
    visited.add(userId.toString());

    for (let level = 1; level <= maxLevels; level++) {
        const nextLevelIds = [];
        const rate = getRateByLevel(level);
        const levelData = {
            level,
            members: 0,
            active: 0,
            reward: rate.usdt,
            percent: rate.percent,
            totalEarned: 0
        };

        const members = await User.find({ referredBy: { $in: currentLevelIds } })
            .select('_id lastLoginAt referralCode referrals walletAddress activation');

        if (members.length === 0) break;

        for (const member of members) {
            const memberIdStr = member._id.toString();
            if (visited.has(memberIdStr)) continue;
            visited.add(memberIdStr);

            levelData.members++;
            if (member.lastLoginAt && member.lastLoginAt >= startOfDay) {
                levelData.active++;
            }
            // Track activation tiers
            if (member.activation?.tier === 'tier1') stats.tier1Count++;
            if (member.activation?.tier === 'tier2') stats.tier2Count++;

            levelData.totalEarned += rate.usdt; // Visualization only

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

const MAX_DIRECT_REFERRALS = 20;

// Get referral stats and growth data (Real-Time)
router.get('/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Calculate real-time team stats
        const realStats = await getTeamStatsRealTime(user._id);

        // Calculate real-time total earnings from referral-based streams
        const totalReferralEarnings =
            (user.realBalances?.directLevel || 0) +
            (user.realBalances?.winners || 0) ||
            user.rewardPoints ||
            0;

        // Fetch detailed Level 1 data
        const level1Members = await User.find({ referredBy: user._id })
            .select('walletAddress activation createdAt lastLoginAt name email referralCode deposits')
            .limit(20);

        const level1Details = level1Members.map(m => {
            const walletShort = m.walletAddress
                ? `${m.walletAddress.slice(0, 6)}...${m.walletAddress.slice(-4)}`
                : 'N/A';
            const email = m.email || '';
            const maskedEmail = email
                ? `${email.slice(0, 2)}***@${email.split('@')[1] || ''}`
                : '';

            // Calculate total deposited by this referral
            const totalDeposited = (m.deposits || []).reduce((sum, dep) => sum + (dep.amount || 0), 0);

            // Check online status from global map
            const isOnline = global.onlineUsers ? global.onlineUsers.has(m._id.toString()) : false;

            return {
                id: m._id,
                name: m.name || '',
                email: maskedEmail,
                referralCode: m.referralCode || '',
                address: walletShort,
                tier: m.activation?.tier || 'none',
                joined: m.createdAt,
                lastActive: m.lastLoginAt,
                active: m.lastLoginAt && (new Date() - m.lastLoginAt < 24 * 60 * 60 * 1000),
                isOnline,
                totalDeposited
            };
        });

        // Real Growth Data (Mocking last 7 days but can be derived in future)
        const growthData = [
            { date: 'Mon', newMembers: 2, volume: 200 },
            { date: 'Tue', newMembers: 5, volume: 500 },
            { date: 'Wed', newMembers: 3, volume: 300 },
            { date: 'Thu', newMembers: 8, volume: 800 },
            { date: 'Fri', newMembers: 12, volume: 1200 },
            { date: 'Sat', newMembers: 15, volume: 1500 },
            { date: 'Sun', newMembers: 10, volume: 1000 }
        ];

        res.status(200).json({
            status: 'success',
            data: {
                referralCode: user.referralCode,
                referralLink: `https://trk.game/?ref=${user.referralCode}`,
                directReferrals: user.referrals?.length || 0,
                maxDirectReferrals: MAX_DIRECT_REFERRALS,
                totals: {
                    members: realStats.totalMembers,
                    active: realStats.activeToday,
                    totalEarned: totalReferralEarnings,
                    tier1Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier1Count / realStats.totalMembers) * 100) : 0,
                    tier2Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier2Count / realStats.totalMembers) * 100) : 0
                },
                levelStats: realStats.levelStats,
                level1Details,
                growthData,
                practiceRewardStructure: Object.entries(PRACTICE_REFERRAL_RATES).map(([key, val]) => ({
                    levels: key === '1' ? 'Level 1' : `Level ${key}`,
                    percent: `${val.percent}%`,
                    usdt: `$${val.usdt}`
                }))
            }
        });
    } catch (error) {
        console.error('Referral Stats Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get referral hub stats' });
    }
});

// Admin Control: Update Rates
router.post('/admin/update-rates', auth, async (req, res) => {
    try {
        const { key, percent, usdt } = req.body;
        if (!PRACTICE_REFERRAL_RATES[key]) return res.status(404).json({ status: 'error', message: 'Rate tier not found' });

        if (percent !== undefined) PRACTICE_REFERRAL_RATES[key].percent = percent;
        if (usdt !== undefined) PRACTICE_REFERRAL_RATES[key].usdt = usdt;

        res.status(200).json({ status: 'success', message: 'Referral rates updated', data: PRACTICE_REFERRAL_RATES[key] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update rates' });
    }
});

// Apply referral code
router.post('/apply', auth, async (req, res) => {
    try {
        const { referralCode } = req.body;
        const user = await User.findById(req.user.id);

        if (user.referredBy) return res.status(400).json({ status: 'error', message: 'Already referred' });

        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (!referrer) return res.status(404).json({ status: 'error', message: 'Invalid code' });
        if (referrer._id.equals(user._id)) return res.status(400).json({ status: 'error', message: 'Self-referral not allowed' });

        user.referredBy = referrer._id;
        await user.save();

        referrer.referrals.push(user._id);
        referrer.teamStats.totalMembers += 1;
        await referrer.save();

        res.status(200).json({
            status: 'success',
            message: 'Referral successful',
            data: { referredBy: `${referrer.walletAddress?.slice(0, 6)}...${referrer.walletAddress?.slice(-4)}` }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to apply referral code' });
    }
});

// Get commissions history
router.get('/commissions', auth, async (req, res) => {
    try {
        const commissionsData = await Commission.find({ user: req.user.id })
            .populate('fromUser', 'walletAddress')
            .sort({ createdAt: -1 })
            .limit(50);

        const commissions = commissionsData.map(c => {
            // Calculate time ago
            const diff = Date.now() - new Date(c.createdAt).getTime();
            const minutes = Math.floor(diff / 60000);
            let timeAgo = 'Just now';
            if (minutes > 0) {
                if (minutes < 60) timeAgo = `${minutes}m ago`;
                else if (minutes < 1440) timeAgo = `${Math.floor(minutes / 60)}h ago`;
                else timeAgo = `${Math.floor(minutes / 1440)}d ago`;
            }

            return {
                user: c.fromUser ? `${c.fromUser.walletAddress?.slice(0, 6)}...${c.fromUser.walletAddress?.slice(-4)}` : 'Unknown',
                level: c.level,
                amount: c.amount,
                time: timeAgo,
                status: c.status.charAt(0).toUpperCase() + c.status.slice(1)
            };
        });

        res.status(200).json({ status: 'success', data: { commissions } });
    } catch (error) {
        console.error('Get commissions error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get commissions' });
    }
});

// Resolve referral code to wallet address
router.get('/resolve/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const user = await User.findOne({ referralCode: code.toUpperCase() }).select('walletAddress referralCode');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Referral code not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                walletAddress: user.walletAddress,
                referralCode: user.referralCode
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to resolve referral code' });
    }
});

module.exports = router;
