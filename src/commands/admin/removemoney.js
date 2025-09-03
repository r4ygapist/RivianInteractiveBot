// commands/admin/removemoney.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription("Remove money from a verified user's balance.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The Discord user to remove money from.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The balance to remove from.')
                .setRequired(true)
                .addChoices(
                    { name: 'Cash', value: 'cash' },
                    { name: 'Bank', value: 'bank' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of money to remove.')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('user');
        const type = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        try {
            const updateResult = await VerifiedUser.findOneAndUpdate(
                { discordId: targetUser.id },
                { $inc: { [type]: -amount } }, // Use a negative amount to subtract
                { new: true }
            );

            if (!updateResult) {
                return interaction.editReply(`**${targetUser.tag}** is not a verified user.`);
            }
            
            // Updated reply message to manage expectations
            await interaction.editReply(`Successfully updated **${targetUser.tag}**'s balance in the database. The change will appear in-game shortly.`);

        } catch (error) {
            console.error('Removemoney error:', error);
            await interaction.editReply('An error occurred while updating the balance.');
        }
    },
};