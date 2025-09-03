// commands/dmv/requestlicense.js
const { SlashCommandBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestlicense')
        .setDescription("Submits your official ID to apply for a driver's license."),
    async execute(interaction) {
        // The interaction is now handled by the 'interactionCreate.js' event handler
        // This command file just needs to trigger the event.
        // We can rename the customId in the modal submit handler to match.
        // For now, let's keep the modal for simplicity of what you've built.
        
        // Let's create a simplified modal that just confirms their intent.
        // Actually, a better approach is to not use a modal at all.

        await interaction.deferReply({ ephemeral: true });

        const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });

        if (!userData) {
            return interaction.editReply('You must be verified to apply. Please use `/verify`.');
        }
        if (!userData.identity) {
            return interaction.editReply('You must create an ID before applying for a license. Please use `/createid`.');
        }
        if (userData.license && userData.license.status === 'Pending') {
             return interaction.editReply('You already have a license application pending review.');
        }
         if (userData.license && userData.license.status === 'Approved') {
             return interaction.editReply('Your license has already been approved.');
        }

        // This is where we would trigger the 'licenseApplication' part of your interactionCreate.js
        // We can simulate this by re-creating the review logic here, which is cleaner.
        
        const reviewChannel = await interaction.guild.channels.fetch(require('../../config').dmv.reviewChannelId);
        if (!reviewChannel) {
            return interaction.editReply('Error: DMV review channel not found. Please contact an admin.');
        }

        userData.license.status = 'Pending';
        userData.license.submittedAt = new Date();
        await userData.save();

        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const reviewEmbed = new EmbedBuilder()
            .setTitle("New Driver's License Application")
            .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
            .setColor('#E67E22')
            .addFields(
                { name: 'Applicant', value: `<@${interaction.user.id}>` },
                { name: 'Full Name', value: userData.identity.fullName, inline: true },
                { name: 'Age', value: userData.identity.age.toString(), inline: true }
            )
            .setFooter({ text: `Roblox: ${userData.robloxUsername}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dmv_license_accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dmv_license_deny_${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
        await interaction.editReply('Your license application has been successfully submitted for review.');
    },
};