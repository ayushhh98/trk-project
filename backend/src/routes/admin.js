const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { ethers } = require('ethers');
const { requireAdmin, requireSuperAdmin, requirePermission } = require('../middleware/rbac');
const User = require('../models/User');
const Game = require('../models/Game');
const Poster = require('../models/Poster');
const { logger } = require('../utils/logger');

// Service state
let ioInstance;
let observerInterval;

// Initialize service with Socket.IO
router.initializeService = (io) => {
    ioInstance = io;

    // Clear existing interval if re-initialized
    if (observerInterval) clearInterval(observerInterval);

    // Broadcast stats every 10 seconds
    observerInterval = setInterval(async () => {
        try {
            const stats = {
                users: await mongoose.connection.db.collection('users').countDocuments(),
                games: await mongoose.connection.db.collection('games').countDocuments(),
                jackpots: await mongoose.connection.db.collection('jackpotrounds').countDocuments(),
                audits: await mongoose.connection.db.collection('auditlogs').countDocuments(),
                dbSize: (await mongoose.connection.db.command({ dbStats: 1 })).dataSize,
            };

            // Emit to admin room
            // In a real app, we'd check for room membership, but for now we emit generally 
            // relying on client-side auth for connection. 
            // Best practice: io.to('admin-room').emit(...)
            io.emit('admin:stats_update', stats);

        } catch (error) {
            console.error('Failed to broadcast admin stats:', error.message);
        }
    }, 10000); // 10 seconds
};

/**
 * Admin Routes
 * Protected by role-based access control
 */

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /admin/users
 * List all users with pagination
 */
router.get('/users', auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, role, search } = req.query;

        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { walletAddress: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                users,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count
            }
        });
    } catch (error) {
        logger.error('Admin users list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users'
        });
    }
});

/**
 * GET /admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get user stats
        const totalGames = await Game.countDocuments({ user: user._id });
        const totalWagered = await Game.aggregate([
            { $match: { user: user._id } },
            { $group: { _id: null, total: { $sum: '$betAmount' } } }
        ]);

        res.json({
            status: 'success',
            data: {
                user,
                stats: {
                    totalGames,
                    totalWagered: totalWagered[0]?.total || 0
                }
            }
        });
    } catch (error) {
        logger.error('Admin user detail error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user'
        });
    }
});

/**
 * PATCH /admin/users/:id/ban
 * Ban a user account
 */
router.patch('/users/:id/ban', auth, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Prevent banning other admins unless superadmin
        if (['admin', 'superadmin'].includes(targetUser.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({
                status: 'error',
                message: 'Only superadmins can ban other admins'
            });
        }

        targetUser.isBanned = true;
        targetUser.banReason = reason || 'Banned by administrator';
        targetUser.bannedAt = new Date();
        targetUser.bannedBy = req.user._id;

        await targetUser.save();

        logger.warn(`User banned: ${targetUser.walletAddress} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'User banned successfully',
            data: { user: targetUser }
        });
    } catch (error) {
        logger.error('Ban user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to ban user'
        });
    }
});

/**
 * PATCH /admin/users/:id/unban
 * Unban a user account
 */
router.patch('/users/:id/unban', auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        user.bannedBy = null;

        await user.save();

        logger.info(`User unbanned: ${user.walletAddress} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'User unbanned successfully',
            data: { user }
        });
    } catch (error) {
        logger.error('Unban user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to unban user'
        });
    }
});

/**
 * PATCH /admin/users/:id/role
 * Update user role (superadmin only)
 */
router.patch('/users/:id/role', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        if (!['player', 'admin', 'superadmin'].includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid role'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const oldRole = user.role;
        user.role = role;
        await user.save();

        logger.warn(`Role changed: ${user.walletAddress} from ${oldRole} to ${role} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'Role updated successfully',
            data: { user }
        });
    } catch (error) {
        logger.error('Update role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update role'
        });
    }
});

// ============================================
// GAME MONITORING
// ============================================

/**
 * GET /admin/games
 * Monitor recent games
 */
router.get('/games', auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 100, gameType } = req.query;

        const query = {};
        if (gameType) query.gameType = gameType;

        const games = await Game.find(query)
            .populate('user', 'walletAddress role')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await Game.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                games,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count
            }
        });
    } catch (error) {
        logger.error('Admin games list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch games'
        });
    }
});

/**
 * GET /admin/analytics
 * Platform analytics and statistics
 */
router.get('/analytics', auth, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalGames = await Game.countDocuments();
        const bannedUsers = await User.countDocuments({ isBanned: true });

        const totalWagered = await Game.aggregate([
            { $group: { _id: null, total: { $sum: '$betAmount' } } }
        ]);

        const totalPayout = await Game.aggregate([
            { $match: { isWin: true } },
            { $group: { _id: null, total: { $sum: '$payout' } } }
        ]);

        const recentActivity = await Game.find()
            .populate('user', 'walletAddress')
            .limit(10)
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: {
                totalUsers,
                totalGames,
                bannedUsers,
                totalWagered: totalWagered[0]?.total || 0,
                totalPayout: totalPayout[0]?.total || 0,
                houseEdge: totalWagered[0]?.total - (totalPayout[0]?.total || 0),
                recentActivity
            }
        });
    } catch (error) {
        logger.error('Admin analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics'
        });
    }
});

/**
 * GET /admin/analytics/history
 * Get historical analytics data for charts
 */
router.get('/analytics/history', auth, requireAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const history = await Game.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    wagered: { $sum: "$betAmount" },
                    payout: {
                        $sum: {
                            $cond: [{ $eq: ["$isWin", true] }, "$payout", 0]
                        }
                    },
                    gamesCount: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$user" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates
        const result = [];
        for (let i = 0; i < parseInt(days); i++) {
            const d = new Date();
            d.setDate(d.getDate() - (parseInt(days) - 1 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const found = history.find(h => h._id === dateStr);
            if (found) {
                result.push({
                    date: dateStr,
                    name: dayName,
                    wagered: found.wagered,
                    payout: found.payout,
                    users: found.uniqueUsers.length,
                    games: found.gamesCount
                });
            } else {
                result.push({
                    date: dateStr,
                    name: dayName,
                    wagered: 0,
                    payout: 0,
                    users: 0,
                    games: 0
                });
            }
        }

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        logger.error('Admin analytics history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics history'
        });
    }
});

// ============================================
// SYSTEM MANAGEMENT
// ============================================

/**
 * GET /admin/system/status
 * Get system health status
 */
router.get('/system/status', auth, requireAdmin, async (req, res) => {
    try {
        const dbStatus = require('mongoose').connection.readyState;
        const uptime = process.uptime();

        res.json({
            status: 'success',
            data: {
                database: dbStatus === 1 ? 'connected' : 'disconnected',
                uptime,
                nodeEnv: process.env.NODE_ENV,
                realMoneyEnabled: process.env.REAL_MONEY_GAMES_ENABLED === 'true',
                version: '2.0.0'
            }
        });
    } catch (error) {
        logger.error('System status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch system status'
        });
    }
});

const BDWallet = require('../models/BDWallet');

/**
 * GET /admin/wallets
 * Get BD / Treasury wallet balances
 */
router.get('/wallets', auth, requireAdmin, async (req, res) => {
    try {
        // Fetch wallets from DB
        let wallets = await BDWallet.find({ isActive: true }).sort({ createdAt: 1 }).lean();

        // If no wallets in DB, check env for initial seeding (migration path)
        if (wallets.length === 0 && process.env.BD_WALLETS) {
            const walletConfig = process.env.BD_WALLETS;
            let seedWallets = [];
            try {
                const parsed = JSON.parse(walletConfig);
                if (Array.isArray(parsed)) {
                    seedWallets = parsed;
                }
            } catch {
                seedWallets = walletConfig.split(',').map((entry, idx) => {
                    const [name, address, type] = entry.split(':').map(v => v?.trim());
                    return {
                        name: name || `Wallet ${idx + 1}`,
                        address: address || entry.trim(),
                        type: type || 'BD'
                    };
                });
            }

            // Persist seeded wallets
            if (seedWallets.length > 0) {
                await BDWallet.insertMany(seedWallets.map(w => ({
                    name: w.name,
                    address: w.address,
                    type: w.type || 'BD'
                })));
                wallets = await BDWallet.find({ isActive: true }).sort({ createdAt: 1 }).lean();
            }
        }

        const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
        const usdtAddress = process.env.USDT_CONTRACT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
        const usdt = new ethers.Contract(usdtAddress, erc20Abi, provider);

        let decimals = 18;
        try {
            decimals = await usdt.decimals();
        } catch (err) {
            console.warn("Failed to read USDT decimals, defaulting to 18", err?.message || err);
        }

        const data = await Promise.all(
            wallets
                .filter(w => w?.address && ethers.isAddress(w.address))
                .map(async (wallet) => {
                    let balance = "0.00";
                    try {
                        const normalizedAddress = ethers.getAddress(wallet.address);
                        const rawBalance = await usdt.balanceOf(normalizedAddress);
                        const fmt = ethers.formatUnits(rawBalance, decimals);
                        balance = Number(fmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    } catch (e) {
                        console.warn(`Failed to fetch balance for ${wallet.address}:`, e.message);
                        balance = "Error";
                    }

                    return {
                        _id: wallet._id,
                        name: wallet.name,
                        address: wallet.address,
                        type: wallet.type || 'BD',
                        balance
                    };
                })
        );

        res.json({ status: 'success', data });
    } catch (error) {
        if (error.stack) logger.error(error.stack); // ADDED DEBUGGING
        logger.error('Fetch wallets error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch wallet balances', details: error.message });
    }
});

/**
 * POST /admin/wallets
 * Add a new BD wallet
 */
router.post('/wallets', auth, requireAdmin, async (req, res) => {
    try {
        const { name, address, type } = req.body;

        if (!name || !address) {
            return res.status(400).json({ status: 'error', message: 'Name and address are required' });
        }

        if (!ethers.isAddress(address)) {
            return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
        }

        const existing = await BDWallet.findOne({ address: address.toLowerCase() });
        if (existing) {
            return res.status(400).json({ status: 'error', message: 'Wallet already exists' });
        }

        const newWallet = await BDWallet.create({
            name,
            address,
            type: type || 'BD'
        });

        res.json({ status: 'success', data: newWallet });
    } catch (error) {
        logger.error('Add wallet error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to add wallet' });
    }
});

/**
 * DELETE /admin/wallets/:id
 * Remove a BD wallet
 */
router.delete('/wallets/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await BDWallet.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Wallet removed' });
    } catch (error) {
        logger.error('Delete wallet error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete wallet' });
    }
});

/**
 * GET /admin/contract/transactions
 * Fetch end-to-end contract transactions (BSCScan integration)
 */
router.get('/contract/transactions', auth, requireAdmin, async (req, res) => {
    try {
        const contractAddress = process.env.GAME_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
        if (!contractAddress || !ethers.isAddress(contractAddress)) {
            return res.status(400).json({ status: 'error', message: 'Invalid or missing contract address' });
        }

        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const offset = Math.min(Math.max(1, parseInt(req.query.offset || '100', 10)), 10000);
        const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
        const mode = req.query.mode === 'txlist' ? 'txlist' : 'tokentx';

        const timeAgo = (timestamp) => {
            const diff = Date.now() - Number(timestamp) * 1000;
            const minutes = Math.floor(diff / 60000);
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        };

        const explorerApiKey = process.env.ETHERSCAN_API_KEY || process.env.BSCSCAN_API_KEY;
        const chainId = Number(process.env.CHAIN_ID || 56);
        const defaultExplorerBase = 'https://api.etherscan.io/v2/api';
        const explorerBase = process.env.ETHERSCAN_API_URL || process.env.BSCSCAN_API_URL || defaultExplorerBase;

        if (explorerApiKey) {
            const params = new URLSearchParams({
                chainid: String(chainId),
                module: 'account',
                action: mode,
                address: contractAddress,
                startblock: '0',
                endblock: '99999999',
                page: String(page),
                offset: String(offset),
                sort,
                apikey: explorerApiKey
            });

            if (mode === 'tokentx') {
                const usdtAddress = process.env.USDT_CONTRACT_ADDRESS;
                if (usdtAddress && ethers.isAddress(usdtAddress)) {
                    params.set('contractaddress', usdtAddress);
                }
            }

            const response = await fetch(`${explorerBase}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Explorer API request failed (${response.status})`);
            }

            const payload = await response.json();
            const isNoTx = payload?.message && payload.message.toLowerCase().includes('no transactions');
            if (payload?.status !== '1' && !isNoTx) {
                throw new Error(payload?.result || payload?.message || 'Explorer API error');
            }

            const rows = Array.isArray(payload?.result) ? payload.result : [];
            const transactions = rows.map((tx) => {
                const decimals = mode === 'tokentx' ? Number(tx.tokenDecimal || 18) : 18;
                const symbol = mode === 'tokentx' ? (tx.tokenSymbol || 'USDT') : 'BNB';
                let amount = '0.00';
                try {
                    amount = Number(ethers.formatUnits(BigInt(tx.value || '0'), decimals)).toFixed(2);
                } catch {
                    amount = '0.00';
                }

                const method =
                    tx.functionName?.split('(')[0] ||
                    (tx.methodId && tx.methodId !== '0x' ? tx.methodId : (mode === 'tokentx' ? 'Token Transfer' : 'Contract Tx'));

                const status = tx.isError === '1' || tx.txreceipt_status === '0' ? 'Failed' : 'Confirmed';

                return {
                    hash: tx.hash,
                    method,
                    status,
                    amount,
                    symbol,
                    time: timeAgo(tx.timeStamp || tx.timeStamp === 0 ? tx.timeStamp : 0),
                    from: tx.from,
                    to: tx.to
                };
            });

            return res.json({
                status: 'success',
                source: 'explorer',
                pagination: {
                    page,
                    offset,
                    hasMore: rows.length === offset
                },
                data: transactions
            });
        }

        // Fallback to RPC (limited recent logs)
        const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const latestBlock = await provider.getBlockNumber();
        let logs = [];

        try {
            logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: latestBlock - 50,
                toBlock: 'latest'
            });
        } catch (logError) {
            console.warn('Initial RPC log fetch failed (range may be too large), trying last 10 blocks...', logError.message);
            logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: latestBlock - 10,
                toBlock: 'latest'
            });
        }

        const recentLogs = logs.slice(-20).reverse();
        const transactions = await Promise.all(recentLogs.map(async (log) => {
            const block = await provider.getBlock(log.blockNumber);
            let method = 'Contract Interaction';
            let amount = "Checking...";
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();

            try {
                if (log.topics[0] === ethers.id("BetPlaced(address,uint256,uint256,uint256,bool)")) {
                    method = 'PlaceBet';
                    const decoded = abiCoder.decode(['uint256', 'uint256', 'bool'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                } else if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                    method = 'Transfer';
                    const decoded = abiCoder.decode(['uint256'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                } else if (log.topics[0] === ethers.id("WinClaimed(address,uint256,uint256)")) {
                    method = 'WinClaimed';
                    const decoded = abiCoder.decode(['uint256', 'uint256'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                }
            } catch (parseError) {
                console.warn('Failed to parse log data:', parseError.message);
            }

            let from = '';
            let to = '';
            try {
                const txDetails = await provider.getTransaction(log.transactionHash);
                if (txDetails) {
                    from = txDetails.from;
                    to = txDetails.to;
                }
            } catch (err) { }

            return {
                hash: log.transactionHash,
                method,
                status: 'Confirmed',
                amount: amount === "Checking..." ? "-" : parseFloat(amount).toFixed(2),
                symbol: 'USDT',
                time: block ? timeAgo(block.timestamp) : 'Recent',
                from,
                to
            };
        }));

        return res.json({
            status: 'success',
            source: 'rpc',
            pagination: {
                page: 1,
                offset: transactions.length,
                hasMore: false
            },
            data: transactions
        });
    } catch (error) {
        console.error('Contract Transaction Fetch Error:', error);
        res.status(500).json({
            status: 'error',
            message: error?.message || 'Failed to fetch contract transactions'
        });
    }
});

// ============================================
// DATABASE & SYSTEM TOOLS
// ============================================

/**
 * GET /admin/db/stats
 * Get collection counts and DB size
 */
router.get('/db/stats', auth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            users: await mongoose.connection.db.collection('users').countDocuments(),
            games: await mongoose.connection.db.collection('games').countDocuments(),
            jackpots: await mongoose.connection.db.collection('jackpotrounds').countDocuments(),
            audits: await mongoose.connection.db.collection('auditlogs').countDocuments(),
            dbSize: (await mongoose.connection.db.command({ dbStats: 1 })).dataSize,
            collections: (await mongoose.connection.db.listCollections().toArray()).length
        };

        res.json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        logger.error('Admin DB stats error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch DB stats' });
    }
});

// ============================================
// POSTER MANAGEMENT
// ============================================

/**
 * POST /admin/posters
 * Create a new poster
 */
router.post('/posters', auth, requireAdmin, async (req, res) => {
    try {
        const { type, title, description, link, stats, isActive, imageUrl } = req.body || {};

        if (!type || !['promo', 'launch'].includes(type)) {
            return res.status(400).json({ status: 'error', message: 'Invalid poster type' });
        }
        if (!title || !description) {
            return res.status(400).json({ status: 'error', message: 'Title and description are required' });
        }

        const payload = {
            type,
            title,
            description,
            link: link || '/dashboard',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            imageUrl: imageUrl || ''
        };

        if (Array.isArray(stats)) {
            payload.stats = stats
                .filter(s => s && (s.label || s.value))
                .map(s => ({ label: s.label || '', value: s.value || '' }));
        }

        const poster = await Poster.create(payload);

        res.json({
            status: 'success',
            data: poster
        });
    } catch (error) {
        logger.error('Admin poster create error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create poster' });
    }
});

/**
 * GET /admin/posters
 * List all posters
 */
router.get('/posters', auth, requireAdmin, async (req, res) => {
    try {
        let posters = await Poster.find().sort({ type: 1 });

        // Seed default posters if none exist
        if (posters.length === 0) {
            posters = await Poster.create([
                {
                    type: 'promo',
                    title: 'Become The Protocol Owner',
                    description: 'Unlock governance rights, revenue sharing, and elite tier withdrawal limits.',
                    link: '/dashboard',
                    isActive: true
                },
                {
                    type: 'launch',
                    title: 'Lucky Draw Jackpot',
                    description: 'Enter the next draw and secure a share of the protocol prize pool.',
                    link: '/dashboard/lucky-draw',
                    stats: [
                        { label: 'Prize Pool', value: '$25,000' },
                        { label: 'Tickets', value: 'Unlimited' },
                        { label: 'Draw', value: 'Daily' }
                    ],
                    isActive: true
                }
            ]);
        }

        res.json({
            status: 'success',
            data: posters
        });
    } catch (error) {
        logger.error('Admin posters list error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch posters' });
    }
});

/**
 * PUT /admin/posters/:id
 * Update poster
 */
router.put('/posters/:id', auth, requireAdmin, async (req, res) => {
    try {
        const poster = await Poster.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!poster) {
            return res.status(404).json({ status: 'error', message: 'Poster not found' });
        }
        res.json({
            status: 'success',
            data: poster
        });
    } catch (error) {
        logger.error('Admin poster update error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update poster' });
    }
});

module.exports = router;
