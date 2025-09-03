const { Events } = require('discord.js');
const VanitySettings = require('../database/models/VanitySettings');

// Helper to extract the custom status text
const getCustomStatus = (presence) => {
    if (!presence || !presence.activities) return null;
    const customStatus = presence.activities.find(activity => activity.type === 4); // 4 is 'CUSTOM'
    return customStatus ? customStatus.state : null;
};

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        const settings = await VanitySettings.findOne({ guildId: newPresence.guild.id });
        if (!settings || !settings.vanityString || settings.rewardRoles.length === 0) {
            return; // Exit if the feature isn't configured for this guild
        }
        
        const member = newPresence.member;
        if (!member || member.user.bot) return; // Ignore bots

        const oldStatus = getCustomStatus(oldPresence);
        const newStatus = getCustomStatus(newPresence);
        
        if (oldStatus === newStatus) return; // No change in custom status

        const vanity = settings.vanityString;
        const hadVanity = oldStatus && oldStatus.includes(vanity);
        const hasVanity = newStatus && newStatus.includes(vanity);
        
        // User ADDED the vanity to their status
        if (hasVanity && !hadVanity) {
            try {
                await member.roles.add(settings.rewardRoles, 'Added vanity string to status');
                console.log(`[Vanity] Added roles to ${member.user.tag}.`);

                // Send award message if configured
                if (settings.awardChannelId && settings.awardMessage) {
                    const channel = await newPresence.guild.channels.fetch(settings.awardChannelId).catch(() => null);
                    if (channel) {
                        const message = settings.awardMessage.replace('{user}', `<@${member.id}>`);
                        await channel.send(message);
                    }
                }
            } catch (error) {
                console.error(`[Vanity] Failed to add roles to ${member.user.tag}:`, error.message);
            }
        }
        // User REMOVED the vanity from their status
        else if (!hasVanity && hadVanity) {
            try {
                await member.roles.remove(settings.rewardRoles, 'Removed vanity string from status');
                console.log(`[Vanity] Removed roles from ${member.user.tag}.`);
            } catch (error) {
                console.error(`[Vanity] Failed to remove roles from ${member.user.tag}:`, error.message);
            }
        }
    },
};
