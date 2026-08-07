import React, { useEffect, useRef } from 'react';
import { useTheme } from '../layout/MainLayouut';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const icons = {
  warning: <AlertTriangle className="w-8 h-8 text-amber-500" />,
  danger: <AlertCircle className="w-8 h-8 text-rose-500" />,
  info: <Info className="w-8 h-8 text-blue-500" />,
};

const buttonColors = {
  warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
  info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
};

export default function ConfirmModal({
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();
  const darkMode = theme ? theme.darkMode : false;
  const confirmButtonRef = useRef(null);

  // Focus the confirm button on mount for keyboard accessibility
  useEffect(() => {
    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, []);

  // Listen to keyboard ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-2xl transition-all animate-scale-up ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            {icons[type]}
          </div>

          <div className="flex-grow">
            <h3
              id="confirm-modal-title"
              className="text-lg font-bold leading-6 tracking-tight mb-2"
            >
              {title}
            </h3>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              darkMode
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${buttonColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
