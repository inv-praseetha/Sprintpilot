import React from 'react';
import { Info } from 'lucide-react';
import { useValidationLimits } from '../../../hooks/useValidationLimits';

export default function BasicDetailsSection({
  darkMode,
  projectId,
  setProjectId,
  editingProjectId,
  jiraId,
  setJiraId,
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  status,
  setStatus,
  teamSize,
  setTeamSize
}) {
  const limits = useValidationLimits();

  return (
    <>
      {/* ID, Name & Description */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2 text-left sm:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project ID <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              minLength={limits.project.projectId.minLength}
              maxLength={limits.project.projectId.maxLength}
              pattern={limits.project.projectId.pattern}
              title="Project ID must be alphanumeric and uppercase (hyphens allowed)"
              disabled={!!editingProjectId}
              placeholder="e.g. PRJ-001"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value.toUpperCase())}
              className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${editingProjectId
                ? darkMode
                  ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60 cursor-not-allowed'
                  : 'bg-slate-50/40 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                : darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                  : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
            />
          </div>

          <div className="space-y-2 text-left sm:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jira ID <span className="text-[10px] lowercase text-slate-500">(optional)</span></label>
            <input
              type="text"
              maxLength={limits.project.jiraId.maxLength}
              pattern={limits.project.jiraId.pattern}
              title="Jira ID must start with an uppercase letter and be uppercase alphanumeric"
              placeholder="e.g. SP"
              value={jiraId || ''}
              onChange={(e) => setJiraId && setJiraId(e.target.value.toUpperCase())}
              className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
            />
          </div>

          <div className="space-y-2 text-left sm:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              minLength={limits.project.name.minLength}
              maxLength={limits.project.name.maxLength}
              placeholder="Enter project name..."
              value={name} p
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
            />
          </div>
        </div>

        {/* Jira ID Note - Spanning full width */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Info className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-500 leading-relaxed">
            <span className="font-black uppercase tracking-wider">Note for Jira Integration:</span> Jira API endpoints expect the Jira ID / Project Key to be purely in <strong className="font-black">CAPITAL LETTERS</strong>.
            <span className="ml-2 opacity-90">
              <strong>Example API Model:</strong>
              <code className="ml-1.5 px-2 py-0.5 rounded-md bg-blue-500/15 font-mono text-[10px] font-bold text-blue-800 dark:text-blue-500 border border-blue-500/20 shadow-sm">
                GET /rest/api/3/project/SP
              </code>
            </span>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
          <textarea
            rows="3"
            minLength={limits.project.description.minLength}
            maxLength={limits.project.description.maxLength}
            placeholder="Brief description of the project scope and deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none resize-none ${darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
              : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
              }`}
          />
        </div>
      </div>

      {/* Project Type, Status & Team Size */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Type Selection */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Type <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {['AGILE', 'WATERFALL'].map((t) => {
              const isEditing = !!editingProjectId;
              const isSelected = type === t;
              return (
                <button
                  type="button"
                  key={t}
                  disabled={isEditing}
                  onClick={() => !isEditing && setType(t)}
                  className={`py-3.5 rounded-2xl border text-xs font-bold transition-all ${isEditing
                    ? isSelected
                      ? darkMode
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-500/70 opacity-80 cursor-not-allowed'
                        : 'bg-orange-50/5 border-orange-500/20 text-orange-500/70 opacity-80 cursor-not-allowed'
                      : darkMode
                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                        : 'bg-slate-50/40 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                    : isSelected
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-500 cursor-pointer'
                      : darkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'
                    }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Selection */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status <span className="text-rose-500">*</span></label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-bold transition-all outline-none ${darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
              }`}
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Target Team Size */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Team Size <span className="text-rose-500">*</span></label>
          <input
            type="number"
            required
            min={limits.project.teamSize.min}
            max={limits.project.teamSize.max}
            placeholder="0"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
              }`}
          />
        </div>
      </div>
    </>
  );
}
