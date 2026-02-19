const { io } = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000'; // Default backend URL

console.log('🚀 Admin Real-Time Tester');
console.log('Connecting to:', SOCKET_URL);

const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token: 'testing-token' }
});

socket.on('connect', () => {
    console.log('✅ Connected to Socket server');

    // Test Loop
    let count = 0;
    const interval = setInterval(() => {
        count++;
        console.log(`\n--- Test Cycle #${count} ---`);

        // Phase 1 & 8: Admin Stats & Action Feed
        console.log('📡 Emitting admin:stats_update...');
        socket.emit('admin:stats_update', {
            users: 1000 + count,
            games: 5000 + count,
            jackpots: 50 + count,
            audits: 200 + count,
            dbSize: 1024 * 1024 * count
        });

        // Phase 3: Transaction Monitor
        console.log('📡 Emitting transaction_created...');
        socket.emit('transaction_created', {
            type: 'deposit',
            walletAddress: '0xTest' + count,
            amount: 10.5 * count,
            timestamp: new Date().toISOString()
        });

        // Phase 7: Club Monitor
        console.log('📡 Emitting rank_upgrade...');
        socket.emit('rank_upgrade', {
            walletAddress: '0xClub' + count,
            newRank: 'Full Node',
            timestamp: new Date().toISOString()
        });

        // Phase 5 & 2: User Registrations
        console.log('📡 Emitting user_registered...');
        socket.emit('user_registered', {
            walletAddress: '0xUser' + count,
            role: 'user',
            timestamp: new Date().toISOString()
        });

        // Phase 9: Emergency Controls
        console.log('📡 Emitting emergency_flag_changed...');
        socket.emit('emergency_flag_changed', {
            key: 'isMaintenanceMode',
            value: count % 2 === 0,
            updatedBy: 'TestAdmin'
        });

        // Phase 4: System Config
        console.log('📡 Emitting config_updated...');
        socket.emit('config_updated', {
            minDepositTier1: 10 + count,
            referralPercentages: [15, 10, 5]
        });

        if (count >= 3) {
            console.log('\n✅ Verification cycle complete.');
            process.exit(0);
        }
    }, 5000);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
});
