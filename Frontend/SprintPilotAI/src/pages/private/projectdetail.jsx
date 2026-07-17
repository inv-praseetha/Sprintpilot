import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import TaskUploadModal from '../../components/Modals/TaskUploadModal';
import { getEffectiveSkills } from './projectcreation';
import SprintServices from '../../services/SprintServices';
import {
  FolderKanban,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  UserPlus,
  UploadCloud,
  Users,
  Briefcase,
  Calendar,
  Clock,
  Code,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Pencil
} from 'lucide-react';

const mockSprintsData = {
  'Cloud Sync Platform': {
    'Sprint 5 (Current)': [
      { title: 'Implement File Chunking API', desc: 'Develop backend handler to slice large binary assets into 4MB secure blobs.', category: 'BACKEND', startDate: '2026-06-26', endDate: '2026-07-02', status: 'Completed' },
      { title: 'Design Decentralized Encryption Protocol', desc: 'Draft architecture review for key derivation functions using AES-GCM.', category: 'INFRA', startDate: '2026-06-28', endDate: '2026-07-05', status: 'Completed' },
      { title: 'Build Web Upload Interface', desc: 'Create React dropzone dashboard with real-time multi-threaded upload progress bars.', category: 'UI', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress' },
      { title: 'Perform Chunk Load Testing', desc: 'Author Apache JMeter scripts simulating 500 concurrent file chunk uploads.', category: 'QA', startDate: '2026-07-04', endDate: '2026-07-09', status: 'In Progress' }
    ]
  },
  'AI Analytics Hub': {
    'Sprint 6 (Current)': [
      { title: 'Neural Model Fine-tuning', desc: 'Train LLM transformer blocks on refined developer timesheet corpus.', category: 'BACKEND', startDate: '2026-06-24', endDate: '2026-06-30', status: 'Completed' },
      { title: 'Interactive Loss Curves Chart', desc: 'Plot training/validation telemetry curves with SVG tooltips in real-time.', category: 'UI', startDate: '2026-06-27', endDate: '2026-07-03', status: 'Completed' },
      { title: 'API Telemetry Endpoints', desc: 'Create fast API handlers logging GPU temp and validation loss.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-07', status: 'In Progress' },
      { title: 'Integrate Docker GPU Runner', desc: 'Configure NVIDIA container toolkit runtime across local cluster instances.', category: 'INFRA', startDate: '2026-07-02', endDate: '2026-07-07', status: 'In Progress' }
    ]
  },
  'Developer Portal': {
    'Sprint 3 (Current)': [
      { title: 'SDK Sandbox Playground', desc: 'Embed interactive typescript client preview console in browser layout.', category: 'UI', startDate: '2026-06-29', endDate: '2026-07-05', status: 'Completed' },
      { title: 'OAuth2 Client Registration API', desc: 'Design backend handlers issuing client credentials, secrets, and auth scopes.', category: 'BACKEND', startDate: '2026-07-01', endDate: '2026-07-08', status: 'In Progress' },
      { title: 'Swagger Spec OpenAPI Linting', desc: 'Implement automated YAML specs parsing and validation hooks on file upload.', category: 'QA', startDate: '2026-07-03', endDate: '2026-07-10', status: 'In Progress' }
    ]
  },
  'Security Gateway': {
    'Sprint 5 (Current)': [
      { title: 'Redis Cache Rate Limiter', desc: 'Deploy sliding window algorithm tracking client token buckets in memory.', category: 'BACKEND', startDate: '2026-07-10', endDate: '2026-07-15', status: 'Completed' },
      { title: 'Verify SSL Handshake Offloading', desc: 'Setup Nginx TLS terminate configurations on proxy nodes.', category: 'INFRA', startDate: '2026-07-12', endDate: '2026-07-18', status: 'In Progress' },
      { title: 'Penetration Scripting Framework', desc: 'Write automated vulnerability scanners mapping auth token headers.', category: 'QA', startDate: '2026-07-14', endDate: '2026-07-21', status: 'In Progress' }
    ]
  }
};

const categoryConfig = {
  UI: { color: '#ea580c', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  BACKEND: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  INFRA: { color: '#8b5cf6', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);

  // Project and Domain States
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI Toggle States
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [rosterExpanded, setRosterExpanded] = useState(true);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showUploadSprintModal, setShowUploadSprintModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);

  // Add Member State
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Success Toast Alert State
  const [successAlert, setSuccessAlert] = useState(null);

  // Sprints state
  const [sprints, setSprints] = useState([]);

  // Team Roster Pagination State
  const [rosterPage, setRosterPage] = useState(1);
  const rosterPageSize = 5;

  const paginatedMembers = useMemo(() => {
    if (!project || !project.members) return [];
    const startIndex = (rosterPage - 1) * rosterPageSize;
    return project.members.slice(startIndex, startIndex + rosterPageSize);
  }, [project, rosterPage]);

  const totalRosterPages = project?.members ? Math.ceil(project.members.length / rosterPageSize) : 1;

  // Initialize and check authentication
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      navigate('/');
      return;
    }

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  // Is User Project Manager?
  const isProjectManager = useMemo(() => {
    return currentUser?.role === 'PROJECT_MANAGER';
  }, [currentUser]);

  const teamLeads = useMemo(() => {
    return employees.filter(emp => emp.user?.role === 'TEAM_LEAD');
  }, [employees]);

  const fetchEmployees = async () => {
    try {
      const employeesRes = await apiClient.get('projects/employees/');
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error('[ProjectDetail] Error fetching employees:', err);
    }
  };

  // Fetch Project Details & All Employees
  const fetchProjectData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project details
      const projectRes = await apiClient.get(`projects/${projectId}/`);
      setProject(projectRes.data);

      // 2. Fetch all active employees (to select from when adding members)
      await fetchEmployees();
    } catch (err) {
      console.error('[ProjectDetail] Error fetching project details:', err);
      setError(err.response?.data?.detail || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchSprints = async () => {
    try {
      const data = await SprintServices.getProjectSprints(projectId);
      setSprints(data);
    } catch (err) {
      console.error('[ProjectDetail] Error fetching sprints:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSprints();
    }
  }, [projectId]);

  // Compute sprint metadata details list for presentation
  const sprintListDetails = useMemo(() => {
    if (!Array.isArray(sprints)) return [];
    return sprints.map((sprint) => {
      const totalTasks = sprint.tasks ? sprint.tasks.length : 0;
      
      let startDate = 'N/A';
      let endDate = 'N/A';
      if (sprint.start_date) {
        startDate = new Date(sprint.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      if (sprint.end_date) {
        endDate = new Date(sprint.end_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      
      return {
        id: sprint.id,
        name: sprint.name,
        totalTasks,
        startDate,
        endDate
      };
    });
  }, [sprints]);

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

  const handleAddMembers = async (selectedIds, onSuccessCallback) => {
    if (selectedIds.length === 0) return;

    const currentMemberIds = project.members.map(m => m.id);
    const updatedMemberIds = [...currentMemberIds, ...selectedIds];

    const limit = project.team_size || 0;
    if (updatedMemberIds.length > limit) {
      setModalError(`Cannot allocate more members than the project team size of ${limit}. You have ${currentMemberIds.length} current members and selected ${selectedIds.length} new members (total ${updatedMemberIds.length}).`);
      return;
    }

    setUpdatingMembers(true);
    setModalError(null);
    try {
      // Create member UUID list to submit
      // Note: Backend expect profile UUIDs
      const requestData = {
        project_id: project.project_id,
        name: project.name,
        description: project.description || null,
        status: project.status,
        type: project.type,
        start_date: project.start_date || null,
        end_date: project.end_date || null,
        number_of_days: project.number_of_days,
        team_lead: project.team_lead?.id || null,
        members: updatedMemberIds,
        skills: project.skills.map(s => s.id),
        team_size: project.team_size
      };

      const res = await apiClient.put(`projects/${projectId}/`, requestData);
      setProject(res.data);
      await fetchEmployees();
      setShowAddMembersModal(false);
      if (onSuccessCallback) onSuccessCallback();
    } catch (err) {
      console.error('[ProjectDetail] Error adding members:', err);
      alert(err.response?.data?.detail || 'Failed to add members.');
    } finally {
      setUpdatingMembers(false);
    }
  };

  // Change project Team Lead
  const handleChangeTeamLead = async (newTeamLeadUserId) => {
    try {
      const requestData = {
        project_id: project.project_id,
        name: project.name,
        description: project.description || null,
        status: project.status,
        type: project.type,
        start_date: project.start_date || null,
        end_date: project.end_date || null,
        number_of_days: project.number_of_days,
        team_lead: newTeamLeadUserId,
        members: project.members.map(m => m.id),
        skills: project.skills.map(s => s.id),
        team_size: project.team_size
      };

      const res = await apiClient.put(`projects/${projectId}/`, requestData);
      setProject(res.data);
      await fetchEmployees();
      setShowEditLeadModal(false);
    } catch (err) {
      console.error('[ProjectDetail] Error changing team lead:', err);
      alert(err.response?.data?.detail || 'Failed to change team lead.');
    }
  };

  const handleAddMembersSubmit = (e) => {
    e.preventDefault();
    handleAddMembers(selectedNewMembers, () => {
      setSelectedNewMembers([]);
      setMemberSearchQuery('');
    });
  };

  // Remove member from project
  const handleRemoveMember = async (memberProfileId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      const updatedMembers = project.members.filter(m => m.id !== memberProfileId);
      const updatedMemberIds = updatedMembers.map(m => m.id);

      const requestData = {
        project_id: project.project_id,
        name: project.name,
        description: project.description || null,
        status: project.status,
        type: project.type,
        start_date: project.start_date || null,
        end_date: project.end_date || null,
        number_of_days: project.number_of_days,
        team_lead: project.team_lead?.id || null,
        members: updatedMemberIds,
        skills: project.skills.map(s => s.id),
        team_size: project.team_size
      };

      const res = await apiClient.put(`projects/${projectId}/`, requestData);
      setProject(res.data);
      await fetchEmployees();
    } catch (err) {
      console.error('[ProjectDetail] Error removing member:', err);
      alert(err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  const handleImportSuccess = async ({ milestoneName, tasks, sprintStartDate, sprintEndDate, targetProjectKey }) => {
    try {
      const sprintData = {
        name: milestoneName,
        goal: '',
        start_date: sprintStartDate,
        end_date: sprintEndDate,
        status: 'PLANNED',
        tasks: tasks
      };

      await SprintServices.createSprint(projectId, sprintData);
      await fetchSprints();

      setSuccessAlert(`Successfully imported Milestone "${milestoneName}" with ${tasks.length} tasks!`);
      setTimeout(() => setSuccessAlert(null), 5000);
    } catch (err) {
      console.error('[ProjectDetail] Error creating sprint:', err);
      alert(err.response?.data?.detail || 'Failed to import sprint tasks.');
    }
  };

  // Filter out employees already inside the project for multi-select
  const availableEmployees = useMemo(() => {
    if (!employees || !project) return [];
    const currentMemberUserIds = project.members.map(m => m.user.id);
    // Filter out users who are already members OR the team lead
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

      return !isLead && !isMember && matchesSearch && matchesSkills;
    });
  }, [employees, project, memberSearchQuery]);

  const toggleSelectNewMember = (profileId) => {
    setSelectedNewMembers(prev => {
      const isSelected = prev.includes(profileId);
      if (isSelected) {
        setModalError(null);
        return prev.filter(id => id !== profileId);
      }
      
      const currentCount = (project.members || []).length;
      const limit = project.team_size || 0;
      if (currentCount + prev.length >= limit) {
        setModalError(`Cannot select more members. Team size limit of ${limit} reached.`);
        return prev;
      }
      setModalError(null);
      return [...prev, profileId];
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <span className="text-sm font-semibold text-slate-400">Loading project details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold">Failed to load Project</h3>
        <p className="text-sm text-slate-400 mt-1 mb-6">{error || 'Project not found.'}</p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects List
        </Link>
      </div>
    );
  }

  return (
    <div className={`p-6 sm:p-8 max-w-7xl mx-auto min-h-screen ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      
      {/* Back navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          to="/projects"
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${
            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects List
        </Link>
      </div>

      {/* Main header banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="text-left space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {project.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
              project.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : project.status === 'ON_HOLD'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
            }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {project.description || 'No project description is available. Add description from edit panel.'}
          </p>
        </div>

        {/* Action Button Row */}
        {isProjectManager && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowAddMembersModal(true)}
              disabled={project.status === 'COMPLETED'}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                project.status === 'COMPLETED'
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10 cursor-pointer'
              }`}
              title={project.status === 'COMPLETED' ? "Cannot add members to a completed project" : ""}
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>
            <button
              onClick={() => setShowUploadSprintModal(true)}
              disabled={project.status === 'COMPLETED'}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                project.status === 'COMPLETED'
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/10 cursor-pointer'
              }`}
              title={project.status === 'COMPLETED' ? "Cannot upload sprints to a completed project" : ""}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Sprint
            </button>
          </div>
        )}
      </div>

      {/* 1. COLLAPSIBLE PROJECT DETAILS ACCORDION */}
      <div className={`rounded-3xl border overflow-hidden mb-8 transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className={`w-full p-6 flex justify-between items-center transition-colors ${
            darkMode ? 'hover:bg-slate-850/30' : 'hover:bg-slate-50/50'
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
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Timeline & Model</h4>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-xs text-slate-400 font-bold">Project Type</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      project.type === 'AGILE'
                        ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                        : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                    }`}>
                      {project.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-xs text-slate-400 font-bold">
                      {project.type === 'AGILE' ? 'Agile Duration' : 'Waterfall Timeline'}
                    </span>
                    <span className="text-sm font-extrabold mt-0.5 block">
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
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Stakeholders</h4>
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500 font-black text-xs">
                    {getInitials(project.team_lead?.full_name)}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Team Lead</span>
                    <span className="text-sm font-extrabold block">
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
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created By</span>
                      <span className="text-sm font-extrabold block">
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
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Required Skills</h4>
                
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
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Properties & Allocation</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created On</span>
                    <span className="text-xs font-extrabold block mt-0.5">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Updated</span>
                    <span className="text-xs font-extrabold block mt-0.5">
                      {project.updated_at ? new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Allocation Capacity</span>
                  <span className="inline-block text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1">
                    {project.members?.length || 0} / {project.team_size || 0} Members
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 2. TEAM MEMBERS ACTIVE ROSTER */}
      <div className={`rounded-3xl border overflow-hidden mb-8 transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <button
          onClick={() => setRosterExpanded(!rosterExpanded)}
          className={`w-full p-6 flex justify-between items-center transition-colors ${
            darkMode ? 'hover:bg-slate-850/30' : 'hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-orange-500" />
            <h3 className="font-extrabold text-base tracking-tight">Active Team Roster</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">
              {(project.team_lead ? 1 : 0) + (project.members?.length || 0)} Member(s) assigned
            </span>
            {rosterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {rosterExpanded && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-850">
            {(project.team_lead || (project.members && project.members.length > 0)) ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'} uppercase font-black tracking-wider text-[10px]`}>
                      <th className="py-4 px-4 font-bold">Member</th>
                      <th className="py-4 px-4 font-bold">Role</th>
                      <th className="py-4 px-4 font-bold">Status</th>
                      <th className="py-4 px-4 font-bold">Matching Skills</th>
                      {isProjectManager && <th className="py-4 px-4 text-right font-bold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850' : 'divide-slate-50'}`}>
                    {/* Team Lead Row */}
                    {project.team_lead && (
                      <tr className={`transition-all ${darkMode ? 'hover:bg-slate-850/20' : 'hover:bg-slate-50/40'}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs shrink-0">
                              {getInitials(project.team_lead.full_name)}
                            </div>
                            <div>
                              <span className={`block font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {project.team_lead.full_name}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                                {project.team_lead.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            Team Lead
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {(() => {
                            const leadProfile = employees.find(emp => emp.user.id === project.team_lead?.id);
                            const leadStatus = leadProfile?.status || 'ACTIVE';
                            return (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                leadStatus === 'BUSY'
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
                        {isProjectManager && (
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setShowEditLeadModal(true)}
                              className="p-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
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
                              <span className={`block font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {member.user.full_name}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                                {member.user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350">
                            {member.designation || 'Team Member'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            member.status === 'BUSY'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'
                              : member.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {member.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {project.skills && project.skills.length > 0 && member.skills && member.skills.some(s => project.skills.some(ps => ps.id === s.id)) ? (
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
                        {isProjectManager && (
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
              {project.members && project.members.length > rosterPageSize && (
                <div className={`px-6 py-4 flex items-center justify-between border-t transition-colors ${
                  darkMode ? 'border-slate-850 bg-slate-900/60' : 'border-slate-100 bg-slate-50/30'
                }`}>
                  <div className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Showing page <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{rosterPage}</span> of <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{totalRosterPages}</span> ({project.members.length} members)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                      disabled={rosterPage === 1}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${
                        rosterPage > 1
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
                          className={`w-8 h-8 rounded-xl border text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
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
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${
                        rosterPage < totalRosterPages
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
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

      {/* 3. SPRINTS LIST VIEW */}
      <div className={`mt-8 p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/40'
      }`}>
        {/* Project Sub-Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight text-left">Project Sprints & Milestones</h2>
              <p className="text-xs text-slate-400 mt-0.5 text-left">Browse active sprints and click to view detailed task distributions</p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {sprintListDetails.length} Sprints Loaded
          </span>
        </div>

        {/* SPRINTS LIST VIEW TABLE */}
        {sprintListDetails.length > 0 ? (
          <div className={`border rounded-3xl overflow-hidden ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className={`text-[10px] font-black tracking-wider uppercase border-b ${
                    darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    <th className="py-4 px-5">Sprint / Milestone Name</th>
                    <th className="py-4 px-5 w-32 text-center">Total Tasks</th>
                    <th className="py-4 px-5 w-40">Start Date</th>
                    <th className="py-4 px-5 w-40">End Date</th>
                    <th className="py-4 px-5 w-24"></th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs text-left ${
                  darkMode ? 'divide-slate-800/60' : 'divide-slate-100'
                }`}>
                  {sprintListDetails.map((sprint, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}`)}
                      className={`transition-all duration-150 cursor-pointer ${
                        darkMode ? 'bg-slate-900/40 hover:bg-slate-850/60 text-slate-330' : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {/* Name */}
                      <td className={`py-4 px-5 font-extrabold text-sm ${
                        darkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        {sprint.name}
                      </td>

                      {/* Total Tasks */}
                      <td className="py-4 px-5 text-center font-bold">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
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

                      {/* Chevron Link indicator */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end">
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

      {/* 3. MODAL: ADD MEMBERS */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-extrabold text-base tracking-tight">Add Team Members</h3>
                <p className="text-xs text-slate-400">Select employees to allocate to this project</p>
              </div>
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedNewMembers([]);
                  setMemberSearchQuery('');
                  setModalError(null);
                }}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & List */}
            <form onSubmit={handleAddMembersSubmit}>
              <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or role..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className={`w-full pl-3 pr-3 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
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
                              setModalError(null);
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

                {/* Error Banner */}
                {modalError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
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
                          setModalError(null);
                        } else {
                          const currentCount = (project.members || []).length;
                          const limit = project.team_size || 0;
                          const remaining = limit - currentCount;
                          if (remaining <= 0) {
                            setModalError(`Cannot select more members. Team size limit of ${limit} reached.`);
                            return;
                          }
                          const toSelect = allIds.filter(id => !selectedNewMembers.includes(id)).slice(0, remaining);
                          if (toSelect.length < allIds.filter(id => !selectedNewMembers.includes(id)).length) {
                            setModalError(`Selected only ${toSelect.length} member(s) to match the team size limit of ${limit}.`);
                          } else {
                            setModalError(null);
                          }
                          setSelectedNewMembers(prev => [...prev, ...toSelect]);
                        }
                      }}
                      className="text-[10px] font-bold text-orange-500 dark:text-orange-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
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
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/5'
                              : darkMode
                                ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
                            }`}>
                              {getInitials(emp.user.full_name)}
                            </div>
                            <div>
                              <span className={`block text-xs font-black ${
                                darkMode ? 'text-white' : 'text-slate-800'
                              }`}>
                                {emp.user.full_name}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {emp.designation}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  emp.status === 'BUSY'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'
                                    : emp.status === 'ACTIVE'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20'
                                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
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
                                          className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20"
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
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
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

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMembersModal(false);
                    setSelectedNewMembers([]);
                    setMemberSearchQuery('');
                    setModalError(null);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
                    darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingMembers || selectedNewMembers.length === 0}
                  className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/10"
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
      )}

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

      {/* 4. MODAL: UPLOAD SPRINT */}
      {project && (
        <TaskUploadModal
          isOpen={showUploadSprintModal}
          onClose={() => setShowUploadSprintModal(false)}
          darkMode={darkMode}
          activeProject={project.name}
          projects={{
            [project.name]: {
              id: project.id || '',
              name: project.name || '',
              sprints: {}
            }
          }}
          onImportSuccess={handleImportSuccess}
          projectType={project.type}
        />
      )}

      {/* 4. MODAL: EDIT TEAM LEAD */}
      {showEditLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-extrabold text-base tracking-tight">Edit Project Team Lead</h3>
                <p className="text-xs text-slate-400">Select a new team lead for this project</p>
              </div>
              <button
                onClick={() => setShowEditLeadModal(false)}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Select Team Lead *</label>
                <select
                  value={project.team_lead?.id || ''}
                  onChange={(e) => {
                    const newLeadId = e.target.value;
                    if (newLeadId) {
                      handleChangeTeamLead(newLeadId);
                    }
                  }}
                  className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                      : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-orange-500 focus:bg-white'
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
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex justify-end bg-slate-50/50 dark:bg-slate-100/30">
              <button
                onClick={() => setShowEditLeadModal(false)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
