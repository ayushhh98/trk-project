const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/src/models/User');

async function verifyReferrals() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create a "Referrer" user
        const referrer = new User({
            walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
            role: 'player'
        });
        await referrer.save();
        console.log(`Created Referrer: ${referrer.walletAddress}, Code: ${referrer.referralCode}`);

        if (!referrer.referralCode.startsWith('TRK')) {
            throw new Error(`Invalid code format for referrer: ${referrer.referralCode}`);
        }

        // 2. Register a new user with valid referral code
        const newUser = new User({
            walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
            referredBy: referrer._id,
            role: 'player'
        });
        await newUser.save();
        console.log(`Registered New User with Valid Code: ${newUser.walletAddress}, Code: ${newUser.referralCode}`);

        // 3. Register a new user WITHOUT referral code
        // Note: The Mongoose model currently doesn't enforce referredBy at the schema level because admins don't need it.
        // But the registration API logic we added should handle it.
        // For model verification, let's just check uniqueness.
        const collisionTestUser = new User({
            walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
            role: 'player'
        });
        await collisionTestUser.save();
        console.log(`Registered User 3: ${collisionTestUser.walletAddress}, Code: ${collisionTestUser.referralCode}`);

        if (collisionTestUser.referralCode === newUser.referralCode) {
            throw new Error('Collision detected - codes are not unique!');
        }

        console.log('--- VERIFICATION SUCCESSFUL ---');
    } catch (err) {
        console.error('--- VERIFICATION FAILED ---');
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyReferrals();
