const mongoose = require('mongoose');

const LEGAL_TYPES = ['terms', 'risk_disclaimer', 'aml_notice', 'no_guarantee', 'privacy_policy', 'cookie_policy'];

const legalContentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: LEGAL_TYPES,
        required: true,
        unique: true
    },
    content: {
        type: String,
        default: ''
    },
    version: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: null
    },
    updatedBy: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const LegalContent = mongoose.model('LegalContent', legalContentSchema);

module.exports = { LegalContent, LEGAL_TYPES };
