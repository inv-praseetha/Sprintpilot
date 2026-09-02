import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import ProjectModal from '../../components/Modals/projectmodal';
import ProjectForm from '../../components/Modals/projectform';
import ProjectCreationHeader from '../../components/ProjectCreation/ProjectCreationHeader';
import ProjectCreationFilters from '../../components/ProjectCreation/ProjectCreationFilters';
import ProjectEmptyState from '../../components/ProjectCreation/ProjectEmptyState';
import ProjectTable from '../../components/ProjectCreation/ProjectTable';
import ProjectPagination from '../../components/ProjectCreation/ProjectPagination';
import { useValidationLimits } from '../../hooks/useValidationLimits';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  Plus,
  Search,
  Calendar,
  Users,
  Check,
  Briefcase,
  Code,
  AlertCircle,
  X,
  Clock,
  Shield,
  Loader2,
  Filter,
  CheckSquare,
  ChevronDown,
  Edit,
  Trash2
} from 'lucide-react';

const calculateEndDate = (startDateStr, workingDaysStr) => {
  if (!startDateStr || !workingDaysStr) return '';
  const totalDays = parseInt(workingDaysStr, 10);
  if (isNaN(totalDays) || totalDays <= 0) return '';

  let currentDate = new Date(startDateStr);
  let addedDays = 0;

  // Roll forward if starting on a weekend
  while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  while (addedDays < totalDays - 1) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getEffectiveSkills = (project) => {
  if (!project.skills || project.skills.length === 0) return [];
  if (!project.members || project.members.length === 0) {
    return project.skills;
  }

  const memberSkillIds = new Set();
  project.members.forEach(member => {
    if (member.skills) {
      member.skills.forEach(s => memberSkillIds.add(s.id));
    }
  });

  const effective = project.skills.filter(skill => memberSkillIds.has(skill.id));
  return effective.length > 0 ? effective : project.skills;
};

export default function ProjectCreation() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { user: currentUser, logout: handleLogout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  // Domain Data States
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);

  // UI States
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const limits = useValidationLimits();

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Form Field States
  const [projectId, setProjectId] = useState('');
  const [jiraId, setJiraId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [type, setType] = useState('AGILE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('10'); // Default to 10 for Agile
  const [teamLead, setTeamLead] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [teamSize, setTeamSize] = useState('0');

  // Category and Skill Filter States for form
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('ALL');

  // Form Feedback States
  const [formError, setFormError] = useState(null);
  const [metaError, setMetaError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isProjectManager = useMemo(() => {
    return currentUser?.role === 'PROJECT_MANAGER';
  }, [currentUser]);

  const fetchMetadata = async () => {
    setLoadingMeta(true);
    setMetaError(null);
    console.log("[fetchMetadata] Initiating metadata fetch");
    try {
      // 1. Fetch Skills
      const skillsRes = await apiClient.get('projects/skills/');
      setSkills(skillsRes.data.results !== undefined ? skillsRes.data.results : skillsRes.data);

      // 2. Fetch Employee Profiles
      const employeesRes = await apiClient.get('projects/employees/');
      setEmployees(employeesRes.data.results !== undefined ? employeesRes.data.results : employeesRes.data);
    } catch (err) {
      console.error('[fetchMetadata] Error fetching metadata:', err);
      setMetaError(`Network connection error: ${err.message || 'Error fetching metadata'}`);
    } finally {
      setLoadingMeta(false);
    }
  };

  const fetchProjects = async (page = 1) => {
    setLoadingProjects(true);
    try {
      const params = {
        page,
        name: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const res = await apiClient.get('projects/', { params });
      if (res.data && res.data.results !== undefined) {
        setProjects(res.data.results);
        setTotalCount(res.data.count);
        setHasNextPage(res.data.next !== null);
        setHasPrevPage(res.data.previous !== null);
        setCurrentPage(page);
      } else {
        setProjects(Array.isArray(res.data) ? res.data : []);
        setTotalCount(Array.isArray(res.data) ? res.data.length : 0);
        setHasNextPage(false);
        setHasPrevPage(false);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      if (err.response?.status === 404 && page > 1) {
        fetchProjects(1);
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Fetch projects when searchQuery or statusFilter changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects(1);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, statusFilter]);

  // Automatically update number of days when Type changes
  useEffect(() => {
    if (type === 'AGILE') {
      setNumberOfDays('10');
    } else {
      setNumberOfDays('');
    }
  }, [type]);

  // Calculate number of days for Waterfall when dates change
  useEffect(() => {
    if (type === 'WATERFALL' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (!isNaN(diffDays)) {
        setNumberOfDays(diffDays.toString());
      }
    }
  }, [startDate, endDate, type]);

  // Filter Projects by Search and Status (Now handled on server-side pagination)
  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);

  // Filter Team Leads (Employees with role TEAM_LEAD)
  const teamLeads = useMemo(() => {
    return employees.filter(emp => emp.user?.role === 'TEAM_LEAD');
  }, [employees]);

  // Pre-select praseethaku232@gmail.com as the default Team Lead if available
  useEffect(() => {
    if (teamLeads.length > 0 && !teamLead) {
      const defaultLead = teamLeads.find(l => l.user?.email === 'praseethaku232@gmail.com');
      if (defaultLead) {
        setTeamLead(defaultLead.user?.id);
      }
    }
  }, [teamLeads, teamLead]);

  // Filter Skills by selected Category (Show UI and BACKEND only)
  const filteredSkills = useMemo(() => {
    const allowedSkills = skills.filter(skill => skill.category === 'UI' || skill.category === 'BACKEND');
    if (skillCategoryFilter === 'ALL') return allowedSkills;
    return allowedSkills.filter(skill => skill.category === skillCategoryFilter);
  }, [skills, skillCategoryFilter]);

  // Dynamic filter: Show only employees who possess all of the selected skills.
  // If no skills are selected, show all active employees.
  // Always include already selected members so they don't disappear from the dropdown.
  const filteredEmployeesForSelection = useMemo(() => {
    const activeEmployees = employees.filter(emp =>
      (emp.status === 'ACTIVE' || emp.status === 'WFM' || selectedMembers.includes(emp.id)) &&
      emp.user?.role !== 'TEAM_LEAD'
    );
    if (selectedSkills.length === 0) return activeEmployees;
    return activeEmployees.filter(emp =>
      selectedMembers.includes(emp.id) || 
      (emp.skills && selectedSkills.some(skillId => emp.skills.some(empSkill => String(empSkill.id) === String(skillId))))
    );
  }, [employees, selectedSkills, selectedMembers]);

  // Handle Project Creation Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!projectId || !projectId.trim()) {
      setFormError("Project ID is required.");
      setSubmitting(false);
      return;
    }
    if (!/^[A-Z0-9\-]+$/.test(projectId.trim())) {
      setFormError("Project ID must be alphanumeric and uppercase (hyphens allowed).");
      setSubmitting(false);
      return;
    }

    if (jiraId && jiraId.trim()) {
      if (jiraId.trim().length > 10) {
        setFormError("Jira ID cannot exceed 10 characters.");
        setSubmitting(false);
        return;
      }
      if (!/^[A-Z][A-Z0-9]+$/.test(jiraId.trim())) {
        setFormError("Jira ID must start with an uppercase letter and be uppercase alphanumeric.");
        setSubmitting(false);
        return;
      }
    }

    if (!name.trim()) {
      setFormError("Project Name is required.");
      setSubmitting(false);
      return;
    }

    if (description && description.trim().length === 0) {
      setFormError("Description cannot be purely whitespace.");
      setSubmitting(false);
      return;
    }

    if (!teamLead) {
      setFormError("A Team Lead must be assigned.");
      setSubmitting(false);
      return;
    }
    if (!status) {
      setFormError("Project status is required.");
      setSubmitting(false);
      return;
    }
    if (!type) {
      setFormError("Project type is required.");
      setSubmitting(false);
      return;
    }
    let computedDays = numberOfDays ? parseInt(numberOfDays, 10) : null;
    let computedEndDate = endDate || null;
    if (type === 'WATERFALL') {
      if (!startDate || !endDate) {
        setFormError("Start Date and End Date are required for Waterfall projects.");
        setSubmitting(false);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (end < start) {
        setFormError("End Date must be greater than or equal to Start Date.");
        setSubmitting(false);
        return;
      }
      if (!editingProjectId && start < today) {
        setFormError("Start Date must be greater than or equal to today.");
        setSubmitting(false);
        return;
      }
      if (!editingProjectId && end < today) {
        setFormError("End Date must be greater than or equal to today.");
        setSubmitting(false);
        return;
      }
      const diffTime = Math.abs(end - start);
      computedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // AGILE requires number of days and start date
      if (!startDate) {
        setFormError("Start Date is required for Agile projects.");
        setSubmitting(false);
        return;
      }

      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!editingProjectId && start < today) {
        setFormError("Start Date must be greater than or equal to today.");
        setSubmitting(false);
        return;
      }

      if (!numberOfDays || parseInt(numberOfDays, 10) <= 0) {
        setFormError("Number of days is required for Agile projects.");
        setSubmitting(false);
        return;
      }
      computedEndDate = calculateEndDate(startDate, numberOfDays);
    }
    if (!teamSize || parseInt(teamSize, 10) <= 0) {
      setFormError("Team size must be a positive number.");
      setSubmitting(false);
      return;
    }
    const maxTeamSize = parseInt(teamSize, 10);
    if (selectedMembers.length > maxTeamSize) {
      setFormError(`Cannot allocate more members (${selectedMembers.length}) than the project team size (${maxTeamSize}).`);
      setSubmitting(false);
      return;
    }
    if (selectedMembers.length === 0) {
      setFormError("At least one team member must be selected.");
      setSubmitting(false);
      return;
    }
    if (selectedSkills.length === 0) {
      setFormError("At least one skill must be selected.");
      setSubmitting(false);
      return;
    }

    const requestData = {
      project_id: projectId.trim() || null,
      jira_id: jiraId?.trim() || null,
      name,
      description: description.trim() || null,
      status,
      type,
      start_date: startDate || null,
      end_date: computedEndDate,
      number_of_days: computedDays,
      team_lead: teamLead,
      team_size: teamSize ? parseInt(teamSize, 10) : 0
    };

    requestData.members = selectedMembers;
    requestData.skills = selectedSkills;

    try {
      const response = editingProjectId
        ? await apiClient.put(`projects/${editingProjectId}/`, requestData)
        : await apiClient.post('projects/', requestData);

      fetchProjects(editingProjectId ? currentPage : 1);
      fetchMetadata();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Error saving project:', err);
      setFormError(err.response?.data?.detail || err.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setProjectId('');
    setJiraId('');
    setName('');
    setDescription('');
    setStatus('ACTIVE');
    setType('AGILE');
    setStartDate('');
    setEndDate('');
    setNumberOfDays('10');
    // Keep the default team lead selection if available
    const defaultLead = teamLeads.find(l => l.user?.email === 'praseethaku232@gmail.com');
    setTeamLead(defaultLead ? defaultLead.user?.id : '');
    setSelectedMembers([]);
    setSelectedSkills([]);
    setTeamSize('0');
    setSkillCategoryFilter('ALL');
    setFormError(null);
  };

  const handleEditProject = (project) => {
    setEditingProjectId(project.id);
    setProjectId(project.project_id || '');
    setJiraId(project.jira_id || '');
    setName(project.name || '');
    setDescription(project.description || '');
    setStatus(project.status || 'ACTIVE');
    setType(project.type || 'AGILE');
    setStartDate(project.start_date || '');
    setEndDate(project.end_date || '');
    setNumberOfDays(project.number_of_days ? String(project.number_of_days) : '10');
    setTeamLead(project.team_lead?.id || '');
    setSelectedMembers(project.members ? project.members.map(m => m.id || m) : []);
    setSelectedSkills(project.skills ? project.skills.map(s => s.id || s) : []);
    setTeamSize(project.team_size ? String(project.team_size) : '0');
    setFormError(null);
    setShowModal(true);
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await apiClient.patch(`projects/${projectId}/`, { status: newStatus });
      fetchProjects(currentPage);
      fetchMetadata();
    } catch (err) {
      console.error("Error changing project status:", err);
      toast.error(err.response?.data?.detail || "Failed to update project status.");
    }
  };

  const handleDeleteProject = async (projectId) => {
    let sprintCount = 0;
    let openTaskCount = 0;
    try {
      const summaryRes = await apiClient.get(`projects/${projectId}/delete-summary/`);
      sprintCount = summaryRes.data.sprint_count || 0;
      openTaskCount = summaryRes.data.open_task_count || 0;
    } catch (err) {
      console.error("Error fetching delete summary:", err);
    }

    const message = `Are you sure you want to delete this project? It has ${sprintCount} sprints and ${openTaskCount} open tasks in those sprints. Upon deletion, an email will be sent to the Team Lead and the project/tasks will be removed from Backlog.`;

    const isConfirmed = await confirm({
      title: 'Delete Project',
      message: message,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!isConfirmed) {
      return;
    }
    
    setDeletingProjectId(projectId);
    try {
      await apiClient.delete(`projects/${projectId}/`);
      toast.success("Project deleted successfully!");
      fetchProjects(currentPage);
      fetchMetadata();
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error(err.response?.data?.detail || err.message || "Failed to delete project.");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleRowClick = (e, projectId) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('svg') || e.target.closest('select')) {
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  const toggleMemberSelection = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const toggleSkillSelection = (id) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  return (
    <main className="p-8 lg:p-10 space-y-8 mx-auto text-left">

      {/* PAGE HEADER */}
      <ProjectCreationHeader
        isProjectManager={isProjectManager}
        onCreateClick={() => { setEditingProjectId(null); resetForm(); setShowModal(true); }}
      />

      {/* METRICS & FILTERS ROW */}
      <ProjectCreationFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        darkMode={darkMode}
        limits={limits}
      />

      {/* METADATA LOADING ERROR ALERT */}
      {metaError && (
        <section className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-semibold text-left">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0 animate-pulse" />
            <div>
              <span className="block font-bold text-base">Session Expired or Unauthorized</span>
              <span className="text-xs font-medium opacity-90 text-rose-450 dark:text-rose-400">
                {metaError.includes('401')
                  ? 'Your login session has expired. Please sign in again to obtain a fresh credentials token.'
                  : `${metaError}. Please verify the Django backend is active.`}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
          >
            Sign In Again
          </button>
        </section>
      )}

      {/* PROJECTS LISTING */}
      {loadingProjects ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading project portfolio...</span>
        </div>
      ) : totalCount === 0 ? (
        <ProjectEmptyState
          darkMode={darkMode}
          isProjectManager={isProjectManager}
          onAddProject={() => setShowModal(true)}
        />
      ) : (
        <div className={`overflow-hidden rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/50'
          }`}>
          <ProjectTable
            filteredProjects={filteredProjects}
            darkMode={darkMode}
            isProjectManager={isProjectManager}
            handleRowClick={handleRowClick}
            handleStatusChange={handleStatusChange}
            handleEditProject={handleEditProject}
            handleDeleteProject={handleDeleteProject}
            deletingProjectId={deletingProjectId}
          />

          {/* Pagination Controls */}
          <ProjectPagination
            currentPage={currentPage}
            totalCount={totalCount}
            fetchProjects={fetchProjects}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <ProjectModal
        show={showModal}
        onClose={() => setShowModal(false)}
        darkMode={darkMode}
        title={editingProjectId ? 'Update your project' : 'Create New Project'}
      >
        <ProjectForm
          handleSubmit={handleSubmit}
          formError={formError}
          calculateEndDate={calculateEndDate}
          darkMode={darkMode}
          projectId={projectId}
          setProjectId={setProjectId}
          jiraId={jiraId}
          setJiraId={setJiraId}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          type={type}
          setType={setType}
          status={status}
          setStatus={setStatus}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          numberOfDays={numberOfDays}
          setNumberOfDays={setNumberOfDays}
          teamLead={teamLead}
          setTeamLead={setTeamLead}
          teamLeads={teamLeads}
          skillCategoryFilter={skillCategoryFilter}
          setSkillCategoryFilter={setSkillCategoryFilter}
          filteredSkills={filteredSkills}
          selectedSkills={selectedSkills}
          toggleSkillSelection={toggleSkillSelection}
          filteredEmployeesForSelection={filteredEmployeesForSelection}
          employees={employees}
          selectedMembers={selectedMembers}
          toggleMemberSelection={toggleMemberSelection}
          onClose={() => setShowModal(false)}
          submitting={submitting}
          editingProjectId={editingProjectId}
        />
      </ProjectModal>

    </main>
  );
}
