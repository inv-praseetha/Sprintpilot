import React from 'react';
import { AlertCircle, Code, Check, Users, Loader2 } from 'lucide-react';

export default function ProjectForm({
  handleSubmit,
  formError,
  darkMode,
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  status,
  setStatus,
  teamSize,
  setTeamSize,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  numberOfDays,
  setNumberOfDays,
  teamLead,
  setTeamLead,
  teamLeads,
  skillCategoryFilter,
  setSkillCategoryFilter,
  filteredSkills,
  selectedSkills,
  toggleSkillSelection,
  filteredEmployeesForSelection,
  selectedMembers,
  toggleMemberSelection,
  onClose,
  submitting,
  editingProjectId
}) {
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
      
      {/* Form Feedback */}
      {formError && (
        <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Name & Description */}
      <div className="space-y-4">
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Project Name *</label>
          <input
            type="text"
            required
            placeholder="Enter project name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>

        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Description</label>
          <textarea
            rows="3"
            placeholder="Brief description of the project scope and deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none resize-none ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                : 'bg-slate-50 border-slate-105 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Project Type, Status & Team Size */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Type Selection */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Project Type *</label>
          <div className="grid grid-cols-2 gap-3">
            {['AGILE', 'WATERFALL'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  type === t
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-500'
                    : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                      : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Status Selection */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-bold transition-all outline-none ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Target Team Size */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Target Team Size</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Dates & Duration Offset */}
      {type === 'WATERFALL' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                    : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                    : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
              />
            </div>
          </div>
          {startDate && endDate && new Date(endDate) > new Date(startDate) && (
            <div className="text-xs font-extrabold text-orange-500 text-left pl-1">
              Calculated Duration: {Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} Days
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Duration (Days) *</label>
          <input
            type="number"
            required
            placeholder="10"
            value={numberOfDays}
            onChange={(e) => setNumberOfDays(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500' 
                : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>
      )}

      {/* Team Lead Selection */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Team Lead *</label>
        <select
          required
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
            darkMode 
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

      {/* Tech Stack / Skills Category Selector & Multi-Select */}
      <div className="space-y-3.5 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
            <Code className="w-4.5 h-4.5 text-slate-400" /> Technical Skills Required
          </label>
          
          {/* Category Selection Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'UI', 'QA', 'INFRA', 'BACKEND'].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSkillCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all border cursor-pointer ${
                  skillCategoryFilter === cat
                    ? 'bg-orange-500 text-white border-orange-500'
                    : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-450 hover:text-slate-300'
                      : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Checklist grid */}
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60 max-h-40 overflow-y-auto">
          {filteredSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill.id);
            return (
              <button
                type="button"
                key={skill.id}
                onClick={() => toggleSkillSelection(skill.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                    : darkMode
                      ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-white border border-slate-150 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{skill.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
          {filteredSkills.length === 0 && (
            <span className="text-xs text-slate-400 font-semibold italic">No skills available in this category</span>
          )}
        </div>
      </div>

      {/* Members Selection Checklist (Dynamically filtered by selected skills) */}
      <div className="space-y-2 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <label className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-slate-400" /> Team Members Allocation
          </label>
          {selectedSkills.length > 0 && (
            <span className="text-[10px] text-orange-500 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md">
              Filtered by selected skills
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60">
          {filteredEmployeesForSelection.map((empProfile) => {
            const isSelected = selectedMembers.includes(empProfile.id);
            return (
              <div
                key={empProfile.id}
                onClick={() => toggleMemberSelection(empProfile.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-orange-500/40 bg-orange-500/[0.04]'
                    : darkMode
                      ? 'border-slate-850 hover:bg-slate-900 bg-slate-900/60'
                      : 'border-slate-150 hover:bg-slate-50 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7.5 h-7.5 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-800">
                    {empProfile.user?.full_name ? empProfile.user.full_name.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0 text-left">
                    <span className="text-xs font-bold block text-slate-500 dark:text-slate-300 truncate">
                      {empProfile.user?.full_name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold truncate">
                        {empProfile.designation || 'Developer'}
                      </span>
                      {selectedSkills.length > 0 && empProfile.skills && (
                        <div className="flex flex-wrap gap-1">
                          {empProfile.skills
                            .filter((s) => selectedSkills.includes(s.id))
                            .map((s) => (
                              <span
                                key={s.id}
                                className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20"
                              >
                                {s.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : darkMode
                      ? 'border-slate-800 bg-slate-950'
                      : 'border-slate-200 bg-white'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
          {filteredEmployeesForSelection.length === 0 && (
            <span className="text-xs text-slate-455 font-bold italic col-span-2 py-4">
              No matching employees found with selected skills.
            </span>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <button
          type="button"
          onClick={onClose}
          className={`px-5.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
            darkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-350'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-6.5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/20 cursor-pointer animate-fade-in"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{editingProjectId ? 'Save Changes' : 'Create Project'}</span>
        </button>
      </div>

    </form>
  );
}
