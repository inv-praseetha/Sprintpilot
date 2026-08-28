import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';
import AddTaskModal from '../../components/Modals/AddTaskModal';
import JiraSyncModal from '../../components/Modals/JiraSyncModal';
import SprintTasksTable from '../../components/Sprint/SprintTasksTable';
import SprintNotesSection from '../../components/Sprint/SprintNotesSection';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';

import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  Info,
  RefreshCw,
  Save,
  Edit3,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Plus,
  Trash2,
  Database
} from 'lucide-react';


// Generates calendar columns starting from the Monday of the start date week to the Friday of the end date week
const generateTimelineDays = (startStr, endStr, holidaysMap = new Map()) => {
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
    const isHoliday = holidaysMap.has(dateStr);
    const holidayDescription = isHoliday ? (holidaysMap.get(dateStr) || '') : '';

    daysList.push({
      dayNum: dNum,
      dayName: dName,
      isWeekend,
      isHoliday,
      holidayDescription,
      isNonWorkingDay: isWeekend || isHoliday,
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
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isPM = user?.role === 'PROJECT_MANAGER';

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
  const [isSyncingJira, setIsSyncingJira] = useState(false);
  const [showJiraSyncModal, setShowJiraSyncModal] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  // Tracking changed items
  const [modifiedTaskIds, setModifiedTaskIds] = useState(new Set());
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [chartExpanded, setChartExpanded] = useState(true);

  // Daily Scratchpad states
  const [notes, setNotes] = useState([]);
  const [todayNote, setTodayNote] = useState('');
  const [selectedNoteDate, setSelectedNoteDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [lastSavedNoteTime, setLastSavedNoteTime] = useState(null);
  const [pdfPreviewToggle, setPdfPreviewToggle] = useState(null);
  const [notesOffset, setNotesOffset] = useState(0);
  const [hasMoreNotes, setHasMoreNotes] = useState(true);
  const [loadingMoreNotes, setLoadingMoreNotes] = useState(false);
  const lastSavedContentRef = useRef('');

  const categoryConfig = {
    UI: {
      label: 'UI Development',
      bar: 'bg-orange-500'
    },
    Backend: {
      label: 'Backend Development',
      bar: 'bg-blue-500'
    },
    INFRA: {
      label: 'System Design & Infra',
      bar: 'bg-purple-500'
    },
    QA: {
      label: 'Quality Assurance',
      bar: 'bg-emerald-500'
    }
  };

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
      
      const holidaysMap = new Map((sprintData.holidays || []).map(h => [h.date, h.description || '']));
      const days = generateTimelineDays(sprintData.start_date, sprintData.end_date, holidaysMap);
      setTimelineDaysList(days);
    } catch (err) {
      console.error('[SprintDetail] Error refreshing sprint details:', err);
    }
  };

  const handleIndividualDelete = async (taskId) => {
    const isConfirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      setPageLoading(true);
      await SprintServices.deleteSprintTask(taskId);
      toast.success("Task deleted successfully.");
      await refreshSprint();
    } catch (err) {
      console.error('[SprintDetail] Error deleting task:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to delete task.';
      toast.error(`Delete failed: ${errMsg}`);
    } finally {
      setPageLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    const isConfirmed = await confirm({
      title: 'Delete Selected Tasks',
      message: `Are you sure you want to delete the ${selectedTaskIds.size} selected tasks?`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      setPageLoading(true);
      const taskIds = Array.from(selectedTaskIds);
      await apiClient.post(`sprints/tasks/bulk-delete/`, { task_ids: taskIds });
      toast.success("Selected tasks deleted successfully.");
      setSelectedTaskIds(new Set());
      await refreshSprint();
    } catch (err) {
      console.error('[SprintDetail] Error bulk deleting tasks:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to delete selected tasks.';
      toast.error(`Delete failed: ${errMsg}`);
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
        setSelectedNoteDate(new Date().toLocaleDateString('en-CA'));
        setPdfPreviewToggle(null);
        setTodayNote('');
        lastSavedContentRef.current = '';

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

        // 2. Fetch all assignable members for this project (members + team lead, deduplicated server-side)
        const membersRes = await apiClient.get(`projects/${sprintData.project}/assignable-members/`);
        setEmployees(membersRes.data || []);

        // Generate timeline range based on Sprint boundaries
        const holidaysMap = new Map((sprintData.holidays || []).map(h => [h.date, h.description || '']));
        const days = generateTimelineDays(sprintData.start_date, sprintData.end_date, holidaysMap);
        setTimelineDaysList(days);

        // 3. Fetch Sprint Notes (Page 1: limit=5, offset=0)
        setNotesOffset(5);
        setHasMoreNotes(true);
        setLoadingMoreNotes(false);
        const notesData = await SprintServices.getSprintNotes(sprintId, 5, 0);
        setNotes(notesData);
        if (notesData.length < 5) {
          setHasMoreNotes(false);
        }
        const todayStr = new Date().toLocaleDateString('en-CA');
        const todayNoteObj = notesData.find(n => n.date === todayStr);
        const initialContent = todayNoteObj ? todayNoteObj.content : '';
        setTodayNote(initialContent);
        lastSavedContentRef.current = initialContent;
        setLastSavedNoteTime(todayNoteObj ? new Date(todayNoteObj.updated_at).toLocaleTimeString() : null);
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
      toast.error(`AI Generation Failed: ${errMsg}`);
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
      toast.error(`Import Failed: ${errMsg}`);
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
      toast.success(`Success: ${response.data.detail}`);
      
      // Auto-refresh the page data so the Backlog link and statuses update immediately
      await refreshSprint();
      
    } catch (err) {
      console.error('[SprintDetail] Error syncing to Backlog:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to sync tasks to Backlog.';
      toast.error(`Sync Failed: ${errMsg}`);
    } finally {
      setIsSyncing(false);
      if (selectedTaskIds.size > 0) {
        setSelectedTaskIds(new Set());
      }
    }
  };

  const handleSyncJira = () => {
    setShowJiraSyncModal(true);
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
      toast.error("Failed to download schedule. Please try again.");
    }
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

      {/* Syncing Overlay Modal */}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md">
          <div className={`p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 ${darkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <h3 className="text-xl font-extrabold tracking-tight">Syncing with Backlog</h3>
            <p className="text-xs font-medium opacity-60">Please wait while tasks are being synchronized...</p>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
        </button>
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
                  disabled={!isPM || isGenerating || isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                  title={!isPM ? "Only Project Managers can generate AI schedules" : ""}
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
                  : "Below is the workload schedule grouped by developmental categories. Saturdays, Sundays, and sprint holidays are highlighted to indicate non-working days."}
              </p>
            </div>

            {/* Unified Card Container */}
            <div className={`rounded-3xl border overflow-hidden shadow-xl ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'
              }`}>
              {/* Header with Title & Collapse Toggle */}
              <button
                onClick={() => setChartExpanded(!chartExpanded)}
                className={`w-full p-5 flex justify-between items-center transition-colors cursor-pointer text-left focus:outline-none ${
                  chartExpanded ? 'border-b' : ''
                } ${
                  darkMode 
                    ? 'border-slate-800 bg-slate-900 hover:bg-slate-850/30' 
                    : 'border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">AI Optimised Gantt Schedule</h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Sprint Duration: {sprint.start_date} to {sprint.end_date}</p>
                </div>
                {chartExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {chartExpanded && (
                <div>
                  {/* Actions & Legend Row */}
                  <div className={`p-5 border-b flex flex-col lg:flex-row gap-4 justify-between lg:items-center ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                    }`}>

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
                        className={`relative px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSyncNeeded && !isSyncing
                            ? (darkMode ? 'border-red-900/40 hover:bg-red-900/20 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600')
                            : (darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-655')
                        }`}
                      >
                        {isSyncNeeded && !isSyncing && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                        {isSyncing ? (
                          <Loader2 className={`w-3.5 h-3.5 animate-spin ${isSyncNeeded ? '' : 'text-slate-400'}`} />
                        ) : (
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncNeeded ? '' : 'text-slate-400'}`} />
                        )}
                        Sync
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={!isPM || isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        title={!isPM ? "Only Project Managers can delete tasks" : ""}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-red-955/40 hover:bg-red-900/20 text-red-400'
                            : 'border-red-200 hover:bg-red-50 text-red-600'
                          }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Selected
                      </button>
                      <button
                        onClick={() => setSelectedTaskIds(new Set())}
                        disabled={isSyncing}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${darkMode
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
                        disabled={isSyncing}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        Download
                      </button>
                      <button
                        onClick={handleSyncJira}
                        disabled={!isPM || isSyncingJira || isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                            ? 'border-blue-900/40 hover:bg-blue-900/20 text-blue-400'
                            : 'border-blue-200 hover:bg-blue-50 text-blue-600'
                          }`}
                        title={!isPM ? "Only Project Managers can fetch from Jira" : "Fetch newly created tasks from Jira"}
                      >
                        {isSyncingJira ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Database className="w-3.5 h-3.5" />
                        )}
                        Fetch from Jira
                      </button>
                      <button
                        onClick={handleSyncClick}
                        disabled={isSyncing || isSyncingJira || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED' || !isSyncNeeded}
                        className={`relative px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSyncNeeded && !isSyncing
                            ? (darkMode ? 'border-red-900/40 hover:bg-red-900/20 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600')
                            : (darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600')
                        }`}
                      >
                        {isSyncNeeded && !isSyncing && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                        {isSyncing ? (
                          <Loader2 className={`w-3.5 h-3.5 animate-spin ${isSyncNeeded ? '' : 'text-slate-400'}`} />
                        ) : (
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncNeeded ? '' : 'text-slate-400'}`} />
                        )}
                        Sync to Backlog
                      </button>
                      <button
                        onClick={() => setIsAddTaskModalOpen(true)}
                        disabled={!isPM || isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        title={!isPM ? "Only Project Managers can add tasks" : ""}
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
                        disabled={!isPM || isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED'}
                        title={!isPM ? "Only Project Managers can edit task schedules" : ""}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Update
                      </button>
                    </>
                  )}
                </div>

                {/* Category Legend & Tips */}
                <div className="flex flex-col gap-2">
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
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-md border ${darkMode ? 'bg-red-950/80 border-red-800' : 'bg-red-100 border-red-300'
                        }`} />
                      <span>Holiday</span>
                    </div>
                  </div>
                </div>
              </div>

              <SprintTasksTable
                tasks={tasks}
                setTasks={setTasks}
                setModifiedTaskIds={setModifiedTaskIds}
                selectedTaskIds={selectedTaskIds}
                setSelectedTaskIds={setSelectedTaskIds}
                timelineDaysList={timelineDaysList}
                employees={employees}
                darkMode={darkMode}
                sprint={sprint}
                isEditing={isEditing}
                isSyncing={isSyncing}
                isPM={isPM}
                handleIndividualDelete={handleIndividualDelete}
              />
            </div>
          )}
        </div>

        {/* 2. DAILY JOURNAL & HISTORICAL TIMELINE */}
        <SprintNotesSection
          sprintId={sprintId}
          notes={notes}
          setNotes={setNotes}
          todayNote={todayNote}
          setTodayNote={setTodayNote}
          selectedNoteDate={selectedNoteDate}
          setSelectedNoteDate={setSelectedNoteDate}
          isSavingNote={isSavingNote}
          setIsSavingNote={setIsSavingNote}
          lastSavedNoteTime={lastSavedNoteTime}
          setLastSavedNoteTime={setLastSavedNoteTime}
          pdfPreviewToggle={pdfPreviewToggle}
          setPdfPreviewToggle={setPdfPreviewToggle}
          notesOffset={notesOffset}
          setNotesOffset={setNotesOffset}
          hasMoreNotes={hasMoreNotes}
          setHasMoreNotes={setHasMoreNotes}
          loadingMoreNotes={loadingMoreNotes}
          setLoadingMoreNotes={setLoadingMoreNotes}
          lastSavedContentRef={lastSavedContentRef}
          pageLoading={pageLoading}
          darkMode={darkMode}
        />
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

        <JiraSyncModal
          isOpen={showJiraSyncModal}
          onClose={() => setShowJiraSyncModal(false)}
          darkMode={darkMode}
          sprint={sprint}
          onSyncSuccess={refreshSprint}
          employees={employees}
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

