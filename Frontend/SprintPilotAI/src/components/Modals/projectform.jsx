import React, { useState, useMemo } from 'react';
import { AlertCircle, Code, Check, Users, Loader2, X } from 'lucide-react';

export default function ProjectForm({
  handleSubmit,
  formError,
  calculateEndDate,
  darkMode,
  projectId,
  setProjectId,
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
  employees = [],
  selectedMembers,
  toggleMemberSelection,
  onClose,
  submitting,
  editingProjectId
}) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const displayedEmployees = useMemo(() => {
    if (!memberSearchQuery) return filteredEmployeesForSelection;
    return filteredEmployeesForSelection.filter(emp =>
      emp.user?.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      emp.user?.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );
  }, [filteredEmployeesForSelection, memberSearchQuery]);

  const handleSelectAll = () => {
    const allIds = displayedEmployees.map(e => e.id);
    const allSelected = allIds.every(id => selectedMembers.includes(id));
    if (allSelected) {
      allIds.forEach(id => {
        if (selectedMembers.includes(id)) {
          toggleMemberSelection(id);
        }
      });
    } else {
      const limit = parseInt(teamSize, 10) || 0;
      const currentCount = selectedMembers.length;
      const remaining = limit - currentCount;
      if (limit > 0 && remaining <= 0) {
        alert(`Cannot select more members. Team size limit of ${limit} reached.`);
        return;
      }
      let count = 0;
      displayedEmployees.forEach(emp => {
        if (!selectedMembers.includes(emp.id)) {
          if (limit === 0 || count < remaining) {
            toggleMemberSelection(emp.id);
            count++;
          }
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">

      {/* Form Feedback */}
      {formError && (
        <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* ID, Name & Description */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 text-left sm:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project ID *</label>
            <input
              type="text"
              required
              disabled={!!editingProjectId}
              placeholder="e.g. PRJ-001"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
                editingProjectId
                  ? darkMode
                    ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60 cursor-not-allowed'
                    : 'bg-slate-50/40 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                  : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500 focus:bg-white'
              }`}
            />
          </div>

          <div className="space-y-2 text-left sm:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Name *</label>
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
        </div>

        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
          <textarea
            rows="3"
            placeholder="Brief description of the project scope and deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none resize-none ${
              darkMode
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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Type *</label>
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
                  className={`py-3.5 rounded-2xl border text-xs font-bold transition-all ${
                    isEditing
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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-bold transition-all outline-none ${
              darkMode
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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Team Size</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
              darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Dates & Duration Offset */}
      {type === 'WATERFALL' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
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
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (Days) *</label>
              <input
                type="number"
                required
                placeholder="10"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
                className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
                }`}
              />
            </div>
          </div>
          {startDate && numberOfDays && parseInt(numberOfDays, 10) > 0 && calculateEndDate && (
            <div className="text-xs font-extrabold text-orange-500 text-left pl-1">
              Calculated End Date: {calculateEndDate(startDate, numberOfDays)} (Mon to Fri Working Days)
            </div>
          )}
        </div>
      )}

      {/* Team Lead Selection */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Lead *</label>
        <select
          required
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
            darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Code className="w-4.5 h-4.5 text-slate-400" /> Technical Stack Required
          </label>

          {/* Category Selection Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'UI', 'BACKEND'].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSkillCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all border cursor-pointer ${
                  skillCategoryFilter === cat
                    ? 'bg-orange-500 text-white border-orange-500'
                    : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-350'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Checklist grid */}
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60 max-h-40 overflow-y-auto">
          {filteredSkills.filter((s) => !s.parent).map((skill) => {
            const isSelected = selectedSkills.some(id => String(id) === String(skill.id));
            return (
              <button
                type="button"
                key={skill.id}
                onClick={() => {
                  toggleSkillSelection(skill.id);
                  setShowMemberDropdown(true);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                    : darkMode
                      ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{skill.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
          {filteredSkills.filter((s) => !s.parent).length === 0 && (
            <span className="text-xs text-slate-400 font-semibold italic">No skills available in this category</span>
          )}
        </div>
      </div>

      {/* Members Selection Checklist (Dynamically filtered by selected skills) */}
      <div className="space-y-3.5 text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex flex-wrap items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-slate-400" />
            <span>Team Members Allocation ({selectedMembers.length}/{teamSize || 0})</span>
            <span className={`text-[11px] font-extrabold normal-case px-1.5 py-0.5 rounded-md ${
              filteredEmployeesForSelection.length === 0
                ? 'text-rose-500 bg-rose-500/10'
                : darkMode ? 'text-slate-400 bg-slate-950 border border-slate-800' : 'text-slate-500 bg-slate-100 border border-slate-200'
            }`}>
              {filteredEmployeesForSelection.length} matching candidates available
            </span>
          </label>
          {selectedSkills.length > 0 && (
            <span className="text-[10px] text-orange-500 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md">
              Filtered by selected skills
            </span>
          )}
        </div>

        {teamSize && selectedMembers.length > parseInt(teamSize, 10) && (
          <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1 pl-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Allocated members exceed team size limit of {teamSize}
          </div>
        )}

        {/* Dropdown Container */}
        <div className="relative">
          {/* Dropdown Trigger */}
          <div
            onClick={() => setShowMemberDropdown(!showMemberDropdown)}
            className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
              darkMode
                ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
            } ${showMemberDropdown ? 'border-orange-500 ring-2 ring-orange-500/15' : ''}`}
          >
            <div className="flex flex-wrap gap-1.5 items-center min-w-0 pr-6">
              {selectedMembers.length === 0 ? (
                <span className="text-xs text-slate-400 font-medium">Select team members...</span>
              ) : (
                selectedMembers.map(id => {
                  const emp = employees.find(e => e.id === id) || filteredEmployeesForSelection.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <span
                      key={id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMemberSelection(id);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        darkMode
                          ? 'bg-orange-950/40 border-orange-500/30 text-orange-400 hover:bg-orange-900/30'
                          : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100/50'
                      }`}
                    >
                      {emp.user?.full_name}
                      <X className="w-2.5 h-2.5 cursor-pointer" />
                    </span>
                  );
                })
              )}
            </div>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${showMemberDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Dropdown Popover */}
          {showMemberDropdown && (
            <div
              className={`mt-2 p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                darkMode
                  ? 'bg-slate-950/40 border-slate-800 text-white'
                  : 'bg-slate-50/50 border-slate-200 text-slate-800'
              }`}
            >
                {/* Search & Actions Panel */}
                <div className="flex items-center justify-between gap-3 border-b pb-2.5 border-slate-100 dark:border-slate-800">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search candidates by name, email, or designation..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full px-3 py-1.5 pl-8 rounded-xl border text-xs font-semibold outline-none focus:border-orange-500 transition-colors ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <svg
                      className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {displayedEmployees.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAll();
                      }}
                      className="text-[10px] font-bold text-orange-500 dark:text-orange-400 hover:underline cursor-pointer bg-transparent border-none outline-none shrink-0"
                    >
                      {displayedEmployees.every(e => selectedMembers.includes(e.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Candidate Checklist */}
                <div className="flex flex-col max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {displayedEmployees.length > 0 ? (
                    displayedEmployees.map((empProfile) => {
                      const isSelected = selectedMembers.includes(empProfile.id);
                      return (
                        <div
                          key={empProfile.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMemberSelection(empProfile.id);
                          }}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all border-b last:border-0 border-slate-100/50 dark:border-slate-800/30 ${
                            darkMode
                              ? 'bg-slate-900/60 hover:bg-slate-850 text-slate-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                              isSelected
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-300 hover:border-slate-400')
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            {/* Info Column */}
                            <div className="min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {empProfile.user?.full_name}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  empProfile.status === 'BUSY'
                                    ? (darkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-500/10 text-amber-655')
                                    : empProfile.status === 'ACTIVE'
                                      ? (darkMode ? 'bg-emerald-500/10 text-emerald-450' : 'bg-emerald-500/10 text-emerald-600')
                                      : (darkMode ? 'bg-indigo-500/10 text-indigo-450' : 'bg-indigo-500/10 text-indigo-600')
                                }`}>
                                  {empProfile.status || 'ACTIVE'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-455 dark:text-slate-500 font-medium">
                                <span className="truncate max-w-[120px] font-bold text-slate-450 dark:text-slate-400">
                                  {empProfile.designation || 'Developer'}
                                </span>
                                <span>•</span>
                                <span className="truncate max-w-[180px]">
                                  {empProfile.user?.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Skills Column */}
                          {selectedSkills.length > 0 && empProfile.skills && (
                            <div className="flex flex-wrap gap-1 max-w-[150px] justify-end shrink-0">
                              {empProfile.skills
                                .filter((s) => selectedSkills.some(skillId => String(skillId) === String(s.id)))
                                .map((s) => (
                                  <span
                                    key={s.id}
                                    className={`px-1 rounded text-[7px] font-black uppercase border transition-colors ${
                                      darkMode
                                        ? 'bg-slate-800 text-slate-450 border-slate-750'
                                        : 'bg-slate-100 text-slate-550 border-slate-200'
                                    }`}
                                  >
                                    {s.name}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold bg-white dark:bg-slate-900 col-span-2">
                      No matching candidates found
                    </div>
                  )}
                </div>
            </div>
          )}
        </div>
        {filteredEmployeesForSelection.length === 0 && (
          <span className="text-xs text-slate-400 font-bold italic block py-4 pl-1">
            No matching employees found with selected skills.
          </span>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className={`px-5.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
            darkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold'
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
