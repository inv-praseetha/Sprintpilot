import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen bg-blue-600 dark:bg-blue-950 flex flex-col items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 dark:opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-700 rounded-full blur-3xl opacity-50 dark:opacity-20"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        {status === 'processing' && (
          <>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-white">Connecting Jira</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Success!</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(244,63,94,0.3)]">
              <AlertCircle className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Connection Failed</h2>
          </>
        )}

        <p className="text-sm font-semibold text-blue-100 dark:text-blue-200">
          {message}
        </p>

        {status === 'error' && (
          <button
            onClick={() => {
              const redirectUrl = sessionStorage.getItem('jira_redirect_back_url') || '/dashboard';
              sessionStorage.removeItem('jira_redirect_back_url');
              navigate(redirectUrl);
            }}
            className="w-full py-3.5 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black transition-all shadow-xl"
          >
            Return to App
          </button>
        )}
      </div>
    </div>
  );
}
