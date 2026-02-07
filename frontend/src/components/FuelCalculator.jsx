import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isSameDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Fuel, Timer, Droplets, IndianRupee, Plus, Download, History, Calculator, Trash2 } from 'lucide-react';

const FuelCalculator = ({ filter, entryDate }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: entryDate,
        odometer: '',
        amount: '',
        liters: '',
        type: 'Full' // 'Full' or 'Partial'
    });

    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Fetch entries on mount
    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const response = await fetch('/api/fuel');
                if (response.ok) {
                    const data = await response.json();

                    const saved = localStorage.getItem('fuel_entries');
                    const localData = saved ? JSON.parse(saved) : [];

                    if (data.length === 0 && localData.length > 0) {
                        for (const entry of localData) {
                            await fetch('/api/fuel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(entry)
                            });
                        }
                        const reFetch = await fetch('/api/fuel');
                        if (reFetch.ok) setEntries(await reFetch.json());
                    } else {
                        setEntries(data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch entries:', err);
                const saved = localStorage.getItem('fuel_entries');
                if (saved) setEntries(JSON.parse(saved));
            }
        };
        fetchEntries();
    }, []);

    const handleDelete = async (id) => {
        if (!id) return;

        try {
            const response = await fetch(`/api/fuel/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const updated = entries.filter(e => (e._id || e.id) !== id);
                setEntries(updated);
                localStorage.setItem('fuel_entries', JSON.stringify(updated));
            } else {
                throw new Error('Failed to delete from server');
            }
        } catch (err) {
            console.error('Delete Error:', err);
            // Fallback for local deletion
            const updated = entries.filter(e => (e._id || e.id) !== id);
            setEntries(updated);
            localStorage.setItem('fuel_entries', JSON.stringify(updated));
        }
    };

    useEffect(() => {
        setFormData(prev => ({ ...prev, date: entryDate }));
    }, [entryDate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.odometer || !formData.amount) {
            alert('Date, Odometer, and Amount are mandatory');
            return;
        }

        setLoading(true);

        const newEntry = {
            date: formData.date,
            odometer: parseFloat(formData.odometer),
            amount: parseFloat(formData.amount),
            liters: formData.liters ? parseFloat(formData.liters) : null,
            type: formData.type
        };

        try {
            const response = await fetch('/api/fuel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEntry)
            });

            if (response.ok) {
                const savedEntry = await response.json();
                setEntries(prev => [savedEntry, ...prev]);
                // Keep localStorage in sync for offline resilience
                localStorage.setItem('fuel_entries', JSON.stringify([savedEntry, ...entries]));
            } else {
                throw new Error('Failed to save to server');
            }
        } catch (err) {
            console.error('API Error:', err);
            // Fallback for demo/development if server is not up
            const fallbackEntry = { ...newEntry, id: Date.now().toString() };
            const updated = [fallbackEntry, ...entries];
            setEntries(updated);
            localStorage.setItem('fuel_entries', JSON.stringify(updated));
        }

        setFormData({
            date: entryDate,
            odometer: '',
            amount: '',
            liters: '',
            type: 'Full'
        });
        setLoading(false);
    };

    const filteredEntries = useMemo(() => {
        const now = parseISO(entryDate);
        return entries.filter(t => {
            const tDate = parseISO(t.date);
            if (filter === 'today') return isSameDay(tDate, now);
            if (filter === 'week') return isWithinInterval(tDate, {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 })
            });
            if (filter === 'month') return isWithinInterval(tDate, {
                start: startOfMonth(now),
                end: endOfMonth(now)
            });
            return true;
        });
    }, [entries, filter, entryDate]);

    const historyWithCalculations = useMemo(() => {
        // Sort all entries by odometer to calculate mileage correctly
        const allSorted = [...entries].sort((a, b) => Number(a.odometer) - Number(b.odometer));

        const calculated = allSorted.map((entry, index) => {
            if (entry.type === 'Partial') return { ...entry, mileage: null, costPerKm: null };

            // Find previous full tank index
            let prevFullTankIndex = -1;
            for (let i = index - 1; i >= 0; i--) {
                if (allSorted[i].type === 'Full') {
                    prevFullTankIndex = i;
                    break;
                }
            }

            if (prevFullTankIndex === -1) return { ...entry, mileage: null, costPerKm: null };

            const prevFullTank = allSorted[prevFullTankIndex];
            const distance = Number(entry.odometer) - Number(prevFullTank.odometer);

            // Sum all liters of partial fills between prev full tank and current full tank
            // plus current full tank liters
            let totalLiters = entry.liters ? Number(entry.liters) : 0;
            let totalAmountSinceLastFull = Number(entry.amount);

            for (let i = prevFullTankIndex + 1; i < index; i++) {
                totalLiters += (allSorted[i].liters ? Number(allSorted[i].liters) : 0);
                totalAmountSinceLastFull += Number(allSorted[i].amount);
            }

            const mileage = totalLiters > 0 ? (distance / totalLiters) : null;
            // Cost per KM based on all money spent since last full tank to cover this distance
            const costPerKm = distance > 0 ? (totalAmountSinceLastFull / distance) : null;

            return { ...entry, mileage, costPerKm, distance };
        });

        // Return to latest first for display
        return calculated.reverse().filter(item => {
            // Apply the filter to the calculated list
            return filteredEntries.some(fe => (fe._id || fe.id) === (item._id || item.id));
        });
    }, [entries, filteredEntries]);

    const summary = useMemo(() => {
        const totalSpent = filteredEntries.reduce((sum, e) => sum + Number(e.amount), 0);

        // Calculate averages independently
        // Use historyWithCalculations which already contains the calculated metrics for the filtered period
        const entriesWithMileage = historyWithCalculations.filter(e => e.type === 'Full' && e.mileage !== null);
        const entriesWithCost = historyWithCalculations.filter(e => e.type === 'Full' && e.costPerKm !== null);

        const avgMileage = entriesWithMileage.length > 0
            ? entriesWithMileage.reduce((sum, e) => sum + e.mileage, 0) / entriesWithMileage.length
            : 0;

        const avgCostPerKm = entriesWithCost.length > 0
            ? entriesWithCost.reduce((sum, e) => sum + e.costPerKm, 0) / entriesWithCost.length
            : 0;

        return { totalSpent, avgMileage, avgCostPerKm };
    }, [filteredEntries, historyWithCalculations]);

    const handleExport = () => {
        const headers = ['Date', 'KM', 'Amount', 'Liters', 'Tank Type'];
        const csvContent = [
            headers.join(','),
            ...filteredEntries.map(e => [
                e.date,
                e.odometer,
                e.amount,
                e.liters || '',
                e.type
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `fuel_entries_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-md">
            {/* Add Fuel Entry Card */}
            <div className="card">
                <h3 className="card-title text-primary">
                    <Fuel size={20} />
                    Add Fuel Entry
                </h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
                    <div>
                        <label className="label">Fuel Date</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Odometer KM</label>
                        <div className="input-group">
                            <Timer size={18} className="currency-symbol" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="number"
                                name="odometer"
                                placeholder="Odometer KM"
                                value={formData.odometer}
                                onChange={handleInputChange}
                                style={{ paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid-2-col">
                        <div>
                            <label className="label">Fuel Cost</label>
                            <div className="input-group">
                                <span className="currency-symbol">₹</span>
                                <input
                                    type="number"
                                    name="amount"
                                    placeholder="Amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Fuel Liters (optional)</label>
                            <div className="input-group">
                                <Droplets size={18} className="currency-symbol" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="number"
                                    step="0.01"
                                    name="liters"
                                    placeholder="Liters"
                                    value={formData.liters}
                                    onChange={handleInputChange}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="label">Tank Type</label>
                        <div className="segment-control">
                            <button
                                type="button"
                                className={`segment-btn ${formData.type === 'Full' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, type: 'Full' })}
                                style={{ padding: '10px' }}
                            >
                                Full Tank
                            </button>
                            <button
                                type="button"
                                className={`segment-btn ${formData.type === 'Partial' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, type: 'Partial' })}
                                style={{ padding: '10px' }}
                            >
                                Partial Fill
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full"
                        style={{ backgroundColor: 'var(--primary-color)', color: 'black', marginTop: '8px' }}
                        disabled={loading}
                    >
                        <Plus size={20} />
                        {loading ? 'Saving...' : 'Add Fuel Entry'}
                    </button>
                </form>
            </div>

            {/* Fuel Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card">
                    <div className="summary-label">Total Fuel Spent</div>
                    <div className="summary-value text-primary">₹{summary.totalSpent.toFixed(2)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Avg Mileage</div>
                    <div className="summary-value text-success">{summary.avgMileage.toFixed(2)} <span className="text-xs">km/l</span></div>
                </div>
                <div className="summary-card" style={{ gridColumn: 'span 2' }}>
                    <div className="summary-label">Avg Fuel Cost per KM</div>
                    <div className="summary-value text-cod">₹{summary.avgCostPerKm.toFixed(2)}</div>
                </div>
            </div>

            {/* History Header */}
            <div className="flex items-center justify-between mt-md">
                <h3 className="section-title">Fuel History</h3>
                <div className="flex gap-sm">
                    <button
                        onClick={() => setIsDeleteMode(!isDeleteMode)}
                        className={`secondary ${isDeleteMode ? 'active' : ''}`}
                        style={{
                            width: 'auto',
                            padding: '8px 12px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: isDeleteMode ? 'var(--danger-bg)' : '',
                            color: isDeleteMode ? 'var(--danger-color)' : '',
                            borderColor: isDeleteMode ? 'var(--danger-border)' : ''
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="secondary"
                        style={{ width: 'auto', padding: '8px 12px', height: '38px', borderRadius: '8px' }}
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Fuel History Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="transaction-table w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-highlight)' }}>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Date</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">KM</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Cost</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Liters</th>
                                <th className="p-sm text-xs uppercase tracking-wider text-secondary">Type</th>
                                {isDeleteMode && <th className="p-sm text-xs uppercase tracking-wider text-secondary text-center">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {historyWithCalculations.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-md text-center text-secondary">No fuel entries found</td>
                                </tr>
                            ) : (
                                historyWithCalculations.map((entry) => (
                                    <tr key={entry._id || entry.id}>
                                        <td className="p-sm text-sm">{format(parseISO(entry.date), 'dd MMM')}</td>
                                        <td className="p-sm text-sm">{entry.odometer.toLocaleString()}</td>
                                        <td className="p-sm text-sm font-bold">₹{entry.amount.toFixed(0)}</td>
                                        <td className="p-sm text-sm">{entry.liters ? entry.liters.toFixed(1) : '-'}</td>
                                        <td className="p-sm text-xs">
                                            <span className={`px-sm py-xs rounded-full ${entry.type === 'Full' ? 'bg-success-bg text-success' : 'bg-surface-highlight text-secondary'}`} style={{ borderRadius: '12px', padding: '2px 8px' }}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        {isDeleteMode && (
                                            <td className="p-sm text-center">
                                                <button
                                                    onClick={() => handleDelete(entry._id || entry.id)}
                                                    style={{ background: 'transparent', border: 'none', width: 'auto', padding: '4px' }}
                                                >
                                                    <Trash2 size={14} className="text-danger" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mileage Details (Optional UI addition for clarity) */}
            {historyWithCalculations.some(e => e.mileage) && (
                <div className="card bg-surface-highlight" style={{ borderStyle: 'dashed' }}>
                    <div className="flex items-center gap-sm mb-xs">
                        <Calculator size={16} className="text-secondary" />
                        <span className="text-sm font-medium">Detailed Analysis</span>
                    </div>
                    <div className="flex flex-col gap-xs">
                        {historyWithCalculations.filter(e => e.mileage).slice(0, 3).map(e => (
                            <div key={`detail-${e.id}`} className="flex justify-between text-xs p-xs border-b border-color last:border-0">
                                <span className="text-secondary">{format(parseISO(e.date), 'dd MMM')}:</span>
                                <span>
                                    <span className="text-success">{e.mileage.toFixed(2)} km/l</span>
                                    <span className="mx-xs text-secondary">|</span>
                                    <span className="text-cod">₹{e.costPerKm.toFixed(2)}/km</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FuelCalculator;
