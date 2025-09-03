// commands/member/balance.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser'); // <-- Corrected path

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or another user's in-game balance.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose balance you want to see.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const userData = await VerifiedUser.findOne({ discordId: targetUser.id });

            if (!userData) {
                const content = targetUser.id === interaction.user.id
                    ? 'You are not verified yet. Please use `/verify`.'
                    : `**${targetUser.tag}** is not verified with the bot.`;
                return interaction.editReply({ content, ephemeral: true });
            }

            const balanceEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`${userData.robloxUsername}'s Balance`)
                .setURL(`https://www.roblox.com/users/${userData.robloxId}/profile`)
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .addFields(
                    { name: '💰 Cash', value: `$${userData.cash.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${userData.bank.toLocaleString()}`, inline: true }
                )
                .setFooter({ text: 'Balances are updated periodically from the game.' })
                .setTimestamp();

            await interaction.editReply({ embeds: [balanceEmbed] });

        } catch (error) {
            console.error('Balance command error:', error);
            await interaction.editReply({ content: 'An error occurred while fetching the balance.', ephemeral: true });
        }
    },
};