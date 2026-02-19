const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
const API_URL = 'http://localhost:5000/api/admin/legal';
const TARGET_WALLET = process.env.ADMIN_WALLETS.split(',')[0]; // Use the first admin wallet

async function run() {
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('   Connected.');

    console.log(`2. Finding admin user (${TARGET_WALLET})...`);
    const User = mongoose.model('User', new mongoose.Schema({ walletAddress: String, role: String }));
    const admin = await User.findOne({ walletAddress: { $regex: new RegExp(TARGET_WALLET, 'i') } });

    if (!admin) {
        console.error('   ❌ Admin user not found! Cannot generate valid token.');
        process.exit(1);
    }
    console.log(`   Found admin: ${admin._id} (Role: ${admin.role})`);

    console.log('3. Generating JWT...');
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '15m' });
    console.log('   Token generated.');

    const newContent = `Terms verified at ${new Date().toISOString()}`;

    console.log('4. Testing PUT /api/admin/legal/terms...');
    const updateRes = await fetch(`${API_URL}/terms`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
    });

    const updateData = await updateRes.json();
    console.log(`   Status: ${updateRes.status}`);
    console.log(`   Response: ${JSON.stringify(updateData)}`);

    if (updateData.status === 'success') {
        console.log('   ✅ Update Successful!');
    } else {
        console.error('   ❌ Update Failed!');
        process.exit(1);
    }

    console.log('5. Testing GET /api/admin/legal to verify persistence...');
    const getRes = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();

    const savedContent = getData.data?.terms?.content;
    console.log(`   Saved Content: "${savedContent}"`);

    if (savedContent === newContent) {
        console.log('   ✅ Verification Passed: Content matches!');
    } else {
        console.error('   ❌ Verification Failed: Content mismatch!');
    }

    console.log('6. Cleaning up...');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
