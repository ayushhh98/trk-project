
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission');
const User = require('./src/models/User');
require('dotenv').config({ path: './.env' });

async function checkCommissions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a user with referrals
        const referrer = await User.findOne({ 'referrals.0': { $exists: true } });
        if (!referrer) {
            console.log('No referrer found.');
            return;
        }

        console.log(`Checking commissions for User: ${referrer.email} (${referrer.walletAddress})`);

        const commissions = await Commission.find({ user: referrer._id });
        console.log(`Total Commissions Found: ${commissions.length}`);

        // Group by level
        const levelStats = {};
        commissions.forEach(c => {
            if (!levelStats[c.level]) levelStats[c.level] = 0;
            levelStats[c.level] += c.amount;
        });

        console.log('Commissions by Level:', levelStats);

        // Show a few samples
        if (commissions.length > 0) {
            console.log('Sample Commissions:', commissions.slice(0, 3));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkCommissions();
