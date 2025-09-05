const mongoose = require('mongoose');

// This schema will store the configuration for the dispatch system.
const dispatchSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    pingRoleIds: { type: [String], default: [] },
});

module.exports = mongoose.model('DispatchSettings', dispatchSettingsSchema);

