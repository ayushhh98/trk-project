const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/rbac');
const JackpotService = require('../services/jackpotService');
const system = require('../config/system');

const router = express.Router();

// In development, allow admin to manage jackpot to avoid blocking local testing.
const requireJackpotAdmin = process.env.NODE_ENV === 'production' ? requireSuperAdmin : requireAdmin;

// Service instance will be set after Socket.IO initialization
let jackpotService;

// Initialize service with Socket.IO
router.initializeService = (io) => {
    jackpotService = new JackpotService(io);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /lucky-draw/status
 * Get current jackpot round status
 */
router.get('/status', async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const status = await jackpotService.getRoundStatus();

        res.status(200).json({
            status: 'success',
            data: {
                ...status,
                drawIsActive: status.isActive && !system.get().emergencyFlags.pauseLuckyDraw,
                totalSurplus: 0 // Surplus only visible to admins
            }
        });
    } catch (error) {
        console.error('Get jackpot status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get jackpot status'
        });
    }
});

/**
 * GET /lucky-draw/recent-winners
 * Get list of recent winners across all rounds
 */
router.get('/recent-winners', async (req, res) => {
    try {
        const JackpotRound = require('../models/JackpotRound');

        // Find last 10 completed rounds with winners
        const recentRounds = await JackpotRound.find({
            status: 'completed',
            'winners.0': { $exists: true }
        })
            .sort({ drawExecutedAt: -1 })
            .limit(10);

        // Flatten winners from all rounds
        const winners = [];
        recentRounds.forEach(round => {
            // Take up to 3 winners per round to keep it interesting but not overwhelming
            round.winners.slice(0, 3).forEach(winner => {
                winners.push({
                    id: `${round.roundNumber}-${winner.walletAddress}-${winner._id}`,
                    wallet: winner.walletAddress,
                    prize: winner.prize,
                    rank: winner.rank,
                    timestamp: round.drawExecutedAt,
                    roundNumber: round.roundNumber
                });
            });
        });

        res.status(200).json({
            status: 'success',
            data: winners.slice(0, 20) // Limit to top 20 recent winners
        });
    } catch (error) {
        console.error('Get recent winners error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get recent winners'
        });
    }
});

const { checkLuckyDrawPause } = require('../middleware/systemCheck');

/**
 * POST /lucky-draw/buy-ticket
 * Purchase jackpot tickets
 */
router.post('/buy-ticket', auth, checkLuckyDrawPause, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const { quantity = 1 } = req.body;

        // Validate quantity
        if (quantity < 1 || quantity > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid quantity (1-100 tickets allowed)'
            });
        }

        const result = await jackpotService.purchaseTickets(req.user.id, quantity);

        res.status(200).json({
            status: 'success',
            message: `Successfully purchased ${quantity} ticket(s)`,
            data: result
        });
    } catch (error) {
        console.error('Buy ticket error:', error);
        res.status(error.message.includes('Insufficient') ? 400 : 500).json({
            status: 'error',
            message: error.message || 'Failed to purchase tickets'
        });
    }
});

/**
 * GET /lucky-draw/my-tickets
 * Get user's ticket history
 */
router.get('/my-tickets', auth, async (req, res) => {
    try {
        const JackpotRound = require('../models/JackpotRound');

        // Get active round tickets
        const activeRound = await JackpotRound.getActiveRound();
        const activeTickets = activeRound
            ? activeRound.tickets.filter(t => t.userId.toString() === req.user.id)
            : [];

        // Get past draws where user won
        const completedRounds = await JackpotRound.find({
            status: 'completed',
            'winners.userId': req.user.id
        }).sort({ createdAt: -1 }).limit(10);

        const pastDraws = completedRounds.map(round => {
            const userWins = round.winners.filter(w => w.userId.toString() === req.user.id);
            const totalWon = userWins.reduce((sum, w) => sum + w.prize, 0);
            const userTickets = round.tickets.filter(t => t.userId.toString() === req.user.id);

            return {
                roundNumber: round.roundNumber,
                date: round.drawExecutedAt,
                tickets: userTickets.length,
                won: totalWon,
                prizes: userWins.map(w => ({ rank: w.rank, amount: w.prize }))
            };
        });

        res.status(200).json({
            status: 'success',
            data: {
                activeTickets: activeTickets.map(t => ({
                    ticketId: t.ticketId,
                    purchasedAt: t.purchasedAt
                })),
                pastDraws
            }
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get tickets'
        });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * POST /lucky-draw/admin/update-params
 * Update round parameters (superadmin only)
 */
router.post('/admin/update-params', auth, requireJackpotAdmin, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const { newPrice, newLimit } = req.body;

        const round = await jackpotService.getActiveRound();
        await jackpotService.updateParameters(
            round._id,
            newPrice,
            newLimit,
            req.user.id
        );

        res.status(200).json({
            status: 'success',
            message: 'Parameters updated',
            data: {
                ticketPrice: newPrice || round.ticketPrice,
                totalTickets: newLimit || round.totalTickets
            }
        });
    } catch (error) {
        console.error('Update params error:', error);
        res.status(400).json({
            status: 'error',
            message: error.message || 'Failed to update parameters'
        });
    }
});

/**
 * POST /lucky-draw/admin/toggle-pause
 * Toggle draw pause/resume (admin)
 */
router.post('/admin/toggle-pause', auth, requireAdmin, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const round = await jackpotService.getActiveRound();
        await jackpotService.togglePause(round._id);

        const newStatus = !round.isActive;

        res.status(200).json({
            status: 'success',
            message: `Draw ${newStatus ? 'resumed' : 'paused'}`,
            data: { drawIsActive: newStatus }
        });
    } catch (error) {
        console.error('Toggle pause error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to toggle pause'
        });
    }
});

/**
 * POST /lucky-draw/admin/withdraw-surplus
 * Withdraw surplus from completed rounds (superadmin)
 */
router.post('/admin/withdraw-surplus', auth, requireJackpotAdmin, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const JackpotRound = require('../models/JackpotRound');

        // Get all completed rounds with unwithdrawn surplus
        const completedRounds = await JackpotRound.find({
            status: 'completed',
            surplusWithdrawn: false,
            surplus: { $gt: 0 }
        });

        let totalWithdrawn = 0;

        for (const round of completedRounds) {
            const amount = await jackpotService.withdrawSurplus(round._id, req.user.id);
            totalWithdrawn += amount;
        }

        res.status(200).json({
            status: 'success',
            message: `Withdrawn ${totalWithdrawn.toFixed(2)} USDT surplus`,
            data: { withdrawnAmount: totalWithdrawn }
        });
    } catch (error) {
        console.error('Withdraw surplus error:', error);
        res.status(400).json({
            status: 'error',
            message: error.message || 'Failed to withdraw surplus'
        });
    }
});

/**
 * POST /lucky-draw/admin/execute-draw
 * Manually execute draw (superadmin)
 */
router.post('/admin/execute-draw', auth, requireJackpotAdmin, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const round = await jackpotService.getActiveRound();

        if (round.ticketsSold === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot execute draw with no tickets sold'
            });
        }

        const winners = await jackpotService.executeDraw(
            round._id,
            req.user.id,
            'manual'
        );

        res.status(200).json({
            status: 'success',
            message: `Draw executed, ${winners.length} winners selected`,
            data: {
                roundNumber: round.roundNumber,
                winnersCount: winners.length,
                topWinners: winners.slice(0, 3)
            }
        });
    } catch (error) {
        console.error('Execute draw error:', error);
        res.status(400).json({
            status: 'error',
            message: error.message || 'Failed to execute draw'
        });
    }
});

module.exports = router;
