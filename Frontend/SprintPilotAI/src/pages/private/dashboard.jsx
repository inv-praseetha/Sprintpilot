import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../components/layout/MainLayouut';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight, Search, SlidersHorizontal, MoreHorizontal, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';

// Team performance data
const initialTeamMembers = [
  {
    id: 'EMP-01',
    name: 'Praseetha KU',
    role: 'Lead Frontend',
    roleColor: 'bg-orange-500',
    totalTasks: 28,
    completed: 26,
    onTimeRate: '92%',
    status: 'Excellent',
    statusType: 'excellent'
  },
  {
    id: 'EMP-02',
    name: 'Abhiram S',
    role: 'Backend Architect',
    roleColor: 'bg-blue-500',
    totalTasks: 24,
    completed: 21,
    onTimeRate: '88%',
    status: 'High Performer',
    statusType: 'excellent'
  },
  {
    id: 'EMP-03',
    name: 'Ananthu M',
    role: 'QA Automation',
    roleColor: 'bg-purple-500',
    totalTasks: 35,
    completed: 30,
    onTimeRate: '85%',
    status: 'Good',
    statusType: 'good'
  },
  {
    id: 'EMP-04',
    name: 'Abid Muhammad',
    role: 'DevOps Engineer',
    roleColor: 'bg-emerald-500',
    totalTasks: 18,
    completed: 12,
    onTimeRate: '66%',
    status: 'Needs Review',
    statusType: 'review'
  }
];

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColorClass = (roleColor) => {
  switch (roleColor) {
    case 'bg-orange-500':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'bg-blue-500':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'bg-purple-500':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'bg-emerald-500':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  }
};

const Dashboard = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [hoveredSprint, setHoveredSprint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projectsData, setProjectsData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch projects list
        const projectsResponse = await apiClient.get('projects/?page_size=100');
        const projectsList = (Array.isArray(projectsResponse.data) 
          ? projectsResponse.data 
          : projectsResponse.data.results || []).filter(proj => proj.status !== 'COMPLETED');

        const tempProjectsData = {};
        
        // Fetch sprints for each project in parallel
        await Promise.all(
          projectsList.map(async (project) => {
            try {
              const sprints = await SprintServices.getProjectSprints(project.id);
              if (sprints && sprints.length > 0) {
                const sortedSprints = [...sprints].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                tempProjectsData[project.name] = sortedSprints.map(s => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  let completedTasks = 0;
                  let activeTasks = 0;
                  let overdueTasks = 0;

                  if (s.tasks) {
                    s.tasks.forEach(task => {
                      const isCompleted = task.status === 'CLOSED' || task.status === 'RESOLVED';
                      if (isCompleted) {
                        completedTasks++;
                      } else {
                        activeTasks++;
                        if (task.planned_end_date && new Date(task.planned_end_date) < today) {
                          overdueTasks++;
                        }
                      }
                    });
                  }

                  // Map sprint status
                  let mappedStatus = 'Planned';
                  if (s.status === 'COMPLETED') {
                    mappedStatus = 'Completed';
                  } else if (s.status === 'ACTIVE') {
                    const end = new Date(s.end_date);
                    if (end < today) {
                      mappedStatus = 'Delayed';
                    } else {
                      mappedStatus = 'In Progress';
                    }
                  }

                  return {
                    name: s.milestone,
                    startDate: s.start_date,
                    endDate: s.end_date,
                    status: mappedStatus,
                    completedTasks,
                    activeTasks,
                    overdueTasks,
                    rawTasks: s.tasks || []
                  };
                });
              } else {
                tempProjectsData[project.name] = [];
              }
            } catch (err) {
              console.error(`Error fetching sprints for project ${project.name}:`, err);
            }
          })
        );

        setProjectsData(tempProjectsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const dynamicProjectConfig = useMemo(() => {
    const staticConfig = {
      'Cloud Sync Platform': { color: '#ea580c' },
      'AI Analytics Hub': { color: '#3b82f6' },
      'Developer Portal': { color: '#d946ef' },
      'Security Gateway': { color: '#8b5cf6' }
    };
    const config = { ...staticConfig };
    const colors = ['#ea580c', '#3b82f6', '#d946ef', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
    
    Object.keys(projectsData).forEach((projName, index) => {
      if (!config[projName]) {
        config[projName] = { color: colors[index % colors.length] };
      }
    });
    return config;
  }, [projectsData]);

  const metrics = useMemo(() => {
    let totalProjects = Object.keys(projectsData).length;
    let totalTasks = 0;
    let tasksPending = 0;
    let tasksOverdue = 0;

    Object.values(projectsData).forEach(sprints => {
      sprints.forEach(s => {
        totalTasks += (s.completedTasks + s.activeTasks);
        tasksPending += s.activeTasks;
        tasksOverdue += s.overdueTasks;
      });
    });

    return {
      totalProjects,
      totalTasks,
      tasksPending,
      tasksOverdue
    };
  }, [projectsData]);

  const maxTasks = useMemo(() => {
    let maxVal = 10;
    Object.values(projectsData).forEach(sprints => {
      sprints.forEach(s => {
        if (s.completedTasks > maxVal) {
          maxVal = s.completedTasks;
        }
      });
    });
    const roundedMax = Math.ceil(maxVal / 5) * 5;
    return Math.max(roundedMax, 10);
  }, [projectsData]);

  const longestSprintsProject = useMemo(() => {
    let longest = [];
    Object.values(projectsData).forEach(sprints => {
      const filtered = sprints.filter(s => s.status !== 'Not Planned');
      if (filtered.length > longest.length) {
        longest = filtered;
      }
    });
    return longest;
  }, [projectsData]);

  const maxSprintsCount = longestSprintsProject.length;

  const getY = (tasks) => {
    const ratio = tasks / maxTasks;
    return 380 - ratio * (380 - 40);
  };

  const getX = (index) => {
    const divisor = maxSprintsCount > 1 ? maxSprintsCount - 1 : 1;
    return 90 + (index / divisor) * 640;
  };

  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const val = Math.round((maxTasks * i) / (count - 1));
      ticks.push({
        label: `${val} Tasks`,
        y: 380 - (i / (count - 1)) * (380 - 40)
      });
    }
    return ticks;
  }, [maxTasks]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed':
        return {
          fill: '#10b981',
          stroke: '#10b981'
        };
      case 'In Progress':
        return {
          fill: '#6366f1',
          stroke: '#6366f1'
        };
      case 'Delayed':
        return {
          fill: '#f43f5e',
          stroke: '#f43f5e'
        };
      case 'Planned':
      default:
        return {
          fill: '#94a3b8',
          stroke: '#94a3b8'
        };
    }
  };

  const handleMouseEnter = (sprint, index, project) => {
    const x = getX(index);
    const y = getY(sprint.completedTasks);
    setHoveredSprint({
      sprint,
      project,
      xPercent: (x / 800) * 100,
      yPercent: (y / 450) * 100
    });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredMembers = useMemo(() => {
    return initialTeamMembers.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const sprintBoxesData = useMemo(() => {
    const list = [];
    Object.entries(projectsData).forEach(([projName, sprints]) => {
      sprints.forEach((sprint) => {
        if (sprint.status === 'In Progress' || sprint.status === 'Delayed') {
          list.push({
            project: projName,
            sprint: sprint,
            sprintsHistory: sprints.filter(s => s.status !== 'Not Planned')
          });
        }
      });
    });
    return list;
  }, [projectsData]);

  const formatBoxDateRange = (start, end) => {
    if (!start || !end) return 'Planned';
    const opt = { month: 'short', day: '2-digit' };
    const s = new Date(start).toLocaleDateString('en-US', opt);
    const e = new Date(end).toLocaleDateString('en-US', opt);
    return `${s} - ${e}`;
  };

  const getProjectSparklinePath = (sprintsHistory) => {
    const maxVal = Math.max(...sprintsHistory.map(s => s.completedTasks), 1);
    const width = 100;
    const height = 30;
    const padding = 4;
    const points = sprintsHistory.map((s, idx) => {
      const x = padding + (idx / (sprintsHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - (s.completedTasks / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const getProjectSparklineAreaPath = (sprintsHistory) => {
    const maxVal = Math.max(...sprintsHistory.map(s => s.completedTasks), 1);
    const width = 100;
    const height = 30;
    const padding = 4;
    const points = sprintsHistory.map((s, idx) => {
      const x = padding + (idx / (sprintsHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - (s.completedTasks / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    });
    const firstX = padding;
    const lastX = width - padding;
    return `M ${firstX},${height} L ${points.join(' L ')} L ${lastX},${height} Z`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <span className="text-sm font-semibold tracking-wider animate-pulse">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <main className="p-8 lg:p-10 space-y-8 mx-auto">
      {/* WELCOME BANNER */}
      <section className="text-left">
        <span className="text-sm font-medium text-slate-400">Ready to conquer your projects?</span>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
          Welcome Back, <span className={darkMode ? 'text-white' : 'text-slate-900'}>{user?.full_name || 'Project Member'}</span> 👋
        </h1>
      </section>

      {/* METRICS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Total Project */}
        <div className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Project</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">{metrics.totalProjects}</span>
            {/* Sparkline column visual */}
            <div className="flex items-end gap-0.5 h-8 pb-1">
              {[4, 6, 3, 7, 5, 8, 4, 9, 6, 8, 5, 7, 3, 5, 4, 6].map((h, i) => (
                <div key={i} style={{ height: `${h * 10}%` }} className="w-[3px] bg-slate-300 dark:bg-slate-700 rounded-t" />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Tasks</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">{metrics.totalTasks}</span>
            {/* Dotted sparkline visual */}
            <div className="flex items-end gap-[3px] h-8 pb-2">
              {[2, 3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 2, 3, 4, 3, 5].map((h, i) => (
                <div key={i} className="flex flex-col items-center justify-end gap-[2px]">
                  <div className="w-[3px] h-[3px] rounded-full bg-orange-400" />
                  <div style={{ height: `${h * 4}px` }} className="w-[1px] bg-orange-300/40" />
                  <div className="w-[2px] h-[2px] rounded-full bg-orange-400/60" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Tasks Pending */}
        <div className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Tasks Pending</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">{metrics.tasksPending}</span>
            {/* Thick block visual */}
            <div className="flex items-end gap-1.5 h-8 pb-1">
              <div className="w-3 h-7 bg-orange-500 rounded-sm" />
              <div className="w-3 h-5 bg-slate-200 dark:bg-slate-700 rounded-sm" />
              <div className="w-16 h-[2px] bg-slate-100 dark:bg-slate-800 self-center rounded" />
            </div>
          </div>
        </div>

        {/* Card 4: Tasks Overdue */}
        <div className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Tasks Overdue</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className={`text-4xl font-extrabold tracking-tight ${metrics.tasksOverdue > 0 ? 'text-red-500' : ''}`}>{metrics.tasksOverdue}</span>
            {/* Dotted sparkline visual */}
            <div className="flex items-end gap-[3px] h-8 pb-2">
              {[3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 2, 3, 4, 3, 5, 4].map((h, i) => (
                <div key={i} className="flex flex-col items-center justify-end gap-[2px]">
                  <div className="w-[3px] h-[3px] rounded-full bg-orange-400" />
                  <div style={{ height: `${h * 4}px` }} className="w-[1px] bg-orange-300/40" />
                  <div className="w-[2px] h-[2px] rounded-full bg-orange-400/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: 2x2 Sprint Boxes */}
        <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sprintBoxesData.length > 0 ? (
            sprintBoxesData.slice(0, 4).map((item, index) => {
              const config = dynamicProjectConfig[item.project] || { color: '#94a3b8' };
              const sprint = item.sprint;
              return (
                <div 
                  key={`${item.project}-${sprint.name}`}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                    sprint.status === 'Delayed'
                      ? (darkMode 
                          ? 'bg-slate-900 border-rose-500/40 text-white shadow-lg shadow-rose-950/20' 
                          : 'bg-rose-50/10 border-rose-100 text-slate-800 hover:shadow-xl hover:shadow-rose-100/50')
                      : (darkMode 
                          ? 'bg-slate-900 border-slate-800 text-white' 
                          : 'bg-white border-slate-100 text-slate-800 hover:shadow-xl hover:shadow-slate-100/50')
                  }`}
                >
                  <div>
                    {/* Project Name & Color Dot */}
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                      <span className="truncate text-left">{item.project}</span>
                    </div>

                    {/* Sprint Name (without Status Badge) */}
                    <div className="mb-1 text-left">
                      <span className="text-sm font-extrabold tracking-tight">{sprint.name}</span>
                    </div>
                    
                    <div className="text-[10px] text-slate-400 font-semibold tracking-wide text-left mb-3">
                      {formatBoxDateRange(sprint.startDate, sprint.endDate)}
                    </div>
                  </div>

                  {/* Sparkline of project history in Centre with increased size */}
                  {(() => {
                    const sparklineColor = sprint.status === 'Delayed' ? '#f43f5e' : '#10b981';
                    return (
                      <div className="w-full h-16 my-3 overflow-visible">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.25" />
                              <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d={getProjectSparklineAreaPath(item.sprintsHistory)}
                            fill={`url(#grad-${index})`}
                          />
                          <path
                            d={getProjectSparklinePath(item.sprintsHistory)}
                            fill="none"
                            stroke={sparklineColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Progress Details & History at the bottom */}
                  <div className="grid grid-cols-3 gap-2 text-left pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Done</span>
                      <span className="text-xs font-extrabold text-emerald-500">{sprint.completedTasks} Tasks</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Active</span>
                      <span className={`text-xs font-extrabold ${sprint.status === 'Delayed' ? 'text-rose-500' : 'text-indigo-500'}`}>
                        {sprint.activeTasks} Tasks
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                        History
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {item.sprintsHistory.length} Sprints
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`sm:col-span-2 p-6 rounded-3xl border flex flex-col items-center justify-center text-center min-h-[300px] ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
                <SlidersHorizontal className="w-6 h-6 animate-pulse" />
              </div>
              <span className={`text-sm font-bold block ${darkMode ? 'text-white' : 'text-slate-900'}`}>No Active Sprints</span>
              <span className="text-xs text-slate-400 mt-1 max-w-[200px]">Active or delayed sprints will appear here.</span>
            </div>
          )}
        </div>

        {/* Right: Resized Main Graph */}
        <section className={`xl:col-span-2 p-6 rounded-3xl border relative ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="text-left">
              <h3 className="font-bold text-lg">Sprint Schedule & Status</h3>
              <span className="text-xs text-slate-400">Track timelines, status, and task load for project sprints</span>
            </div>

          {/* Legends: Status and Projects */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-3 pr-5 border-r border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-500">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-semibold text-slate-500">In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-slate-500">Delayed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Planned</span>
              </div>
            </div>

            {/* Project Legend */}
            <div className="flex flex-wrap items-center gap-4">
              {Object.keys(projectsData).map((projName) => {
                const config = dynamicProjectConfig[projName] || { color: '#94a3b8' };
                return (
                  <div key={projName} className="flex items-center gap-2">
                    <span className="w-3.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{projName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SVG Timeline Chart Wrapper */}
        <div className="relative w-full h-[450px] overflow-visible">
          {longestSprintsProject.length > 0 ? (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 450" preserveAspectRatio="none">
              {/* Y-Axis Horizontal Grid Lines and Labels */}
              {yTicks.map((tick, i) => (
                <g key={i} className="text-[10px] font-bold fill-slate-400 select-none">
                  <line
                    x1="80"
                    y1={tick.y}
                    x2="750"
                    y2={tick.y}
                    className="stroke-slate-100 dark:stroke-slate-800/60"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="70"
                    y={tick.y + 3}
                    textAnchor="end"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Vertical grid lines mapping to Sprints */}
              {longestSprintsProject.map((s, i) => {
                const x = getX(i);
                return (
                  <line
                    key={i}
                    x1={x}
                    y1="40"
                    x2={x}
                    y2="380"
                    className="stroke-slate-100 dark:stroke-slate-800/40"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Connecting lines for each project */}
              {Object.entries(projectsData).map(([projName, sprints]) => {
                const config = dynamicProjectConfig[projName] || { color: '#94a3b8' };
                const isHovered = hoveredSprint?.project === projName;
                const hasActiveHover = hoveredSprint !== null;
                const opacity = hasActiveHover ? (isHovered ? 'opacity-100' : 'opacity-20') : 'opacity-70';
                const filteredSprints = sprints.filter(s => s.status !== 'Not Planned');
                return (
                  <path
                    key={projName}
                    d={filteredSprints.map((s, i) => {
                      const x = getX(i);
                      const y = getY(s.completedTasks);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={config.color}
                    strokeWidth="3"
                    className={`transition-all duration-300 ${opacity}`}
                  />
                );
              })}

              {/* Interactive Sprint Dots for all projects */}
              {Object.entries(projectsData).map(([projName, sprints]) => {
                const isHoveredProj = hoveredSprint?.project === projName;
                const hasActiveHover = hoveredSprint !== null;
                const opacity = hasActiveHover ? (isHoveredProj ? 'opacity-100' : 'opacity-20') : 'opacity-100';
                const filteredSprints = sprints.filter(s => s.status !== 'Not Planned');

                return (
                  <g
                    key={projName}
                    className={`transition-all duration-300 ${opacity}`}
                  >
                    {filteredSprints.map((s, i) => {
                      const x = getX(i);
                      const y = getY(s.completedTasks);
                      const style = getStatusStyle(s.status);
                      const isHoveredDot = hoveredSprint?.sprint === s;

                      return (
                        <g
                          key={i}
                          className="cursor-pointer group/dot"
                          onMouseEnter={() => handleMouseEnter(s, i, projName)}
                          onMouseLeave={() => setHoveredSprint(null)}
                        >
                          {/* Invisible hover detector target */}
                          <circle
                            cx={x}
                            cy={y}
                            r="16"
                            fill="transparent"
                          />

                          {/* Outer Hover Ring (glow) */}
                          <circle
                            cx={x}
                            cy={y}
                            r="12"
                            className={`transition-all duration-300 ${isHoveredDot ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                            fill={style.stroke}
                            fillOpacity="0.15"
                            stroke={style.stroke}
                            strokeOpacity="0.4"
                            strokeWidth="1.5"
                            style={{ transformOrigin: `${x}px ${y}px` }}
                          />

                          {/* Inner Glow Circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={style.fill}
                            className="transition-all duration-300 group-hover/dot:scale-110"
                            style={{ transformOrigin: `${x}px ${y}px` }}
                          />

                          {/* Center core dot */}
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill={darkMode ? '#0f172a' : '#ffffff'}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* X-Axis labels inside the SVG */}
              {longestSprintsProject.map((s, i) => {
                const x = getX(i);
                return (
                  <text
                    key={i}
                    x={x}
                    y="415"
                    textAnchor="middle"
                    className="text-xs font-bold fill-slate-400 select-none"
                  >
                    Sprint {i + 1}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-400">No project timelines available to chart</span>
            </div>
          )}

          {/* Floating Tooltip */}
          {hoveredSprint && (
            <div
              className={`absolute p-4 rounded-2xl shadow-xl border z-20 pointer-events-none transition-all duration-200 text-left ${darkMode ? 'bg-slate-950/95 border-slate-800 text-white backdrop-blur-md' : 'bg-white/95 border-slate-100 text-slate-900 backdrop-blur-md'
                }`}
              style={{
                left: `${hoveredSprint.xPercent}%`,
                top: `${hoveredSprint.yPercent}%`,
                transform: 'translate(-50%, -108%)',
                minWidth: '200px'
              }}
            >
              <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                {hoveredSprint.project}
              </div>
              <div className="font-bold text-sm mb-1">{hoveredSprint.sprint.name}</div>
              <div className="text-[10px] text-slate-400 mb-2">
                {formatDate(hoveredSprint.sprint.startDate)} - {formatDate(hoveredSprint.sprint.endDate)}
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <span className={`inline-block w-2 h-2 rounded-full ${hoveredSprint.sprint.status === 'Completed' ? 'bg-emerald-500' :
                    hoveredSprint.sprint.status === 'In Progress' ? 'bg-indigo-500' :
                      hoveredSprint.sprint.status === 'Delayed' ? 'bg-rose-500' :
                        'bg-slate-400'
                  }`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {hoveredSprint.sprint.status}
                </span>
              </div>

              {hoveredSprint.sprint.status !== 'Planned' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-tight">Completed</span>
                    <span className="font-extrabold text-orange-500 text-sm">{hoveredSprint.sprint.completedTasks} Tasks</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-tight">Active</span>
                    <span className="font-extrabold text-indigo-500 text-sm">{hoveredSprint.sprint.activeTasks} Tasks</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      </div>

      {/* TEAM PERFORMANCE LIST */}
      <section className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="text-left">
            <h3 className="font-bold text-lg">Team Performance</h3>
            <span className="text-xs text-slate-400">Track task completions and efficiency metrics for team members</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar inside section */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members"
                className={`py-2 pl-9 pr-4 text-xs rounded-xl outline-none border transition-all ${
                  darkMode 
                    ? 'bg-slate-800 text-slate-200 border-slate-700 placeholder-slate-500 focus:bg-slate-700/80 focus:ring-1 focus:ring-slate-600' 
                    : 'bg-white text-slate-700 border-slate-200 placeholder-slate-400 focus:border-slate-300'
                }`}
              />
            </div>

            {/* Filter Button */}
            <button className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold text-left">
                <th className="py-4 px-4 font-semibold text-slate-400">ID</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Name</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Role</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Total Tasks</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Completed</th>
                <th className="py-4 px-4 font-semibold text-slate-400">On-Time Rate</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Efficiency</th>
                <th className="py-4 px-4 w-12 text-center font-semibold text-slate-400">More</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-left">
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className="text-sm font-medium transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* ID */}
                  <td className={`py-4 px-4 font-semibold text-left ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{member.id}</td>
                  
                  {/* Name + Avatar */}
                  <td className="py-4 px-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${getAvatarColorClass(member.roleColor)}`}>
                        {getInitials(member.name)}
                      </div>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{member.name}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-4 px-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${member.roleColor}`} />
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{member.role}</span>
                    </div>
                  </td>

                  {/* Total Tasks */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.totalTasks} Tasks</td>

                  {/* Completed */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.completed} Tasks</td>

                  {/* On-Time Rate */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.onTimeRate}</td>

                  {/* Status Badge */}
                  <td className="py-4 px-4 text-left">
                    {member.statusType === 'excellent' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                        {member.status}
                      </span>
                    ) : member.statusType === 'good' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                        {member.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                        {member.status}
                      </span>
                    )}
                  </td>

                  {/* Actions button */}
                  <td className="py-4 px-4 text-center">
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No team members match search query
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
