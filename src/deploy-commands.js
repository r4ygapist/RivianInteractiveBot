const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config'); // Loads your updated .env values

const commands = [];

// Recursive function to find all command files
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath);
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        console.log(`Deploying to server ID: ${config.discord.guildId}`); // Confirms which server it's deploying to

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands on the specified server.`);
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
})();