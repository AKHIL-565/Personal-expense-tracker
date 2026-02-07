import React from 'react';

const FilterBar = ({ filter, setFilter, date, setDate, activeView }) => {
  return (
    <div className="sticky-header">
      <h2 className="app-title">
        {activeView === 'fuel' ? 'Fuel Calculator' :
          activeView === 'loan' ? 'Loan Calculator' : 'Money Manager'}
      </h2>

      <div className="filter-row">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-dropdown"
        >
          <option value="today">Today</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="all">All</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="header-date-input"
          max={new Date().toISOString().split('T')[0]}
        />
      </div>
    </div>
  );
};

export default FilterBar;
