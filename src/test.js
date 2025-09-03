// src/test.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

console.log('[Test Script] Attempting to log in with provided token...');

client.once('ready', () => {
    console.log(`[Test Script] SUCCESS! Logged in as ${client.user.tag}`);
    // We exit gracefully after a successful login to show the test passed.
    process.exit(0); 
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('[Test Script] LOGIN FAILED. See error below:');
    console.error(err);
    // We exit with an error code to show the test failed.
    process.exit(1); 
});