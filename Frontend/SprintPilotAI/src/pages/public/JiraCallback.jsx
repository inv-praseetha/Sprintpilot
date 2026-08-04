import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2, Activity, LayoutTemplate } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function JiraCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Connecting to Jira...');
  const hasProcessed = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setStatus('error');
      setMessage('No authorization code found. Please try connecting Jira again.');
      return;
    }

    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const exchangeToken = async () => {
      try {
        await apiClient.post('jira/token/', { code });
        setStatus('success');
        setMessage('Jira connected successfully! You can now import Jira tasks.');
        setTimeout(() => {
          const redirectUrl = sessionStorage.getItem('jira_redirect_back_url') || '/dashboard';
          sessionStorage.removeItem('jira_redirect_back_url');
          navigate(redirectUrl);
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Failed to authenticate with Jira.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <style>{`
        @keyframes slideFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-slide-flow {
          animation: slideFlow 1.5s linear infinite;
        }
      `}</style>

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-blue-500/5 text-center z-10">
        
        {status === 'processing' && (
          <div className="space-y-6">
            {/* Animated Connection Graphic */}
            <div className="flex items-center justify-center w-full mb-8 relative px-2">
              {/* SprintPilot Side */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-[2px] shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)] shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Activity className="w-7 h-7 text-orange-500" />
                </div>
                {/* Ping effect */}
                <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/30 animate-ping" style={{ animationDuration: '3s' }}></div>
              </div>

              {/* Connection Line */}
              <div className="relative flex-1 h-[2px] mx-3">
                <div className="absolute inset-0 border-t-[3px] border-dotted border-slate-300 dark:border-slate-700"></div>
                <div className="absolute inset-0 overflow-hidden">
                  <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80 animate-slide-flow"></div>
                </div>
              </div>

              {/* Jira Side */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 p-[2px] shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)] shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <LayoutTemplate className="w-7 h-7 text-blue-500" />
                </div>
                {/* Ping effect */}
                <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }}></div>
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Connecting to Jira</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Please wait while we establish a secure connection...
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Connection Successful</h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-4 rounded-xl">
              {message}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(244,63,94,0.2)]">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Connection Failed</h2>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/5 p-4 rounded-xl">
              {message}
            </p>
            <button
              onClick={() => {
                const redirectUrl = sessionStorage.getItem('jira_redirect_back_url') || '/dashboard';
                sessionStorage.removeItem('jira_redirect_back_url');
                navigate(redirectUrl);
              }}
              className="w-full py-3.5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 rounded-xl font-black transition-all shadow-lg"
            >
              Return to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
