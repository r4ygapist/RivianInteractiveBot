// --- Core Imports ---
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
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

// Database Models for Moderation API
const ModerationAction = require('./database/models/ModerationAction');
const ModerationRecord = require('./database/models/ModerationRecord');


// --- Main Bot Function ---
async function main() {
    try {
        await connectDB();

        const client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds, 
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences // Required for Vanity Roles
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
        
        // Define all other routes before the bot logs in.
        // Note: The handlers themselves will wait for the client to be ready if needed.
        app.post('/heartbeat', serverManager.handleHeartbeat);
        app.post('/toll', tollManager.handleToll);
        app.post('/update-data', dataManager.handleDataUpdate);
        app.post('/fetch-updates', economyManager.handleFetchUpdates);
        app.get('/users/get-discord-data', rankTagManager.getDiscordData);
        app.post('/aop/set', aopManager.handleSetAop);
        app.get('/aop/get', aopManager.handleGetAop);
        app.post('/moderation/get-actions', authMiddleware.verifyRobloxSecret, async (req, res) => {
            const { userIds } = req.body;
            if (!Array.isArray(userIds)) return res.status(400).json({ error: 'Invalid payload' });
            const actions = await ModerationAction.find({ targetRobloxId: { $in: userIds }, completed: false });
            if (actions.length > 0) { return res.status(200).json({ status: "found", actions }); }
            return res.status(200).json({ status: "not_found" });
        });
        app.post('/moderation/complete-action/:actionId', authMiddleware.verifyRobloxSecret, async (req, res) => {
            const { actionId } = req.params;
            const result = await ModerationAction.findByIdAndUpdate(actionId, { completed: true });
            if (result) {
                console.log(`[Moderation] Completed action ${actionId}.`);
                return res.status(200).json({ status: 'completed' });
            }
            return res.status(404).json({ status: 'not_found' });
        });
        app.post('/moderation/log', authMiddleware.verifyRobloxSecret, (req, res) => {
             console.log('[Moderation] Received log from game:', req.body);
             res.status(200).json({ status: 'logged' });
        });
        app.post('/roblox/player-event', authMiddleware.verifyRobloxSecret, joinLeaveNotifier.handlePlayerEvent);
        app.post('/roblox/dispatch-tts', authMiddleware.verifyRobloxSecret, dispatchManager.handleTtsRequest);

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
