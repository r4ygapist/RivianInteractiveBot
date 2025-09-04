// config.js
require('dotenv').config();

/**
 * A helper function to ensure that required environment variables are present.
 * If a variable is missing, it throws an error to prevent the bot from starting
 * with an incomplete configuration.
 * @param {string} varName - The name of the environment variable to check.
 * @returns {string} The value of the environment variable.
 */
function requireEnv(varName) {
    const value = process.env[varName];
    if (!value) {
        throw new Error(`FATAL ERROR: Missing required environment variable "${varName}". Please check your .env file.`);
    }
    return value;
}

module.exports = {
    /**
     * Discord Bot Configuration
     */
    discord: {
        token: requireEnv('DISCORD_TOKEN'),
        clientId: requireEnv('DISCORD_CLIENT_ID'),
        guildId: requireEnv('DISCORD_GUILD_ID'),
        autoroleId: process.env.AUTOROLE_ID,
        verifyChannelId: process.env.VERIFY_CHANNEL_ID,
        supportChannelId: process.env.SUPPORT_CHANNEL_ID,
        welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    },
    
    /**
     * Moderation & Dispatch System Configuration
     */
    moderation: {
        logChannelId: requireEnv('MODERATION_LOG_CHANNEL_ID'),
        joinLeaveLogChannelId: requireEnv('JOIN_LEAVE_LOG_CHANNEL_ID'),
        dispatchVoiceChannelId: requireEnv('DISPATCH_VOICE_CHANNEL_ID'),
        dispatchTextChannelId: requireEnv('DISPATCH_TEXT_CHANNEL_ID'),
    },

    /**
     * MongoDB Database Configuration
     */
    database: {
        uri: requireEnv('MONGODB_URI'),
    },

    /**
     * Roblox Server Status Configuration
     */
    roblox: {
        serverName: 'Hampton',
        gameJoinUrl: requireEnv('GAME_JOIN_URL'),
        statusChannelId: requireEnv('STATUS_CHANNEL_ID'),
        heartbeatTimeout: 25,
    },

    /**
     * Web Server Configuration (for Roblox heartbeats and data sync)
     */
    webServer: {
        port: process.env.WEB_SERVER_PORT || 3000,
        robloxSecret: requireEnv('ROBLOX_SECRET_KEY'),
    },

    /**
     * In-Game Economy Configuration
     */
    economy: {
        startingCash: 2500,
        startingBank: 5000,
    },

    dmv: {
        reviewChannelId: requireEnv('DMV_REVIEW_CHANNEL_ID'),
        licensedRoleId: requireEnv('LICENSED_DRIVER_ROLE_ID'),
        serverName: process.env.SERVER_NAME || 'State of New Jersey',
    },

    /**
     * Command Permissions
     * Maps folder names in the '/commands' directory to an array of Role IDs
     * loaded from your .env file.
     */
    permissions: {
        admin: process.env.ADMIN_ROLES ? process.env.ADMIN_ROLES.split(',') : [],
        moderator: process.env.MODERATOR_ROLES ? process.env.MODERATOR_ROLES.split(',') : [],
        member: process.env.MEMBER_ROLES ? process.env.MEMBER_ROLES.split(',') : [],
    },

    /**
     * Vanity Role System Configuration
     */
    vanityRoles: {
        // Settings for this feature are stored in the database.
        // The bot requires the "Presence Intent" to be enabled in the Discord Developer Portal for this to work.
    },
    
    /**
     * Support Ticket System Configuration
     */
    supportSystem: {
        // Staff roles that can view and manage all tickets. Set this in your .env file.
        staffRoleIds: process.env.SUPPORT_STAFF_ROLES ? process.env.SUPPORT_STAFF_ROLES.split(',') : [],
    }
};
