// roblox/economyManager.js
const VerifiedUser = require('../database/models/VerifiedUser');

/**
 * Handles requests from Roblox asking for the latest balance of a player.
 */
async function handleFetchUpdates(req, res) {
    const { robloxId } = req.body;
    if (!robloxId) {
        return res.status(400).json({ error: 'Invalid payload. Missing robloxId.' });
    }

    try {
        // Find the user's data in the database
        const userData = await VerifiedUser.findOne({ robloxId: robloxId.toString() });

        if (userData) {
            // Send the latest cash and bank balance back to Roblox
            res.status(200).json({
                cash: userData.cash,
                bank: userData.bank,
            });
        } else {
            // If user doesn't exist in DB, tell Roblox there's no data
            res.status(404).json({ error: 'User not found in database.' });
        }
    } catch (error) {
        console.error('[Economy Sync] Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    handleFetchUpdates,
};