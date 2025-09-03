// commands/admin/purge.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified number of messages from this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of messages to delete (1-100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply({ ephemeral: true });

        try {
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
            const deletedMessages = await interaction.channel.bulkDelete(fetchedMessages, true);

            if (deletedMessages.size === 0) {
                return interaction.editReply({ content: 'Could not delete any messages. They might be older than 14 days.', ephemeral: true });
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ Successfully deleted **${deletedMessages.size}** message(s).`);

            await interaction.editReply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Purge command error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription('❌ An error occurred while trying to purge messages. I might be missing permissions, or the messages are older than 14 days.');
                
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};