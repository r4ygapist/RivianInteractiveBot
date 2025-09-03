const mongoose = require('mongoose');

const ticketSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    ticketCategoryId: { type: String, default: null },
    transcriptChannelId: { type: String, default: null },
    ticketCounter: { type: Number, default: 0 },
});

module.exports = mongoose.model('TicketSettings', ticketSettingsSchema);
