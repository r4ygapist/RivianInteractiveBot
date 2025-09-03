// commands/admin/testembed.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    // Re-adding the display component builders based on v14 documentation
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');
const config = require('../../config');
// Assuming VerifiedUser is not used in this command, but leaving it in case it's used elsewhere.
// const VerifiedUser = require('../../database/models/VerifiedUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testembed')
        .setDescription('Sends a test version of a specific embed.')
        .addStringOption(option =>
            option.setName('type')
            .setDescription('The type of embed you want to test.')
            .setRequired(true)
            .addChoices({
                name: 'Welcome Message',
                value: 'welcome'
            }, {
                name: 'ID Card',
                value: 'id'
            }, {
                name: 'License Approval',
                value: 'license'
            }, {
                name: 'Registration Approval',
                value: 'registration'
            })),
    async execute(interaction) {
        await interaction.deferReply({
            ephemeral: true
        });
        const type = interaction.options.getString('type');
        const member = interaction.member;
        const user = interaction.user;

        let embeds = [];
        let components = [];
        let content = '';
        let flags; // This will hold the IsComponentsV2 flag if needed

        try {
            switch (type) {
                case 'welcome':
                    // This structure is updated to match the JSON payload provided.
                    const textAndImageSection = new SectionBuilder()
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent("Thanks for joining River Interactive! We're excited to have you here. Use the buttons below to explore and navigate the server quickly. If you have any questions, feel free to ask — we’re here to help!")
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                            .setURL(user.displayAvatarURL({ dynamic: true }))
                            .setDescription(user.username) // Alt text
                        );

                    const container = new ContainerBuilder()
                        .setAccentColor(0x0099FF) // A nice blue accent color
                        // The welcome text is a direct child of the container now
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**Welcome, <@${user.id}>!**`)
                        )
                        // The section with the paragraph and image is added next
                        .addSectionComponents(textAndImageSection)
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addActionRowComponents(
                            new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setLabel('Verify').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${config.discord.verifyChannelId || 'https://example.com'}`),
                                new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${config.discord.supportChannelId || 'https://example.com'}`),
                                new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(config.dmv.websiteUrl || 'https://example.com')
                            )
                        );

                    components.push(container);
                    flags = MessageFlags.IsComponentsV2; // Set the flag to enable display components
                    break;

                case 'id':
                    const idEmbed = new EmbedBuilder()
                        .setColor('#2C3E50')
                        .setAuthor({
                            name: `${config.dmv.serverName.toUpperCase()} IDENTIFICATION CARD`
                        })
                        .setThumbnail(user.displayAvatarURL({
                            dynamic: true
                        }))
                        .addFields({
                            name: 'Full Name',
                            value: user.username,
                            inline: true
                        }, {
                            name: 'Address',
                            value: '123 Main Street',
                            inline: true
                        }, {
                            name: 'Date of Birth',
                            value: '01/01/2000',
                            inline: true
                        }, {
                            name: 'Age',
                            value: '24',
                            inline: true
                        }, {
                            name: 'Race',
                            value: 'Human',
                            inline: true
                        }, {
                            name: 'Hair Color',
                            value: 'Varies',
                            inline: true
                        }, {
                            name: 'Eye Color',
                            value: 'Varies',
                            inline: true
                        }, {
                            name: 'Height',
                            value: "6'0\"",
                            inline: true
                        }, {
                            name: 'Weight',
                            value: '180 lbs',
                            inline: true
                        }, {
                            name: 'License Status',
                            value: 'Approved',
                            inline: true
                        }, {
                            name: 'License Class',
                            value: 'D',
                            inline: true
                        }, {
                            name: 'Expires',
                            value: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                            inline: true
                        })
                        .setFooter({
                            text: `Roblox: TestUser | Discord: ${user.tag}`
                        });
                    embeds.push(idEmbed);
                    break;

                case 'license':
                    content = `-- ${config.dmv.serverName.toUpperCase()} MANDATORY LICENSE --`;
                    const licenseEmbed = new EmbedBuilder()
                        .setAuthor({
                            name: config.dmv.serverName
                        })
                        .setTitle("Driver's License Approval Notice")
                        .setColor('#2ECC71')
                        .setThumbnail(user.displayAvatarURL({
                            dynamic: true
                        }))
                        .setDescription("This is a test of the license approval embed.")
                        .addFields({
                            name: 'Name',
                            value: user.username,
                            inline: true
                        }, {
                            name: 'Address',
                            value: '123 Main Street',
                            inline: true
                        }, {
                            name: 'DOB',
                            value: '01/01/2000',
                            inline: true
                        }, {
                            name: 'Age',
                            value: '24',
                            inline: true
                        }, {
                            name: 'Race',
                            value: 'Human',
                            inline: true
                        }, {
                            name: 'Hair Color',
                            value: 'Varies',
                            inline: true
                        }, {
                            name: 'Issued',
                            value: new Date().toLocaleDateString(),
                            inline: true
                        }, {
                            name: 'Expires',
                            value: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                            inline: true
                        }, {
                            name: 'Class',
                            value: 'D',
                            inline: true
                        });
                    embeds.push(licenseEmbed);
                    break;

                case 'registration':
                    const registrationEmbed = new EmbedBuilder()
                        .setAuthor({
                            name: config.dmv.serverName
                        })
                        .setTitle("Vehicle Registration Approval Notice")
                        .setColor('#2ECC71')
                        .addFields({
                            name: 'Plate Number',
                            value: `**ABC-123**`,
                            inline: true
                        }, {
                            name: 'Owner',
                            value: user.username,
                            inline: true
                        }, {
                            name: 'Vehicle',
                            value: `2024 Test Model`
                        }, {
                            name: 'Issued',
                            value: new Date().toLocaleDateString(),
                            inline: true
                        }, {
                            name: 'Expires',
                            value: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                            inline: true
                        });
                    embeds.push(registrationEmbed);
                    break;
            }

            await interaction.channel.send({
                content: content || undefined,
                embeds: embeds.length > 0 ? embeds : undefined,
                components: components.length > 0 ? components : undefined,
                flags: flags || undefined // Pass the flags to the send method
            });

            await interaction.editReply({
                content: 'Test embed sent successfully!'
            });

        } catch (error) {
            console.error('Testembed error:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while generating the test embed.'
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while generating the test embed.',
                    ephemeral: true
                });
            }
        }
    },
};
