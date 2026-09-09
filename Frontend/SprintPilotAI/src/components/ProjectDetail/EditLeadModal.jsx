import React from 'react';
import { X } from 'lucide-react';

export default function EditLeadModal({
  isOpen,
  onClose,
  darkMode,
  project,
  teamLeads,
  onChangeTeamLead
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
          <div className="text-left">
            <h3 className="font-extrabold text-base tracking-tight">Edit Project Team Lead</h3>
            <p className="text-xs text-slate-400">Select a new team lead for this project</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Select Team Lead *</label>
            <select
              value={project?.team_lead?.id || ''}
              onChange={(e) => {
                const newLeadId = e.target.value;
                if (newLeadId) {
                  onChangeTeamLead(newLeadId);
                }
              }}
              className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                  : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
            >
              <option value="">Select Team Lead...</option>
              {teamLeads.map((lead) => (
                <option key={lead.user?.id} value={lead.user?.id}>
                  {lead.user?.full_name} ({lead.user?.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex justify-end bg-slate-50/50 dark:bg-slate-100/30">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
