import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Calendar, Clock, AlertTriangle, User, ChevronRight } from 'lucide-react';
import apiClient from '../../api/apiClient';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Status = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  
  // Tasks lists
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);

  // Total counts from API
  const [overdueCount, setOverdueCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [tomorrowCount, setTomorrowCount] = useState(0);

  // hasMore flags
  const [hasMoreOverdue, setHasMoreOverdue] = useState(false);
  const [hasMoreToday, setHasMoreToday] = useState(false);
  const [hasMoreTomorrow, setHasMoreTomorrow] = useState(false);

  // Loading more flags
  const [loadingMoreOverdue, setLoadingMoreOverdue] = useState(false);
  const [loadingMoreToday, setLoadingMoreToday] = useState(false);
  const [loadingMoreTomorrow, setLoadingMoreTomorrow] = useState(false);

  // Refs for scroll elements
  const overdueContainerRef = useRef(null);
  const todayContainerRef = useRef(null);
  const tomorrowContainerRef = useRef(null);

  const fetchInitialTasks = async () => {
    try {
      setLoading(true);
      const tasksResponse = await apiClient.get('sprints/tasks/status/', {
        params: {
          overdue_offset: 0,
          overdue_limit: 5,
          today_offset: 0,
          today_limit: 5,
          tomorrow_offset: 0,
          tomorrow_limit: 5
        }
      });

      const data = tasksResponse.data;
      setOverdueTasks(data.overdue?.tasks || []);
      setHasMoreOverdue(data.overdue?.has_more || false);
      setOverdueCount(data.overdue?.total_count || 0);

      setTodayTasks(data.today?.tasks || []);
      setHasMoreToday(data.today?.has_more || false);
      setTodayCount(data.today?.total_count || 0);

      setTomorrowTasks(data.tomorrow?.tasks || []);
      setHasMoreTomorrow(data.tomorrow?.has_more || false);
      setTomorrowCount(data.tomorrow?.total_count || 0);
    } catch (err) {
      console.error('Error fetching tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialTasks();
  }, []);

  const loadMoreTasks = async (columnType) => {
    if (columnType === 'OVERDUE') {
      if (loadingMoreOverdue || !hasMoreOverdue) return;
      try {
        setLoadingMoreOverdue(true);
        const res = await apiClient.get('sprints/tasks/status/', {
          params: {
            column: 'OVERDUE',
            overdue_offset: overdueTasks.length,
            overdue_limit: 5
          }
        });
        const data = res.data.overdue;
        setOverdueTasks(prev => [...prev, ...(data.tasks || [])]);
        setHasMoreOverdue(data.has_more || false);
        if (data.total_count !== undefined) setOverdueCount(data.total_count);
      } catch (err) {
        console.error('Error loading more overdue tasks:', err);
      } finally {
        setLoadingMoreOverdue(false);
      }
    } else if (columnType === 'TODAY') {
      if (loadingMoreToday || !hasMoreToday) return;
      try {
        setLoadingMoreToday(true);
        const res = await apiClient.get('sprints/tasks/status/', {
          params: {
            column: 'TODAY',
            today_offset: todayTasks.length,
            today_limit: 5
          }
        });
        const data = res.data.today;
        setTodayTasks(prev => [...prev, ...(data.tasks || [])]);
        setHasMoreToday(data.has_more || false);
        if (data.total_count !== undefined) setTodayCount(data.total_count);
      } catch (err) {
        console.error('Error loading more today tasks:', err);
      } finally {
        setLoadingMoreToday(false);
      }
    } else if (columnType === 'TOMORROW') {
      if (loadingMoreTomorrow || !hasMoreTomorrow) return;
      try {
        setLoadingMoreTomorrow(true);
        const res = await apiClient.get('sprints/tasks/status/', {
          params: {
            column: 'TOMORROW',
            tomorrow_offset: tomorrowTasks.length,
            tomorrow_limit: 5
          }
        });
        const data = res.data.tomorrow;
        setTomorrowTasks(prev => [...prev, ...(data.tasks || [])]);
        setHasMoreTomorrow(data.has_more || false);
        if (data.total_count !== undefined) setTomorrowCount(data.total_count);
      } catch (err) {
        console.error('Error loading more tomorrow tasks:', err);
      } finally {
        setLoadingMoreTomorrow(false);
      }
    }
  };

  // Scroll listener registration
  useEffect(() => {
    const handleScroll = (ref, columnType) => {
      if (!ref.current) return;
      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      if (scrollHeight - scrollTop - clientHeight < 30) {
        loadMoreTasks(columnType);
      }
    };

    const overdueEl = overdueContainerRef.current;
    const todayEl = todayContainerRef.current;
    const tomorrowEl = tomorrowContainerRef.current;

    const onOverdueScroll = () => handleScroll(overdueContainerRef, 'OVERDUE');
    const onTodayScroll = () => handleScroll(todayContainerRef, 'TODAY');
    const onTomorrowScroll = () => handleScroll(tomorrowContainerRef, 'TOMORROW');

    if (overdueEl) overdueEl.addEventListener('scroll', onOverdueScroll);
    if (todayEl) todayEl.addEventListener('scroll', onTodayScroll);
    if (tomorrowEl) tomorrowEl.addEventListener('scroll', onTomorrowScroll);

    return () => {
      if (overdueEl) overdueEl.removeEventListener('scroll', onOverdueScroll);
      if (todayEl) todayEl.removeEventListener('scroll', onTodayScroll);
      if (tomorrowEl) tomorrowEl.removeEventListener('scroll', onTomorrowScroll);
    };
  }, [overdueTasks.length, todayTasks.length, tomorrowTasks.length, hasMoreOverdue, hasMoreToday, hasMoreTomorrow, loadingMoreOverdue, loadingMoreToday, loadingMoreTomorrow]);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <span className="text-sm font-semibold tracking-wider animate-pulse">Loading task status dashboard...</span>
      </div>
    );
  }

  return (
    <main className="p-8 lg:p-10 space-y-8 mx-auto">
      {/* HEADER SECTION */}
      <section className="text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-slate-450 dark:text-slate-400">Keep track of priority tasks</span>
          <h1 className={`text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Task Urgency Status 🎯
          </h1>
        </div>
      </section>

      {/* KANBAN BOARD */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLUMN 1: OVERDUE */}
        <div className={`flex flex-col rounded-3xl p-5 border ${
          darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600 dark:text-red-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Overdue</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white">
              {overdueCount}
            </span>
          </div>

          <div 
            ref={overdueContainerRef}
            className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1"
          >
            {overdueTasks.length > 0 ? (
              overdueTasks.map(task => (
                <TaskCard key={task.id} task={task} darkMode={darkMode} navigate={navigate} themeColor="red" />
              ))
            ) : (
              <EmptyState message="No overdue tasks" darkMode={darkMode} />
            )}
            {loadingMoreOverdue && (
              <div className="flex justify-center py-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: DUE TODAY */}
        <div className={`flex flex-col rounded-3xl p-5 border ${
          darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-4.5 h-4.5 text-orange-600 dark:text-orange-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Due Today</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-600 text-white">
              {todayCount}
            </span>
          </div>

          <div 
            ref={todayContainerRef}
            className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1"
          >
            {todayTasks.length > 0 ? (
              todayTasks.map(task => (
                <TaskCard key={task.id} task={task} darkMode={darkMode} navigate={navigate} themeColor="orange" />
              ))
            ) : (
              <EmptyState message="No tasks due today" darkMode={darkMode} />
            )}
            {loadingMoreToday && (
              <div className="flex justify-center py-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: DUE TOMORROW */}
        <div className={`flex flex-col rounded-3xl p-5 border ${
          darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-blue-600 dark:text-blue-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Due Tomorrow</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white">
              {tomorrowCount}
            </span>
          </div>

          <div 
            ref={tomorrowContainerRef}
            className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1"
          >
            {tomorrowTasks.length > 0 ? (
              tomorrowTasks.map(task => (
                <TaskCard key={task.id} task={task} darkMode={darkMode} navigate={navigate} themeColor="blue" />
              ))
            ) : (
              <EmptyState message="No tasks due tomorrow" darkMode={darkMode} />
            )}
            {loadingMoreTomorrow && (
              <div className="flex justify-center py-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>

      </section>
    </main>
  );
};

// TaskCard component inside Status
const TaskCard = ({ task, darkMode, navigate, themeColor }) => {
  const assigneeName = task.assigned_employee?.user?.full_name || 'Unassigned';
  const hasAssignee = !!task.assigned_employee;
  
  // Format planned end date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const opt = { month: 'short', day: '2-digit', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', opt);
  };

  const handleCardClick = () => {
    navigate(`/projects/${task.projectId}/sprints/${task.sprintId}`);
  };

  // Border hover classes based on themeColor
  const getHoverBorder = () => {
    switch (themeColor) {
      case 'red':
        return 'hover:border-red-500/60 hover:shadow-red-500/5';
      case 'orange':
        return 'hover:border-orange-500/60 hover:shadow-orange-500/5';
      case 'blue':
        return 'hover:border-blue-500/60 hover:shadow-blue-500/5';
      default:
        return 'hover:border-orange-500/60 hover:shadow-orange-500/5';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-250 group hover:scale-[1.01] hover:shadow-md ${getHoverBorder()} ${
        darkMode 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-slate-100'
      }`}
    >
      {/* Category and priority badges */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
          darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
        }`}>
          {task.category || 'TASK'}
        </span>

      </div>

      {/* Task title */}
      <h4 className={`font-extrabold text-sm tracking-tight mb-2 transition-colors line-clamp-2 ${
        darkMode ? 'text-white' : 'text-slate-900'
      }`}>
        {task.title}
      </h4>

      {/* Project and Sprint path */}
      <div className={`flex items-center gap-1 text-[11px] font-bold mb-4 ${
        darkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        <span className="truncate max-w-[120px]">{task.projectName}</span>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
        <span className="truncate max-w-[120px]">{task.sprintName}</span>
      </div>

      {/* Footer details: Date & Assignee */}
      <div className={`flex items-center justify-between gap-3 pt-3.5 border-t ${
        darkMode ? 'border-slate-800/80' : 'border-slate-150'
      }`}>
        
        {/* Planned end date */}
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(task.planned_end_date)}</span>
        </div>

        {/* Assignee initials badge */}
        <div className="flex items-center gap-2">
          {hasAssignee ? (
            <div 
              title={assigneeName}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold bg-orange-500/10 text-orange-650 border border-orange-500/25"
            >
              {getInitials(assigneeName)}
            </div>
          ) : (
            <div 
              title="Unassigned"
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <User className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// EmptyState component
const EmptyState = ({ message, darkMode }) => {
  return (
    <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-10 ${
      darkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/20'
    }`}>
      <span className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</span>
    </div>
  );
};

export default Status;
