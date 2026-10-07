import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Flame, BatteryCharging, Zap, Trophy, Sliders } from 'lucide-react';
import confetti from 'canvas-confetti';
import { IntervalConfig, IntervalPhase, SavedRecord } from '../types/timer';
import { formatSecondsToTime } from '../utils/formatters';
import { playCountdownPip, playWhistleSound, playClickSound } from '../utils/audio';

interface IntervalTimerProps {
  soundEnabled: boolean;
  volume: number;
  onSaveRecord: (record: Omit<SavedRecord, 'id' | 'date'>) => void;
}

const PRESET_WORKOUTS = [
  {
    name: 'Tabata Cổ Điển',
    description: '20s dốc sức / 10s nghỉ ngơi',
    config: { warmupSec: 10, workSec: 20, restSec: 10, totalSets: 8 },
  },
  {
    name: 'HIIT Cường Độ Cao',
    description: '40s bùng nổ / 20s phục hồi',
    config: { warmupSec: 15, workSec: 40, restSec: 20, totalSets: 6 },
  },
  {
    name: 'Boxing Hiệp Đấu',
    description: '3 phút đấu / 1 phút nghỉ',
    config: { warmupSec: 10, workSec: 180, restSec: 60, totalSets: 5 },
  },
  {
    name: 'Plank & Bụng',
    description: '45s gồng bụng / 15s nghỉ',
    config: { warmupSec: 10, workSec: 45, restSec: 15, totalSets: 6 },
  },
];

export function IntervalTimer({ soundEnabled, volume, onSaveRecord }: IntervalTimerProps) {
  // Config
  const [config, setConfig] = useState<IntervalConfig>({
    warmupSec: 10,
    workSec: 20,
    restSec: 10,
    totalSets: 8,
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Runtime
  const [phase, setPhase] = useState<IntervalPhase>('ready');
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [phaseRemaining, setPhaseRemaining] = useState<number>(config.warmupSec);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Calculate total workout duration
  const totalWorkoutSeconds =
    config.warmupSec +
    config.totalSets * config.workSec +
    (config.totalSets - 1) * config.restSec;

  // Sound cue trigger
  const handleSoundCue = useCallback((secLeft: number) => {
    if (!soundEnabled) return;
    if (secLeft === 3 || secLeft === 2 || secLeft === 1) {
      playCountdownPip(false, volume);
    } else if (secLeft === 0) {
      playCountdownPip(true, volume);
    }
  }, [soundEnabled, volume]);

  // Transition to next phase
  const advanceToNextPhase = useCallback(() => {
    if (phase === 'ready' || phase === 'warmup') {
      // Warmup finished -> Start Set 1 Work
      setPhase('work');
      setPhaseRemaining(config.workSec);
      if (soundEnabled) playWhistleSound(volume);
    } else if (phase === 'work') {
      if (currentSet < config.totalSets) {
        // Go to Rest
        setPhase('rest');
        setPhaseRemaining(config.restSec);
        if (soundEnabled) playWhistleSound(volume);
      } else {
        // Workout Finished!
        setPhase('finished');
        setIsRunning(false);
        try {
          confetti({ particleCount: 100, spread: 80 });
        } catch {
          // ignore
        }
        if (soundEnabled) playWhistleSound(volume);

        onSaveRecord({
          type: 'interval',
          title: `HIIT hoàn thành (${config.totalSets} hiệp)`,
          totalTime: totalWorkoutSeconds * 1000,
          intervalDetails: {
            sets: config.totalSets,
            workSec: config.workSec,
            restSec: config.restSec,
          },
        });
      }
    } else if (phase === 'rest') {
      // Rest finished -> Next Set Work
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      setPhase('work');
      setPhaseRemaining(config.workSec);
      if (soundEnabled) playWhistleSound(volume);
    }
  }, [phase, currentSet, config, soundEnabled, volume, totalWorkoutSeconds, onSaveRecord]);

  // Main countdown timer interval
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRunning && phase !== 'finished') {
      intervalId = setInterval(() => {
        setPhaseRemaining((prev) => {
          if (prev <= 1) {
            advanceToNextPhase();
            return 0;
          }
          // Beep at 3, 2, 1
          if (prev <= 4) {
            handleSoundCue(prev - 1);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, phase, advanceToNextPhase, handleSoundCue]);

  // Start workout
  const handleStart = () => {
    if (soundEnabled) playClickSound();
    if (phase === 'ready' || phase === 'finished') {
      setPhase(config.warmupSec > 0 ? 'warmup' : 'work');
      setCurrentSet(1);
      setPhaseRemaining(config.warmupSec > 0 ? config.warmupSec : config.workSec);
    }
    setIsRunning(true);
  };

  // Pause
  const handlePause = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
  };

  // Reset
  const handleReset = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
    setPhase('ready');
    setCurrentSet(1);
    setPhaseRemaining(config.warmupSec > 0 ? config.warmupSec : config.workSec);
  };

  // Skip current phase
  const handleSkip = () => {
    if (soundEnabled) playClickSound();
    advanceToNextPhase();
  };

  // Pick preset
  const handleSelectPreset = (item: typeof PRESET_WORKOUTS[0]) => {
    if (soundEnabled) playClickSound();
    setConfig(item.config);
    setIsRunning(false);
    setPhase('ready');
    setCurrentSet(1);
    setPhaseRemaining(item.config.warmupSec > 0 ? item.config.warmupSec : item.config.workSec);
  };

  // Phase color and titles
  const getPhaseMeta = () => {
    switch (phase) {
      case 'warmup':
        return {
          title: 'KHỞI ĐỘNG',
          color: 'text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/30',
          ringColor: '#38bdf8',
          icon: <BatteryCharging className="w-6 h-6 text-sky-400" />,
        };
      case 'work':
        return {
          title: 'TẬP LUYỆN / BÙNG NỔ',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/15 border-emerald-500/40',
          ringColor: '#10b981',
          icon: <Flame className="w-6 h-6 text-emerald-400 animate-bounce" />,
        };
      case 'rest':
        return {
          title: 'NGHỈ NGƠI / HỒI SỨC',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
          ringColor: '#f59e0b',
          icon: <BatteryCharging className="w-6 h-6 text-amber-400" />,
        };
      case 'finished':
        return {
          title: 'XUẤT SẮC! HOÀN THÀNH',
          color: 'text-purple-400',
          bg: 'bg-purple-500/15 border-purple-500/30',
          ringColor: '#a855f7',
          icon: <Trophy className="w-6 h-6 text-purple-400" />,
        };
      default:
        return {
          title: 'SẴN SÀNG',
          color: 'text-slate-300',
          bg: 'bg-slate-800/40 border-slate-700/50',
          ringColor: '#64748b',
          icon: <Zap className="w-6 h-6 text-slate-400" />,
        };
    }
  };

  const currentMeta = getPhaseMeta();
  const currentTotalForPhase =
    phase === 'warmup'
      ? config.warmupSec
      : phase === 'work'
      ? config.workSec
      : phase === 'rest'
      ? config.restSec
      : 1;

  const phaseFraction = currentTotalForPhase > 0 ? phaseRemaining / currentTotalForPhase : 0;
  const strokeDashoffset = 880 - 880 * phaseFraction;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* HIIT Hero Display Card */}
      <div
        className={`w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl border transition-all duration-300 shadow-2xl backdrop-blur-xl ${
          phase === 'work'
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : phase === 'rest'
            ? 'bg-amber-950/20 border-amber-500/40'
            : 'bg-slate-900/60 border-slate-800/80'
        }`}
      >
        {/* Phase Header Banner */}
        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 mb-6 ${currentMeta.bg}`}>
          {currentMeta.icon}
          <span className={`text-sm sm:text-base font-bold tracking-wider ${currentMeta.color}`}>
            {currentMeta.title}
          </span>
        </div>

        {/* Circular Dial with Phase Remaining */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            <circle
              cx="150"
              cy="150"
              r="140"
              className="stroke-slate-800/80"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="150"
              cy="150"
              r="140"
              className="transition-[stroke-dashoffset] duration-300 ease-out"
              stroke={currentMeta.ringColor}
              strokeWidth="10"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            {/* Set indicator */}
            <div className="text-sm font-semibold tracking-wide text-slate-400 mb-1">
              {phase === 'finished' ? (
                'Hoàn thành tất cả hiệp'
              ) : (
                <>Hiệp <span className="text-white font-bold text-base">{currentSet}</span> / {config.totalSets}</>
              )}
            </div>

            {/* Main countdown digits */}
            <div className="text-6xl sm:text-8xl font-mono font-bold tracking-tight text-white tabular-nums">
              {formatSecondsToTime(phaseRemaining)}
            </div>

            {/* Next phase preview */}
            <div className="mt-2 text-xs text-slate-400">
              {phase === 'work' && (
                <span>Tiếp theo: Nghỉ ({config.restSec}s)</span>
              )}
              {phase === 'rest' && (
                <span>Tiếp theo: Hiệp {currentSet + 1} ({config.workSec}s)</span>
              )}
              {phase === 'warmup' && (
                <span>Tiếp theo: Hiệp 1 ({config.workSec}s)</span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Workout Controls */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          <button
            onClick={handleReset}
            className="min-h-[48px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 border border-slate-700/60 font-semibold text-sm transition-all"
            title="Đặt lại bài tập"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isRunning ? (
            <button
              onClick={handlePause}
              className="min-h-[48px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Tạm dừng</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="min-h-[48px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{phase === 'ready' ? 'Bắt đầu bài tập' : phase === 'finished' ? 'Tập lại' : 'Tiếp tục'}</span>
            </button>
          )}

          <button
            onClick={handleSkip}
            disabled={phase === 'finished'}
            className="min-h-[48px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 border border-slate-700/60 font-semibold text-sm transition-all disabled:opacity-40"
            title="Bỏ qua giai đoạn hiện tại"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Workout Programs */}
      <div className="w-full mt-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            Chương trình luyện tập gợi ý
          </h3>
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showConfigDrawer ? 'Ẩn tùy chỉnh' : 'Tùy chỉnh hiệp tập'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_WORKOUTS.map((item) => (
            <button
              key={item.name}
              onClick={() => handleSelectPreset(item)}
              className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-emerald-500/40 text-left transition-all group"
            >
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                {item.name}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {item.description}
              </div>
              <div className="mt-2 text-xs font-mono text-emerald-400 font-semibold">
                {item.config.totalSets} hiệp · {item.config.workSec}s tập / {item.config.restSec}s nghỉ
              </div>
            </button>
          ))}
        </div>

        {/* Custom interval configuration panel */}
        {showConfigDrawer && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Khởi động (giây):</label>
              <input
                type="number"
                min="0"
                max="300"
                value={config.warmupSec}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, warmupSec: Math.max(0, parseInt(e.target.value) || 0) }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Tập luyện (giây):</label>
              <input
                type="number"
                min="5"
                max="600"
                value={config.workSec}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, workSec: Math.max(5, parseInt(e.target.value) || 5) }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nghỉ ngơi (giây):</label>
              <input
                type="number"
                min="0"
                max="300"
                value={config.restSec}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, restSec: Math.max(0, parseInt(e.target.value) || 0) }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Số hiệp (Sets):</label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.totalSets}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, totalSets: Math.max(1, parseInt(e.target.value) || 1) }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
