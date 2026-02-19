const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: '.env' });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const userId = '6991d409fd457ade7c4994ee'; // User ID from previous context
        const user = await User.findById(userId);

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log(`Current Practice Balance: ${user.practiceBalance}`);

        // precise set to 100 as requested
        user.practiceBalance = 100;
        await user.save();

        console.log(`New Practice Balance: ${user.practiceBalance}`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
