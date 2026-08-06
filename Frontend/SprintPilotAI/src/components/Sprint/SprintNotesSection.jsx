import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
  FileText, 
  Loader2, 
  Paperclip, 
  Download, 
  Trash2, 
  History, 
  ClipboardList 
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet'
];

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

export default function SprintNotesSection({
  sprintId,
  notes,
  setNotes,
  todayNote,
  setTodayNote,
  selectedNoteDate,
  setSelectedNoteDate,
  isSavingNote,
  setIsSavingNote,
  lastSavedNoteTime,
  setLastSavedNoteTime,
  pdfPreviewToggle,
  setPdfPreviewToggle,
  notesOffset,
  setNotesOffset,
  hasMoreNotes,
  setHasMoreNotes,
  loadingMoreNotes,
  setLoadingMoreNotes,
  lastSavedContentRef,
  darkMode,
  pageLoading
}) {
  const historyListRef = useRef(null);

  const getAttachmentUrl = (path) => {
    if (!path) return '';
    let finalPath = path;
    if (finalPath.startsWith('http://') || finalPath.startsWith('https://')) {
      return finalPath.replace('://localhost:', '://127.0.0.1:');
    }
    const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/';
    let host = baseUrl.replace(/\/api\/?$/, '');
    host = host.replace('://localhost:', '://127.0.0.1:');
    return `${host}${finalPath}`;
  };

  const handleAttachmentChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    const formData = new FormData();
    formData.append('date', selectedNoteDate);
    formData.append('attachment', file);
    if (todayNote !== undefined && todayNote !== null) {
      formData.append('content', todayNote);
    }

    setIsSavingNote(true);
    try {
      const savedNote = await SprintServices.saveSprintNote(sprintId, formData);
      setNotes(prev => {
        const index = prev.findIndex(n => n.date === selectedNoteDate);
        if (index !== -1) {
          const next = [...prev];
          next[index] = savedNote;
          return next;
        } else {
          return [savedNote, ...prev];
        }
      });
      setLastSavedNoteTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[SprintNotesSection] Error uploading attachment:', err);
      alert('Failed to upload PDF attachment. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!window.confirm('Are you sure you want to delete this PDF attachment?')) return;

    const formData = new FormData();
    formData.append('date', selectedNoteDate);
    formData.append('delete_attachment', 'true');
    if (todayNote !== undefined && todayNote !== null) {
      formData.append('content', todayNote);
    }

    setIsSavingNote(true);
    try {
      const savedNote = await SprintServices.saveSprintNote(sprintId, formData);
      setNotes(prev => {
        const index = prev.findIndex(n => n.date === selectedNoteDate);
        if (index !== -1) {
          const next = [...prev];
          next[index] = savedNote;
          return next;
        } else {
          return [savedNote, ...prev];
        }
      });
      setLastSavedNoteTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[SprintNotesSection] Error removing attachment:', err);
      alert('Failed to remove PDF attachment. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const loadMoreNotes = async () => {
    if (loadingMoreNotes || !hasMoreNotes || !sprintId) return;
    setLoadingMoreNotes(true);
    try {
      const moreNotes = await SprintServices.getSprintNotes(sprintId, 5, notesOffset);
      if (moreNotes.length < 5) {
        setHasMoreNotes(false);
      }
      if (moreNotes.length > 0) {
        setNotes(prev => {
          const merged = [...prev];
          moreNotes.forEach(newNote => {
            if (!merged.some(existing => existing.id === newNote.id || existing.date === newNote.date)) {
              merged.push(newNote);
            }
          });
          return merged;
        });
        setNotesOffset(prev => prev + 5);
      }
    } catch (err) {
      console.error('[SprintNotesSection] Error loading more notes:', err);
    } finally {
      setLoadingMoreNotes(false);
    }
  };

  // Debounce save for today's note
  useEffect(() => {
    if (pageLoading) return;
    if (todayNote === lastSavedContentRef.current) return;

    setIsSavingNote(true);
    const timer = setTimeout(async () => {
      try {
        const savedNote = await SprintServices.saveSprintNote(sprintId, {
          date: selectedNoteDate,
          content: todayNote
        });
        lastSavedContentRef.current = todayNote;
        setLastSavedNoteTime(new Date().toLocaleTimeString());

        setNotes(prev => {
          const index = prev.findIndex(n => n.date === selectedNoteDate);
          if (index !== -1) {
            const next = [...prev];
            next[index] = savedNote;
            return next;
          } else {
            return [savedNote, ...prev];
          }
        });
      } catch (err) {
        console.error('[SprintNotesSection] Error autosaving daily note:', err);
      } finally {
        setIsSavingNote(false);
      }
    }, 2000); // 2-second debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayNote, selectedNoteDate, sprintId, pageLoading]);

  // Infinite Scroll Effect
  useEffect(() => {
    const listElement = historyListRef.current;
    if (!listElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement;
      if (scrollHeight - scrollTop - clientHeight < 15) {
        if (hasMoreNotes && !loadingMoreNotes && !pageLoading) {
          loadMoreNotes();
        }
      }
    };

    listElement.addEventListener('scroll', handleScroll);
    return () => {
      listElement.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreNotes, loadingMoreNotes, pageLoading, sprintId, notesOffset]);

  const currentNoteObj = notes.find(n => n.date === selectedNoteDate);
  const hasAttachment = !!currentNoteObj?.attachment;
  const hasTextContent = !!stripHtml(todayNote);
  const shouldShowPdfPreview = hasAttachment && (
    pdfPreviewToggle === 'preview' ||
    (pdfPreviewToggle === null && !hasTextContent)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      {/* Left Column: Selected Scratchpad */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col transition-all duration-300 text-left ${
        darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                {selectedNoteDate === new Date().toLocaleDateString('en-CA') 
                  ? "Daily Sprint MOM" 
                  : "Edit Historical Note"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Selected: {new Date(selectedNoteDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                {selectedNoteDate !== new Date().toLocaleDateString('en-CA') && (
                  <button
                    onClick={() => {
                      const todayStr = new Date().toLocaleDateString('en-CA');
                      setSelectedNoteDate(todayStr);
                      const todayNoteObj = notes.find(n => n.date === todayStr);
                      const content = todayNoteObj ? todayNoteObj.content : '';
                      setTodayNote(content);
                      lastSavedContentRef.current = content;
                      setLastSavedNoteTime(todayNoteObj ? new Date(todayNoteObj.updated_at || todayNoteObj.created_at).toLocaleTimeString() : null);
                      setPdfPreviewToggle(null);
                    }}
                    className="px-2 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Switch to Today
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Autosave status indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            {isSavingNote ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span className="text-orange-500 uppercase tracking-wider">Saving...</span>
              </>
            ) : lastSavedNoteTime ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400 font-medium">Saved at {lastSavedNoteTime}</span>
              </>
            ) : (
              <span className="text-slate-400 font-medium">Ready</span>
            )}
          </div>
        </div>

        {shouldShowPdfPreview ? (
          <div className={`rich-text-editor-container flex flex-col ${darkMode ? 'dark' : ''} border rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800`}>
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200 bg-slate-100 flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">PDF Attachment Preview</span>
              <button
                onClick={() => setPdfPreviewToggle('editor')}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none outline-none"
              >
                Edit Text Note
              </button>
            </div>
            <div className="w-full flex-grow overflow-hidden relative" style={{ height: 'calc(100% - 37px)' }}>
              <iframe
                src={`${getAttachmentUrl(currentNoteObj.attachment)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="absolute border-none"
                style={{
                  top: '-4px',
                  left: '-8px',
                  width: 'calc(100% + 32px)',
                  height: 'calc(100% + 12px)'
                }}
                scrolling="no"
                title="PDF Attachment Preview"
              />
            </div>
          </div>
        ) : (
          <div className={`rich-text-editor-container ${darkMode ? 'dark' : ''}`}>
            <ReactQuill
              theme="snow"
              value={todayNote}
              onChange={(content, delta, source) => {
                if (source === 'user') {
                  setTodayNote(content);
                }
              }}
              placeholder="Type sprint notes, blocker updates, or team call decisions here... (changes auto-save automatically)"
              modules={quillModules}
              formats={quillFormats}
            />
          </div>
        )}

        {/* Attachment Section */}
        <div className={`mt-3 flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
          darkMode 
            ? 'border-slate-800 bg-slate-950/20 text-slate-300' 
            : 'border-slate-200 bg-slate-50/50 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <Paperclip className="w-4 h-4 text-orange-500 flex-shrink-0" />
            {currentNoteObj?.attachment ? (
              <button
                onClick={() => setPdfPreviewToggle('preview')}
                className="truncate max-w-[200px] text-orange-500 hover:text-orange-600 hover:underline cursor-pointer font-bold text-left bg-transparent border-none p-0 outline-none"
                title="Click to preview PDF"
              >
                {currentNoteObj.attachment.split('/').pop()}
              </button>
            ) : (
              <span className="opacity-50">No PDF attached</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentNoteObj?.attachment && (
              <>
                <a
                  href={getAttachmentUrl(currentNoteObj.attachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
                <button
                  onClick={handleRemoveAttachment}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    darkMode 
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-rose-500' 
                      : 'border-slate-255 bg-white hover:bg-slate-50 text-rose-600'
                  }`}
                  title="Delete attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <label className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              darkMode 
                ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' 
                : 'border-slate-255 bg-white hover:bg-slate-50 text-slate-700'
            }`}>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleAttachmentChange}
                className="hidden"
              />
              {currentNoteObj?.attachment ? 'Replace' : 'Attach PDF'}
            </label>
          </div>
        </div>
      </div>

      {/* Right Column: Historical Logs Timeline */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col transition-all duration-300 text-left ${
        darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight">Chronological History</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Previous Sprint logs</p>
          </div>
        </div>

        <div 
          ref={historyListRef}
          className="flex-grow overflow-y-auto max-h-[370px] min-h-0 pr-2 custom-scrollbar space-y-4"
        >
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No logs recorded yet</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 max-w-[200px]">Notes you add will be chronologized here.</p>
            </div>
          ) : (
            <>
              {[...notes]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((note) => {
                const noteDate = new Date(note.date + 'T00:00:00');
                const formattedDateStr = noteDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const isSelected = note.date === selectedNoteDate;
                const isToday = note.date === new Date().toLocaleDateString('en-CA');

                const updatedDateTime = new Date(note.updated_at || note.created_at || new Date());
                const updatedLocalDateStr = updatedDateTime.toLocaleDateString('en-CA');
                const wasUpdatedAnotherDay = updatedLocalDateStr !== note.date;
                const updatedTimeStr = updatedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const updatedDisplay = wasUpdatedAnotherDay
                  ? `Updated: ${updatedDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${updatedTimeStr}`
                  : `Updated: ${updatedTimeStr}`;

                return (
                  <button 
                    key={note.id || note.date}
                    onClick={() => {
                      setSelectedNoteDate(note.date);
                      setTodayNote(note.content);
                      lastSavedContentRef.current = note.content;
                      setLastSavedNoteTime(updatedDateTime.toLocaleTimeString());
                      setPdfPreviewToggle(null);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer outline-none ${
                      isSelected
                        ? darkMode 
                          ? 'bg-orange-500/10 border-orange-500' 
                          : 'bg-orange-50/50 border-orange-400'
                        : darkMode 
                          ? 'bg-slate-950/20 border-slate-850/80 hover:bg-slate-950/40 hover:border-slate-700' 
                          : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {formattedDateStr}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">
                        {updatedDisplay}
                      </span>
                    </div>
                    {!note.attachment && (
                      <p className={`text-xs font-medium leading-relaxed line-clamp-4 w-full text-left ${
                        isSelected 
                          ? darkMode ? 'text-slate-100' : 'text-slate-955' 
                          : darkMode ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        {stripHtml(note.content) || <em className="opacity-60">No content entered.</em>}
                      </p>
                    )}

                    {stripHtml(note.content) && note.attachment && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <p className={`text-xs font-medium leading-relaxed line-clamp-4 w-full text-left ${
                          isSelected 
                            ? darkMode ? 'text-slate-100' : 'text-slate-955' 
                            : darkMode ? 'text-slate-300' : 'text-slate-800'
                        }`}>
                          {stripHtml(note.content)}
                        </p>
                        <div className="flex justify-between items-center w-full gap-2">
                          <span className="text-[11px] font-bold text-orange-500 flex items-center gap-1.5 truncate">
                            <Paperclip className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate" title={note.attachment.split('/').pop()}>
                              {note.attachment.split('/').pop()}
                            </span>
                          </span>
                          <a
                            href={getAttachmentUrl(note.attachment)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-1 px-1.5 rounded-lg border transition-all flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                              darkMode 
                                ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-orange-500' 
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-orange-655'
                            }`}
                            title="Download PDF attachment"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        </div>
                      </div>
                    )}

                    {!stripHtml(note.content) && note.attachment && (
                      <div className="flex justify-between items-center w-full gap-2">
                        <span className="text-xs font-bold text-orange-500 flex items-center gap-1.5 truncate">
                          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate" title={note.attachment.split('/').pop()}>
                            {note.attachment.split('/').pop()}
                          </span>
                        </span>
                        <a
                          href={getAttachmentUrl(note.attachment)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1 px-1.5 rounded-lg border transition-all flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                            darkMode 
                              ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-orange-500' 
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-orange-655'
                          }`}
                          title="Download PDF attachment"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    )}
                  </button>
                );
              })}
              {loadingMoreNotes && (
                <div className="flex justify-center items-center py-3">
                  <span className="text-[10px] font-bold text-orange-500 animate-pulse uppercase tracking-wider">
                    Loading more notes...
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
