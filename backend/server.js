const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.section = 'middleware';
// Middleware
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    const userId = req.body.userId || req.query.userId || 'primary_user';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User: ${userId}`);
    next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Models
const FuelEntry = require('./models/FuelEntry');
const Transaction = require('./models/Transaction');
const Loan = require('./models/Loan');
const LoanPayment = require('./models/LoanPayment');

// Health Check Routes
app.get('/', (req, res) => {
    res.json({ message: "Backend is running" });
});

app.get('/api/health', (req, res) => {
    res.json({ status: "ok" });
});

// Routes for Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/transactions', async (req, res) => {
    const transaction = new Transaction(req.body);
    try {
        const newTransaction = await transaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes for Fuel Calculator
app.get('/api/fuel', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const entries = await FuelEntry.find({ userId }).sort({ odometer: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/fuel', async (req, res) => {
    const entry = new FuelEntry(req.body);
    try {
        const newEntry = await entry.save();
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/fuel/:id', async (req, res) => {
    try {
        await FuelEntry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes for Loan Calculator
app.get('/api/loans', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const loans = await Loan.find({ userId }).sort({ startDate: -1, createdAt: -1 });
        res.json(loans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/loans/active', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const loan = await Loan.findOne({ active: true, userId });
        res.json(loan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/loans', async (req, res) => {
    try {
        const userId = req.body.userId || 'primary_user';
        // Deactivate all existing loans for this user
        await Loan.updateMany({ userId }, { active: false });

        const loan = new Loan(req.body);
        const newLoan = await loan.save();
        res.status(201).json(newLoan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/loans/:id', async (req, res) => {
    try {
        const updatedLoan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedLoan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/loans/:id', async (req, res) => {
    try {
        await Loan.findByIdAndDelete(req.params.id);
        // Also delete associated payments
        await LoanPayment.deleteMany({ loanId: req.params.id });
        res.json({ message: 'Loan and its payments deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/loans/:loanId/payments', async (req, res) => {
    try {
        // userId check optional here as loanId is specific, but good practice if needed
        const payments = await LoanPayment.find({ loanId: req.params.loanId }).sort({ date: -1, createdAt: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/loans/:loanId/payments', async (req, res) => {
    try {
        const payment = new LoanPayment({
            loanId: req.params.loanId,
            ...req.body
        });
        const newPayment = await payment.save();
        res.status(201).json(newPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/loans/payments/:id', async (req, res) => {
    try {
        await LoanPayment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Payment deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
});
