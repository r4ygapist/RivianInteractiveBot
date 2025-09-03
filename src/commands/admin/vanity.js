const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const VanitySettings = require('../../database/models/VanitySettings');

// Helper function to find or create a settings document
const getSettings = async (guildId) => {
    return await VanitySettings.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vanity')
        .setDescription('Manages the vanity role reward system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // /vanity set
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Sets the vanity string to monitor in user statuses.')
            .addStringOption(opt => opt.setName('substring').setDescription('The text to look for (e.g., .gg/yourserver).').setRequired(true)))
        // /vanity role add
        .addSubcommand(sub => sub
            .setName('role')
            .setDescription('Manages reward roles for the vanity system.')
            .addStringOption(opt => opt.setName('action').setDescription('Choose to add or remove a role.').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
            .addRoleOption(opt => opt.setName('role').setDescription('The role to add or remove.').setRequired(true)))
        // /vanity role list
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Lists all current vanity reward roles.'))
        // /vanity message
        .addSubcommand(sub => sub
            .setName('message')
            .setDescription('Sets the thank you message for users who add the vanity.')
            .addStringOption(opt => opt.setName('message').setDescription('The message to send. Use {user} for mention.').setRequired(true)))
        // /vanity award_channel
        .addSubcommand(sub => sub
            .setName('award_channel')
            .setDescription('Sets the channel where award messages are sent.')
            .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send messages to.').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const settings = await getSettings(interaction.guild.id);
        
        await interaction.deferReply({ ephemeral: true });

        switch (subcommand) {
            case 'set': {
                const substring = interaction.options.getString('substring');
                settings.vanityString = substring;
                await settings.save();
                return interaction.editReply(`✅ Vanity string has been set to: \`${substring}\``);
            }
            
            case 'role': {
                const action = interaction.options.getString('action');
                const role = interaction.options.getRole('role');
                
                if (action === 'add') {
                    if (settings.rewardRoles.includes(role.id)) {
                        return interaction.editReply(`⚠️ That role is already a vanity reward.`);
                    }
                    settings.rewardRoles.push(role.id);
                    await settings.save();
                    return interaction.editReply(`✅ ${role} has been **added** as a vanity reward.`);
                }
                
                if (action === 'remove') {
                    if (!settings.rewardRoles.includes(role.id)) {
                        return interaction.editReply(`⚠️ That role is not a vanity reward.`);
                    }
                    settings.rewardRoles = settings.rewardRoles.filter(id => id !== role.id);
                    await settings.save();
                    return interaction.editReply(`✅ ${role} has been **removed** as a vanity reward.`);
                }
                break;
            }

            case 'list': {
                if (settings.rewardRoles.length === 0) {
                    return interaction.editReply('There are no vanity reward roles configured.');
                }
                const roleMentions = settings.rewardRoles.map(id => `<@&${id}>`).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle('Vanity Reward Roles')
                    .setDescription(roleMentions)
                    .setColor('#2C3E50');
                return interaction.editReply({ embeds: [embed] });
            }

            case 'message': {
                const message = interaction.options.getString('message');
                settings.awardMessage = message;
                await settings.save();
                return interaction.editReply(`✅ Award message has been set to:\n>>> ${message}`);
            }

            case 'award_channel': {
                const channel = interaction.options.getChannel('channel');
                if (!channel.isTextBased()) {
                    return interaction.editReply('❌ Please select a valid text channel.');
                }
                settings.awardChannelId = channel.id;
                await settings.save();
                return interaction.editReply(`✅ Award messages will now be sent to ${channel}.`);
            }
        }
    },
};
