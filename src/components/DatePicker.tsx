import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  min?: string;
}

export default function DatePicker({ value, onChange, className, placeholder = "Vyberte datum", min }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  // Parse current value or default to today
  const parsedDate = value ? new Date(value) : null;
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const [viewDate, setViewDate] = useState(initialMonth);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewDate(d);
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Helper to format date as YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Helper to format Czech display date: DD. MM. YYYY
  const getDisplayValue = () => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parseInt(parts[2])}. ${parseInt(parts[1])}. ${parts[0]}`;
    }
    return value;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // First day of current month (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  // Generate grid cells
  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isDisabled: boolean }[] = [];

  // Prev month padding cells
  for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
    const d = totalDaysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = formatDateString(prevYear, prevMonthIdx, d);
    const isDisabled = min ? dateStr < min : false;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: false, isDisabled });
  }

  // Current month cells
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = formatDateString(year, month, d);
    const isDisabled = min ? dateStr < min : false;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: true, isDisabled });
  }

  // Next month padding cells
  const remaining = 42 - cells.length; // 6 rows of 7 days
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = formatDateString(nextYear, nextMonthIdx, d);
    const isDisabled = min ? dateStr < min : false;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: false, isDisabled });
  }

  // Month names in Czech
  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  const handleDayClick = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const todayStr = (() => {
    const now = new Date();
    return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-none pl-3 pr-9 py-1.5 text-left font-mono text-xs outline-none shadow-sm cursor-pointer flex items-center justify-between text-slate-850 dark:text-slate-200 font-medium h-[28px] ${className || ""}`}
        >
          <span>{getDisplayValue() || placeholder}</span>
          <CalendarIcon size={12} className="text-slate-400 dark:text-zinc-505 pointer-events-none" />
        </button>
      </div>

      {isOpen && triggerRect && mounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${triggerRect.bottom}px`,
            left: `${triggerRect.left}px`,
            width: `${triggerRect.width < 256 ? 256 : triggerRect.width}px`,
          }}
          className="z-[9999] mt-1 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] shadow-xl rounded-none p-3.5 select-none animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-655 dark:text-zinc-400 cursor-pointer rounded-none transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-[10px] font-semibold text-slate-700 dark:text-zinc-200 uppercase tracking-widest">
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-655 dark:text-zinc-400 cursor-pointer rounded-none transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((day) => (
              <span key={day} className="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ dateStr, dayNum, isCurrentMonth, isDisabled }, idx) => {
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(dateStr, isDisabled)}
                  className={`py-1.5 text-[10px] font-medium transition-all rounded-none cursor-pointer text-center outline-none flex items-center justify-center ${
                    isSelected
                      ? "bg-tenant-primary text-white shadow-md shadow-tenant-primary/15"
                      : isToday
                      ? "border border-tenant-primary text-tenant-primary bg-tenant-primary/5"
                      : isCurrentMonth
                      ? "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-850"
                      : "text-slate-350 dark:text-zinc-650 hover:bg-slate-100/50 dark:hover:bg-zinc-900/30"
                  } ${isDisabled ? "opacity-20 cursor-not-allowed pointer-events-none" : ""}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="flex justify-between items-center border-t border-slate-150 dark:border-[#1F1F35]/50 mt-3 pt-2 text-[9px] font-medium uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-455 cursor-pointer"
            >
              Vymazat
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(formatDateString(now.getFullYear(), now.getMonth(), now.getDate()));
                setIsOpen(false);
              }}
              className="text-tenant-primary hover:text-tenant-primary/80 cursor-pointer"
            >
              Dnes
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
