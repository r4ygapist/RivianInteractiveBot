// commands/dmv/renewlicense.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('renewlicense')
        .setDescription("Renew your driver's license and update your information."),
    async execute(interaction) {
        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });

        if (!userData || !userData.identity) {
            return interaction.reply({ content: 'You must have an approved ID and license to renew. Please use `/createid`.', ephemeral: true });
        }
        if (userData.license?.status !== 'Approved') {
            return interaction.reply({ content: 'Your license is not currently approved. You cannot renew it.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('renewLicenseModal')
            .setTitle("License Renewal and Information Update");

        // Pre-fill the form with the user's current data from the database
        const fullNameInput = new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('fullName').setLabel("Full Name").setStyle(TextInputStyle.Short).setRequired(true).setValue(userData.identity.fullName)
        );
        const addressInput = new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('address').setLabel("Street Address").setStyle(TextInputStyle.Short).setRequired(true).setValue(userData.identity.address)
        );
        const hairColorInput = new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('hairColor').setLabel("Hair Color").setStyle(TextInputStyle.Short).setRequired(true).setValue(userData.identity.hairColor)
        );

        modal.addComponents(fullNameInput, addressInput, hairColorInput);
        await interaction.showModal(modal);
    },
};