import React, { useState, useEffect } from 'react';
import { UploadCloud, X, Database, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import CustomDatePicker from '../Common/CustomDatePicker';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const categoryConfig = {
  UI: { color: '#f97316', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  BACKEND: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  INFRA: { color: '#a855f7', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

const CategoryDropdown = ({ categoryStr, onChange, darkMode, availableCategories = ['UI', 'BACKEND', 'INFRA', 'QA'] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef(null);
  const selectedList = categoryStr ? categoryStr.split(', ').filter(c => c.trim() !== '') : [];

  const toggleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 150;
      let top = rect.bottom + 4;
      if (window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight) {
        top = rect.top - menuHeight - 4;
      }
      setPos({ top, left: rect.left, width: Math.max(rect.width, 140) });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none flex items-center justify-between text-left transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-600 focus:border-blue-500'}`}
      >
        <span className="truncate max-w-[80px]">
          {selectedList.length > 0 ? selectedList.join(', ') : 'Select...'}
        </span>
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            className={`fixed z-[70] p-1.5 rounded-xl border shadow-2xl flex flex-col gap-1 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {availableCategories.map(cat => {
              const isSelected = selectedList.includes(cat);
              return (
                <label key={cat} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                       e.stopPropagation();
                       let nextList;
                       if (isSelected) {
                         nextList = selectedList.filter(c => c !== cat);
                       } else {
                         nextList = [...selectedList, cat];
                       }
                       onChange(nextList.join(', '));
                    }}
                    className={`rounded w-3.5 h-3.5 cursor-pointer flex-shrink-0 ${darkMode ? 'bg-slate-900 border-slate-600 text-blue-500' : 'bg-white border-slate-300 text-blue-600 focus:ring-blue-500'}`}
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};

export default function JiraSyncModal({
  isOpen,
  onClose,
  darkMode,
  sprint,
  onSyncSuccess,
  employees = []
}) {
  const [tasks, setTasks] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [jiraAuthRequired, setJiraAuthRequired] = useState(false);
  const [searchSprintName, setSearchSprintName] = useState('');
  const [availableCategories, setAvailableCategories] = useState(['UI', 'BACKEND', 'INFRA', 'QA']);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && sprint) {
      const defaultName = sprint.backlog_version_id || sprint.milestone || '';
      setSearchSprintName(defaultName);
      fetchNewJiraTasks(defaultName);
      
      const fetchCategories = async () => {
        try {
          const projectId = typeof sprint.project === 'string' ? sprint.project : sprint.project?.id || '';
          const projectKey = sprint.project_custom_id || sprint.project?.project_id || '';
          const res = await apiClient.get(`categories/?project_id=${projectId}&project_key=${projectKey}`);
          if (res.data && res.data.categories) {
            setAvailableCategories(res.data.categories);
          }
        } catch (e) {
          console.error('Failed to fetch backlog categories', e);
        }
      };
      fetchCategories();
    } else {
      setTasks([]);
      setErrorMsg('');
      setSuccessMsg('');
      setJiraAuthRequired(false);
    }
  }, [isOpen, sprint]);

  const fetchNewJiraTasks = async (nameOverride) => {
    const nameToSearch = nameOverride !== undefined ? nameOverride : searchSprintName;
    setIsFetching(true);
    setErrorMsg('');
    setSuccessMsg('');
    setJiraAuthRequired(false);
    try {
      const response = await apiClient.post(`jira/sync-sprint/${sprint.id}/`, { sprint_name: nameToSearch.trim() });
      if (response.data.sprint_name) {
        setSearchSprintName(response.data.sprint_name);
      }
      if (response.data.tasks && response.data.tasks.length > 0) {
        setTasks(response.data.tasks.map(t => ({ ...t, selected: true, assignee: '', startDate: null, endDate: null })));
      } else {
        setTasks([]);
        setSuccessMsg(response.data.detail || 'No new tasks found in Jira for this sprint.');
      }
    } catch (err) {
      console.error('[JiraSync] Fetch error:', err);
      if (err.response?.data?.auth_required) {
        setJiraAuthRequired(true);
      }
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch new tasks from Jira.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleConnectJira = async () => {
    try {
      const res = await apiClient.get('jira/auth-url/');
      if (res.data.auth_url) {
        sessionStorage.setItem('jira_redirect_back_url', window.location.pathname);
        window.location.href = res.data.auth_url;
      }
    } catch (err) {
      console.error('[Jira] Failed to get auth URL:', err);
      toast.error('Failed to connect to Jira. Please try again.');
    }
  };

  const handleToggleTask = (idx) => {
    const newData = [...tasks];
    newData[idx].selected = !newData[idx].selected;
    setTasks(newData);
  };

  const handleTaskCategoryChange = (idx, newCategory) => {
    const newData = [...tasks];
    newData[idx].category = newCategory;
    setTasks(newData);
  };

  const handleTaskAssigneeChange = (idx, newAssigneeId) => {
    const newData = [...tasks];
    newData[idx].assignee = newAssigneeId;
    setTasks(newData);
  };

  const handleTaskStartDateChange = (idx, newDate) => {
    const newData = [...tasks];
    newData[idx].startDate = newDate;
    setTasks(newData);
  };

  const handleTaskEndDateChange = (idx, newDate) => {
    const newData = [...tasks];
    newData[idx].endDate = newDate;
    setTasks(newData);
  };

  const handleTaskStatusChange = (idx, newStatus) => {
    const newData = [...tasks];
    newData[idx].status = newStatus;
    setTasks(newData);
  };

  const handleTaskPriorityChange = (idx, newPriority) => {
    const newData = [...tasks];
    newData[idx].priority = newPriority;
    setTasks(newData);
  };

  const handleToggleAll = (isSelected) => {
    const newData = tasks.map(task => ({ ...task, selected: isSelected }));
    setTasks(newData);
  };

  const handleImportTasks = async () => {
    const selectedTasks = tasks.filter(t => t.selected);
    if (selectedTasks.length === 0) {
      setErrorMsg('No tasks selected to import.');
      return;
    }
    if (!searchSprintName.trim()) {
      setErrorMsg('Jira Sprint Name is required to import tasks.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = { 
        tasks: selectedTasks,
        sprint_name: searchSprintName.trim()
      };
      await apiClient.post(`jira/append-tasks/${sprint.id}/`, payload);
      onSyncSuccess();
      onClose();
    } catch (err) {
      console.error('[JiraSync] Save error:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to import tasks to the sprint.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;


  const groupedTasks = tasks.reduce((acc, task, idx) => {
    const cats = task.category ? task.category.split(', ') : ['UI'];
    cats.forEach(c => {
      if (!acc[c]) acc[c] = [];
      acc[c].push({ ...task, originalIndex: idx });
    });
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden z-10 flex flex-col max-h-[85vh] ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Sync New Jira Tasks</h3>
              <span className="text-xs text-slate-400">Review and categorize new tasks from Jira before importing</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          
          {/* Manual Search Override */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-slate-500">
                Jira Sprint Name (Edit if not found) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={searchSprintName}
                onChange={(e) => setSearchSprintName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchNewJiraTasks()}
                className={`w-full px-4 py-2.5 text-sm font-medium rounded-xl border outline-none transition-all ${
                  darkMode ? 'bg-slate-800/50 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                }`}
                placeholder="Enter exact Jira sprint name"
              />
            </div>
            <button
              onClick={() => fetchNewJiraTasks()}
              disabled={isFetching || !searchSprintName.trim()}
              className="px-5 py-2.5 text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {errorMsg && (
            <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${darkMode ? 'bg-red-950/40 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMsg}</p>
                {jiraAuthRequired && (
                  <button
                    onClick={handleConnectJira}
                    className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                  >
                    Connect to Jira
                  </button>
                )}
              </div>
            </div>
          )}
          
          {successMsg && !isFetching && tasks.length === 0 && (
            <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${darkMode ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{successMsg}</p>
            </div>
          )}

          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-sm font-semibold">Fetching new tasks from Jira...</p>
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-bold text-sm">Fetched Tasks ({tasks.length})</h4>
                <div className="flex gap-4">
                  <button onClick={() => handleToggleAll(true)} className="text-xs font-bold text-blue-500 hover:underline">Select All</button>
                  <button onClick={() => handleToggleAll(false)} className="text-xs font-bold text-slate-500 hover:underline">Deselect All</button>
                </div>
              </div>

              {/* Data Table */}
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                  <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
                    <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-800/90 backdrop-blur text-slate-300' : 'bg-slate-50/90 backdrop-blur text-slate-600'}`}>
                      <tr>
                        <th className="p-3 font-bold w-12 text-center">Inc</th>
                        <th className="p-3 font-bold w-24">Jira ID</th>
                        <th className="p-3 font-bold min-w-[150px]">Task Title</th>
                        <th className="p-3 font-bold w-36 text-center">Category</th>
                        <th className="p-3 font-bold w-24 text-center">Status</th>
                        <th className="p-3 font-bold w-24 text-center">Priority</th>
                        <th className="p-3 font-bold w-32 text-center">Assignee</th>
                        <th className="p-3 font-bold w-24 text-center">Start Date</th>
                        <th className="p-3 font-bold w-24 text-center">End Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/10">
                      {tasks.map((t, idx) => (
                        <tr key={idx} className={`transition-colors ${t.selected ? (darkMode ? 'bg-blue-900/10' : 'bg-blue-50/50') : 'opacity-60'} hover:${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <td className="p-3 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={t.selected}
                              onChange={() => handleToggleTask(idx)}
                              className={`w-4 h-4 rounded appearance-none border transition-colors cursor-pointer checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400 ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}
                            />
                          </td>
                          <td className="p-3 align-middle font-mono font-medium">
                            {t.jiraId || '-'}
                          </td>
                          <td className="p-3 align-middle font-medium">
                            {t.title}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <div className="w-[120px] mx-auto">
                              <CategoryDropdown
                                categoryStr={t.category}
                                onChange={(newCat) => handleTaskCategoryChange(idx, newCat)}
                                darkMode={darkMode}
                                availableCategories={availableCategories}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <select
                              value={t.status || 'OPEN'}
                              onChange={(e) => handleTaskStatusChange(idx, e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1.5 outline-none transition-colors border ${darkMode ? 'border-slate-700 bg-slate-800 focus:border-blue-500' : 'border-slate-200 focus:border-blue-500'}`}
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <select
                              value={t.priority || 'NORMAL'}
                              onChange={(e) => handleTaskPriorityChange(idx, e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1.5 outline-none transition-colors border ${darkMode ? 'border-slate-700 bg-slate-800 focus:border-blue-500' : 'border-slate-200 focus:border-blue-500'}`}
                            >
                              <option value="LOW">Low</option>
                              <option value="NORMAL">Normal</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <select
                              value={t.assignee}
                              onChange={(e) => handleTaskAssigneeChange(idx, e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1.5 outline-none transition-colors border ${darkMode ? 'border-slate-700 bg-slate-800 focus:border-blue-500' : 'border-slate-200 focus:border-blue-500'}`}
                            >
                              <option value="">Unassigned</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.user?.full_name || emp.user?.email}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <CustomDatePicker
                              value={t.startDate}
                              minDate={sprint?.start_date}
                              maxDate={t.endDate || sprint?.end_date}
                              onChange={(newDate) => handleTaskStartDateChange(idx, newDate)}
                              darkMode={darkMode}
                            />
                          </td>
                          <td className="p-3 text-center align-middle">
                            <CustomDatePicker
                              value={t.endDate}
                              minDate={t.startDate || sprint?.start_date}
                              maxDate={sprint?.end_date}
                              onChange={(newDate) => handleTaskEndDateChange(idx, newDate)}
                              darkMode={darkMode}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

        </div>

        {/* Footer Actions */}
        <div className={`mt-6 pt-5 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Cancel
          </button>
          
          <button
            onClick={handleImportTasks}
            disabled={isSaving || isFetching || tasks.length === 0}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Import {tasks.filter(t => t.selected).length} Tasks
          </button>
        </div>

      </div>
    </div>
  );
}
