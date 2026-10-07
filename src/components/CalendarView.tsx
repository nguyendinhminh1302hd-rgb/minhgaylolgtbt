import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Dumbbell,
  BookOpen,
  Trophy,
  Bell,
  Trash2,
  CheckCircle,
  Circle,
  Play,
  Download,
  X,
  Timer as TimerIcon,
} from 'lucide-react';
import { CalendarEvent, EventCategory } from '../types/calendar';
import { SavedRecord, TabMode } from '../types/timer';
import { convertSolarToLunar } from '../utils/lunarCalendar';
import { formatMilliseconds } from '../utils/formatters';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onToggleEventComplete: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  savedRecords: SavedRecord[];
  onNavigateToTab: (tab: TabMode) => void;
}

const CATEGORY_MAP: Record<
  EventCategory,
  { label: string; icon: React.ReactNode; color: string; border: string; bg: string }
> = {
  workout: {
    label: 'Tập luyện thể thao',
    icon: <Dumbbell className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  pomodoro: {
    label: 'Tập trung Pomodoro',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  competition: {
    label: 'Thi đấu & Sự kiện',
    icon: <Trophy className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  reminder: {
    label: 'Nhắc nhở bấm giờ',
    icon: <Bell className="w-3.5 h-3.5" />,
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
};

const EVENT_PRESETS = [
  { title: 'Chạy bộ 5km', category: 'workout' as EventCategory, durationMinutes: 30 },
  { title: 'Tập HIIT Cardio', category: 'workout' as EventCategory, durationMinutes: 20 },
  { title: 'Phiên học Pomodoro', category: 'pomodoro' as EventCategory, durationMinutes: 25 },
  { title: 'Thi đấu giao hữu', category: 'competition' as EventCategory, durationMinutes: 60 },
  { title: 'Luyện tập Plank & Core', category: 'workout' as EventCategory, durationMinutes: 15 },
];

export function CalendarView({
  events,
  onAddEvent,
  onToggleEventComplete,
  onDeleteEvent,
  savedRecords,
  onNavigateToTab,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
  });

  // Modal create event state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<EventCategory>('workout');
  const [newTime, setNewTime] = useState<string>('08:00');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newNotes, setNewNotes] = useState<string>('');

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    // 0 = Sunday, 1 = Monday ... We want Monday as index 0, Sunday as index 6
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentYear, currentMonth]);

  // Previous month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  // Next month navigation
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Go to today
  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`
    );
  };

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [events]);

  // Parse records dates and group by "YYYY-MM-DD"
  const recordsByDate = useMemo(() => {
    const map: Record<string, SavedRecord[]> = {};
    savedRecords.forEach((rec) => {
      // rec.date is format "HH:mm:ss, DD/MM/YYYY" or similar locale
      const match = rec.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        const dateKey = `${match[3]}-${match[2]}-${match[1]}`;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(rec);
      }
    });
    return map;
  }, [savedRecords]);

  // Selected date info
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  const selectedLunarInfo = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return convertSolarToLunar(d, m, y);
  }, [selectedDateStr]);

  const selectedDateEvents = eventsByDate[selectedDateStr] || [];
  const selectedDateRecords = recordsByDate[selectedDateStr] || [];

  // Create event submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddEvent({
      title: newTitle.trim(),
      date: selectedDateStr,
      time: newTime || undefined,
      category: newCategory,
      durationMinutes: newDuration > 0 ? newDuration : undefined,
      notes: newNotes.trim() || undefined,
      completed: false,
    });

    setNewTitle('');
    setNewNotes('');
    setIsCreateOpen(false);
  };

  // Export events to .ics file
  const handleExportICS = () => {
    if (events.length === 0) return;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ChronoTime//Lich Bam Gio//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((evt) => {
      const cleanDate = evt.date.replace(/-/g, '');
      const startTime = evt.time ? evt.time.replace(':', '') + '00' : '080000';
      const durationHours = Math.floor((evt.durationMinutes || 30) / 60);
      const durationMins = (evt.durationMinutes || 30) % 60;
      const endMins = (parseInt(startTime.slice(2, 4)) || 0) + durationMins;
      const endHours = (parseInt(startTime.slice(0, 2)) || 8) + durationHours + Math.floor(endMins / 60);
      const endTime = `${String(endHours % 24).padStart(2, '0')}${String(endMins % 60).padStart(2, '0')}00`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${evt.id}@chronotime.app`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
      lines.push(`DTSTART:${cleanDate}T${startTime}`);
      lines.push(`DTEND:${cleanDate}T${endTime}`);
      lines.push(`SUMMARY:${evt.title}`);
      if (evt.notes) lines.push(`DESCRIPTION:${evt.notes}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-luyen-tap-${selectedDateStr}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Top Banner & Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Lịch Luyện Tập & Sự Kiện
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Tháng {currentMonth + 1}/{currentYear}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lên kế hoạch hẹn giờ, theo dõi lịch tập thể thao và tích hợp Âm lịch Việt Nam
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700/60"
          >
            Hôm nay
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-white min-w-[90px] text-center">
              T{currentMonth + 1} / {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportICS}
            disabled={events.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title="Xuất file .ics để nhập vào Google Calendar"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất .ics</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm sự kiện</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Monthly Matrix */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
              <div
                key={w}
                className={`py-1.5 text-xs font-semibold ${
                  idx === 6 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty offset days from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[64px] sm:min-h-[78px] rounded-2xl bg-slate-950/20 border border-transparent p-1.5 opacity-30 select-none"
              />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDateStr;
              const isCurrentDay =
                today.getFullYear() === currentYear &&
                today.getMonth() === currentMonth &&
                today.getDate() === dayNum;

              // Lunar calculation
              const lunar = convertSolarToLunar(dayNum, currentMonth + 1, currentYear);
              const isLunarFirstOr15 = lunar.day === 1 || lunar.day === 15;

              // Counts
              const dayEvents = eventsByDate[dateStr] || [];
              const dayRecords = recordsByDate[dateStr] || [];
              const hasActivity = dayEvents.length > 0 || dayRecords.length > 0;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[64px] sm:min-h-[78px] rounded-2xl p-1.5 sm:p-2 text-left flex flex-col justify-between transition-all relative border ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                      : isCurrentDay
                      ? 'bg-slate-800/80 border-slate-700/90 text-white'
                      : 'bg-slate-800/30 hover:bg-slate-800/60 border-slate-700/40 text-slate-300'
                  }`}
                >
                  {/* Top row: Solar day + Lunar day */}
                  <div className="flex items-start justify-between w-full">
                    <span
                      className={`text-sm sm:text-base font-bold font-mono ${
                        isCurrentDay
                          ? 'text-emerald-400'
                          : isSelected
                          ? 'text-emerald-300'
                          : 'text-white'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Lunar Date subscript */}
                    <span
                      className={`text-[10px] font-mono leading-none ${
                        isLunarFirstOr15
                          ? 'text-amber-400 font-semibold'
                          : 'text-slate-500'
                      }`}
                      title={`Âm lịch: ${lunar.day}/${lunar.month}`}
                    >
                      {lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day}
                    </span>
                  </div>

                  {/* Activity Indicator Dots */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <span
                        key={evt.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          evt.category === 'workout'
                            ? 'bg-emerald-400'
                            : evt.category === 'pomodoro'
                            ? 'bg-sky-400'
                            : evt.category === 'competition'
                            ? 'bg-amber-400'
                            : 'bg-purple-400'
                        }`}
                      />
                    ))}
                    {dayRecords.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Đã có lần bấm giờ" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Legend bar */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Tập luyện
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Pomodoro
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Thi đấu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Đã bấm giờ
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Số nhỏ góc phải: Ngày Âm lịch (Vàng: Mùng 1 & Rằm)
            </span>
          </div>
        </div>

        {/* Selected Day Details & Schedule Panel */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col">
          {/* Day Header */}
          <div className="pb-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-semibold text-emerald-400 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Chi tiết ngày</span>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="text-lg font-bold text-white mt-1 capitalize">
              {selectedDateObj.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>

            {/* Vietnamese Lunar Date readout */}
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Âm lịch:</span>
              <strong className="text-amber-400 font-medium">
                Ngày {selectedLunarInfo.day} tháng {selectedLunarInfo.month} ({selectedLunarInfo.canChiYear})
              </strong>
            </div>
          </div>

          {/* Events for this day */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[460px]">
            {selectedDateEvents.length === 0 && selectedDateRecords.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  Chưa có lịch hẹn hoặc bài tập nào trong ngày này.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 inline-flex items-center gap-1 transition-colors border border-slate-700/60"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lên lịch mới</span>
                </button>
              </div>
            ) : (
              <>
                {/* Scheduled Planned Events */}
                {selectedDateEvents.map((evt) => {
                  const meta = CATEGORY_MAP[evt.category];

                  return (
                    <div
                      key={evt.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        evt.completed
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                          : `${meta.bg} ${meta.border}`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => onToggleEventComplete(evt.id)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                            title={evt.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                          >
                            {evt.completed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          <div>
                            <div
                              className={`text-sm font-bold ${
                                evt.completed ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {evt.title}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              {evt.time && <span>{evt.time}</span>}
                              {evt.time && evt.durationMinutes && <span>·</span>}
                              {evt.durationMinutes && <span>{evt.durationMinutes} phút</span>}
                            </div>

                            {evt.notes && (
                              <p className="text-xs text-slate-400 mt-1.5 italic">
                                {evt.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Quick Start Timer button */}
                          <button
                            onClick={() => {
                              if (evt.category === 'workout') onNavigateToTab('interval');
                              else if (evt.category === 'pomodoro') onNavigateToTab('timer');
                              else onNavigateToTab('stopwatch');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                            title="Bắt đầu bấm giờ ngay"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            onClick={() => onDeleteEvent(evt.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Xóa sự kiện"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Actual Recorded Timing Sessions for this day */}
                {selectedDateRecords.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <TimerIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Kết quả đã bấm giờ trong ngày ({selectedDateRecords.length})</span>
                    </div>

                    <div className="space-y-2">
                      {selectedDateRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {rec.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {rec.date}
                            </div>
                          </div>
                          <div className="font-mono text-xs font-bold text-cyan-400">
                            {formatMilliseconds(rec.totalTime)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Thêm Lịch Bấm Giờ / Sự Kiện</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ngày: <strong className="text-emerald-400">{selectedDateStr}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-4">
              <label className="text-xs text-slate-400 font-medium block mb-2">
                Chọn nhanh sự kiện mẫu:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => {
                      setNewTitle(p.title);
                      setNewCategory(p.category);
                      setNewDuration(p.durationMinutes);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700/60"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Tiêu đề sự kiện:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chạy bộ sáng, Luyện tập HIIT..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Loại sự kiện:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="workout">Tập luyện thể thao</option>
                    <option value="pomodoro">Tập trung Pomodoro</option>
                    <option value="competition">Thi đấu & Sự kiện</option>
                    <option value="reminder">Nhắc nhở bấm giờ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Giờ thực hiện:
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Thời lượng dự kiến (phút):
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Ghi chú thêm:
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu vòng chạy, số hiệp tập..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-md"
                >
                  Lưu vào lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
