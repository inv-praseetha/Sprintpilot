import React, { useState, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function ReassignTasksModal({
  isOpen,
  onClose,
  darkMode,
  members,
  oldMemberId,
  onConfirmReassign,
  allEmployees,
  projectSkills
}) {
  const [selectedInternalId, setSelectedInternalId] = useState('');
  const [selectedExternalId, setSelectedExternalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter external members based on skills (Must be before early return to follow Rules of Hooks)
  const externalEligibleMembers = useMemo(() => {
    if (!allEmployees || !members) return [];
    
    const currentMemberIds = members.map(m => m.id);
    
    return allEmployees.filter(emp => {
      // Must not be already in the project
      if (currentMemberIds.includes(emp.id)) return false;
      if (emp.id === oldMemberId) return false;
      if (emp.user?.role === 'TEAM_LEAD') return false;
      
      // Must match at least one project skill if project has skills
      const hasSkills = projectSkills && projectSkills.length > 0;
      if (!hasSkills) return true;
      
      return emp.skills && emp.skills.some(skill => 
        projectSkills.some(ps => ps.id === skill.id || ps.parent === skill.id || ps.id === skill.parent)
      );
    });
  }, [allEmployees, members, projectSkills, oldMemberId]);

  if (!isOpen) return null;

  // Filter out the member being removed so they can't reassign to themselves
  const eligibleMembers = members.filter(m => m.id !== oldMemberId);
  const oldMember = members.find(m => m.id === oldMemberId);



  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalId = selectedInternalId || selectedExternalId;
    if (!finalId) return;

    setIsSubmitting(true);
    await onConfirmReassign(oldMemberId, finalId);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
          <div>
            <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reassign Active Tasks</h3>
            <p className="text-xs text-slate-400 mt-1">
              {oldMember?.user?.full_name} has active tasks. Reassign them before removing.
            </p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select From Project Members
            </label>
            <select
              value={selectedInternalId}
              onChange={(e) => {
                setSelectedInternalId(e.target.value);
                setSelectedExternalId(''); // clear the other
              }}
              className={`w-full p-3 rounded-xl border text-sm font-semibold outline-none transition-colors ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              required={!selectedExternalId}
            >
              <option value="" disabled>-- Select a project member --</option>
              {eligibleMembers.map(m => (
                <option key={`internal-${m.id}`} value={m.id}>{m.user.full_name} ({m.designation || 'Member'})</option>
              ))}
            </select>
          </div>

          {externalEligibleMembers.length > 0 && (
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Or Select Other Eligible Employee
              </label>
              <select
                value={selectedExternalId}
                onChange={(e) => {
                  setSelectedExternalId(e.target.value);
                  setSelectedInternalId(''); // clear the other
                }}
                className={`w-full p-3 rounded-xl border text-sm font-semibold outline-none transition-colors ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                required={!selectedInternalId}
              >
                <option value="" disabled>-- Select an external employee --</option>
                {externalEligibleMembers.map(m => (
                  <option key={`external-${m.id}`} value={m.id}>{m.user.full_name} ({m.designation || 'Employee'})</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={!(selectedInternalId || selectedExternalId) || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-black uppercase transition-all"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Remove Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
