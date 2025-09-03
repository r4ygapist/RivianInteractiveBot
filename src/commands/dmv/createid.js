// commands/dmv/createid.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createid')
        .setDescription("Begin the application for your official roleplay ID."),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });
        if (!userData) {
            return interaction.editReply('You must be verified to create an ID. Please use `/verify`.');
        }
        if (userData.identity) {
            return interaction.editReply('You have already created an ID.');
        }

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`${config.dmv.serverName} Identification Application`)
            .setDescription('Welcome! This process will guide you through creating your official roleplay ID.\n\nPlease click the button below to begin Part 1 of the application.')
            .setFooter({ text: 'You will have 5 minutes to complete each part of the form.' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startIdPart1')
                    .setLabel('Start Application')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
    },
};