
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: './.env' });

async function analyzeUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const totalUsers = await User.countDocuments();
        console.log(`Total Users: ${totalUsers}`);

        const users = await User.find({}).select('email walletAddress activation referrals referredBy createdAt');

        console.log('\n--- User Analysis ---');
        users.forEach(u => {
            const isTier1 = u.activation?.tier === 'tier1';
            const isTier2 = u.activation?.tier === 'tier2';
            const referralCount = u.referrals?.length || 0;
            const hasReferrer = !!u.referredBy;

            console.log(`ID: ${u._id}`);
            console.log(`   Email: ${u.email || 'N/A'}`);
            console.log(`   Wallet: ${u.walletAddress || 'N/A'}`);
            console.log(`   Tier: ${u.activation?.tier || 'none'} (Valid: ${isTier1 || isTier2})`);
            console.log(`   Referrals: ${referralCount}`);
            console.log(`   Referred By: ${hasReferrer ? 'Yes' : 'No'}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

analyzeUsers();
