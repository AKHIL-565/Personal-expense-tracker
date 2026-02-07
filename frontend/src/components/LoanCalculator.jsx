import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isSameDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, differenceInDays, addMonths } from 'date-fns';
import { IndianRupee, Plus, Calendar, CreditCard, PieChart, History, Wallet, CheckCircle2, Trash2, Clock, Edit2 } from 'lucide-react';

const LOANS_STORAGE_KEY = 'expense_tracker_loans';
const PAYMENTS_STORAGE_KEY = 'expense_tracker_loan_payments';

const LoanCalculator = ({ filter, entryDate }) => {
    const [loans, setLoans] = useState([]);
    const [payments, setPayments] = useState([]);

    const [loading, setLoading] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState(null);
    const [loanTypeFilter, setLoanTypeFilter] = useState('All');
    const [loanFormData, setLoanFormData] = useState({
        name: '',
        totalAmount: '',
        emiPerMonth: '',
        startDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [paymentFormData, setPaymentFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: ''
    });

    // Get active loan
    const activeLoan = useMemo(() => {
        return loans.find(l => l.active) || null;
    }, [loans]);

    // Get payments for active loan
    const activeLoanPayments = useMemo(() => {
        if (!activeLoan) return [];
        const loanId = activeLoan._id || activeLoan.id;
        return payments.filter(p => p.loanId === loanId);
    }, [activeLoan, payments]);

    // Fetch loans on mount
    useEffect(() => {
        const fetchLoans = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/loans');
                if (response.ok) {
                    const data = await response.json();

                    const saved = localStorage.getItem(LOANS_STORAGE_KEY);
                    const localData = saved ? JSON.parse(saved) : [];

                    if (data.length === 0 && localData.length > 0) {
                        for (const loan of localData) {
                            await fetch('/api/loans', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(loan)
                            });
                        }
                        const reFetch = await fetch('/api/loans');
                        if (reFetch.ok) setLoans(await reFetch.json());
                    } else {
                        setLoans(data);
                    }
                } else {
                    const savedLoans = localStorage.getItem(LOANS_STORAGE_KEY);
                    if (savedLoans) setLoans(JSON.parse(savedLoans));
                }
            } catch (err) {
                console.error('Fetch loans error:', err);
                const savedLoans = localStorage.getItem(LOANS_STORAGE_KEY);
                if (savedLoans) setLoans(JSON.parse(savedLoans));
            } finally {
                setLoading(false);
            }
        };
        fetchLoans();
    }, []);

    // Fetch payments for active loan whenever it changes
    useEffect(() => {
        const fetchPayments = async () => {
            const activeId = activeLoan?._id || activeLoan?.id;
            if (!activeId) return;
            try {
                const response = await fetch(`/api/loans/${activeId}/payments`);
                if (response.ok) {
                    const data = await response.json();
                    // Merge or replace payments for this loan
                    setPayments(prev => {
                        const otherPayments = prev.filter(p => (p.loanId !== activeId));
                        return [...otherPayments, ...data];
                    });
                }
            } catch (err) {
                console.error('Fetch payments error:', err);
            }
        };
        fetchPayments();
    }, [activeLoan?._id, activeLoan?.id]);

    useEffect(() => {
        if (loans.length > 0) localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    }, [loans]);

    useEffect(() => {
        if (payments.length > 0) localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    }, [payments]);


    // Filter loans by type
    const filteredLoans = useMemo(() => {
        if (loanTypeFilter === 'All') return loans;
        return loans.filter(l => l.name === loanTypeFilter);
    }, [loans, loanTypeFilter]);

    // Safe Date Formatter
    const formatDate = (dateStr, formatStr = 'dd MMM yy') => {
        if (!dateStr) return 'N/A';
        const date = parseISO(dateStr);
        return isValid(date) ? format(date, formatStr) : 'N/A';
    };

    // Calculate days left for next EMI
    const getDaysLeft = (startDateStr) => {
        if (!startDateStr) return 'N/A';
        const start = parseISO(startDateStr);
        if (!isValid(start)) return 'N/A';

        const today = new Date();
        // Reset time part for accurate day difference
        today.setHours(0, 0, 0, 0);

        const dueDay = start.getDate();
        let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);

        // If today is past the due day (or it's the due day but we want to know logic, usually if today is 15th and due is 15th, it's 0 days)
        // If today > dueDay, next due is next month
        if (today.getDate() > dueDay) {
            nextDue = addMonths(nextDue, 1);
        }

        const diff = differenceInDays(nextDue, today);

        if (diff === 0) return { text: 'Today', color: 'text-danger' };
        if (diff === 1) return { text: '1 day', color: 'text-warning' };
        return { text: `${diff} days`, color: 'text-success' };
    };

    const handleLoanSubmit = async (e) => {
        e.preventDefault();
        if (!loanFormData.totalAmount || !loanFormData.startDate) {
            alert('Amount and Start Date are mandatory');
            return;
        }

        setLoading(true);

        const loanData = {
            name: loanFormData.name || 'Personal Loan',
            totalAmount: parseFloat(loanFormData.totalAmount),
            emiPerMonth: parseFloat(loanFormData.emiPerMonth),
            startDate: loanFormData.startDate
        };

        try {
            if (editingLoanId) {
                const response = await fetch(`/api/loans/${editingLoanId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loanData)
                });
                if (response.ok) {
                    const updated = await response.json();
                    setLoans(prev => prev.map(l => (l._id || l.id) === editingLoanId ? updated : l));
                    setEditingLoanId(null);
                }
            } else {
                const response = await fetch('/api/loans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...loanData, active: true })
                });
                if (response.ok) {
                    const saved = await response.json();
                    setLoans(prev => [saved, ...prev.map(l => ({ ...l, active: false }))]);
                }
            }
        } catch (err) {
            console.error('Loan submit error:', err);
            // Fallback
            if (editingLoanId) {
                setLoans(prev => prev.map(l => (l._id || l.id) === editingLoanId ? { ...l, ...loanData } : l));
                setEditingLoanId(null);
            } else {
                const fallback = { ...loanData, id: Date.now().toString(), active: true, createdAt: new Date().toISOString() };
                setLoans(prev => [fallback, ...prev.map(l => ({ ...l, active: false }))]);
            }
        }

        // Clear form
        setLoanFormData({
            name: '',
            totalAmount: '',
            emiPerMonth: '',
            startDate: format(new Date(), 'yyyy-MM-dd')
        });

        setLoading(false);
    };

    const handleSelectLoan = (selectedLoan) => {
        if (!selectedLoan) return;

        // Set selected loan as active, deactivate others
        const selectedId = selectedLoan._id || selectedLoan.id;
        setLoans(prev => prev.map(l => ({
            ...l,
            active: (l._id || l.id) === selectedId
        })));
    };

    const handleEditLoan = (loan) => {
        const loanId = loan._id || loan.id;
        setEditingLoanId(loanId);
        setLoanFormData({
            name: loan.name,
            totalAmount: loan.totalAmount.toString(),
            emiPerMonth: loan.emiPerMonth ? loan.emiPerMonth.toString() : '',
            startDate: loan.startDate
        });
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteLoan = async (loanId) => {
        if (!window.confirm('Are you sure you want to delete this loan? This will also delete all associated payments.')) return;

        try {
            const response = await fetch(`/api/loans/${loanId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                // Delete the loan locally
                setLoans(prev => prev.filter(l => (l._id || l.id) !== loanId));
                // Delete associated payments locally
                setPayments(prev => prev.filter(p => p.loanId !== loanId));
            }
        } catch (err) {
            console.error('Delete loan error:', err);
            // Fallback for UI responsiveness
            setLoans(prev => prev.filter(l => (l._id || l.id) !== loanId));
            setPayments(prev => prev.filter(p => p.loanId !== loanId));
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!activeLoan || !paymentFormData.amount) return;

        const activeId = activeLoan._id || activeLoan.id;
        const amount = parseFloat(paymentFormData.amount);
        const totalPaidOverall = activeLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingOverall = activeLoan.totalAmount - totalPaidOverall;

        if (amount > remainingOverall) {
            alert('Payment amount cannot exceed remaining balance');
            return;
        }

        setLoading(true);

        const newPaymentRequest = {
            date: paymentFormData.date,
            amount: amount,
        };

        try {
            const response = await fetch(`/api/loans/${activeId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPaymentRequest)
            });
            if (response.ok) {
                const saved = await response.json();
                setPayments(prev => [saved, ...prev]);
                setPaymentFormData(prev => ({ ...prev, amount: '' }));
            }
        } catch (err) {
            console.error('Payment submit error:', err);
            // Fallback
            const fallback = {
                ...newPaymentRequest,
                id: Date.now().toString(),
                loanId: activeId,
                createdAt: new Date().toISOString()
            };
            setPayments(prev => [fallback, ...prev]);
            setPaymentFormData(prev => ({ ...prev, amount: '' }));
        }

        setLoading(false);
    };

    const handleDeletePayment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payment?')) return;
        try {
            const response = await fetch(`/api/loans/payments/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setPayments(prev => prev.filter(p => (p._id || p.id) !== id));
            }
        } catch (err) {
            console.error('Delete payment error:', err);
            setPayments(prev => prev.filter(p => (p._id || p.id) !== id));
        }
    };

    const filteredPayments = useMemo(() => {
        if (!Array.isArray(activeLoanPayments)) return [];
        const now = parseISO(entryDate);
        return activeLoanPayments.filter(p => {
            const pDate = parseISO(p.date);
            if (!isValid(pDate)) return false;

            if (filter === 'today') return isSameDay(pDate, now);
            if (filter === 'week') return isWithinInterval(pDate, {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 })
            });
            if (filter === 'month') return isWithinInterval(pDate, {
                start: startOfMonth(now),
                end: endOfMonth(now)
            });
            return true;
        });
    }, [activeLoanPayments, filter, entryDate]);

    const allTransactions = useMemo(() => {
        if (!activeLoan) return [];

        const entries = filteredPayments.map(p => ({
            id: p.id,
            date: p.date,
            amount: p.amount,
            type: 'Payment'
        }));

        const loanDate = parseISO(activeLoan.startDate);
        const now = parseISO(entryDate);
        let showStarting = false;

        if (filter === 'all') showStarting = true;
        else if (isValid(loanDate)) {
            if (filter === 'today') showStarting = isSameDay(loanDate, now);
            else if (filter === 'week') showStarting = isWithinInterval(loanDate, {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 })
            });
            else if (filter === 'month') showStarting = isWithinInterval(loanDate, {
                start: startOfMonth(now),
                end: endOfMonth(now)
            });
        }

        if (showStarting) {
            entries.push({
                id: activeLoan.id + '_start',
                date: activeLoan.startDate,
                amount: activeLoan.totalAmount,
                type: 'Starting Balance'
            });
        }

        return entries.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return a.type === 'Payment' ? -1 : 1;
        });
    }, [activeLoan, filteredPayments, filter, entryDate]);

    const summaryData = useMemo(() => {
        if (!activeLoan) return null;

        const totalPaidInPeriod = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalPaidOverall = (Array.isArray(activeLoanPayments) ? activeLoanPayments : []).reduce((sum, p) => sum + p.amount, 0);
        const remainingOverall = (activeLoan.totalAmount || 0) - totalPaidOverall;

        return {
            totalAmount: activeLoan.totalAmount || 0,
            totalPaidInPeriod,
            remainingOverall,
            startDate: activeLoan.startDate,
            name: activeLoan.name || 'Personal Loan'
        };
    }, [activeLoan, filteredPayments, activeLoanPayments]);

    return (
        <div className="flex flex-col gap-md">
            {/* Loan Setup Card */}
            <div className="card">
                <h3 className="card-title text-cod">
                    <Wallet size={20} />
                    {editingLoanId ? 'Edit Loan Details' : 'Loan Details'}
                </h3>
                <form onSubmit={handleLoanSubmit} className="flex flex-col gap-sm">
                    <div>
                        <label className="label">Loan Type</label>
                        <select
                            value={loanFormData.name}
                            onChange={(e) => setLoanFormData({ ...loanFormData, name: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'var(--surface-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Select Loan Type</option>
                            <option value="Bike Loan">Bike Loan</option>
                            <option value="Mpocket">Mpocket</option>
                            <option value="KreditBee">KreditBee</option>
                        </select>
                    </div>
                    <div className="grid-2-col">
                        <div>
                            <label className="label">Total Loan Amount</label>
                            <div className="input-group">
                                <span className="currency-symbol">₹</span>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={loanFormData.totalAmount}
                                    onChange={(e) => setLoanFormData({ ...loanFormData, totalAmount: e.target.value })}
                                    required
                                    style={{ borderLeft: 'none' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">EMI/Month</label>
                            <div className="input-group">
                                <span className="currency-symbol">₹</span>
                                <input
                                    type="number"
                                    placeholder="EMI Amount"
                                    value={loanFormData.emiPerMonth}
                                    onChange={(e) => setLoanFormData({ ...loanFormData, emiPerMonth: e.target.value })}
                                    required
                                    style={{ borderLeft: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid-2-col">
                        <div>
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                value={loanFormData.startDate}
                                onChange={(e) => setLoanFormData({ ...loanFormData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div></div>
                    </div>
                    <button
                        type="submit"
                        className="w-full"
                        style={{ backgroundColor: 'var(--cod-color)', color: 'black', marginTop: '8px' }}
                        disabled={loading}
                    >
                        {loading ? (editingLoanId ? 'Updating...' : 'Adding...') : (editingLoanId ? 'Update Loan' : 'Add Loan')}
                    </button>
                    {editingLoanId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingLoanId(null);
                                setLoanFormData({
                                    name: '',
                                    totalAmount: '',
                                    emiPerMonth: '',
                                    startDate: format(new Date(), 'yyyy-MM-dd')
                                });
                            }}
                            className="w-full"
                            style={{ backgroundColor: 'var(--surface-highlight)', color: 'var(--text-primary)', marginTop: '8px' }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div>

            {/* Loan Records Table */}
            <div className="flex items-center justify-between mt-sm">
                <h3 className="section-title">Loan Records</h3>
                <div className="flex items-center gap-sm">
                    {activeLoan && !editingLoanId && (
                        <div className="flex gap-xs" style={{ marginRight: '12px', borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
                            <button
                                onClick={() => handleEditLoan(activeLoan)}
                                className="text-cod"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Edit Selected Loan"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteLoan(activeLoan._id || activeLoan.id)}
                                className="text-danger"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Delete Selected Loan"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    <select
                        value={loanTypeFilter}
                        onChange={(e) => setLoanTypeFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            outline: 'none',
                            height: '36px',
                            width: 'auto'
                        }}
                    >
                        <option value="All">All Loans</option>
                        <option value="Bike Loan">Bike Loan</option>
                        <option value="Mpocket">Mpocket</option>
                        <option value="KreditBee">KreditBee</option>
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="transaction-table w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-highlight)' }}>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Start Date</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Loan Type</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Amount</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">EMI/Month</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Days Left</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-md text-center text-secondary">No loans recorded yet</td>
                                </tr>
                            ) : (
                                filteredLoans.map((l) => {
                                    const daysLeft = getDaysLeft(l.startDate);
                                    return (
                                        <tr
                                            key={l._id || l.id}
                                            onClick={() => handleSelectLoan(l)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: l.active ? 'rgba(88, 166, 255, 0.1)' : ''
                                            }}
                                        >
                                            <td className="p-sm text-sm text-secondary">{formatDate(l.startDate)}</td>
                                            <td className="p-sm text-sm">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-xs">
                                                        <span className="font-medium">{l.name || 'Personal Loan'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-sm text-sm font-bold">₹{(l.totalAmount || 0).toLocaleString()}</td>
                                            <td className="p-sm text-sm font-bold text-cod">₹{(l.emiPerMonth || 0).toLocaleString()}</td>
                                            <td className={`p-sm text-sm font-bold ${daysLeft.color}`}>{daysLeft.text}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {filteredLoans.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--surface-highlight)' }}>
                                    <td className="p-sm text-sm font-bold text-cod">TOTAL</td>
                                    <td className="p-sm text-sm"></td>
                                    <td className="p-sm text-sm font-bold text-cod">₹{filteredLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0).toLocaleString()}</td>
                                    <td className="p-sm text-sm font-bold text-cod">₹{filteredLoans.reduce((sum, l) => sum + (l.emiPerMonth || 0), 0).toLocaleString()}</td>
                                    <td className="p-sm text-sm"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

        </div>
    );
};

export default LoanCalculator;
