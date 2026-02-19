const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'default'
    },
    emergencyFlags: {
        pauseRegistrations: { type: Boolean, default: false },
        pauseDeposits: { type: Boolean, default: false },
        pauseWithdrawals: { type: Boolean, default: false },
        pauseLuckyDraw: { type: Boolean, default: false },
        maintenanceMode: { type: Boolean, default: false }
    },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: String, default: 'system' }
}, {
    timestamps: true
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
