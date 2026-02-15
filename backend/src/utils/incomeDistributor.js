const User = require('../models/User');
const Commission = require('../models/Commission');

const DIRECT_LEVEL_RATES = {
    1: 0.05, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
    6: 0.005, 7: 0.005, 8: 0.005, 9: 0.005, 10: 0.005,
    11: 0.005, 12: 0.005, 13: 0.005, 14: 0.005, 15: 0.005,
};

const WINNER_LEVEL_RATES = {
    1: 0.05, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
    6: 0.005, 7: 0.005, 8: 0.005, 9: 0.005, 10: 0.005,
    11: 0.005, 12: 0.005, 13: 0.005, 14: 0.005, 15: 0.005,
};

const getUnlockedLevels = (directReferrals) => {
    if (directReferrals >= 10) return 15;
    return Math.min(directReferrals, 15);
};

const ensureRealBalances = (user) => {
    if (!user.realBalances) {
        user.realBalances = {
            cash: 0,
            game: 0,
            cashback: 0,
            lucky: 0,
            directLevel: 0,
            winners: 0,
            roiOnRoi: 0,
            club: 0,
            teamWinners: 0,
            walletBalance: 0,
            luckyDrawWallet: 0
        };
        return;
    }
    if (typeof user.realBalances.directLevel !== 'number') user.realBalances.directLevel = 0;
    if (typeof user.realBalances.winners !== 'number') user.realBalances.winners = 0;
    if (typeof user.realBalances.teamWinners !== 'number') user.realBalances.teamWinners = 0;
};

const distributeDepositCommissions = async (userId, depositAmount) => {
    try {
        let currentUser = await User.findById(userId);
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);
            if (!upline) break;

            // STRICT ACTIVATION CHECK: Must be at least Tier 1 to earn commissions
            if (upline.activation && (upline.activation.tier === 'tier1' || upline.activation.tier === 'tier2')) {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);
                if (currentLevel <= unlockedLevels) {
                    const rate = DIRECT_LEVEL_RATES[currentLevel] || 0;
                    const commission = depositAmount * rate;
                    ensureRealBalances(upline);
                    upline.rewardPoints += commission;
                    upline.realBalances.directLevel += commission;
                    await upline.save();

                    // Notify User of balance change
                    const io = require('../server').io;
                    if (io) {
                        io.to(upline._id.toString()).emit('balance_update', {
                            type: 'commission',
                            commissionType: 'deposit',
                            amount: commission,
                            newBalance: upline.realBalances.directLevel
                        });
                    }

                    // Log commission
                    try {
                        await Commission.create({
                            user: upline._id,
                            fromUser: userId,
                            amount: commission,
                            level: currentLevel,
                            type: 'deposit_commission',
                            status: 'credited'
                        });
                    } catch (logError) {
                        console.error('Failed to log deposit commission:', logError);
                    }
                }
            }
            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Distribute deposit commissions error:', error);
    }
};

const distributeWinnerCommissions = async (winnerId, winAmount) => {
    try {
        let currentUser = await User.findById(winnerId);
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);
            if (!upline) break;

            // STRICT ACTIVATION CHECK: Must be at least Tier 1 to earn winner commissions
            if (upline.activation && (upline.activation.tier === 'tier1' || upline.activation.tier === 'tier2')) {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);
                if (currentLevel <= unlockedLevels) {
                    const rate = WINNER_LEVEL_RATES[currentLevel] || 0;
                    const commission = winAmount * rate;
                    ensureRealBalances(upline);
                    upline.rewardPoints += commission;
                    upline.realBalances.teamWinners += commission;
                    await upline.save();

                    // Notify User of balance change
                    const io = require('../server').io;
                    if (io) {
                        io.to(upline._id.toString()).emit('balance_update', {
                            type: 'commission',
                            commissionType: 'winner',
                            amount: commission,
                            newBalance: upline.realBalances.teamWinners
                        });
                    }

                    // Log commission
                    try {
                        await Commission.create({
                            user: upline._id,
                            fromUser: winnerId,
                            amount: commission,
                            level: currentLevel,
                            type: 'winner_commission',
                            status: 'credited'
                        });
                    } catch (logError) {
                        console.error('Failed to log winner commission:', logError);
                    }
                }
            }
            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Distribute winner commissions error:', error);
    }
};

module.exports = {
    distributeDepositCommissions,
    distributeWinnerCommissions,
    getUnlockedLevels
};
