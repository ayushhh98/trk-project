
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: './.env' });

async function checkReferrals() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check for users with referrals
        const referrers = await User.find({ 'referrals.0': { $exists: true } }).limit(5);

        console.log('--- Referrers Found ---');
        if (referrers.length === 0) {
            console.log('No users found with referrals array populated.');
        } else {
            for (const referrer of referrers) {
                console.log(`User: ${referrer.email} (${referrer.walletAddress})`);
                console.log(`Referral Code: ${referrer.referralCode}`);
                console.log(`Direct Referrals (Array): ${referrer.referrals.length}`);

                // Check Level 1 count manually
                const level1 = await User.countDocuments({ referredBy: referrer._id });
                console.log(`Level 1 Count (referredBy query): ${level1}`);
                console.log('-----------------------------------');
            }
        }

        // Also check if there are any users with referredBy set, even if referrals array is empty
        const referredUsers = await User.find({ referredBy: { $ne: null } }).limit(5);
        console.log('--- Referred Users Found ---');
        if (referredUsers.length === 0) {
            console.log('No users found with referredBy set.');
        } else {
            for (const user of referredUsers) {
                console.log(`User: ${user.email} (${user.walletAddress})`);
                const referrer = await User.findById(user.referredBy);
                console.log(`Referred By: ${referrer ? referrer.email : 'Unknown'} (${user.referredBy})`);
                console.log('-----------------------------------');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkReferrals();
