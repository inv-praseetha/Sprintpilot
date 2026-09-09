import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const styles = {
  success: 'bg-emerald-50/95 border-emerald-100 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-900 dark:text-emerald-50',
  error: 'bg-rose-50/95 border-rose-100 text-rose-950 dark:bg-rose-950/90 dark:border-rose-900 dark:text-rose-50',
  warning: 'bg-amber-50/95 border-amber-100 text-amber-950 dark:bg-amber-950/90 dark:border-amber-900 dark:text-amber-50',
  info: 'bg-blue-50/95 border-blue-100 text-blue-950 dark:bg-blue-950/90 dark:border-blue-900 dark:text-blue-50',
};

const progressColors = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`relative flex items-center gap-3 p-4 pr-10 border rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 pointer-events-auto transform translate-y-0 animate-slide-in ${styles[type]}`}
      role="alert"
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      
      <div className="flex-grow text-sm font-medium leading-relaxed break-words">
        {message}
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-3 p-0.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar timer animation */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200/20 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${progressColors[type]}`}
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
}
