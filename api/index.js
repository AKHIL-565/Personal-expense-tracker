const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
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

let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};
connectDB();

// Models
const FuelEntry = require('./models/FuelEntry');
const Transaction = require('./models/Transaction');
const Loan = require('./models/Loan');
const LoanPayment = require('./models/LoanPayment');

// Create API Router
const apiRouter = express.Router();

// Health Check
apiRouter.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// Routes for Transactions
apiRouter.get('/transactions', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.post('/transactions', async (req, res) => {
    const transaction = new Transaction(req.body);
    try {
        const newTransaction = await transaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

apiRouter.delete('/transactions/:id', async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes for Fuel Calculator
apiRouter.get('/fuel', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const entries = await FuelEntry.find({ userId }).sort({ odometer: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.post('/fuel', async (req, res) => {
    const entry = new FuelEntry(req.body);
    try {
        const newEntry = await entry.save();
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

apiRouter.delete('/fuel/:id', async (req, res) => {
    try {
        await FuelEntry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes for Loan Calculator
apiRouter.get('/loans', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const loans = await Loan.find({ userId }).sort({ startDate: -1, createdAt: -1 });
        res.json(loans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.get('/loans/active', async (req, res) => {
    try {
        const userId = req.query.userId || 'primary_user';
        const loan = await Loan.findOne({ active: true, userId });
        res.json(loan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.post('/loans', async (req, res) => {
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

apiRouter.put('/loans/:id', async (req, res) => {
    try {
        const updatedLoan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedLoan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

apiRouter.delete('/loans/:id', async (req, res) => {
    try {
        await Loan.findByIdAndDelete(req.params.id);
        // Also delete associated payments
        await LoanPayment.deleteMany({ loanId: req.params.id });
        res.json({ message: 'Loan and its payments deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.get('/loans/:loanId/payments', async (req, res) => {
    try {
        // userId check optional here as loanId is specific, but good practice if needed
        const payments = await LoanPayment.find({ loanId: req.params.loanId }).sort({ date: -1, createdAt: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

apiRouter.post('/loans/:loanId/payments', async (req, res) => {
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

apiRouter.delete('/loans/payments/:id', async (req, res) => {
    try {
        await LoanPayment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Payment deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mount the API Router at both /api and / to handle prefix mismatches
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Root Route
app.get('/', (req, res) => {
    res.json({ message: "Backend is running" });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
