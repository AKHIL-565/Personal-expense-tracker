import React from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';

const DataTable = ({ transactions, onDelete, isDeleteMode }) => {
    if (transactions.length === 0) {
        return (
            <div className="card text-center text-secondary py-lg">
                No transactions found for this period.
            </div>
        );
    }

    return (
        <div className="bg-surface-color rounded-lg overflow-hidden shadow-sm border border-border-color">
            <div className="overflow-x-auto">
                <table className="transaction-table w-full">
                    <thead className="bg-surface-highlight border-b border-border-color">
                        <tr className="text-secondary text-xs uppercase tracking-wider">
                            <th className="p-sm border-b border-r border-border-color/10 date-cell">Date</th>
                            <th className="p-sm border-b border-r border-border-color/10">Type</th>
                            <th className="p-sm border-b border-r border-border-color/10">Mode</th>
                            <th className="p-sm border-b border-r border-border-color/10">Category</th>
                            <th className={`p-sm border-b border-border-color/10 text-right ${isDeleteMode ? 'border-r' : ''}`}>Amount</th>
                            {isDeleteMode && <th className="p-sm border-b border-border-color/10 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {transactions.map((t, index) => (
                            <tr key={t._id || t.id} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                <td data-label="Date" className="p-sm text-sm border-r border-border-color/10 date-cell">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                                <td data-label="Type" className={`p-sm text-sm font-bold border-r border-border-color/10 ${t.type === 'Income' ? 'text-success' :
                                    t.type === 'Expense' ? 'text-danger' : 'text-primary'
                                    }`}>
                                    {t.type}
                                </td>
                                <td data-label="Mode" className="p-sm text-sm border-r border-border-color/10">{t.mode}</td>
                                <td data-label="Category" className="p-sm text-sm border-r border-border-color/10">{t.category}</td>
                                <td data-label="Amount" className={`p-sm text-sm text-right font-mono font-bold border-border-color/10 ${isDeleteMode ? 'border-r' : ''}`}>₹{t.amount.toFixed(2)}</td>
                                {isDeleteMode && (
                                    <td data-label="Action" className="p-sm text-sm text-center">
                                        <button
                                            onClick={() => onDelete(t._id || t.id)}
                                            style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} className="text-danger" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
