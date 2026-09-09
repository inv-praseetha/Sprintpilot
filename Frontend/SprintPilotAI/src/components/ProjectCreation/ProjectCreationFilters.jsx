import React from 'react';
import { Search } from 'lucide-react';

export default function ProjectCreationFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  darkMode,
  limits
}) {
  return (
    <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search projects by name........."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={limits?.general?.search?.maxLength || 100}
          className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
              ? 'bg-slate-900 border-slate-800/60 text-slate-200 placeholder-slate-500 focus:border-orange-500'
              : 'bg-white border-slate-100 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:shadow-md'
            }`}
        />
      </div>

      {/* Filters Group */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${statusFilter === filter
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                : darkMode
                  ? 'bg-slate-900 border-slate-800/60 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
          >
            {filter === 'ALL' ? 'All Projects' : filter.replace('_', ' ')}
          </button>
        ))}
      </div>
    </section>
  );
}
