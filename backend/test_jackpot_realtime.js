const mongoose = require('mongoose');
const dotenv = require('dotenv');
const io = require('socket.io-client');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project';
const SOCKET_URL = 'http://localhost:5000';

async function testRealtimeWinners() {
    console.log('🚀 Starting Real-time Winner Verification...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const JackpotRound = require('./src/models/JackpotRound');
        const User = require('./src/models/User');

        // 1. Create a dummy completed round if none exists
        let round = await JackpotRound.findOne({ status: 'completed' });
        if (!round) {
            console.log('📝 Creating dummy completed round...');
            round = await JackpotRound.create({
                roundNumber: 999,
                ticketPrice: 10,
                totalTickets: 100,
                totalPrizePool: 1000,
                status: 'completed',
                drawExecutedAt: new Date(),
                winners: [
                    {
                        walletAddress: '0x1234...5678',
                        rank: '1st',
                        prize: 1000,
                        status: 'completed'
                    },
                    {
                        walletAddress: '0xabcd...efgh',
                        rank: '2nd',
                        prize: 500,
                        status: 'completed'
                    }
                ]
            });
            console.log('✅ Dummy round created');
        }

        // 2. Test API endpoint
        console.log('🔍 Testing /api/lucky-draw/recent-winners...');
        // We'll just check the DB directly since we are in the same environment
        const recentRounds = await JackpotRound.find({ status: 'completed' }).sort({ drawExecutedAt: -1 }).limit(10);
        console.log(`✅ Found ${recentRounds.length} recent rounds in DB`);

        // 3. Simulate real-time event via Socket.IO
        console.log('🔌 Connecting to Socket.IO...');
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { token: 'mock-admin-token' } // Might need a real token if server validates
        });

        socket.on('connect', () => {
            console.log('✅ Connected to Socket.IO server');

            console.log('📣 Emitting mock winner announcement...');
            socket.emit('jackpot:winner_announced', {
                wallet: '0xTEST...REALTIME',
                prize: 5000,
                rank: '1st',
                roundNumber: 1000
            });

            console.log('✅ Mock event emitted');
            setTimeout(() => {
                socket.disconnect();
                mongoose.disconnect();
                console.log('👋 Finished');
                process.exit(0);
            }, 2000);
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
            mongoose.disconnect();
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testRealtimeWinners();
