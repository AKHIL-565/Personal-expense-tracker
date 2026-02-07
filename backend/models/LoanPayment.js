const mongoose = require('mongoose');

const loanPaymentSchema = new mongoose.Schema({
    loanId: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoanPayment', loanPaymentSchema);
