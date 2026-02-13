const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================
// 7 INCOME STRUCTURE - CONFIGURATION
// ============================================

// 1. Winners 8X Income Configuration
const {
    distributeDepositCommissions,
    distributeWinnerCommissions,
    getUnlockedLevels
} = require('../utils/incomeDistributor');

// ... rest of the file (removing local copies of rates and logic)
// (Note: I'll actually just replace the functions to call the distributor)

// Get income structure overview
router.get('/structure', async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                totalIncomeStreams: 7,
                activeIncome: [
                    {
                        id: 1,
                        name: 'Winners 8X Income',
                        description: 'Win the game and receive massive multiplier-based rewards',
                        details: {
                            totalMultiplier: '8X',
                            directPayout: '2X → Direct Wallet Payout',
                            autoCompound: '6X → Auto Compound into Game Wallet'
                        },
                        icon: '💎'
                    },
                    {
                        id: 2,
                        name: 'Direct Level Income',
                        description: 'Earn commissions from team deposits',
                        activation: '10 USDT activation mandatory',
                        condition: 'Each Direct opens ONE LEVEL. 10 Directs required for all 15 levels.',
                        rates: [
                            { levels: 'Level 1', rate: '5%' },
                            { levels: 'Level 2', rate: '2%' },
                            { levels: 'Level 3-5', rate: '1%' },
                            { levels: 'Level 6-15', rate: '0.5%' }
                        ],
                        icon: '👥'
                    },
                    {
                        id: 3,
                        name: 'Winner Level Income',
                        description: 'Earn when your team members win games',
                        totalCommission: '15%',
                        rates: [
                            { levels: 'Level 1', rate: '5%' },
                            { levels: 'Level 2', rate: '2%' },
                            { levels: 'Level 3-5', rate: '1%' },
                            { levels: 'Level 6-15', rate: '0.5%' }
                        ],
                        icon: '🏅'
                    }
                ],
                passiveIncome: [
                    {
                        id: 4,
                        name: 'Cashback Protection',
                        description: '1% daily on net losses until fully recovered',
                        icon: '🛡️'
                    },
                    {
                        id: 5,
                        name: 'Lucky Draw',
                        description: 'Daily lucky draw tickets from gameplay',
                        icon: '🎫'
                    },
                    {
                        id: 6,
                        name: 'Club Income',
                        description: 'Rank-based rewards from global pool',
                        icon: '🏆'
                    },
                    {
                        id: 7,
                        name: 'Practice Referral Rewards',
                        description: 'Earn from 100 levels of practice referrals',
                        icon: '🎁'
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Get income structure error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get income structure'
        });
    }
});

// Get user's income dashboard
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const directReferrals = user.referrals?.length || 0;
        const unlockedLevels = getUnlockedLevels(directReferrals);
        const isActivated = user.activation?.tier !== 'none';

        // Income data (Real-time aggregation)
        const incomeData = {
            winners8X: {
                totalWins: user.gamesWon || 0,
                directPayout: user.realBalances?.winners || 0, // Simplified for dashboard
                autoCompound: 0,
                totalEarned: user.realBalances?.winners || 0
            },
            directLevel: {
                isActivated,
                directReferrals,
                unlockedLevels,
                requiredDirects: 10,
                levelBreakdown: [], // Future: Implement real per-level aggregation if needed
                totalEarned: user.realBalances?.directLevel || 0
            },
            winnerLevel: {
                isActivated,
                unlockedLevels,
                totalTeamWins: 0, // Future: Aggregation
                levelBreakdown: [],
                totalEarned: user.realBalances?.winners || 0
            }
        };

        res.status(200).json({
            status: 'success',
            data: {
                activation: {
                    tier: user.activation?.tier || 'none',
                    isActivated,
                    directReferrals,
                    unlockedLevels,
                    message: !isActivated
                        ? '10 USDT activation required to unlock Direct Level Income'
                        : directReferrals < 10
                            ? `Refer ${10 - directReferrals} more to unlock all 15 levels`
                            : 'All 15 levels unlocked!'
                },
                income: incomeData,
                totals: {
                    winners8X: incomeData.winners8X.totalEarned,
                    directLevel: incomeData.directLevel.totalEarned,
                    winnerLevel: incomeData.winnerLevel.totalEarned,
                    grandTotal: incomeData.winners8X.totalEarned +
                        incomeData.directLevel.totalEarned +
                        incomeData.winnerLevel.totalEarned
                }
            }
        });

    } catch (error) {
        console.error('Get income dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get income dashboard'
        });
    }
});

// Process winner payout (called when user wins a game)
router.post('/process-win', auth, async (req, res) => {
    try {
        const { betAmount, totalPayout } = req.body;
        const user = await User.findById(req.user.id);

        // Calculate 8X split
        const directPayoutMultiplier = WINNERS_8X_CONFIG.directPayout;  // 2X
        const compoundMultiplier = WINNERS_8X_CONFIG.autoCompound;      // 6X

        const directPayout = betAmount * directPayoutMultiplier;
        const autoCompound = betAmount * compoundMultiplier;

        // Add to balances
        // SWEEPSTAKES: Commissions paid in Reward Points (SC)
        // user.realBalances.cash += directPayout;    // Legacy
        // user.realBalances.game += autoCompound;    // Legacy

        user.rewardPoints += totalPayout; // Full amount to SC (Redeemable)

        await user.save();

        // Process winner level income for uplines
        await processWinnerLevelIncome(user._id, totalPayout);

        res.status(200).json({
            status: 'success',
            message: 'Winner payout processed',
            data: {
                betAmount,
                directPayout,
                autoCompound,
                totalPayout: directPayout + autoCompound,
                newBalances: {
                    cash: user.realBalances.cash,
                    game: user.realBalances.game
                }
            }
        });

    } catch (error) {
        console.error('Process win error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process winner payout'
        });
    }
});

// Helper function to process winner level income for uplines
async function processWinnerLevelIncome(winnerId, winAmount) {
    await distributeWinnerCommissions(winnerId, winAmount);
}

// Process direct level income (called when someone deposits)
router.post('/process-deposit-commission', auth, async (req, res) => {
    try {
        const { depositAmount } = req.body;
        await distributeDepositCommissions(req.user.id, depositAmount);

        res.status(200).json({
            status: 'success',
            message: 'Deposit commissions processed'
        });

    } catch (error) {
        console.error('Process deposit commission error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process deposit commissions'
        });
    }
});

module.exports = router;
