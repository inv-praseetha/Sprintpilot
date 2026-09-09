import React, { useState } from 'react';
import { Briefcase, ChevronUp, ChevronDown, Clock, Calendar, Code } from 'lucide-react';
import { getEffectiveSkills } from '../../pages/private/projectcreation';

export default function ProjectOverviewCard({ project, darkMode }) {
  const [detailsExpanded, setDetailsExpanded] = useState(true);

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
        onClick={() => setDetailsExpanded(!detailsExpanded)}
        className={`w-full p-6 flex justify-between items-center transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-850/30' : 'hover:bg-slate-50/50'
          }`}
      >
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-orange-500" />
          <h3 className="font-extrabold text-base tracking-tight">Project Overview & Properties</h3>
        </div>
        {detailsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {detailsExpanded && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-850 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Type, Timeline, Duration */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">Timeline & Model</h4>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-xs text-slate-400 font-bold truncate">Project Type</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider truncate max-w-[150px] ${project.type === 'AGILE'
                      ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                    }`}>
                    {project.type}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-xs text-slate-400 font-bold truncate">
                    {project.type === 'AGILE' ? 'Agile Duration' : 'Waterfall Timeline'}
                  </span>
                  <span className="text-sm font-extrabold mt-0.5 block truncate max-w-[250px]">
                    {project.type === 'AGILE'
                      ? `${project.number_of_days} Days`
                      : `${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Stakeholders (Lead & Creator) */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">Stakeholders</h4>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500 font-black text-xs">
                  {getInitials(project.team_lead?.full_name)}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Team Lead</span>
                  <span className="text-sm font-extrabold block truncate max-w-[200px]">
                    {project.team_lead?.full_name || 'Unassigned'}
                  </span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 font-medium block truncate max-w-[150px]" title={project.team_lead?.email}>
                    {project.team_lead?.email || ''}
                  </span>
                </div>
              </div>

              {project.created_by && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-500 font-black text-xs">
                    {getInitials(project.created_by.full_name)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Created By</span>
                    <span className="text-sm font-extrabold block truncate max-w-[200px]">
                      {project.created_by.full_name}
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-medium block truncate max-w-[150px]" title={project.created_by.email}>
                      {project.created_by.email}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tech Stack Skills */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">Required Skills</h4>

              {(() => {
                const effectiveSkills = getEffectiveSkills(project);
                const uniqueCats = Array.from(new Set(effectiveSkills.map(s => s.category).filter(Boolean)));
                return (
                  <div className="space-y-3">
                    {/* Unique Categories */}
                    {uniqueCats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-7 max-h-16 overflow-y-auto pr-2 custom-scrollbar">
                        {uniqueCats.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-orange-500/10 rounded-md text-orange-500 border border-orange-500/20"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Code className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {effectiveSkills.length > 0 ? (
                          effectiveSkills.map((skill) => (
                            <span
                              key={skill.id}
                              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-orange-500/10 rounded-lg text-orange-550 border border-orange-500/20"
                            >
                              {skill.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-extrabold text-slate-400">No specific skills listed.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Administrative metadata / limits */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">Properties & Allocation</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Created On</span>
                  <span className="text-xs font-extrabold block mt-0.5">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Last Updated</span>
                  <span className="text-xs font-extrabold block mt-0.5">
                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Allocation Capacity</span>
                <span className="inline-block text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1 truncate max-w-[150px]">
                  {project.members?.length || 0} / {project.team_size || 0} Members
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
