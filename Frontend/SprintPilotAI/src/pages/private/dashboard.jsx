import React, { useState, useMemo } from 'react';
import { useTheme } from '../../components/layout/MainLayouut';
import {
  ArrowUpRight,
  ChevronDown,
  MoreHorizontal,
  SlidersHorizontal,
  Search
} from 'lucide-react';

const Dashboard = () => {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [timeframe, setTimeframe] = useState('This Week');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

  // Sample Team Members Data
  const teamMembers = [
    {
      id: 'E001',
      name: 'Sifat Hasan',
      role: 'UI/UX Designer',
      roleColor: 'bg-emerald-500',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      totalTasks: 14,
      completed: 10,
      onProgress: 10,
      overdue: 1,
      status: 'Available',
      statusType: 'available'
    },
    {
      id: 'E002',
      name: 'Onim Khan',
      role: 'Frontend Developer',
      roleColor: 'bg-rose-500',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      totalTasks: 5,
      completed: 3,
      onProgress: 3,
      overdue: 2,
      status: 'On Leave',
      statusType: 'on-leave'
    },
    {
      id: 'E004',
      name: 'Binoy Kumar',
      role: 'Brand Designer',
      roleColor: 'bg-indigo-500',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      totalTasks: 10,
      completed: 8,
      onProgress: 8,
      overdue: 1,
      status: 'Available',
      statusType: 'available'
    }
  ];

  // Filtering team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleSelectMember = (id) => {
    const next = new Set(selectedMembers);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMembers(next);
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === teamMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(teamMembers.map(m => m.id)));
    }
  };

  return (
    <main className="p-8 lg:p-10 space-y-8 max-w-[1400px] mx-auto">
      {/* WELCOME BANNER */}
      <section className="text-left">
        <span className="text-sm font-medium text-slate-400">Ready to conquer your projects?</span>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
          Welcome Back, <span className={darkMode ? 'text-white' : 'text-slate-900'}>Sifat Hasan.</span> 👋
        </h1>
      </section>

      {/* METRICS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Total Project */}
        <div className={`p-6 rounded-3xl border transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Project</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">150</span>
            {/* Sparkline column visual */}
            <div className="flex items-end gap-0.5 h-8 pb-1">
              {[4, 6, 3, 7, 5, 8, 4, 9, 6, 8, 5, 7, 3, 5, 4, 6].map((h, i) => (
                <div key={i} style={{ height: `${h * 10}%` }} className="w-[3px] bg-slate-300 dark:bg-slate-700 rounded-t" />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div className={`p-6 rounded-3xl border transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Tasks</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">100</span>
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
        <div className={`p-6 rounded-3xl border transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Tasks Pending</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">50</span>
            {/* Thick block visual */}
            <div className="flex items-end gap-1.5 h-8 pb-1">
              <div className="w-3 h-7 bg-orange-500 rounded-sm" />
              <div className="w-3 h-5 bg-slate-200 dark:bg-slate-700 rounded-sm" />
              <div className="w-16 h-[2px] bg-slate-100 dark:bg-slate-800 self-center rounded" />
            </div>
          </div>
        </div>

        {/* Card 4: Project Overdue */}
        <div className={`p-6 rounded-3xl border transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Project Overdue</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-extrabold tracking-tight">20</span>
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

      {/* CHARTS SECTION - Responsive Line Graph */}
      <section className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="text-left">
            <h3 className="font-bold text-lg">Sprint Progress & Performance</h3>
            <span className="text-xs text-slate-400">Track tasks, efficiency, and velocity across current sprints</span>
          </div>

          {/* Legend and dropdown */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold text-slate-500">Tasks Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-xs font-semibold text-slate-500">Active Tasks</span>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                }`}
              >
                <span>Active Sprints</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {showTimeframeDropdown && (
                <div className={`absolute right-0 mt-2 w-40 rounded-xl shadow-lg border py-1.5 z-10 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-100 text-slate-700'
                }`}>
                  {['Sprint 1-6', 'All Sprints'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setShowTimeframeDropdown(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SVG Line Chart Wrapper */}
        <div className="relative w-full h-80 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <defs>
              {/* Completed Tasks Gradient */}
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.00" />
              </linearGradient>
              {/* Active Tasks Gradient */}
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <g className="stroke-slate-100 dark:stroke-slate-800/60" strokeWidth="1" strokeDasharray="4 4">
              <line x1="50" y1="50" x2="750" y2="50" />
              <line x1="50" y1="100" x2="750" y2="100" />
              <line x1="50" y1="150" x2="750" y2="150" />
              <line x1="50" y1="200" x2="750" y2="200" />
              <line x1="50" y1="250" x2="750" y2="250" />
            </g>

            {/* Vertical grid lines mapping to sprints */}
            <g className="stroke-slate-100 dark:stroke-slate-800/40" strokeWidth="1">
              <line x1="50" y1="50" x2="50" y2="250" />
              <line x1="190" y1="50" x2="190" y2="250" />
              <line x1="330" y1="50" x2="330" y2="250" />
              <line x1="470" y1="50" x2="470" y2="250" />
              <line x1="610" y1="50" x2="610" y2="250" />
              <line x1="750" y1="50" x2="750" y2="250" />
            </g>

            {/* Area Gradients */}
            <path d="M 50 220 Q 120 180 190 170 Q 260 160 330 190 Q 400 220 470 110 Q 540 50 610 80 Q 680 110 750 30 L 750 250 L 50 250 Z" fill="url(#completedGrad)" />
            <path d="M 50 110 Q 120 120 190 130 Q 260 140 330 100 Q 400 60 470 150 Q 540 220 610 110 Q 680 50 750 140 L 750 250 L 50 250 Z" fill="url(#activeGrad)" />

            {/* Completed Tasks Line (Orange) */}
            <path
              d="M 50 220 Q 120 180 190 170 Q 260 160 330 190 Q 400 220 470 110 Q 540 50 610 80 Q 680 110 750 30"
              fill="none"
              stroke="#f97316"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Active Tasks Line (Indigo) */}
            <path
              d="M 50 110 Q 120 120 190 130 Q 260 140 330 100 Q 400 60 470 150 Q 540 220 610 110 Q 680 50 750 140"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Interactive Nodes / Circles */}
            {/* Completed Task Dots */}
            <g className="fill-orange-500 stroke-white dark:stroke-slate-900" strokeWidth="2.5">
              <circle cx="50" cy="220" r="5.5" />
              <circle cx="190" cy="170" r="5.5" />
              <circle cx="330" cy="190" r="5.5" />
              <circle cx="470" cy="110" r="5.5" />
              <circle cx="610" cy="80" r="5.5" />
              <circle cx="750" cy="30" r="5.5" />
            </g>

            {/* Active Task Dots */}
            <g className="fill-indigo-500 stroke-white dark:stroke-slate-900" strokeWidth="2.5">
              <circle cx="50" cy="110" r="5" />
              <circle cx="190" cy="130" r="5" />
              <circle cx="330" cy="100" r="5" />
              <circle cx="470" cy="150" r="5" />
              <circle cx="610" cy="110" r="5" />
              <circle cx="750" cy="140" r="5" />
            </g>
          </svg>
        </div>

        {/* X-Axis labels below the SVG */}
        <div className="flex justify-between text-xs font-semibold text-slate-400 px-6 sm:px-12 mt-2">
          <span>Sprint 1</span>
          <span>Sprint 2</span>
          <span>Sprint 3</span>
          <span>Sprint 4</span>
          <span>Sprint 5</span>
          <span>Sprint 6</span>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
