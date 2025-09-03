const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    // --- New imports for Display Components ---
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    MessageFlags,
} = require('discord.js');
const TicketSettings = require('../../database/models/TicketSettings');

// Helper function to find or create a settings document
const getSettings = async (guildId) => {
    return await TicketSettings.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Manages the ticket support system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Sets up the channels and roles for the ticket system.')
            .addChannelOption(opt => opt.setName('category').setDescription('The category where new tickets will be created.').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
            .addChannelOption(opt => opt.setName('transcripts').setDescription('The channel where ticket transcripts will be sent.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub => sub
            .setName('sendpanel')
            .setDescription('Sends the support ticket panel to a specific channel.')
            .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send the panel to.').setRequired(true).addChannelTypes(ChannelType.GuildText))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const settings = await getSettings(interaction.guild.id);

        await interaction.deferReply({ ephemeral: true });

        switch (subcommand) {
            case 'setup': {
                const category = interaction.options.getChannel('category');
                const transcripts = interaction.options.getChannel('transcripts');

                settings.ticketCategoryId = category.id;
                settings.transcriptChannelId = transcripts.id;
                await settings.save();

                return interaction.editReply(`✅ Support system configured!\n- **Ticket Category:** ${category}\n- **Transcript Channel:** ${transcripts}`);
            }

            case 'sendpanel': {
                const channel = interaction.options.getChannel('channel');
                if (!settings.ticketCategoryId) {
                    return interaction.editReply('⚠️ Please run `/support setup` before sending a panel.');
                }

                const mainContent = "# Support Section\nTo receive support from our River Interactive Administrative Team, please click on one of the buttons below.";
                
                const thumbnail = new ThumbnailBuilder().setURL(interaction.guild.iconURL({ dynamic: true }) || 'https://i.imgur.com/83hJ1S4.png');
                const mainText = new TextDisplayBuilder().setContent(mainContent);
                const mainSection = new SectionBuilder().addTextDisplayComponents(mainText).setThumbnailAccessory(thumbnail);

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_create_general').setLabel('General Support').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_create_report').setLabel('Player Report').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_create_internal').setLabel('Internal Affairs').setStyle(ButtonStyle.Secondary)
                );

                const container = new ContainerBuilder()
                    .addSectionComponents(mainSection)
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(2))
                    .addActionRowComponents(buttons);
                
                await channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                return interaction.editReply(`✅ Support panel sent to ${channel}.`);
            }
        }
    },
};
