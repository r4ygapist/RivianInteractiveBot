// database/models/ModerationAction.js
const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema({
    actionType: {
        type: String,
        required: true,
        enum: ['kick', 'ban', 'warn', 'unban']
    },
    targetRobloxId: { type: String, required: true },
    targetRobloxUsername: { type: String, required: true },
    reason: { type: String, required: true },
    duration: String,
    isPermanent: Boolean,
    moderatorDiscordId: { type: String, required: true },
    moderatorDiscordTag: { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: '7d' } // Auto-delete after 7 days
});

module.exports = mongoose.model('ModerationAction', moderationActionSchema);