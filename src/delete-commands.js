// delete-commands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('./config');

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(config.token);

// This script removes all guild-based commands.
(async () => {
    try {
        console.log(`Started removing all application (/) commands from guild: ${config.guildId}`);

        // The 'put' method with an empty body will remove all commands from the guild.
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: [] },
        );

        console.log('Successfully removed all application commands from the guild.');
    } catch (error) {
        console.error(error);
    }
})();