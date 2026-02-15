const cron = require('node-cron');
const User = require('../models/User');
const { ethers } = require('ethers');
const { calculateUserRank, processDailyClubIncome } = require('../utils/clubIncomeUtils');
// const TRKGameABI = require('../contracts/TRKGameABI.json'); // Ensure this exists or use artifact
// NOTE: In a real deployment, you'd import the Contract Service to interact with the blockchain.
// For now, we will simulate the logic and update the Database state.

// Configuration
const DAILY_CASHBACK_PERCENT = 0.005; // 0.5%
const LUCKY_DRAW_AUTO_PERCENT = 0.20; // 20% of Cashback
const TICKET_PRICE = 10; // USDT

const startCronJobs = (io) => {
    console.log("⏰ Starting Server-Side Cron Jobs...");

    // 1. DAILY CASHBACK, ROI ON ROI & 30-DAY CLEANUP (Runs at 00:00 UTC every day)
    cron.schedule('0 0 * * *', async () => {
        console.log("🔄 Running Daily Maintenance Routine...");
        try {
            // A. CLEANUP: Delete practice accounts older than 30 days without activation
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deleted = await User.deleteMany({
                'activation.tier': 'none',
                'activation.registrationTime': { $lt: thirtyDaysAgo }
            });
            if (deleted.deletedCount > 0) {
                console.log(`🧹 Deleted ${deleted.deletedCount} inactive practice accounts.`);
            }

            // B. CASHBACK: Phase-based and Capping-based distribution
            const activeUsersCount = await User.countDocuments({ isActive: true });
            let cashbackRate = 0.005; // Phase 1: 0.5%
            if (activeUsersCount > 100000) cashbackRate = 0.004; // Phase 2: 0.4%
            if (activeUsersCount > 1000000) cashbackRate = 0.0033; // Phase 3: 0.33%

            const users = await User.find({
                'activation.cashbackActive': true,
                isActive: true,
                'cashbackStats.totalNetLoss': { $gt: 0 }
            });

            for (const user of users) {
                // Tier Benefits for Capping
                // Tier 1: 100% cap (0 refs)
                // Tier 2: 200% cap (5 refs)
                // Tier 3: 400% cap (10 refs)
                // Tier 4: 800% cap (20 refs)
                const refsCount = user.referrals?.length || 0;
                let capMultiplier = 1;
                if (refsCount >= 20) capMultiplier = 8;
                else if (refsCount >= 10) capMultiplier = 4;
                else if (refsCount >= 5) capMultiplier = 2;

                const maxRecovery = user.activation.totalDeposited * capMultiplier;

                if (user.cashbackStats.totalRecovered >= maxRecovery) {
                    // Capping reached - Earnings paused until re-deposit
                    console.log(`User ${user.walletAddress}: Cashback Cap Reached (${maxRecovery} USDT)`);
                    continue;
                }

                // Calculate daily recovery
                let dailyCashback = user.cashbackStats.totalNetLoss * cashbackRate;

                // Ensure we don't exceed max recovery or remaining net loss
                const remainingToCap = maxRecovery - user.cashbackStats.totalRecovered;
                const remainingLoss = user.cashbackStats.totalNetLoss - user.cashbackStats.totalRecovered;

                dailyCashback = Math.min(dailyCashback, remainingToCap, remainingLoss);

                if (dailyCashback > 0) {
                    // Update stats
                    user.cashbackStats.totalRecovered += dailyCashback;
                    user.cashbackStats.todayCashback = dailyCashback; // Basis for ROI on ROI

                    // 20% Auto-fund Lucky Draw from Daily Cashback
                    const luckyDrawFunding = dailyCashback * LUCKY_DRAW_AUTO_PERCENT;
                    const netCashback = dailyCashback - luckyDrawFunding;

                    user.realBalances.cashback += netCashback;
                    user.realBalances.luckyDrawWallet += luckyDrawFunding;

                    await user.save();
                }
            }

            // C. ROI ON ROI: Distribute commissions based on today's cashback
            console.log("📈 Distributing ROI on ROI commissions...");
            const { processDailyRoi } = require('../utils/roiOnRoiUtils');
            await processDailyRoi(io);

        } catch (error) {
            console.error("Critical Maintenance Cron Error:", error);
        }
    });

    // 2. CLUB RANK UPDATE & INCOME DISTRIBUTION (Runs at 00:30 UTC every day)
    cron.schedule('30 0 * * *', async () => {
        console.log("🏆 Updating Club Ranks and Distributing Income...");
        try {
            const users = await User.find({ isActive: true });

            for (const user of users) {
                const newRank = calculateUserRank(user);

                if (newRank !== user.clubRank) {
                    const oldRank = user.clubRank;
                    user.clubRank = newRank;
                    await user.save();
                    console.log(`User ${user.walletAddress} promoted from ${oldRank} to ${newRank}`);

                    if (io) {
                        io.to(user._id.toString()).emit('balance_update', {
                            type: 'rank_up',
                            message: `Congratulations! You've reached ${newRank}!`,
                            newRank: newRank
                        });
                    }
                }
            }

            // After ranks are updated, distribute the turnover pool
            await processDailyClubIncome(io);

        } catch (error) {
            console.error("Club Income Cron Error:", error);
        }
    });

    // 3. LUCKY DRAW AUTO-ENTRY (Runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
        console.log("🎫 Checking Lucky Draw Auto-Entries...");
        try {
            const users = await User.find({
                'realBalances.luckyDrawWallet': { $gte: TICKET_PRICE },
                'settings.autoLuckyDraw': true
            });

            for (const user of users) {
                const walletBalance = user.realBalances.luckyDrawWallet;
                const ticketsToBuy = Math.floor(walletBalance / TICKET_PRICE);

                if (ticketsToBuy > 0) {
                    try {
                        const JackpotService = require('./jackpotService');
                        const jackpotService = new JackpotService(io);
                        await jackpotService.purchaseTickets(user._id, ticketsToBuy);

                        console.log(`User ${user.walletAddress}: Auto-bought ${ticketsToBuy} tickets via cron`);
                    } catch (error) {
                        console.error(`Lucky Draw Auto-Entry failed for ${user.walletAddress}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error("Lucky Draw Cron Error:", error);
        }
    });
};

module.exports = { startCronJobs };
