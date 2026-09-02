import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import { useValidationLimits } from '../../hooks/useValidationLimits';
import apiClient from '../../api/apiClient';
import TaskUploadModal from '../../components/Modals/TaskUploadModal';
import AddMembersModal from '../../components/ProjectDetail/AddMembersModal';
import EditLeadModal from '../../components/ProjectDetail/EditLeadModal';
import CloseSprintModal from '../../components/ProjectDetail/CloseSprintModal';
import TeamRoster from '../../components/ProjectDetail/TeamRoster';
import SprintsList from '../../components/ProjectDetail/SprintsList';
import ProjectOverviewCard from '../../components/ProjectDetail/ProjectOverviewCard';
import ReassignTasksModal from '../../components/ProjectDetail/ReassignTasksModal';
import BacklogMultiSyncModal from '../../components/ProjectDetail/BacklogMultiSyncModal';
import { getEffectiveSkills } from './projectcreation';
import SprintServices from '../../services/SprintServices';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
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
  Pencil,
  ExternalLink,
  Lock
} from 'lucide-react';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);

  // Project and Domain States
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI Toggle States
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showUploadSprintModal, setShowUploadSprintModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const limits = useValidationLimits();

  // Add Member State
  // (Moved to AddMembersModal)



  // Close Sprint Modal State
  const [showCloseSprintModal, setShowCloseSprintModal] = useState(false);
  const [closingSprintId, setClosingSprintId] = useState(null);
  const [closingSprintSummary, setClosingSprintSummary] = useState(null);
  const [isClosingSprint, setIsClosingSprint] = useState(false);
  const [closureError, setClosureError] = useState(null);

  // Sprints state
  const [sprints, setSprints] = useState([]);

  // Reassign Task Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [memberToReassign, setMemberToReassign] = useState(null);
  
  // Backlog Sync Modal States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPayload, setSyncPayload] = useState({});

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
      setEmployees(employeesRes.data.results !== undefined ? employeesRes.data.results : employeesRes.data);
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

  useEffect(() => {
    if (sessionStorage.getItem('open_jira_modal') === 'true') {
      setShowUploadSprintModal(true);
    }
  }, []);

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
        name: sprint.milestone || sprint.name,
        totalTasks,
        startDate,
        endDate,
        status: sprint.backlog_status,
        progressPercentage: sprint.progress_percentage || 0,
        workspaceUrl: sprint.workspace_url,
        jiraUrl: sprint.jira_url,
        rawStartDate: sprint.start_date,
        createdAt: sprint.created_at
      };
    }).sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
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
      throw new Error(`Cannot allocate more members than the project team size of ${limit}. You have ${currentMemberIds.length} current members and selected ${selectedIds.length} new members (total ${updatedMemberIds.length}).`);
    }

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
      toast.error(err.response?.data?.detail || 'Failed to add members.');
      throw err;
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
      toast.error(err.response?.data?.detail || 'Failed to change team lead.');
    }
  };



  // Remove member from project
  const handleRemoveMember = async (memberProfileId) => {
    const isConfirmed = await confirm({
      title: 'Remove Project Member',
      message: 'Are you sure you want to remove this member from the project?',
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!isConfirmed) {
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
      const errorMsg = err.response?.data?.detail || err.response?.data?.[0] || '';

      if (typeof errorMsg === 'string' && errorMsg.includes('active tasks')) {
        setMemberToReassign(memberProfileId);
        setShowReassignModal(true);
      } else {
        toast.error(errorMsg || 'Failed to remove member.');
      }
    }
  };

  const handleConfirmReassign = async (oldId, newId) => {
    try {
      const response = await apiClient.post(`projects/${projectId}/reassign-and-remove/`, {
        old_member_id: oldId,
        new_member_id: newId
      });
      
      const affectedSprints = response.data.affected_sprints || {};
      
      if (Object.keys(affectedSprints).length > 0) {
        setSyncPayload(affectedSprints);
        setShowReassignModal(false);
        setMemberToReassign(null);
        setShowSyncModal(true); // Open the sync modal
      } else {
        toast.success('Tasks reassigned and member removed successfully!');
        setShowReassignModal(false);
        setMemberToReassign(null);
        await fetchProjectData();
        await fetchSprints();
      }
    } catch (err) {
      console.error('[ProjectDetail] Error reassigning tasks:', err);
      toast.error(err.response?.data?.detail || 'Failed to reassign tasks.');
    }
  };

  const handleSyncComplete = async () => {
    setShowSyncModal(false);
    setSyncPayload({});
    toast.success('Member removed and Backlog synced successfully!');
    await fetchProjectData();
    await fetchSprints();
  };

  const handleImportSuccess = async ({ milestoneName, tasks, holidays, sprintStartDate, sprintEndDate, targetProjectKey, jiraSprintName }) => {
    try {
      const sprintData = {
        name: milestoneName,
        goal: '',
        start_date: sprintStartDate,
        end_date: sprintEndDate,
        status: 'ACTIVE',
        tasks: tasks,
        holidays: holidays,
        backlog_version_id: jiraSprintName || null
      };

      await SprintServices.createSprint(projectId, sprintData);
      await fetchSprints();

      toast.success(`Successfully imported Milestone "${milestoneName}" with ${tasks.length} tasks!`);
    } catch (err) {
      console.error('[ProjectDetail] Error creating sprint:', err);
      toast.error(err.response?.data?.detail || 'Failed to import sprint tasks.');
    }
  };

  const handleOpenCloseModal = async (e, sprintId) => {
    e.stopPropagation();
    setClosingSprintId(sprintId);
    setClosureError(null);
    setClosingSprintSummary(null);
    try {
      const response = await apiClient.get(`sprints/${sprintId}/closure-summary/`);
      setClosingSprintSummary(response.data);
      setShowCloseSprintModal(true);
    } catch (err) {
      console.error('[ProjectDetail] Error fetching closure summary:', err);
      toast.error(err.response?.data?.detail || 'Failed to fetch sprint closure summary.');
      setClosingSprintId(null);
    }
  };

  const handleConfirmCloseSprint = async () => {
    setIsClosingSprint(true);
    setClosureError(null);
    try {
      await apiClient.post(`sprints/${closingSprintId}/close/`);
      setShowCloseSprintModal(false);
      setClosingSprintId(null);
      setClosingSprintSummary(null);
      toast.success("Milestone closed successfully and synced with Backlog!");
      fetchSprints();
    } catch (err) {
      console.error('[ProjectDetail] Error closing sprint:', err);
      const errMsg = err.response?.data?.detail || err.message || "Failed to close sprint. Please try again.";
      setClosureError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsClosingSprint(false);
    }
  };

  const handleDeleteSprint = async (e, sprintId, isSynced) => {
    e.stopPropagation();

    if (isSynced) {
      toast.error('Cannot delete: This sprint is already synced with Backlog. If you want to remove it, please delete the tasks individually.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Delete Sprint',
      message: 'Are you sure you want to delete this sprint? All tasks within it will be deleted.',
      confirmText: 'Delete',
      type: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await apiClient.delete(`sprints/${sprintId}/`);
      toast.success("Sprint deleted successfully!");
      fetchSprints();
    } catch (err) {
      console.error('[ProjectDetail] Error deleting sprint:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete sprint.');
    }
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
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects List
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 sm:p-8 mx-auto min-h-screen overflow-x-hidden ${darkMode ? 'text-white' : 'text-slate-800'}`}>

      {/* Back navigation */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects List
        </button>
      </div>

      {/* Main header banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
        <div className="text-left space-y-2 flex-1 min-w-0 w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight break-all">
              {project.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider truncate max-w-[150px] inline-block ${project.status === 'ACTIVE'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : project.status === 'ON_HOLD'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
              }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed truncate">
            {project.description || 'No project description is available. Add description from edit panel.'}
          </p>
        </div>

        {/* Action Button Row */}
        {isProjectManager && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 min-w-0">
            <button
              onClick={() => setShowAddMembersModal(true)}
              disabled={project.status === 'COMPLETED'}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg min-w-0 ${project.status === 'COMPLETED'
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10 cursor-pointer'
                }`}
              title={project.status === 'COMPLETED' ? "Cannot add members to a completed project" : ""}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="truncate">Add Members</span>
            </button>
            <button
              onClick={() => setShowUploadSprintModal(true)}
              disabled={project.status === 'COMPLETED'}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg min-w-0 ${project.status === 'COMPLETED'
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/10 cursor-pointer'
                }`}
              title={project.status === 'COMPLETED' ? "Cannot upload sprints to a completed project" : ""}
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span className="truncate">Upload Sprint</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. COLLAPSIBLE PROJECT DETAILS ACCORDION */}
      <ProjectOverviewCard project={project} darkMode={darkMode} />

      {/* 2. TEAM MEMBERS ACTIVE ROSTER */}
      <TeamRoster
        project={project}
        darkMode={darkMode}
        employees={employees}
        isProjectManager={isProjectManager}
        setShowAddMembersModal={setShowAddMembersModal}
        setShowEditLeadModal={setShowEditLeadModal}
        handleRemoveMember={handleRemoveMember}
      />

      {/* 3. SPRINTS LIST VIEW */}
      <SprintsList
        darkMode={darkMode}
        sprintListDetails={sprintListDetails}
        projectId={projectId}
        isProjectManager={isProjectManager}
        handleOpenCloseModal={handleOpenCloseModal}
        handleDeleteSprint={handleDeleteSprint}
      />

      {/* 3. MODAL: ADD MEMBERS */}
      <AddMembersModal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        darkMode={darkMode}
        project={project}
        employees={employees}
        onAddMembers={handleAddMembers}
        limits={limits}
      />



      {/* 4. MODAL: UPLOAD SPRINT */}
      {project && (
        <TaskUploadModal
          isOpen={showUploadSprintModal}
          onClose={() => setShowUploadSprintModal(false)}
          darkMode={darkMode}
          activeProject={project.name}
          projectJiraId={project.jira_id}
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
      <EditLeadModal
        isOpen={showEditLeadModal}
        onClose={() => setShowEditLeadModal(false)}
        darkMode={darkMode}
        project={project}
        teamLeads={teamLeads}
        onChangeTeamLead={handleChangeTeamLead}
      />

      {/* 5. MODAL: CLOSE SPRINT */}
      <CloseSprintModal
        isOpen={showCloseSprintModal}
        onClose={() => setShowCloseSprintModal(false)}
        darkMode={darkMode}
        closureError={closureError}
        closingSprintSummary={closingSprintSummary}
        isClosingSprint={isClosingSprint}
        onConfirmClose={handleConfirmCloseSprint}
      />

      <ReassignTasksModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        darkMode={darkMode}
        members={project?.members || []}
        oldMemberId={memberToReassign}
        onConfirmReassign={handleConfirmReassign}
        allEmployees={employees}
        projectSkills={project?.skills || []}
      />

      <BacklogMultiSyncModal
        isOpen={showSyncModal}
        darkMode={darkMode}
        affectedSprints={syncPayload}
        onComplete={handleSyncComplete}
      />
    </div>
  );
}
