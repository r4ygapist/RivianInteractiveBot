const { EmbedBuilder } = require('discord.js');
const config = require('../config');

let discordClient;

/**
 * Handles incoming join/leave notifications from a Roblox server.
 */
async function handlePlayerEvent(req, res) {
    const { eventType, playerName, playerId, serverName } = req.body;

    if (!eventType || !playerName || !playerId) {
        return res.status(400).json({ status: "error", message: "Missing required payload fields." });
    }

    const logChannelId = config.moderation.joinLeaveLogChannelId;
    if (!logChannelId) {
        console.warn('[Join/Leave] No channel configured for join/leave logs. Set JOIN_LEAVE_LOG_CHANNEL_ID.');
        return res.status(200).json({ status: "ok - channel not configured" });
    }

    try {
        const logChannel = await discordClient.channels.fetch(logChannelId);
        if (!logChannel) {
            console.error(`[Join/Leave] Could not find the log channel with ID: ${logChannelId}`);
            return res.status(500).json({ status: "error", message: "Log channel not found." });
        }

        const isJoin = eventType.toLowerCase() === 'join';
        // Construct the valid thumbnail URL here to avoid errors from Roblox-specific protocols.
        const thumbnailUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${playerId}&size=150x150&format=Png&isCircular=false`;

        const embed = new EmbedBuilder()
            .setColor(isJoin ? '#2ECC71' : '#E74C3C')
            .setAuthor({ 
                name: `${playerName} has ${isJoin ? 'joined' : 'left'} the game.`,
                iconURL: 'https://i.imgur.com/83hJ1S4.png'
            })
            .setThumbnail(thumbnailUrl)
            .addFields(
                { name: 'Player', value: `[${playerName}](https://www.roblox.com/users/${playerId}/profile)`, inline: true },
                { name: 'Server', value: serverName || 'Main Server', inline: true }
            )
            .setFooter({ text: `Player ID: ${playerId}`})
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error('[Join/Leave] Failed to send log to Discord:', error);
        res.status(500).json({ status: "error", message: "Internal server error." });
    }
}

module.exports = {
    init: (client) => {
        discordClient = client;
    },
    handlePlayerEvent,
};

