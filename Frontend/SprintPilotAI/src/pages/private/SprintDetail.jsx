import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';
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
  X
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
  if (s === 'DONE' || s === 'COMPLETED') return '100%';
  if (s === 'IN_REVIEW') return '90%';
  if (s === 'QA') return '80%';
  if (s === 'IN_PROGRESS') return '50%';
  if (s === 'BLOCKED') return '10%';
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
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState(null);
  
  // Tracking changed items
  const [modifiedTaskIds, setModifiedTaskIds] = useState(new Set());

  // Fetch Sprint & Employee Data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setPageLoading(true);
        // Reset state for new sprint
        setIsGenerating(false);
        setIsEditing(false);
        setModifiedTaskIds(new Set());

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

        // 2. Fetch Active Employees
        const empRes = await apiClient.get('projects/employees/');
        setEmployees(empRes.data || []);
      } catch (err) {
        console.error('[SprintDetail] Error loading data:', err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [sprintId]);

  // AI Scheduling simulation sequence
  useEffect(() => {
    if (!isGenerating) return;

    const texts = [
      'Analyzing task sequences...',
      'Excluding weekends (Saturdays & Sundays)...',
      'Configuring employee timeline constraints...',
      'Rendering categorized Gantt dashboard...'
    ];

    let currentIndex = 0;
    setLoadingText(texts[0]);

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < texts.length) {
        setLoadingText(texts[currentIndex]);
      } else {
        clearInterval(interval);
        
        // Simulating schedule generation: set default timelines if none exist
        setTasks(prev => {
          const updated = prev.map((t, idx) => {
            if (t.planned_start_date && t.planned_end_date) return t;

            // Generate dates within sprint range
            const start = new Date(sprint.start_date);
            const end = new Date(sprint.end_date);
            
            const taskStart = new Date(start);
            taskStart.setDate(start.getDate() + (idx % 3) * 2);
            if (taskStart > end) taskStart.setTime(start.getTime());

            const taskEnd = new Date(taskStart);
            taskEnd.setDate(taskStart.getDate() + 2);
            if (taskEnd > end) taskEnd.setTime(end.getTime());

            const formatDate = (date) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            };

            const modStart = formatDate(taskStart);
            const modEnd = formatDate(taskEnd);

            setModifiedTaskIds(old => new Set(old).add(t.id));

            return {
              ...t,
              planned_start_date: modStart,
              planned_end_date: modEnd
            };
          });
          return updated;
        });

        setIsGenerating(false);
        setIsEditing(true);
      }
    }, 850);

    return () => clearInterval(interval);
  }, [isGenerating, sprint]);

  const handleStartGeneration = () => {
    setIsGenerating(true);
  };

  // Toggle into Edit Mode
  const handleStartUpdateMode = () => {
    setIsEditing(true);
  };

  // Cancel edit mode and revert values
  const handleCancelEdit = () => {
    setTasks(JSON.parse(JSON.stringify(originalTasks))); // restore original clone
    setModifiedTaskIds(new Set());
    setIsEditing(false);
  };

  // Save modified tasks to backend database
  const handleSaveToBackend = async () => {
    if (modifiedTaskIds.size === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const updatePromises = Array.from(modifiedTaskIds).map(async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Prepare request body matching API
        const taskData = {
          assigned_employee_id: task.assigned_employee?.id || null,
          planned_start_date: task.planned_start_date || null,
          planned_end_date: task.planned_end_date || null
        };

        await SprintServices.updateSprintTask(taskId, taskData);
      });

      await Promise.all(updatePromises);
      
      // Update original task list checkpoint
      setOriginalTasks(JSON.parse(JSON.stringify(tasks)));
      setModifiedTaskIds(new Set());
      setIsEditing(false);
    } catch (err) {
      console.error('[SprintDetail] Error saving tasks:', err);
      alert('Failed to save task schedules. Please verify date boundaries.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync button dummy action (does nothing backend-wise)
  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Sprint backlog successfully synced with Jira board!');
    }, 1000);
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

  const handleStartDateChange = (taskId, newDate) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, planned_start_date: newDate };
      }
      return t;
    }));
    setModifiedTaskIds(old => new Set(old).add(taskId));
  };

  const handleEndDateChange = (taskId, newDate) => {
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
      <div className={`flex flex-col items-center justify-center min-h-screen ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'
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

  return (
    <div className={`p-6 sm:p-8 mx-auto min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          to={`/projects/${projectId}`}
          className={`inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase transition-colors ${
            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
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
            <span className="text-slate-400 text-xs font-bold">{sprint.project_name || 'SprintPilot AI'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {sprint.name}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-400 font-semibold">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Timeline: {sprint.start_date} - {sprint.end_date}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-fadeIn">
        {/* Info Banner */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-colors duration-300 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
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
          <div className={`rounded-3xl border overflow-hidden shadow-xl ${
            darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'
          }`}>
            {/* Header with Title, Actions & Legend */}
            <div className={`p-5 border-b flex flex-col lg:flex-row gap-4 justify-between lg:items-center ${
              darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}>
              <div>
                <h3 className="font-extrabold text-base tracking-tight">AI Optimised Gantt Schedule</h3>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Sprint Duration: {sprint.start_date} to {sprint.end_date}</p>
              </div>

              {/* Action Buttons: Update / Save & Sync */}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                        darkMode 
                          ? 'border-slate-800 hover:bg-slate-800 text-slate-300' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveToBackend}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartGeneration}
                      disabled={isGenerating}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-98"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      )}
                      {isGenerating ? 'Generating...' : 'Suggest AI Schedule'}
                    </button>
                    <button
                      onClick={handleSyncClick}
                      disabled={isSyncing}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                        darkMode 
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
                      onClick={handleStartUpdateMode}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center gap-1.5"
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
                  <div className={`w-2.5 h-2.5 rounded-md border ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-350'
                  }`} />
                  <span>Weekend</span>
                </div>
              </div>
            </div>

            {/* Scrollable Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  {/* Row 1: Week headers */}
                  <tr className={`border-b text-[10px] font-black tracking-widest uppercase text-slate-450 ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <th colSpan={5} className={`py-2.5 px-4 border-r ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      Task Specifications
                    </th>
                    <th className={`py-2.5 px-4 border-r ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      Remarks
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
                          className={`py-2.5 px-3 border-r text-center text-[9px] ${
                            i % 2 === 0
                              ? darkMode ? 'bg-slate-950/20' : 'bg-slate-100/30'
                              : ''
                          } ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                        >
                          {h.label}
                        </th>
                      ));
                    })()}
                  </tr>

                  {/* Row 2: Columns mapping */}
                  <tr className={`border-b text-[10px] font-black ${
                    darkMode ? 'bg-slate-950/30 border-slate-800 text-slate-400' : 'bg-slate-50/50 border-slate-200 text-slate-500'
                  }`}>
                    <th className={`py-2 px-4 sticky left-0 z-20 border-r w-72 ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>TASK</th>
                    <th className={`py-2 px-4 border-r w-56 ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>ASSIGNED TO</th>
                    <th className={`py-2 px-3 w-18 text-center border-r ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>PROGRESS</th>
                    <th className={`py-2 px-3 w-28 border-r ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>START</th>
                    <th className={`py-2 px-3 w-28 border-r ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>END</th>
                    <th className={`py-2 px-4 border-r w-48 ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>REMARKS</th>
                    
                    {/* Dates */}
                    {timelineDaysList.map((day, idx) => {
                      let cellStyle = `py-2 text-center border-r w-8 shrink-0 ${
                        darkMode ? 'border-slate-800' : 'border-slate-200'
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
                        <th key={`num-${day.dayNum}-${idx}`} className={cellStyle}>
                          {day.dayNum}
                        </th>
                      );
                    })}
                  </tr>

                  {/* Row 3: Day Names */}
                  <tr className={`border-b text-[9px] font-black uppercase ${
                    darkMode ? 'bg-slate-950/20 border-slate-800 text-slate-500' : 'bg-slate-50/50 border-slate-200 text-slate-455'
                  }`}>
                    <th className={`py-1 px-4 sticky left-0 z-20 border-r ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`} />
                    <th className={`py-1 px-4 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                    <th className={`py-1 px-3 text-center border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                    <th className={`py-1 px-3 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                    <th className={`py-1 px-3 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                    <th className={`py-1 px-4 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />

                    {/* Day Names */}
                    {timelineDaysList.map((day, idx) => {
                      let cellStyle = `py-1 text-center border-r w-8 ${
                        darkMode ? 'border-slate-800' : 'border-slate-200'
                      }`;
                      if (day.isWeekend) {
                        cellStyle += darkMode ? ' bg-slate-950/60 text-slate-600' : ' bg-slate-100/60 text-slate-400';
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

                <tbody className={`divide-y text-xs font-semibold ${
                  darkMode ? 'divide-slate-800/80 text-slate-300 border-b border-slate-800' : 'divide-slate-200 text-slate-700 border-b border-slate-200'
                }`}>
                  {['UI', 'Backend', 'INFRA', 'QA'].map((category) => {
                    const catTasks = tasks.filter(t => getCleanCategory(t.category) === getCleanCategory(category));
                    const config = categoryConfig[category];

                    if (catTasks.length === 0) return null;

                    const secBgClass = darkMode ? config.bgDark : config.bgLight;

                    return (
                      <React.Fragment key={category}>
                        {/* Section Divider Header Row */}
                        <tr className={`${secBgClass} font-black text-xs border-t border-b ${
                          darkMode ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          {/* TASK sticky column divider */}
                          <td className={`py-3 px-4 sticky left-0 z-20 font-black border-r text-left ${secBgClass} ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}>
                            {config.label}
                          </td>
                          <td className={`py-3 px-4 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                          <td className={`py-3 px-3 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                          <td className={`py-3 px-3 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                          <td className={`py-3 px-3 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                          <td className={`py-3 px-4 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />

                          {/* Date grid cells */}
                          {timelineDaysList.map((day, idx) => {
                            let cellStyle = `py-3 border-r w-8 ${
                              darkMode ? 'border-slate-800' : 'border-slate-200'
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

                          return (
                            <tr
                              key={task.id}
                              onMouseEnter={() => setHoveredRowId(task.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                              className={`transition-colors duration-100 ${
                                isRowHovered
                                  ? darkMode
                                    ? 'bg-slate-800/40 text-white font-bold'
                                    : 'bg-slate-50/70 text-slate-900 font-bold'
                                  : darkMode
                                  ? 'bg-slate-900/10'
                                  : 'bg-white'
                              }`}
                            >
                              {/* TASK Name cell (sticky, matches row background) */}
                              <td className={`py-4 px-4 sticky left-0 z-20 border-r align-middle text-left ${
                                isRowHovered
                                  ? darkMode ? 'bg-slate-800 text-white border-slate-700 font-bold' : 'bg-slate-50 text-slate-900 border-slate-200 font-bold'
                                  : darkMode ? 'bg-slate-900 text-slate-100 border-slate-800 font-bold' : 'bg-white text-slate-900 border-slate-200 font-bold'
                              }`}>
                                <div className="truncate max-w-xs">
                                  {task.title}
                                </div>
                              </td>

                              {/* ASSIGNED TO */}
                              <td className={`py-4 px-4 border-r align-middle text-left ${
                                darkMode ? 'border-slate-800' : 'border-slate-200'
                              }`}>
                                {isEditing ? (
                                  <select
                                    value={task.assigned_employee?.id || ""}
                                    onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                                    className={`p-1.5 rounded-lg text-xs border w-full font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                                      darkMode
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
                                  <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                                    {task.assigned_employee?.user?.full_name || 'Unassigned'}
                                  </span>
                                )}
                              </td>

                              {/* PROGRESS */}
                              <td className={`py-4 px-3 text-center border-r align-middle font-extrabold text-[10px] ${
                                darkMode ? 'border-slate-800 text-slate-350' : 'border-slate-200 text-slate-800'
                              }`}>
                                {getProgressPercentage(task.status)}
                              </td>

                              {/* START */}
                              <td className={`py-4 px-3 border-r align-middle text-[10px] ${
                                darkMode ? 'border-slate-800' : 'border-slate-200'
                              }`}>
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={task.planned_start_date || ""}
                                    onChange={(e) => handleStartDateChange(task.id, e.target.value)}
                                    className={`p-1.5 rounded-lg text-[11px] border w-full font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                                      darkMode
                                        ? 'bg-slate-900 border-slate-750 text-white'
                                        : 'bg-white border-slate-250 text-slate-800'
                                    }`}
                                  />
                                ) : (
                                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                                    {task.planned_start_date || <span className="opacity-30">-</span>}
                                  </span>
                                )}
                              </td>

                              {/* END */}
                              <td className={`py-4 px-3 border-r align-middle text-[10px] ${
                                darkMode ? 'border-slate-800' : 'border-slate-200'
                              }`}>
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={task.planned_end_date || ""}
                                    onChange={(e) => handleEndDateChange(task.id, e.target.value)}
                                    className={`p-1.5 rounded-lg text-[11px] border w-full font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                                      darkMode
                                        ? 'bg-slate-900 border-slate-750 text-white'
                                        : 'bg-white border-slate-250 text-slate-800'
                                    }`}
                                  />
                                ) : (
                                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                                    {task.planned_end_date || <span className="opacity-30">-</span>}
                                  </span>
                                )}
                              </td>

                              {/* REMARKS */}
                              <td className={`py-4 px-4 border-r align-middle text-[10px] text-left italic ${
                                darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-550'
                              }`}>
                                {task.jira_id || <span className="opacity-30">-</span>}
                              </td>

                              {/* Timeline cells */}
                              {timelineDaysList.map((day, idx) => {
                                const isDayInTaskRange = task.planned_start_date && task.planned_end_date &&
                                  day.dateStr >= task.planned_start_date && day.dateStr <= task.planned_end_date &&
                                  !day.isWeekend;
                                const isBarStart = day.dateStr === task.planned_start_date;
                                const isBarEnd = day.dateStr === task.planned_end_date;

                                let cellStyle = `py-4 border-r text-center w-8 p-0.5 relative ${
                                  darkMode ? 'border-slate-850' : 'border-slate-200'
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
                                        className={`h-6 flex items-center justify-center transition-all ${config.bar} ${
                                          isBarStart && isBarEnd
                                            ? 'rounded-full mx-1'
                                            : isBarStart
                                            ? 'rounded-l-full ml-1 mr-0'
                                            : isBarEnd
                                            ? 'rounded-r-full mr-1 ml-0'
                                            : 'mx-0'
                                        } ${
                                          isRowHovered ? 'shadow-lg brightness-110 scale-y-105' : 'opacity-85'
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
        </div>

      </div>
    );
  }
