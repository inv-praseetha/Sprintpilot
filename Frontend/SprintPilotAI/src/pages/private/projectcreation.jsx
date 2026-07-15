import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import ProjectModal from '../../components/Modals/projectmodal';
import ProjectForm from '../../components/Modals/projectform';
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
  ChevronDown
} from 'lucide-react';

export default function ProjectCreation() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState('');

  // Domain Data States
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);

  // UI States
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // Initialize Auth & load configuration
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      navigate('/');
      return;
    }

    setToken(savedToken);
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Check if User is Project Manager
  const isProjectManager = useMemo(() => {
    return currentUser?.role === 'PROJECT_MANAGER';
  }, [currentUser]);

  // Load Skills & Employee Profiles
  const fetchMetadata = async (authToken) => {
    setLoadingMeta(true);
    setMetaError(null);
    console.log("[fetchMetadata] Initiating metadata fetch with token:", authToken ? `${authToken.slice(0, 10)}...` : 'None');
    try {
      // 1. Fetch Skills
      const skillsRes = await fetch('http://localhost:8000/api/projects/skills/', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log("[fetchMetadata] Skills response status:", skillsRes.status);
      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        console.log("[fetchMetadata] Skills data loaded:", skillsData);
        setSkills(skillsData);
      } else {
        const errText = await skillsRes.text();
        console.error("[fetchMetadata] Failed to fetch skills:", skillsRes.status, errText);
        setMetaError(`Failed to load skills: Status ${skillsRes.status}`);
      }

      // 2. Fetch Employee Profiles
      const employeesRes = await fetch('http://localhost:8000/api/projects/employees/', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log("[fetchMetadata] Employees response status:", employeesRes.status);
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        console.log("[fetchMetadata] Employees data loaded:", employeesData);
        setEmployees(employeesData);
      } else {
        const errText = await employeesRes.text();
        console.error("[fetchMetadata] Failed to fetch employees:", employeesRes.status, errText);
        setMetaError(prev => prev ? `${prev} & Failed to load employees: Status ${employeesRes.status}` : `Failed to load employees: Status ${employeesRes.status}`);
      }

    } catch (err) {
      console.error('[fetchMetadata] Error fetching metadata:', err);
      setMetaError(`Network connection error: ${err.message}`);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Load Projects List
  const fetchProjects = async (authToken) => {
    setLoadingProjects(true);
    try {
      const res = await fetch('http://localhost:8000/api/projects/', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (token) {
      fetchProjects(token);
      fetchMetadata(token);
    }
  }, [token]);

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

  // Filter Projects by Search and Status
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

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

  // Filter Skills by selected Category
  const filteredSkills = useMemo(() => {
    if (skillCategoryFilter === 'ALL') return skills;
    return skills.filter(skill => skill.category === skillCategoryFilter);
  }, [skills, skillCategoryFilter]);

  // Dynamic filter: Show only employees who possess all of the selected skills.
  // If no skills are selected, show all active employees.
    const filteredEmployeesForSelection = useMemo(() => {
      if (selectedSkills.length === 0) return employees;
      return employees.filter(emp =>
        emp.skills && selectedSkills.every(skillId => emp.skills.some(empSkill => empSkill.id === skillId))
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
    } else {
      // AGILE requires number of days
      if (!numberOfDays || parseInt(numberOfDays, 10) <= 0) {
        setFormError("Number of days is required for Agile projects.");
        setSubmitting(false);
        return;
      }
    }
    if (!teamSize || parseInt(teamSize, 10) <= 0) {
      setFormError("Team size must be a positive number.");
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
      end_date: endDate || null,
      number_of_days: numberOfDays ? parseInt(numberOfDays, 10) : null,
      team_lead: teamLead,
      members: selectedMembers,
      skills: selectedSkills,
      team_size: teamSize ? parseInt(teamSize, 10) : 0
    };

    try {
      const res = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await res.json();

      if (res.ok) {
        fetchProjects(token);
        setShowModal(false);
        resetForm();
      } else {
        setFormError(data.detail || JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setFormError('Failed to connect to the server. Please check your network.');
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
              onClick={() => { resetForm(); setShowModal(true); }}
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
      ) : filteredProjects.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`p-6.5 rounded-3xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
                darkMode 
                  ? 'bg-slate-900 border-slate-850 hover:border-slate-750' 
                  : 'bg-white border-slate-100 hover:shadow-2xl hover:shadow-slate-100/70 hover:border-slate-200/50'
              }`}
            >
              <div className="space-y-4.5">
                {/* Badges Row */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    project.type === 'AGILE'
                      ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                  }`}>
                    {project.type}
                  </span>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    project.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : project.status === 'ON_HOLD'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Project Title */}
                <div>
                  <h3 className="font-extrabold text-2xl tracking-tight line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed font-medium">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Date / Timeline Offset */}
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-4 text-xs font-bold ${
                  darkMode ? 'bg-slate-950/60' : 'bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4.5 h-4.5 text-slate-450" />
                    {project.start_date ? (
                      <span>{project.start_date} - {project.end_date || 'Ongoing'}</span>
                    ) : (
                      <span>No timeline set</span>
                    )}
                  </div>
                  {project.number_of_days && (
                    <div className="flex items-center gap-1.5 text-orange-500 font-extrabold">
                      <Clock className="w-4 h-4" />
                      <span>{project.number_of_days} Days</span>
                    </div>
                  )}
                </div>

                {/* Technical Stack (Skills) */}
                {project.skills && project.skills.length > 0 && (
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Code className="w-3 h-3 text-slate-400" /> Technologies / Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Members / Team Section */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-6 pt-4 flex items-center justify-between">
                {/* Team Lead Info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-xs border border-orange-500/20 shadow-sm">
                    {project.team_lead?.full_name ? project.team_lead.full_name.charAt(0) : 'TL'}
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Team Lead</span>
                    <span className="text-xs font-bold text-slate-655 dark:text-slate-300">
                      {project.team_lead?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/25 shadow-sm" title="Total Team Size">
                    Size: {project.team_size || 0}
                  </span>
                  <div className="flex -space-x-2.5 overflow-hidden">
                    {project.members && project.members.map((member) => (
                      <div
                        key={member.id}
                        title={`${member.user?.full_name} (${member.designation})`}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-450 flex items-center justify-center font-bold text-[10px] border-2 border-white dark:border-slate-900"
                      >
                        {member.user?.full_name ? member.user.full_name.charAt(0) : '?'}
                      </div>
                    ))}
                    {(!project.members || project.members.length === 0) && (
                      <span className="text-[10px] text-slate-400 font-semibold italic">No members</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            onClick={() => fetchMetadata(token)}
            className="px-3 py-1 rounded bg-orange-500 text-white font-bold text-[10px] hover:bg-orange-600 transition-all cursor-pointer"
          >
            Force Sync Metadata
          </button>
        </div>
      </section> */}

    </main>
  );
}
