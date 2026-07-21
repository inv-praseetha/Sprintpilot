import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import SprintServices from '../../services/SprintServices';
import CustomDatePicker from '../Common/CustomDatePicker';

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
    backlog_task_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

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
        backlog_task_id: formData.backlog_task_id.trim() || null
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
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl my-auto transform transition-all flex flex-col max-h-[90vh] ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-850'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b rounded-t-3xl ${
          darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
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
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-650'
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
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                darkMode
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
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white placeholder-slate-600'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              >
                <option value="UI">UI Development</option>
                <option value="Backend">Backend Development</option>
                <option value="QA">QA Development</option>
                <option value="INFRA">System Design & Infra</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
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

          {/* Row 3: Status & Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              >
                <option value="OPEN">TODO / Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">In Review / Resolved</option>
                <option value="CLOSED">Completed / Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Assignee
              </label>
              <select
                name="assigned_employee_id"
                value={formData.assigned_employee_id}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user.full_name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Planned Start & End Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Planned Start Date
              </label>
              <CustomDatePicker
                value={formData.planned_start_date}
                onChange={(val) => {
                  handleChange({ target: { name: 'planned_start_date', value: val } });
                }}
                minDate={sprintStartDate}
                maxDate={sprintEndDate}
                darkMode={darkMode}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Planned End Date
              </label>
              <CustomDatePicker
                value={formData.planned_end_date}
                onChange={(val) => {
                  handleChange({ target: { name: 'planned_end_date', value: val } });
                }}
                minDate={formData.planned_start_date || sprintStartDate}
                maxDate={sprintEndDate}
                darkMode={darkMode}
              />
            </div>
          </div>



          {/* Row 6: Description & Backlog Task ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Enter task detailed description..."
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors resize-none ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Backlog Task ID
              </label>
              <input
                type="text"
                name="backlog_task_id"
                value={formData.backlog_task_id}
                onChange={handleChange}
                placeholder="e.g. BK-99"
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 focus:border-orange-500 text-white'
                    : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                darkMode
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
