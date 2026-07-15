import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, X, FileText, Trash2, FolderKanban, AlertCircle } from 'lucide-react';
import ProjectService from '../../services/ProjectService';

// Category color mappings matching parent
const categoryConfig = {
  UI: { color: '#f97316', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  BACKEND: { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  INFRA: { color: '#a855f7', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  QA: { color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

export default function TaskUploadModal({
  isOpen,
  onClose,
  darkMode,
  activeProject,
  projects,
  onImportSuccess
}) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [milestoneName, setMilestoneName] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');
  const [parsedProjectInfo, setParsedProjectInfo] = useState({ id: '', name: '', matchedKey: '' });
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const closeModal = () => {
    setExcelFile(null);
    setExcelData([]);
    setMilestoneName('');
    setSprintStartDate('');
    setSprintEndDate('');
    setErrorMsg('');
    setParsedProjectInfo({ id: '', name: '', matchedKey: '' });
    onClose();
  };

  const downloadSampleExcel = async () => {
    try {
      await ProjectService.downloadTasksTemplate(activeProject);
    } catch (err) {
      setErrorMsg('Failed to download Excel template. Please try again.');
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
        const workbook = XLSX.read(data, { type: 'array' });
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

        if (titleIndex === -1 || descIndex === -1 || catIndex === -1) {
          setErrorMsg('Invalid format. Missing required columns (Task Title, Description, Category).');
          return;
        }

        const parsedRows = [];
        for (let i = 4; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(val => val === null || val === '' || val === undefined)) continue;

          const titleVal = row[titleIndex] !== undefined ? row[titleIndex] : '';
          const descVal = row[descIndex] !== undefined ? row[descIndex] : '';
          const catVal = row[catIndex] !== undefined ? row[catIndex] : '';
          const jiraVal = jiraIndex !== -1 && row[jiraIndex] !== undefined ? row[jiraIndex] : '';

          const cat = catVal.toString().toUpperCase().trim();
          const validCats = ['UI', 'BACKEND', 'INFRA', 'QA'];

          const todayStr = new Date().toISOString().split('T')[0];
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];

          parsedRows.push({
            title: (titleVal || 'Untitled Task').toString().trim(),
            desc: (descVal || 'No description provided.').toString().trim(),
            category: validCats.includes(cat) ? cat : 'UI',
            startDate: todayStr,
            endDate: nextWeekStr,
            status: 'In Progress',
            jiraId: jiraVal.toString().trim()
          });
        }

        if (parsedRows.length === 0) {
          setErrorMsg('No task rows found in the Excel sheet.');
        } else {
          setExcelData(parsedRows);
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
    if (!sprintEndDate) {
      setErrorMsg('Please specify the End Date.');
      return;
    }
    if (new Date(sprintStartDate) > new Date(sprintEndDate)) {
      setErrorMsg('Start Date must be before or equal to End Date.');
      return;
    }
    if (excelData.length === 0) {
      setErrorMsg('No data loaded to import.');
      return;
    }

    const tasksWithDates = excelData.map(task => ({
      ...task,
      startDate: sprintStartDate,
      endDate: sprintEndDate
    }));

    const targetProjectKey = parsedProjectInfo.matchedKey || activeProject;
    
    // Call parent handler
    onImportSuccess({
      milestoneName,
      tasksWithDates,
      targetProjectKey
    });

    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden z-10 flex flex-col max-h-[85vh] ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
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

        {/* Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin">
          {/* Step 1: Download Template */}
          <div>
            <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">1. Get the Excel Template</h4>
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">Download static Excel template</span>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">
                  Populate task title, description, category, and optionally jira ID. Ensure formatting is strictly maintained.
                </p>
              </div>
              <button
                onClick={downloadSampleExcel}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer hover:scale-102 active:scale-98 ${
                  darkMode
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
              <label className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition-all ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
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
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
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

          {/* Step 3: Milestone details (Visible only if file uploaded) */}
          {excelFile && excelData.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-2">3. Define Milestone Details</h4>
                
                {parsedProjectInfo.id || parsedProjectInfo.name ? (
                  <div className={`p-4 rounded-2xl border mb-3 flex items-start gap-3 text-left ${
                    parsedProjectInfo.matchedKey 
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
                      className={`w-full text-xs font-semibold px-4 py-3 rounded-2xl border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                        darkMode ? 'bg-slate-850 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={sprintStartDate}
                        onChange={(e) => setSprintStartDate(e.target.value)}
                        className={`w-full text-xs font-semibold px-4 py-3 rounded-2xl border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                          darkMode ? 'bg-slate-850 border-slate-700 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">End Date</label>
                      <input
                        type="date"
                        value={sprintEndDate}
                        onChange={(e) => setSprintEndDate(e.target.value)}
                        className={`w-full text-xs font-semibold px-4 py-3 rounded-2xl border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                          darkMode ? 'bg-slate-850 border-slate-700 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Excel Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">Data Preview</h4>
                  <span className="text-[10px] font-bold text-slate-400">{excelData.length} tasks ready</span>
                </div>

                <div className={`border rounded-2xl overflow-hidden max-h-[180px] overflow-y-auto ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[10px] font-extrabold tracking-wider uppercase border-b ${
                        darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Jira ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {excelData.map((row, idx) => (
                        <tr key={idx} className={darkMode ? 'bg-slate-900/40 text-slate-300' : 'bg-white text-slate-700'}>
                          <td className="py-2 px-3 font-semibold truncate max-w-[200px]">{row.title}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${categoryConfig[row.category]?.bg}`}>
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 font-medium">{row.jiraId || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-auto flex-shrink-0">
          <button
            onClick={closeModal}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmUpload}
            disabled={!excelFile || excelData.length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-orange-500/10 transition-colors cursor-pointer"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
