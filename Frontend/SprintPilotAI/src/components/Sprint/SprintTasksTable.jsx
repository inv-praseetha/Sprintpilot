import React, { useState } from 'react';
import { Lock, Trash2, ExternalLink } from 'lucide-react';
import CustomDatePicker from '../Common/CustomDatePicker';
import { useToast } from '../../context/ToastContext';

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
  return c;
};

const getWorkingDaysCount = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  let count = 0;
  let current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const calculateMinEndDate = (startStr, estimatedHours) => {
  if (!startStr) return '';
  const hours = parseFloat(estimatedHours);
  if (isNaN(hours) || hours <= 0) return startStr;

  const minDays = Math.ceil(hours / 8);
  const [year, month, day] = startStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);

  let workingDaysCount = 0;
  while (workingDaysCount < minDays) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }
    if (workingDaysCount < minDays) {
      current.setDate(current.getDate() + 1);
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const calculateMaxStartDate = (endStr, estimatedHours) => {
  if (!endStr) return '';
  const hours = parseFloat(estimatedHours);
  if (isNaN(hours) || hours <= 0) return endStr;

  const minDays = Math.ceil(hours / 8);
  const [year, month, day] = endStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);

  let workingDaysCount = 0;
  while (workingDaysCount < minDays) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }
    if (workingDaysCount < minDays) {
      current.setDate(current.getDate() - 1);
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getCategoryConfig = (category) => {
  const c = String(category).toUpperCase().trim();
  if (c === 'UI') return categoryConfig.UI;
  if (c === 'BACKEND') return categoryConfig.Backend;
  if (c === 'INFRA' || c === 'SYSTEM DESIGN & INFRA') return categoryConfig.INFRA;
  if (c === 'QA') return categoryConfig.QA;
  
  return {
    label: category,
    bgLight: 'bg-slate-50 text-slate-600 border-slate-200/50',
    bgDark: 'bg-slate-900/40 text-slate-400 border-slate-800/50',
    bar: 'bg-slate-500'
  };
};

const getUniqueCategories = (tasks) => {
  const categories = new Set();
  tasks.forEach(t => {
    if (t.category) {
      t.category.split(',').forEach(c => categories.add(c.trim()));
    } else {
      categories.add('UI');
    }
  });
  
  const defaultCats = ['UI', 'Backend', 'INFRA', 'QA'];
  const result = [...defaultCats];
  categories.forEach(c => {
    const clean = String(c).toUpperCase().trim();
    if (!['UI', 'BACKEND', 'INFRA', 'SYSTEM DESIGN & INFRA', 'QA'].includes(clean) && clean !== '') {
      result.push(c);
    }
  });
  return result;
};

const getProgressPercentage = (status) => {
  const s = String(status).toUpperCase().trim();
  if (s === 'DONE' || s === 'COMPLETED' || s === 'CLOSED') return '100%';
  if (s === 'IN_REVIEW' || s === 'RESOLVED') return '90%';
  if (s === 'QA') return '80%';
  if (s === 'IN_PROGRESS') return '50%';
  if (s === 'BLOCKED') return '10%';
  if (s === 'OPEN') return '0%';
  return '0%';
};

export default function SprintTasksTable({
  tasks,
  setTasks,
  setModifiedTaskIds,
  selectedTaskIds,
  setSelectedTaskIds,
  timelineDaysList,
  employees,
  darkMode,
  sprint,
  isEditing,
  isSyncing,
  handleIndividualDelete
}) {
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [activeDatePickerId, setActiveDatePickerId] = useState(null);
  const toast = useToast();

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
    const activeTasks = tasks.filter(t => t.status !== 'CLOSED');
    if (activeTasks.length === 0) return;
    const allSelected = activeTasks.every(t => selectedTaskIds.has(t.id));
    if (allSelected) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        activeTasks.forEach(t => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        activeTasks.forEach(t => next.add(t.id));
        return next;
      });
    }
  };

  const handleAssigneeChange = (taskId, employeeId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // e.target.value is always a string; use String() on both sides to guarantee match
        const emp = employees.find(e => String(e.id) === String(employeeId)) || null;
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
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const handleStartDateChange = (taskId, newDate) => {
    if (!newDate) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, planned_start_date: null } : t));
      setModifiedTaskIds(old => new Set(old).add(taskId));
      return;
    }

    if (sprint && (newDate < sprint.start_date || newDate > sprint.end_date)) {
      toast.error(`Invalid Start Date: Please choose a date within the sprint boundaries (${sprint.start_date} to ${sprint.end_date}).`);
      return;
    }

    if (isWeekendStr(newDate)) {
      toast.error("Invalid Start Date: Saturdays and Sundays cannot be selected as working days.");
      return;
    }

    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.planned_end_date && newDate > currentTask.planned_end_date) {
      toast.error("Invalid Start Date: The start date cannot be after the planned end date.");
      return;
    }

    if (currentTask && currentTask.estimated_hours && currentTask.planned_end_date) {
      const workingDays = getWorkingDaysCount(newDate, currentTask.planned_end_date);
      const minDays = Math.ceil(parseFloat(currentTask.estimated_hours) / 8);
      if (workingDays < minDays) {
        toast.error(`Invalid Start Date: Estimated hours (${currentTask.estimated_hours}h) require at least ${minDays} working day(s). Selected range would only have ${workingDays} working day(s).`);
        return;
      }
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

    if (sprint && (newDate < sprint.start_date || newDate > sprint.end_date)) {
      toast.error(`Invalid End Date: Please choose a date within the sprint boundaries (${sprint.start_date} to ${sprint.end_date}).`);
      return;
    }

    if (isWeekendStr(newDate)) {
      toast.error("Invalid End Date: Saturdays and Sundays cannot be selected as working days.");
      return;
    }

    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.planned_start_date && newDate < currentTask.planned_start_date) {
      toast.error("Invalid End Date: The end date cannot be before the planned start date.");
      return;
    }

    if (currentTask && currentTask.estimated_hours && currentTask.planned_start_date) {
      const workingDays = getWorkingDaysCount(currentTask.planned_start_date, newDate);
      const minDays = Math.ceil(parseFloat(currentTask.estimated_hours) / 8);
      if (workingDays < minDays) {
        toast.error(`Invalid End Date: Estimated hours (${currentTask.estimated_hours}h) require at least ${minDays} working day(s). Selected range would only have ${workingDays} working day(s).`);
        return;
      }
    }

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, planned_end_date: newDate };
      }
      return t;
    }));
    setModifiedTaskIds(old => new Set(old).add(taskId));
  };

  return (
    <div className="overflow-auto max-h-[600px] relative custom-scrollbar">
      <table
        className="w-full text-left border-collapse"
        style={{ minWidth: `${880 + timelineDaysList.length * 32}px` }}
      >
        <thead>
          {/* Row 1: Week headers */}
          <tr className="border-b text-[10px] font-black tracking-widest uppercase text-slate-450">
            <th
              className={`py-2.5 px-4 border-r sticky left-0 top-0 z-40 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
            />
            <th
              colSpan={7}
              className={`py-2.5 px-4 border-r sticky left-[40px] top-0 z-40 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              style={{ minWidth: '670px', maxWidth: '670px', width: '670px' }}
            >
              Task Specifications
            </th>
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
                      : darkMode ? 'bg-slate-900' : 'bg-slate-550'
                    } ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                >
                  {h.label}
                </th>
              ));
            })()}
          </tr>

          {/* Row 2: Columns mapping */}
          <tr className="border-b text-[10px] font-black">
            <th
              className={`py-2 px-2 sticky left-0 top-[36px] z-40 border-r w-10 flex items-center justify-center h-full ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
            >
              <input
                type="checkbox"
                checked={tasks.filter(t => t.status !== 'CLOSED').length > 0 && tasks.filter(t => t.status !== 'CLOSED').every(t => selectedTaskIds.has(t.id))}
                onChange={toggleSelectAll}
                disabled={isSyncing}
                className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-3.5 h-3.5"
              />
            </th>
            <th
              className={`py-2 px-4 sticky left-[40px] top-[36px] z-40 border-r w-56 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
            >
              TASK
            </th>
            <th
              className={`py-2 px-4 sticky left-[260px] top-[36px] z-40 border-r w-36 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
            >
              ASSIGNED TO
            </th>
            <th
              className={`py-2 px-3 sticky left-[410px] top-[36px] z-40 w-14 text-center border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
            >
              PROGRESS
            </th>
            <th
              className={`py-2 px-3 sticky left-[470px] top-[36px] z-40 w-28 border-r text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '110px', maxWidth: '110px', width: '110px' }}
            >
              STATUS
            </th>
            <th
              className={`py-2 px-3 sticky left-[580px] top-[36px] z-40 w-24 border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
            >
              START
            </th>
            <th
              className={`py-2 px-3 sticky left-[670px] top-[36px] z-40 w-24 border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
            >
              END
            </th>
            <th
              className={`py-2 px-3 sticky left-[760px] top-[36px] z-40 w-16 text-center border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '70px', maxWidth: '70px', width: '70px' }}
            >
              EST. HRS
            </th>
            <th
              className={`py-2 px-4 sticky left-[830px] top-[36px] z-40 border-r w-52 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
            >
              RECOMMENDATION REASON
            </th>
            <th
              className={`py-2 px-3 sticky left-[1040px] top-[36px] z-40 w-16 text-center border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
            >
              ACTIONS
            </th>

            {/* Dates */}
            {timelineDaysList.map((day, idx) => {
              let cellStyle = `py-2 text-center border-r w-8 shrink-0 sticky top-[36px] z-30 transition-colors ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-550'}`;
              if (day.isWeekend || day.isHoliday) {
                cellStyle = `py-2 text-center border-r w-8 shrink-0 sticky top-[36px] z-30 cursor-not-allowed ${
                  day.isHoliday
                    ? darkMode ? 'border-slate-800 bg-red-955/80 text-red-200' : 'border-slate-200 bg-red-100/90 text-red-700 font-bold'
                    : darkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-550'
                }`;
              }
              if (day.isSprintStart) {
                cellStyle += ' border-l-2 border-l-orange-500';
              }
              if (day.isSprintEnd) {
                cellStyle += ' border-r-2 border-r-orange-500';
              }
              return (
                <th 
                  key={`num-${day.dayNum}-${idx}`} 
                  className={cellStyle}
                  title={day.isWeekend ? 'Weekend' : day.isHoliday ? 'Holiday' : ''}
                >
                  {day.dayNum}
                </th>
              );
            })}
          </tr>

          {/* Row 3: Day Names */}
          <tr className="border-b text-[9px] font-black uppercase">
            <th
              className={`py-1 px-2 sticky left-0 top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
            />
            <th
              className={`py-1 px-4 sticky left-[40px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
            />
            <th
              className={`py-1 px-4 sticky left-[260px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[410px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[470px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '110px', maxWidth: '110px', width: '110px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[580px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[670px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[760px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '70px', maxWidth: '70px', width: '70px' }}
            />
            <th
              className={`py-1 px-4 sticky left-[830px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
            />
            <th
              className={`py-1 px-3 sticky left-[1040px] top-[68px] z-40 border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
            />

            {/* Day Names */}
            {timelineDaysList.map((day, idx) => {
              let cellStyle = `py-1 text-center border-r w-8 sticky top-[68px] z-30 transition-colors ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-200 bg-white text-slate-450'}`;
              if (day.isWeekend || day.isHoliday) {
                cellStyle = `py-1 text-center border-r w-8 sticky top-[68px] z-30 cursor-not-allowed ${
                  day.isHoliday
                    ? darkMode ? 'border-slate-800 bg-red-955/80 text-red-200' : 'border-slate-200 bg-red-100/90 text-red-700 font-bold'
                    : darkMode ? 'border-slate-800 bg-slate-950 text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'
                }`;
              }
              if (day.isSprintStart) {
                cellStyle += ' border-l-2 border-l-orange-500';
              }
              if (day.isSprintEnd) {
                cellStyle += ' border-r-2 border-r-orange-500';
              }
              return (
                <th 
                  key={`name-${day.dayNum}-${idx}`} 
                  className={cellStyle}
                  title={day.isWeekend ? 'Weekend' : day.isHoliday ? 'Holiday' : ''}
                >
                  {day.dayName}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className={`divide-y text-xs font-semibold ${darkMode ? 'divide-slate-800/80 text-slate-300 border-b border-slate-800' : 'divide-slate-200 text-slate-700 border-b border-slate-200'}`}>
          {getUniqueCategories(tasks).map((category) => {
            const catTasks = tasks.filter(t => {
              const tCats = t.category ? t.category.split(',').map(s => getCleanCategory(s.trim())) : ['UI'];
              return tCats.includes(getCleanCategory(category));
            });
            const config = getCategoryConfig(category);

            if (catTasks.length === 0) return null;

            const secBgClass = darkMode ? config.bgDark : config.bgLight;

            return (
              <React.Fragment key={category}>
                {/* Section Divider Header Row */}
                <tr className={`${secBgClass} font-black text-xs border-t border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <td
                    className={`py-3 px-2 sticky left-0 z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '40px', maxWidth: '40px', width: '40px' }}
                  />
                  <td
                    className={`py-3 px-4 sticky left-[40px] z-20 font-black border-r text-left ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                  >
                    {config.label}
                  </td>
                  <td
                    className={`py-3 px-4 sticky left-[260px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '150px', maxWidth: '150px', width: '150px' }}
                  />
                  <td
                    className={`py-3 px-3 sticky left-[410px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                  />
                  <td
                    className={`py-3 px-3 sticky left-[470px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '110px', maxWidth: '110px', width: '110px' }}
                  />
                  <td
                    className={`py-3 px-3 sticky left-[580px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                  />
                  <td
                    className={`py-3 px-4 sticky left-[670px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                  />
                  <td
                    className={`py-3 px-3 sticky left-[760px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '70px', maxWidth: '70px', width: '70px' }}
                  />
                  <td
                    className={`py-3 px-4 sticky left-[830px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                  />
                  <td
                    className={`py-3 px-3 sticky left-[1040px] z-20 border-r ${secBgClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                  />

                  {/* Date grid cells */}
                  {timelineDaysList.map((day, idx) => {
                    let cellStyle = `py-3 border-r w-8 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`;
                    if (day.isWeekend) {
                      cellStyle += darkMode ? ' bg-slate-950/65' : ' bg-slate-100/65';
                    } else if (day.isHoliday) {
                      cellStyle += (darkMode ? ' bg-red-955/50' : ' bg-red-100/50') + ' relative';
                    }
                    if (day.isSprintStart) {
                      cellStyle += ' border-l-2 border-l-orange-500/20';
                    }
                    if (day.isSprintEnd) {
                      cellStyle += ' border-r-2 border-r-orange-500/20';
                    }
                    return (
                      <td key={`sec-${category}-${idx}`} className={cellStyle}>
                        {day.isHoliday && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-visible">
                            <span 
                              className="text-[7.5px] font-black uppercase tracking-widest text-red-600 dark:text-red-300 opacity-100 whitespace-nowrap"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              {day.holidayDescription || 'HOLIDAY'}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Task rows */}
                {catTasks.map((task) => {
                  const isRowHovered = hoveredRowId === task.id;
                  const isActiveRow = activeDatePickerId && activeDatePickerId.startsWith(`${task.id}-`);
                  const rowZIndexClass = isActiveRow ? 'z-35' : 'z-20';

                  const stickyBgClass = isRowHovered
                    ? darkMode
                      ? 'bg-slate-805 text-white border-slate-700 font-bold'
                      : 'bg-slate-50 text-slate-900 border-slate-200 font-bold'
                    : darkMode
                      ? 'bg-slate-900 text-slate-100 border-slate-800 font-bold'
                      : 'bg-white text-slate-900 border-slate-200 font-bold';

                  const stickyNormalBgClass = isRowHovered
                    ? darkMode
                      ? 'bg-slate-805 text-white border-slate-700'
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
                            ? 'bg-slate-805/40 text-white font-bold'
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
                          disabled={isSyncing || task.status === 'CLOSED'}
                          className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-3.5 h-3.5"
                          title={task.status === 'CLOSED' ? "Closed tasks cannot be selected" : ""}
                        />
                      </td>

                      {/* TASK Name cell */}
                      <td
                        className={`py-4 px-4 sticky left-[40px] ${rowZIndexClass} border-r align-middle text-left ${stickyBgClass}`}
                        style={{ minWidth: '220px', maxWidth: '220px', width: '220px' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`truncate flex-1 ${task.has_conflict ? 'text-red-500 font-bold' : ''}`} title={task.title}>
                            {task.title}
                          </div>
                          {task.backlog_task_url && (
                            <a
                              href={task.backlog_task_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-slate-200 text-blue-655'}`}
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
                        {isEditing && task.status !== 'CLOSED' ? (
                          <select
                            value={task.assigned_employee?.id != null ? String(task.assigned_employee.id) : ""}
                            onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                            className={`p-1 rounded text-[10px] border w-full font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${darkMode
                                ? 'bg-slate-900 border-slate-750 text-white'
                                : 'bg-white border-slate-250 text-slate-800'
                              }`}
                          >
                            <option value="">Unassigned</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={String(emp.id)}>
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

                      {/* STATUS */}
                      <td
                        className={`py-4 px-2 sticky left-[470px] ${rowZIndexClass} text-center border-r align-middle font-extrabold text-[9px] ${stickyNormalBgClass}`}
                        style={{ minWidth: '110px', maxWidth: '110px', width: '110px' }}
                      >
                        <span className={`whitespace-nowrap px-2 py-1 rounded-md uppercase tracking-wider ${
                          task.status === 'CLOSED' || task.status === 'RESOLVED' || task.status === 'DONE' || task.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20'
                            : task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' || task.status === 'QA'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-450 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20'
                        }`}>
                          {task.status?.replace('_', ' ') || 'OPEN'}
                        </span>
                      </td>

                      {/* START */}
                      <td
                        className={`py-4 px-1 sticky left-[580px] border-r align-middle text-[10px] ${activeDatePickerId === `${task.id}-start` ? 'z-50' : rowZIndexClass} ${stickyNormalBgClass}`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      >
                        {isEditing && task.status !== 'CLOSED' ? (
                          <CustomDatePicker
                            value={task.planned_start_date}
                            minDate={sprint?.start_date}
                            maxDate={
                              (task.planned_end_date && task.estimated_hours)
                                ? (calculateMaxStartDate(task.planned_end_date, task.estimated_hours) < sprint?.start_date
                                  ? sprint?.start_date
                                  : calculateMaxStartDate(task.planned_end_date, task.estimated_hours))
                                : (task.planned_end_date || sprint?.end_date)
                            }
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
                        className={`py-4 px-1 sticky left-[670px] border-r align-middle text-[10px] ${activeDatePickerId === `${task.id}-end` ? 'z-50' : rowZIndexClass} ${stickyNormalBgClass}`}
                        style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}
                      >
                        {isEditing && task.status !== 'CLOSED' ? (
                          <CustomDatePicker
                            value={task.planned_end_date}
                            minDate={
                              (task.planned_start_date && task.estimated_hours)
                                ? (calculateMinEndDate(task.planned_start_date, task.estimated_hours) > sprint?.end_date
                                  ? sprint?.end_date
                                  : calculateMinEndDate(task.planned_start_date, task.estimated_hours))
                                : (task.planned_start_date || sprint?.start_date)
                            }
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

                      {/* EST. HRS */}
                      <td
                        className={`py-4 px-2 sticky left-[760px] ${rowZIndexClass} border-r align-middle text-center text-[10px] font-extrabold ${stickyNormalBgClass}`}
                        style={{ minWidth: '70px', maxWidth: '70px', width: '70px' }}
                      >
                        {task.estimated_hours != null
                          ? <span className={`${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{parseFloat(task.estimated_hours)}h</span>
                          : <span className="opacity-30">-</span>
                        }
                      </td>

                      {/* REASON */}
                      <td
                        className={`py-4 px-2 sticky left-[830px] ${rowZIndexClass} hover:z-50 border-r align-middle text-[10px] text-left italic group ${stickyNormalBgClass}`}
                        style={{ minWidth: '210px', maxWidth: '210px', width: '210px' }}
                      >
                        <div className="relative">
                          <div className="truncate max-w-[200px]">
                            {task.recommendation_reason || <span className="opacity-30">-</span>}
                          </div>
                          {task.recommendation_reason && (
                            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-1/2 -translate-y-1/2 left-0 z-50 p-3 rounded-lg shadow-2xl border text-xs font-normal not-italic whitespace-normal break-words w-[400px] bg-slate-900 border-slate-750 text-white dark:bg-slate-850 dark:border-slate-700">
                              {task.recommendation_reason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td
                        className={`py-4 px-2 sticky left-[1040px] ${rowZIndexClass} border-r align-middle text-center ${stickyNormalBgClass}`}
                        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                      >
                        <button
                          onClick={() => handleIndividualDelete(task.id)}
                          disabled={isSyncing || sprint?.project_status === 'COMPLETED' || sprint?.status === 'COMPLETED' || task.status === 'CLOSED'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            darkMode 
                              ? 'hover:bg-slate-800 text-red-400 hover:text-red-300' 
                              : 'hover:bg-red-50 text-red-600 hover:text-red-750'
                          }`}
                          title={task.status === 'CLOSED' ? "Cannot delete this task as it is already closed/completed" : "Delete task"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Timeline cells */}
                      {timelineDaysList.map((day, idx) => {
                        const isDayInTaskRange = task.planned_start_date && task.planned_end_date &&
                          day.dateStr >= task.planned_start_date && day.dateStr <= task.planned_end_date &&
                          !day.isWeekend && !day.isHoliday;
                        const isBarStart = day.dateStr === task.planned_start_date;
                        const isBarEnd = day.dateStr === task.planned_end_date;

                        let cellStyle = `py-4 border-r text-center w-8 p-0.5 relative ${darkMode ? 'border-slate-850' : 'border-slate-200'}`;
                        if (day.isWeekend) {
                          cellStyle += darkMode ? ' bg-slate-950/60' : ' bg-slate-100/60';
                        } else if (day.isHoliday) {
                          cellStyle += darkMode ? ' bg-red-955/50' : ' bg-red-100/50';
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
                                  } ${isRowHovered ? 'shadow-lg brightness-110 scale-y-105' : 'opacity-85'}`}
                                title={`${task.title} (Locked)`}
                              >
                                {isBarStart && (
                                  <Lock className="w-2.5 h-2.5 text-white shrink-0" />
                                )}
                              </div>
                            )}
                            {!isDayInTaskRange && day.isHoliday && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-visible">
                                <span 
                                  className="text-[7px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 opacity-60 whitespace-nowrap"
                                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                  {day.holidayDescription || 'HOLIDAY'}
                                </span>
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
  );
}
