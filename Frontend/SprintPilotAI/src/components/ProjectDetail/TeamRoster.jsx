import React, { useState, useMemo } from 'react';
import { Users, ChevronUp, ChevronDown, Pencil, Trash2, UserPlus } from 'lucide-react';

export default function TeamRoster({
  project,
  darkMode,
  employees,
  isProjectManager,
  setShowAddMembersModal,
  setShowEditLeadModal,
  handleRemoveMember
}) {
  const [rosterExpanded, setRosterExpanded] = useState(true);
  
  // Pagination State
  const rosterPageSize = 5;
  const [rosterPage, setRosterPage] = useState(1);
  
  const paginatedMembers = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return project?.members?.slice(start, start + rosterPageSize) || [];
  }, [project, rosterPage]);
  
  const totalRosterPages = Math.ceil((project?.members?.length || 0) / rosterPageSize);

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

  return (
    <div className={`rounded-3xl border overflow-hidden mb-8 transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
      <button
        onClick={() => setRosterExpanded(!rosterExpanded)}
        className={`w-full p-6 flex justify-between items-center transition-colors ${darkMode ? 'hover:bg-slate-850/30' : 'hover:bg-slate-50/50'
          }`}
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-orange-500" />
          <h3 className="font-extrabold text-base tracking-tight">Active Team Roster</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">
            {(project?.team_lead ? 1 : 0) + (project?.members?.length || 0)} Member(s) assigned
          </span>
          {rosterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {rosterExpanded && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-850">
          {(project?.team_lead || (project?.members && project.members.length > 0)) ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'} uppercase font-black tracking-wider text-[10px]`}>
                      <th className="py-4 px-4 font-bold">Member</th>
                      <th className="py-4 px-4 font-bold">Role</th>
                      <th className="py-4 px-4 font-bold">Status</th>
                      <th className="py-4 px-4 font-bold">Matching Skills</th>
                      {isProjectManager && project?.status !== 'COMPLETED' && <th className="py-4 px-4 text-right font-bold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850' : 'divide-slate-50'}`}>
                    {/* Team Lead Row */}
                    {project?.team_lead && (
                      <tr className={`transition-all ${darkMode ? 'hover:bg-slate-850/20' : 'hover:bg-slate-50/40'}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs shrink-0">
                              {getInitials(project.team_lead.full_name)}
                            </div>
                            <div>
                              <span className={`block font-extrabold text-sm truncate max-w-[150px] ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {project.team_lead.full_name}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">
                                {project.team_lead.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 truncate max-w-[100px] inline-block">
                            Team Lead
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {(() => {
                            const leadProfile = employees?.find(emp => emp.user.id === project.team_lead?.id);
                            const leadStatus = leadProfile?.status || 'ACTIVE';
                            return (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider truncate max-w-[100px] inline-block ${leadStatus === 'BUSY'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'
                                  : leadStatus === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                }`}>
                                {leadStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-slate-400 font-bold">—</span>
                        </td>
                        {isProjectManager && project?.status !== 'COMPLETED' && (
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setShowEditLeadModal(true)}
                              className="p-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
                              title="Edit Team Lead"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )}

                    {/* Members Rows */}
                    {paginatedMembers && paginatedMembers.map((member) => (
                      <tr key={member.id} className={`transition-all ${darkMode ? 'hover:bg-slate-850/20' : 'hover:bg-slate-50/40'}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs shrink-0">
                              {getInitials(member.user.full_name)}
                            </div>
                            <div>
                              <span className={`block font-extrabold text-sm truncate max-w-[150px] ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {member.user.full_name}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">
                                {member.user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 truncate max-w-[150px] inline-block">
                            {member.designation || 'Team Member'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${member.status === 'BUSY'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'
                              : member.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}>
                            {member.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {project?.skills && project.skills.length > 0 && member.skills && member.skills.some(s => project.skills.some(ps => ps.id === s.id)) ? (
                            <div className="flex flex-wrap gap-1">
                              {member.skills
                                .filter((s) => project.skills.some((ps) => ps.id === s.id))
                                .map((s) => (
                                  <span
                                    key={s.id}
                                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-orange-500/10 text-orange-655 dark:text-orange-400 border border-orange-500/20"
                                  >
                                    {s.name}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">—</span>
                          )}
                        </td>
                        {isProjectManager && project?.status !== 'COMPLETED' && (
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {project?.members && project.members.length > rosterPageSize && (
                <div className={`px-6 py-4 flex items-center justify-between border-t transition-colors ${darkMode ? 'border-slate-850 bg-slate-900/60' : 'border-slate-100 bg-slate-50/30'
                  }`}>
                  <div className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Showing page <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{rosterPage}</span> of <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{totalRosterPages}</span> ({project.members.length} members)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                      disabled={rosterPage === 1}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${rosterPage > 1
                          ? darkMode
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
                            : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-705 cursor-pointer shadow-sm shadow-slate-100/50'
                          : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        }`}
                    >
                      Previous
                    </button>

                    {/* Dynamic Page Numbers */}
                    {Array.from({ length: totalRosterPages }, (_, i) => i + 1).map((p) => {
                      const isSelected = p === rosterPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRosterPage(p)}
                          className={`w-8 h-8 rounded-xl border text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${isSelected
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/15'
                              : darkMode
                                ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-900'
                                : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-700 hover:bg-slate-50 shadow-sm shadow-slate-100/50'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                      disabled={rosterPage === totalRosterPages}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${rosterPage < totalRosterPages
                          ? darkMode
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
                            : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-750 cursor-pointer shadow-sm shadow-slate-100/50'
                          : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-750 mb-3" />
              <h5 className="font-extrabold text-slate-400 text-sm">No Members Added Yet</h5>
              <p className="text-xs text-slate-400 mt-1 mb-4">Add members to start collaborating on this project.</p>
              {isProjectManager && (
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Add First Member
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
