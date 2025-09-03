// database/database.js
const mongoose = require('mongoose');
const { database } = require('../config');

if (!database.uri) {
    console.error('MongoDB URI is not defined. Please check your .env file.');
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(database.uri);
        console.log('✅ Successfully connected to MongoDB.');
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;