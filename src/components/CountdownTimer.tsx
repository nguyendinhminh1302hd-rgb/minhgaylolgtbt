import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Bell, BellOff, Sparkles, CheckCircle2 } from 'lucide-react';
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
  // Input settings when timer is not running
  const [hoursInput, setHoursInput] = useState<number>(0);
  const [minutesInput, setMinutesInput] = useState<number>(5);
  const [secondsInput, setSecondsInput] = useState<number>(0);

  // Runtime states
  const [totalInitialSeconds, setTotalInitialSeconds] = useState<number>(300);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Alarm sound stopper
  const stopAlarmRef = useRef<(() => void) | null>(null);

  // Trigger audio alarm and victory celebration
  const triggerAlarm = useCallback(() => {
    setIsFinished(true);
    setIsRunning(false);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if confetti fails
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

  // Clean up alarm on unmount
  useEffect(() => {
    return () => {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
    };
  }, []);

  // Interval timer engine
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

  // Handle Preset selection
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

  // Start timer
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

  // Pause timer
  const handlePause = () => {
    if (soundEnabled) playClickSound();
    setIsRunning(false);
  };

  // Reset timer
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

  // Quick adjust remaining seconds while running/paused (+1m, +30s, -30s)
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

  // Dismiss ringing alarm
  const handleDismissAlarm = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setIsFinished(false);
    handleReset();
  };

  // Repeat the timer
  const handleRepeatTimer = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setIsFinished(false);
    setRemainingSeconds(totalInitialSeconds);
    setIsRunning(true);
  };

  // Progress fraction (1 when full, 0 when done)
  const progress = totalInitialSeconds > 0 ? remainingSeconds / totalInitialSeconds : 0;
  const strokeDashoffset = 880 - 880 * progress;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* Alarm ringing alert modal / banner */}
      {isFinished && (
        <div className="w-full mb-6 p-6 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Bell className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Hết giờ!</h3>
              <p className="text-sm text-amber-300">
                Thời gian đếm ngược {formatHumanVietnamese(totalInitialSeconds * 1000)} đã kết thúc.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRepeatTimer}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Lặp lại
            </button>
            <button
              onClick={handleDismissAlarm}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 text-sm font-bold shadow-lg shadow-amber-400/20 transition-colors"
            >
              Tắt chuông
            </button>
          </div>
        </div>
      )}

      {/* Main Countdown Card */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {/* Circular Progress Gauge */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            <circle
              cx="150"
              cy="150"
              r="140"
              className="stroke-slate-800/80"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="150"
              cy="150"
              r="140"
              className="transition-[stroke-dashoffset] duration-500 ease-out"
              stroke={
                remainingSeconds <= 10 && remainingSeconds > 0
                  ? '#f43f5e'
                  : isRunning
                  ? '#10b981'
                  : '#64748b'
              }
              strokeWidth="8"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time digits in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <div className="h-6 mb-1 text-xs font-semibold tracking-wider uppercase text-slate-400">
              {isRunning ? 'Đang đếm ngược' : remainingSeconds === 0 ? 'Đã hoàn thành' : 'Sẵn sàng'}
            </div>

            <div className="text-5xl sm:text-7xl font-mono font-bold tracking-tight text-white tabular-nums">
              {formatSecondsToTime(remainingSeconds, totalInitialSeconds >= 3600)}
            </div>

            <div className="mt-2 text-xs font-mono text-slate-400">
              Tổng thời gian: {formatSecondsToTime(totalInitialSeconds)}
            </div>
          </div>
        </div>

        {/* Quick adjustment buttons during or before run */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleAdjustTime(60)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700/40"
          >
            <Plus className="w-3 h-3" /> 1 phút
          </button>
          <button
            onClick={() => handleAdjustTime(30)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700/40"
          >
            <Plus className="w-3 h-3" /> 30 giây
          </button>
          <button
            onClick={() => handleAdjustTime(-30)}
            disabled={remainingSeconds <= 30}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3 h-3" /> 30 giây
          </button>
        </div>

        {/* Primary Controls */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          <button
            onClick={handleReset}
            className="min-h-[48px] px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 border border-slate-700/60 font-semibold text-sm transition-all"
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
              disabled={remainingSeconds === 0 && hoursInput === 0 && minutesInput === 0 && secondsInput === 0}
              className="min-h-[48px] flex-1 px-6 sm:px-8 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{remainingSeconds < totalInitialSeconds ? 'Tiếp tục' : 'Bắt đầu'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="w-full mt-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-8 backdrop-blur-xl">
        <h3 className="text-base font-semibold text-white mb-4">
          Thời gian đếm ngược cài sẵn
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => handleSelectPreset(preset.seconds)}
              className={`p-3 rounded-2xl text-left border transition-all ${
                totalInitialSeconds === preset.seconds
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                  : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 text-slate-300'
              }`}
            >
              <div className="text-sm font-semibold">{preset.label}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {formatSecondsToTime(preset.seconds)}
              </div>
            </button>
          ))}
        </div>

        {/* Custom duration inputs */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
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
