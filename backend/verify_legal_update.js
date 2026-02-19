const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
const API_HOST = 'localhost';
const API_PORT = 5000;
const TARGET_WALLET = process.env.ADMIN_WALLETS ? process.env.ADMIN_WALLETS.split(',')[0] : '';

// Helper for HTTP requests
function httpRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log('1. Connecting to MongoDB...');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('   Connected.');
    } catch (e) {
        console.error('   ❌ MongoDB Connection Failed:', e);
        process.exit(1);
    }

    console.log(`2. Finding admin user (${TARGET_WALLET})...`);
    if (!TARGET_WALLET) {
        console.error('   ❌ ADMIN_WALLETS not found in env');
        process.exit(1);
    }

    const User = mongoose.model('User', new mongoose.Schema({ walletAddress: String, role: String }, { strict: false }));
    const admin = await User.findOne({ walletAddress: { $regex: new RegExp(TARGET_WALLET, 'i') } });

    if (!admin) {
        console.error('   ❌ Admin user not found! Cannot generate valid token.');
        process.exit(1);
    }
    console.log(`   Found admin: ${admin._id} (Role: ${admin.role})`);

    console.debug('DEBUG: JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 'undefined');

    console.log('3. Generating JWT...');
    let token;
    try {
        if (!JWT_SECRET) throw new Error('JWT_SECRET is missing from env');
        token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '15m' });
        console.log('   Token generated.');
    } catch (e) {
        console.error('   ❌ JWT Generation Failed:', e);
        process.exit(1);
    }

    const newContent = `Terms update verified at ${new Date().toISOString()}`;

    console.log('4. Testing PUT /api/admin/legal/terms...');
    try {
        const updateRes = await httpRequest('PUT', '/api/admin/legal/terms', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }, { content: newContent });

        console.log(`   Status: ${updateRes.status}`);
        console.log(`   Response: ${JSON.stringify(updateRes.data)}`);

        if (updateRes.data.status === 'success') {
            console.log('   ✅ Update Successful!');
        } else {
            console.error('   ❌ Update Failed!');
            process.exit(1);
        }
    } catch (e) {
        console.error('   ❌ Request Failed:', e);
        process.exit(1);
    }

    console.log('5. Testing GET /api/admin/legal to verify persistence...');
    try {
        const getRes = await httpRequest('GET', '/api/admin/legal', {
            'Authorization': `Bearer ${token}`
        });

        const savedContent = getRes.data.data?.terms?.content;
        console.log(`   Saved Content: "${savedContent}"`);

        if (savedContent === newContent) {
            console.log('   ✅ Verification Passed: Content matches!');
        } else {
            console.error('   ❌ Verification Failed: Content mismatch!');
            console.error(`      Expected: ${newContent}`);
            console.error(`      Received: ${savedContent}`);
            process.exit(1);
        }
    } catch (e) {
        console.error('   ❌ Request Failed:', e);
        process.exit(1);
    }

    console.log('6. Cleaning up...');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
