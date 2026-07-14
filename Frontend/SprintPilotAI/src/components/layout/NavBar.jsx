import React from 'react';
import { useTheme } from './MainLayouut';
import { Search, HelpCircle, Bell, Menu } from 'lucide-react';

export default function NavBar() {
  const { darkMode, setSidebarOpen } = useTheme();

  return (
    <header className="flex items-center justify-between p-6 pb-0 lg:p-10 lg:pb-0 gap-4">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
            darkMode ? 'border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800' : 'border-slate-100 text-slate-500 bg-white hover:bg-slate-50'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Main search bar */}
      </div>

      {/* User profile and notification controls */}
      <div className="flex items-center gap-2 sm:gap-5">
        <button className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center border transition-colors cursor-pointer ${
          darkMode ? 'border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800' : 'border-slate-100 text-slate-500 bg-white hover:bg-slate-50'
        }`}>
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors relative cursor-pointer ${
          darkMode ? 'border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800' : 'border-slate-100 text-slate-500 bg-white hover:bg-slate-50'
        }`}>
          <Bell className="w-5 h-5" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
        </button>
        
        {/* Profile badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-base ring-2 ring-orange-500/10 select-none">
            AS
          </div>
          <div className="hidden md:block text-left">
            <span className="block font-semibold text-sm leading-tight">Ashwin Sanalkumar</span>
            <span className="block text-[11px] text-slate-400">Project Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}
