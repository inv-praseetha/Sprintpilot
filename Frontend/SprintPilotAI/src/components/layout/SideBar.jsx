import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from './MainLayouut';
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  Settings,
  Moon,
  ChevronDown,
  X
} from 'lucide-react';

function SidebarLink({ to, icon, label }) {
  const { darkMode, setSidebarOpen } = useTheme();
  const location = useLocation();
  const isActive = location.pathname === to;

  const renderIcon = () => {
    if (typeof icon === 'string') {
      const cleanIcon = icon.trim();
      const iconClass = cleanIcon.startsWith('fa-') ? `fa-solid ${cleanIcon}` : icon;
      return (
        <i className={`${iconClass} w-5 h-5 flex items-center justify-center text-lg transition-colors ${
          isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600'
        }`} />
      );
    }
    const IconComponent = icon;
    return (
      <IconComponent className={`w-5 h-5 transition-colors ${
        isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600'
      }`} />
    );
  };

  return (
    <Link
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
        isActive
          ? 'bg-orange-500/[0.08] text-orange-600'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-orange-500 rounded-r-md" />
      )}
      <div className="flex items-center gap-3">
        {renderIcon()}
        <span>{label}</span>
      </div>
    </Link>
  );
}

export default function SideBar() {
  const { darkMode, setDarkMode, sidebarOpen, setSidebarOpen } = useTheme();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { name: 'Projects', icon: FolderKanban, to: '/projects' },
    { name: 'Sprints', icon: Bot, to: '/sprints' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 w-72 flex flex-col justify-between border-r shrink-0 p-6 z-50 transition-transform duration-300 transform 
        lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight tracking-tight">Sprint Pilot AI</h2>
                <span className="text-xs text-slate-400">hello@sprintpilotai.com</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Main Menu */}
          <div className="mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3 px-2">Main Menu</span>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <SidebarLink
                  key={item.name}
                  to={item.to}
                  icon={item.icon}
                  label={item.name}
                />
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Settings */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 transition-all cursor-pointer">
              <Settings className="w-5 h-5 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-400">Dark Mode</span>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-colors cursor-pointer ${darkMode ? 'bg-orange-500' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
