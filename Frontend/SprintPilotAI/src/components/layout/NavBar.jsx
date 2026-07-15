import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './MainLayouut';
import { useAuth } from '../../context/AuthContext';
import { HelpCircle, Bell, Menu, LogOut } from 'lucide-react';

export default function NavBar() {
  const { darkMode, setSidebarOpen } = useTheme();
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

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
        
        {/* Profile badge with dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800 cursor-pointer text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-base ring-2 ring-orange-500/10 select-none">
              AS
            </div>
            <div className="hidden md:block">
              <span className={`block font-semibold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ashwin Sanalkumar</span>
              <span className="block text-[11px] text-slate-400">Project Manager</span>
            </div>
          </button>

          {isDropdownOpen && (
            <>
              {/* Overlay background to close dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2 shadow-xl z-50 transition-all ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-700'
              }`}>
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
                    darkMode ? 'hover:bg-slate-800/80 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
