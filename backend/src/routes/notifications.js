const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user notifications with optional filters
router.get('/', auth, async (req, res) => {
    try {
        const { category, limit = 50, page = 1, unreadOnly } = req.query;

        const query = { userId: req.user.id };

        // Filter by category if provided
        if (category && category !== 'all') {
            query.category = category;
        }

        // Filter unread only
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.getUnreadCount(req.user.id);

        res.status(200).json({
            status: 'success',
            data: {
                notifications,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                },
                unreadCount
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch notifications'
        });
    }
});

// Get unread count only
router.get('/unread-count', auth, async (req, res) => {
    try {
        const unreadCount = await Notification.getUnreadCount(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { unreadCount }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch unread count'
        });
    }
});

// Mark single notification as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        const unreadCount = await Notification.getUnreadCount(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { notification, unreadCount }
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            status: 'success',
            data: {
                modifiedCount: result.modifiedCount,
                unreadCount: 0
            }
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete notification'
        });
    }
});

module.exports = router;
