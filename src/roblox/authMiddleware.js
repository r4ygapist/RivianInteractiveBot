// roblox/authMiddleware.js
const config = require('../config');

/**
 * A middleware function to verify that a request is coming from Roblox.
 * It checks for a secret key in the 'x-roblox-secret' header.
 */
const verifyRobloxSecret = (req, res, next) => {
    const secretKey = req.headers['x-roblox-secret'];

    if (!secretKey || secretKey !== config.webServer.robloxSecret) {
        console.warn(`[Auth] Denied request with invalid or missing secret key from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // If the key is correct, proceed to the next function (the actual endpoint handler)
    next();
};

module.exports = {
    verifyRobloxSecret,
};