import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

const CODWallet = ({ codCollected, codDeposited, onDeposit }) => {
    const [amount, setAmount] = useState('');
    const balance = codCollected - codDeposited;

    const handleDeposit = (e) => {
        e.preventDefault();
        if (!amount) return;
        onDeposit({ amount: parseFloat(amount), type: 'Deposit', mode: '—', category: 'Deposit' });
        setAmount('');
    };

    return (
        <div className="card cod-rejection-card">
            <div className="flex justify-between items-center mb-md">
                <h3 className="card-title text-cod">COD Wallet</h3>
                <Wallet className="text-cod" />
            </div>

            <div className="cod-stats flex justify-between text-center mb-md">
                <div>
                    <div className="text-secondary text-sm">Collected</div>
                    <div className="font-bold">₹{codCollected.toFixed(2)}</div>
                </div>
                <div>
                    <div className="text-secondary text-sm">Deposited</div>
                    <div className="font-bold">₹{codDeposited.toFixed(2)}</div>
                </div>
                <div className={balance !== 0 ? 'highlight-box' : ''}>
                    <div className="text-secondary text-sm">Balance</div>
                    <div className={`font-bold ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{balance.toFixed(2)}
                    </div>
                </div>
            </div>

            <form onSubmit={handleDeposit} className="deposit-form flex gap-sm">
                <div className="input-group flex-1">
                    <span className="currency-symbol">₹</span>
                    <input
                        type="number"
                        placeholder="Deposit Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                    />
                </div>
                <button type="submit" className="flex-none secondary deposit-btn">
                    Deposit
                </button>
            </form>
        </div>
    );
};

export default CODWallet;
