import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { SoundEffectType, SavedRecord } from '../types/timer';
import { formatSecondsToTime, formatHumanVietnamese } from '../utils/formatters';
import { playClickSound, startAlarmSound } from '../utils/audio';

interface CountdownTimerProps {
  soundEnabled: boolean;
  soundType: SoundEffectType;
  volume: number;
  onSaveRecord: (record: Omit<SavedRecord, 'id' | 'date'>) => void;
}

const PRESETS = [
  { label: '1 phút', seconds: 60 },
  { label: '3 phút', seconds: 180 },
  { label: '5 phút', seconds: 300 },
  { label: '10 phút', seconds: 600 },
  { label: '15 phút', seconds: 900 },
  { label: '25 phút (Pomodoro)', seconds: 1500 },
  { label: '30 phút', seconds: 1800 },
  { label: '45 phút', seconds: 2700 },
  { label: '60 phút', seconds: 3600 },
];

export function CountdownTimer({ soundEnabled, soundType, volume, onSaveRecord }: CountdownTimerProps) {
  const [hoursInput, setHoursInput] = useState<number>(0);
  const [minutesInput, setMinutesInput] = useState<number>(5);
  const [secondsInput, setSecondsInput] = useState<number>(0);

  const [totalInitialSeconds, setTotalInitialSeconds] = useState<number>(300);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const stopAlarmRef = useRef<(() => void) | null>(null);

  const triggerAlarm = useCallback(() => {
    setIsFinished(true);
    setIsRunning(false);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    if (soundEnabled) {
      stopAlarmRef.current = startAlarmSound(soundType, volume);
    }

    onSaveRecord({
      type: 'timer',
      title: `Đếm ngược hoàn thành (${formatHumanVietnamese(totalInitialSeconds * 1000)})`,
      totalTime: totalInitialSeconds * 1000,
    });
  }, [soundEnabled, soundType, volume, totalInitialSeconds, onSaveRecord]);

  useEffect(() => {
    return () => {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRunning && remainingSeconds > 0) {
      intervalId = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            triggerAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, remainingSeconds, triggerAlarm]);

  const handleSelectPreset = (sec: number) => {
    if (soundEnabled) playClickSound();
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    setHoursInput(h);
    setMinutesInput(m);
    setSecondsInput(s);
    setTotalInitialSeconds(sec);
    setRemainingSeconds(sec);
    setIsRunning(false);
    setIsFinished(false);

    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
  };

  const handleStart = () => {
    const calculatedTotal = hoursInput * 3600 + minutesInput * 60 + secondsInput;
    if (calculatedTotal <= 0) return;

    if (soundEnabled) playClickSound();

    if (remainingSeconds === 0 || remainingSeconds !== totalInitialSeconds && !isRunning) {
      setTotalInitialSeconds(calculatedTotal);
      setRemainingSeconds(calculatedTotal);
    }

    setIsFinished(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (soundEnabled) playClickSound();
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    const currentInit = hoursInput * 3600 + minutesInput * 60 + secondsInput;
    setIsRunning(false);
    setIsFinished(false);
    setTotalInitialSeconds(currentInit > 0 ? currentInit : 300);
    setRemainingSeconds(currentInit > 0 ? currentInit : 300);
  };

  const handleAdjustTime = (deltaSec: number) => {
    if (soundEnabled) playClickSound();
    setRemainingSeconds((prev) => {
      const updated = Math.max(0, prev + deltaSec);
      if (updated > totalInitialSeconds) {
        setTotalInitialSeconds(updated);
      }
      return updated;
    });
  };

  const handleDismissAlarm = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setIsFinished(false);
    handleReset();
  };

  const handleRepeatTimer = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setIsFinished(false);
    setRemainingSeconds(totalInitialSeconds);
    setIsRunning(true);
  };

  const progress = totalInitialSeconds > 0 ? remainingSeconds / totalInitialSeconds : 0;
  const strokeDashoffset = 880 - 880 * progress;

  // Pointer angle on the circular arc (counter-clockwise or drain clockwise)
  const angleRad = (1 - progress) * 2 * Math.PI - Math.PI / 2;
  const pointerX = 150 + 140 * Math.cos(angleRad);
  const pointerY = 150 + 140 * Math.sin(angleRad);

  const isCritical = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center relative">
      {/* Dynamic Ambient Background Glow Orb */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
          isCritical
            ? 'bg-rose-500/25 scale-110'
            : isRunning
            ? 'bg-emerald-500/20 scale-105'
            : 'bg-emerald-500/5 scale-90'
        }`}
      />

      {/* Alarm ringing alert banner with spring bounce animation */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full mb-6 p-6 rounded-3xl bg-amber-500/20 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.3)] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white glow-amber">Hết giờ đếm ngược!</h3>
                <p className="text-sm text-amber-300">
                  Thời gian {formatHumanVietnamese(totalInitialSeconds * 1000)} đã hoàn thành trọn vẹn.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRepeatTimer}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 text-sm font-semibold transition-colors border border-white/10"
              >
                Lặp lại
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDismissAlarm}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 text-sm font-bold shadow-lg shadow-amber-400/30 transition-colors"
              >
                Tắt chuông
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Countdown Card */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl glass-panel glass-panel-hover">
        {/* Status kicker */}
        <div className="mb-4 flex items-center gap-2 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              isRunning ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-400 uppercase tracking-widest text-[11px]">
            {isRunning ? 'Timer Running' : remainingSeconds === 0 ? 'Completed' : 'Ready'}
          </span>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-76 h-76 sm:w-92 sm:h-92 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            <defs>
              <filter id="timer-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dial Background */}
            <circle
              cx="150"
              cy="150"
              r="140"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="6"
              fill="transparent"
            />

            {/* Glowing countdown track */}
            <circle
              cx="150"
              cy="150"
              r="140"
              className="transition-[stroke-dashoffset] duration-500 ease-out"
              stroke={
                isCritical
                  ? '#f43f5e'
                  : isRunning
                  ? '#10b981'
                  : '#64748b'
              }
              strokeWidth="7"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter={isRunning ? 'url(#timer-glow)' : undefined}
            />

            {/* Glowing Pointer Head */}
            {remainingSeconds > 0 && remainingSeconds < totalInitialSeconds && (
              <circle
                cx={pointerX}
                cy={pointerY}
                r="6"
                fill={isCritical ? '#f43f5e' : '#10b981'}
                filter="url(#timer-glow)"
              />
            )}
          </svg>

          {/* Time digits in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <div className="h-6 mb-1 text-xs font-semibold tracking-wider uppercase text-slate-400 font-mono">
              {Math.round(progress * 100)}% còn lại
            </div>

            <div
              className={`text-5xl sm:text-7xl font-mono font-bold tracking-tight tabular-nums ${
                isCritical
                  ? 'text-rose-400 glow-rose animate-pulse'
                  : isRunning
                  ? 'text-white glow-emerald'
                  : 'text-white'
              }`}
            >
              {formatSecondsToTime(remainingSeconds, totalInitialSeconds >= 3600)}
            </div>

            <div className="mt-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-white/5">
              Tổng thời gian: {formatSecondsToTime(totalInitialSeconds)}
            </div>
          </div>
        </div>

        {/* Quick adjustment buttons with motion hover */}
        <div className="mt-4 flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => handleAdjustTime(60)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors border border-white/10 shadow-sm"
          >
            <Plus className="w-3 h-3" /> 1 phút
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => handleAdjustTime(30)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors border border-white/10 shadow-sm"
          >
            <Plus className="w-3 h-3" /> 30 giây
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => handleAdjustTime(-30)}
            disabled={remainingSeconds <= 30}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Minus className="w-3 h-3" /> 30 giây
          </motion.button>
        </div>

        {/* Primary Controls */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleReset}
            className="min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/80 font-semibold text-sm transition-all shadow-md"
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
              disabled={remainingSeconds === 0 && hoursInput === 0 && minutesInput === 0 && secondsInput === 0}
              className="min-h-[50px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:brightness-110 transition-all disabled:opacity-40"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{remainingSeconds < totalInitialSeconds ? 'Tiếp tục' : 'Bắt đầu'}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="w-full mt-8 glass-panel rounded-3xl p-5 sm:p-8">
        <h3 className="text-base font-semibold text-white mb-4">
          Thời gian đếm ngược cài sẵn
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {PRESETS.map((preset) => (
            <motion.button
              key={preset.seconds}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectPreset(preset.seconds)}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                totalInitialSeconds === preset.seconds
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-800/40 hover:bg-slate-800 border-white/5 text-slate-300'
              }`}
            >
              <div className="text-sm font-semibold">{preset.label}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {formatSecondsToTime(preset.seconds)}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Custom duration inputs */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-sm font-semibold text-white mb-3">
            Tùy chỉnh thời gian:
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Giờ:</label>
              <input
                type="number"
                min="0"
                max="99"
                value={hoursInput}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setHoursInput(val);
                  const total = val * 3600 + minutesInput * 60 + secondsInput;
                  setTotalInitialSeconds(total);
                  setRemainingSeconds(total);
                }}
                className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Phút:</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutesInput}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  setMinutesInput(val);
                  const total = hoursInput * 3600 + val * 60 + secondsInput;
                  setTotalInitialSeconds(total);
                  setRemainingSeconds(total);
                }}
                className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Giây:</label>
              <input
                type="number"
                min="0"
                max="59"
                value={secondsInput}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  setSecondsInput(val);
                  const total = hoursInput * 3600 + minutesInput * 60 + val;
                  setTotalInitialSeconds(total);
                  setRemainingSeconds(total);
                }}
                className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                const total = hoursInput * 3600 + minutesInput * 60 + secondsInput;
                if (total > 0) {
                  setTotalInitialSeconds(total);
                  setRemainingSeconds(total);
                  setIsRunning(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
