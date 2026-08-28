import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ChevronUp, ChevronDown, ChevronRight, ExternalLink, Lock, Trash2, Layers } from 'lucide-react';

export default function SprintsList({
  darkMode,
  sprintListDetails,
  projectId,
  isProjectManager,
  handleOpenCloseModal,
  handleDeleteSprint
}) {
  const navigate = useNavigate();
  const [sprintsExpanded, setSprintsExpanded] = useState(true);

  return (
    <div className={`mt-8 rounded-3xl border overflow-hidden transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/40'
      }`}>
      <button
        onClick={() => setSprintsExpanded(!sprintsExpanded)}
        className={`w-full p-6 flex justify-between items-center transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-850/30' : 'hover:bg-slate-50/50'
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-left">
            <h2 className="font-extrabold text-lg leading-tight text-left">Project Sprints & Milestones</h2>
            <p className="text-xs text-slate-400 mt-0.5 text-left">Browse active sprints and click to view detailed task distributions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            {sprintListDetails.length} Sprints Loaded
          </span>
          {sprintsExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {sprintsExpanded && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-850">
          {/* SPRINTS LIST VIEW TABLE */}
          {sprintListDetails.length > 0 ? (
            <div className={`border rounded-3xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className={`text-[10px] font-black tracking-wider uppercase border-b ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}>
                      <th className="py-4 px-5">Sprint / Milestone Name</th>
                      <th className="py-4 px-5 w-32 text-center">Total Tasks</th>
                      <th className="py-4 px-5 w-40">Start Date</th>
                      <th className="py-4 px-5 w-40">End Date</th>
                      <th className="py-4 px-5 w-40 text-center">Progress</th>
                      <th className="py-4 px-5 w-32">Status</th>
                      <th className="py-4 px-5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs text-left ${darkMode ? 'divide-slate-800/60' : 'divide-slate-100'
                    }`}>
                    {sprintListDetails.map((sprint, idx) => (
                      <tr
                        key={idx}
                        onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}`)}
                        className={`transition-all duration-150 cursor-pointer ${darkMode ? 'bg-slate-900/40 hover:bg-slate-850/60 text-slate-330' : 'bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        {/* Name */}
                        <td className={`py-4 px-5 font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-800'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px] inline-block">{sprint.milestone || sprint.name}</span>
                            {sprint.workspaceUrl && (
                              <a
                                href={sprint.workspaceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}
                                title="View Milestone Issues in Backlog"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {sprint.jiraUrl && (
                              <a
                                href={sprint.jiraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${darkMode ? 'bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'}`}
                                title="View Board in Jira"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v4.34c0 2.4-1.97 4.34-4.35 4.34-2.4 0-4.34-1.94-4.34-4.34V2h2.56zm-5.2 6.52c0 2.4 1.97 4.35 4.35 4.35h1.78v4.34c0 2.4-1.97 4.35-4.35 4.35-2.4 0-4.35-1.95-4.35-4.35V8.52h2.57zM24 8.52c0 2.4-1.97 4.35-4.35 4.35-2.4 0-4.34-1.95-4.34-4.35V4.17c2.4 0 4.35 1.95 4.35 4.35z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Total Tasks */}
                        <td className="py-4 px-5 text-center font-bold">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                            }`}>
                            {sprint.totalTasks}
                          </span>
                        </td>

                        {/* Start Date */}
                        <td className="py-4 px-5 font-semibold text-slate-400">
                          {sprint.startDate}
                        </td>

                        {/* End Date */}
                        <td className="py-4 px-5 font-semibold text-slate-400">
                          {sprint.endDate}
                        </td>

                        {/* Progress */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sprint.progressPercentage === 100 ? 'bg-emerald-500' :
                                    sprint.progressPercentage > 0 ? 'bg-blue-500' : 'bg-slate-400'
                                  }`}
                                style={{ width: `${sprint.progressPercentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {sprint.progressPercentage}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            sprint.status === 'CLOSED'
                              ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                              : sprint.status === 'RESOLVED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                : sprint.status === 'IN PROGRESS'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-450 border border-blue-500/20'
                                  : sprint.status === 'NO TASKS'
                                    ? 'bg-slate-500/10 text-slate-600 dark:text-slate-455 border border-slate-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'
                            }`}>
                            {sprint.status || 'OPEN'}
                          </span>
                        </td>

                        {/* Chevron Link indicator */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {isProjectManager && sprint.status !== 'CLOSED' && sprint.status !== 'COMPLETED' && (
                              <button
                                onClick={(e) => handleOpenCloseModal(e, sprint.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${darkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                title="Close Milestone"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            )}
                            {isProjectManager && (
                              <button
                                onClick={(e) => handleDeleteSprint(e, sprint.id, !!sprint.workspaceUrl)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                title="Delete Sprint"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronRight className="w-5 h-5 text-slate-400 hover:text-orange-500 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Layers className="w-12 h-12 text-slate-350 dark:text-slate-750 mb-3 animate-pulse" />
              <h5 className="font-extrabold text-slate-400 text-sm">No Sprints Uploaded Yet</h5>
              <p className="text-xs text-slate-400 mt-1 mb-4">Click "Upload Sprint" at the top to import tasks from an Excel template.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
