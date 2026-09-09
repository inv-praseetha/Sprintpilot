import React, { useState } from 'react';
import { X, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import SprintServices from '../../services/SprintServices';
import CustomDatePicker from '../Common/CustomDatePicker';

const getWorkingDaysCount = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  let count = 0;
  let current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const calculateMinEndDate = (startStr, estimatedHours) => {
  if (!startStr) return '';
  const hours = parseFloat(estimatedHours);
  if (isNaN(hours) || hours <= 0) return startStr;

  const minDays = Math.ceil(hours / 8);
  const [year, month, day] = startStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);

  let workingDaysCount = 0;
  while (workingDaysCount < minDays) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }
    if (workingDaysCount < minDays) {
      current.setDate(current.getDate() + 1);
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const calculateMaxStartDate = (endStr, estimatedHours) => {
  if (!endStr) return '';
  const hours = parseFloat(estimatedHours);
  if (isNaN(hours) || hours <= 0) return endStr;

  const minDays = Math.ceil(hours / 8);
  const [year, month, day] = endStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);

  let workingDaysCount = 0;
  while (workingDaysCount < minDays) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }
    if (workingDaysCount < minDays) {
      current.setDate(current.getDate() - 1);
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function AddTaskModal({ show, onClose, sprintId, sprintStartDate, sprintEndDate, employees, darkMode, onTaskCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    jira_id: '',
    description: '',
    priority: 'Normal',
    category: 'UI',
    status: 'OPEN',
    assigned_employee_id: '',
    planned_start_date: '',
    planned_end_date: '',
    estimated_hours: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  if (!show) return null;

  const getSchedulingEndDate = (endDateStr) => {
    if (!endDateStr) return '';
    const date = new Date(endDateStr);
    date.setDate(date.getDate() - 2);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const schedulingEndDate = sprintEndDate ? getSchedulingEndDate(sprintEndDate) : '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If start date is set and is after end date, reset end date
      if (name === 'planned_start_date' && updated.planned_end_date && value > updated.planned_end_date) {
        updated.planned_end_date = '';
      }
      // If end date is set and is before start date, reset start date
      if (name === 'planned_end_date' && updated.planned_start_date && value < updated.planned_start_date) {
        updated.planned_start_date = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task Title is required.');
      return;
    }
    if (!formData.category) {
      setError('Category is required.');
      return;
    }
    if (!formData.status) {
      setError('Status is required.');
      return;
    }
    if (!formData.assigned_employee_id) {
      setError('Assignee is required.');
      return;
    }
    if (!formData.planned_start_date) {
      setError('Planned Start Date is required.');
      return;
    }
    if (!formData.planned_end_date) {
      setError('Planned End Date is required.');
      return;
    }
    if (formData.planned_start_date > formData.planned_end_date) {
      setError('Planned Start Date must be before or equal to Planned End Date.');
      return;
    }
    if (!formData.estimated_hours || isNaN(parseFloat(formData.estimated_hours)) || parseFloat(formData.estimated_hours) <= 0) {
      setError('Estimated hours are required and must be greater than 0.');
      return;
    }
    const hoursVal = parseFloat(formData.estimated_hours);
    if (formData.planned_start_date && formData.planned_end_date && hoursVal > 0) {
      const workingDays = getWorkingDaysCount(formData.planned_start_date, formData.planned_end_date);
      const minDays = Math.ceil(hoursVal / 8);
      if (workingDays < minDays) {
        setError(`Estimated hours (${formData.estimated_hours}h) require at least ${minDays} working day(s). Selected range has only ${workingDays} working day(s).`);
        return;
      }
    }
    if (!formData.description.trim()) {
      setError('Description is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare payload: convert empty values to null for the DB
      const payload = {
        title: formData.title.trim(),
        jira_id: formData.jira_id.trim() || null,
        description: formData.description.trim() || null,
        priority: formData.priority,
        category: formData.category,
        status: formData.status,
        assigned_employee_id: formData.assigned_employee_id || null,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };

      const newTask = await SprintServices.createSprintTask(sprintId, payload);
      onTaskCreated(newTask);
      onClose();
    } catch (err) {
      console.error('[AddTaskModal] Failed to create task:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create sprint task.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-950/40 backdrop-blur-md">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl my-auto transform transition-all flex flex-col max-h-[90vh] ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-850'
          }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b rounded-t-3xl ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
              <h3 className="font-extrabold text-2xl tracking-tight">Add New Sprint Task</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Configure specification details to schedule and assign the task.</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-650'
              }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
          {error && (
            <div className="p-3 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-450">
              {error}
            </div>
          )}

          {/* Row 1: Title */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Implement User Authentication Flow"
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                  ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white placeholder-slate-600'
                  : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800 placeholder-slate-400'
                }`}
              required
            />
          </div>

          {/* Row 2: JIRA ID & Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                JIRA ID
              </label>
              <input
                type="text"
                name="jira_id"
                value={formData.jira_id}
                onChange={handleChange}
                placeholder="e.g. SP-101"
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white placeholder-slate-600'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800 placeholder-slate-400'
                  }`}
              />
            </div>
            <div className="relative">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all flex items-center justify-between text-left ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                  }`}
              >
                <span className="truncate">
                  {formData.category || 'Select Category...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${categoryDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setCategoryDropdownOpen(false)}
                  />
                  <div className={`absolute left-0 right-0 mt-1.5 p-2 rounded-xl border shadow-xl z-50 transition-all ${darkMode
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {[
                      { value: 'UI', label: 'UI Development' },
                      { value: 'Backend', label: 'Backend Development' },
                      { value: 'QA', label: 'QA Development' },
                      { value: 'INFRA', label: 'System Design & Infra' }
                    ].map((opt) => {
                      const selectedList = formData.category ? formData.category.split(', ') : [];
                      const isSelected = selectedList.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors ${darkMode
                              ? 'hover:bg-slate-800/60'
                              : 'hover:bg-slate-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              let nextList;
                              if (isSelected) {
                                nextList = selectedList.filter(item => item !== opt.value);
                              } else {
                                nextList = [...selectedList, opt.value];
                              }
                              handleChange({
                                target: {
                                  name: 'category',
                                  value: nextList.join(', ')
                                }
                              });
                            }}
                            className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                  }`}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Row 3: Status & Assignee & Est. Hours */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                  }`}
                required
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">In Review / Resolved</option>
                <option value="CLOSED">Completed / Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Assignee <span className="text-red-500">*</span>
              </label>
              <select
                name="assigned_employee_id"
                value={formData.assigned_employee_id}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                  }`}
                required
              >
                <option value="">Choose an assignee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Est. Hours <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                placeholder="e.g. 12"
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white placeholder-slate-600'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800 placeholder-slate-400'
                  }`}
              />
            </div>
          </div>

          {/* Row 4: Planned Start & End Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Planned Start Date <span className="text-red-500">*</span>
              </label>
              <CustomDatePicker
                value={formData.planned_start_date}
                onChange={(val) => {
                  handleChange({ target: { name: 'planned_start_date', value: val } });
                }}
                minDate={sprintStartDate}
                maxDate={
                  (formData.planned_end_date && formData.estimated_hours)
                    ? (calculateMaxStartDate(formData.planned_end_date, formData.estimated_hours) < sprintStartDate
                      ? sprintStartDate
                      : calculateMaxStartDate(formData.planned_end_date, formData.estimated_hours))
                    : (formData.planned_end_date || sprintEndDate)
                }
                darkMode={darkMode}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Planned End Date <span className="text-red-500">*</span>
              </label>
              <CustomDatePicker
                value={formData.planned_end_date}
                onChange={(val) => {
                  handleChange({ target: { name: 'planned_end_date', value: val } });
                }}
                minDate={
                  (formData.planned_start_date && formData.estimated_hours)
                    ? (calculateMinEndDate(formData.planned_start_date, formData.estimated_hours) > sprintEndDate
                      ? sprintEndDate
                      : calculateMinEndDate(formData.planned_start_date, formData.estimated_hours))
                    : (formData.planned_start_date || sprintStartDate)
                }
                maxDate={sprintEndDate}
                darkMode={darkMode}
              />
            </div>
          </div>



          {/* Row 6: Description */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Enter task detailed description..."
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors resize-none ${darkMode
                  ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                  : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              required
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-colors ${darkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
