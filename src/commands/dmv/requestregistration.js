// commands/dmv/requestregistration.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestregistration')
        .setDescription("Apply for vehicle registration."),
    async execute(interaction) {
        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });
        if (!userData || userData.license?.status !== 'Approved') {
            return interaction.reply({ content: 'You must have an approved driver\'s license to register a vehicle.', ephemeral: true });
        }
        if (userData.pendingRegistration) {
            return interaction.reply({ content: 'You already have a registration application pending review.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('registrationApplication')
            .setTitle("Vehicle Registration Application");

        const makeInput = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('make').setLabel("Vehicle Make (e.g., Ford)").setStyle(TextInputStyle.Short).setRequired(true));
        const modelInput = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('model').setLabel("Vehicle Model (e.g., Explorer)").setStyle(TextInputStyle.Short).setRequired(true));
        const yearInput = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('year').setLabel("Vehicle Year").setStyle(TextInputStyle.Short).setRequired(true));
        const colorInput = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel("Vehicle Color").setStyle(TextInputStyle.Short).setRequired(true));

        modal.addComponents(makeInput, modelInput, yearInput, colorInput);
        await interaction.showModal(modal);
    },
};