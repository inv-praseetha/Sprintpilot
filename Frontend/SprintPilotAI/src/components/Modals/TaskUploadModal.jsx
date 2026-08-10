import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileText, Trash2, FolderKanban, AlertCircle, LayoutTemplate, Loader2, Database, Activity, ChevronDown } from 'lucide-react';
import ProjectService from '../../services/ProjectService';
import CustomDatePicker from '../Common/CustomDatePicker';
import apiClient from '../../api/apiClient';

// Category color mappings matching parent
const categoryConfig = {
  UI: { color: '#f97316', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  BACKEND: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  INFRA: { color: '#a855f7', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

const calculateAgileEndDate = (startDateStr) => {
  if (!startDateStr) return '';
  const [year, month, day] = startDateStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);

  let workingDaysCount = 0;
  let first = true;
  while (workingDaysCount < 10) {
    if (!first) {
      current.setDate(current.getDate() + 1);
    } else {
      first = false;
    }
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CategoryDropdown = ({ categoryStr, onChange, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef(null);
  const selectedList = categoryStr ? categoryStr.split(', ').filter(c => c.trim() !== '') : [];

  const toggleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 150;
      let top = rect.bottom + 4;
      if (window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight) {
        top = rect.top - menuHeight - 4;
      }
      setPos({ top, left: rect.left, width: Math.max(rect.width, 140) });
    }
    setIsOpen(!isOpen);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none flex items-center justify-between text-left transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-600 focus:border-blue-500'}`}
      >
        <span className="truncate max-w-[80px]">
          {selectedList.length > 0 ? selectedList.join(', ') : 'Select...'}
        </span>
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            className={`fixed z-[70] p-1.5 rounded-xl border shadow-2xl flex flex-col gap-1 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {['UI', 'BACKEND', 'INFRA', 'QA'].map(cat => {
              const isSelected = selectedList.includes(cat);
              return (
                <label key={cat} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                       e.stopPropagation();
                       let nextList;
                       if (isSelected) {
                         nextList = selectedList.filter(c => c !== cat);
                       } else {
                         nextList = [...selectedList, cat];
                       }
                       onChange(nextList.join(', '));
                    }}
                    className={`rounded w-3.5 h-3.5 cursor-pointer flex-shrink-0 ${darkMode ? 'bg-slate-900 border-slate-600 text-blue-500' : 'bg-white border-slate-300 text-blue-600 focus:ring-blue-500'}`}
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};

export default function TaskUploadModal({
  isOpen,
  onClose,
  darkMode,
  activeProject,
  projects,
  onImportSuccess,
  projectType,
  projectJiraId
}) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [excelHolidays, setExcelHolidays] = useState([]);
  const [milestoneName, setMilestoneName] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');
  const [parsedProjectInfo, setParsedProjectInfo] = useState({ id: '', name: '', matchedKey: '' });
  const [errorMsg, setErrorMsg] = useState('');

  // Jira Specific States
  const [importMode, setImportMode] = useState('EXCEL'); // 'EXCEL' or 'JIRA'
  const [jiraProjectKey, setJiraProjectKey] = useState(projectJiraId || '');
  const [jiraSprintName, setJiraSprintName] = useState('');
  const [isFetchingJira, setIsFetchingJira] = useState(false);
  const [jiraAuthRequired, setJiraAuthRequired] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (sessionStorage.getItem('open_jira_modal') === 'true') {
        setImportMode('JIRA');
        sessionStorage.removeItem('open_jira_modal');
      }
      if (projectJiraId) {
        setJiraProjectKey(projectJiraId);
      }
    }
  }, [isOpen, projectJiraId]);

  if (!isOpen) return null;

  const closeModal = () => {
    setExcelFile(null);
    setExcelData([]);
    setExcelHolidays([]);
    setMilestoneName('');
    setSprintStartDate('');
    setSprintEndDate('');
    setErrorMsg('');
    setParsedProjectInfo({ id: '', name: '', matchedKey: '' });
    setJiraProjectKey(projectJiraId || '');
    setJiraSprintName('');
    setIsFetchingJira(false);
    setJiraAuthRequired(false);
    onClose();
  };

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getTodayStr();

  const getNextDayStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getPrevDayStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const downloadSampleExcel = async () => {
    try {
      await ProjectService.downloadTasksTemplate(activeProject);
    } catch (err) {
      setErrorMsg('Failed to download Excel template. Please try again.');
    }
  };

  const handleFetchJiraTasks = async () => {
    if (!jiraProjectKey.trim()) {
      setErrorMsg('Please enter a Jira Project Key.');
      return;
    }
    if (!jiraSprintName.trim()) {
      setErrorMsg('Please enter the exact Jira Sprint Name to fetch tasks.');
      return;
    }

    setIsFetchingJira(true);
    setErrorMsg('');
    setExcelData([]);
    setExcelHolidays([]);
    setJiraAuthRequired(false);
    try {
      const res = await apiClient.post('jira/fetch/', {
        project_key: jiraProjectKey.trim().toUpperCase(),
        sprint_name: jiraSprintName.trim()
      });
      if (res.data.tasks && res.data.tasks.length > 0) {
        setExcelData(res.data.tasks.map(t => ({ ...t, selected: true, initialJiraId: t.jiraId || '' })));
        setMilestoneName(jiraSprintName.trim());
        setParsedProjectInfo({ id: jiraProjectKey, name: 'Jira Project', matchedKey: activeProject });
      } else {
        setErrorMsg(res.data.message || 'No tasks found for this project key in Jira.');
      }
    } catch (err) {
      console.error('[Jira Import] Fetch error:', err);
      if (err.response?.data?.auth_required) {
        setJiraAuthRequired(true);
        setErrorMsg(err.response?.data?.detail);
      } else {
        setErrorMsg(err.response?.data?.detail || 'Failed to fetch tasks from Jira.');
      }
    } finally {
      setIsFetchingJira(false);
    }
  };

  const handleConnectJira = async () => {
    try {
      const res = await apiClient.get('jira/auth-url/');
      if (res.data.auth_url) {
        sessionStorage.setItem('jira_redirect_back_url', window.location.pathname);
        window.location.href = res.data.auth_url;
      }
    } catch (err) {
      setErrorMsg('Failed to generate Jira login URL. Please check backend config.');
    }
  };


  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    setErrorMsg('');

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setMilestoneName(nameWithoutExt);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 4) {
          setErrorMsg('Excel template is invalid or missing columns.');
          return;
        }

        const row2 = rows[1] || [];
        let parsedProjectId = '';
        let parsedProjectName = '';

        const idLabelIndex = row2.findIndex(cell =>
          cell && cell.toString().toLowerCase().includes('project id')
        );
        if (idLabelIndex !== -1 && row2[idLabelIndex + 1]) {
          parsedProjectId = row2[idLabelIndex + 1].toString().trim();
        }

        const nameLabelIndex = row2.findIndex(cell =>
          cell && cell.toString().toLowerCase().includes('project name')
        );
        if (nameLabelIndex !== -1 && row2[nameLabelIndex + 1]) {
          parsedProjectName = row2[nameLabelIndex + 1].toString().trim();
        }

        let matchedKey = '';
        if (parsedProjectId) {
          matchedKey = Object.keys(projects).find(key =>
            projects[key].id.trim().toLowerCase() === parsedProjectId.toLowerCase()
          ) || '';
        }
        if (!matchedKey && parsedProjectName) {
          matchedKey = Object.keys(projects).find(key =>
            key.trim().toLowerCase() === parsedProjectName.toLowerCase()
          ) || '';
        }

        setParsedProjectInfo({ id: parsedProjectId, name: parsedProjectName, matchedKey });

        const rawHeaders = rows[3];
        if (!rawHeaders || rawHeaders.length === 0) {
          setErrorMsg('Invalid format. Missing headers row.');
          return;
        }

        const headers = rawHeaders.map(h => (h || '').toString().trim().toLowerCase().replace(/\s+/g, ''));

        const titleIndex = headers.indexOf('tasktitle');
        const descIndex = headers.indexOf('description');
        const catIndex = headers.indexOf('category');
        const jiraIndex = headers.findIndex(h => h.includes('jira'));
        const estHoursIndex = headers.findIndex(h => h.includes('estimatedhours') || h.includes('estimatehours') || h.includes('esthours') || h.includes('hours'));

        if (titleIndex === -1 || descIndex === -1 || catIndex === -1) {
          setErrorMsg('Invalid format. Missing required columns (Task Title, Description, Category).');
          return;
        }

        // Helper to format date values into YYYY-MM-DD
        const formatDateValue = (val) => {
          if (!val) return '';
          if (val instanceof Date) {
            // Add 12 hours to avoid timezone shifting/rounding issues that pull it to the previous day (e.g. 23:59:50)
            const adjustedDate = new Date(val.getTime() + 12 * 60 * 60 * 1000);
            const y = adjustedDate.getFullYear();
            const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            const adjustedDate = new Date(date.getTime() + 12 * 60 * 60 * 1000);
            const y = adjustedDate.getFullYear();
            const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          const str = val.toString().trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
          }
          const parts = str.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
            if (parts[2].length === 4) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          const parsedDate = new Date(str);
          if (!isNaN(parsedDate.getTime())) {
            const adjustedDate = new Date(parsedDate.getTime() + 12 * 60 * 60 * 1000);
            const y = adjustedDate.getFullYear();
            const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          return '';
        };

        // Parse Holidays from Column F (dynamically detected index) starting from row 4 (index 3)
        const parsedHolidays = [];
        const row3 = rows[2] || [];
        let holidayColIndex = row3.findIndex(cell =>
          cell && cell.toString().toLowerCase().includes('holiday')
        );
        if (holidayColIndex === -1) {
          // Fallback check in first 5 rows
          for (let r = 0; r < Math.min(5, rows.length); r++) {
            const idx = (rows[r] || []).findIndex(cell =>
              cell && cell.toString().toLowerCase().includes('holiday')
            );
            if (idx !== -1) {
              holidayColIndex = idx;
              break;
            }
          }
        }
        if (holidayColIndex === -1) {
          holidayColIndex = rows[3] && rows[3].length > 5 ? 5 : 4;
        }

        for (let i = 3; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[holidayColIndex] !== undefined && row[holidayColIndex] !== null) {
            const hVal = row[holidayColIndex];
            const formatted = formatDateValue(hVal);
            if (formatted) {
              parsedHolidays.push(formatted);
            }
          }
        }
        setExcelHolidays(parsedHolidays);

        // Parse Tasks, skipping rows with empty task title (preventing junk tasks)
        const parsedRows = [];
        for (let i = 4; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const titleVal = row[titleIndex] !== undefined ? row[titleIndex] : '';
          let cleanTitle = titleVal.toString().trim();
          if (!cleanTitle) {
            continue;
          }
          
          // Strip any trailing Jira URL in parentheses that might be present from older Excel exports
          const urlMatch = cleanTitle.match(/\s+\(https?:\/\/[^)]+\)$/i);
          if (urlMatch) {
            cleanTitle = cleanTitle.replace(urlMatch[0], '');
          }

          const descVal = row[descIndex] !== undefined ? row[descIndex] : '';
          const catVal = row[catIndex] !== undefined ? row[catIndex] : '';
          const jiraVal = jiraIndex !== -1 && row[jiraIndex] !== undefined ? row[jiraIndex] : '';
          const estHoursVal = estHoursIndex !== -1 && row[estHoursIndex] !== undefined ? row[estHoursIndex] : '';

          const cat = catVal.toString().toUpperCase().trim();
          const validCats = ['UI', 'BACKEND', 'INFRA', 'QA'];

          let parsedEstHours = null;
          if (estHoursVal !== undefined && estHoursVal !== null && estHoursVal !== '') {
            const num = parseFloat(estHoursVal);
            if (!isNaN(num)) {
              parsedEstHours = num;
            }
          }

          parsedRows.push({
            title: cleanTitle,
            desc: (descVal || 'No description provided.').toString().trim(),
            category: validCats.includes(cat) ? cat : 'UI',
            status: 'OPEN',
            jiraId: jiraVal.toString().trim(),
            estimated_hours: parsedEstHours
          });
        }

        if (parsedRows.length === 0) {
          setErrorMsg('No task rows found in the Excel sheet.');
        } else {
          setExcelData(parsedRows.map(t => ({ ...t, selected: true, initialJiraId: t.jiraId || '' })));
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Error parsing Excel file. Please verify file integrity.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmUpload = () => {
    if (!milestoneName.trim()) {
      setErrorMsg('Please specify a Milestone/Sprint name.');
      return;
    }
    if (!sprintStartDate) {
      setErrorMsg('Please specify the Start Date.');
      return;
    }

    let finalEndDate = sprintEndDate;
    if (projectType === 'AGILE') {
      finalEndDate = calculateAgileEndDate(sprintStartDate);
    } else {
      if (!sprintEndDate) {
        setErrorMsg('Please specify the End Date.');
        return;
      }
      if (new Date(sprintStartDate) > new Date(sprintEndDate)) {
        setErrorMsg('Start Date must be before or equal to End Date.');
        return;
      }
    }

    const selectedTasks = excelData.filter(t => t.selected);
    if (selectedTasks.length === 0) {
      setErrorMsg('No tasks selected to import.');
      return;
    }

    for (const t of selectedTasks) {
      if (!t.title || !t.title.trim()) {
        setErrorMsg('All selected tasks must have a title.');
        return;
      }
      if (!t.category || !t.category.trim()) {
        setErrorMsg(`Task "${t.title}" must have a category.`);
        return;
      }
      if (t.estimated_hours !== undefined && t.estimated_hours !== null) {
        if (parseFloat(t.estimated_hours) < 0) {
          setErrorMsg(`Task "${t.title}" cannot have negative estimated hours.`);
          return;
        }
      }
    }

    const targetProjectKey = parsedProjectInfo.matchedKey || activeProject;

    // Call parent handler
    onImportSuccess({
      milestoneName,
      tasks: selectedTasks,
      holidays: excelHolidays,
      sprintStartDate,
      sprintEndDate: finalEndDate,
      targetProjectKey,
      jiraSprintName: importMode === 'JIRA' ? jiraSprintName.trim() : null
    });

    closeModal();
  };

  const handleToggleTask = (idx) => {
    const newData = [...excelData];
    newData[idx].selected = !newData[idx].selected;
    setExcelData(newData);
  };

  const handleTaskCategoryChange = (idx, newCategory) => {
    const newData = [...excelData];
    newData[idx].category = newCategory;
    setExcelData(newData);
  };

  const handleTaskJiraIdChange = (idx, newJiraId) => {
    const newData = [...excelData];
    newData[idx].jiraId = newJiraId;
    setExcelData(newData);
  };

  const handleToggleCategory = (categoryName, isSelected) => {
    const newData = excelData.map(task =>
      task.category === categoryName ? { ...task, selected: isSelected } : task
    );
    setExcelData(newData);
  };

  const handleToggleAll = (isSelected) => {
    const newData = excelData.map(task => ({ ...task, selected: isSelected }));
    setExcelData(newData);
  };

  const groupedTasks = excelData.reduce((acc, task, idx) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push({ ...task, originalIndex: idx });
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden z-10 flex flex-col max-h-[85vh] ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Upload Project Tasks</h3>
              <span className="text-xs text-slate-400">Import sprint/milestone tasks from an Excel template</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Toggle - Segmented Control */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              if (importMode !== 'EXCEL') {
                setExcelData([]);
                setExcelHolidays([]);
                setErrorMsg('');
                setImportMode('EXCEL');
                setJiraSprintName('');
              }
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border ${importMode === 'EXCEL'
                ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white scale-[1.02]'
                : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 cursor-pointer'
              }`}
          >
            <FileText className="w-4 h-4" />
            Excel Upload
          </button>
          <button
            onClick={() => {
              if (importMode !== 'JIRA') {
                setExcelData([]);
                setExcelHolidays([]);
                setErrorMsg('');
                setImportMode('JIRA');
                setExcelFile(null);
                setParsedProjectInfo({ id: '', name: '', matchedKey: '' });
              }
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border ${importMode === 'JIRA'
                ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20 text-white scale-[1.02]'
                : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 cursor-pointer'
              }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Jira Connect
          </button>
        </div>

        {/* Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin">

          {importMode === 'EXCEL' ? (
            <>
              {/* Step 1: Download Template */}
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">1. Get the Excel Template</h4>
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                  }`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">Download static Excel template</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">
                      Populate task title, description, category, and optionally jira ID. Ensure formatting is strictly maintained.
                    </p>
                  </div>
                  <button
                    onClick={downloadSampleExcel}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer hover:scale-102 active:scale-98 ${darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                  >
                    Download Template
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Excel File */}
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">2. Upload populated sheet</h4>
                {!excelFile ? (
                  <label className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition-all ${darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold block">Select Excel file to upload</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Drag and drop or browse files (.xlsx, .xls)</span>
                    </div>
                  </label>
                ) : (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block truncate max-w-[200px]">{excelFile.name}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{(excelFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                    </div>

                    <button
                      onClick={closeModal}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Step 1 (JIRA): Fetch from Jira */
            <div>
              <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">1. Connect & Fetch Jira Tasks</h4>

              {jiraAuthRequired && (
                <div className="mb-6 relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/5 to-indigo-600/10 p-1">
                  <style>{`
                    @keyframes slideFlow {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(200%); }
                    }
                    @keyframes shimmerBtn {
                      0% { transform: skew(-12deg) translateX(-150%); }
                      100% { transform: skew(-12deg) translateX(250%); }
                    }
                    .animate-slide-flow {
                      animation: slideFlow 1.5s linear infinite;
                    }
                    .animate-shimmer-btn {
                      animation: shimmerBtn 2.5s ease-in-out infinite;
                    }
                  `}</style>
                  {/* Glassmorphic inner container */}
                  <div className="relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[1.4rem] p-6 sm:p-8 flex flex-col items-center text-center">

                    {/* Animated Connection Graphic */}
                    <div className="flex items-center justify-center w-full max-w-[280px] mb-6 relative">
                      {/* SprintPilot Side */}
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-[2px] shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)] shrink-0">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                          <Activity className="w-6 h-6 text-orange-500" />
                        </div>
                        {/* Ping effect */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/30 animate-ping" style={{ animationDuration: '3s' }}></div>
                      </div>

                      {/* Connection Line with Flowing Animation */}
                      <div className="relative flex-1 h-[2px] mx-2">
                        {/* Background dashed line */}
                        <div className="absolute inset-0 border-t-[3px] border-dotted border-slate-300 dark:border-slate-700"></div>
                        {/* Animated flowing stream */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80 animate-slide-flow"></div>
                        </div>
                      </div>

                      {/* Jira Side */}
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 p-[2px] shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] shrink-0">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                          <LayoutTemplate className="w-6 h-6 text-blue-500" />
                        </div>
                        {/* Ping effect */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }}></div>
                      </div>
                    </div>

                    <h5 className="text-base sm:text-lg font-black tracking-tight text-slate-800 dark:text-white mb-2">Connect SprintPilot AI to Jira</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[320px] leading-relaxed mb-6 font-medium">
                      Securely authorize SprintPilot AI to automatically fetch and synchronize your Jira tasks, issues, and milestones.
                    </p>

                    <button
                      onClick={handleConnectJira}
                      className="group relative w-full sm:w-auto overflow-hidden rounded-xl bg-blue-600 px-8 py-3 text-white transition-all hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.8)] shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] active:scale-95"
                    >
                      <div className="absolute inset-0 flex h-full w-full justify-center">
                        <div className="w-12 h-full bg-white/20 animate-shimmer-btn" />
                      </div>
                      <span className="relative text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                        <Database className="w-4 h-4" />
                        Authorize with Jira
                      </span>
                    </button>
                  </div>

                  {/* Decorative background glows */}
                  <div className="absolute top-0 left-0 w-40 h-40 bg-orange-500/20 blur-[60px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2" />
                </div>
              )}

              <div className={`p-4 rounded-2xl border flex flex-col gap-4 ${darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                  <div className="flex-1 w-full flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Project Key
                    </span>
                    {projectJiraId ? (
                      <span className={`text-sm font-black tracking-widest px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                        }`}>
                        {projectJiraId}
                      </span>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. SP"
                        value={jiraProjectKey}
                        onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                        className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 w-full flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Sprint Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Sprint 1"
                      value={jiraSprintName}
                      onChange={(e) => setJiraSprintName(e.target.value)}
                      className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>

                  <button
                    onClick={handleFetchJiraTasks}
                    disabled={isFetchingJira}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isFetchingJira ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    Fetch
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-left">
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 leading-snug">
                    <span className="uppercase font-extrabold mr-1">Note:</span>
                    Task fetch will only work if the exact Sprint Name from Jira is provided. Please input it exactly as it appears in Jira.
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Step 3: Milestone details (Visible only if file uploaded or fetched) */}
          {(excelFile || (importMode === 'JIRA' && excelData.length > 0)) && excelData.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">3. Define Milestone Details</h4>

                {parsedProjectInfo.id || parsedProjectInfo.name ? (
                  <div className={`p-4 rounded-2xl border mb-3 flex items-start gap-3 text-left ${parsedProjectInfo.matchedKey
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                    <FolderKanban className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">
                        Excel Project: {parsedProjectInfo.name || 'Unnamed Project'} ({parsedProjectInfo.id || 'N/A'})
                      </span>
                      <span className="text-[10px] opacity-80 block mt-0.5 leading-relaxed">
                        {parsedProjectInfo.matchedKey
                          ? `Successfully matched workspace project: "${parsedProjectInfo.matchedKey}". Tasks will be mapped to this project.`
                          : `Warning: No matching project found. Tasks will import into the current active project: "${activeProject}".`}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Milestone / Sprint Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sprint 7 Launch"
                      value={milestoneName}
                      onChange={(e) => setMilestoneName(e.target.value)}
                      className={`w-full text-xs font-semibold px-4 py-3 rounded-2xl border focus:outline-none focus:ring-1 focus:ring-orange-500 ${darkMode ? 'bg-slate-850 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                    <div className="mt-2 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-2 text-left">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold leading-normal">
                        <span className="font-extrabold uppercase mr-1.5">Note:</span>
                        The name defined here will serve as the official milestone name when syncing this sprint with Backlog.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Start Date</label>
                      <CustomDatePicker
                        value={sprintStartDate}
                        onChange={setSprintStartDate}
                        darkMode={darkMode}
                        minDate={todayStr}
                        maxDate={projectType !== 'AGILE' && sprintEndDate ? getPrevDayStr(sprintEndDate) : undefined}
                      />
                    </div>
                    {projectType === 'AGILE' ? (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Calculated End Date (10 Days)</label>
                        <div className={`w-full text-xs font-semibold px-4 py-3 rounded-2xl border flex items-center justify-start ${darkMode ? 'bg-slate-855 border-slate-700 text-slate-450' : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`} style={{ minHeight: '42px' }}>
                          {sprintStartDate ? (
                            (() => {
                              const endValStr = calculateAgileEndDate(sprintStartDate);
                              return new Date(endValStr).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                            })()
                          ) : (
                            'Specify Start Date first'
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">End Date</label>
                        <CustomDatePicker
                          value={sprintEndDate}
                          onChange={setSprintEndDate}
                          darkMode={darkMode}
                          minDate={sprintStartDate ? getNextDayStr(sprintStartDate) : getNextDayStr(todayStr)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Preview with Selection */}
              <div>
                {importMode === 'JIRA' && (
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">Task Selection</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">
                        {excelData.filter(t => t.selected).length} of {excelData.length} selected
                      </span>
                      <button
                        onClick={() => handleToggleAll(excelData.some(t => !t.selected))}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        {excelData.every(t => t.selected) ? 'Unselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                )}

                <div className={`border rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto shadow-inner ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                  {excelData.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No tasks to display</div>
                  ) : importMode === 'EXCEL' ? (
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 backdrop-blur-md">
                        <tr className={`text-[10px] font-extrabold tracking-wider uppercase border-b ${
                          darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}>
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Hours</th>
                          <th className="py-2.5 px-3">Jira ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {excelData.map((row, idx) => (
                          <tr key={idx} className={darkMode ? 'bg-slate-900/40 text-slate-300' : 'bg-white text-slate-700'}>
                            <td className="py-2 px-3 font-semibold truncate max-w-[150px]">{row.title}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[180px]" title={row.desc}>{row.desc}</td>
                            <td className="py-2 px-3 flex flex-wrap gap-1">
                              {row.category ? row.category.split(',').map((cat) => {
                                const cleanCat = cat.trim();
                                return (
                                  <span key={cleanCat} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${categoryConfig[cleanCat]?.bg || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {cleanCat}
                                  </span>
                                );
                              }) : null}
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-semibold">{row.estimated_hours !== null && row.estimated_hours !== undefined ? `${row.estimated_hours}h` : 'N/A'}</td>
                            <td className="py-2 px-3 text-slate-400 font-medium">{row.jiraId || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 backdrop-blur-md">
                        <tr className={`text-[10px] font-extrabold tracking-wider uppercase border-b ${
                          darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={excelData.length > 0 && excelData.every(t => t.selected)}
                              onChange={(e) => handleToggleAll(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Hours</th>
                          <th className="py-2.5 px-3">Jira ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {excelData.map((row, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => handleToggleTask(idx)}
                            className={`cursor-pointer transition-colors ${row.selected ? (darkMode ? 'bg-blue-900/10' : 'bg-blue-50/50') : (darkMode ? 'bg-slate-900/40 text-slate-300' : 'bg-white text-slate-700')} hover:${darkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}
                          >
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleToggleTask(idx)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 font-semibold truncate max-w-[150px]" title={row.title}>{row.title}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[180px]" title={row.desc}>{row.desc}</td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <div className="w-[120px]">
                                <CategoryDropdown
                                  categoryStr={row.category}
                                  onChange={(newCat) => handleTaskCategoryChange(idx, newCat)}
                                  darkMode={darkMode}
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-semibold">{row.estimated_hours !== null && row.estimated_hours !== undefined ? `${row.estimated_hours}h` : 'N/A'}</td>
                            <td className="py-2 px-3 text-slate-400 font-medium">{row.jiraId || row.initialJiraId || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-auto flex-shrink-0">
          <button
            onClick={closeModal}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmUpload}
            disabled={(importMode === 'EXCEL' && !excelFile) || excelData.length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-orange-500/10 transition-colors cursor-pointer"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
