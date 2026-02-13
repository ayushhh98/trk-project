const mongoose = require('mongoose');

const posterSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['promo', 'launch'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: '/dashboard'
    },
    imageUrl: {
        type: String,
        default: ''
    },
    stats: [{
        label: String,
        value: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

posterSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Poster = mongoose.model('Poster', posterSchema);

module.exports = Poster;
