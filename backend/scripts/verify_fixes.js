// verify_fixes.js
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});

const API_Base = 'http://localhost:5002/api';
const LEADER_EMAIL = `leader_${Date.now()}@test.com`;
const PLAYER_EMAIL = `player_${Date.now()}@test.com`;
const PASSWORD = 'password123';

async function request(method, path, body = null, token = null, extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return new Promise((resolve, reject) => {
        const req = http.request(`${API_Base}${path}`, {
            method,
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Helper to register and login
async function registerAndLogin(email) {
    console.log(`[DEBUG] Registering ${email}...`);
    // Register
    const regRes = await request('POST', '/auth/register', { email, password: PASSWORD });
    console.log(`[DEBUG] Register Status: ${regRes.status}`);

    // Get OTP from DB
    console.log(`[DEBUG] Fetching OTP from DB...`);
    const user = await User.findOne({ email }).select('+emailOtp');
    if (!user) {
        console.error(`[DEBUG] User not found for email: ${email}`);
        throw new Error("User not found");
    }
    const otp = user.emailOtp;
    console.log(`[DEBUG] OTP Found: ${otp}`);

    // Verify
    const verifyRes = await request('POST', '/auth/verify-otp', { email, otp });
    console.log(`[DEBUG] Verify Status: ${verifyRes.status}`);

    // Login
    const loginRes = await request('POST', '/auth/login-email', { email, password: PASSWORD });
    console.log(`[DEBUG] Login Status: ${loginRes.status}`);

    if (!loginRes.body.data || !loginRes.body.data.accessToken) {
        console.error(`[DEBUG] Login Failed: ${JSON.stringify(loginRes.body)}`);
        throw new Error("Login failed");
    }

    return { token: loginRes.body.data.accessToken, id: loginRes.body.data.user.id };
}

async function run() {
    console.log("🚀 Starting Fixes Verification...");

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to DB.");

        // ==========================================
        // TEST 1: Cashback Referral Boosts
        // ==========================================
        console.log("\n🧪 1. Testing Cashback Referral Boosts...");

        const leader = await registerAndLogin(LEADER_EMAIL);
        console.log(`Leader registered: ${LEADER_EMAIL}`);

        // Create 5 Referrals with 100 USDT deposits
        console.log("Creating 5 qualified referrals...");
        const refIds = [];
        try {
            for (let i = 0; i < 5; i++) {
                const refEmail = `ref_${Date.now()}_${i}@test.com`;
                console.log(`Creating ref ${i}: ${refEmail}`);
                // Manually create user to save time
                const refUser = await User.create({
                    email: refEmail,
                    password: 'hashedpassword',
                    referredBy: leader.id,
                    isEmailVerified: true,
                    deposits: [{ amount: 100, status: 'completed' }] // Qualified
                });
                refIds.push(refUser._id);
                // Update leader's referral list
                await User.findByIdAndUpdate(leader.id, { $addToSet: { referrals: refUser._id } });
            }
        } catch (err) {
            console.error("Reference creation failed:", err);
            throw err;
        }

        // Check Status (Should be 2X)
        const statusRes1 = await request('GET', '/cashback/status', null, leader.token);
        const boost1 = statusRes1.body.data.boostTier;
        console.log(`Boost Tier Object:`, JSON.stringify(boost1, null, 2));
        console.log(`Boost with 5 Refs: ${boost1.name} (Multiplier: ${boost1.multiplier}X)`);

        if (boost1.multiplier !== 2) throw new Error(`Expected 2X multiplier, got ${boost1.multiplier}X`);
        if (statusRes1.body.data.boostTier.referralCount !== 5) throw new Error("Referral count mismatch");

        // Add 5 more (Total 10)
        console.log("Adding 5 more qualified referrals...");
        for (let i = 5; i < 10; i++) {
            const refEmail = `ref_${Date.now()}_${i}@test.com`;
            const refUser = await User.create({
                email: refEmail,
                password: 'hashedpassword',
                referredBy: leader.id,
                isEmailVerified: true,
                deposits: [{ amount: 100, status: 'completed' }]
            });
            await User.findByIdAndUpdate(leader.id, { $addToSet: { referrals: refUser._id } });
        }

        // Check Status (Should be 4X)
        const statusRes2 = await request('GET', '/cashback/status', null, leader.token);
        const boost2 = statusRes2.body.data.boostTier;
        console.log(`Boost with 10 Refs: ${boost2.name} (Multiplier: ${boost2.multiplier}X)`);

        if (boost2.multiplier !== 4) throw new Error(`Expected 4X multiplier, got ${boost2.multiplier}X`);

        console.log("✅ Cashback Boost Logic Verified.");


        // ==========================================
        // TEST 2: Winners 8X Income Split
        // ==========================================
        console.log("\n🧪 2. Testing Winners 8X Income Split...");

        const player = await registerAndLogin(PLAYER_EMAIL);
        console.log(`Player registered: ${PLAYER_EMAIL}`);

        // Give player balance manually
        await User.findByIdAndUpdate(player.id, {
            realBalances: { game: 1000, cash: 0, walletBalance: 0 }
        });

        // Play Matrix Game (Picked 1 => 99% Win Chance)
        // Multiplier for Pick 1 (Risk 1) is roughly 1.01X?
        // Wait, calculateOutcome: multiplier = 100 / (100 - 1) = 1.0101...
        // Let's pick something with higher return to verify split easier.
        // Pick 50 (50% chance). Multiplier 2X.
        // Pick 80 (20% chance). Multiplier 5X.
        // Let's stick to 1 for high win rate, payout is mostly return of capital but strictly calculated.

        // Let's force a seed using clientSeed? No.
        // I will Loop until win.

        const BET_AMOUNT = 100;
        let won = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5; // With 99% win chance, 1 should be enough.

        while (!won && attempts < MAX_ATTEMPTS) {
            attempts++;
            console.log(`Attempt ${attempts}: Placing bet...`);

            // Phase 1: Commit
            const requestId = crypto.randomUUID();
            const commitRes = await request('POST', '/game/bet/commit', {
                betData: {
                    gameType: 'real',
                    gameVariant: 'matrix',
                    betAmount: 10,
                    pickedNumber: 1, // 99% Win Chance
                    gameId: 'matrix-1'
                },
                nonce: Date.now() + attempts
            }, player.token, { 'x-request-id': requestId });

            if (commitRes.status !== 200) throw new Error(`Commit failed: ${JSON.stringify(commitRes.body)}`);

            // Phase 2: Reveal
            const revealRes = await request('POST', '/game/bet/reveal', {
                commitmentId: commitRes.body.data.commitmentId
            }, player.token);

            if (revealRes.status !== 200) throw new Error(`Reveal failed: ${JSON.stringify(revealRes.body)}`);

            const result = revealRes.body.data.game;

            if (result.isWin) {
                won = true;
                const payout = result.payout;
                console.log(`🎉 WON! Payout: ${payout} USDT`);

                // Fetch User Balance from DB to verify split
                const dbUser = await User.findById(player.id);
                // realBalances.cash should be 25% of payout
                // realBalances.game should be Start(1000) - Bet(100) + 75% Payout

                const expectedCash = payout * 0.25;
                const expectedGame = 1000 - BET_AMOUNT + (payout * 0.75);

                console.log(`DB Cash: ${dbUser.realBalances.cash} (Expected: ${expectedCash})`);
                console.log(`DB Game: ${dbUser.realBalances.game} (Expected: ${expectedGame})`);

                if (Math.abs(dbUser.realBalances.cash - expectedCash) > 0.01)
                    throw new Error("Cash balance mismatch (Direct Wallet Split Failed)");

                if (Math.abs(dbUser.realBalances.game - expectedGame) > 0.01)
                    throw new Error("Game balance mismatch (Auto-Compound Split Failed)");

            } else {
                console.log("Lost. Retrying...");
            }
        }

        if (!won) throw new Error("Could not trigger a win to verify split.");

        console.log("✅ Winners 8X Split Verified.");

        console.log("\n✅ ALL FIXES VERIFIED SUCCESSFULLY!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

run();
