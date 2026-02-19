const SystemConfig = require('../models/SystemConfig');
const { logger } = require('../utils/logger');

// In-memory state
let state = {
    emergencyFlags: {
        pauseRegistrations: false,
        pauseDeposits: false,
        pauseWithdrawals: false,
        pauseLuckyDraw: false,
        maintenanceMode: false
    },
    lastUpdated: new Date(),
    updatedBy: 'system'
};

let ioInstance = null;

const service = {
    /**
     * Initialize the service: load config from DB or create default
     */
    init: async (io) => {
        ioInstance = io;
        try {
            let config = await SystemConfig.findOne({ key: 'default' });
            if (!config) {
                logger.info('Creating default system configuration...');
                config = await SystemConfig.create({
                    key: 'default',
                    emergencyFlags: state.emergencyFlags
                });
            }

            // Sync in-memory state
            state.emergencyFlags = { ...state.emergencyFlags, ...config.emergencyFlags };
            state.lastUpdated = config.lastUpdated;
            state.updatedBy = config.updatedBy;

            logger.info('System configuration loaded successfully');
            return state;
        } catch (error) {
            logger.error('Failed to load system configuration:', error);
            // Fallback to default state is already set
            return state;
        }
    },

    /**
     * Get current configuration state
     */
    get: () => {
        return { ...state };
    },

    /**
     * Update configuration
     * @param {Object} updates - Partial updates for emergencyFlags
     * @param {Object} user - User performing the update
     */
    update: async (updates, user) => {
        try {
            // Apply updates to state
            const newFlags = { ...state.emergencyFlags, ...updates };
            const now = new Date();
            const wallet = user?.walletAddress || 'system';

            // Persist to DB
            const config = await SystemConfig.findOneAndUpdate(
                { key: 'default' },
                {
                    $set: {
                        emergencyFlags: newFlags,
                        lastUpdated: now,
                        updatedBy: wallet
                    }
                },
                { new: true, upsert: true }
            );

            // Update memory
            state.emergencyFlags = config.emergencyFlags;
            state.lastUpdated = config.lastUpdated;
            state.updatedBy = config.updatedBy;

            // Broadcast change
            if (ioInstance) {
                ioInstance.emit('config_updated', state);

                // Specific event for emergency flags to match legacy frontend expectations if any
                ioInstance.emit('emergency_flag_changed', {
                    emergencyFlags: state.emergencyFlags,
                    action: Object.keys(updates)[0], // Approximate action
                    value: Object.values(updates)[0],
                    lastUpdated: state.lastUpdated,
                    updatedBy: state.updatedBy
                });
            }

            logger.info(`System config updated by ${wallet}:`, updates);
            return state;
        } catch (error) {
            logger.error('Failed to update system config:', error);
            throw error;
        }
    }
};

module.exports = service;
