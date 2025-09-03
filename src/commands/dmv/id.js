// commands/dmv/id.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VerifiedUser = require('../../database/models/VerifiedUser');
const axios = require('axios');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id')
        .setDescription("Display your official identification card.")
        .addUserOption(option => option.setName('user').setDescription('View another user\'s ID (Admin only).')),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isSelf = targetUser.id === interaction.user.id;

        // Permission check for viewing others' IDs
        if (!isSelf && !interaction.member.roles.cache.some(role => config.permissions.admin.includes(role.id))) {
            return interaction.editReply({ content: 'You only have permission to view your own ID.', ephemeral: true });
        }

        const userData = await VerifiedUser.findOne({ discordId: targetUser.id });
        if (!userData || !userData.identity) {
            const content = isSelf ? 'You have not created an ID yet. Please use `/createid`.' : `${targetUser.tag} has not created an ID.`;
            return interaction.editReply({ content, ephemeral: true });
        }

        const { identity, license } = userData;

        const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.robloxId}&size=150x150&format=Png&isCircular=false`);
        const thumbnailUrl = thumbResponse.data.data[0]?.imageUrl;

        const idEmbed = new EmbedBuilder()
            .setColor('#2C3E50')
            .setAuthor({ name: `${config.dmv.serverName.toUpperCase()} IDENTIFICATION CARD` })
            .setThumbnail(thumbnailUrl)
            .addFields(
                { name: 'Full Name', value: identity.fullName, inline: true },
                { name: 'Address', value: identity.address, inline: true },
                { name: 'Date of Birth', value: identity.dob, inline: true },
                { name: 'Age', value: identity.age.toString(), inline: true },
                { name: 'Race', value: identity.race, inline: true },
                { name: 'Hair Color', value: identity.hairColor, inline: true },
                { name: 'Eye Color', value: identity.eyeColor, inline: true },
                { name: 'Height', value: identity.height, inline: true },
                { name: 'Weight', value: identity.weight, inline: true },
                { name: 'License Status', value: license.status, inline: true },
                { name: 'License Class', value: license.class || 'N/A', inline: true },
                { name: 'Expires', value: license.expiresDate ? license.expiresDate.toLocaleDateString() : 'N/A', inline: true }
            )
            .setFooter({ text: `Roblox: ${userData.robloxUsername} | Discord: ${targetUser.tag}` });

        await interaction.editReply({ embeds: [idEmbed] });
    },
};