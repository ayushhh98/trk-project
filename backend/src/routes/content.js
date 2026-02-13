const express = require('express');
const router = express.Router();
const Poster = require('../models/Poster');
const { logger } = require('../utils/logger');

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

module.exports = router;
