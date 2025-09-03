// commands/dmv/registration.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registration')
        .setDescription("Displays all of your registered vehicles."),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });
        if (!userData || !userData.vehicles || userData.vehicles.length === 0) {
            return interaction.editReply({ content: 'You do not have any vehicles registered.', ephemeral: true });
        }

        const registrationEmbed = new EmbedBuilder()
            .setColor('#1ABC9C')
            .setAuthor({ name: `${config.dmv.serverName.toUpperCase()} DEPARTMENT OF MOTOR VEHICLES` })
            .setTitle(`${userData.robloxUsername}'s Registered Vehicles`)
            .setDescription('Below is a list of all vehicles registered under your name.');

        userData.vehicles.forEach(vehicle => {
            registrationEmbed.addFields({
                name: `PLATE: ${vehicle.plate}`,
                value: `**Vehicle:** ${vehicle.year} ${vehicle.make} ${vehicle.model}\n**Color:** ${vehicle.color}\n**Expires:** ${vehicle.expiresDate.toLocaleDateString()}`,
                inline: false,
            });
        });

        await interaction.editReply({ embeds: [registrationEmbed] });
    },
};