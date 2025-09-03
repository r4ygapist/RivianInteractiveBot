// roblox/aopManager.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

let discordClient;
let currentAOP = "None"; // Variable to store the current AOP

/**
 * Handles setting the AOP.
 */
async function handleSetAop(req, res) {
    const { aop } = req.body;
    if (!aop) {
        return res.status(400).json({ error: 'Invalid payload. Missing aop.' });
    }

    currentAOP = aop;
    console.log(`[AOP Manager] AOP set to: ${currentAOP}`);
    res.status(200).json({ status: 'AOP set' });
}

/**
 * Handles getting the AOP.
 */
async function handleGetAop(req, res) {
    res.status(200).json({ aop: currentAOP });
}

module.exports = {
    init: (client) => {
        discordClient = client;
    },
    handleSetAop,
    handleGetAop,
};