import { TabMode } from '../types/timer';
import { Timer, Clock, Activity, Calendar, History, Settings, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface HeaderProps {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  savedCount: number;
}

export function Header({
  activeTab,
  onTabChange,
  isFullscreen,
  onToggleFullscreen,
  onOpenSettings,
  onOpenHistory,
  soundEnabled,
  onToggleSound,
  savedCount,
}: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('stopwatch')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all">
              <Timer className="w-4 h-4" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              ChronoTime
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-900/90 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => onTabChange('stopwatch')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'stopwatch'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <span>Bấm Giờ</span>
          </button>

          <button
            onClick={() => onTabChange('timer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'timer'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Đếm Ngược</span>
          </button>

          <button
            onClick={() => onTabChange('interval')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'interval'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>HIIT</span>
          </button>

          <button
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'calendar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Lịch</span>
          </button>

          <button
            onClick={() => onTabChange('clock')}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === 'clock'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>Giờ Chuẩn</span>
          </button>
        </nav>

        {/* Zone 3: Primary Utility Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sound Toggle with Mini Equalizer */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            className="h-9 px-2.5 flex items-center gap-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <div className="flex items-end gap-0.5 h-3.5 w-3">
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-audio-1" />
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-audio-2" />
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-audio-3" />
                </div>
              </>
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={onOpenHistory}
            title="Lịch sử lưu trữ"
            aria-label="Lịch sử lưu trữ"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            <History className="w-4 h-4" />
            {savedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            )}
          </button>

          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            title="Cài đặt"
            aria-label="Cài đặt"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
