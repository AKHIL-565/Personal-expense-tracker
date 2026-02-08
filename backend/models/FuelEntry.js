const mongoose = require('mongoose');

const fuelEntrySchema = new mongoose.Schema({
    date: { type: String, required: true },
    odometer: { type: Number, required: true },
    amount: { type: Number, required: true },
    liters: { type: Number },
    type: { type: String, default: 'Full' },
    userId: { type: String, required: true, default: 'primary_user' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FuelEntry', fuelEntrySchema);
