// roblox/rankTagManager.js
const VerifiedUser = require('../database/models/VerifiedUser');
const config = require('../config');

let discordClient;

/**
 * Fetches a user's Discord username and roles based on their Roblox username.
 */
async function getDiscordData(req, res) {
    const { robloxUsername } = req.query;
    if (!robloxUsername) {
        return res.status(400).json({ status: "error", message: "Missing robloxUsername query parameter." });
    }

    try {
        const verifiedUser = await VerifiedUser.findOne({ robloxUsername: robloxUsername });

        if (!verifiedUser) {
            return res.status(404).json({ status: "not_found", message: "Roblox user is not verified with the bot." });
        }

        const guild = await discordClient.guilds.fetch(config.discord.guildId);
        const member = await guild.members.fetch(verifiedUser.discordId);

        if (!member) {
            return res.status(404).json({ status: "not_found", message: "Could not find the user in the Discord server." });
        }

        const roles = member.roles.cache.map(role => role.name);

        res.status(200).json({
            status: "found",
            discordUsername: member.user.username,
            roles: roles,
        });

    } catch (error) {
        console.error('[RankTagManager] Error fetching Discord data:', error);
        res.status(500).json({ status: "error", message: "Internal server error." });
    }
}

module.exports = {
    init: (client) => {
        discordClient = client;
    },
    getDiscordData,
};