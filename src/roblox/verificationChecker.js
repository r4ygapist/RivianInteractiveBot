// roblox/verificationChecker.js
const VerifiedUser = require('../database/models/VerifiedUser');

/**
 * Checks if a Roblox user is verified and returns their data if they are.
 */
async function checkVerification(req, res) {
    const { robloxId } = req.query;

    if (!robloxId) {
        return res.status(400).json({ status: "error", message: "Missing robloxId query parameter." });
    }

    try {
        const verifiedUser = await VerifiedUser.findOne({ robloxId: robloxId.toString() });

        if (verifiedUser) {
            // Found the user, send back their data
            res.status(200).json({
                status: "verified",
                discordId: verifiedUser.discordId,
                robloxUsername: verifiedUser.robloxUsername,
                // You could add the Discord username here if you fetch it
            });
        } else {
            // User is not in the database
            res.status(404).json({ status: "unverified" });
        }

    } catch (error) {
        console.error('[VerificationCheck] Error checking user:', error);
        res.status(500).json({ status: "error", message: "Internal server error." });
    }
}

module.exports = {
    checkVerification,
};