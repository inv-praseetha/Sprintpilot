import React, { useState, useMemo } from 'react';
import { useTheme } from '../../components/layout/MainLayouut';
import TaskUploadModal from '../../components/Modals/TaskUploadModal';
import {
  Download,
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  FolderKanban,
  Clock,
  Layers,
  AlertCircle,
  Calendar,
  Users,
  Check
} from 'lucide-react';

// Hardcoded initial projects and tasks data
const initialProjects = {
  'Cloud Sync Platform': {
    id: 'PRJ-CSP',
    desc: 'Next-generation cloud storage synchronization service with decentralized encryption and high-velocity asset chunking.',
    team: ['Praseetha KU', 'Rahul Sharma', 'Anjali Gupta'],
    sprints: {
      'Sprint 5 (Current)': [
        { title: 'Implement File Chunking API', desc: 'Develop backend handler to slice large binary assets into 4MB secure blobs.', category: 'BACKEND', startDate: '2026-06-26', endDate: '2026-07-02', status: 'Completed' },
        { title: 'Design Decentralized Encryption Protocol', desc: 'Draft architecture review for key derivation functions using AES-GCM.', category: 'INFRA', startDate: '2026-06-28', endDate: '2026-07-05', status: 'Completed' },
        { title: 'Build Web Upload Interface', desc: 'Create React dropzone dashboard with real-time multi-threaded upload progress bars.', category: 'UI', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress' },
        { title: 'Perform Chunk Load Testing', desc: 'Author Apache JMeter scripts simulating 500 concurrent file chunk uploads.', category: 'QA', startDate: '2026-07-04', endDate: '2026-07-09', status: 'In Progress' }
      ]
    }
  },
  'AI Analytics Hub': {
    id: 'PRJ-AAH',
    desc: 'Enterprise machine learning dashboard mapping neural network predictions, training telemetry, and data pipelines.',
    team: ['Ashwin S', 'Meera Nair', 'David Chen'],
    sprints: {
      'Sprint 6 (Current)': [
        { title: 'Neural Model Fine-tuning', desc: 'Train LLM transformer blocks on refined developer timesheet corpus.', category: 'BACKEND', startDate: '2026-06-24', endDate: '2026-06-30', status: 'Completed' },
        { title: 'Interactive Loss Curves Chart', desc: 'Plot training/validation telemetry curves with SVG tooltips in real-time.', category: 'UI', startDate: '2026-06-27', endDate: '2026-07-03', status: 'Completed' },
        { title: 'API Telemetry Endpoints', desc: 'Create fast API handlers logging GPU temp and validation loss.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-07', status: 'In Progress' },
        { title: 'Integrate Docker GPU Runner', desc: 'Configure NVIDIA container toolkit runtime across local cluster instances.', category: 'INFRA', startDate: '2026-07-02', endDate: '2026-07-07', status: 'In Progress' }
      ]
    }
  },
  'Developer Portal': {
    id: 'PRJ-DEV',
    desc: 'Self-service API registry, documentation catalog, and SDK sandbox generator for external integrations.',
    team: ['Karthik Raja', 'Priya Patel'],
    sprints: {
      'Sprint 3 (Current)': [
        { title: 'SDK Sandbox Playground', desc: 'Embed interactive typescript client preview console in browser layout.', category: 'UI', startDate: '2026-06-29', endDate: '2026-07-05', status: 'Completed' },
        { title: 'OAuth2 Client Registration API', desc: 'Design backend handlers issuing client credentials, secrets, and auth scopes.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress' },
        { title: 'Swagger Spec OpenAPI Linting', desc: 'Implement automated YAML specs parsing and validation hooks on file upload.', category: 'QA', startDate: '2026-07-03', endDate: '2026-07-10', status: 'In Progress' }
      ]
    }
  },
  'Security Gateway': {
    id: 'PRJ-SEC',
    desc: 'Zero-trust network access gateway providing real-time rate limiting, IP whitelisting, and JWT signature verification.',
    team: ['Vikram R', 'Siddharth M'],
    sprints: {
      'Sprint 5 (Current)': [
        { title: 'Redis Cache Rate Limiter', desc: 'Deploy sliding window algorithm tracking client token buckets in memory.', category: 'BACKEND', startDate: '2026-07-10', endDate: '2026-07-15', status: 'Completed' },
        { title: 'Verify SSL Handshake Offloading', desc: 'Setup Nginx TLS terminate configurations on proxy nodes.', category: 'INFRA', startDate: '2026-07-12', endDate: '2026-07-18', status: 'In Progress' },
        { title: 'Penetration Scripting Framework', desc: 'Write automated vulnerability scanners mapping auth token headers.', category: 'QA', startDate: '2026-07-14', endDate: '2026-07-21', status: 'In Progress' }
      ]
    }
  }
};

const categoryConfig = {
  UI: { color: '#ea580c', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  BACKEND: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  INFRA: { color: '#8b5cf6', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

export default function ProjectTest() {
  const { darkMode } = useTheme();
  const [projects, setProjects] = useState(initialProjects);
  const [activeProject, setActiveProject] = useState('Cloud Sync Platform');
  const [activeSprintName, setActiveSprintName] = useState('Sprint 5 (Current)');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successAlert, setSuccessAlert] = useState(null);

  const projectDetails = projects[activeProject];

  // Callback on successful import from modal
  const handleImportSuccess = ({ milestoneName, tasksWithDates, targetProjectKey }) => {
    const updatedProjects = { ...projects };
    updatedProjects[targetProjectKey] = {
      ...updatedProjects[targetProjectKey],
      sprints: {
        ...updatedProjects[targetProjectKey].sprints,
        [milestoneName]: tasksWithDates
      }
    };

    setProjects(updatedProjects);
    setActiveProject(targetProjectKey);
    setActiveSprintName(milestoneName);

    setSuccessAlert(`Successfully imported Milestone "${milestoneName}" with ${tasksWithDates.length} tasks to project "${targetProjectKey}"!`);
    setTimeout(() => setSuccessAlert(null), 5000);
  };

  // Switch Active Project
  const handleProjectSelect = (projName) => {
    setActiveProject(projName);
    const sprintKeys = Object.keys(projects[projName].sprints);
    setActiveSprintName(sprintKeys[sprintKeys.length - 1]); // Select latest sprint
  };

  // Group Tasks of the active project's sprint by Category
  const groupedTasks = useMemo(() => {
    const list = projectDetails.sprints[activeSprintName] || [];
    const groups = { UI: [], BACKEND: [], INFRA: [], QA: [] };
    list.forEach(task => {
      if (groups[task.category]) {
        groups[task.category].push(task);
      } else {
        groups.UI.push(task); // Fallback
      }
    });
    return groups;
  }, [projectDetails, activeSprintName]);

  return (
    <div className={`p-6 min-h-screen transition-all ${darkMode ? 'bg-slate-950 text-white' : 'bg-[#F8FAFC] text-slate-800'}`}>

      {/* Toast Alert */}
      {successAlert && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-3 animate-slide-up border border-emerald-400/20">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{successAlert}</span>
          <button onClick={() => setSuccessAlert(null)} className="hover:text-emerald-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Workspace / Projects</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Project Sandbox</h1>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setIsModalOpen(true);
            setErrorMsg('');
          }}
          className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Tasks</span>
        </button>
      </div>

      {/* PROJECT TAB SELECTION CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(projects).map(([projName, proj]) => {
          const isActive = activeProject === projName;
          return (
            <button
              key={projName}
              onClick={() => handleProjectSelect(projName)}
              className={`p-5 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${isActive
                  ? (darkMode ? 'bg-slate-900 border-orange-500/30 shadow-lg shadow-orange-950/15' : 'bg-white border-orange-200 shadow-xl shadow-slate-100')
                  : (darkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/50')
                }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
              )}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${isActive ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                  {proj.id}
                </span>
                <FolderKanban className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
              </div>
              <h3 className="font-bold text-sm truncate mb-1">{projName}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{proj.desc}</p>
            </button>
          );
        })}
      </div>

      {/* DETAIL WORKSPACE SECTION */}
      <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/40'
        }`}>

        {/* Project Sub-Header with Sprint Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">{activeProject} Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">{projectDetails.desc}</p>
            </div>
          </div>

          {/* Sprints Dropdown/Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Milestone:</span>
            <select
              value={activeSprintName}
              onChange={(e) => setActiveSprintName(e.target.value)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
            >
              {Object.keys(projectDetails.sprints).map((sName) => (
                <option key={sName} value={sName}>
                  {sName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KANBAN/CATEGORY GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          {Object.entries(groupedTasks).map(([category, tasks]) => {
            const config = categoryConfig[category];
            return (
              <div
                key={category}
                className={`p-4 rounded-2xl border flex flex-col min-h-[400px] ${darkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/50 border-slate-100'
                  }`}
              >
                {/* Column Title */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">{category}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg}`}>
                    {tasks.length}
                  </span>
                </div>

                {/* Task Cards Stack */}
                <div className="space-y-3 flex-grow overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                      <Layers className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-1" />
                      <span className="text-[10px] font-medium text-slate-400">No tasks planned</span>
                    </div>
                  ) : (
                    tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all duration-300 ${darkMode
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-white'
                            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'
                          }`}
                      >
                        <h4 className="text-xs font-bold leading-snug mb-1 text-left">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-3 mb-3 leading-relaxed text-left">
                          {task.desc}
                        </p>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[9px] font-bold text-slate-400 uppercase">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{task.endDate ? new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                          </div>

                          <span className={`px-1.5 py-0.5 rounded-md ${task.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UPLOAD EXCEL MODAL */}
      <TaskUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        darkMode={darkMode}
        activeProject={activeProject}
        projects={projects}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}