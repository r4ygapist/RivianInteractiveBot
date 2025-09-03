const mongoose = require('mongoose');

const vanitySettingsSchema = new mongoose.Schema({
    // Using a static guildId to ensure only one settings document per server
    guildId: { type: String, required: true, unique: true },
    vanityString: { type: String, default: null },
    rewardRoles: { type: [String], default: [] }, // Array of Role IDs
    awardMessage: { type: String, default: 'Thank you for supporting us, {user}!' },
    awardChannelId: { type: String, default: null },
});

module.exports = mongoose.model('VanitySettings', vanitySettingsSchema);
