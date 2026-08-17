import React from 'react';
import { X, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function CloseSprintModal({
  isOpen,
  onClose,
  darkMode,
  closureError,
  closingSprintSummary,
  isClosingSprint,
  onConfirmClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
          <div className="text-left">
            <h3 className="font-extrabold text-lg tracking-tight text-rose-500 flex items-center gap-2">
              <Lock className="w-5 h-5" /> Close Milestone
            </h3>
            <p className="text-xs text-slate-400 mt-1">Review tasks before finalizing closure</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
            <p className="text-sm font-semibold text-left">
              Are you sure you want to close this milestone?
            </p>
            <p className="text-xs opacity-80 mt-1.5 text-left leading-relaxed">
              Closing this milestone will mark all its tasks as CLOSED and synchronize this status directly to the Backlog platform. This action is permanent.
            </p>
          </div>

          {closureError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{closureError}</span>
            </div>
          )}

          {closingSprintSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} text-center`}>
                <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Tasks</span>
                <span className="text-lg font-black">{closingSprintSummary.total_tasks}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} text-center`}>
                <span className="block text-[10px] font-black uppercase text-blue-500 mb-1">Open</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">{closingSprintSummary.open_tasks}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'} text-center`}>
                <span className="block text-[10px] font-black uppercase text-amber-500 mb-1">In Progress</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{closingSprintSummary.in_progress_tasks}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} text-center`}>
                <span className="block text-[10px] font-black uppercase text-emerald-500 mb-1">Resolved</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{closingSprintSummary.resolved_tasks}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isClosingSprint}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmClose}
            disabled={isClosingSprint || !closingSprintSummary}
            className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 flex items-center gap-2 cursor-pointer"
          >
            {isClosingSprint ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Closing...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm Close</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
