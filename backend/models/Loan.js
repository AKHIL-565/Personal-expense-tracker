const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    emiPerMonth: { type: Number, required: true },
    startDate: { type: String, required: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Loan', loanSchema);
