
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Commission = require('./src/models/Commission');
require('dotenv').config({ path: './.env' });

async function cleanupFakeUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Identify fake users:
        // 1. Wallets starting with '0xincome_test'
        // 2. Wallets starting with '0xalpha', '0xbeta', '0xgamma'
        // 3. Email ending with '@practicetest.com' (if any)

        const fakeWalletsRegex = /^(0xincome_test|0xalpha|0xbeta|0xgamma|0xdelta|0xepsilon)/i;

        const fakeUsers = await User.find({
            $or: [
                { walletAddress: { $regex: fakeWalletsRegex } },
                { email: { $regex: /@practicetest\.com$/i } }
            ]
        });

        console.log(`Found ${fakeUsers.length} fake users.`);

        if (fakeUsers.length > 0) {
            const fakeUserIds = fakeUsers.map(u => u._id);

            // Delete Commissions associated with these users
            const deletedCommissions = await Commission.deleteMany({
                $or: [
                    { user: { $in: fakeUserIds } },
                    { fromUser: { $in: fakeUserIds } }
                ]
            });
            console.log(`Deleted ${deletedCommissions.deletedCount} commissions.`);

            // Delete Users
            const deletedUsers = await User.deleteMany({ _id: { $in: fakeUserIds } });
            console.log(`Deleted ${deletedUsers.deletedCount} users.`);

            // Update users who were referred by these deleted users?
            // If A referred B, and A is deleted, B.referredBy becomes invalid.
            // We should set B.referredBy to null.
            const updatedReferredBy = await User.updateMany(
                { referredBy: { $in: fakeUserIds } },
                { $unset: { referredBy: "" } }
            );
            console.log(`Updated ${updatedReferredBy.modifiedCount} users to remove invalid referrer.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupFakeUsers();
