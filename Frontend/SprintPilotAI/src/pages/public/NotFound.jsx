import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../components/layout/MainLayouut';
import { Home, HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const { darkMode } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-12">
      {/* Giant 404 background text with blur/gradient */}
      <div className="relative mb-6">
        <h1 className="text-[120px] font-extrabold tracking-widest leading-none select-none text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 animate-pulse">
          404
        </h1>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main text message */}
      <h2 className="text-2xl font-bold mb-3 tracking-tight">
        Oops! Page not found
      </h2>
      <p className="text-slate-400 dark:text-slate-500 max-w-md text-sm leading-relaxed mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let's get you back on track!
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 hover:brightness-105 active:scale-98 transition-all rounded-xl text-sm font-semibold text-white shadow-md shadow-orange-500/10 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <Link
          to="/support"
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
            darkMode 
              ? 'border-slate-800 text-slate-300 hover:bg-slate-900/60' 
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help Center</span>
        </Link>
      </div>

      {/* Back button link */}
      <Link 
        to={-1} 
        className="mt-8 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Go Back</span>
      </Link>
    </div>
  );
}
