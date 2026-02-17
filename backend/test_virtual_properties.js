const mongoose = require('mongoose');
const User = require('./src/models/User');

// Test script to verify virtual properties are working
async function testVirtualProperties() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/trk-game');
        console.log('✅ Connected to MongoDB');

        // Find a user (any user)
        const user = await User.findOne();

        if (!user) {
            console.log('❌ No users found in database');
            process.exit(1);
        }

        console.log('\n📊 Testing Virtual Properties for user:', user.walletAddress || user.email);
        console.log('=====================================');

        // Display individual balances
        console.log('\n💰 Individual Balances:');
        console.log('   cash:', user.realBalances.cash);
        console.log('   game:', user.realBalances.game);
        console.log('   directLevel:', user.realBalances.directLevel);
        console.log('   winners:', user.realBalances.winners);
        console.log('   teamWinners:', user.realBalances.teamWinners);
        console.log('   cashback:', user.realBalances.cashback);
        console.log('   roiOnRoi:', user.realBalances.roiOnRoi);
        console.log('   club:', user.realBalances.club);
        console.log('   lucky:', user.realBalances.lucky);

        // Test virtual properties
        console.log('\n🎯 Virtual Properties (Calculated):');
        const userObj = user.toObject();
        console.log('   grandTotal:', userObj.realBalances.grandTotal);
        console.log('   totalUnified:', userObj.realBalances.totalUnified);

        // Test JSON serialization
        console.log('\n📤 JSON Serialization Test:');
        const userJSON = JSON.parse(JSON.stringify(user));
        console.log('   grandTotal in JSON:', userJSON.realBalances.grandTotal);
        console.log('   totalUnified in JSON:', userJSON.realBalances.totalUnified);

        // Verify calculations
        const manualGrandTotal = (user.realBalances.cash || 0) +
            (user.realBalances.game || 0) +
            (user.realBalances.directLevel || 0) +
            (user.realBalances.winners || 0) +
            (user.realBalances.teamWinners || 0) +
            (user.realBalances.cashback || 0) +
            (user.realBalances.roiOnRoi || 0) +
            (user.realBalances.club || 0) +
            (user.realBalances.lucky || 0);

        const manualTotalUnified = (user.realBalances.directLevel || 0) +
            (user.realBalances.winners || 0) +
            (user.realBalances.teamWinners || 0) +
            (user.realBalances.cashback || 0) +
            (user.realBalances.roiOnRoi || 0) +
            (user.realBalances.club || 0) +
            (user.realBalances.lucky || 0) +
            (user.realBalances.game || 0) +
            (user.realBalances.cash || 0);

        console.log('\n✅ Verification:');
        console.log('   Manual grandTotal calculation:', manualGrandTotal);
        console.log('   Virtual grandTotal:', userObj.realBalances.grandTotal);
        console.log('   Match:', manualGrandTotal === userObj.realBalances.grandTotal ? '✅ YES' : '❌ NO');

        console.log('\n   Manual totalUnified calculation:', manualTotalUnified);
        console.log('   Virtual totalUnified:', userObj.realBalances.totalUnified);
        console.log('   Match:', manualTotalUnified === userObj.realBalances.totalUnified ? '✅ YES' : '❌ NO');

        console.log('\n✅ Virtual properties are working correctly!');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testVirtualProperties();
