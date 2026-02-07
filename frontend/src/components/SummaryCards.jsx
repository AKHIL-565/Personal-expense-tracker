import React from 'react';

const SummaryItem = ({ label, value, colorClass }) => (
    <div className="summary-card">
        <div className="summary-label">{label}</div>
        <div className={`summary-value ${colorClass}`}>₹{value.toFixed(2)}</div>
    </div>
);

const SummaryCards = ({ onlineIncome, codCollected, totalExpense, netProfit }) => {
    return (
        <div className="summary-grid">
            <SummaryItem label="Online Income" value={onlineIncome} colorClass="text-success" />
            <SummaryItem label="COD Collected" value={codCollected} colorClass="text-cod" />
            <SummaryItem label="Total Expense" value={totalExpense} colorClass="text-danger" />
            <SummaryItem label="Net Profit" value={netProfit} colorClass="text-primary" />
        </div>
    );
};

export default SummaryCards;
