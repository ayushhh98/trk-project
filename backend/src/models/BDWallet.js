const mongoose = require('mongoose');

const bdWalletSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        enum: ['BD', 'TREASURY', 'MARKETING', 'JACKPOT', 'OTHER'],
        default: 'BD'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const BDWallet = mongoose.model('BDWallet', bdWalletSchema);

module.exports = BDWallet;
