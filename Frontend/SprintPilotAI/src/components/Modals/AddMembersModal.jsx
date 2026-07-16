import React, { useState, useMemo } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function AddMembersModal({
  show,
  onClose,
  darkMode,
  employees,
  project,
  onAddMembers,
  updatingMembers,
  modalError,
  setModalError
}) {
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Get Initials for Avatar
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Filter out employees already inside the project for multi-select
  const availableEmployees = useMemo(() => {
    if (!employees || !project) return [];
    const currentMemberUserIds = (project.members || []).map(m => m.user.id);
    return employees.filter(emp => {
      const isLead = project.team_lead?.id === emp.user.id;
      const isMember = currentMemberUserIds.includes(emp.user.id);
      const matchesSearch = emp.user.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(memberSearchQuery.toLowerCase());

      // Only show employees with matching skills if project has required skills
      const projectSkills = project.skills || [];
      const hasSkills = projectSkills.length > 0;
      const matchesSkills = !hasSkills || (emp.skills && emp.skills.some(skill =>
        projectSkills.some(projectSkill =>
          projectSkill.id === skill.id ||
          projectSkill.parent === skill.id ||
          projectSkill.id === skill.parent
        )
      ));
      const isAvailableStatus = emp.status === 'ACTIVE' || emp.status === 'WFM';

      return !isLead && !isMember && matchesSearch && matchesSkills && isAvailableStatus;
    });
  }, [employees, project, memberSearchQuery]);

  const toggleSelectNewMember = (profileId) => {
    setSelectedNewMembers(prev => {
      const isSelected = prev.includes(profileId);
      if (isSelected) {
        if (setModalError) setModalError(null);
        return prev.filter(id => id !== profileId);
      }
      
      const currentCount = (project.members || []).length;
      const limit = project.team_size || 0;
      if (currentCount + prev.length >= limit) {
        if (setModalError) {
          setModalError(`Cannot select more members. Team size limit of ${limit} reached.`);
        }
        return prev;
      }
      if (setModalError) setModalError(null);
      return [...prev, profileId];
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (selectedNewMembers.length === 0) return;
    
    const currentCount = (project.members || []).length;
    const limit = project.team_size || 0;
    const totalCount = currentCount + selectedNewMembers.length;
    
    if (totalCount > limit) {
      if (setModalError) {
        setModalError(`Cannot allocate more members than the project team size of ${limit}. You have ${currentCount} current members and selected ${selectedNewMembers.length} new members (total ${totalCount}).`);
      }
      return;
    }
    
    onAddMembers(selectedNewMembers, () => {
      // Success callback to reset local state
      setSelectedNewMembers([]);
      setMemberSearchQuery('');
    });
  };

  const handleClose = () => {
    setSelectedNewMembers([]);
    setMemberSearchQuery('');
    if (setModalError) setModalError(null);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
          <div className="text-left">
            <h3 className="font-extrabold text-base tracking-tight">Add Team Members</h3>
            <p className="text-xs text-slate-400">Select employees to allocate to this project</p>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & List */}
        <form onSubmit={handleFormSubmit}>
          <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or role..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className={`w-full pl-3 pr-3 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:border-orange-500 transition-colors ${darkMode
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-white border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* Selected Members Chips */}
            {selectedNewMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/[0.02] text-left">
                {selectedNewMembers.map(id => {
                  const emp = employees.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-655 dark:text-orange-400 border border-orange-500/20 text-[10px] font-black"
                    >
                      <span>{emp.user.full_name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNewMembers(prev => prev.filter(mid => mid !== id));
                          if (setModalError) setModalError(null);
                        }}
                        className="hover:text-orange-700 dark:hover:text-orange-300 transition-colors bg-transparent border-none outline-none cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Select All Toggle */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Available Candidates ({availableEmployees.length})
              </span>
              {availableEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allIds = availableEmployees.map(e => e.id);
                    const allSelected = allIds.every(id => selectedNewMembers.includes(id));
                    if (allSelected) {
                      setSelectedNewMembers(prev => prev.filter(id => !allIds.includes(id)));
                      if (setModalError) setModalError(null);
                    } else {
                      const currentCount = (project.members || []).length;
                      const limit = project.team_size || 0;
                      const remaining = limit - currentCount;
                      if (remaining <= 0) {
                        if (setModalError) {
                          setModalError(`Cannot select more members. Team size limit of ${limit} reached.`);
                        }
                        return;
                      }
                      const toSelect = allIds.filter(id => !selectedNewMembers.includes(id)).slice(0, remaining);
                      if (toSelect.length < allIds.filter(id => !selectedNewMembers.includes(id)).length) {
                        if (setModalError) {
                          setModalError(`Selected only ${toSelect.length} member(s) to match the team size limit of ${limit}.`);
                        }
                      } else {
                        if (setModalError) setModalError(null);
                      }
                      setSelectedNewMembers(prev => [...prev, ...toSelect]);
                    }
                  }}
                  className="text-[10px] font-bold text-orange-550 dark:text-orange-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
                >
                  {availableEmployees.every(e => selectedNewMembers.includes(e.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Employees List */}
            <div className="space-y-2">
              {availableEmployees.length > 0 ? (
                availableEmployees.map((emp) => {
                  const isSelected = selectedNewMembers.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleSelectNewMember(emp.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                        ? 'border-orange-500 bg-orange-500/5'
                        : darkMode
                          ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                        }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs border transition-colors ${isSelected
                          ? 'bg-orange-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400'
                          : 'bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/80'
                          }`}>
                          {getInitials(emp.user.full_name)}
                        </div>
                        <div>
                          <span className="block text-xs font-black text-slate-800 dark:text-white">
                            {emp.user.full_name}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {emp.designation}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${emp.status === 'BUSY'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20'
                              : emp.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20'
                              }`}>
                              {emp.status || 'ACTIVE'}
                            </span>
                            {project.skills && project.skills.length > 0 && emp.skills && (
                              <div className="flex flex-wrap gap-1">
                                {emp.skills
                                  .filter((s) => project.skills.some(ps => ps.id === s.id))
                                  .map((s) => (
                                    <span
                                      key={s.id}
                                      className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selected Check Indicator */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isSelected
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                        }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">
                  No other eligible employees found.
                </div>
              )}
            </div>
          </div>

          {modalError && (
            <div className="mx-6 mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-600 dark:text-rose-455 font-bold leading-normal">
                {modalError}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-150 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-100/30">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingMembers || selectedNewMembers.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/10 cursor-pointer"
            >
              {updatingMembers ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                `Add ${selectedNewMembers.length} member(s)`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
