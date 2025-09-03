// roblox/tollManager.js
const { EmbedBuilder } = require('discord.js');
const VerifiedUser = require('../database/models/VerifiedUser');

let discordClient;

async function handleToll(req, res) {
    // --- DEBUG: Log when a request is received ---
    console.log('[Toll Debug] Received a request on /toll endpoint.');
    console.log('[Toll Debug] Request Body:', JSON.stringify(req.body, null, 2));

    if (!discordClient) {
        console.error('[Toll Debug] FAILURE: Discord client is not ready.');
        return res.status(503).json({ error: 'Discord client not ready.' });
    }

    const { robloxId, robloxUsername } = req.body;
    if (!robloxId) {
        console.error('[Toll Debug] FAILURE: Request is missing robloxId.');
        return res.status(400).json({ error: 'Invalid payload. Missing robloxId.' });
    }

    try {
        // --- DEBUG: Log the database query ---
        console.log(`[Toll Debug] Searching for verified user with Roblox ID: ${robloxId}`);
        const verifiedUser = await VerifiedUser.findOne({ robloxId: robloxId.toString() });

        if (!verifiedUser) {
            // This is a common reason for failure. The player isn't verified.
            console.log(`[Toll Debug] STOP: No verified user found for Roblox ID ${robloxId}. Cannot send DM.`);
            return res.status(200).json({ status: 'OK - User not verified.' });
        }

        // --- DEBUG: Log if the user was found ---
        console.log(`[Toll Debug] SUCCESS: Found verified user. Discord ID: ${verifiedUser.discordId}`);

        const discordUser = await discordClient.users.fetch(verifiedUser.discordId);
        if (!discordUser) {
            console.log(`[Toll Debug] FAILURE: Could not fetch Discord user object for ID: ${verifiedUser.discordId}`);
            return res.status(200).json({ status: 'OK - Discord user not found.' });
        }

        // --- DEBUG: Log before sending the DM ---
        console.log(`[Toll Debug] Attempting to send DM to Discord user: ${discordUser.tag}`);

        // (The embed creation is the same as before)
        const { vehicleName, licensePlate, location, amount, transactionId, timestamp } = req.body;
        const ticketEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Hampton Toll Invoice')
            .setAuthor({ name: 'Hampton Department of Transportation' })
            .setThumbnail('https://i.imgur.com/83hJ1S4.png')
            .setDescription(`A payment of **$${amount}** has been automatically deducted from your account.`)
            .addFields(
                { name: 'Transaction ID', value: `\`${transactionId}\`` },
                { name: 'Driver', value: robloxUsername, inline: true },
                { name: 'Vehicle', value: vehicleName, inline: true },
                { name: 'License Plate', value: `\`${licensePlate || 'N/A'}\``, inline: true },
                { name: 'Toll Location', value: location, inline: false },
                { name: 'Date & Time', value: timestamp, inline: false }
            )
            .setFooter({ text: 'Thank you for driving safely in Hampton.' })
            .setTimestamp();

        await discordUser.send({ embeds: [ticketEmbed] });
        console.log(`[Toll Debug] SUCCESS: DM sent to ${discordUser.tag}.`);
        res.status(200).json({ status: 'DM Sent' });

    } catch (error) {
        if (error.code === 50007) {
            console.warn(`[Toll Debug] FAILURE: Cannot send DM to user with Roblox ID ${robloxId}. They likely have DMs disabled.`);
            return res.status(200).json({ status: 'OK - User has DMs disabled.' });
        }
        console.error('[Toll Debug] CRITICAL FAILURE:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    init: (client) => {
        discordClient = client;
    },
    handleToll,
};