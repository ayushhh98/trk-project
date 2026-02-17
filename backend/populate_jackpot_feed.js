const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project';

async function populateJackpotFeed() {
    console.log('🚀 Populating Jackpot Feed for Real-Time Demo...');

    try {
        await mongoose.connect(MONGO_URI);

        const User = require('./src/models/User');
        const JackpotService = require('./src/services/jackpotService');

        // Use the real IO from server if possible, but since we are a separate process,
        // we hit the API OR we just update DB. 
        // If we want real-time TO THE BROWSER, we should ideally use the existing server's IO.
        // Since we can't easily grab the running server's IO object from a new process, 
        // the user will see the updates on REFRESH, unless we use a socket client to emit to the server.

        // HOWEVER, the server has a 'luckDrawRoutes.initializeService(io)' call.
        // I'll check if I can trigger a purchase via a simple script that hits the local API.

        const users = [
            { wallet: '0xAlpha...1111', amount: 120 },
            { wallet: '0xBeta...2222', amount: 85 },
            { wallet: '0xGamma...3333', amount: 250 },
            { wallet: '0xDelta...4444', amount: 10 },
            { wallet: '0xEpsilon...5555', amount: 100 }
        ];

        console.log('👥 Creating dummy participants...');

        for (const u of users) {
            const user = await User.findOneAndUpdate(
                { walletAddress: u.wallet },
                {
                    walletAddress: u.wallet,
                    'realBalances.luckyDrawWallet': 10000,
                    'realBalances.game': 10000
                },
                { upsert: true, new: true }
            );

            // We use the service directly. In a real-world multi-process setup, 
            // you'd need a message queue (Redis) to sync IO.
            // But for this project, just updating the DB will show progress on refresh.

            const jackpotService = new JackpotService(null); // No IO in this process
            console.log(`🎟️ Buying ${u.amount} tickets for ${u.wallet}...`);
            await jackpotService.purchaseTickets(user._id, u.amount);
        }

        console.log('✅ Population complete. Refresh the Jackpot Dashboard to see updates!');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Population failed:', error);
        process.exit(1);
    }
}

populateJackpotFeed();
