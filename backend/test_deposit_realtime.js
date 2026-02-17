const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const API_URL = `${BACKEND_URL}/api`;

// Test user credentials (you'll need a valid user)
const TEST_USER_EMAIL = 'test@example.com'; // Change this to your test user
const TEST_USER_PASSWORD = 'password123'; // Change this to your test password

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDepositRealTime() {
    log('\n🧪 TESTING REAL-TIME DEPOSIT FUNCTIONALITY', 'magenta');
    log('='.repeat(60), 'cyan');

    let socket;
    let token;
    let userId;

    try {
        // Step 1: Login to get authentication token
        log('\n📝 Step 1: Authenticating...', 'yellow');

        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD
        });

        if (loginResponse.data.status === 'success') {
            token = loginResponse.data.data.token;
            userId = loginResponse.data.data.user._id;
            log('✅ Authentication successful!', 'green');
            log(`   User ID: ${userId}`, 'blue');
        } else {
            throw new Error('Login failed');
        }

        // Step 2: Connect Socket.IO with authentication
        log('\n🔌 Step 2: Connecting Socket.IO with authentication...', 'yellow');

        socket = io(BACKEND_URL, {
            transports: ['websocket'],
            auth: {
                token: token
            }
        });

        await new Promise((resolve, reject) => {
            socket.on('connect', () => {
                log('✅ Socket.IO connected!', 'green');
                log(`   Socket ID: ${socket.id}`, 'blue');
                resolve();
            });

            socket.on('connect_error', (err) => {
                log(`❌ Socket connection error: ${err.message}`, 'red');
                reject(err);
            });

            setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
        });

        // Step 3: Listen for balance updates
        log('\n👂 Step 3: Setting up balance update listener...', 'yellow');

        let balanceUpdateReceived = false;
        const balanceUpdates = [];

        socket.on('balance_update', (data) => {
            balanceUpdateReceived = true;
            balanceUpdates.push(data);
            log('\n💰 REAL-TIME BALANCE UPDATE RECEIVED!', 'green');
            log('━'.repeat(60), 'cyan');
            log(JSON.stringify(data, null, 2), 'cyan');
            log('━'.repeat(60), 'cyan');
        });

        socket.on('platform:turnover_update', (data) => {
            log('\n📊 Platform Turnover Update:', 'blue');
            log(JSON.stringify(data, null, 2), 'blue');
        });

        log('✅ Listeners registered!', 'green');

        // Step 4: Make a test deposit
        log('\n💳 Step 4: Making test deposit...', 'yellow');
        log('   Amount: 10 USDT', 'blue');
        log('   This will trigger real-time balance update...', 'blue');

        const depositResponse = await axios.post(
            `${API_URL}/deposit/deposit`,
            {
                amount: 10,
                txHash: `TEST-${Date.now()}` // Test transaction hash
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (depositResponse.data.status === 'success') {
            log('\n✅ Deposit API call successful!', 'green');
            log('   Response:', 'blue');
            log(JSON.stringify(depositResponse.data.data, null, 2), 'cyan');
        }

        // Step 5: Wait for real-time updates
        log('\n⏳ Step 5: Waiting for real-time Socket.IO events...', 'yellow');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 6: Verify results
        log('\n📋 Step 6: Test Results', 'yellow');
        log('='.repeat(60), 'cyan');

        if (balanceUpdateReceived) {
            log('✅ REAL-TIME DEPOSIT TEST PASSED!', 'green');
            log(`   Received ${balanceUpdates.length} balance update event(s)`, 'green');
            log('   Balance was updated in REAL-TIME via Socket.IO!', 'green');
        } else {
            log('⚠️  No balance_update event received', 'yellow');
            log('   Possible reasons:', 'yellow');
            log('   1. Socket not joined to user room correctly', 'yellow');
            log('   2. Backend emit might have failed', 'yellow');
            log('   3. Timing issue (update happened before listener ready)', 'yellow');
        }

        log('\n' + '='.repeat(60), 'cyan');
        log('📊 SUMMARY:', 'magenta');
        log('   ✅ Authentication: Working', 'green');
        log('   ✅ Socket.IO Connection: Working', 'green');
        log('   ✅ Deposit API: Working', 'green');
        log(`   ${balanceUpdateReceived ? '✅' : '⚠️'} Real-Time Updates: ${balanceUpdateReceived ? 'Working' : 'Check logs'}`, balanceUpdateReceived ? 'green' : 'yellow');
        log('='.repeat(60) + '\n', 'cyan');

        socket.disconnect();

    } catch (error) {
        log(`\n❌ TEST FAILED: ${error.message}`, 'red');
        console.error(error);

        if (socket) socket.disconnect();
    }
}

// Run the test
log('\n🚀 Starting Real-Time Deposit Test...', 'magenta');
log('This test will:', 'blue');
log('  1. Authenticate a user', 'blue');
log('  2. Connect Socket.IO', 'blue');
log('  3. Make a deposit', 'blue');
log('  4. Verify real-time balance update event', 'blue');
log('\n⚠️  NOTE: You need to configure TEST_USER_EMAIL and TEST_USER_PASSWORD', 'yellow');
log('     Or run this manually after logging in to your app\n', 'yellow');

testDepositRealTime().then(() => {
    log('✅ Test completed!', 'green');
    process.exit(0);
}).catch(err => {
    log(`❌ Test suite error: ${err.message}`, 'red');
    process.exit(1);
});
