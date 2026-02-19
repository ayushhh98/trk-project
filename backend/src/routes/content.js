const express = require('express');
const router = express.Router();
const Poster = require('../models/Poster');
const { LegalContent } = require('../models/LegalContent');
const { logger } = require('../utils/logger');

/**
 * GET /api/content/legal/:type
 * Get public legal content
 */
router.get('/legal/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const document = await LegalContent.findOne({ type }).select('content version lastUpdated').lean();

        if (!document) {
            return res.status(404).json({ status: 'error', message: 'Content not found' });
        }

        res.json({
            status: 'success',
            data: document
        });
    } catch (error) {
        logger.error(`Public legal content fetch error (${req.params.type}):`, error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch content' });
    }
});

/**
 * GET /api/content/posters
 * Get all active posters (Public)
 */
router.get('/posters', async (req, res) => {
    try {
        const posters = await Poster.find({ isActive: true }).sort({ type: 1 });
        res.json({
            status: 'success',
            data: posters
        });
    } catch (error) {
        logger.error('Public posters fetch error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch posters' });
    }
});

/**
 * GET /api/content/system-status
 * Get public system status (Maintenance Mode)
 */
router.get('/system-status', async (req, res) => {
    try {
        const system = require('../config/system');
        const config = system.get();
        res.json({
            status: 'success',
            data: {
                maintenanceMode: config.emergencyFlags?.maintenanceMode || false,
                pauseRegistrations: config.emergencyFlags?.pauseRegistrations || false,
                pauseDeposits: config.emergencyFlags?.pauseDeposits || false,
                pauseWithdrawals: config.emergencyFlags?.pauseWithdrawals || false,
                pauseLuckyDraw: config.emergencyFlags?.pauseLuckyDraw || false
            }
        });
    } catch (error) {
        logger.error('Public system status error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch system status' });
    }
});

module.exports = router;
