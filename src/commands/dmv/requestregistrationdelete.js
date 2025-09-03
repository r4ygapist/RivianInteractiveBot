// commands/dmv/requestregistrationdelete.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestregistrationdelete')
        .setDescription("Request to delete one of your vehicle registrations."),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });
        if (!userData || !userData.vehicles || userData.vehicles.length === 0) {
            return interaction.editReply('You do not have any vehicles registered to delete.');
        }

        const options = userData.vehicles.map(vehicle => ({
            label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            description: `Plate: ${vehicle.plate}`,
            value: vehicle.plate, // Use the unique plate as the value
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('delete_registration_select')
            .setPlaceholder('Select a vehicle to delete')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: 'Please select the vehicle registration you wish to delete from the list below.',
            components: [row],
            ephemeral: true,
        });
    },
};