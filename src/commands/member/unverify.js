// commands/member/unverify.js
const { SlashCommandBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser'); // <-- CORRECTED PATH

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unverify')
        .setDescription('Remove your Roblox account verification from the bot.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const discordId = interaction.user.id;

        try {
            const result = await VerifiedUser.findOneAndDelete({ discordId });

            if (result) {
                await interaction.editReply({ content: `Successfully unverified your linked account: **${result.robloxUsername}**.` });
            } else {
                await interaction.editReply({ content: 'You are not currently verified.' });
            }
        } catch (error) {
            console.error('Unverification Error:', error);
            await interaction.editReply({ content: 'An error occurred while trying to unverify you.' });
        }
    },
};