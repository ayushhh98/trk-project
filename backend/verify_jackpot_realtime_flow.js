const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project';

async function verifyJackpotRealtime() {
    console.log('🏁 Starting Real-Time Jackpot Flow Verification...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('./src/models/User');
        const JackpotRound = require('./src/models/JackpotRound');
        const JackpotService = require('./src/services/jackpotService');

        // 1. Setup Mock Socket.IO
        let emittedEvent = null;
        let emittedData = null;
        const mockIo = {
            emit: (event, data) => {
                console.log(`📡 [MOCK IO] Emitted: ${event}`);
                emittedEvent = event;
                emittedData = data;
            },
            to: (room) => ({
                emit: (event, data) => {
                    console.log(`📡 [MOCK IO] Emitted to ${room}: ${event}`);
                }
            })
        };

        // 2. Setup Test User
        const testUser = await User.findOneAndUpdate(
            { walletAddress: '0xJACKPOT_TESTER' },
            {
                walletAddress: '0xJACKPOT_TESTER',
                'realBalances.luckyDrawWallet': 500,
                'realBalances.game': 1000
            },
            { upsert: true, new: true }
        );
        console.log(`👤 Test User Created/Updated: ${testUser.walletAddress}`);

        // 3. Get Jackpot Service
        const jackpotService = new JackpotService(mockIo);
        const statusBefore = await jackpotService.getRoundStatus();
        console.log(`📊 Status Before: Round ${statusBefore.roundNumber}, Sold: ${statusBefore.ticketsSold}`);

        // 4. Simulate Purchase of 50 tickets (Total $500)
        console.log('🛒 Simulating purchase of 50 tickets...');
        const purchaseResult = await jackpotService.purchaseTickets(testUser._id, 50);

        // 5. Verify Database Update
        const statusAfter = await jackpotService.getRoundStatus();
        console.log(`📊 Status After: Round ${statusAfter.roundNumber}, Sold: ${statusAfter.ticketsSold}, Progress: ${statusAfter.progress.toFixed(2)}%`);

        if (statusAfter.ticketsSold !== statusBefore.ticketsSold + 50) {
            throw new Error('Tickets sold count mismatch in DB');
        }

        // 6. Verify Socket Emission
        if (emittedEvent !== 'jackpot:ticket_sold') {
            throw new Error(`Expected event jackpot:ticket_sold but got ${emittedEvent}`);
        }

        console.log('✅ Event Data Verified:', JSON.stringify(emittedData, null, 2));

        if (emittedData.ticketsSold !== statusAfter.ticketsSold) {
            throw new Error('Socket data ticketsSold mismatch');
        }

        if (emittedData.progress !== statusAfter.progress) {
            throw new Error('Socket data progress mismatch');
        }

        console.log('✨ REAL-TIME JACKPOT FLOW: PASSED');

        // Clean up
        await User.deleteOne({ walletAddress: '0xJACKPOT_TESTER' });
        // NOTE: We keep the tickets in the round for now to show user the progress, 
        // OR we can clean them up too if we want a fresh start.
        // For demonstration, let's keep them so the user's dashboard shows 50.

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyJackpotRealtime();
