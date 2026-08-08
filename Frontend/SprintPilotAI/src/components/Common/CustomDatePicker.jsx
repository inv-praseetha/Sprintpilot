import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomDatePicker({ value, onChange, minDate, maxDate, darkMode, onOpen, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (onOpen) onOpen();
    } else {
      if (onClose) onClose();
    }
  }, [isOpen, onOpen, onClose]);

  // Click outside to close handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedContainer = containerRef.current && containerRef.current.contains(event.target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(event.target);
      if (!clickedContainer && !clickedPopover) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update calendar coordinates on scroll or resize instead of closing it
  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX
        });
      }
    };
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX
      });
    }
    setIsOpen(!isOpen);
  };

  // Initialize view date based on current value, minDate or today
  const [viewDate, setViewDate] = useState(() => {
    const initial = value || minDate || new Date().toISOString().split('T')[0];
    const [y, m, d] = initial.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Keep viewDate updated if value changes and calendar is reopened
  useEffect(() => {
    if (isOpen) {
      const initial = value || minDate || new Date().toISOString().split('T')[0];
      const [y, m, d] = initial.split('-').map(Number);
      setViewDate(new Date(y, m - 1, 1));
      
      // Refresh coordinates in case of layout changes
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX
        });
      }
    }
  }, [isOpen, value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const getFormattedDateStr = (day) => {
    if (!day) return '';
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  const handleDayClick = (day, e) => {
    e.stopPropagation();
    if (!day) return;
    const dateStr = getFormattedDateStr(day);
    
    // Check if weekend
    const dObj = new Date(year, month, day);
    const dayOfWeek = dObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check bounds
    const isOutOfRange = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);

    if (isWeekend || isOutOfRange) return;

    onChange(dateStr);
    setIsOpen(false);
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Select date";
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        ref={buttonRef}
        onClick={toggleOpen}
        className={`px-3 py-2.5 rounded-xl text-left text-xs border w-full font-semibold flex items-center justify-between transition-colors focus:outline-none ${
          darkMode
            ? 'bg-slate-950 border-slate-800 text-white hover:bg-slate-900'
            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
        }`}
      >
        <span>{formatDateDisplay(value)}</span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Calendar Popover (Rendered at Body Level) */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 999999
          }}
          className={`p-3 w-60 rounded-2xl border shadow-xl animate-fadeIn ${
            darkMode
              ? 'bg-slate-950 border-slate-850 text-white'
              : 'bg-white border-slate-205 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-slate-900 text-slate-400' : 'hover:bg-slate-100 text-slate-650'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-black tracking-wide uppercase">
              {monthsList[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-slate-900 text-slate-400' : 'hover:bg-slate-100 text-slate-650'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center font-black text-[9px] uppercase tracking-wider text-slate-450 mb-1.5">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const dateStr = getFormattedDateStr(day);
              
              // Validate constraints
              const dObj = new Date(year, month, day);
              const dayOfWeek = dObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isOutOfRange = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
              const isDisabled = isWeekend || isOutOfRange;

              const isSelected = value === dateStr;

              let cellClass = `h-7 w-7 text-[10px] font-black rounded-lg flex items-center justify-center transition-all `;
              if (isSelected) {
                cellClass += " bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20";
              } else if (isDisabled) {
                cellClass += darkMode
                  ? " text-slate-800 opacity-20 cursor-not-allowed"
                  : " text-slate-300 opacity-20 cursor-not-allowed";
              } else {
                cellClass += darkMode
                  ? " text-slate-350 hover:bg-slate-900 cursor-pointer"
                  : " text-slate-750 hover:bg-slate-100 cursor-pointer";
              }

              return (
                <div
                  key={`day-${day}`}
                  onClick={(e) => !isDisabled && handleDayClick(day, e)}
                  className={cellClass}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
