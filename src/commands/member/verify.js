// commands/member/verify.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const VerifiedUser = require('../../database/models/VerifiedUser'); // <-- CORRECTED PATH
const { economy: economyConfig } = require('../../config'); // <-- CORRECTED PATH

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Roblox account and receive your starting balance.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username.')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const robloxUsername = interaction.options.getString('username');
        const discordId = interaction.user.id;

        try {
            const existingUser = await VerifiedUser.findOne({ discordId });
            if (existingUser) {
                return interaction.editReply({ content: `You are already verified as **${existingUser.robloxUsername}**. Please use \`/unverify\` first if you want to switch accounts.` });
            }

            const userSearchResponse = await axios.post('https://users.roblox.com/v1/usernames/users', { usernames: [robloxUsername] });
            const userData = userSearchResponse.data.data[0];

            if (!userData) {
                return interaction.editReply({ content: `Could not find a Roblox user named **${robloxUsername}**. Please check the spelling.` });
            }
            const robloxId = userData.id;

            const userInfoResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
            const { created } = userInfoResponse.data;
            const createdDate = new Date(created).toLocaleDateString();

            const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`);
            const thumbnailUrl = thumbResponse.data.data[0]?.imageUrl;

            await VerifiedUser.create({
                discordId,
                robloxId: robloxId.toString(),
                robloxUsername: userData.name,
                cash: economyConfig.startingCash,
                bank: economyConfig.startingBank,
            });

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Verification Successful')
                .setThumbnail(thumbnailUrl)
                .setURL(`https://www.roblox.com/users/${robloxId}/profile`)
                .setDescription('Your Roblox and Discord accounts are now linked!')
                .addFields(
                    { name: 'Roblox Username', value: `\`${userData.name}\``, inline: true },
                    { name: 'Roblox ID', value: `\`${robloxId}\``, inline: true },
                    { name: 'Account Created', value: createdDate, inline: false },
                    { name: '💰 Starting Cash', value: `$${economyConfig.startingCash.toLocaleString()}`, inline: true },
                    { name: '🏦 Starting Bank', value: `$${economyConfig.startingBank.toLocaleString()}`, inline: true }
                )
                .setFooter({ text: `Verified for ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Verification Error:', error);
            await interaction.editReply({ content: 'An error occurred while trying to verify. The Roblox API might be down or the username is invalid.' });
        }
    },
};