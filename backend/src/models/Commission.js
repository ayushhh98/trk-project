const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['deposit_commission', 'winner_commission', 'signup_bonus', 'roi_commission'],
        required: true
    },
    recipientWallet: {
        type: String,
        default: null
    },
    sourceWallet: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'credited', 'failed'],
        default: 'credited'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Commission = mongoose.model('Commission', commissionSchema);

module.exports = Commission;
