import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import FilterBar from './components/FilterBar';
import IncomeEntry from './components/IncomeEntry';
import ExpenseEntry from './components/ExpenseEntry';
import SummaryCards from './components/SummaryCards';
import DataTable from './components/DataTable';
import FuelCalculator from './components/FuelCalculator';
import LoanCalculator from './components/LoanCalculator';

const STORAGE_KEY = 'delivery_money_manager_data';

function App() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filter, setFilter] = useState('today');
    const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [categoryFilter, setCategoryFilter] = useState('Total');
    const [sortOrder, setSortOrder] = useState('Latest');

    useEffect(() => {
        const updateDate = () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            setEntryDate(today);
        };

        // Update on mount and when window gets focus
        updateDate();
        window.addEventListener('focus', updateDate);

        // Also check occasionally if the app stays open for a long time
        const interval = setInterval(updateDate, 60000); // every minute

        return () => {
            window.removeEventListener('focus', updateDate);
            clearInterval(interval);
        };
    }, []);

    // Fetch transactions on mount
    // Fetch transactions on mount
    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/transactions');
                if (response.ok) {
                    const serverData = await response.json();

                    // GET local data
                    const saved = localStorage.getItem(STORAGE_KEY);
                    const localData = saved ? JSON.parse(saved) : [];

                    // Identify items to sync:
                    // 1. Items without an _id (never synced)
                    // 2. Items that exist locally but NOT in serverData (based on timestamp id if available, or just heuristic)
                    // Simpler approach: If local has items without _id, sync them.
                    // Also, if server is empty but local is not, sync all (handling case where DB was wiped).

                    const toSync = localData.filter(l => !l._id || (serverData.length === 0));

                    if (toSync.length > 0) {
                        console.log(`Syncing ${toSync.length} items to server...`);
                        for (const t of toSync) {
                            // Avoid duplicates if we are in the "Server empty" case but item has _id (sanitize)
                            const { _id, ...cleanT } = t;

                            try {
                                await fetch('/api/transactions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(cleanT)
                                });
                            } catch (e) {
                                console.error('Sync failed for item:', t, e);
                            }
                        }

                        // Fetch again after sync to get the new _ids
                        const reFetch = await fetch('/api/transactions');
                        if (reFetch.ok) {
                            setTransactions(await reFetch.json());
                        } else {
                            setTransactions(serverData); // Fallback
                        }
                    } else {
                        // If everything looks synced, just use server data
                        // But if server has LESS data than local (and local has _ids), we might have a drift issue.
                        // For now, trust server as source of truth if no obvious unsynced items.
                        setTransactions(serverData);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch transactions:', err);
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) setTransactions(JSON.parse(saved));
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (transactions.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        }
    }, [transactions]);

    const handleAddTransaction = async (transaction) => {
        const newTransaction = {
            date: entryDate,
            ...transaction
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTransaction)
            });

            if (response.ok) {
                const saved = await response.json();
                setTransactions(prev => [saved, ...prev]);
            } else {
                throw new Error('Failed to save to server');
            }
        } catch (err) {
            console.error('API Error:', err);
            // Fallback
            const fallback = { ...newTransaction, id: Date.now().toString() };
            setTransactions(prev => [fallback, ...prev]);
        }
    };

    const handleDeleteTransaction = async (id) => {
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setTransactions(prev => prev.filter(t => (t._id || t.id) !== id));
            } else {
                throw new Error('Failed to delete from server');
            }
        } catch (err) {
            console.error('Delete Error:', err);
            setTransactions(prev => prev.filter(t => (t._id || t.id) !== id));
        }
    };

    const filteredTransactions = useMemo(() => {
        const now = parseISO(entryDate);
        const sorted = [...transactions].sort((a, b) => {
            const idA = a._id || a.id;
            const idB = b._id || b.id;
            return idB > idA ? 1 : -1;
        });

        const dateSorted = sorted.sort((a, b) => {
            if (sortOrder === 'Highest') return b.amount - a.amount;
            if (sortOrder === 'Lowest') return a.amount - b.amount;

            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            if (sortOrder === 'Oldest') {
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                const idA = a._id || a.id;
                const idB = b._id || b.id;
                return idA > idB ? 1 : -1;
            }

            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            const idA = a._id || a.id;
            const idB = b._id || b.id;
            return idB > idA ? 1 : -1;
        });

        return dateSorted.filter(t => {
            const tDate = parseISO(t.date);

            let dateMatch = false;
            if (filter === 'today') {
                dateMatch = isSameDay(tDate, now);
            } else if (filter === 'week') {
                dateMatch = isWithinInterval(tDate, {
                    start: startOfWeek(now, { weekStartsOn: 1 }),
                    end: endOfWeek(now, { weekStartsOn: 1 })
                });
            } else if (filter === 'month') {
                dateMatch = isWithinInterval(tDate, {
                    start: startOfMonth(now),
                    end: endOfMonth(now)
                });
            } else {
                dateMatch = true;
            }

            if (!dateMatch) return false;

            if (categoryFilter !== 'Total') {
                return t.category === categoryFilter;
            }

            return true;
        });
    }, [transactions, filter, entryDate, categoryFilter, sortOrder]);

    const { onlineIncome, codCollected, totalExpense, netProfit } = useMemo(() => {
        let online = 0;
        let cod = 0;
        let expense = 0;

        filteredTransactions.forEach(t => {
            if (t.type === 'Income') {
                if (t.mode === 'Online') online += t.amount;
                if (t.mode === 'COD') cod += t.amount;
            } else if (t.type === 'Expense') {
                expense += t.amount;
            }
        });

        return {
            onlineIncome: online,
            codCollected: cod,
            totalExpense: expense,
            netProfit: (online + cod) - expense
        };
    }, [filteredTransactions]);

    const historyTotal = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    const handleExport = () => {
        const headers = ['Date', 'Type', 'Amount', 'Mode', 'Category'];
        const csvContent = [
            headers.join(','),
            ...filteredTransactions.map(t => [
                t.date,
                t.type,
                t.amount,
                t.mode,
                t.category
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [activeView, setActiveView] = useState('money'); // 'money', 'fuel', or 'loan'

    return (
        <div className="app-container">
            <FilterBar
                filter={filter}
                setFilter={setFilter}
                date={entryDate}
                setDate={setEntryDate}
                activeView={activeView}
            />

            <div className="content-padding">
                {/* View Toggle */}
                <div className="segment-control mb-sm">
                    <button
                        className={`segment-btn ${activeView === 'money' ? 'active' : ''}`}
                        onClick={() => setActiveView('money')}
                    >
                        Money Manager
                    </button>
                    <button
                        className={`segment-btn ${activeView === 'fuel' ? 'active' : ''}`}
                        onClick={() => setActiveView('fuel')}
                    >
                        Fuel Calculator
                    </button>
                    <button
                        className={`segment-btn ${activeView === 'loan' ? 'active' : ''}`}
                        onClick={() => setActiveView('loan')}
                    >
                        Loan Calculator
                    </button>
                </div>

                {activeView === 'money' ? (
                    <>
                        <div className="grid-2-col">
                            <IncomeEntry onAdd={handleAddTransaction} />
                            <ExpenseEntry onAdd={handleAddTransaction} />
                        </div>

                        <SummaryCards
                            onlineIncome={onlineIncome}
                            codCollected={codCollected}
                            totalExpense={totalExpense}
                            netProfit={netProfit}
                        />

                        <div className="flex items-center justify-between mb-sm mt-lg w-full history-header-row">
                            <h3 className="section-title m-0" style={{ whiteSpace: 'nowrap' }}>History</h3>

                            <div className="history-controls">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="secondary history-select"
                                >
                                    <option value="Latest">Latest</option>
                                    <option value="Oldest">By date</option>
                                    <option value="Highest">Highest</option>
                                    <option value="Lowest">Lowest</option>
                                    <option value="Delete">Delete</option>
                                </select>

                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="secondary history-select"
                                >
                                    <option value="Total">Total</option>
                                    <option value="Food">Food</option>
                                    <option value="Fuel">Fuel</option>
                                    <option value="Service">Service</option>
                                    <option value="Recharge">Recharge</option>
                                </select>

                                <button onClick={handleExport} className="secondary history-export-btn">
                                    <Download className="export-icon" />
                                </button>
                            </div>
                        </div>
                        <DataTable
                            transactions={filteredTransactions}
                            onDelete={handleDeleteTransaction}
                            isDeleteMode={sortOrder === 'Delete'}
                        />

                        <div className="card text-center" style={{ backgroundColor: 'var(--surface-highlight)', marginTop: 0 }}>
                            <div className="summary-label text-secondary uppercase tracking-wider text-xs mb-xs">
                                {categoryFilter === 'Total' ? 'Total Income' : `Total ${categoryFilter}`}
                            </div>
                            <div className="summary-value text-primary font-bold text-lg" style={{ color: 'var(--primary-color)' }}>
                                ₹{(categoryFilter === 'Total'
                                    ? (onlineIncome + codCollected)
                                    : historyTotal).toFixed(2)}
                            </div>
                        </div>
                    </>
                ) : activeView === 'fuel' ? (
                    <FuelCalculator filter={filter} entryDate={entryDate} />
                ) : (
                    <LoanCalculator filter={filter} entryDate={entryDate} />
                )}
            </div>
        </div>
    );
}

export default App;
