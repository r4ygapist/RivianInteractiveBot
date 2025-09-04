// --- Core Imports ---
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const express = require('express');

// --- Custom Module Imports ---
const config = require('./config');
const connectDB = require('./database/database');
const authMiddleware = require('./roblox/authMiddleware');

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

        // --- Player Down Dispatch Route ---
        app.post('/roblox/player-down', authMiddleware.verifyRobloxSecret, async (req, res) => {
            if (!client.isReady()) return res.status(503).json({ error: 'Discord client not ready.' });

            const { playerName, playerId, location, status } = req.body;
            if (!playerName || !playerId || !location) {
                return res.status(400).json({ error: 'Missing required payload fields.' });
            }

            // ===============================================================
            // EDIT THIS LINE TO CHANGE WHAT THE BOT SAYS IN THE VOICE CHANNEL
            // ===============================================================
            const ttsMessage = `Officer down, ${playerName}, at ${location}. Status is ${status}. All units respond.`;
            dispatchManager.queueTts(ttsMessage);

            // 2. Send the Display Components V2 message
            try {
                const dispatchChannel = await client.channels.fetch(config.moderation.dispatchTextChannelId);
                if (dispatchChannel) {
                    const thumbnailUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${playerId}&size=150x150&format=Png&isCircular=false`;
                    
                    const pingContent = config.supportSystem.staffRoleIds.length > 0
                        ? config.supportSystem.staffRoleIds.map(id => `<@&${id}>`).join(' ')
                        : '';
                    
                    // ===============================================================
                    // EDIT THE TEXT BELOW TO CHANGE THE DISPATCH MESSAGE
                    // ===============================================================
                    const mainContent = [
                        `# 🚨 Officer Down`,
                        `**Unit:** [${playerName}](https://www.roblox.com/users/${playerId}/profile)`,
                        `**Last Known Location:** \`${location}\``,
                        `**Status:** ${status}`,
                        `\n_All available units are requested to respond immediately._`
                    ].join('\n');

                    const thumbnail = new ThumbnailBuilder().setURL(thumbnailUrl);
                    const mainText = new TextDisplayBuilder().setContent(mainContent);
                    const mainSection = new SectionBuilder()
                        .addTextDisplayComponents(mainText)
                        .setThumbnailAccessory(thumbnail);
                    
                    const container = new ContainerBuilder()
                        .setAccentColor(0xDD2E44)
                        .addSectionComponents(mainSection);
                    
                    // FIX: Send pings in a separate message first, then send the component.
                    if (pingContent) {
                        await dispatchChannel.send({ content: pingContent });
                    }
                    await dispatchChannel.send({ components: [container], flags: MessageFlags.IsComponents_V2 });
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

            // Initialize all managers that depend on the client being ready
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

