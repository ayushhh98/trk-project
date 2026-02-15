const mongoose = require('mongoose');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Mock Admin Email to test
const TEST_ADMIN_EMAIL = 'admin_test@trk.com';

// Override env for testing
process.env.ADMIN_EMAILS = `${process.env.ADMIN_EMAILS || ''},${TEST_ADMIN_EMAIL}`;

// Helper request function
const API_Base = 'http://localhost:5002/api';

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
    console.log("🚀 Starting Authentication Verification...");

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to DB.");

        // Clean up previous test users
        await User.deleteMany({ email: { $regex: /@authtest\.com$/ } });
        await User.deleteOne({ email: TEST_ADMIN_EMAIL });

        const USER_EMAIL = `user_${Date.now()}@authtest.com`;
        const PASSWORD = 'password123';

        // ============================================
        // TEST 1: User Registration
        // ============================================
        console.log("\n🧪 1. Testing User Registration...");

        const regRes = await request('POST', '/auth/register', {
            email: USER_EMAIL,
            password: PASSWORD
        });

        console.log(`Registration Response: ${regRes.status}`, regRes.body);

        if (regRes.status !== 201) throw new Error("Registration Failed");

        // Fetch OTP
        const user = await User.findOne({ email: USER_EMAIL }).select('+emailOtp');
        if (!user) throw new Error("User not created in DB");
        console.log(`User created. OTP: ${user.emailOtp}`);

        // ============================================
        // TEST 2: Verify OTP
        // ============================================
        console.log("\n🧪 2. Testing OTP Verification...");

        const verifyRes = await request('POST', '/auth/verify-otp', {
            email: USER_EMAIL,
            otp: user.emailOtp
        });

        console.log(`Verify Response: ${verifyRes.status}`, verifyRes.body);
        if (verifyRes.status !== 200) throw new Error("OTP Verification Failed");


        // ============================================
        // TEST 3: User Login
        // ============================================
        console.log("\n🧪 3. Testing User Login...");

        const loginRes = await request('POST', '/auth/login-email', {
            email: USER_EMAIL,
            password: PASSWORD
        });

        console.log(`Login Response: ${loginRes.status}`);

        if (loginRes.status !== 200) throw new Error("Login Failed");
        if (loginRes.body.data.user.role !== 'player') throw new Error(`Incorrect Role: Expected player, got ${loginRes.body.data.user.role}`);

        const userToken = loginRes.body.data.accessToken;
        console.log("✅ User Login Successful. Role: Player");


        // ============================================
        // TEST 4: Admin Access (Should Fail for Player)
        // ============================================
        console.log("\n🧪 4. Testing Admin Access as Player (Should Fail)...");

        // Assuming there's an admin route. Let's try to hit /lucky-draw/admin/toggle-pause which requires admin
        const adminAccessRes = await request('POST', '/lucky-draw/admin/toggle-pause', {}, userToken);
        console.log(`Admin Route Access: ${adminAccessRes.status} (Expected 403/401)`);

        if (adminAccessRes.status !== 403 && adminAccessRes.status !== 401) {
            throw new Error("Player was able to access admin route!");
        }
        console.log("✅ Player correctly denied admin access.");


        // ============================================
        // TEST 5: Admin Login
        // ============================================
        console.log("\n🧪 5. Testing Admin Login...");

        // Setup: Manually create an admin user in DB because registration defaults to 'player'
        // UNLESS the email is in env.ADMIN_EMAILS.
        // We hacked process.env above, but the server process might not see it if it's already running.
        // The server process is separate! My process.env change here WON'T affect the running server.
        // SO: correctly testing admin login requires creating a user and manually setting role to 'admin' in DB, 
        // OR restarting server with new env.
        // Easier: Manually update role in DB.

        await User.findOneAndUpdate({ email: USER_EMAIL }, { role: 'admin' });
        console.log("Updated user role to 'admin' in DB...");

        // Relogin to get new token with admin role
        const adminLoginRes = await request('POST', '/auth/login-email', {
            email: USER_EMAIL,
            password: PASSWORD
        });

        if (adminLoginRes.status !== 200) throw new Error("Admin Login Failed");
        if (adminLoginRes.body.data.user.role !== 'admin') throw new Error(`Role update failed. Got ${adminLoginRes.body.data.user.role}`);

        const adminToken = adminLoginRes.body.data.accessToken;
        console.log("✅ Admin Login Successful. Role: Admin");

        // Verify Access
        // Trigger a harmless admin action or check an admin-only GET
        // /lucky-draw/admin/toggle-pause toggles it, checking status is safer but might not be admin-only.
        // /roionroi/admin/update-rates is admin only.

        const adminCheckRes = await request('POST', '/roi-on-roi/admin/update-rates', { rates: { 1: 0.20 } }, adminToken);
        console.log(`Admin Action Status: ${adminCheckRes.status}`);

        if (adminCheckRes.status !== 200) throw new Error("Admin access failed even with admin role");

        console.log("✅ Admin Access Verified.");

        console.log("\n✅ ALL AUTHENTICATION FLOWS VERIFIED!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Auth Verification Failed:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

run();
