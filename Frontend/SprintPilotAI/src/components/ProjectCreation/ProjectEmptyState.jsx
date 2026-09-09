import React from 'react';
import { Briefcase } from 'lucide-react';

export default function ProjectEmptyState({ darkMode, isProjectManager, onAddProject }) {
  return (
    <div className={`p-16 rounded-3xl border-2 border-dashed text-center space-y-5 ${darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50/50 border-slate-200'
      }`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-200/40 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
        <Briefcase className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-extrabold text-xl">No Projects Found</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          There are no projects matching your filter criteria. Let's create your first workspace project.
        </p>
      </div>
      {isProjectManager && (
        <button
          onClick={onAddProject}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/15 cursor-pointer"
        >
          Add Project
        </button>
      )}
    </div>
  );
}
