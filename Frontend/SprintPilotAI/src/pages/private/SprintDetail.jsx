import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';
import {
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Code,
  Tag,
  AlertCircle,
  Briefcase,
  User,
  Activity
} from 'lucide-react';

const categoryConfig = {
  UI: { color: '#ea580c', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: 'User Interface' },
  Backend: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Backend Services' },
  Infra: { color: '#8b5cf6', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: 'Infrastructure & DevOps' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Quality Assurance' }
};

const mockSprintsData = {
  'Cloud Sync Platform': {
    'Sprint 5 (Current)': [
      { title: 'Implement File Chunking API', desc: 'Develop backend handler to slice large binary assets into 4MB secure blobs.', category: 'BACKEND', startDate: '2026-06-26', endDate: '2026-07-02', status: 'Completed', assignedTo: 'Abhiram S' },
      { title: 'Design Decentralized Encryption Protocol', desc: 'Draft architecture review for key derivation functions using AES-GCM.', category: 'INFRA', startDate: '2026-06-28', endDate: '2026-07-05', status: 'Completed', assignedTo: 'Ananthu M' },
      { title: 'Build Web Upload Interface', desc: 'Create React dropzone dashboard with real-time multi-threaded upload progress bars.', category: 'UI', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress', assignedTo: 'Anagha' },
      { title: 'Perform Chunk Load Testing', desc: 'Author Apache JMeter scripts simulating 500 concurrent file chunk uploads.', category: 'QA', startDate: '2026-07-04', endDate: '2026-07-09', status: 'In Progress', assignedTo: 'Ashna' }
    ]
  },
  'AI Analytics Hub': {
    'Sprint 6 (Current)': [
      { title: 'Neural Model Fine-tuning', desc: 'Train LLM transformer blocks on refined developer timesheet corpus.', category: 'BACKEND', startDate: '2026-06-24', endDate: '2026-06-30', status: 'Completed', assignedTo: 'Abhiram S' },
      { title: 'Interactive Loss Curves Chart', desc: 'Plot training/validation telemetry curves with SVG tooltips in real-time.', category: 'UI', startDate: '2026-06-27', endDate: '2026-07-03', status: 'Completed', assignedTo: 'Anagha' },
      { title: 'API Telemetry Endpoints', desc: 'Create fast API handlers logging GPU temp and validation loss.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-07', status: 'In Progress', assignedTo: 'Noel' },
      { title: 'Integrate Docker GPU Runner', desc: 'Configure NVIDIA container toolkit runtime across local cluster instances.', category: 'INFRA', startDate: '2026-07-02', endDate: '2026-07-07', status: 'In Progress', assignedTo: 'Ananthu M' }
    ]
  },
  'Developer Portal': {
    'Sprint 3 (Current)': [
      { title: 'SDK Sandbox Playground', desc: 'Embed interactive typescript client preview console in browser layout.', category: 'UI', startDate: '2026-06-29', endDate: '2026-07-05', status: 'Completed', assignedTo: 'Anagha' },
      { title: 'OAuth2 Client Registration API', desc: 'Design backend handlers issuing client credentials, secrets, and auth scopes.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress', assignedTo: 'Abhiram S' },
      { title: 'Swagger Spec OpenAPI Linting', desc: 'Implement automated YAML specs parsing and validation hooks on file upload.', category: 'QA', startDate: '2026-07-03', endDate: '2026-07-10', status: 'In Progress', assignedTo: 'Ashna' }
    ]
  },
  'Security Gateway': {
    'Sprint 5 (Current)': [
      { title: 'Redis Cache Rate Limiter', desc: 'Deploy sliding window algorithm tracking client token buckets in memory.', category: 'BACKEND', startDate: '2026-07-10', endDate: '2026-07-15', status: 'Completed', assignedTo: 'Abhiram S' },
      { title: 'Verify SSL Handshake Offloading', desc: 'Setup Nginx TLS terminate configurations on proxy nodes.', category: 'INFRA', startDate: '2026-07-12', endDate: '2026-07-18', status: 'In Progress', assignedTo: 'Ananthu M' },
      { title: 'Penetration Scripting Framework', desc: 'Write automated vulnerability scanners mapping auth token headers.', category: 'QA', startDate: '2026-07-14', endDate: '2026-07-21', status: 'In Progress', assignedTo: 'Noel' }
    ]
  }
};

export default function SprintDetail() {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [project, setProject] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjectAndSprints = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch project details
        const projectRes = await apiClient.get(`projects/${projectId}/`);
        setProject(projectRes.data);

        // Fetch employee profiles
        const employeesRes = await apiClient.get('projects/employees/');
        setEmployees(employeesRes.data);

        // Load sprint detail from API
        const sprintData = await SprintServices.getSprintDetails(sprintId);
        setSprint(sprintData);
        setTasks(sprintData.tasks || []);
      } catch (err) {
        console.error('[SprintDetail] Error loading data:', err);
        setError(err.response?.data?.detail || 'Failed to load sprint details.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId && sprintId) {
      fetchProjectAndSprints();
    }
  }, [projectId, sprintId]);

  // Compile list of possible assignees from project members and lead
  const assigneesList = useMemo(() => {
    if (!project || !employees) return [];
    const list = [];

    // Find team lead's EmployeeProfile
    if (project.team_lead) {
      const leadProfile = employees.find(emp => emp.user?.id === project.team_lead.id);
      if (leadProfile) {
        list.push({
          id: leadProfile.id,
          name: project.team_lead.full_name,
          role: 'Team Lead'
        });
      }
    }

    if (project.members && Array.isArray(project.members)) {
      project.members.forEach(m => {
        if (m.user) {
          list.push({
            id: m.id,
            name: m.user.full_name,
            role: m.role || 'Member'
          });
        }
      });
    }
    return list;
  }, [project, employees]);

  // Update specific task in backend and local state
  const handleUpdateTask = async (taskId, field, value) => {
    let apiField = field;
    if (field === 'assignedTo') {
      apiField = 'assigned_employee_id';
    } else if (field === 'startDate') {
      apiField = 'planned_start_date';
    } else if (field === 'endDate') {
      apiField = 'planned_end_date';
    }

    try {
      const updatedTask = await SprintServices.updateSprintTask(taskId, { [apiField]: value });
      
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return updatedTask;
        }
        return t;
      }));
    } catch (err) {
      console.error('[SprintDetail] Error updating task:', err);
      alert(err.response?.data?.detail || 'Failed to update task.');
    }
  };

  // Group tasks by category
  const groupedTasks = useMemo(() => {
    const categories = ['UI', 'Backend', 'Infra', 'QA'];
    const groups = {};
    categories.forEach(cat => {
      groups[cat] = [];
    });

    tasks.forEach(task => {
      let cat = task.category || 'UI';
      const catUpper = cat.toUpperCase();
      if (catUpper === 'BACKEND') cat = 'Backend';
      else if (catUpper === 'INFRA') cat = 'Infra';
      else if (catUpper === 'UI') cat = 'UI';
      else if (catUpper === 'QA') cat = 'QA';

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(task);
    });
    return groups;
  }, [tasks]);

  // Compute Sprint Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed' || t.status === 'DONE').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress' || t.status === 'IN_PROGRESS').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let start = 'N/A';
    let end = 'N/A';
    if (sprint) {
      if (sprint.start_date) {
        start = new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (sprint.end_date) {
        end = new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    return { total, completed, inProgress, completionRate, start, end };
  }, [tasks, sprint]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center gap-3">
        <Clock className="w-10 h-10 animate-spin text-orange-500" />
        <span className="text-sm font-semibold text-slate-400">Loading sprint details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold">Failed to load Sprint</h3>
        <p className="text-sm text-slate-400 mt-1 mb-6">{error || 'Project or sprint not found.'}</p>
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
        </Link>
      </div>
    );
  }

  const categoryIcons = {
    UI: <Layers className="w-4 h-4 text-orange-500" />,
    Backend: <Code className="w-4 h-4 text-blue-500" />,
    Infra: <Briefcase className="w-4 h-4 text-purple-500" />,
    QA: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  };

  return (
    <div className={`p-6 sm:p-8 max-w-7xl mx-auto min-h-screen ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          to={`/projects/${projectId}`}
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${
            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {project.name}
        </Link>
      </div>

      {/* Main header banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm ${
        darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100'
      }`}>
        <div className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/10 text-orange-600'
            }`}>
              Milestone / Sprint View
            </span>
            <span className="text-slate-400 text-xs font-bold">/</span>
            <span className="text-slate-400 text-xs font-bold truncate max-w-[150px]">{project.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {sprint?.name || 'Sprint Details'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-400 font-semibold">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Timeline: {metrics.start} - {metrics.end}</span>
          </div>
        </div>

        {/* Sprint Progress Summary */}
        <div className={`p-4 rounded-2xl border flex items-center gap-6 w-full md:w-auto ${
          darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Progress</span>
            <span className="text-2xl font-black block mt-0.5">{metrics.completionRate}%</span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Tasks</span>
            <span className="text-2xl font-black block mt-0.5">{metrics.total}</span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Completed</span>
            <span className="text-2xl font-black text-emerald-500 block mt-0.5">{metrics.completed}</span>
          </div>
        </div>
      </div>

      {/* Category-based Task Lists */}
      <div className="space-y-8">
        {Object.entries(groupedTasks).map(([category, catTasks]) => {
          const config = categoryConfig[category] || { bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20', label: category };
          const categoryIcon = categoryIcons[category] || <Layers className="w-4 h-4" />;
          
          if (catTasks.length === 0) return null;

          return (
            <div 
              key={category}
              className={`p-6 rounded-3xl border text-left ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/40'
              }`}
            >
              {/* Category Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${config.bg}`}>
                    {categoryIcon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight">
                      {config.label}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Category: {category}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${config.bg}`}>
                  {catTasks.length} Tasks
                </span>
              </div>

              {/* Tasks Table */}
              <div className={`border rounded-2xl overflow-hidden ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className={`text-[10px] font-black tracking-wider uppercase border-b ${
                        darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}>
                        <th className="py-4 px-5">Task Details</th>
                        <th className="py-4 px-5 w-32">Jira ID</th>
                        <th className="py-4 px-5 w-56 text-left">Timeline Dates</th>
                        <th className="py-4 px-5 w-48 text-left">Assigned To</th>
                        <th className="py-4 px-5 w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs text-left ${
                      darkMode ? 'divide-slate-800/60' : 'divide-slate-100'
                    }`}>
                      {catTasks.map((task, idx) => (
                        <tr 
                          key={idx} 
                          className={`transition-colors ${
                            darkMode ? 'bg-slate-900/40 hover:bg-slate-850/40 text-slate-350' : 'bg-white hover:bg-slate-50/50 text-slate-700'
                          }`}
                        >
                           {/* Task Details */}
                          <td className="py-4 px-5 align-top">
                            <div className="space-y-1 text-left">
                              <span className={`font-extrabold text-sm block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {task.title}
                              </span>
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description || task.desc}
                              </p>
                            </div>
                          </td>

                          {/* Jira ID */}
                          <td className="py-4 px-5 align-middle">
                            {(task.jira_id || task.jiraId) ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                              }`}>
                                {task.jira_id || task.jiraId}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">N/A</span>
                            )}
                          </td>

                          {/* Timeline Dates Inputs */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex flex-col gap-1.5 max-w-[170px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 w-8">Start:</span>
                                <input
                                  type="date"
                                  value={task.planned_start_date || task.startDate || ''}
                                  onChange={(e) => handleUpdateTask(task.id, 'startDate', e.target.value)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer w-full ${
                                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 w-8">End:</span>
                                <input
                                  type="date"
                                  value={task.planned_end_date || task.endDate || ''}
                                  onChange={(e) => handleUpdateTask(task.id, 'endDate', e.target.value)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer w-full ${
                                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Assigned To Select */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <select
                                value={task.assigned_employee?.id || task.assignedTo || ''}
                                onChange={(e) => handleUpdateTask(task.id, 'assignedTo', e.target.value)}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer w-full max-w-[160px] ${
                                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <option value="">Unassigned</option>
                                {assigneesList.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} ({a.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Status Select */}
                          <td className="py-4 px-5 align-middle">
                            <select
                              value={task.status === 'DONE' || task.status === 'Completed' ? 'Completed' : 'In Progress'}
                              onChange={(e) => handleUpdateTask(task.id, 'status', e.target.value)}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors ${
                                task.status === 'Completed' || task.status === 'DONE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                              }`}
                            >
                              <option value="In Progress" className="bg-white dark:bg-slate-950 text-indigo-500 font-bold">In Progress</option>
                              <option value="Completed" className="bg-white dark:bg-slate-950 text-emerald-500 font-bold">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Activity className="w-12 h-12 text-slate-350 dark:text-slate-750 mb-3 animate-pulse" />
            <h5 className="font-extrabold text-slate-400 text-sm">No tasks in this sprint</h5>
            <p className="text-xs text-slate-400 mt-1">No tasks found for this sprint.</p>
          </div>
        )}
      </div>
    </div>
  );
}
