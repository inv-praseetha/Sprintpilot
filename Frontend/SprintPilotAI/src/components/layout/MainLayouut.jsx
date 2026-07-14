import React, { createContext, useContext, useState } from 'react';
import SideBar from './SideBar';
import NavBar from './NavBar';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export default function MainLayouut({ children }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, activeTab, setActiveTab, sidebarOpen, setSidebarOpen }}>
      <div className={`h-screen w-screen flex font-sans overflow-hidden transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <SideBar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <NavBar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>    
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
