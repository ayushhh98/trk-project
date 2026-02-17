const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project';

async function verifyProductionRewards() {
    console.log('🚀 Starting Production Practice Rewards Verification...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('./src/models/User');
        const { distributePracticeRewards } = require('./src/utils/incomeDistributor');

        // Clean up previous test users
        await User.deleteMany({ walletAddress: { $regex: /^0xTEST/ } });

        // 1. Create a chain of 100 users for multi-level testing
        console.log('🧪 Creating a chain of 101 users (1 referrer -> ... -> 100th level)...');
        let uplineId = null;
        const users = [];

        for (let i = 0; i <= 100; i++) {
            const user = new User({
                walletAddress: `0xTEST_USER_${i}_` + Math.random().toString(16).slice(2, 10),
                referredBy: uplineId,
                practiceBalance: 0
            });
            await user.save();
            users.push(user);
            uplineId = user._id;
        }
        console.log('✅ Chain created.');

        // 2. Trigger reward distribution from the 101st user (Level 100's referral)
        console.log('💸 Distributing rewards for User 101...');
        await distributePracticeRewards(users[100]._id, users[99]._id);

        // 3. Verify specific levels
        const expectedRewards = [
            { level: 1, index: 99, expected: 10 },
            { level: 2, index: 98, expected: 2 },
            { level: 5, index: 95, expected: 2 },
            { level: 6, index: 94, expected: 1 },
            { level: 10, index: 90, expected: 1 },
            { level: 11, index: 89, expected: 0.5 },
            { level: 15, index: 85, expected: 0.5 },
            { level: 16, index: 84, expected: 0.25 },
            { level: 50, index: 50, expected: 0.25 },
            { level: 51, index: 49, expected: 0.10 },
            { level: 100, index: 0, expected: 0.10 }
        ];

        console.log('🔍 Checking practice balances across levels...');
        for (const test of expectedRewards) {
            const u = await User.findById(users[test.index]._id);
            console.log(`🔹 Level ${test.level} (User ${test.index}): Balance ${u.practiceBalance} USDT (Expected: ${test.expected})`);
            if (u.practiceBalance !== test.expected) {
                throw new Error(`Mismatch at Level ${test.level}! Got ${u.practiceBalance}, want ${test.expected}`);
            }
        }
        console.log('✅ Multi-level reward distribution: PASSED');

        // 4. Test 20 Direct Referral Limit
        console.log('🧪 Testing 20 direct referral limit...');
        const superReferrer = new User({
            walletAddress: '0xTEST_SUPER_REF_' + Math.random().toString(16).slice(2, 10),
            referrals: [],
            practiceBalance: 0
        });
        await superReferrer.save();

        console.log('Inviting 25 users...');
        for (let j = 1; j <= 25; j++) {
            const newUser = new User({
                walletAddress: `0xTEST_INVITE_${j}_` + Math.random().toString(16).slice(2, 10),
                referredBy: superReferrer._id
            });
            await newUser.save();

            // Link manually as in auth.js logic
            await User.findByIdAndUpdate(superReferrer._id, { $push: { referrals: newUser._id } });

            // Distribute
            await distributePracticeRewards(newUser._id, superReferrer._id);
        }

        const finalReferrer = await User.findById(superReferrer._id);
        console.log(`🔹 Super Referrer Final Balance: ${finalReferrer.practiceBalance} USDT`);
        // Expected: 20 * 10 = 200 USDT
        if (finalReferrer.practiceBalance === 200) {
            console.log('✅ 20 direct referral limit: PASSED');
        } else {
            console.error(`❌ 20 direct referral limit: FAILED (Got ${finalReferrer.practiceBalance}, want 200)`);
        }

        // 5. Test Activation Tiers Benefits
        console.log('🧪 Verifying Activation Tiers Benefits...');
        const tierUser = new User({
            walletAddress: '0xTEST_TIER_' + Math.random().toString(16).slice(2, 10),
            activation: { totalDeposited: 15 } // Tier 1
        });
        tierUser.updateActivationTier();
        console.log(`🔹 Tier 1 (15 USDT): canWithdrawDirectLevel=${tierUser.activation.canWithdrawDirectLevel}, canWithdrawWinners=${tierUser.activation.canWithdrawWinners}`);

        tierUser.activation.totalDeposited = 150; // Tier 2
        tierUser.activation.totalPracticeVolume = 150; // Meet volume bridge
        tierUser.updateActivationTier();
        console.log(`🔹 Tier 2 (150 USDT): canTransferPractice=${tierUser.activation.canTransferPractice}, canWithdrawAll=${tierUser.activation.canWithdrawAll}`);

        if (tierUser.activation.canWithdrawAll && tierUser.activation.canTransferPractice) {
            console.log('✅ Activation Tier benefits: PASSED');
        } else {
            console.error('❌ Activation Tier benefits: FAILED');
        }

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyProductionRewards();
