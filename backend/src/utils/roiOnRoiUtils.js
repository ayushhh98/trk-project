const User = require('../models/User');

const ROI_COMMISSION_RATES = {
    1: 0.20,      // Level 1: 20%
    2: 0.10,      // Level 2-5: 10%
    3: 0.10,
    4: 0.10,
    5: 0.10,
    6: 0.05,      // Level 6-10: 5%
    7: 0.05,
    8: 0.05,
    9: 0.05,
    10: 0.05,
    11: 0.03,     // Level 11-15: 3%
    12: 0.03,
    13: 0.03,
    14: 0.03,
    15: 0.03,
};

const CASHBACK_POOL_ALLOCATION = 0.50;  // 50% of cashback goes to referral pool
const LUCKY_DRAW_AUTO_PERCENT = 0.20; // 20% of commissions go to Lucky Draw Wallet

/**
 * Process daily ROI on ROI for all users with today's cashback
 */
const processDailyRoi = async (io) => {
    console.log("📈 Starting Daily ROI on ROI Processing...");
    try {
        const usersWithCashback = await User.find({ 'cashbackStats.todayCashback': { $gt: 0 } });
        let totalDistributed = 0;

        for (const user of usersWithCashback) {
            const poolAmount = user.cashbackStats.todayCashback * CASHBACK_POOL_ALLOCATION;
            let currentUser = user;
            let currentLevel = 1;

            while (currentUser?.referredBy && currentLevel <= 15) {
                const upline = await User.findById(currentUser.referredBy);
                if (upline) {
                    // STRICT REQUIREMENT: Upline must have all streams unlocked (Tier 2)
                    if (!upline.activation || !upline.activation.allStreamsUnlocked) {
                        // Skip this upline if not fully unlocked
                        currentUser = upline;
                        currentLevel++;
                        continue;
                    }

                    const totalCommission = poolAmount * ROI_COMMISSION_RATES[currentLevel];

                    // 20% redirection to Lucky Draw Wallet
                    const luckyCredit = totalCommission * LUCKY_DRAW_AUTO_PERCENT;
                    const netRoiCredit = totalCommission - luckyCredit;

                    // Update balances
                    upline.realBalances.roiOnRoi = (upline.realBalances.roiOnRoi || 0) + netRoiCredit;
                    upline.realBalances.luckyDrawWallet = (upline.realBalances.luckyDrawWallet || 0) + luckyCredit;

                    await upline.save();
                    totalDistributed += totalCommission;

                    if (io) {
                        io.to(upline._id.toString()).emit('balance_update', {
                            type: 'commission',
                            commissionType: 'roi_on_roi',
                            amount: netRoiCredit,
                            luckyCredit,
                            newBalance: upline.realBalances.roiOnRoi
                        });
                    }
                }
                currentUser = upline;
                currentLevel++;
            }

            // Note: We DON'T clear todayCashback here if cron.js needs it for other things,
            // but roiOnRoi.js previously did. Let's assume this utility handles the final state.
            user.cashbackStats.todayCashback = 0;
            await user.save();
        }

        console.log(`✅ Daily ROI Finished. Distributed ${totalDistributed.toFixed(2)} USDT.`);
        return totalDistributed;
    } catch (error) {
        console.error('Daily ROI processing error:', error);
        throw error;
    }
};

module.exports = {
    processDailyRoi,
    ROI_COMMISSION_RATES,
    CASHBACK_POOL_ALLOCATION
};
