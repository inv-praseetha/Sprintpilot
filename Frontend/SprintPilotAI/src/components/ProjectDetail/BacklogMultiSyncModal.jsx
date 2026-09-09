import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function BacklogMultiSyncModal({
  isOpen,
  darkMode,
  affectedSprints, // Object mapping sprintId to array of taskIds
  onComplete
}) {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, complete, error
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && syncStatus === 'idle') {
      startSync();
    }
  }, [isOpen, syncStatus]);

  const startSync = async () => {
    setSyncStatus('syncing');
    setProgress(0);
    setLogs([]);
    setErrorMsg('');

    const sprintIds = Object.keys(affectedSprints);
    const totalSprints = sprintIds.length;

    if (totalSprints === 0) {
      setSyncStatus('complete');
      setProgress(100);
      setLogs(['No sprints required syncing.']);
      return;
    }

    let successCount = 0;
    
    for (let i = 0; i < totalSprints; i++) {
      const sprintId = sprintIds[i];
      const taskIds = affectedSprints[sprintId];
      
      try {
        setLogs(prev => [...prev, `Syncing ${taskIds.length} reassigned task(s) in sprint...`]);
        
        await apiClient.post(`sprints/${sprintId}/sync-backlog/`, { task_ids: taskIds });
        
        setLogs(prev => [...prev, `✓ Sprint synced successfully.`]);
        successCount++;
      } catch (err) {
        console.error('Error syncing sprint:', sprintId, err);
        setLogs(prev => [...prev, `❌ Failed to sync sprint: ${err.response?.data?.detail || err.message}`]);
      }
      
      setProgress(Math.round(((i + 1) / totalSprints) * 100));
    }

    if (successCount === totalSprints) {
      setSyncStatus('complete');
      setLogs(prev => [...prev, 'All tasks successfully synced to Backlog!']);
    } else {
      setSyncStatus('error');
      setErrorMsg(`Failed to sync ${totalSprints - successCount} out of ${totalSprints} sprint(s). Please check the logs.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              syncStatus === 'syncing' ? 'bg-blue-500/10 text-blue-500' :
              syncStatus === 'complete' ? 'bg-emerald-500/10 text-emerald-500' :
              syncStatus === 'error' ? 'bg-rose-500/10 text-rose-500' :
              'bg-slate-500/10 text-slate-500'
            }`}>
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : syncStatus === 'complete' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Backlog Sync Progress
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Synchronizing reassigned tasks...
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Overall Progress</span>
              <span className="text-blue-500">{progress}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div 
                className={`h-full transition-all duration-300 ${
                  syncStatus === 'error' ? 'bg-rose-500' : 
                  syncStatus === 'complete' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Logs Terminal */}
          <div className={`p-4 rounded-xl font-mono text-[10px] space-y-1.5 h-32 overflow-y-auto ${
            darkMode ? 'bg-slate-950 text-slate-400 border border-slate-800' : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {logs.map((log, i) => (
              <div key={i} className={`${log.includes('❌') ? 'text-rose-500' : log.includes('✓') ? 'text-emerald-500' : ''}`}>
                {log}
              </div>
            ))}
            {syncStatus === 'syncing' && (
              <div className="flex items-center gap-2 text-blue-500 opacity-75 animate-pulse">
                <span>Processing</span>
                <span className="flex gap-0.5">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
          <button
            onClick={onComplete}
            disabled={syncStatus === 'syncing'}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            {syncStatus === 'complete' || syncStatus === 'error' ? 'Close & Continue' : 'Please Wait...'}
          </button>
        </div>
      </div>
    </div>
  );
}
