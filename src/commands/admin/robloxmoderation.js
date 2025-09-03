const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    // --- New imports for Display Components ---
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const axios = require('axios');
const config = require('../../config');
const ModerationAction = require('../../database/models/ModerationAction');
const ModerationRecord = require('../../database/models/ModerationRecord');
const VerifiedUser = require('../../database/models/VerifiedUser');


// --- Helper Functions ---

/**
 * Fetches Roblox user data from a username, including the thumbnail.
 */
async function getRobloxUser(username) {
    try {
        const userSearchResponse = await axios.post('https://users.roblox.com/v1/usernames/users', { usernames: [username], excludeBannedUsers: false });
        const userData = userSearchResponse.data.data[0];
        if (!userData) return null;

        // [FIX] Fetch the thumbnail URL from the correct, reliable endpoint.
        const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png&isCircular=false`);
        userData.thumbnailUrl = thumbResponse.data.data[0]?.imageUrl;

        return userData;
    } catch (error) {
        console.error("Error fetching Roblox user:", error);
        return null;
    }
}

/**
 * Logs a moderation action using the new Display Component format.
 */
async function logAction(interaction, logData) {
    const { action, robloxUser, reason, duration, warningId, appealable = true } = logData;
    const logChannelId = config.moderation.logChannelId;
    if (!logChannelId) return;

    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;

    const moderatorUser = await VerifiedUser.findOne({ discordId: interaction.user.id });
    const moderatorRobloxUsername = moderatorUser ? `[${moderatorUser.robloxUsername}](https://www.roblox.com/users/${moderatorUser.robloxId}/profile)` : 'N/A';

    // --- Build Content Strings for the New Layout ---
    const mainContent = [
        `# ⚠️ Player Moderation Alert`,
        `_An action has been taken against [${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)._`,
        `## Action Details`,
        `**Type:** \`${action}\``,
        `**Reason:** ${reason}`,
        duration ? `**Duration:** \`${duration}\`` : '',
        warningId ? `**Warning ID Removed:** \`${warningId.slice(0, 8)}...\`` : '',
        `**Appealable:** ${appealable ? '✅ Yes' : '❌ No'}`
    ].filter(Boolean).join('\n');

    const timestamp = Math.floor(Date.now() / 1000);
    const moderatorContent = `### Moderator Information\n**Discord:** ${interaction.user}\n**Roblox:** ${moderatorRobloxUsername}\n\n_Action taken: <t:${timestamp}:F>_`;

    // --- Construct the Display Component ---
    const thumbnail = new ThumbnailBuilder().setURL(robloxUser.thumbnailUrl || interaction.guild.iconURL());
    
    const mainText = new TextDisplayBuilder().setContent(mainContent);
    const mainSection = new SectionBuilder().addTextDisplayComponents(mainText).setThumbnailAccessory(thumbnail);

    const moderatorText = new TextDisplayBuilder().setContent(moderatorContent);

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mod_history_${robloxUser.id}`)
            .setLabel('View My Case History')
            .setStyle(ButtonStyle.Secondary)
    );

    const container = new ContainerBuilder()
        .setAccentColor(15105570) // A distinct red color
        .addSectionComponents(mainSection)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(2))
        .addTextDisplayComponents(moderatorText)
        .addActionRowComponents(actionRow);

    await logChannel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
    });
}

/**
 * Queues an action to be picked up by the Roblox game server.
 */
async function queueAction(actionData) {
    await ModerationAction.create(actionData);
}

// --- Command ---
module.exports = {
    data: new SlashCommandBuilder()
        .setName('robloxmoderation')
        .setDescription('Handles all in-game moderation actions.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        // Subcommands remain the same
        .addSubcommand(sub => sub.setName('kick').setDescription('Kicks a player from the game server.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to kick.').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('The reason for the kick.').setRequired(true)))
        .addSubcommand(sub => sub.setName('ban').setDescription('Bans a player from the game.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to ban.').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('The reason for the ban.').setRequired(true)).addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 7d, 12h, 30m) or "permanent".').setRequired(true)))
        .addSubcommand(sub => sub.setName('warn').setDescription('Gives a player an official warning.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to warn.').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('The reason for the warning.').setRequired(true)))
        .addSubcommand(sub => sub.setName('kickwarn').setDescription('Warns and then kicks a player from the game.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to kick and warn.').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('The reason for the action.').setRequired(true)))
        .addSubcommand(sub => sub.setName('unban').setDescription('Unbans a player from the game.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to unban.').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('The reason for the unban.').setRequired(true)))
        .addSubcommand(sub => sub.setName('warnings').setDescription("Views a player's warning history.").addStringOption(opt => opt.setName('username').setDescription('The Roblox username to view.').setRequired(true)))
        .addSubcommand(sub => sub.setName('removewarning').setDescription('Removes a specific warning from a player.').addStringOption(opt => opt.setName('username').setDescription('The Roblox username to modify.').setRequired(true))),
            
    async execute(interaction) {
        // [FIX] Defer non-ephemerally for the warnings command so the reply can be public
        if (interaction.options.getSubcommand() === 'warnings') {
            await interaction.deferReply();
        } else {
            await interaction.deferReply({ ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const username = interaction.options.getString('username');
        const reason = interaction.options.getString('reason');
        
        const robloxUser = await getRobloxUser(username);
        if (!robloxUser) {
            return interaction.editReply(`❌ Could not find a Roblox user named **${username}**.`);
        }
        
        const record = await ModerationRecord.findOneAndUpdate(
            { robloxId: robloxUser.id.toString() },
            { $setOnInsert: { robloxId: robloxUser.id.toString(), robloxUsername: robloxUser.name } },
            { upsert: true, new: true }
        );

        const actionData = {
            targetRobloxId: robloxUser.id.toString(),
            targetRobloxUsername: robloxUser.name,
            reason: reason,
            moderatorDiscordId: interaction.user.id,
            moderatorDiscordTag: interaction.user.tag,
        };

        try {
            switch(subcommand) {
                // Cases for kick, ban, warn, kickwarn, and unban are unchanged
                case 'kick':
                    await queueAction({ ...actionData, actionType: 'kick' });
                    await logAction(interaction, { action: 'Kick', robloxUser, reason });
                    await interaction.editReply(`✅ Queued an in-game kick for **${robloxUser.name}**.`);
                    break;
                case 'ban':
                    const duration = interaction.options.getString('duration');
                    const isPermanent = duration.toLowerCase() === 'permanent';
                    record.banStatus = { isBanned: true, reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, duration, isPermanent, timestamp: new Date() };
                    await record.save();
                    await queueAction({ ...actionData, actionType: 'ban', duration, isPermanent });
                    await logAction(interaction, { action: 'Ban', robloxUser, reason, duration });
                    await interaction.editReply(`✅ Queued an in-game ban for **${robloxUser.name}**.`);
                    break;
                case 'warn':
                    const warning = { reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag };
                    record.warnings.push(warning);
                    await record.save();
                    await queueAction({ ...actionData, actionType: 'warn' });
                    await logAction(interaction, { action: 'Warn', robloxUser, reason });
                    await interaction.editReply(`✅ Successfully warned **${robloxUser.name}**. They now have ${record.warnings.length} warning(s).`);
                    break;
                case 'kickwarn':
                    const kickwarn = { reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag };
                    record.warnings.push(kickwarn);
                    await record.save();
                    await queueAction({ ...actionData, actionType: 'warn' });
                    await queueAction({ ...actionData, actionType: 'kick' });
                    await logAction(interaction, { action: 'Warn', robloxUser, reason });
                    await logAction(interaction, { action: 'Kick', robloxUser, reason: `Following warning: ${reason}` });
                    await interaction.editReply(`✅ Warned and queued a kick for **${robloxUser.name}**. They now have ${record.warnings.length} warning(s).`);
                    break;
                case 'unban':
                    if (!record.banStatus.isBanned) return interaction.editReply(`**${robloxUser.name}** is not currently banned.`);
                    record.banStatus = { isBanned: false };
                    await record.save();
                    await queueAction({ ...actionData, actionType: 'unban' });
                    await logAction(interaction, { action: 'Unban', robloxUser, reason });
                    await interaction.editReply(`✅ **${robloxUser.name}** has been unbanned.`);
                    break;
                
                case 'warnings':
                    if (record.warnings.length === 0) {
                        return interaction.editReply(`**${robloxUser.name}** has no warnings on record.`);
                    }
                    const warningsEmbed = new EmbedBuilder()
                        .setColor(0x2C3E50)
                        .setTitle(`Warning History for ${robloxUser.name}`)
                        .setThumbnail(robloxUser.thumbnailUrl);
                    
                    record.warnings.forEach(w => {
                        warningsEmbed.addFields({
                            name: `Warning ID: ${w.warningId.slice(0, 8)}...`,
                            value: `**Reason:** ${w.reason}\n**Moderator:** ${w.moderatorTag}\n**Date:** <t:${Math.floor(w.timestamp.getTime() / 1000)}:f>`
                        });
                    });
                    
                    await interaction.editReply({ embeds: [warningsEmbed] });
                    break;

                case 'removewarning':
                    // This logic remains unchanged
                    if (record.warnings.length === 0) return interaction.editReply(`**${robloxUser.name}** has no warnings to remove.`);
                    const options = record.warnings.map(w => ({ label: `ID: ${w.warningId.slice(0, 8)}...`, description: w.reason.slice(0, 100), value: w.warningId, }));
                    const selectMenu = new StringSelectMenuBuilder().setCustomId(`remove_warning_${robloxUser.id}`).setPlaceholder('Select a warning to remove').addOptions(options);
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    await interaction.editReply({ content: `Please select the warning you wish to remove for **${robloxUser.name}**.`, components: [row], ephemeral: true, });
                    break;
            }
        } catch (error) {
            console.error(`Error executing /robloxmoderation ${subcommand}:`, error);
            // Check if the interaction has already been handled to avoid a crash
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An unexpected error occurred.', ephemeral: true });
            } else {
                await interaction.followUp({ content: '❌ An unexpected error occurred.', ephemeral: true });
            }
        }
    },
    logAction
};

