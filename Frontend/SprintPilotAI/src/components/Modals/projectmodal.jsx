import React from 'react';
import { X } from 'lucide-react';

export default function ProjectModal({ show, onClose, darkMode, children }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-950/40 backdrop-blur-md">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transform transition-all ${
          darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-100 bg-slate-50/50 dark:bg-slate-100/50">
          <div className="text-left">
            <h3 className="font-extrabold text-2xl">Create New Project</h3>
            <p className="text-xs text-slate-400 mt-1">Configure project metadata, assign leadership and allocate resources.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-100 text-slate-455 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
