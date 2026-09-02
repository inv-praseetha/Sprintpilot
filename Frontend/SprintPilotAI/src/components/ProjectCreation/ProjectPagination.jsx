import React from 'react';

export default function ProjectPagination({
  currentPage,
  totalCount,
  fetchProjects,
  hasPrevPage,
  hasNextPage,
  darkMode
}) {
  const totalPages = Math.ceil(totalCount / 5) || 1;

  return (
    <div className={`px-6 py-4 flex items-center justify-between border-t transition-colors ${darkMode
      ? 'border-slate-800 bg-slate-900/60'
      : 'border-slate-100 bg-slate-50/30'
      }`}>
      <div className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Showing page <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentPage}</span> of <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{totalPages}</span> ({totalCount} total projects)
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fetchProjects(currentPage - 1)}
          disabled={!hasPrevPage}
          className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${hasPrevPage
            ? darkMode
              ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
              : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-700 cursor-pointer shadow-sm shadow-slate-100/50'
            : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
        >
          Previous
        </button>

        {/* Dynamic Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          const isSelected = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => fetchProjects(p)}
              className={`w-8.5 h-8.5 rounded-xl border text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${isSelected
                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/15'
                : darkMode
                  ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-900'
                  : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-700 hover:bg-slate-50 shadow-sm shadow-slate-100/50'
                }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => fetchProjects(currentPage + 1)}
          disabled={!hasNextPage}
          className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${hasNextPage
            ? darkMode
              ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
              : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-700 cursor-pointer shadow-sm shadow-slate-100/50'
            : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
