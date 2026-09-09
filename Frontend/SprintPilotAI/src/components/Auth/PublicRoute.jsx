import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * PublicRoute prevents authenticated users from accessing public-only routes (like Login).
 * Redirects authenticated users to "/dashboard".
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3 text-slate-550 dark:text-slate-400">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-sm font-bold tracking-wide">Verifying authorization...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
