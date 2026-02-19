const system = require('../config/system');
const { logger } = require('../utils/logger');

/**
 * Check if the system is in maintenance mode
 * blocks all non-admin requests if active
 */
const checkMaintenanceMode = (req, res, next) => {
    // Skip for admins (if authenticated)
    if (req.user && ['admin', 'superadmin'].includes(req.user.role)) {
        return next();
    }

    const { maintenanceMode } = system.get().emergencyFlags;
    if (maintenanceMode) {
        return res.status(503).json({
            status: 'error',
            code: 'MAINTENANCE_MODE',
            message: 'System is currently under maintenance. Please try again later.'
        });
    }
    next();
};

/**
 * Check if registrations are paused
 */
const checkRegistrationPause = (req, res, next) => {
    const { pauseRegistrations } = system.get().emergencyFlags;
    if (pauseRegistrations) {
        return res.status(403).json({
            status: 'error',
            code: 'REGISTRATIONS_PAUSED',
            message: 'New user registrations are currently paused.'
        });
    }
    next();
};

/**
 * Check if deposits are paused
 */
const checkDepositPause = (req, res, next) => {
    const { pauseDeposits } = system.get().emergencyFlags;
    if (pauseDeposits) {
        return res.status(403).json({
            status: 'error',
            code: 'DEPOSITS_PAUSED',
            message: 'Deposits are currently paused. Your funds are safe.'
        });
    }
    next();
};

/**
 * Check if withdrawals are paused
 */
const checkWithdrawalPause = (req, res, next) => {
    const { pauseWithdrawals } = system.get().emergencyFlags;
    if (pauseWithdrawals) {
        return res.status(403).json({
            status: 'error',
            code: 'WITHDRAWALS_PAUSED',
            message: 'Withdrawals are currently paused. Your funds are safe on-chain.'
        });
    }
    next();
};

/**
 * Check if lucky draw is paused
 */
const checkLuckyDrawPause = (req, res, next) => {
    const { pauseLuckyDraw } = system.get().emergencyFlags;
    if (pauseLuckyDraw) {
        return res.status(403).json({
            status: 'error',
            code: 'LUCKY_DRAW_PAUSED',
            message: 'Lucky Draw is currently paused. Ongoing rounds will complete normally.'
        });
    }
    next();
};

module.exports = {
    checkMaintenanceMode,
    checkRegistrationPause,
    checkDepositPause,
    checkWithdrawalPause,
    checkLuckyDrawPause
};
