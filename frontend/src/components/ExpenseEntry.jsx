import React, { useState } from 'react';
import { MinusCircle } from 'lucide-react';

const ExpenseEntry = ({ onAdd }) => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Fuel');
    const [customCategory, setCustomCategory] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount) return;

        const finalCategory = category === 'Other' ? (customCategory || 'Other') : category;
        onAdd({ amount: parseFloat(amount), category: finalCategory.toLowerCase(), type: 'expense', mode: '—' });
        setAmount('');
        setCategory('Fuel');
        setCustomCategory('');
    };

    return (
        <div className="card">
            <h3 className="card-title text-danger">Add Expense</h3>
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

                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Fuel">Fuel</option>
                    <option value="Food">Food</option>
                    <option value="Recharge">Recharge</option>
                    <option value="Service">Service</option>
                    <option value="Other">Other</option>
                </select>

                {category === 'Other' && (
                    <input
                        type="text"
                        placeholder="Enter category name..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        style={{ paddingLeft: '14px' }}
                        autoFocus
                    />
                )}

                <button type="submit" className="danger">
                    <MinusCircle size={20} />
                    Add Expense
                </button>
            </form>
        </div>
    );
};

export default ExpenseEntry;
