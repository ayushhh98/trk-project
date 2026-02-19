
const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
require('dotenv').config({ path: './backend/.env' });

async function checkReferrals() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // find the user with email 'admin@trk.com' or similar if known, 
        // OR just list users with referrals.
        // Since I don't know the exact user the user is logged in as, 
        // I will list users who have referrals.

        const referrers = await User.find({ 'referrals.0': { $exists: true } }).limit(5);
        if (referrers.length === 0) {
            console.log('No users found with referrals.');
        } else {
            for (const referrer of referrers) {
                console.log(`User: ${referrer.email} (${referrer.walletAddress})`);
                console.log(`Referral Code: ${referrer.referralCode}`);
                console.log(`Direct Referrals: ${referrer.referrals.length}`);

                // Check Level 1 count manually
                const level1 = await User.countDocuments({ referredBy: referrer._id });
                console.log(`Level 1 Count (DB): ${level1}`);
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
