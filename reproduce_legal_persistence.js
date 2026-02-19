const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const User = require('./backend/src/models/User'); // Adjust path as needed
const jwt = require('jsonwebtoken');

// Config
const API_URL = 'http://localhost:5000/api/admin/legal';
const TEST_CONTENT = "This is a persistence test content " + Date.now();
const TEST_TYPE = "privacy_policy";

async function runTest() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Get Admin Token
        const admin = await User.findOne({ role: 'superadmin' });
        if (!admin) throw new Error('No superadmin found');

        const token = jwt.sign(
            { id: admin._id, walletAddress: admin.walletAddress, role: admin.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '1h' }
        );
        console.log('🔑 Got Admin Token');

        // 2. Save Content
        console.log(`💾 Saving content for ${TEST_TYPE}...`);
        await makeRequest('PUT', `${API_URL}/${TEST_TYPE}`, token, { content: TEST_CONTENT });
        console.log('✅ Content saved.');

        // 3. Fetch immediately
        console.log('🔍 Fetching immediately...');
        const data1 = await makeRequest('GET', API_URL, token);
        const savedContent1 = data1.data[TEST_TYPE]?.content;

        if (savedContent1 !== TEST_CONTENT) {
            console.error('❌ MMEDIATE FETCH FAILED!');
            console.error('Expected:', TEST_CONTENT);
            console.error('Got:', savedContent1);
        } else {
            console.log('✅ Immediate fetch verified.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

function makeRequest(method, url, token, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject(new Error(parsed.message || 'Request failed'));
                    else resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

runTest();
