const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    date: { type: String, required: true },
    type: { type: String, enum: ['Income', 'Expense', 'Deposit'], required: true },
    amount: { type: Number, required: true },
    mode: { type: String, default: '—' },
    category: { type: String, default: 'Other' },
    userId: { type: String, required: true, default: 'primary_user' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
