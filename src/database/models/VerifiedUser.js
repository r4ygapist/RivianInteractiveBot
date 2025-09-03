// database/models/VerifiedUser.js
const mongoose = require('mongoose');

// Schema for the permanent roleplay identity
const identitySchema = new mongoose.Schema({
    fullName: String,
    address: String,
    dob: String,
    age: Number,
    race: String,
    hairColor: String,
    height: String,
    weight: String,
    eyeColor: String,
});

// Schema for an approved driver's license
const licenseSchema = new mongoose.Schema({
    status: { type: String, enum: ['None', 'Pending', 'Approved', 'Denied'], default: 'None' },
    class: { type: String, default: 'D' },
    issuedDate: { type: Date },
    expiresDate: { type: Date },
    submittedAt: { type: Date },
});

// Schema for a registered vehicle
const vehicleSchema = new mongoose.Schema({
    plate: { type: String, unique: true },
    make: String,
    model: String,
    year: Number,
    color: String,
    issuedDate: { type: Date },
    expiresDate: { type: Date },
});

// Schema for a pending vehicle registration application
const pendingRegistrationSchema = new mongoose.Schema({
    make: String,
    model: String,
    year: Number,
    color: String,
    submittedAt: { type: Date },
});

const verifiedUserSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    robloxId: { type: String, required: true },
    robloxUsername: { type: String, required: true },
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    identity: { type: identitySchema, default: null },
    license: { type: licenseSchema, default: () => ({ status: 'None' }) },
    vehicles: [vehicleSchema],
    pendingRegistration: { type: pendingRegistrationSchema, default: null },
});

module.exports = mongoose.model('VerifiedUser', verifiedUserSchema);