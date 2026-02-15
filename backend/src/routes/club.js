const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const PlatformStats = require('../models/PlatformStats');
const { CLUB_RANKS, calculateUserRank, processDailyClubIncome } = require('../utils/clubIncomeUtils');

const router = express.Router();

// ============================================
// CLUB INCOME - LEADERSHIP TURNOVER POOL
// ============================================

/**
 * GET /club/status
 * Returns user's current rank, progress, and today's estimated earnings.
 */
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        const stats = await PlatformStats.getToday();
        const activeTurnover = stats.dailyTurnover || 0;
        const totalPool = activeTurnover * 0.08;

        const currentRank = calculateUserRank(user);
        const rankConfig = CLUB_RANKS[currentRank] || { poolShare: 0, name: 'None' };

        // Calculate actual qualified members per rank for accurate share estimation
        const allUsers = await User.find({ 'teamStats.totalTeamVolume': { $gt: 0 }, isActive: true });
        const membersInRank = {
            'Rank 1': 0, 'Rank 2': 0, 'Rank 3': 0,
            'Rank 4': 0, 'Rank 5': 0, 'Rank 6': 0
        };
        for (const u of allUsers) {
            const r = calculateUserRank(u);
            if (membersInRank[r] !== undefined) membersInRank[r]++;
        }

        const rankShare = rankConfig.poolShare ? (activeTurnover * rankConfig.poolShare) / (membersInRank[currentRank] || 1) : 0;

        // Progress to next rank logic
        const sortedRanks = Object.entries(CLUB_RANKS).sort((a, b) => a[1].targetVolume - b[1].targetVolume);
        const nextRankEntry = sortedRanks.find(([_, config]) => config.targetVolume > (CLUB_RANKS[currentRank]?.targetVolume || 0));

        const nextRankProgress = nextRankEntry ? {
            id: nextRankEntry[0],
            name: nextRankEntry[1].name,
            target: nextRankEntry[1].targetVolume,
            current: (user.teamStats?.totalTeamVolume || 0),
            strongLeg: user.teamStats?.strongLegVolume || 0,
            otherLegs: user.teamStats?.otherLegsVolume || 0,
            strongLegReq: nextRankEntry[1].targetVolume * 0.5,
            otherLegsReq: nextRankEntry[1].targetVolume * 0.5
        } : null;

        res.status(200).json({
            status: 'success',
            data: {
                currentRank: currentRank !== 'None' ? { id: currentRank, name: rankConfig.name, share: rankConfig.poolShare } : null,
                dailyPool: {
                    totalTurnover: activeTurnover,
                    poolPercentage: '8%',
                    totalPoolAmount: totalPool
                },
                earnings: {
                    todayEstimated: parseFloat(rankShare.toFixed(2)),
                    totalReceived: user.realBalances.club || 0,
                    allTimeRewards: user.totalRewardsWon || 0
                },
                qualification: {
                    rule: '50/50 Balanced Leg',
                    strongLegVolume: user.teamStats?.strongLegVolume || 0,
                    otherLegsVolume: user.teamStats?.otherLegsVolume || 0
                },
                nextRank: nextRankProgress,
                rankBenefits: [
                    '8% turnover shared daily across 6 leadership ranks',
                    'Calculated on 50/50 Balanced Team Volume',
                    'Daily consistent payouts to Club Wallet',
                    'Scales with platform growth'
                ]
            }
        });
    } catch (error) {
        console.error('Club status error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get club status' });
    }
});

/**
 * POST /club/process-daily
 * Manually trigger the daily distribution (Admin Only)
 */
router.post('/process-daily', async (req, res) => {
    try {
        const { adminKey, turnover } = req.body;
        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized' });
        }

        const result = await processDailyClubIncome(req.app.get('io'), turnover);

        if (!result.success) {
            return res.status(500).json({ status: 'error', message: result.error });
        }

        res.status(200).json({
            status: 'success',
            message: 'Daily club income processed',
            data: {
                totalTurnover: result.turnover,
                totalDistributed: result.distributed,
                qualifiedUsers: result.winners
            }
        });
    } catch (error) {
        console.error('Process daily club error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process club income' });
    }
});

/**
 * GET /club/structure
 * Returns the rank structure for info displays
 */
router.get('/structure', async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                ranks: Object.entries(CLUB_RANKS).map(([id, config]) => ({
                    id,
                    name: config.name,
                    poolShare: `${(config.poolShare * 100)}% of Turnover`,
                    target: config.targetVolume
                })),
                rules: [
                    '8% of company turnover is allocated to pools',
                    'Qualification requires 50/50 Balanced Volume',
                    '50% volume from Strongest Leg (cap)',
                    '50% volume from combined Other Legs'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get structure' });
    }
});

module.exports = router;
