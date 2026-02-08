import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

const IncomeEntry = ({ onAdd }) => {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('Online');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount) return;
        onAdd({ amount: parseFloat(amount), mode: mode.toLowerCase(), type: 'income' });
        setAmount('');
        setMode('Online');
    };

    return (
        <div className="card">
            <h3 className="card-title text-success">Add Income</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
                <div className="input-group">
                    <span className="currency-symbol">₹</span>
                    <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                    />
                </div>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="Online">Online</option>
                    <option value="COD">COD</option>
                </select>
                <button type="submit" style={{ backgroundColor: 'var(--success-color)' }}>
                    <PlusCircle size={20} />
                    Add Income
                </button>
            </form>
        </div>
    );
};

export default IncomeEntry;
