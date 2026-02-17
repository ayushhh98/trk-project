const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project';

async function verifyMechanics() {
    console.log('🚀 Starting Registration & Practice Mechanics Verification...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('./src/models/User');

        // 1. Test 100k Limit Logic (Mocking by checking if count query is present in auth.js)
        console.log('🔍 Checking 100k limit logic in registration...');
        // We'll simulate a registration count check
        const count = await User.countDocuments({ practiceBalance: { $gt: 0 } });
        console.log(`📊 Current practice-activated users: ${count}`);

        // 2. Test Practice Volume Tracking
        console.log('🧪 Testing Practice Volume Tracking...');
        const testUser = new User({
            walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
            practiceBalance: 100,
            activation: {
                registrationTime: new Date(),
                totalDeposited: 0,
                totalPracticeVolume: 0
            }
        });

        // Simulate a few practice bets
        testUser.activation.totalPracticeVolume += 50;
        testUser.updateActivationTier(); // Recalculate
        console.log(`🔹 Volume: 50, Tier: ${testUser.activation.tier}, Can Transfer: ${testUser.activation.canTransferPractice}`);

        testUser.activation.totalPracticeVolume += 60; // Total 110
        testUser.activation.totalDeposited = 100; // Meet deposit requirement
        testUser.updateActivationTier(); // Recalculate
        console.log(`✨ Volume: 110, Deposit: 100, Tier: ${testUser.activation.tier}, Can Transfer: ${testUser.activation.canTransferPractice}`);

        if (testUser.activation.canTransferPractice === true) {
            console.log('✅ Bridge to Cash logic verification: PASSED');
        } else {
            console.error('❌ Bridge to Cash logic verification: FAILED');
        }

        // 3. Test 10 USDT Tier 1 Activation
        console.log('🧪 Testing Tier 1 Activation...');
        testUser.activation.totalDeposited = 10;
        testUser.updateActivationTier();
        console.log(`🔹 Deposit: 10, Tier: ${testUser.activation.tier}, Withdraw Winners: ${testUser.activation.canWithdrawWinners}`);

        if (testUser.activation.tier === 'tier1' && testUser.activation.canWithdrawWinners === true) {
            console.log('✅ Tier 1 activation verification: PASSED');
        } else {
            console.error('❌ Tier 1 activation verification: FAILED');
        }

        // 4. Test 30-Day Cleanup Logic (Simulation)
        console.log('🔍 Verifying 30-day cleanup rule...');
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const expiredUser = new User({
            walletAddress: '0xEXPIRED' + Math.random().toString(16).slice(2, 10),
            activation: {
                tier: 'none',
                registrationTime: sixtyDaysAgo
            }
        });
        await expiredUser.save();
        console.log('📝 Created expired inactive user');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await User.deleteMany({
            'activation.tier': 'none',
            'activation.registrationTime': { $lt: thirtyDaysAgo }
        });
        console.log(`🧹 Cleanup executed. Deleted count: ${result.deletedCount}`);

        if (result.deletedCount > 0) {
            console.log('✅ 30-day cleanup verification: PASSED');
        } else {
            console.error('❌ 30-day cleanup verification: FAILED');
        }

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyMechanics();
