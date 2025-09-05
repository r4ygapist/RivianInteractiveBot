const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const DispatchSettings = require('../../database/models/DispatchSettings');

// Helper function to get or create settings for the server.
const getSettings = async (guildId) => {
    return await DispatchSettings.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dispatch')
        .setDescription('Manages the dispatch alert system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('config')
            .setDescription('Displays the current dispatch configuration.'))
        .addSubcommandGroup(group => group
            .setName('ping')
            .setDescription('Manages which roles are pinged for alerts.')
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Adds a role to the dispatch ping list.')
                .addRoleOption(opt => opt.setName('role').setDescription('The role to add.').setRequired(true)))
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('Removes a role from the dispatch ping list.')
                .addRoleOption(opt => opt.setName('role').setDescription('The role to remove.').setRequired(true)))),

    async execute(interaction) {
        const settings = await getSettings(interaction.guild.id);
        const subcommand = interaction.options.getSubcommand();
        
        await interaction.deferReply({ ephemeral: true });

        if (subcommand === 'config') {
            const roleMentions = settings.pingRoleIds.length > 0
                ? settings.pingRoleIds.map(id => `<@&${id}>`).join('\n')
                : 'No roles are currently configured to be pinged.';

            // Build the Display Component V2 message
            const content = [
                `# Dispatch System Configuration`,
                `The following roles will be pinged when an "Officer Down" alert is triggered:`,
                `\n${roleMentions}`
            ].join('\n');
            
            const textDisplay = new TextDisplayBuilder().setContent(content);
            const section = new SectionBuilder().addTextDisplayComponents(textDisplay);
            const container = new ContainerBuilder()
                .setAccentColor(0x3498DB)
                .addSectionComponents(section);
            
            return interaction.editReply({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'add') {
            const role = interaction.options.getRole('role');
            if (settings.pingRoleIds.includes(role.id)) {
                return interaction.editReply(`⚠️ The role ${role} is already on the ping list.`);
            }
            settings.pingRoleIds.push(role.id);
            await settings.save();
            return interaction.editReply(`✅ The role ${role} has been **added** to the dispatch ping list.`);
        }

        if (subcommand === 'remove') {
            const role = interaction.options.getRole('role');
            if (!settings.pingRoleIds.includes(role.id)) {
                return interaction.editReply(`⚠️ The role ${role} is not on the ping list.`);
            }
            settings.pingRoleIds = settings.pingRoleIds.filter(id => id !== role.id);
            await settings.save();
            return interaction.editReply(`✅ The role ${role} has been **removed** from the dispatch ping list.`);
        }
    },
};