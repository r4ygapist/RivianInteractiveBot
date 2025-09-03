// roblox/serverManager.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const activeServers = new Map();
let discordClient;
let robloxConfig;

// --- Helper Functions ---
function generateServerIp() {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

function buildStatusMessage(serverData, serverIp, isOnline = true) {
    const { players = [], playerCount = 0, serverId } = serverData;
    const embed = new EmbedBuilder()
        .setAuthor({ name: `${robloxConfig.serverName} - ${serverIp}` })
        .setTitle(`Server Status`)
        .setColor(isOnline ? '#2ECC71' : '#E74C3C')
        .addFields(
            { name: 'Players', value: `\`${playerCount}\``, inline: true },
            { name: 'Status', value: isOnline ? '✅ Online' : '❌ Offline', inline: true },
            { name: 'Player List', value: `\`\`\`\n${players.join('\n') || 'No players online'}\n\`\`\`` }
        )
        .setFooter({ text: 'Last Updated' });

    if (isOnline) embed.setTimestamp(new Date());

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Join Game').setStyle(ButtonStyle.Link).setURL(robloxConfig.gameJoinUrl).setEmoji('▶️'));
    return { content: `**Server ID:** \`${serverId}\``, embeds: [embed], components: [row] };
}

// --- Timeout and Heartbeat Logic ---
async function setServerOffline(serverId) {
    if (!activeServers.has(serverId)) return;

    console.log(`[Timeout] Server ${serverId} timed out. Marking as offline.`);
    const serverInfo = activeServers.get(serverId);
    activeServers.delete(serverId);

    try {
        const offlineMessage = buildStatusMessage({ serverId }, serverInfo.serverIp, false);
        await serverInfo.message.edit(offlineMessage);

        console.log(`[Timeout] Scheduling message for ${serverId} for deletion in 5s.`);
        setTimeout(async () => {
            try {
                await serverInfo.message.delete();
                console.log(`[Timeout] Deleted message for offline server ${serverId}.`);
            } catch (deleteError) {
                if (deleteError.code !== 10008) console.error(`[Timeout] Failed to delete message for ${serverId}:`, deleteError.message);
            }
        }, 5000); // 5 seconds

    } catch (editError) {
        if (editError.code !== 10008) console.error(`[Timeout] Failed to edit message for ${serverId}:`, editError.message);
    }
}

function createNewTimeout(serverId) {
    console.log(`[Heartbeat] Scheduling new timeout for ${serverId} in ${robloxConfig.heartbeatTimeout}s.`);
    return setTimeout(() => setServerOffline(serverId), robloxConfig.heartbeatTimeout * 1000);
}

async function handleHeartbeat(req, res) {
    if (!discordClient) return res.status(503).send({ error: 'Discord client not ready.' });

    const { serverId, players, playerCount } = req.body;
    if (!serverId || !Array.isArray(players) || typeof playerCount !== 'number') {
        return res.status(400).send({ error: 'Invalid heartbeat payload.' });
    }

    try {
        const channel = await discordClient.channels.fetch(robloxConfig.statusChannelId);
        if (!channel?.isTextBased()) throw new Error('Status channel not found or is not a text channel.');

        const serverData = { serverId, players, playerCount };

        if (activeServers.has(serverId)) {
            const serverInfo = activeServers.get(serverId);
            clearTimeout(serverInfo.timeout);
            const messagePayload = buildStatusMessage(serverData, serverInfo.serverIp, true);
            await serverInfo.message.edit(messagePayload);
            serverInfo.timeout = createNewTimeout(serverId);
        } else {
            console.log(`[Heartbeat] New server connected: ${serverId}.`);
            const serverIp = generateServerIp();
            const messagePayload = buildStatusMessage(serverData, serverIp, true);
            const message = await channel.send(messagePayload);
            const timeout = createNewTimeout(serverId);
            activeServers.set(serverId, { message, timeout, serverIp });
        }
        res.status(200).send({ status: 'OK' });
    } catch (error) {
        console.error('[Heartbeat] Error processing heartbeat:', error);
        res.status(500).send({ error: 'Internal server error.' });
    }
}

module.exports = {
    init: (client, config) => {
        discordClient = client;
        robloxConfig = config.roblox;
        console.log('[Roblox] Server Manager Initialized.');
    },
    handleHeartbeat,
};