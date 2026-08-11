import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import { Loader2, Calendar, Clock, AlertTriangle, FolderOpen } from 'lucide-react';
import apiClient from '../../api/apiClient';

const Status = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [loading, setLoading] = useState(true);

  // Arrays of { projectId, projectName, count }
  const [overdueProjects, setOverdueProjects] = useState([]);
  const [todayProjects, setTodayProjects] = useState([]);
  const [tomorrowProjects, setTomorrowProjects] = useState([]);

  const fetchStatusCounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('sprints/tasks/status/');
      const data = response.data;
      setOverdueProjects(data.overdue || []);
      setTodayProjects(data.today || []);
      setTomorrowProjects(data.tomorrow || []);
    } catch (err) {
      console.error('Error fetching task status counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusCounts();
  }, []);

  const totalOverdue = overdueProjects.reduce((sum, p) => sum + p.count, 0);
  const totalToday = todayProjects.reduce((sum, p) => sum + p.count, 0);
  const totalTomorrow = tomorrowProjects.reduce((sum, p) => sum + p.count, 0);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <span className="text-sm font-semibold tracking-wider animate-pulse">Loading task urgency status...</span>
      </div>
    );
  }

  return (
    <main className="p-8 lg:p-10 space-y-8 mx-auto">
      {/* HEADER SECTION */}
      <section className="text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-slate-450 dark:text-slate-400">Keep track of priority tasks per project</span>
          <h1 className={`text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Task Urgency Status 🎯
          </h1>
        </div>
      </section>

      {/* KANBAN BOARD (PROJECT CARDS ONLY) */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* COLUMN 1: OVERDUE */}
        <div className={`flex flex-col rounded-3xl p-5 border ${darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600 dark:text-red-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Overdue</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white">
              {totalOverdue}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1">
            {overdueProjects.length > 0 ? (
              overdueProjects.map(item => (
                <ProjectSummaryCard key={item.projectId} item={item} darkMode={darkMode} navigate={navigate} themeColor="red" label="overdue tasks" />
              ))
            ) : (
              <EmptyState message="No overdue tasks across projects" darkMode={darkMode} />
            )}
          </div>
        </div>

        {/* COLUMN 2: DUE TODAY */}
        <div className={`flex flex-col rounded-3xl p-5 border ${darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-4.5 h-4.5 text-orange-600 dark:text-orange-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Due Today</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-600 text-white">
              {totalToday}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1">
            {todayProjects.length > 0 ? (
              todayProjects.map(item => (
                <ProjectSummaryCard key={item.projectId} item={item} darkMode={darkMode} navigate={navigate} themeColor="orange" label="due today" />
              ))
            ) : (
              <EmptyState message="No tasks due today across projects" darkMode={darkMode} />
            )}
          </div>
        </div>

        {/* COLUMN 3: DUE TOMORROW */}
        <div className={`flex flex-col rounded-3xl p-5 border ${darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/50 border-slate-200/80 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-blue-600 dark:text-blue-500" />
              </div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Due Tomorrow</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white">
              {totalTomorrow}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1">
            {tomorrowProjects.length > 0 ? (
              tomorrowProjects.map(item => (
                <ProjectSummaryCard key={item.projectId} item={item} darkMode={darkMode} navigate={navigate} themeColor="blue" label="due tomorrow" />
              ))
            ) : (
              <EmptyState message="No tasks due tomorrow across projects" darkMode={darkMode} />
            )}
          </div>
        </div>

      </section>
    </main>
  );
};

// Colors mapping for ProjectSummaryCard
const COLORS = {
  red:    { iconBg: 'bg-red-500/10',    iconText: 'text-red-500',    badge: 'bg-red-600',    border: 'hover:border-red-500/50' },
  orange: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-500', badge: 'bg-orange-600', border: 'hover:border-orange-500/50' },
  blue:   { iconBg: 'bg-blue-500/10',   iconText: 'text-blue-500',   badge: 'bg-blue-600',   border: 'hover:border-blue-500/50' },
};

// Simple project card displaying project name and pending task count (Clickable to navigate to project detail)
const ProjectSummaryCard = ({ item, darkMode, navigate, themeColor, label }) => {
  const c = COLORS[themeColor] || COLORS.orange;

  const handleClick = () => {
    navigate(`/projects/${item.projectId}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${c.border} ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
            <FolderOpen className={`w-5 h-5 ${c.iconText}`} />
          </div>
          <div className="text-left truncate">
            <h4 className={`font-extrabold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {item.projectName}
            </h4>
            <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.count} {label}
            </span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold text-white flex-shrink-0 ${c.badge}`}>
          {item.count}
        </span>
      </div>
    </div>
  );
};

// EmptyState component
const EmptyState = ({ message, darkMode }) => (
  <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-10 ${
    darkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/20'
  }`}>
    <span className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</span>
  </div>
);

export default Status;
