const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require('discord.js');
const config = require('../config');
const VerifiedUser = require('../database/models/VerifiedUser');
const ModerationRecord = require('../database/models/ModerationRecord');
const TicketSettings = require('../database/models/TicketSettings');
const { logAction } = require('../commands/admin/robloxmoderation');
const axios = require('axios');

// --- Helper Functions ---
function generateLicensePlate() {
    const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const number = '0123456789';
    const randomChar = (charset) => charset.charAt(Math.floor(Math.random() * charset.length));
    return `${randomChar(letter)}${randomChar(number)}${randomChar(number)}-${randomChar(letter)}${randomChar(letter)}${randomChar(letter)}`;
}

// --- Main Handler ---
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // --- Modal Submission Handler ---
        if (interaction.isModalSubmit()) {
            try {
                // DMV MODALS
                if (interaction.customId === 'createIdModalPart1') {
                    await interaction.deferUpdate();
                    const identityData = { fullName: interaction.fields.getTextInputValue('fullName'), address: interaction.fields.getTextInputValue('address'), dob: interaction.fields.getTextInputValue('dob'), age: parseInt(interaction.fields.getTextInputValue('age'), 10), race: interaction.fields.getTextInputValue('race'), };
                    await VerifiedUser.findOneAndUpdate({ discordId: interaction.user.id }, { $set: { identity: identityData } });
                    const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('Application Part 1 Complete').setDescription('Please click the button below to continue to the final part of your application.');
                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('startIdPart2').setLabel('Continue to Part 2').setStyle(ButtonStyle.Success));
                    await interaction.editReply({ embeds: [embed], components: [row] });
                }

                if (interaction.customId === 'createIdModalPart2') {
                    await interaction.deferUpdate();
                    const identityUpdate = { 'identity.hairColor': interaction.fields.getTextInputValue('hairColor'), 'identity.eyeColor': interaction.fields.getTextInputValue('eyeColor'), 'identity.height': interaction.fields.getTextInputValue('height'), 'identity.weight': interaction.fields.getTextInputValue('weight'), };
                    await VerifiedUser.findOneAndUpdate({ discordId: interaction.user.id }, { $set: identityUpdate });
                    const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ ID Application Complete!').setDescription('Your official ID has been created. You can now view it with `/id` and apply for a license.');
                    await interaction.editReply({ embeds: [embed], components: [] });
                }
                
                if (interaction.customId === 'renewLicenseModal') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const newExpiresDate = new Date();
                    newExpiresDate.setMonth(newExpiresDate.getMonth() + 3);
                    const updatedData = { 'identity.fullName': interaction.fields.getTextInputValue('fullName'), 'identity.address': interaction.fields.getTextInputValue('address'), 'identity.hairColor': interaction.fields.getTextInputValue('hairColor'), 'license.expiresDate': newExpiresDate, };
                    const updatedUser = await VerifiedUser.findOneAndUpdate({ discordId: interaction.user.id }, { $set: updatedData }, { new: true });
                    const { data: thumbData } = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${updatedUser.robloxId}&size=150x150&format=Png&isCircular=false`);
                    const renewalEmbed = new EmbedBuilder().setAuthor({ name: config.dmv.serverName }).setTitle("Updated Driver's License").setColor('#2ECC71').setThumbnail(thumbData.data[0]?.imageUrl).setDescription("Your license has been successfully renewed...").addFields(
                        { name: 'Name', value: updatedUser.identity.fullName, inline: true }, { name: 'Address', value: updatedUser.identity.address, inline: true }, { name: 'DOB', value: updatedUser.identity.dob, inline: true },
                        { name: 'Age', value: updatedUser.identity.age.toString(), inline: true }, { name: 'Race', value: updatedUser.identity.race, inline: true }, { name: 'Hair Color', value: updatedUser.identity.hairColor, inline: true },
                        { name: 'Issued', value: updatedUser.license.issuedDate.toLocaleDateString(), inline: true }, { name: 'Expires', value: newExpiresDate.toLocaleDateString(), inline: true }, { name: 'Class', value: updatedUser.license.class, inline: true }
                    );
                    await interaction.user.send({ content: `-- ${config.dmv.serverName.toUpperCase()} UPDATED MANDATORY LICENSE --`, embeds: [renewalEmbed] });
                    return interaction.editReply({ content: 'Your license has been successfully renewed! A new copy has been sent to your DMs.'});
                }

                if (interaction.customId === 'registrationApplication') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const reviewChannel = await interaction.guild.channels.fetch(config.dmv.reviewChannelId);
                    const userData = await VerifiedUser.findOne({ discordId: interaction.user.id });
                    if (!reviewChannel || !userData) return interaction.editReply('An internal error occurred.');
                    const pendingData = { make: interaction.fields.getTextInputValue('make'), model: interaction.fields.getTextInputValue('model'), year: parseInt(interaction.fields.getTextInputValue('year'), 10), color: interaction.fields.getTextInputValue('color'), submittedAt: new Date(), };
                    userData.pendingRegistration = pendingData;
                    await userData.save();
                    const reviewEmbed = new EmbedBuilder().setTitle('New Vehicle Registration Application').setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})` }).setColor('#3498DB').addFields({ name: 'Applicant', value: `<@${interaction.user.id}>` }, { name: 'Vehicle', value: `${pendingData.year} ${pendingData.make} ${pendingData.model}` }).setFooter({ text: `Roblox: ${userData.robloxUsername}` });
                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`dmv_reg_accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`dmv_reg_deny_${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger));
                    await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
                    return interaction.editReply('Your registration application has been submitted for review.');
                }
            } catch (error) {
                console.error("Modal submission error:", error);
                const errorMessage = { content: 'There was an error processing your application.', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errorMessage).catch(console.error);
                else await interaction.reply(errorMessage).catch(console.error);
            }
        }

        // --- Button Interaction Handler ---
        if (interaction.isButton()) {
            try {
                // --- SUPPORT TICKET SYSTEM ---
                if (interaction.customId.startsWith('ticket_create_')) {
                    const settings = await TicketSettings.findOne({ guildId: interaction.guild.id });
                    if (!settings || !settings.ticketCategoryId) { return interaction.reply({ content: 'The ticket system is not configured. Please contact an administrator.', ephemeral: true }); }
                    const ticketType = interaction.customId.split('_')[2];
                    await interaction.deferReply({ ephemeral: true });
                    settings.ticketCounter += 1;
                    await settings.save();
                    const ticketId = settings.ticketCounter.toString().padStart(4, '0');
                    const channel = await interaction.guild.channels.create({ name: `${ticketType}-ticket-${ticketId}`, type: ChannelType.GuildText, parent: settings.ticketCategoryId, permissionOverwrites: [ { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }, ...config.supportSystem.staffRoleIds.map(roleId => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages], })), ], });
                    const mainContent = [`# Support Ticket - ${ticketId}`, `Thank you for creating a ticket, ${interaction.user}. A staff member will be with you soon.`, ``, `_${config.supportSystem.staffRoleIds.map(id => `<@&${id}>`).join(' ')} ${ticketType.toUpperCase()} TKT_`].join('\n');
                    const thumbnail = new ThumbnailBuilder().setURL(interaction.guild.iconURL({ dynamic: true }) || 'https://i.imgur.com/83hJ1S4.png');
                    const mainText = new TextDisplayBuilder().setContent(mainContent);
                    const mainSection = new SectionBuilder().addTextDisplayComponents(mainText).setThumbnailAccessory(thumbnail);
                    const buttons = new ActionRowBuilder().addComponents( new ButtonBuilder().setCustomId(`ticket_delete_${channel.id}`).setLabel('Delete Ticket').setStyle(ButtonStyle.Danger).setEmoji('❌'), new ButtonBuilder().setCustomId(`ticket_transcript_${channel.id}`).setLabel('Save Transcript').setStyle(ButtonStyle.Primary) );
                    const container = new ContainerBuilder().addSectionComponents(mainSection).addSeparatorComponents(new SeparatorBuilder().setSpacing(2)).addActionRowComponents(buttons);
                    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    return interaction.editReply(`✅ Your ticket has been created: ${channel}`);
                }
                if (interaction.customId.startsWith('ticket_delete_')) {
                    await interaction.reply({ content: 'Deleting this ticket in 5 seconds...', ephemeral: true });
                    setTimeout(() => interaction.channel.delete('Ticket closed by user.').catch(console.error), 5000);
                }
                if (interaction.customId.startsWith('ticket_transcript_')) {
                    await interaction.deferReply({ ephemeral: true });
                    const channel = interaction.channel;
                    const settings = await TicketSettings.findOne({ guildId: interaction.guild.id });
                    if (!settings || !settings.transcriptChannelId) return interaction.editReply('Transcript channel is not configured.');
                    let transcript = `Transcript for ticket #${channel.name} created by ${interaction.user.tag}\n\n`;
                    const messages = await channel.messages.fetch({ limit: 100 });
                    messages.reverse().forEach(msg => { transcript += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`; });
                    const attachment = new AttachmentBuilder(Buffer.from(transcript), { name: `${channel.name}-transcript.txt` });
                    const transcriptChannel = await interaction.guild.channels.fetch(settings.transcriptChannelId);
                    await transcriptChannel.send({ content: `Transcript for ticket #${channel.name}`, files: [attachment] });
                    await interaction.user.send({ content: 'Here is the transcript for your recent ticket:', files: [attachment] }).catch(() => {});
                    return interaction.editReply('✅ Transcript saved and sent.');
                }

                // --- MODERATION SYSTEM ---
                if (interaction.customId.startsWith('mod_history_')) {
                    const robloxId = interaction.customId.split('_')[2];
                    const verifiedUser = await VerifiedUser.findOne({ robloxId: robloxId });
                    if (!verifiedUser || interaction.user.id !== verifiedUser.discordId) { return interaction.reply({ content: 'You can only view your own case history.', ephemeral: true }); }
                    await interaction.deferReply({ ephemeral: true });
                    const record = await ModerationRecord.findOne({ robloxId });
                    if (!record || record.warnings.length === 0) { return interaction.editReply({ content: 'You have no warnings on record.' }); }
                    const warningsEmbed = new EmbedBuilder().setColor(0x2C3E50).setTitle(`Your Warning History for ${record.robloxUsername}`).setThumbnail(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`);
                    record.warnings.forEach(w => { warningsEmbed.addFields({ name: `Warning ID: ${w.warningId.slice(0,8)}...`, value: `**Reason:** ${w.reason}\n**Moderator:** ${w.moderatorTag}\n**Date:** <t:${Math.floor(w.timestamp.getTime() / 1000)}:f>` }); });
                    return await interaction.editReply({ embeds: [warningsEmbed] });
                }
                
                // --- DMV SYSTEM ---
                if (interaction.customId === 'startIdPart1') {
                    const modal = new ModalBuilder().setCustomId('createIdModalPart1').setTitle("ID Application (Part 1 of 2)");
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fullName').setLabel("Full Name").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('address').setLabel("Street Address").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dob').setLabel("Date of Birth (MM/DD/YYYY)").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel("Age").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('race').setLabel("Race/Ethnicity").setStyle(TextInputStyle.Short).setRequired(true)));
                    return await interaction.showModal(modal);
                }
                if (interaction.customId === 'startIdPart2') {
                    const modal = new ModalBuilder().setCustomId('createIdModalPart2').setTitle("ID Application (Part 2 of 2)");
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hairColor').setLabel("Hair Color").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eyeColor').setLabel("Eye Color").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('height').setLabel("Height (e.g., 5'11\")").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weight').setLabel("Weight (e.g., 180 lbs)").setStyle(TextInputStyle.Short).setRequired(true)));
                    return await interaction.showModal(modal);
                }
                const [type, action, status, targetId] = interaction.customId.split('_');
                if (type === 'dmv') {
                    await interaction.deferReply({ ephemeral: true });
                    const targetMember = await interaction.guild.members.fetch(targetId);
                    const userData = await VerifiedUser.findOne({ discordId: targetId });
                    if (!targetMember || !userData) return interaction.editReply('Could not find user data.');
                    if (action === 'license') {
                        if (status === 'accept') {
                            const issuedDate = new Date(); const expiresDate = new Date(); expiresDate.setMonth(expiresDate.getMonth() + 3); userData.license = { status: 'Approved', issuedDate, expiresDate, class: userData.license.class }; await userData.save();
                            const licensedRole = await interaction.guild.roles.fetch(config.dmv.licensedRoleId).catch(() => null);
                            if (licensedRole) await targetMember.roles.add(licensedRole);
                            const { data: thumbData } = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.robloxId}&size=150x150&format=Png&isCircular=false`);
                            const approvalEmbed = new EmbedBuilder().setAuthor({ name: config.dmv.serverName }).setTitle("Driver's License Approval Notice").setColor('#2ECC71').setThumbnail(thumbData.data[0]?.imageUrl).setDescription("This notice confirms the approval of your driver's license application...").addFields( { name: 'Name', value: userData.identity.fullName, inline: true }, { name: 'Address', value: userData.identity.address, inline: true }, { name: 'DOB', value: userData.identity.dob, inline: true }, { name: 'Age', value: userData.identity.age.toString(), inline: true }, { name: 'Race', value: userData.identity.race, inline: true }, { name: 'Hair Color', value: userData.identity.hairColor, inline: true }, { name: 'Issued', value: issuedDate.toLocaleDateString(), inline: true }, { name: 'Expires', value: expiresDate.toLocaleDateString(), inline: true }, { name: 'Class', value: userData.license.class, inline: true } );
                            await targetMember.send({ content: `-- ${config.dmv.serverName.toUpperCase()} MANDATORY LICENSE --`, embeds: [approvalEmbed] });
                            await interaction.message.edit({ content: `✅ Application for ${targetMember.user.tag} approved by ${interaction.user.tag}.`, embeds: [], components: [] });
                            return interaction.editReply({ content: 'Approval processed.' });
                        } else if (status === 'deny') {
                            userData.license.status = 'Denied'; await userData.save();
                            await targetMember.send(`Your driver's license application has been denied by ${interaction.user.tag}. You may re-apply in 2 hours.`);
                            await interaction.message.edit({ content: `❌ Application for ${targetMember.user.tag} denied by ${interaction.user.tag}.`, embeds: [], components: [] });
                            return interaction.editReply({ content: 'Denial processed.' });
                        }
                    }
                    if (action === 'reg') {
                        if (status === 'accept') {
                            if (!userData.pendingRegistration) return interaction.editReply('Could not find a pending registration for this user.');
                            const appData = userData.pendingRegistration; const plate = generateLicensePlate(); const issuedDate = new Date(); const expiresDate = new Date(); expiresDate.setFullYear(expiresDate.getFullYear() + 1);
                            userData.vehicles.push({ ...appData.toObject(), plate, issuedDate, expiresDate }); userData.pendingRegistration = undefined; await userData.save();
                            const approvalEmbed = new EmbedBuilder().setAuthor({ name: config.dmv.serverName }).setTitle("Vehicle Registration Approval Notice").setColor('#2ECC71').addFields({ name: 'Plate Number', value: `**${plate}**` }, { name: 'Owner', value: userData.identity.fullName }, { name: 'Vehicle', value: `${appData.year} ${appData.make} ${appData.model}` });
                            await targetMember.send({ embeds: [approvalEmbed] });
                            await interaction.message.edit({ content: `✅ Registration for ${targetMember.user.tag} approved by ${interaction.user.tag}.`, embeds: [], components: [] });
                            return interaction.editReply({ content: 'Approval processed.' });
                        } else if (status === 'deny') {
                            userData.pendingRegistration = undefined; await userData.save();
                            await targetMember.send(`Your vehicle registration has been denied by ${interaction.user.tag}.`);
                            await interaction.message.edit({ content: `❌ Registration for ${targetMember.user.tag} denied by ${interaction.user.tag}.`, embeds: [], components: [] });
                            return interaction.editReply({ content: 'Denial processed.' });
                        }
                    }
                }
            } catch (error) {
                console.error("Button interaction error:", error);
                const errorMessage = { content: 'An error occurred while processing this action.', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errorMessage).catch(console.error);
                else await interaction.reply(errorMessage).catch(console.error);
            }
        }
        
        // --- String Select Menu Handler ---
        if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId === 'delete_registration_select') {
                    await interaction.deferUpdate();
                    const plateToDelete = interaction.values[0];
                    await VerifiedUser.findOneAndUpdate({ discordId: interaction.user.id }, { $pull: { vehicles: { plate: plateToDelete } } });
                    await interaction.editReply({ content: `Successfully deleted the registration for vehicle with plate **${plateToDelete}**.`, components: [] });
                }

                if (interaction.customId.startsWith('remove_warning_')) {
                    await interaction.deferUpdate();
                    const robloxId = interaction.customId.split('_')[2];
                    const warningIdToRemove = interaction.values[0];
                    const record = await ModerationRecord.findOne({ robloxId });
                    if (!record) return interaction.editReply({ content: 'Could not find the moderation record for this user.', components: [] });
                    const warningToRemove = record.warnings.find(w => w.warningId === warningIdToRemove);
                    if (!warningToRemove) return interaction.editReply({ content: 'That warning could not be found or was already removed.', components: [] });
                    record.warnings = record.warnings.filter(w => w.warningId !== warningIdToRemove);
                    await record.save();
                    const robloxUser = { id: record.robloxId, name: record.robloxUsername };
                    await logAction(interaction, { action: 'Remove Warning', robloxUser, reason: `Removed warning for: "${warningToRemove.reason}"`, warningId: warningToRemove.warningId });
                    await interaction.editReply({ content: `✅ Successfully removed warning \`${warningIdToRemove.slice(0,8)}...\` from **${record.robloxUsername}**.`, components: [] });
                }
            } catch (error) {
                console.error("Select menu interaction error:", error);
            }
        }

        // --- Slash Command Handler ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            
            if (command.permissionGroup) {
                const isOwner = interaction.guild.ownerId === interaction.user.id;
                if (!isOwner) {
                    const requiredRoles = config.permissions[command.permissionGroup];
                    if (!requiredRoles || !interaction.member.roles.cache.some(role => requiredRoles.includes(role.id))) {
                        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                    }
                }
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing /${interaction.commandName}:`, error);
                const errorMessage = { content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral };
                // [FIX] This robustly handles the "Interaction has already been acknowledged" crash.
                if (error.code === 10062) { // Unknown Interaction
                    console.warn(`[Interaction Handler] Could not reply to an expired interaction for command /${interaction.commandName}.`);
                    return;
                }
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage).catch(console.error);
                } else {
                    await interaction.reply(errorMessage).catch(console.error);
                }
            }
        }
    },
};