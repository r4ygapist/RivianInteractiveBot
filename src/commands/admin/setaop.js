// commands/admin/setaop.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setaop')
        .setDescription("Set the in-game Area of Patrol (AOP).")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('aop')
                .setDescription('The new AOP.')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const aop = interaction.options.getString('aop');

        try {
            // The URL should be the same as your bot's public URL
            await axios.post('https://rxavirus.onrender.com/aop/set', { aop });
            await interaction.editReply(`Successfully set the AOP to **${aop}**.`);
        } catch (error) {
            console.error('Set AOP error:', error);
            await interaction.editReply('An error occurred while setting the AOP.');
        }
    },
};