// events/guildMemberAdd.js
const {
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
} = require('discord.js');
const {
    discord: discordConfig,
    dmv: dmvConfig
} = require('../config');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        console.log(`New member joined: ${member.user.tag} (${member.id})`);

        // --- 1. Autorole Logic ---
        if (discordConfig.autoroleId) {
            try {
                const role = member.guild.roles.cache.get(discordConfig.autoroleId);
                if (role) await member.roles.add(role);
                else console.error(`[AutoRole] Error: Role with ID "${discordConfig.autoroleId}" not found.`);
            } catch (error) {
                console.error(`[AutoRole] Error: Could not assign role to ${member.user.tag}.`);
            }
        }

        // --- 2. Welcome Message Logic ---
        if (!discordConfig.welcomeChannelId) return;
        const welcomeChannel = member.guild.channels.cache.get(discordConfig.welcomeChannelId);
        if (!welcomeChannel) return;

        try {
            // This structure is updated to match the JSON payload provided in the test command.
            const textAndImageSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("Thanks for joining River Interactive! We're excited to have you here. Use the buttons below to explore and navigate the server quickly. If you have any questions, feel free to ask — we’re here to help!")
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                    .setURL(member.user.displayAvatarURL({
                        dynamic: true
                    }))
                    .setDescription(member.user.username) // Alt text
                );

            const container = new ContainerBuilder()
                .setAccentColor(0x37373D) // Custom accent color
                // The welcome text is a direct child of the container now
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Welcome, <@${member.user.id}>!**`)
                )
                // The section with the paragraph and image is added next
                .addSectionComponents(textAndImageSection)
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setLabel('Verify').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${discordConfig.verifyChannelId || 'https://example.com'}`),
                        new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${discordConfig.supportChannelId || 'https://example.com'}`),
                        new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(dmvConfig.websiteUrl || 'https://riverinteractive.netlify.app')
                    )
                );


            // Send the message payload with the required flag
            await welcomeChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
            console.log(`[Welcome] Sent component welcome message for ${member.user.tag}.`);

        } catch (error) {
            console.error(`[Welcome] Error: Could not send component welcome message.`, error);
        }
    },
};
