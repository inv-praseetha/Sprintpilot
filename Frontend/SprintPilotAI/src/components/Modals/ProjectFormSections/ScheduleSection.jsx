import React from 'react';
import CustomDatePicker from '../../Common/CustomDatePicker';
import { useValidationLimits } from '../../../hooks/useValidationLimits';

export default function ScheduleSection({
  type,
  darkMode,
  editingProjectId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  numberOfDays,
  setNumberOfDays,
  calculateEndDate
}) {
  const limits = useValidationLimits();

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getTodayStr();

  return (
    <>
      {type === 'WATERFALL' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                darkMode={darkMode}
                minDate={editingProjectId && startDate && startDate < todayStr ? startDate : todayStr}
                maxDate={endDate ? endDate : undefined}
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                End Date <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                value={endDate}
                onChange={setEndDate}
                darkMode={darkMode}
                minDate={startDate ? startDate : (editingProjectId ? undefined : todayStr)}
              />
            </div>
          </div>
          {startDate && endDate && new Date(endDate) > new Date(startDate) && (
            <div className="text-xs font-extrabold text-orange-500 text-left pl-1">
              Calculated Duration: {Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} Days
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                darkMode={darkMode}
                minDate={editingProjectId && startDate && startDate < todayStr ? startDate : todayStr}
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (Days) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required
                min={limits.project.numberOfDays.min}
                max={limits.project.numberOfDays.max}
                placeholder="10"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
                className={`w-full px-4.5 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none ${darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500 focus:bg-white'
                  }`}
              />
            </div>
          </div>
          {startDate && numberOfDays && parseInt(numberOfDays, 10) > 0 && calculateEndDate && (
            <div className="text-xs font-extrabold text-orange-500 text-left pl-1">
              Calculated End Date: {calculateEndDate(startDate, numberOfDays)} (Mon to Fri Working Days)
            </div>
          )}
        </div>
      )}
    </>
  );
}
