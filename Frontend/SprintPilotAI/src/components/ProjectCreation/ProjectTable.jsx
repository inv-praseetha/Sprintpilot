import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Edit, Trash2 } from 'lucide-react';
import { getEffectiveSkills } from '../../pages/private/projectcreation';

export default function ProjectTable({
  filteredProjects,
  darkMode,
  isProjectManager,
  handleRowClick,
  handleStatusChange,
  handleEditProject,
  handleDeleteProject
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold text-left uppercase tracking-wider select-none">
            <th className="py-5 px-6">Project Details</th>
            <th className="py-5 px-4">Type</th>
            <th className="py-5 px-4">Status</th>
            <th className="py-5 px-4">Timeline</th>
            <th className="py-5 px-4">Team Lead</th>
            <th className="py-5 px-4">Tech Stack</th>
            <th className="py-5 px-6 text-right">Team Size</th>
            {isProjectManager && <th className="py-5 px-6 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
          {filteredProjects.map((project) => (
            <tr
              key={project.id}
              onClick={(e) => handleRowClick(e, project.id)}
              className="text-sm font-semibold transition-colors hover:bg-slate-50/20 dark:hover:bg-slate-900/10 cursor-pointer"
            >
              {/* Project Title & Description */}
              <td className="py-5 px-6 max-w-sm">
                <div className="space-y-1">
                  <span className={`block font-extrabold text-base tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      {project.name}
                    </Link>
                  </span>
                  <span className="block text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </span>
                </div>
              </td>

              {/* Type Badge */}
              <td className="py-5 px-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] inline-block ${project.type === 'AGILE'
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                  : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                  }`}>
                  {project.type}
                </span>
              </td>

              {/* Status Badge / Dropdown */}
              <td className="py-5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                {isProjectManager ? (
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all outline-none ${project.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20'
                      : project.status === 'ON_HOLD'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/25 hover:bg-amber-500/20'
                        : 'bg-slate-500/10 text-slate-700 border-slate-500/25 hover:bg-slate-500/20'
                      }`}
                  >
                    <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ACTIVE</option>
                    <option value="ON_HOLD" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ON HOLD</option>
                    <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">COMPLETED</option>
                  </select>
                ) : (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] inline-block ${project.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : project.status === 'ON_HOLD'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                )}
              </td>

              {/* Timeline & Duration */}
              <td className="py-5 px-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[150px]">
                      {project.start_date ? `${project.start_date} - ${project.end_date || 'Ongoing'}` : 'No timeline set'}
                    </span>
                  </div>
                  {project.number_of_days && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-500 font-extrabold">
                      <Clock className="w-3 h-3" />
                      <span>{project.number_of_days} Days</span>
                    </div>
                  )}
                </div>
              </td>

              {/* Team Lead */}
              <td className="py-5 px-4 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-[10px] border border-orange-500/20 shadow-sm">
                    {project.team_lead?.full_name ? project.team_lead.full_name.charAt(0) : 'TL'}
                  </div>
                  <span className={`text-xs font-bold truncate max-w-[120px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {project.team_lead?.full_name || 'Unassigned'}
                  </span>
                </div>
              </td>

              {/* Tech Stack Tags */}
              <td className="py-5 px-4 max-w-[200px]">
                {(() => {
                  const effectiveSkills = getEffectiveSkills(project);
                  const uniqueCats = Array.from(new Set(effectiveSkills.map(s => s.category).filter(Boolean)));
                  return (
                    <div className="space-y-1.5">
                      {/* Unique Categories */}
                      {uniqueCats.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {uniqueCats.map((cat) => (
                            <span
                              key={cat}
                              className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {effectiveSkills.length > 0 ? (
                          effectiveSkills.slice(0, 3).map((skill) => (
                            <span
                              key={skill.id}
                              className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            >
                              {skill.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">None</span>
                        )}
                        {effectiveSkills.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            +{effectiveSkills.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </td>

              {/* Team Size Column */}
              <td className="py-5 px-6 whitespace-nowrap text-right">
                <span className="text-[10px] font-black px-2.5 py-1.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm truncate max-w-[100px] inline-block">
                  {project.team_size || 0} Members
                </span>
              </td>

              {/* Actions Column */}
              {isProjectManager && (
                <td className="py-5 px-6 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditProject(project)}
                      disabled={project.status === 'COMPLETED'}
                      className={`p-2 rounded-xl border transition-all ${project.status === 'COMPLETED'
                        ? 'bg-blue-500/5 text-blue-400/50 dark:text-blue-400/40 border-blue-500/10 cursor-not-allowed'
                        : 'bg-blue-500/10 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border-blue-500/20 cursor-pointer'
                        }`}
                      title={project.status === 'COMPLETED' ? "Completed projects cannot be edited" : "Edit Project"}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={project.status === 'COMPLETED'}
                      className={`p-2 rounded-xl border transition-all ${project.status === 'COMPLETED'
                        ? 'bg-rose-500/5 text-rose-400/50 dark:text-rose-400/40 border-rose-500/10 cursor-not-allowed'
                        : 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/20 cursor-pointer'
                        }`}
                      title={project.status === 'COMPLETED' ? "Completed projects cannot be deleted" : "Delete Project"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
