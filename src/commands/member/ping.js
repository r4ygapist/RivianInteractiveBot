// commands/member/ping.js
const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks the bot\'s latency and connection status.'),

    async execute(interaction) {
        // Send an initial reply to measure the round-trip time
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });

        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const websocketPing = interaction.client.ws.ping;

        // Measure database latency
        const dbStartTime = Date.now();
        await mongoose.connection.db.admin().ping();
        const dbLatency = Date.now() - dbStartTime;

        // Get bot uptime
        let totalSeconds = (interaction.client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        const uptimeString = `${days}d, ${hours}h, ${minutes}m, ${seconds}s`;


        // Format the main content string
        const content = [
            `# Pong!`,
            `It took **${apiLatency}ms** for the bot to respond.`,
            ``,
            `From **RiviSync Primary Cluster**, at ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}`,
            ``,
            `### Advanced Stats:`,
            `**API Latency:** \`${apiLatency}ms\``,
            `**WebSocket Ping:** \`${websocketPing}ms\``,
            `**Database Ping:** \`${dbLatency}ms\``,
            `**Uptime:** \`${uptimeString}\``,
        ].join('\n');


        // --- Build the custom display component ---

        // 1. Create the thumbnail on the right
        const thumbnail = new ThumbnailBuilder()
            .setURL(interaction.guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png');

        // 2. Create the main text display
        const textDisplay = new TextDisplayBuilder()
            .setContent(content);

        // 3. Create a section to hold the text and thumbnail
        const section = new SectionBuilder()
            .addTextDisplayComponents(textDisplay)
            .setThumbnailAccessory(thumbnail);

        // 4. Create the main container
        const container = new ContainerBuilder()
            .setAccentColor(3618621) // A nice dark blue
            .addSectionComponents(section);

        // 5. Edit the original reply with the new component layout
        await interaction.editReply({
            content: '',
            components: [container],
            flags: MessageFlags.IsComponentsV2, // This flag is required to render these components
        });
    },
};