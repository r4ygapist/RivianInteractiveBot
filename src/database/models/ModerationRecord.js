// database/models/ModerationRecord.js
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const warningSchema = new mongoose.Schema({
    warningId: { type: String, default: () => randomUUID(), required: true },
    reason: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const banStatusSchema = new mongoose.Schema({
    isBanned: { type: Boolean, default: false },
    reason: String,
    moderatorId: String,
    moderatorTag: String,
    duration: String,
    isPermanent: Boolean,
    timestamp: Date
});

const moderationRecordSchema = new mongoose.Schema({
    robloxId: { type: String, required: true, unique: true },
    robloxUsername: { type: String, required: true },
    warnings: [warningSchema],
    banStatus: { type: banStatusSchema, default: () => ({ isBanned: false }) }
});

module.exports = mongoose.model('ModerationRecord', moderationRecordSchema);