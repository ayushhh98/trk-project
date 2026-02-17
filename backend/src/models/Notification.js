const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'deposit',
            'withdrawal_request',
            'withdrawal_processed',
            'commission',
            'club_income',
            'lucky_win',
            'rank_up',
            'security_alert',
            'ip_change',
            'welcome',
            'system_update'
        ]
    },
    category: {
        type: String,
        required: true,
        enum: ['transaction', 'security', 'system'],
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: 'bell'
    },
    actionUrl: {
        type: String,
        default: null
    },
    actionLabel: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });

// Helper method to create notification
notificationSchema.statics.createNotification = async function (data) {
    const notification = new this(data);
    await notification.save();
    return notification;
};

// Helper method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({ userId, isRead: false });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
