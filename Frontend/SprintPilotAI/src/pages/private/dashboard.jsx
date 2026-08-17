import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight,AlertTriangle, Search, SlidersHorizontal, MoreHorizontal, Loader2, Calendar, Clock } from 'lucide-react';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColorClass = (index) => {
  const colors = [
    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ];
  return colors[index % colors.length];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [hoveredSprint, setHoveredSprint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projectsData, setProjectsData] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasMoreTeam, setHasMoreTeam] = useState(true);
  const [loadingMoreTeam, setLoadingMoreTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTeamPerformance = useCallback(async (offset = 0, search = '', isInitial = false) => {
    try {
      if (!isInitial) setLoadingMoreTeam(true);
      const res = await apiClient.get(
        `sprints/team-performance/?limit=5&offset=${offset}&search=${encodeURIComponent(search)}`
      );
      const data = res.data || {};
      const results = Array.isArray(data) ? data : (data.results || []);
      const hasMore = data.has_more ?? (results.length === 5);

      setTeamMembers(prev => isInitial ? results : [...prev, ...results]);
      setHasMoreTeam(hasMore);
    } catch (err) {
      console.error('Error fetching team performance:', err);
    } finally {
      setLoadingMoreTeam(false);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch projects list & initial team performance concurrently
        const [projectsResponse] = await Promise.all([
          apiClient.get('projects/?page_size=100'),
          fetchTeamPerformance(0, searchQuery, true)
        ]);

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
                    if (end < today || overdueTasks > 0) {
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
                    workspaceUrl: s.workspace_url,
                    rawTasks: s.tasks || [],
                    createdAt: s.created_at
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
        if (s.status === 'In Progress' || s.status === 'Delayed') {
          tasksPending += s.activeTasks;
          tasksOverdue += s.overdueTasks;
        }
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

  const chartWidth = useMemo(() => {
    return maxSprintsCount > 6 ? 800 + (maxSprintsCount - 6) * 128 : 800;
  }, [maxSprintsCount]);

  const getY = (tasks) => {
    const ratio = tasks / maxTasks;
    return 380 - ratio * (380 - 40);
  };

  const getX = (index) => {
    const divisor = maxSprintsCount > 1 ? maxSprintsCount - 1 : 1;
    const availableWidth = chartWidth - 160;
    return 90 + (index / divisor) * availableWidth;
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
      xPercent: (x / chartWidth) * 100,
      yPercent: (y / 450) * 100
    });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle backend search debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeamPerformance(0, searchQuery, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchTeamPerformance]);

  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreTeam && !loadingMoreTeam) {
        fetchTeamPerformance(teamMembers.length, searchQuery, false);
      }
    }
  };

  const filteredMembers = teamMembers;

  const sprintBoxesData = useMemo(() => {
    const list = [];
    Object.entries(projectsData).forEach(([projName, sprints]) => {
      sprints.forEach((sprint) => {
        if (
          (sprint.status === 'In Progress' || sprint.status === 'Delayed') &&
          sprint.activeTasks > 0
        ) {
          list.push({
            project: projName,
            sprint: sprint,
            sprintsHistory: sprints.filter(s => s.status !== 'Not Planned')
          });
        }
      });
    });

    // Group active sprints by project
    const groups = {};
    list.forEach(item => {
      const proj = item.project;
      if (!groups[proj]) {
        groups[proj] = [];
      }
      groups[proj].push(item);
    });

    // Sort sprints within each project group descending by createdAt
    Object.values(groups).forEach(projItems => {
      projItems.sort((a, b) => {
        const dateA = a.sprint.createdAt ? new Date(a.sprint.createdAt).getTime() : 0;
        const dateB = b.sprint.createdAt ? new Date(b.sprint.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    });

    // Separate into latest sprint per project and remaining (other) sprints
    const latestSprintsPerProject = [];
    const otherSprints = [];
    Object.entries(groups).forEach(([_, projItems]) => {
      if (projItems.length > 0) {
        latestSprintsPerProject.push(projItems[0]);
        otherSprints.push(...projItems.slice(1));
      }
    });

    // Sort the latest-sprints list descending by createdAt
    latestSprintsPerProject.sort((a, b) => {
      const dateA = a.sprint.createdAt ? new Date(a.sprint.createdAt).getTime() : 0;
      const dateB = b.sprint.createdAt ? new Date(b.sprint.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Sort the other-sprints list descending by createdAt
    otherSprints.sort((a, b) => {
      const dateA = a.sprint.createdAt ? new Date(a.sprint.createdAt).getTime() : 0;
      const dateB = b.sprint.createdAt ? new Date(b.sprint.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Return the combined array
    return [...latestSprintsPerProject, ...otherSprints];
  }, [projectsData]);

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const tasksEndingToday = useMemo(() => {
    const todayStr = getLocalDateString(0);
    const list = [];
    Object.entries(projectsData).forEach(([projectName, sprints]) => {
      sprints.forEach(sprint => {
        if (sprint.rawTasks) {
          sprint.rawTasks.forEach(task => {
            const isCompleted = task.status === 'CLOSED' || task.status === 'RESOLVED';
            const endStr = task.planned_end_date ? task.planned_end_date.substring(0, 10) : '';
            if (!isCompleted && endStr === todayStr) {
              list.push({
                ...task,
                projectName,
                sprintName: sprint.name
              });
            }
          });
        }
      });
    });
    return list;
  }, [projectsData]);

  const tasksEndingTomorrow = useMemo(() => {
    const tomorrowStr = getLocalDateString(1);
    const list = [];
    Object.entries(projectsData).forEach(([projectName, sprints]) => {
      sprints.forEach(sprint => {
        if (sprint.rawTasks) {
          sprint.rawTasks.forEach(task => {
            const isCompleted = task.status === 'CLOSED' || task.status === 'RESOLVED';
            const endStr = task.planned_end_date ? task.planned_end_date.substring(0, 10) : '';
            if (!isCompleted && endStr === tomorrowStr) {
              list.push({
                ...task,
                projectName,
                sprintName: sprint.name
              });
            }
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
      const divisor = sprintsHistory.length > 1 ? sprintsHistory.length - 1 : 1;
      const x = sprintsHistory.length > 1
        ? padding + (idx / divisor) * (width - 2 * padding)
        : width / 2;
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
      const divisor = sprintsHistory.length > 1 ? sprintsHistory.length - 1 : 1;
      const x = sprintsHistory.length > 1
        ? padding + (idx / divisor) * (width - 2 * padding)
        : width / 2;
      const y = height - padding - (s.completedTasks / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    });
    const firstX = sprintsHistory.length > 1 ? padding : width / 2;
    const lastX = sprintsHistory.length > 1 ? width - padding : width / 2;
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
        <div 
          onClick={() => navigate('/projects')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer hover:scale-[1.01] ${
            darkMode 
              ? 'bg-slate-900 border-slate-800 hover:border-slate-700' 
              : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Active Projects</span>
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

        {/* Card 2: Tasks End Today */}
        <div 
          onClick={() => navigate('/status')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer hover:scale-[1.01] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Due Today</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Calendar className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">{tasksEndingToday.length}</span>
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

        {/* Card 3: Tasks End Tomorrow */}
        <div 
          onClick={() => navigate('/status')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer hover:scale-[1.01] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Due Tomorrow</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">{tasksEndingTomorrow.length}</span>
            {/* Thick block visual */}
            <div className="flex items-end gap-1.5 h-8 pb-1">
              <div className="w-3 h-7 bg-blue-500 rounded-sm" />
              <div className="w-3 h-5 bg-slate-200 dark:bg-slate-700 rounded-sm" />
              <div className="w-16 h-[2px] bg-slate-100 dark:bg-slate-800 self-center rounded" />
            </div>
          </div>
        </div>

        {/* Card 4: Tasks Overdue */}
        <div 
          onClick={() => navigate('/status')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer hover:scale-[1.01] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Tasks Overdue</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
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
              const CardTag = sprint.workspaceUrl ? 'a' : 'div';
              const cardProps = sprint.workspaceUrl ? {
                href: sprint.workspaceUrl,
                target: '_blank',
                rel: 'noopener noreferrer'
              } : {};
              return (
                <CardTag 
                  key={`${item.project}-${sprint.name}`}
                  {...cardProps}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                    sprint.workspaceUrl ? 'hover:scale-[1.01] hover:border-blue-500/50 cursor-pointer block' : ''
                  } ${
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
                </CardTag>
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
        <div className="relative w-full h-[450px] overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div style={{ width: `${chartWidth}px`, height: '100%' }} className="relative">
            {longestSprintsProject.length > 0 ? (
              <svg 
                style={{ width: `${chartWidth}px`, height: '100%' }}
                viewBox={`0 0 ${chartWidth} 450`} 
                className="overflow-visible"
              >
                {/* Y-Axis Horizontal Grid Lines and Labels */}
                {yTicks.map((tick, i) => (
                  <g key={i} className="text-[10px] font-bold fill-slate-400 select-none">
                    <line
                      x1="80"
                      y1={tick.y}
                      x2={chartWidth - 50}
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
          </div>
        </div>

        {/* Table Container with Infinite Scroll */}
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar" onScroll={handleTableScroll}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold text-left">
                <th className="py-4 px-4 font-semibold text-slate-400">Rank</th>
                <th className="py-4 px-4 font-semibold text-slate-400">ID</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Name</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Role</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Total Tasks</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Completed</th>
                <th className="py-4 px-4 font-semibold text-slate-400">On-Time Rate</th>
                <th className="py-4 px-4 font-semibold text-slate-400">Points</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-left">
              {filteredMembers.map((member, idx) => (
                <tr 
                  key={member.raw_id || member.id} 
                  className="text-sm font-medium transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Rank */}
                  <td className="py-4 px-4 text-left">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold ${
                      member.rank === 1 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                      member.rank === 2 ? 'bg-slate-300/30 text-slate-700 dark:text-slate-300 border border-slate-400/30' :
                      member.rank === 3 ? 'bg-amber-700/15 text-amber-700 dark:text-amber-500 border border-amber-700/30' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      #{member.rank}
                    </span>
                  </td>

                  {/* ID */}
                  <td className={`py-4 px-4 font-semibold text-left ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{member.id}</td>
                  
                  {/* Name + Avatar */}
                  <td className="py-4 px-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${getAvatarColorClass(idx)}`}>
                        {getInitials(member.name)}
                      </div>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{member.name}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-4 px-4 text-left">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{member.role}</span>
                  </td>

                  {/* Total Tasks */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.total_tasks} Tasks</td>

                  {/* Completed */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.completed_tasks} Tasks</td>

                  {/* On-Time Rate */}
                  <td className={`py-4 px-4 text-left ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{member.on_time_rate}</td>

                  {/* Points Badge */}
                  <td className="py-4 px-4 text-left">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      member.points > 0 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                        : member.points < 0 
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {member.points > 0 ? `+${member.points} pts` : `${member.points} pts`}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && !loadingMoreTeam && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No team members match search query
                  </td>
                </tr>
              )}

              {loadingMoreTeam && (
                <tr>
                  <td colSpan="9" className="py-4 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>Loading team members...</span>
                    </div>
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
