// --- Core Imports ---
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const express = require('express');

// --- Custom Module Imports ---
const config = require('./config');
const connectDB = require('./database/database');
const authMiddleware = require('./roblox/authMiddleware');
const VerifiedUser = require('./database/models/VerifiedUser');
const DispatchSettings = require('./database/models/DispatchSettings');

// Roblox Managers
const serverManager = require('./roblox/serverManager');
const tollManager = require('./roblox/tollmanager');
const dataManager = require('./roblox/datamanager');
const economyManager = require('./roblox/economyManager');
const aopManager = require('./roblox/aopManager');
const rankTagManager = require('./roblox/rankTagManager');
const joinLeaveNotifier = require('./roblox/joinLeaveNotifier');
const dispatchManager = require('./roblox/dispatchManager');

// --- Main Bot Function ---
async function main() {
    try {
        await connectDB();

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences
            ]
        });
        client.commands = new Collection();

        // --- Load Commands & Events ---
        const loadCommands = (dir) => {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const filePath = path.join(dir, file.name);
                if (file.isDirectory()) {
                    loadCommands(filePath);
                } else if (file.name.endsWith('.js')) {
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                    }
                }
            }
        };
        loadCommands(path.join(__dirname, 'commands'));
        console.log(`[Commands] Loaded ${client.commands.size} commands.`);

        const eventsPath = path.join(__dirname, 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(path.join(eventsPath, file));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
        console.log(`[Events] Loaded ${eventFiles.length} event handlers.`);

        // --- Set up Web Server FIRST ---
        const app = express();
        app.use(express.json());

        // --- Define Web Server API Routes ---
        app.get('/', (req, res) => res.status(200).send('RiviSync bot is running and API is available.'));

        app.post('/heartbeat', serverManager.handleHeartbeat);
        app.post('/toll', tollManager.handleToll);
        app.post('/update-data', dataManager.handleDataUpdate);
        app.post('/fetch-updates', economyManager.handleFetchUpdates);
        app.get('/users/get-discord-data', rankTagManager.getDiscordData);
        app.post('/aop/set', aopManager.handleSetAop);
        app.get('/aop/get', aopManager.handleGetAop);
        app.post('/roblox/player-event', authMiddleware.verifyRobloxSecret, joinLeaveNotifier.handlePlayerEvent);

        // --- Role Check Whitelist Route ---
        app.get('/roblox/check-role', authMiddleware.verifyRobloxSecret, async (req, res) => {
            if (!client.isReady()) return res.status(503).json({ error: 'Discord client not ready.' });
            
            const { playerId } = req.query;
            if (!playerId) {
                return res.status(400).json({ error: 'Missing playerId query parameter.' });
            }

            try {
                // *** FIX: Corrected the typo in the findOne query ***
                const verifiedUser = await VerifiedUser.findOne({ robloxId: playerId });
                if (!verifiedUser) {
                    return res.status(200).json({ hasRole: false });
                }

                const guild = await client.guilds.fetch(config.discord.guildId);
                const member = await guild.members.fetch(verifiedUser.discordId).catch(() => null);

                if (!member) {
                    return res.status(200).json({ hasRole: false });
                }

                const hasRole = member.roles.cache.has(config.discord.requiredRoleId);
                res.status(200).json({ hasRole });

            } catch (error) {
                console.error('[Role Check] Failed to check role:', error);
                res.status(500).json({ hasRole: false });
            }
        });

        // --- Player Down Dispatch Route ---
        app.post('/roblox/player-down', authMiddleware.verifyRobloxSecret, async (req, res) => {
            if (!client.isReady()) return res.status(503).json({ error: 'Discord client not ready.' });

            const { playerName, playerId, location, status } = req.body;
            if (!playerName || !playerId || !location) {
                return res.status(400).json({ error: 'Missing required payload fields.' });
            }

            const settings = await DispatchSettings.findOne({ guildId: config.discord.guildId });

            if (settings && settings.ttsEnabled) {
                const ttsMessage = settings.ttsMessage
                    .replace(/{player}/g, playerName)
                    .replace(/{location}/g, location)
                    .replace(/{status}/g, status);
                dispatchManager.queueTts(ttsMessage);
            }

            try {
                const dispatchChannel = await client.channels.fetch(config.moderation.dispatchTextChannelId);
                if (dispatchChannel) {
                    const pingContent = (settings && settings.pingRoleIds.length > 0)
                        ? settings.pingRoleIds.map(id => `<@&${id}>`).join(' ')
                        : '';
                    
                    const thumbnailUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${playerId}&size=150x150&format=Png&isCircular=false`;

                    const mainContent = [
                        `# 🚨 Officer Down`,
                        `**Unit:** [${playerName}](https://www.roblox.com/users/${playerId}/profile)`,
                        `**Last Known Location:** \`${location}\``,
                        `**Status:** ${status}`,
                        `\n_All available units are requested to respond immediately._`
                    ].join('\n');

                    const thumbnail = new ThumbnailBuilder().setURL(thumbnailUrl);
                    const mainText = new TextDisplayBuilder().setContent(mainContent);
                    const mainSection = new SectionBuilder().addTextDisplayComponents(mainText).setThumbnailAccessory(thumbnail);
                    
                    const container = new ContainerBuilder().setAccentColor(0xDD2E44).addSectionComponents(mainSection);
                    
                    if (pingContent) {
                        await dispatchChannel.send({ content: pingContent });
                    }
                    await dispatchChannel.send({ components: [container] });
                }
            } catch (error) {
                console.error('[Dispatch] Failed to send text alert:', error);
            }

            res.status(200).json({ status: 'ok' });
        });

        const PORT = process.env.PORT || 10000;
        app.listen(PORT, () => {
            console.log(`[Web Server] Listening on port ${PORT}.`);
        });

        // --- Event: Client Ready ---
        client.once(Events.ClientReady, async readyClient => {
            console.log(`✅ Discord Bot Ready! Logged in as ${readyClient.user.tag}`);

            serverManager.init(readyClient, config);
            tollManager.init(readyClient);
            aopManager.init(readyClient);
            rankTagManager.init(readyClient);
            joinLeaveNotifier.init(readyClient);
            dispatchManager.init(readyClient);

            console.log('[Managers] All systems initialized.');
        });

        // --- Discord Client Login ---
        await client.login(config.discord.token);

    } catch (error) {
        console.error('An unhandled error occurred during startup:', error);
        process.exit(1);
    }
}

// Catch unhandled promise rejections
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

main();

