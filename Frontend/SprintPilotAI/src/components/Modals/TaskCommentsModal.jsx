import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function TaskCommentsModal({ isOpen, onClose, darkMode, task }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const toast = useToast();
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && task && task.backlog_task_id) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment('');
      setError(null);
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`issues/${task.backlog_task_id}/comments/`);
      if (res.data && res.data.comments) {
        setComments(res.data.comments);
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
      setError('Failed to load comments from Backlog.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task.backlog_task_id) return;

    setIsPosting(true);
    try {
      const res = await apiClient.post(`issues/${task.backlog_task_id}/comments/`, {
        content: newComment.trim()
      });
      if (res.data && res.data.comment) {
        setComments(prev => [...prev, res.data.comment]);
        setNewComment('');
        toast.success("Comment posted successfully");
      }
    } catch (err) {
      console.error('Failed to post comment', err);
      toast.error(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div 
        className={`w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden transform transition-all ${
          darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
        }`}
      >
        {/* Left Pane: Task Details (Context for busy users) */}
        <div className={`w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r ${
          darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-extrabold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Task Details
              </h3>
              {/* Close button for mobile (hidden on desktop) */}
              <button
                onClick={onClose}
                className={`md:hidden p-2 rounded-xl transition-colors ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-orange-500' : 'text-orange-600'}`}>
                  {task.backlog_task_id || 'Task Title'}
                </p>
                <h4 className={`text-base font-bold leading-snug ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {task.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-100'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                  <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {task.status?.name || task.status || 'Open'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-100'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</p>
                  <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {task.category || 'N/A'}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl space-y-4 ${darkMode ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-100'}`}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assignee</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                      {task.assigned_employee?.full_name?.charAt(0) || '?'}
                    </div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {task.assigned_employee?.full_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Date</p>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {task.planned_start_date || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Date</p>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {task.planned_end_date || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Activity Feed Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 dark:bg-slate-900">
          {/* Feed Header */}
          <div className={`p-6 flex justify-between items-center border-b flex-shrink-0 ${
            darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
          }`}>
            <div>
              <h3 className={`font-extrabold text-xl tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Activity & Comments
              </h3>
              <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {comments.length} Update{comments.length !== 1 ? 's' : ''} on this task
              </p>
            </div>
            <button
              onClick={onClose}
              className={`hidden md:flex p-2.5 rounded-xl transition-colors ${
                darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feed Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading activity feed...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle className="w-10 h-10 text-rose-500/50" />
                <p className="text-xs font-bold text-rose-500">{error}</p>
                <button 
                  onClick={fetchComments}
                  className={`mt-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Retry
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <MessageSquare className="w-12 h-12" />
                <p className="text-sm font-bold">No updates yet</p>
              </div>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-8 ml-3">
                {comments.map((comment, index) => {
                  if (!comment.content) return null;
                  
                  const commentCreatorName = comment.createdUser?.name || 'Unknown User';
                  const commentCreatorEmail = comment.createdUser?.mailAddress || '';
                  
                  const isCurrentUser = user && (
                    commentCreatorEmail.toLowerCase() === user.email?.toLowerCase() ||
                    commentCreatorName.toLowerCase() === user.full_name?.toLowerCase()
                  );
                  
                  // Format date cleanly for a PM
                  const dateObj = new Date(comment.created);
                  const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateString = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  const initial = commentCreatorName.charAt(0).toUpperCase();
                  
                  return (
                    <div 
                      key={comment.id} 
                      className="relative animate-fadeIn"
                      style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline dot/avatar */}
                      <div className={`absolute -left-[35px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 ring-2 ring-transparent ${
                        isCurrentUser 
                          ? 'bg-orange-500 text-white border-white dark:border-slate-900' 
                          : darkMode ? 'bg-slate-700 text-slate-300 border-slate-900' : 'bg-slate-200 text-slate-700 border-white'
                      }`}>
                        {initial}
                      </div>

                      {/* Content Card */}
                      <div className={`ml-2 rounded-2xl p-4 shadow-sm border ${
                        darkMode 
                          ? 'bg-slate-800/50 border-slate-700/50' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {isCurrentUser ? 'You' : commentCreatorName}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500">
                                Author
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] font-bold tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {dateString} at {timeString}
                          </div>
                        </div>
                        
                        <div className={`text-sm font-medium whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t flex-shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <form onSubmit={handlePostComment} className="flex gap-2 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className={`flex-1 rounded-2xl p-4 pr-14 text-sm font-medium resize-none outline-none transition-all ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:bg-white'
                } border shadow-inner`}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isPosting || !newComment.trim()}
                className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${
                  !newComment.trim()
                    ? darkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-95'
                }`}
              >
                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <div className="text-[10px] font-bold text-center mt-2 text-slate-400">
              Press <kbd className={`px-1 py-0.5 rounded ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>Enter</kbd> to send, <kbd className={`px-1 py-0.5 rounded ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>Shift + Enter</kbd> for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
