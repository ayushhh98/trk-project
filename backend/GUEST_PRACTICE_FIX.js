// TEMPORARY FIX: Guest Practice Mode Endpoint
// Add this route to handle practice games without full authentication
// This allows users to play practice mode without connecting wallet

router.post('/bet/guest-practice', async (req, res) => {
    try {
        const { betAmount, pickedNumber, gameVariant = 'dice' } = req.body;

        // Validation
        if (!betAmount || betAmount < 1.0 || betAmount > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'Bet amount must be between 1.0 and 1000',
                code: 'INVALID_BET_AMOUNT'
            });
        }

        if (!validatePickedNumber(gameVariant, pickedNumber)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid picked number for ${gameVariant}`,
                code: 'INVALID_PICKED_NUMBER'
            });
        }

        // For guest users, use session-based balance (stored in memory/session)
        // Or return a simulated result without saving to database

        // Generate server seed and result
        const serverSeed = generateServerSeed();
        const clientSeed = generateClientSeed();
        const nonce = Date.now();

        // Generate provably fair result
        const luckyNumber = generateResult(serverSeed, clientSeed, nonce, gameVariant);

        // Calculate outcome
        const outcome = calculateOutcome(gameVariant, pickedNumber, luckyNumber, betAmount);

        // Emit socket event for live activity
        const io = req.app.get('io');
        if (io) {
            io.emit('live_activity', {
                type: outcome.isWin ? 'WIN' : 'BET',
                user: 'Guest Player',
                amount: outcome.isWin ? outcome.payout : betAmount,
                gameType: gameVariant,
                multiplier: outcome.multiplier,
                timestamp: new Date().toISOString()
            });
        }

        // Return result without saving to database
        res.status(200).json({
            status: 'success',
            data: {
                game: {
                    id: `GUEST-${Date.now()}`,
                    pickedNumber,
                    ...outcome,
                    gameVariant
                },
                message: 'Guest practice game - results not saved. Connect wallet to track your progress!',
                provablyFair: {
                    serverSeed,
                    serverSeedHash: hashSeed(serverSeed),
                    clientSeed,
                    nonce
                }
            }
        });

    } catch (error) {
        console.error('Guest practice bet error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process guest practice bet'
        });
    }
});

// Helper function (if not already defined in this file)
function validatePickedNumber(variant, pickedNumber) {
    switch (variant) {
        case 'dice':
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 8;
        case 'spin':
            if (Array.isArray(pickedNumber)) {
                return pickedNumber.every(n => Number.isInteger(n) && n >= 1 && n <= 8);
            }
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 8;
        case 'matrix':
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 95;
        case 'crash':
            const crashTarget = parseFloat(pickedNumber);
            return !isNaN(crashTarget) && crashTarget >= 1.0 && crashTarget <= 10.0;
        default:
            return true;
    }
}
