import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
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
  Loader2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

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
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showUploadSprintModal, setShowUploadSprintModal] = useState(false);

  // Add Member State
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [updatingMembers, setUpdatingMembers] = useState(false);

  // Sprint Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, parsing, success, error
  const [dragActive, setDragActive] = useState(false);

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

  // Fetch Project Details & All Employees
  const fetchProjectData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project details
      const projectRes = await apiClient.get(`projects/${projectId}/`);
      setProject(projectRes.data);

      // 2. Fetch all active employees (to select from when adding members)
      const employeesRes = await apiClient.get('projects/employees/');
      setEmployees(employeesRes.data);
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

  // Add selected members to project
  const handleAddMembersSubmit = async (e) => {
    e.preventDefault();
    if (selectedNewMembers.length === 0) return;

    setUpdatingMembers(true);
    try {
      // Create member UUID list to submit
      // Note: Backend expect profile UUIDs
      const currentMemberIds = project.members.map(m => m.id);
      const updatedMemberIds = [...currentMemberIds, ...selectedNewMembers];

      const requestData = {
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
        team_size: updatedMemberIds.length
      };

      const res = await apiClient.put(`projects/${projectId}/`, requestData);
      setProject(res.data);
      setShowAddMembersModal(false);
      setSelectedNewMembers([]);
    } catch (err) {
      console.error('[ProjectDetail] Error adding members:', err);
      alert(err.response?.data?.detail || 'Failed to add members.');
    } finally {
      setUpdatingMembers(false);
    }
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
        team_size: updatedMemberIds.length
      };

      const res = await apiClient.put(`projects/${projectId}/`, requestData);
      setProject(res.data);
    } catch (err) {
      console.error('[ProjectDetail] Error removing member:', err);
      alert(err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  // Drag and drop events for file upload
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      simulateUpload();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      simulateUpload();
    }
  };

  // Simulate file upload with incremental progress
  const simulateUpload = () => {
    setUploadState('uploading');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('parsing');
          // Wait 1.2s to mock file parsing
          setTimeout(() => {
            setUploadState('success');
          }, 1200);
          return 100;
        }
        // Random incremental steps
        const step = Math.floor(Math.random() * 15) + 5;
        return Math.min(prev + step, 100);
      });
    }, 150);
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
      return !isLead && !isMember && matchesSearch;
    });
  }, [employees, project, memberSearchQuery]);

  const toggleSelectNewMember = (profileId) => {
    setSelectedNewMembers(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId) 
        : [...prev, profileId]
    );
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
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/10"
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>
            <button
              onClick={() => {
                setUploadFile(null);
                setUploadProgress(0);
                setUploadState('idle');
                setShowUploadSprintModal(true);
              }}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-500/10"
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
                
                <div className="flex items-start gap-3">
                  <Code className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex flex-wrap gap-2">
                    {project.skills && project.skills.length > 0 ? (
                      project.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-750"
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
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base tracking-tight">Active Team Roster</h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {project.members?.length || 0} Members assigned
          </span>
        </div>

        {project.members && project.members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {project.members.map((member) => (
              <div
                key={member.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all group ${
                  darkMode 
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-100 hover:shadow-lg hover:shadow-slate-100/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-500 font-black text-sm">
                    {getInitials(member.user.full_name)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-800 dark:text-white">
                      {member.user.full_name}
                    </h5>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 mb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {member.designation || 'Team Member'}
                      </span>
                      {project.skills && project.skills.length > 0 && member.skills && (
                        <div className="flex flex-wrap gap-1">
                          {member.skills
                            .filter((s) => project.skills.some((ps) => ps.id === s.id))
                            .map((s) => (
                              <span
                                key={s.id}
                                className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                              >
                                {s.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 block font-medium">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                {isProjectManager && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-750 mb-3" />
            <h5 className="font-extrabold text-slate-400 text-sm">No Members Added Yet</h5>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add members to start collaborating on this project.</p>
            {isProjectManager && (
              <button
                onClick={() => setShowAddMembersModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Add First Member
              </button>
            )}
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
                              ? 'border-indigo-500 bg-indigo-500/5'
                              : darkMode
                                ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                              {getInitials(emp.user.full_name)}
                            </div>
                            <div>
                              <span className="block text-xs font-black text-slate-800 dark:text-white">
                                {emp.user.full_name}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {emp.designation}
                                </span>
                                {project.skills && project.skills.length > 0 && emp.skills && (
                                  <div className="flex flex-wrap gap-1">
                                    {emp.skills
                                      .filter((s) => project.skills.some(ps => ps.id === s.id))
                                      .map((s) => (
                                        <span
                                          key={s.id}
                                          className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
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
                              ? 'bg-indigo-500 border-indigo-500 text-white'
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
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md"
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

      {/* 4. MODAL: UPLOAD SPRINT */}
      {showUploadSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-extrabold text-base tracking-tight">Upload Sprint Data</h3>
                <p className="text-xs text-slate-400">Import sprints, sprint metrics, and task backlogs</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadSprintModal(false);
                  setUploadFile(null);
                  setUploadState('idle');
                }}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropzone / Upload Progress */}
            <div className="p-6">
              {uploadState === 'idle' && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-orange-500 bg-orange-500/5'
                      : darkMode
                        ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}
                  onClick={() => document.getElementById('sprint-file-input').click()}
                >
                  <input
                    id="sprint-file-input"
                    type="file"
                    accept=".json,.xlsx,.csv,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h5 className="font-black text-sm mb-1">Drag and drop file here</h5>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">
                    JSON, EXCEL or CSV files (max 5MB)
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Select File
                  </button>
                </div>
              )}

              {/* Uploading progress state */}
              {(uploadState === 'uploading' || uploadState === 'parsing') && (
                <div className="py-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 animate-pulse">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs font-extrabold text-slate-400">
                      <span>{uploadState === 'uploading' ? 'Uploading sprint file...' : 'Analyzing sprint metadata...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    {/* Linear Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {uploadFile?.name} ({(uploadFile?.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}

              {/* Success state */}
              {uploadState === 'success' && (
                <div className="py-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center text-emerald-500 scale-100 transition-transform">
                    <Check className="w-8 h-8" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 dark:text-white text-base">
                      Sprint Successfully Synced!
                    </h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Task breakdown, velocities, and timeline loaded into dashboard.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl w-full border border-slate-100 dark:border-slate-850 flex items-center gap-3 text-left">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="truncate">
                      <span className="block text-xs font-black text-slate-800 dark:text-white truncate">
                        {uploadFile?.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Imported 12 new sprint tasks
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadSprintModal(false);
                      setUploadFile(null);
                      setUploadState('idle');
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/15 mt-2"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
