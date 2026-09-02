import React, { useState, useMemo } from 'react';
import { Code, Check, Users, AlertCircle, X } from 'lucide-react';
import { useValidationLimits } from '../../../hooks/useValidationLimits';
import { useToast } from '../../../context/ToastContext';

export default function TeamSelectionSection({
  darkMode,
  editingProjectId,
  teamLead,
  setTeamLead,
  teamLeads,
  skillCategoryFilter,
  setSkillCategoryFilter,
  filteredSkills,
  selectedSkills,
  toggleSkillSelection,
  filteredEmployeesForSelection,
  employees,
  selectedMembers,
  toggleMemberSelection,
  teamSize
}) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const limits = useValidationLimits();
  const toast = useToast();

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
        toast.error(`Cannot select more members. Team size limit of ${limit} reached.`);
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
    <>
      {/* Team Lead Selection */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Lead <span className="text-rose-500">*</span></label>
        <select
          required
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
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
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all border cursor-pointer ${skillCategoryFilter === cat
                      ? 'bg-orange-500 text-white border-orange-500'
                      : darkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isSelected
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
                <span className={`text-[11px] font-extrabold normal-case px-1.5 py-0.5 rounded-md ${filteredEmployeesForSelection.length === 0
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
                className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${darkMode
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
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${darkMode
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
                  className={`mt-2 p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${darkMode
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
                        maxLength={limits.general.search.maxLength}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full px-3 py-1.5 pl-8 rounded-xl border text-xs font-semibold outline-none focus:border-orange-500 transition-colors ${darkMode
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
                            className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all border-b last:border-0 border-slate-100/50 dark:border-slate-800/30 ${darkMode
                              ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox */}
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-all ${isSelected
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-300 hover:border-slate-400')
                                }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              {/* Info Column */}
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-black dark:text-white truncate" style={{ color: darkMode ? 'white' : 'black' }}>
                                    {empProfile.user?.full_name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${empProfile.status === 'BUSY'
                                    ? (darkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-500/10 text-amber-600')
                                    : empProfile.status === 'ACTIVE'
                                      ? (darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-500/10 text-emerald-600')
                                      : (darkMode ? 'bg-indigo-500/10 text-indigo-500' : 'bg-indigo-500/10 text-indigo-600')
                                    }`}>
                                    {empProfile.status || 'ACTIVE'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-500 font-medium">
                                  <span className="truncate max-w-[120px] font-bold text-slate-500 dark:text-slate-400">
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
                                      className={`px-1 rounded text-[7px] font-black uppercase border transition-colors ${darkMode
                                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
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
    </>
  );
}
