// roblox/dataManager.js
const VerifiedUser = require('../database/models/VerifiedUser');

/**
 * Handles incoming data sync requests from Roblox servers.
 */
async function handleDataUpdate(req, res) {
    const { robloxId, cash, bank } = req.body;
    if (!robloxId) {
        return res.status(400).json({ error: 'Invalid payload. Missing robloxId.' });
    }

    try {
        // Update the user's document in MongoDB if they exist.
        await VerifiedUser.findOneAndUpdate(
            { robloxId: robloxId.toString() },
            { $set: { cash, bank } },
        );
        
        res.status(200).json({ status: 'Data synced' });
    } catch (error) {
        console.error('[Data Sync] Error updating user data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    handleDataUpdate,
};