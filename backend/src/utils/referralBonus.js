const User = require('../models/User');

const getReferralSignupBonus = () => {
    const bonus = Number(process.env.REFERRAL_SIGNUP_BONUS || 10);
    return Number.isFinite(bonus) ? bonus : 10;
};

const awardReferralSignupBonus = async ({ referrerId, referredUserId, io }) => {
    if (!referrerId || !referredUserId) return { awarded: false, reason: 'missing' };

    const referrer = await User.findById(referrerId);
    if (!referrer) return { awarded: false, reason: 'not_found' };

    if (!Array.isArray(referrer.referrals)) {
        referrer.referrals = [];
    }

    const referredIdStr = referredUserId.toString();
    const alreadyLinked = referrer.referrals.some((id) => id.toString() === referredIdStr);
    if (!alreadyLinked) {
        referrer.referrals.push(referredUserId);
        if (!referrer.teamStats) referrer.teamStats = {};
        if (typeof referrer.teamStats.totalMembers !== 'number') {
            referrer.teamStats.totalMembers = 0;
        }
        referrer.teamStats.totalMembers += 1;
    }

    if (!referrer.realBalances) referrer.realBalances = {};
    if (typeof referrer.realBalances.directLevel !== 'number') {
        referrer.realBalances.directLevel = 0;
    }

    const bonus = getReferralSignupBonus();
    referrer.realBalances.directLevel += bonus;
    await referrer.save();

    if (io) {
        io.to(referrer._id.toString()).emit('balance_update', {
            type: 'referral_bonus',
            amount: bonus,
            newBalance: referrer.realBalances.directLevel
        });

        io.to(referrer._id.toString()).emit('referral_activity', {
            type: 'signup',
            userId: referredUserId,
            amount: bonus,
            userName: 'New referral',
            timestamp: new Date()
        });
    }

    return { awarded: true, bonus };
};

module.exports = {
    awardReferralSignupBonus,
    getReferralSignupBonus
};
