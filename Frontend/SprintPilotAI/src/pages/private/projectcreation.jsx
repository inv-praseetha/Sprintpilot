import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import ProjectModal from '../../components/Modals/projectmodal';
import ProjectForm from '../../components/Modals/projectform';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
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

export const calculateEndDate = (startDateStr, workingDaysStr) => {
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

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Form Field States
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

  // Check if User is Project Manager
  const isProjectManager = useMemo(() => {
    return currentUser?.role === 'PROJECT_MANAGER';
  }, [currentUser]);

  // Load Skills & Employee Profiles
  const fetchMetadata = async () => {
    setLoadingMeta(true);
    setMetaError(null);
    console.log("[fetchMetadata] Initiating metadata fetch");
    try {
      // 1. Fetch Skills
      const skillsRes = await apiClient.get('projects/skills/');
      setSkills(skillsRes.data);

      // 2. Fetch Employee Profiles
      const employeesRes = await apiClient.get('projects/employees/');
      setEmployees(employeesRes.data);

    } catch (err) {
      console.error('[fetchMetadata] Error fetching metadata:', err);
      setMetaError(`Network connection error: ${err.message || 'Error fetching metadata'}`);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Load Projects List
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
    const filteredEmployeesForSelection = useMemo(() => {
      if (selectedSkills.length === 0) return employees;
      return employees.filter(emp =>
        emp.skills && selectedSkills.some(skillId => emp.skills.some(empSkill => empSkill.id === skillId))
      );
    }, [employees, selectedSkills]);

  // Handle Project Creation Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!name.trim()) {
      setFormError("Project Name is required.");
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
      if (new Date(endDate) <= new Date(startDate)) {
        setFormError("End Date must be greater than Start Date.");
        setSubmitting(false);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      computedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // AGILE requires number of days and start date
      if (!startDate) {
        setFormError("Start Date is required for Agile projects.");
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
      name,
      description: description.trim() || null,
      status,
      type,
      start_date: startDate || null,
      end_date: computedEndDate,
      number_of_days: computedDays,
      team_lead: teamLead,
      members: selectedMembers,
      skills: selectedSkills,
      team_size: teamSize ? parseInt(teamSize, 10) : 0
    };

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
      alert(err.response?.data?.detail || "Failed to update project status.");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }
    try {
      await apiClient.delete(`projects/${projectId}/`);
      fetchProjects(currentPage);
      fetchMetadata();
    } catch (err) {
      console.error("Error deleting project:", err);
      alert(err.response?.data?.detail || err.message || "Failed to delete project.");
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
    <main className="p-8 lg:p-10 space-y-8 max-w-[1400px] mx-auto text-left">
      
      {/* PAGE HEADER */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
        <div>
          <span className="text-sm font-semibold text-orange-500 uppercase tracking-wider">Create Project</span>
          <h1 className="text-4xl font-black tracking-tight mt-1">
            Assign Your Sprints
          </h1>
        </div>

        <div>
          {isProjectManager ? (
            <button
              onClick={() => { setEditingProjectId(null); resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Create Project</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 text-sm font-bold border border-slate-200 dark:border-slate-700">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Read-Only Mode</span>
            </div>
          )}
        </div>
      </section>

      {/* METRICS & FILTERS ROW */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${
              darkMode 
                ? 'bg-slate-900 border-slate-800/60 text-slate-200 placeholder-slate-500 focus:border-orange-500' 
                : 'bg-white border-slate-100 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:shadow-md'
            }`}
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === filter
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                  : darkMode
                    ? 'bg-slate-900 border-slate-800/60 text-slate-400 hover:text-slate-200'
                    : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'ALL' ? 'All Sprints' : filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </section>

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
        <div className={`p-16 rounded-3xl border-2 border-dashed text-center space-y-5 ${
          darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-slate-200/40 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Briefcase className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-xl">No Projects Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              There are no projects matching your filter criteria. Let's create your first workspace project.
            </p>
          </div>
          {isProjectManager && (
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/15 cursor-pointer"
            >
              Add Project
            </button>
          )}
        </div>
      ) : (
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/50'
        }`}>
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-left">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={(e) => handleRowClick(e, project.id)}
                    className="text-sm font-semibold transition-colors hover:bg-slate-50/20 dark:hover:bg-slate-900/10 cursor-pointer"
                  >
                    {/* Project Title & Description */}
                    <td className="py-5 px-6 max-w-sm">
                      <div className="space-y-1">
                        <span className={`block font-extrabold text-base tracking-tight ${
                          darkMode ? 'text-white' : 'text-slate-900'
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
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        project.type === 'AGILE'
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
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all outline-none ${
                            project.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20'
                              : project.status === 'ON_HOLD'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/25 hover:bg-amber-500/20'
                                : 'bg-slate-500/10 text-slate-655 border-slate-500/25 hover:bg-slate-500/20'
                          }`}
                        >
                          <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ACTIVE</option>
                          <option value="ON_HOLD" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ON HOLD</option>
                          <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">COMPLETED</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          project.status === 'ACTIVE'
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
                        <div className="flex items-center gap-1.5 text-xs text-slate-455 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
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
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-350' : 'text-slate-700'}`}>
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
                      <span className="text-[10px] font-black px-2.5 py-1.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm">
                        {project.team_size || 0} Members
                      </span>
                    </td>

                    {/* Actions Column */}
                    {isProjectManager && (
                      <td className="py-5 px-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditProject(project)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            title="Delete Project"
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

          {/* Pagination Controls */}
          <div className={`px-6 py-4 flex items-center justify-between border-t transition-colors ${
            darkMode 
              ? 'border-slate-850 bg-slate-900/60' 
              : 'border-slate-100 bg-slate-50/30'
          }`}>
            <div className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing page <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentPage}</span> of <span className={`font-extrabold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{Math.ceil(totalCount / 5) || 1}</span> ({totalCount} total projects)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchProjects(currentPage - 1)}
                disabled={!hasPrevPage}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${
                  hasPrevPage
                    ? darkMode
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
                      : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-705 cursor-pointer shadow-sm shadow-slate-100/50'
                    : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
              >
                Previous
              </button>

              {/* Dynamic Page Numbers */}
              {Array.from({ length: Math.ceil(totalCount / 5) || 1 }, (_, i) => i + 1).map((p) => {
                const isSelected = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => fetchProjects(p)}
                    className={`w-8.5 h-8.5 rounded-xl border text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
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
                onClick={() => fetchProjects(currentPage + 1)}
                disabled={!hasNextPage}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide flex items-center gap-1 transition-all ${
                  hasNextPage
                    ? darkMode
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-950 text-white cursor-pointer hover:bg-slate-900'
                      : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-705 cursor-pointer shadow-sm shadow-slate-100/50'
                    : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <ProjectModal
        show={showModal}
        onClose={() => setShowModal(false)}
        darkMode={darkMode}
      >
        <ProjectForm
          handleSubmit={handleSubmit}
          formError={formError}
          calculateEndDate={calculateEndDate}
          darkMode={darkMode}
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
          selectedMembers={selectedMembers}
          toggleMemberSelection={toggleMemberSelection}
          onClose={() => setShowModal(false)}
          submitting={submitting}
          editingProjectId={editingProjectId}
        />
      </ProjectModal>

      {/* DEVELOPMENT STATE DIAGNOSTICS
      <section className={`mt-12 p-6 rounded-3xl border text-xs font-mono space-y-3 ${
        darkMode ? 'bg-slate-905/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <h4 className="font-bold text-sm text-orange-500 uppercase tracking-wider">System Integration Diagnostics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="block text-slate-400 font-bold">User Authenticated:</span>
            <span>{currentUser ? `${currentUser.full_name} (${currentUser.role})` : 'No'}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold">Total Skills Loaded:</span>
            <span>{skills.length} (Filtered: {filteredSkills.length})</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold">Total Profiles Loaded:</span>
            <span>{employees.length}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold">Filtered Team Leads:</span>
            <span>{teamLeads.length}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => fetchMetadata()}
            className="px-3 py-1 rounded bg-orange-500 text-white font-bold text-[10px] hover:bg-orange-600 transition-all cursor-pointer"
          >
            Force Sync Metadata
          </button>
        </div>
      </section> */}

    </main>
  );
}
