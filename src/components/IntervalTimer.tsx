import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Flame, BatteryCharging, Zap, Trophy, Sliders } from 'lucide-react';
import { motion } from 'motion/react';
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
  const [config, setConfig] = useState<IntervalConfig>({
    warmupSec: 10,
    workSec: 20,
    restSec: 10,
    totalSets: 8,
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  const [phase, setPhase] = useState<IntervalPhase>('ready');
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [phaseRemaining, setPhaseRemaining] = useState<number>(config.warmupSec);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const totalWorkoutSeconds =
    config.warmupSec +
    config.totalSets * config.workSec +
    (config.totalSets - 1) * config.restSec;

  const handleSoundCue = useCallback((secLeft: number) => {
    if (!soundEnabled) return;
    if (secLeft === 3 || secLeft === 2 || secLeft === 1) {
      playCountdownPip(false, volume);
    } else if (secLeft === 0) {
      playCountdownPip(true, volume);
    }
  }, [soundEnabled, volume]);

  const advanceToNextPhase = useCallback(() => {
    if (phase === 'ready' || phase === 'warmup') {
      setPhase('work');
      setPhaseRemaining(config.workSec);
      if (soundEnabled) playWhistleSound(volume);
    } else if (phase === 'work') {
      if (currentSet < config.totalSets) {
        setPhase('rest');
        setPhaseRemaining(config.restSec);
        if (soundEnabled) playWhistleSound(volume);
      } else {
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
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      setPhase('work');
      setPhaseRemaining(config.workSec);
      if (soundEnabled) playWhistleSound(volume);
    }
  }, [phase, currentSet, config, soundEnabled, volume, totalWorkoutSeconds, onSaveRecord]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRunning && phase !== 'finished') {
      intervalId = setInterval(() => {
        setPhaseRemaining((prev) => {
          if (prev <= 1) {
            advanceToNextPhase();
            return 0;
          }
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

  const handleStart = () => {
    if (soundEnabled) playClickSound();
    if (phase === 'ready' || phase === 'finished') {
      setPhase(config.warmupSec > 0 ? 'warmup' : 'work');
      setCurrentSet(1);
      setPhaseRemaining(config.warmupSec > 0 ? config.warmupSec : config.workSec);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
    setPhase('ready');
    setCurrentSet(1);
    setPhaseRemaining(config.warmupSec > 0 ? config.warmupSec : config.workSec);
  };

  const handleSkip = () => {
    if (soundEnabled) playClickSound();
    advanceToNextPhase();
  };

  const handleSelectPreset = (item: typeof PRESET_WORKOUTS[0]) => {
    if (soundEnabled) playClickSound();
    setConfig(item.config);
    setIsRunning(false);
    setPhase('ready');
    setCurrentSet(1);
    setPhaseRemaining(item.config.warmupSec > 0 ? item.config.warmupSec : item.config.workSec);
  };

  const getPhaseMeta = () => {
    switch (phase) {
      case 'warmup':
        return {
          title: 'KHỞI ĐỘNG',
          color: 'text-sky-400',
          glowClass: 'glow-cyan',
          bg: 'bg-sky-500/15 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.2)]',
          ringColor: '#38bdf8',
          auraColor: 'bg-sky-500/20',
          icon: <BatteryCharging className="w-5 h-5 text-sky-400" />,
        };
      case 'work':
        return {
          title: 'TẬP LUYỆN / BÙNG NỔ',
          color: 'text-emerald-400',
          glowClass: 'glow-emerald',
          bg: 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
          ringColor: '#10b981',
          auraColor: 'bg-emerald-500/25',
          icon: <Flame className="w-5 h-5 text-emerald-400 animate-bounce" />,
        };
      case 'rest':
        return {
          title: 'NGHỈ NGƠI / HỒI SỨC',
          color: 'text-amber-400',
          glowClass: 'glow-amber',
          bg: 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
          ringColor: '#f59e0b',
          auraColor: 'bg-amber-500/20',
          icon: <BatteryCharging className="w-5 h-5 text-amber-400" />,
        };
      case 'finished':
        return {
          title: 'XUẤT SẮC! HOÀN THÀNH',
          color: 'text-purple-400',
          glowClass: 'text-purple-400',
          bg: 'bg-purple-500/20 border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.3)]',
          ringColor: '#a855f7',
          auraColor: 'bg-purple-500/25',
          icon: <Trophy className="w-5 h-5 text-purple-400" />,
        };
      default:
        return {
          title: 'SẴN SÀNG',
          color: 'text-slate-300',
          glowClass: '',
          bg: 'bg-slate-800/60 border-slate-700/60',
          ringColor: '#64748b',
          auraColor: 'bg-slate-500/10',
          icon: <Zap className="w-5 h-5 text-slate-400" />,
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center relative">
      {/* Dynamic Ambient Background Glow Orb */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${currentMeta.auraColor}`}
      />

      {/* Main HIIT Card */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl glass-panel glass-panel-hover">
        {/* Phase Header Banner with Glowing Sheen */}
        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 mb-6 backdrop-blur-md ${currentMeta.bg}`}>
          {currentMeta.icon}
          <span className={`text-xs sm:text-sm font-bold tracking-wider ${currentMeta.color}`}>
            {currentMeta.title}
          </span>
        </div>

        {/* Circular Dial with Phase Remaining */}
        <div className="relative w-76 h-76 sm:w-92 sm:h-92 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            <defs>
              <filter id="hiit-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              cx="150"
              cy="150"
              r="140"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="150"
              cy="150"
              r="140"
              className="transition-[stroke-dashoffset] duration-300 ease-out"
              stroke={currentMeta.ringColor}
              strokeWidth="9"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter={isRunning ? 'url(#hiit-glow)' : undefined}
            />
          </svg>

          {/* Center Digital Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <div className="text-sm font-semibold tracking-wide text-slate-400 mb-1">
              {phase === 'finished' ? (
                'Hoàn thành bài tập'
              ) : (
                <>Hiệp <span className="text-white font-bold text-base">{currentSet}</span> / {config.totalSets}</>
              )}
            </div>

            <div className={`text-6xl sm:text-8xl font-mono font-bold tracking-tight text-white tabular-nums ${currentMeta.glowClass}`}>
              {formatSecondsToTime(phaseRemaining)}
            </div>

            <div className="mt-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-white/5">
              {phase === 'work' && <span>Tiếp theo: Nghỉ ({config.restSec}s)</span>}
              {phase === 'rest' && <span>Tiếp theo: Hiệp {currentSet + 1} ({config.workSec}s)</span>}
              {phase === 'warmup' && <span>Tiếp theo: Hiệp 1 ({config.workSec}s)</span>}
              {phase === 'ready' && <span>Tổng bài tập: {formatSecondsToTime(totalWorkoutSeconds)}</span>}
              {phase === 'finished' && <span>Tổng thời gian: {formatSecondsToTime(totalWorkoutSeconds)}</span>}
            </div>
          </div>
        </div>

        {/* Primary Workout Controls */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleReset}
            className="min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/80 font-semibold text-sm transition-all shadow-md"
            title="Đặt lại bài tập"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>

          {isRunning ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handlePause}
              className="min-h-[50px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:brightness-110 transition-all"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Tạm dừng</span>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleStart}
              className="min-h-[50px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:brightness-110 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{phase === 'ready' ? 'Bắt đầu bài tập' : phase === 'finished' ? 'Tập lại' : 'Tiếp tục'}</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleSkip}
            disabled={phase === 'finished'}
            className="min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/80 font-semibold text-sm transition-all shadow-md disabled:opacity-40"
            title="Bỏ qua giai đoạn hiện tại"
          >
            <SkipForward className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Preset Workout Programs */}
      <div className="w-full mt-8 glass-panel rounded-3xl p-5 sm:p-8">
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
            <motion.button
              key={item.name}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectPreset(item)}
              className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/40 text-left transition-all group"
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
            </motion.button>
          ))}
        </div>

        {/* Custom interval configuration panel */}
        {showConfigDrawer && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
