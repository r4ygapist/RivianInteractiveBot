const mongoose = require('mongoose');

// This schema will store the configuration for the dispatch system.
const dispatchSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    // This array will hold the IDs of the roles to be pinged for dispatch alerts.
    pingRoleIds: { type: [String], default: [] },
    // A simple boolean to toggle the Text-to-Speech feature on or off.
    ttsEnabled: { type: Boolean, default: true },
    // The customizable message template for the TTS announcement.
    ttsMessage: { 
        type: String, 
        default: 'Officer down, {player}, at {location}. Status is {status}. All units respond.' 
    },
});

module.exports = mongoose.model('DispatchSettings', dispatchSettingsSchema);

