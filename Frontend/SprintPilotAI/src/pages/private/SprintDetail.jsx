import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';
import AddTaskModal from '../../components/Modals/AddTaskModal';
import CustomDatePicker from '../../components/Common/CustomDatePicker';

import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Lock,
  Loader2,
  Info,
  RefreshCw,
  Save,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  ExternalLink,
  Trash2
} from 'lucide-react';


const categoryConfig = {
  UI: {
    label: 'UI Development',
    bgLight: 'bg-orange-50 text-orange-600 border-orange-200/50',
    bgDark: 'bg-orange-950/20 text-orange-400 border-orange-900/30',
    bar: 'bg-orange-500'
  },
  Backend: {
    label: 'Backend Development',
    bgLight: 'bg-blue-50 text-blue-600 border-blue-200/50',
    bgDark: 'bg-blue-950/20 text-blue-400 border-blue-900/30',
    bar: 'bg-blue-500'
  },
  INFRA: {
    label: 'System Design & Infra',
    bgLight: 'bg-purple-50 text-purple-600 border-purple-200/50',
    bgDark: 'bg-purple-950/20 text-purple-400 border-purple-900/30',
    bar: 'bg-purple-500'
  },
  QA: {
    label: 'Quality Assurance',
    bgLight: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
    bgDark: 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30',
    bar: 'bg-emerald-500'
  }
};

const getCleanCategory = (cat) => {
  const c = String(cat).toUpperCase().trim();
  if (c === 'UI') return 'UI';
  if (c === 'BACKEND') return 'Backend';
  if (c === 'INFRA' || c === 'SYSTEM DESIGN & INFRA') return 'INFRA';
  if (c === 'QA') return 'QA';
  return 'UI'; // default fallback
};

const getProgressPercentage = (status) => {
  const s = String(status).toUpperCase().trim();
  if (s === 'DONE' || s === 'COMPLETED' || s === 'CLOSED') return '100%';
  if (s === 'IN_REVIEW' || s === 'RESOLVED') return '90%';
  if (s === 'QA') return '80%';
  if (s === 'IN_PROGRESS') return '50%';
  if (s === 'BLOCKED') return '10%';
  if (s === 'OPEN' || s === 'TODO') return '0%';
  return '0%';
};

// Generates calendar columns starting from the Monday of the start date week to the Friday of the end date week
const generateTimelineDays = (startStr, endStr) => {
  const sStr = startStr || '2026-07-15';
  const eStr = endStr || '2026-07-28';

  const start = new Date(sStr);
  const end = new Date(eStr);

  // Find Monday of start week
  const startMonday = new Date(start);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startMonday.setDate(start.getDate() + diffToMonday);

  // Find Friday of end week
  const endFriday = new Date(end);
  const endDay = end.getDay();
  const diffToFriday = endDay === 0 ? 5 : 5 - endDay;
  endFriday.setDate(end.getDate() + diffToFriday);

  const daysList = [];
  const current = new Date(startMonday);

  let loopCount = 0;
  while ((current <= endFriday || current <= end) && loopCount < 90) {
    loopCount++;
    const dNum = current.getDate();
    const dName = current.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    daysList.push({
      dayNum: dNum,
      dayName: dName,
      isWeekend,
      dateStr,
      isSprintStart: dateStr === sStr,
      isSprintEnd: dateStr === eStr
    });

    current.setDate(current.getDate() + 1);
  }
  return daysList;
};



export default function SprintDetail() {
  const { projectId, sprintId } = useParams();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  // Page level states
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [originalTasks, setOriginalTasks] = useState([]); // to support Cancel action
  const [employees, setEmployees] = useState([]);
  const [timelineDaysList, setTimelineDaysList] = useState([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSource, setEditSource] = useState(null); // 'ai' or 'manual'
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [activeDatePickerId, setActiveDatePickerId] = useState(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  // Tracking changed items
  const [modifiedTaskIds, setModifiedTaskIds] = useState(new Set());
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const refreshSprint = async () => {
    try {
      const sprintData = await SprintServices.getSprintDetails(sprintId);
      setSprint(sprintData);

      const rawTasks = sprintData.tasks || [];
      const dbTasks = rawTasks.map(t => ({
        ...t,
        planned_start_date: (t.planned_start_date === 'None' || t.planned_start_date === 'null' || !t.planned_start_date) ? null : t.planned_start_date,
        planned_end_date: (t.planned_end_date === 'None' || t.planned_end_date === 'null' || !t.planned_end_date) ? null : t.planned_end_date
      }));

      setTasks(dbTasks);
      setOriginalTasks(JSON.parse(JSON.stringify(dbTasks)));
    } catch (err) {
      console.error('[SprintDetail] Error refreshing sprint details:', err);
    }
  };

  const handleIndividualDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      setPageLoading(true);
      await apiClient.delete(`sprints/tasks/${taskId}/`);
      alert("Task deleted successfully.");
      await refreshSprint();
    } catch (err) {
      console.error('[SprintDetail] Error deleting task:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to delete task.';
      alert(`Delete failed: ${errMsg}`);
    } finally {
      setPageLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedTaskIds.size} selected tasks?`)) return;
    try {
      setPageLoading(true);
      const taskIds = Array.from(selectedTaskIds);
      await apiClient.post(`sprints/tasks/bulk-delete/`, { task_ids: taskIds });
      alert("Selected tasks deleted successfully.");
      setSelectedTaskIds(new Set());
      await refreshSprint();
    } catch (err) {
      console.error('[SprintDetail] Error bulk deleting tasks:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to delete selected tasks.';
      alert(`Delete failed: ${errMsg}`);
    } finally {
      setPageLoading(false);
    }
  };


  // Fetch Sprint & Employee Data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setPageLoading(true);
        // Reset state for new sprint
        setIsGenerating(false);
        setIsEditing(false);
        setModifiedTaskIds(new Set());
        setSelectedTaskIds(new Set());

        // 1. Fetch Sprint Details (with nested tasks)
        const sprintData = await SprintServices.getSprintDetails(sprintId);
        setSprint(sprintData);

        // Sanitize database tasks to ensure null/None dates are treated as null
        const rawTasks = sprintData.tasks || [];
        const dbTasks = rawTasks.map(t => ({
          ...t,
          planned_start_date: (t.planned_start_date === 'None' || t.planned_start_date === 'null' || !t.planned_start_date) ? null : t.planned_start_date,
          planned_end_date: (t.planned_end_date === 'None' || t.planned_end_date === 'null' || !t.planned_end_date) ? null : t.planned_end_date
        }));

        setTasks(dbTasks);
        setOriginalTasks(JSON.parse(JSON.stringify(dbTasks))); // Deep clone for rollback

        // Generate timeline range based on Sprint boundaries
        const days = generateTimelineDays(sprintData.start_date, sprintData.end_date);
        setTimelineDaysList(days);

        // 2. Fetch Project details to get project members
        const projectRes = await apiClient.get(`projects/${sprintData.project}/`);
        setEmployees(projectRes.data?.members || []);
      } catch (err) {
        console.error('[SprintDetail] Error loading data:', err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [sprintId]);

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setLoadingText('Initializing connection to Gemini...');

    const texts = [
      'Analyzing task sequences...',
      'Excluding weekends (Saturdays & Sundays)...',
      'Configuring employee timeline constraints...',
      'Rendering categorized Gantt dashboard...'
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < texts.length) {
        setLoadingText(texts[currentIndex]);
      }
    }, 800);

    try {
      const activeTaskIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [];
      const suggestions = await SprintServices.getAISuggestedSchedule(sprintId, activeTaskIds);

      clearInterval(interval);

      setTasks(prev => {
        return prev.map(t => {
          const sug = suggestions.find(s => s.task_id === t.id);
          if (sug) {
            const empId = sug.assigned_employee?.id || sug.assigned_employee_id;
            const emp = employees.find(e => e.id === empId) || sug.assigned_employee || null;
            return {
              ...t,
              planned_start_date: sug.planned_start_date,
              planned_end_date: sug.planned_end_date,
              assigned_employee: emp,
              recommendation_reason: sug.reason
            };
          }
          return t;
        });
      });

      const updatedIds = suggestions.map(s => s.task_id);
      setModifiedTaskIds(prev => {
        const next = new Set(prev);
        updatedIds.forEach(id => next.add(id));
        return next;
      });

      setIsGenerating(false);
      setEditSource('ai');
      setIsEditing(true);
      setSelectedTaskIds(new Set());
    } catch (err) {
      clearInterval(interval);
      setIsGenerating(false);
      console.error('[SprintDetail] AI Suggestion failed:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Unknown error occurred.';
      alert(`AI Generation Failed: ${errMsg}`);
    }
  };

  // Toggle into Edit Mode
  const handleStartUpdateMode = () => {
    setEditSource('manual');
    setIsEditing(true);
  };

  // Cancel edit mode and revert values
  const handleCancelEdit = () => {
    setTasks(JSON.parse(JSON.stringify(originalTasks))); // restore original clone
    setModifiedTaskIds(new Set());
    setEditSource(null);
    setIsEditing(false);
  };

  // Save modified tasks to backend database via bulk import
  const handleSaveToBackend = async () => {
    if (modifiedTaskIds.size === 0) {
      setEditSource(null);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const payload = Array.from(modifiedTaskIds).map(taskId => {
        const currentTask = tasks.find(t => t.id === taskId);
        const originalTask = originalTasks.find(t => t.id === taskId);

        const changes = { task_id: taskId };

        if (!originalTask) {
          // If for some reason it's a new task not in originalTasks
          return {
            task_id: taskId,
            assigned_employee_id: currentTask?.assigned_employee?.id || null,
            planned_start_date: currentTask?.planned_start_date || null,
            planned_end_date: currentTask?.planned_end_date || null
          };
        }

        const currentEmpId = currentTask?.assigned_employee?.id || null;
        const originalEmpId = originalTask?.assigned_employee?.id || null;
        if (currentEmpId !== originalEmpId) {
          changes.assigned_employee_id = currentEmpId;
        }

        const currentStart = currentTask?.planned_start_date || null;
        const originalStart = originalTask?.planned_start_date || null;
        if (currentStart !== originalStart) {
          changes.planned_start_date = currentStart;
        }

        const currentEnd = currentTask?.planned_end_date || null;
        const originalEnd = originalTask?.planned_end_date || null;
        if (currentEnd !== originalEnd) {
          changes.planned_end_date = currentEnd;
        }

        return changes;
      });

      await SprintServices.importSchedule(sprintId, payload);

      // Refresh task list from server to get updated computed story points and hours
      const sprintData = await SprintServices.getSprintDetails(sprintId);
      const rawTasks = sprintData.tasks || [];
      const dbTasks = rawTasks.map(t => ({
        ...t,
        planned_start_date: (t.planned_start_date === 'None' || t.planned_start_date === 'null' || !t.planned_start_date) ? null : t.planned_start_date,
        planned_end_date: (t.planned_end_date === 'None' || t.planned_end_date === 'null' || !t.planned_end_date) ? null : t.planned_end_date
      }));

      setTasks(dbTasks);
      setOriginalTasks(JSON.parse(JSON.stringify(dbTasks)));
      setModifiedTaskIds(new Set());
      setEditSource(null);
      setIsEditing(false);
    } catch (err) {
      console.error('[SprintDetail] Error saving tasks:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to save task schedules.';
      alert(`Import Failed: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Sync button action to push tasks to Backlog
  const handleSyncClick = () => {
    setShowSyncConfirm(true);
  };

  
  const performSync = async () => {
    setShowSyncConfirm(false);
    setIsSyncing(true);
    try {
      const payload = selectedTaskIds.size > 0 ? { task_ids: Array.from(selectedTaskIds) } : {};
      const response = await apiClient.post(`sprints/${sprintId}/sync-backlog/`, payload);
      alert(`Success: ${response.data.detail}`);
      
      // Auto-refresh the page data so the Backlog link and statuses update immediately
      await refreshSprint();
      
    } catch (err) {
      console.error('[SprintDetail] Error syncing to Backlog:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to sync tasks to Backlog.';
      alert(`Sync Failed: ${errMsg}`);
    } finally {
      setIsSyncing(false);
      if (selectedTaskIds.size > 0) {
        setSelectedTaskIds(new Set());
      } else {
      }
    }
  };

  const toggleSelectTask = (taskId) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleSingleTaskSync = async (taskId) => {
    setIsGenerating(true);
    setLoadingText('Syncing task with AI...');
    try {
      const suggestions = await SprintServices.getAISuggestedSchedule(sprintId, [taskId]);

      setTasks(prev => {
        return prev.map(t => {
          const sug = suggestions.find(s => s.task_id === t.id);
          if (sug) {
            const empId = sug.assigned_employee?.id || sug.assigned_employee_id;
            const emp = employees.find(e => e.id === empId) || sug.assigned_employee || null;
            return {
              ...t,
              planned_start_date: sug.planned_start_date,
              planned_end_date: sug.planned_end_date,
              assigned_employee: emp,
              recommendation_reason: sug.reason
            };
          }
          return t;
        });
      });

      const updatedIds = suggestions.map(s => s.task_id);
      setModifiedTaskIds(prev => {
        const next = new Set(prev);
        updatedIds.forEach(id => next.add(id));
        return next;
      });

      setIsGenerating(false);
      setIsEditing(true);
    } catch (err) {
      setIsGenerating(false);
      console.error('[SprintDetail] Single task sync failed:', err);
      alert(`Sync Failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDownloadSchedule = async () => {
    if (!sprint) return;
    try {
      const response = await apiClient.get(`sprints/${sprint.id}/download-schedule/`, {
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `Schedule_${(sprint.milestone || sprint.name || 'sprint').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download schedule. Please try again.");
    }
  };

  // Handler helpers for inline fields edit
  const handleAssigneeChange = (taskId, employeeId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const emp = employees.find(e => e.id === employeeId) || null;
        return { ...t, assigned_employee: emp };
      }
      return t;
    }));
    setModifiedTaskIds(old => new Set(old).add(taskId));
  };

  const isWeekendStr = (dateStr) => {
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0: Sunday, 6: Saturday
  };

  const handleStartDateChange = (taskId, newDate) => {
    if (!newDate) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, planned_start_date: null } : t));
      setModifiedTaskIds(old => new Set(old).add(taskId));
      return;
    }

    // 1. Sprint boundaries check
    if (sprint && (newDate < sprint.start_date || newDate > sprint.end_date)) {
      alert(`Invalid Start Date: Please choose a date within the sprint boundaries (${sprint.start_date} to ${sprint.end_date}).`);
      return;
    }

    // 2. Weekend check
    if (isWeekendStr(newDate)) {
      alert("Invalid Start Date: Saturdays and Sundays cannot be selected as working days.");
      return;
    }

    // 3. Compare with existing end date
    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.planned_end_date && newDate > currentTask.planned_end_date) {
      alert("Invalid Start Date: The start date cannot be after the planned end date.");
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, planned_start_date: newDate };
      }
      return t;
    }));
    setModifiedTaskIds(old => new Set(old).add(taskId));
  };

  const handleEndDateChange = (taskId, newDate) => {
    if (!newDate) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, planned_end_date: null } : t));
      setModifiedTaskIds(old => new Set(old).add(taskId));
      return;
    }

    // 1. Sprint boundaries check
    if (sprint && (newDate < sprint.start_date || newDate > sprint.end_date)) {
      alert(`Invalid End Date: Please choose a date within the sprint boundaries (${sprint.start_date} to ${sprint.end_date}).`);
      return;
    }

    // 2. Weekend check
    if (isWeekendStr(newDate)) {
      alert("Invalid End Date: Saturdays and Sundays cannot be selected as working days.");
      return;
    }

    // 3. Compare with existing start date
    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.planned_start_date && newDate < currentTask.planned_start_date) {
      alert("Invalid End Date: The end date cannot be before the planned start date.");
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, planned_end_date: newDate };
      }
      return t;
    }));
    setModifiedTaskIds(old => new Set(old).add(taskId));
  };

  // Loading Indicator for initial fetch
  if (pageLoading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'
        }`}>
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 animate-pulse">Loading Sprint Details...</p>
      </div>
    );
  }

  // Fallback if sprint not found
  if (!sprint) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Sprint details could not be found.</h2>
        <Link to={`/projects/${projectId}`} className="text-orange-500 underline text-sm">
          Go back to Project details
        </Link>
      </div>
    );
  }

  const isUnscheduled = tasks.length > 0 && tasks.every(t => !t.planned_start_date && !t.planned_end_date);

  const checkSyncNeeded = (t) => {
    if (!t.synced_at || t.synced_at === 'null' || t.synced_at === 'None') return true;
    if (!t.updated_at) return false;
    const updateTime = new Date(t.updated_at).getTime();
    const syncTime = new Date(t.synced_at).getTime();
    return updateTime > syncTime + 1000;
  };

  const isSyncNeeded = selectedTaskIds.size > 0 
    ? tasks.filter(t => selectedTaskIds.has(t.id)).some(checkSyncNeeded)
    : tasks.length > 0 && tasks.some(checkSyncNeeded);

  return (
    <div className={`p-6 sm:p-8 mx-auto min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>

      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          to={`/projects/${projectId}`}
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
        </Link>
      </div>

      {/* Main header banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100'
        }`}>
        <div className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/10 text-orange-600'
              }`}>
              Milestone / Sprint View
            </span>
            <span className="text-slate-400 text-xs font-bold">/</span>
            <span className="text-slate-400 text-xs font-bold">{sprint.project_name || 'SprintPilot AI'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {sprint.milestone || sprint.name}
            </h1>
            {sprint.project_status === 'COMPLETED' && (
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Project Completed
              </span>
            )}
            {sprint.status === 'COMPLETED' && (
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sprint Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-400 font-semibold mt-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Timeline: {sprint.start_date} - {sprint.end_date}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-fadeIn">
        {isUnscheduled && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
            <div className={`rounded-3xl border p-8 shadow-xl relative overflow-hidden w-full ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-3xl" />

              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10 mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold tracking-tight">AI Scheduling Suggestions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                    This milestone currently has no scheduled tasks. Click the button below to generate an optimized timeline and assign members based on skills and designations, respecting weekend constraints.
                  </p>
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                  className="px-6 py-3 text-xs font-black tracking-wider uppercase rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 dark:shadow-orange-500/15 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                  {isGenerating ? loadingText : 'Generate AI Schedule'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
              {isGenerating ? (
                <Loader2 className="w-5 h-5 text-orange-500 shrink-0 animate-spin" />
              ) : (
                <Info className="w-5 h-5 text-orange-500 shrink-0" />
              )}
              <p className="text-[11px] font-semibold leading-relaxed">
                {isGenerating
                  ? `AI Suggested Scheduling: ${loadingText}`
                  : "Below is the workload schedule grouped by developmental categories. Saturdays and Sundays are shaded gray to indicate non-working weekends."}
              </p>
            </div>

            {/* Unified Card Container */}
            <div className={`rounded-3xl border overflow-hidden shadow-xl ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'
              }`}>
              {/* Header with Title, Actions & Legend */}
              <div className={`p-5 border-b flex flex-col lg:flex-row gap-4 justify-between lg:items-center ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                }`}>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">AI Optimised Gantt Schedule</h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Sprint Duration: {sprint.start_date} to {sprint.end_date}</p>
                </div>

                {/* Action Buttons: Update / Save & Sync */}
                <div className="flex items-center gap-2">
                  {selectedTaskIds.size > 0 ? (
                    <>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${darkMode ? 'bg-orange-950/40 text-orange-400' : 'bg-orange-50 text-orange-655'
                        }`}>
                        {selectedTaskIds.size} Selected
                      </span>
                      <button
                        onClick={handleSyncClick}
                        disabled={isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED' || !isSyncNeeded}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-655'
                          }`}
                      >
                        {isSyncing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        Sync
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-red-950/40 hover:bg-red-900/20 text-red-400'
                            : 'border-red-200 hover:bg-red-50 text-red-600'
                          }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Selected
                      </button>
                      <button
                        onClick={() => setSelectedTaskIds(new Set())}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-655'
                          }`}
                      >
                        Cancel
                      </button>
                    </>
                  ) : isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveToBackend}
                        disabled={isSaving || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {editSource === 'ai' ? 'Import' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleDownloadSchedule}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        Download
                      </button>
                      <button
                        onClick={handleSyncClick}
                        disabled={isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED' || !isSyncNeeded}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        {isSyncing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        Sync
                      </button>
                      <button
                        onClick={() => setIsAddTaskModalOpen(true)}
                        disabled={sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                        Add Task
                      </button>
                      <button
                        onClick={handleStartUpdateMode}
                        disabled={sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Update
                      </button>
                    </>
                  )}
                </div>

                {/* Category Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {Object.entries(categoryConfig).map(([cat, config]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-md ${config.bar}`} />
                      <span>{config.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-md border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-350'
                      }`} />
                    <span>Weekend</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Grid Table */}
              <div className="overflow-auto max-h-[600px] relative custom-scrollbar">
                <table
                  className="w-full text-left border-collapse"
                  style={{ minWidth: `${880 + timelineDaysList.length * 32}px` }}
                >
                  <thead>
                    {/* Row 1: Week headers */}
                    <tr className={`border-b text-[10px] font-black tracking-widest uppercase text-slate-450`}>
                      <th
                        className={`py-2.5 px-4 border-r sticky left-0 top-0 z-40 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                      />
                      <th
                        colSpan={7}
                        className={`py-2.5 px-4 border-r sticky left-[40px] top-0 z-40 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        style={{ minWidth: '670px', maxWidth: '670px', width: '670px' }}
                      >
                        Task Specifications
                      </th>
                      {/* Dynamic Week headers based on timeline list */}
                      {(() => {
                        const headers = [];
                        let currentSpan = 0;
                        let currentLabel = '';

                        timelineDaysList.forEach((day, idx) => {
                          if (idx === 0 || day.dayName === 'M') {
                            if (currentSpan > 0) {
                              headers.push({ label: currentLabel, span: currentSpan });
                            }
                            currentLabel = `Week starting ${day.dateStr}`;
                            currentSpan = 1;
                          } else {
                            currentSpan++;
                          }
                        });
                        if (currentSpan > 0) {
                          headers.push({ label: currentLabel, span: currentSpan });
                        }

                        return headers.map((h, i) => (
                          <th
                            key={`week-h-${i}`}
                            colSpan={h.span}
                            className={`py-2.5 px-3 border-r text-center text-[9px] sticky top-0 z-30 ${i % 2 === 0
                                ? darkMode ? 'bg-slate-950' : 'bg-slate-100'
                                : darkMode ? 'bg-slate-900' : 'bg-slate-50'
                              } ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                          >
                            {h.label}
                          </th>
                        ));
                      })()}
                    </tr>

                    {/* Row 2: Columns mapping */}
                    <tr className={`border-b text-[10px] font-black`}>
                      <th
                        className={`py-2 px-2 sticky left-0 top-[36px] z-40 border-r w-10 flex items-center justify-center h-full ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                      >
                        <input
                          type="checkbox"
                          checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </th>
                      <th
                        className={`py-2 px-4 sticky left-[40px] top-[36px] z-40 border-r w-56 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                      >
                        TASK
                      </th>
                      <th
                        className={`py-2 px-4 sticky left-[260px] top-[36px] z-40 border-r w-36 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
                      >
                        ASSIGNED TO
                      </th>
                      <th
                        className={`py-2 px-3 sticky left-[410px] top-[36px] z-40 w-14 text-center border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                      >
                        PROGRESS
                      </th>
                      <th
                        className={`py-2 px-3 sticky left-[470px] top-[36px] z-40 w-24 border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      >
                        START
                      </th>
                      <th
                        className={`py-2 px-3 sticky left-[560px] top-[36px] z-40 w-24 border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      >
                        END
                      </th>
                      <th
                        className={`py-2 px-4 sticky left-[650px] top-[36px] z-40 border-r w-52 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                      >
                        RECOMMENDATION REASON
                      </th>
                      <th
                        className={`py-2 px-3 sticky left-[860px] top-[36px] z-40 w-16 text-center border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                      >
                        ACTIONS
                      </th>

                      {/* Dates */}
                      {timelineDaysList.map((day, idx) => {
                        let cellStyle = `py-2 text-center border-r w-8 shrink-0 sticky top-[36px] z-30 ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`;
                        if (day.isWeekend) {
                          cellStyle = `py-2 text-center border-r w-8 shrink-0 sticky top-[36px] z-30 ${darkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                            }`;
                        }
                        if (day.isSprintStart) {
                          cellStyle += ' border-l-2 border-l-orange-500';
                        }
                        if (day.isSprintEnd) {
                          cellStyle += ' border-r-2 border-r-orange-500';
                        }
                        return (
                          <th key={`num-${day.dayNum}-${idx}`} className={cellStyle}>
                            {day.dayNum}
                          </th>
                        );
                      })}
                    </tr>

                    {/* Row 3: Day Names */}
                    <tr className={`border-b text-[9px] font-black uppercase`}>
                      <th
                        className={`py-1 px-2 sticky left-0 top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                      />
                      <th
                        className={`py-1 px-4 sticky left-[40px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                      />
                      <th
                        className={`py-1 px-4 sticky left-[260px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
                      />
                      <th
                        className={`py-1 px-3 sticky left-[410px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                      />
                      <th
                        className={`py-1 px-3 sticky left-[470px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      />
                      <th
                        className={`py-1 px-3 sticky left-[560px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      />
                      <th
                        className={`py-1 px-4 sticky left-[650px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                      />
                      <th
                        className={`py-1 px-3 sticky left-[860px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                      />

                      {/* Day Names */}
                      {timelineDaysList.map((day, idx) => {
                        let cellStyle = `py-1 text-center border-r w-8 sticky top-[68px] z-30 ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-455'
                          }`;
                        if (day.isWeekend) {
                          cellStyle = `py-1 text-center border-r w-8 sticky top-[68px] z-30 ${darkMode ? 'border-slate-800 bg-slate-950 text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'
                            }`;
                        }
                        if (day.isSprintStart) {
                          cellStyle += ' border-l-2 border-l-orange-500';
                        }
                        if (day.isSprintEnd) {
                          cellStyle += ' border-r-2 border-r-orange-500';
                        }
                        return (
                          <th key={`name-${day.dayNum}-${idx}`} className={cellStyle}>
                            {day.dayName}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className={`divide-y text-xs font-semibold ${darkMode ? 'divide-slate-800/80 text-slate-300 border-b border-slate-800' : 'divide-slate-200 text-slate-700 border-b border-slate-200'
                    }`}>
                    {['UI', 'Backend', 'INFRA', 'QA'].map((category) => {
                      const catTasks = tasks.filter(t => getCleanCategory(t.category) === getCleanCategory(category));
                      const config = categoryConfig[category];

                      if (catTasks.length === 0) return null;

                      const secBgClass = darkMode ? config.bgDark : config.bgLight;

                      return (
                        <React.Fragment key={category}>
                          {/* Section Divider Header Row */}
                          <tr className={`${secBgClass} font-black text-xs border-t border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'
                            }`}>
                            <td
                              className={`py-3 px-2 sticky left-0 z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                            />
                            {/* TASK sticky column divider */}
                            <td
                              className={`py-3 px-4 sticky left-[40px] z-20 font-black border-r text-left ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                            >
                              {config.label}
                            </td>
                            <td
                              className={`py-3 px-4 sticky left-[260px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
                            />
                            <td
                              className={`py-3 px-3 sticky left-[410px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                            />
                            <td
                              className={`py-3 px-3 sticky left-[470px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                            />
                            <td
                              className={`py-3 px-3 sticky left-[560px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                            />
                            <td
                              className={`py-3 px-4 sticky left-[650px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                            />
                            <td
                              className={`py-3 px-3 sticky left-[860px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`}
                              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                            />

                            {/* Date grid cells */}
                            {timelineDaysList.map((day, idx) => {
                              let cellStyle = `py-3 border-r w-8 ${darkMode ? 'border-slate-800' : 'border-slate-200'
                                }`;
                              if (day.isWeekend) {
                                cellStyle += darkMode ? ' bg-slate-950/65' : ' bg-slate-100/65';
                              }
                              if (day.isSprintStart) {
                                cellStyle += ' border-l-2 border-l-orange-500/20';
                              }
                              if (day.isSprintEnd) {
                                cellStyle += ' border-r-2 border-r-orange-500/20';
                              }
                              return <td key={`sec-${category}-${idx}`} className={cellStyle} />;
                            })}
                          </tr>

                          {/* Task rows */}
                          {catTasks.map((task) => {
                            const isRowHovered = hoveredRowId === task.id;
                            const isActiveRow = activeDatePickerId && activeDatePickerId.startsWith(`${task.id}-`);
                            const rowZIndexClass = isActiveRow ? 'z-35' : 'z-20';

                            const stickyBgClass = isRowHovered
                              ? darkMode
                                ? 'bg-slate-800 text-white border-slate-700 font-bold'
                                : 'bg-slate-50 text-slate-900 border-slate-200 font-bold'
                              : darkMode
                                ? 'bg-slate-900 text-slate-100 border-slate-800 font-bold'
                                : 'bg-white text-slate-900 border-slate-200 font-bold';

                            const stickyNormalBgClass = isRowHovered
                              ? darkMode
                                ? 'bg-slate-800 text-white border-slate-700'
                                : 'bg-slate-50 text-slate-900 border-slate-200'
                              : darkMode
                                ? 'bg-slate-900 text-slate-100 border-slate-800'
                                : 'bg-white text-slate-900 border-slate-200';

                            return (
                              <tr
                                key={task.id}
                                onMouseEnter={() => setHoveredRowId(task.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                                className={`transition-colors duration-100 ${isActiveRow ? 'relative z-30' : ''} ${isRowHovered
                                    ? darkMode
                                      ? 'bg-slate-800/40 text-white font-bold'
                                      : 'bg-slate-50/70 text-slate-900 font-bold'
                                    : darkMode
                                      ? 'bg-slate-900/10'
                                      : 'bg-white'
                                  }`}
                              >
                                {/* Checkbox column */}
                                <td
                                  className={`py-4 px-2 sticky left-0 ${rowZIndexClass} border-r align-middle text-center ${stickyNormalBgClass}`}
                                  style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTaskIds.has(task.id)}
                                    onChange={() => toggleSelectTask(task.id)}
                                    className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
                                  />
                                </td>

                                {/* TASK Name cell (sticky, matches row background) */}
                                <td
                                  className={`py-4 px-4 sticky left-[40px] ${rowZIndexClass} border-r align-middle text-left ${stickyBgClass}`}
                                  style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="truncate flex-1" title={task.title}>
                                      {task.title}
                                    </div>
                                    {task.backlog_task_url && (
                                      <a
                                        href={task.backlog_task_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-slate-200 text-blue-600'}`}
                                        title="Open in Backlog"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>

                                {/* ASSIGNED TO */}
                                <td
                                  className={`py-4 px-4 sticky left-[260px] ${rowZIndexClass} border-r align-middle text-left focus-within:z-50 ${stickyNormalBgClass}`}
                                  style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
                                >
                                  {isEditing ? (
                                    <select
                                      value={task.assigned_employee?.id || ""}
                                      onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                                      className={`p-1 rounded text-[10px] border w-full font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${darkMode
                                          ? 'bg-slate-900 border-slate-750 text-white'
                                          : 'bg-white border-slate-250 text-slate-800'
                                        }`}
                                    >
                                      <option value="">Unassigned</option>
                                      {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                          {emp.user?.full_name || emp.user?.email}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className={`truncate block max-w-[140px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                      {task.assigned_employee?.user?.full_name || 'Unassigned'}
                                    </span>
                                  )}
                                </td>

                                {/* PROGRESS */}
                                <td
                                  className={`py-4 px-1 sticky left-[410px] ${rowZIndexClass} text-center border-r align-middle font-extrabold text-[10px] ${stickyNormalBgClass}`}
                                  style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                                >
                                  {getProgressPercentage(task.status)}
                                </td>

                                {/* START */}
                                <td
                                  className={`py-4 px-1 sticky left-[470px] border-r align-middle text-[10px] ${activeDatePickerId === `${task.id}-start` ? 'z-50' : rowZIndexClass
                                    } ${stickyNormalBgClass}`}
                                  style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                                >
                                  {isEditing ? (
                                    <CustomDatePicker
                                      value={task.planned_start_date}
                                      minDate={sprint?.start_date}
                                      maxDate={task.planned_end_date || sprint?.end_date}
                                      onChange={(newDate) => handleStartDateChange(task.id, newDate)}
                                      darkMode={darkMode}
                                      onOpen={() => setActiveDatePickerId(`${task.id}-start`)}
                                      onClose={() => setActiveDatePickerId(null)}
                                    />
                                  ) : (
                                    <span className={darkMode ? 'text-slate-400' : 'text-slate-555'}>
                                      {task.planned_start_date || <span className="opacity-30">-</span>}
                                    </span>
                                  )}
                                </td>

                                {/* END */}
                                <td
                                  className={`py-4 px-1 sticky left-[560px] border-r align-middle text-[10px] ${activeDatePickerId === `${task.id}-end` ? 'z-50' : rowZIndexClass
                                    } ${stickyNormalBgClass}`}
                                  style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                                >
                                  {isEditing ? (
                                    <CustomDatePicker
                                      value={task.planned_end_date}
                                      minDate={task.planned_start_date || sprint?.start_date}
                                      maxDate={sprint?.end_date}
                                      onChange={(newDate) => handleEndDateChange(task.id, newDate)}
                                      darkMode={darkMode}
                                      onOpen={() => setActiveDatePickerId(`${task.id}-end`)}
                                      onClose={() => setActiveDatePickerId(null)}
                                    />
                                  ) : (
                                    <span className={darkMode ? 'text-slate-400' : 'text-slate-555'}>
                                      {task.planned_end_date || <span className="opacity-30">-</span>}
                                    </span>
                                  )}
                                </td>

                                {/* REMARKS */}
                                <td
                                  className={`py-4 px-2 sticky left-[650px] ${rowZIndexClass} hover:z-50 border-r align-middle text-[10px] text-left italic group ${stickyNormalBgClass}`}
                                  style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                                >
                                  <div className="relative">
                                    <div className="truncate max-w-[200px]">
                                      {task.recommendation_reason || <span className="opacity-30">-</span>}
                                    </div>
                                    {(task.recommendation_reason) && (
                                      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-1/2 -translate-y-1/2 left-0 z-50 p-3 rounded-lg shadow-2xl border text-xs font-normal not-italic whitespace-normal break-words w-[400px] bg-slate-900 border-slate-750 text-white dark:bg-slate-850 dark:border-slate-700">
                                        {task.recommendation_reason}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* ACTIONS */}
                                <td
                                  className={`py-4 px-2 sticky left-[860px] ${rowZIndexClass} text-center border-r align-middle ${stickyNormalBgClass}`}
                                  style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                                >
                                  <button
                                    onClick={() => handleIndividualDelete(task.id)}
                                    disabled={sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                      darkMode 
                                        ? 'hover:bg-slate-800 text-red-400 hover:text-red-300' 
                                        : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                                    }`}
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>

                                {/* Timeline cells */}
                                {timelineDaysList.map((day, idx) => {
                                  const isDayInTaskRange = task.planned_start_date && task.planned_end_date &&
                                    day.dateStr >= task.planned_start_date && day.dateStr <= task.planned_end_date &&
                                    !day.isWeekend;
                                  const isBarStart = day.dateStr === task.planned_start_date;
                                  const isBarEnd = day.dateStr === task.planned_end_date;

                                  let cellStyle = `py-4 border-r text-center w-8 p-0.5 relative ${darkMode ? 'border-slate-850' : 'border-slate-200'
                                    }`;
                                  if (day.isWeekend) {
                                    cellStyle += darkMode ? ' bg-slate-950/60' : ' bg-slate-100/60';
                                  }
                                  if (day.isSprintStart) {
                                    cellStyle += ' border-l-2 border-l-orange-500';
                                  }
                                  if (day.isSprintEnd) {
                                    cellStyle += ' border-r-2 border-r-orange-500';
                                  }

                                  return (
                                    <td key={`cell-${task.id}-${day.dayNum}-${idx}`} className={cellStyle}>
                                      {isDayInTaskRange && (
                                        <div
                                          className={`h-6 flex items-center justify-center transition-all ${config.bar} ${isBarStart && isBarEnd
                                              ? 'rounded-full mx-1'
                                              : isBarStart
                                                ? 'rounded-l-full ml-1 mr-0'
                                                : isBarEnd
                                                  ? 'rounded-r-full mr-1 ml-0'
                                                  : 'mx-0'
                                            } ${isRowHovered ? 'shadow-lg brightness-110 scale-y-105' : 'opacity-85'
                                            }`}
                                          title={`${task.title} (Locked)`}
                                        >
                                          {isBarStart && (
                                            <Lock className="w-2.5 h-2.5 text-white shrink-0" />
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <AddTaskModal
          show={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          sprintId={sprintId}
          sprintStartDate={sprint?.start_date}
          sprintEndDate={sprint?.end_date}
          employees={employees}
          darkMode={darkMode}
          onTaskCreated={refreshSprint}
        />
      </div>

      {/* Sync Confirmation Modal */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden transform transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-extrabold text-base tracking-tight">Confirm Sync to Backlog</h3>
              </div>
              <button
                onClick={() => setShowSyncConfirm(false)}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium">
                Are you sure you want to sync the tasks for milestone <span className="font-bold text-orange-500">{sprint?.milestone || sprint?.name}</span> (Project ID: <span className="font-mono text-xs opacity-75">{sprint?.project_custom_id || sprint?.project}</span>)?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please confirm to proceed with syncing to Backlog.
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                onClick={() => setShowSyncConfirm(false)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={performSync}
                className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/10"
              >
                Confirm Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

