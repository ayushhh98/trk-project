// verify_realtime_activation.js
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

const API_Base = 'http://localhost:5000/api';
const EMAIL = `test_activation_${Date.now()}@test.com`;
const PASSWORD = 'password123';

async function request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
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

async function run() {
    console.log("🚀 Starting Real-Time Activation Verification...");

    try {
        // Connect to DB to get OTP
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to DB for OTP retrieval.");

        // 1. Register User
        console.log(`\n1. Registering user: ${EMAIL}...`);
        const regRes = await request('POST', '/auth/register', {
            email: EMAIL,
            password: PASSWORD,
            referrerCode: null
        });

        if (regRes.status !== 201) {
            throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
        }
        console.log("✅ Registration successful. Fetching OTP...");

        // 2. Get OTP from DB
        const user = await User.findOne({ email: EMAIL }).select('+emailOtp');
        if (!user) throw new Error("User not found in DB");
        const otp = user.emailOtp;
        console.log(`✅ OTP Found: ${otp}`);

        // 3. Verify OTP
        console.log("\n2. Verifying OTP...");
        const verifyRes = await request('POST', '/auth/verify-otp', {
            email: EMAIL,
            otp: otp
        });

        if (verifyRes.status !== 200) {
            throw new Error(`OTP Verification failed: ${JSON.stringify(verifyRes.body)}`);
        }
        console.log("✅ OTP Verified.");

        // 4. Login
        console.log("\n3. Logging in...");
        const loginRes = await request('POST', '/auth/login-email', {
            email: EMAIL,
            password: PASSWORD
        });

        if (loginRes.status !== 200) {
            throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
        }

        const token = loginRes.body.data.accessToken;
        console.log("✅ Logged in. Token received:", token ? token.substring(0, 20) + "..." : "NULL");

        // 5. Initial Status
        console.log("\n4. Checking Initial Status (Tier None)...");
        const initRes = await request('GET', '/deposit/status', null, token);

        if (initRes.status !== 200) {
            throw new Error(`Initial status check failed: ${JSON.stringify(initRes.body)}`);
        }

        const initData = initRes.body.data;
        console.log(`Tier: ${initData.tier}`);
        console.log(`Direct Withdraw: ${initData.unlockedFeatures.canWithdrawDirectLevel}`);

        if (initData.tier !== 'none') throw new Error("Initial tier should be none");

        // 6. Deposit 10 USDT
        console.log("\n5. Depositing 10 USDT (Tier 1)...");
        const dep1Res = await request('POST', '/deposit/deposit', {
            amount: 10,
            txHash: '0xTestHash1'
        }, token);

        if (dep1Res.status !== 200) throw new Error(`Deposit 1 failed: ${JSON.stringify(dep1Res.body)}`);

        const tier1Data = dep1Res.body.data.activation;
        console.log(`New Tier: ${tier1Data.tier}`);
        console.log(`Direct Withdraw: ${tier1Data.canWithdrawDirectLevel}`);
        console.log(`All Withdraw: ${tier1Data.canWithdrawAll}`);

        if (tier1Data.tier !== 'tier1') throw new Error("Should be Tier 1");
        if (!tier1Data.canWithdrawDirectLevel) throw new Error("Should allow Direct Level withdraw");
        if (tier1Data.canWithdrawAll) throw new Error("Should NOT allow All Withdraw");

        // 7. Deposit 90 USDT (Total 100)
        console.log("\n6. Depositing 90 USDT (Tier 2)...");
        const dep2Res = await request('POST', '/deposit/deposit', {
            amount: 90,
            txHash: '0xTestHash2'
        }, token);

        if (dep2Res.status !== 200) throw new Error(`Deposit 2 failed: ${JSON.stringify(dep2Res.body)}`);

        const tier2Data = dep2Res.body.data.activation;
        console.log(`New Tier: ${tier2Data.tier}`);
        console.log(`All Withdraw: ${tier2Data.canWithdrawAll}`);
        console.log(`All Streams: ${tier2Data.allStreamsUnlocked}`);

        if (tier2Data.tier !== 'tier2') throw new Error("Should be Tier 2");
        if (!tier2Data.canWithdrawAll) throw new Error("Should allow All Withdraw");
        if (!tier2Data.allStreamsUnlocked) throw new Error("Should unlock All Streams");

        console.log("\n✅ REAL-TIME VERIFICATION PASSED!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

run();
