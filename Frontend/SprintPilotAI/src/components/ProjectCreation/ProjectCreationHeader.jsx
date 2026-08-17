import React from 'react';
import { Plus, Shield } from 'lucide-react';

export default function ProjectCreationHeader({ isProjectManager, onCreateClick }) {
  return (
    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <span className="text-sm font-semibold text-orange-500 uppercase tracking-wider">Create Project</span>
        <h1 className="text-4xl font-black tracking-tight mt-1">
          Manage your Projects
        </h1>
      </div>

      <div>
        {isProjectManager ? (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Project</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 text-sm font-bold border border-slate-200 dark:border-slate-700">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>
    </section>
  );
}
