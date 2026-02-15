const mongoose = require('mongoose');
const User = require('../src/models/User');

async function runTest() {
    try {
        console.log("🚀 Starting Unit Test for Activation Logic...");

        // We don't connect to DB. We just use the Model constructor to creating an instance.
        // Mongoose allows creating documents without connection for validation/sync methods.

        const user = new User({
            walletAddress: "0xTestStrictActivation",
            activation: { totalDeposited: 0 }
        });
        console.log(`Created in-memory user instance.`);

        // 2. Test Tier None (< 10)
        console.log("\n--- Testing Tier None (5 USDT) ---");
        user.activation.totalDeposited = 5;
        user.updateActivationTier();

        console.log(`Tier: ${user.activation.tier} (Expected: none)`);
        console.log(`Direct Withdraw: ${user.activation.canWithdrawDirectLevel} (Expected: false)`);
        console.log(`All Withdraw: ${user.activation.canWithdrawAll} (Expected: false)`);

        if (user.activation.tier !== 'none') throw new Error("Tier None Check Failed");

        // 3. Test Tier 1 (10 USDT)
        console.log("\n--- Testing Tier 1 (10 USDT) ---");
        user.activation.totalDeposited = 10;
        user.updateActivationTier();

        console.log(`Tier: ${user.activation.tier} (Expected: tier1)`);
        console.log(`Direct Withdraw: ${user.activation.canWithdrawDirectLevel} (Expected: true)`);
        console.log(`All Withdraw: ${user.activation.canWithdrawAll} (Expected: false)`); // Critical Strict Check
        console.log(`Transfer Practice: ${user.activation.canTransferPractice} (Expected: false)`);

        if (user.activation.tier !== 'tier1') throw new Error("Tier 1 Tier Check Failed");
        if (!user.activation.canWithdrawDirectLevel) throw new Error("Tier 1 Direct Withdraw Check Failed");
        if (user.activation.canWithdrawAll) throw new Error("Tier 1 Strict Restriction Failed (canWithdrawAll should be false)");

        // 4. Test Tier 2 (100 USDT)
        console.log("\n--- Testing Tier 2 (100 USDT) ---");
        user.activation.totalDeposited = 100;
        user.updateActivationTier();

        console.log(`Tier: ${user.activation.tier} (Expected: tier2)`);
        console.log(`Direct Withdraw: ${user.activation.canWithdrawDirectLevel} (Expected: true)`);
        console.log(`All Withdraw: ${user.activation.canWithdrawAll} (Expected: true)`);
        console.log(`Transfer Practice: ${user.activation.canTransferPractice} (Expected: true)`);
        console.log(`All Streams: ${user.activation.allStreamsUnlocked} (Expected: true)`);

        if (user.activation.tier !== 'tier2') throw new Error("Tier 2 Tier Check Failed");
        if (!user.activation.canWithdrawAll) throw new Error("Tier 2 All Withdraw Check Failed");
        if (!user.activation.allStreamsUnlocked) throw new Error("Tier 2 All Streams Check Failed");

        console.log("\n✅ ALL UNIT TESTS PASSED!");
        process.exit(0);

    } catch (error) {
        console.error("❌ verification failed:", error);
        process.exit(1);
    }
}

runTest();
