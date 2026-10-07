/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TabMode, SavedRecord, AppSettings } from './types/timer';
import { Header } from './components/Header';
import { Stopwatch } from './components/Stopwatch';
import { CountdownTimer } from './components/CountdownTimer';
import { IntervalTimer } from './components/IntervalTimer';
import { WorldClock } from './components/WorldClock';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { Timer, Clock, Activity, Globe } from 'lucide-react';

const STORAGE_KEY_RECORDS = 'chrono_saved_records_v1';
const STORAGE_KEY_SETTINGS = 'chrono_app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundType: 'alarm',
  volume: 0.8,
  wakeLockEnabled: true,
  theme: 'dark',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabMode>('stopwatch');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // History Records
  const [records, setRecords] = useState<SavedRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read records from localStorage', e);
    }
    return [];
  });

  // Wake lock sentinel ref
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  // Save records on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  // Screen WakeLock management
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && settings.wakeLockEnabled) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake lock error:', err);
      }
    }
  }, [settings.wakeLockEnabled]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (settings.wakeLockEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && settings.wakeLockEnabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [settings.wakeLockEnabled, requestWakeLock, releaseWakeLock]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }, []);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global keyboard shortcuts (F for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Save Record
  const handleSaveRecord = (recordData: Omit<SavedRecord, 'id' | 'date'>) => {
    const newRecord: SavedRecord = {
      ...recordData,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllRecords = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả lịch sử lưu trữ?')) {
      setRecords([]);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Determine root container style based on theme
  const getThemeClass = () => {
    if (settings.theme === 'oled') return 'bg-black text-slate-100';
    if (settings.theme === 'slate') return 'bg-slate-900 text-slate-100';
    return 'bg-slate-950 text-slate-100';
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${getThemeClass()}`}>
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        soundEnabled={settings.soundEnabled}
        onToggleSound={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
        savedCount={records.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center pb-24 sm:pb-12">
        {activeTab === 'stopwatch' && (
          <Stopwatch
            soundEnabled={settings.soundEnabled}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {activeTab === 'timer' && (
          <CountdownTimer
            soundEnabled={settings.soundEnabled}
            soundType={settings.soundType}
            volume={settings.volume}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {activeTab === 'interval' && (
          <IntervalTimer
            soundEnabled={settings.soundEnabled}
            volume={settings.volume}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {activeTab === 'clock' && <WorldClock />}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar (thumb navigation) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1">
        <div className="grid grid-cols-4 items-center h-14">
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'stopwatch' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Bấm giờ</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'timer' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Đếm ngược</span>
          </button>

          <button
            onClick={() => setActiveTab('interval')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'interval' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">HIIT</span>
          </button>

          <button
            onClick={() => setActiveTab('clock')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'clock' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Giờ chuẩn</span>
          </button>
        </div>
      </div>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={records}
        onDeleteRecord={handleDeleteRecord}
        onClearAll={handleClearAllRecords}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
