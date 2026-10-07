import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Flag, Download, Copy, Check, BookmarkPlus, ArrowDown, ArrowUp } from 'lucide-react';
import { LapItem, SavedRecord } from '../types/timer';
import { formatTimeParts, formatMilliseconds, generateLapsCSV, downloadCSV } from '../utils/formatters';
import { playClickSound, playLapSound } from '../utils/audio';

interface StopwatchProps {
  soundEnabled: boolean;
  onSaveRecord: (record: Omit<SavedRecord, 'id' | 'date'>) => void;
}

export function Stopwatch({ soundEnabled, onSaveRecord }: StopwatchProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<LapItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // High precision reference timings
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Keep accumulatedTimeRef synced with state for safe access
  accumulatedTimeRef.current = elapsedTime;

  const updateTimer = useCallback(() => {
    if (!isRunning) return;
    const now = performance.now();
    const currentElapsed = now - startTimeRef.current;
    setElapsedTime(currentElapsed);
    animFrameIdRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning]);

  // Handle start
  const handleStart = useCallback(() => {
    if (soundEnabled) playClickSound();
    startTimeRef.current = performance.now() - accumulatedTimeRef.current;
    setIsRunning(true);
  }, [soundEnabled]);

  // Handle pause
  const handlePause = useCallback(() => {
    if (soundEnabled) playClickSound();
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsRunning(false);
  }, [soundEnabled]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (soundEnabled) playClickSound();
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsRunning(false);
    setElapsedTime(0);
    accumulatedTimeRef.current = 0;
    setLaps([]);
    setSavedSuccess(false);
  }, [soundEnabled]);

  // Handle lap recording
  const handleLap = useCallback(() => {
    if (!isRunning && elapsedTime === 0) return;
    if (soundEnabled) playLapSound();

    const currentTotal = elapsedTime;
    const lastLapTotal = laps.length > 0 ? laps[0].overallTime : 0;
    const lapDuration = currentTotal - lastLapTotal;

    const newLap: LapItem = {
      id: Date.now() + Math.random(),
      lapNumber: laps.length + 1,
      lapTime: lapDuration,
      overallTime: currentTotal,
      timestamp: Date.now(),
    };

    setLaps((prev) => [newLap, ...prev]);
  }, [isRunning, elapsedTime, laps, soundEnabled]);

  // Animation frame loop
  useEffect(() => {
    if (isRunning) {
      animFrameIdRef.current = requestAnimationFrame(updateTimer);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isRunning, updateTimer]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) handlePause();
        else handleStart();
      } else if (e.key.toLowerCase() === 'l' && isRunning) {
        e.preventDefault();
        handleLap();
      } else if (e.key.toLowerCase() === 'r' && !isRunning && elapsedTime > 0) {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, elapsedTime, handleStart, handlePause, handleLap, handleReset]);

  // Fast & slow lap metrics
  const { fastestLapTime, slowestLapTime } = useMemo(() => {
    if (laps.length < 2) return { fastestLapTime: null, slowestLapTime: null };
    let fastest = laps[0].lapTime;
    let slowest = laps[0].lapTime;
    for (const lap of laps) {
      if (lap.lapTime < fastest) fastest = lap.lapTime;
      if (lap.lapTime > slowest) slowest = lap.lapTime;
    }
    return { fastestLapTime: fastest, slowestLapTime: slowest };
  }, [laps]);

  // Average lap time
  const averageLapTime = useMemo(() => {
    if (laps.length === 0) return null;
    const sum = laps.reduce((acc, lap) => acc + lap.lapTime, 0);
    return sum / laps.length;
  }, [laps]);

  // Format main clock numbers
  const time = formatTimeParts(elapsedTime);

  // Dial rotation: calculates second sweep (0 to 360 degrees for 60 seconds)
  const secondsFraction = (elapsedTime % 60000) / 60000;
  const strokeDashoffset = 880 - 880 * secondsFraction;

  // Export laps to CSV
  const handleExportCSV = () => {
    if (laps.length === 0) return;
    const csvContent = generateLapsCSV(laps);
    downloadCSV(csvContent, `bam-gio-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Copy lap list to clipboard
  const handleCopyLaps = () => {
    if (laps.length === 0) return;
    const text = laps
      .map(
        (l) =>
          `Vòng ${l.lapNumber.toString().padStart(2, '0')}: ${formatMilliseconds(l.lapTime)} (Tổng: ${formatMilliseconds(l.overallTime)})`
      )
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Save current run to history
  const handleSaveToHistory = () => {
    if (elapsedTime === 0) return;
    onSaveRecord({
      type: 'stopwatch',
      title: `Bấm giờ (${laps.length > 0 ? `${laps.length} vòng` : 'Cơ bản'})`,
      totalTime: elapsedTime,
      laps: [...laps],
      fastestLap: fastestLapTime || undefined,
      slowestLap: slowestLapTime || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* Precision Stopwatch Dial Card */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {/* Circular Progress Gauge */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            {/* Background Dial Track */}
            <circle
              cx="150"
              cy="150"
              r="140"
              className="stroke-slate-800/80"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Tick Marks around the circle */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i * 6 * Math.PI) / 180;
              const isMajor = i % 5 === 0;
              const innerR = isMajor ? 122 : 128;
              const outerR = 134;
              const x1 = 150 + innerR * Math.cos(angle);
              const y1 = 150 + innerR * Math.sin(angle);
              const x2 = 150 + outerR * Math.cos(angle);
              const y2 = 150 + outerR * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? '#475569' : '#334155'}
                  strokeWidth={isMajor ? '2' : '1'}
                />
              );
            })}
            {/* Animated Progress Arc */}
            <circle
              cx="150"
              cy="150"
              r="140"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              stroke={isRunning ? '#10b981' : '#64748b'}
              strokeWidth="6"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            {/* Lap Counter Tag if laps exist */}
            <div className="h-6 mb-1">
              {laps.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Flag className="w-3 h-3" />
                  <span>Vòng {laps.length + 1}</span>
                </div>
              )}
            </div>

            {/* Time Readout: Hours : Minutes : Seconds */}
            <div className="flex items-baseline font-mono tracking-tight text-white font-bold">
              {time.hours !== '00' && (
                <>
                  <span className="text-4xl sm:text-6xl tabular-nums">{time.hours}</span>
                  <span className="text-3xl sm:text-5xl text-slate-500 mx-0.5">:</span>
                </>
              )}
              <span className="text-5xl sm:text-7xl tabular-nums">{time.minutes}</span>
              <span className="text-4xl sm:text-6xl text-slate-500 mx-0.5">:</span>
              <span className="text-5xl sm:text-7xl tabular-nums">{time.seconds}</span>
            </div>

            {/* Split Hundredths Milliseconds */}
            <div className="mt-1 flex items-center gap-1 font-mono">
              <span className="text-xs uppercase tracking-widest text-slate-500">Giây lẻ</span>
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400">
                .{time.hundredths}
              </span>
            </div>

            {/* Current Active Lap Elapsed if running */}
            {laps.length > 0 && (
              <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1">
                <span>Vòng hiện tại:</span>
                <span className="text-slate-200 font-semibold">
                  {formatMilliseconds(elapsedTime - laps[0].overallTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stopwatch Primary Control Buttons */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={elapsedTime === 0}
            className={`min-h-[48px] px-5 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              elapsedTime > 0
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 border border-slate-700/60'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/30 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại</span>
          </button>

          {/* Primary Start / Pause Button */}
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
              <span>{elapsedTime === 0 ? 'Bắt đầu' : 'Tiếp tục'}</span>
            </button>
          )}

          {/* Lap Button */}
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className={`min-h-[48px] px-5 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              isRunning
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-600/20 border border-indigo-500/30'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/30 cursor-not-allowed'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Vòng</span>
          </button>
        </div>

        {/* Keyboard shortcut tips (unboxed clean prose) */}
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-slate-500">
          <span>Phím tắt:</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Space</kbd> Chạy/Dừng</span>
          <span aria-hidden="true">·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">L</kbd> Vòng</span>
          <span aria-hidden="true">·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">R</kbd> Đặt lại</span>
        </div>
      </div>

      {/* Laps Section (Only visible when laps are recorded) */}
      {laps.length > 0 && (
        <div className="w-full mt-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-8 backdrop-blur-xl">
          {/* Header of Lap Table */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Bảng Ghi Vòng ({laps.length} vòng)
              </h3>
              {averageLapTime && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Trung bình một vòng:</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {formatMilliseconds(averageLapTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Lap Action Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLaps}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Sao chép bảng kết quả"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Xuất file CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={handleSaveToHistory}
                disabled={savedSuccess}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Lưu vào lịch sử"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Đã lưu' : 'Lưu kết quả'}</span>
              </button>
            </div>
          </div>

          {/* Lap Highlights summary badges (clean editorial unboxed stats) */}
          {laps.length >= 2 && fastestLapTime && slowestLapTime && (
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-800/60">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" />
                    <span>Vòng nhanh nhất</span>
                  </div>
                  <div className="font-mono text-base font-bold text-emerald-300 mt-0.5">
                    {formatMilliseconds(fastestLapTime)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <span>Vòng chậm nhất</span>
                  </div>
                  <div className="font-mono text-base font-bold text-rose-300 mt-0.5">
                    {formatMilliseconds(slowestLapTime)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lap list table */}
          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1 mt-2">
            {laps.map((lap, index) => {
              const isFastest = laps.length >= 2 && lap.lapTime === fastestLapTime;
              const isSlowest = laps.length >= 2 && lap.lapTime === slowestLapTime;
              
              // Delta compared to next recorded lap (which was previous chronologically)
              const previousLap = laps[index + 1];
              const delta = previousLap ? lap.lapTime - previousLap.lapTime : 0;

              return (
                <div
                  key={lap.id}
                  className={`py-3 px-3 rounded-xl flex items-center justify-between text-sm transition-colors ${
                    isFastest
                      ? 'bg-emerald-500/5 text-emerald-300'
                      : isSlowest
                      ? 'bg-rose-500/5 text-rose-300'
                      : 'text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  {/* Left: Lap label */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-400 min-w-[60px]">
                      Vòng {lap.lapNumber}
                    </span>
                    {isFastest && (
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Nhanh nhất
                      </span>
                    )}
                    {isSlowest && (
                      <span className="text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        Chậm nhất
                      </span>
                    )}
                  </div>

                  {/* Right: Times */}
                  <div className="flex items-center gap-6">
                    {/* Delta indicator if applicable */}
                    {previousLap && (
                      <span
                        className={`text-xs font-mono hidden sm:inline-block ${
                          delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-rose-400' : 'text-slate-500'
                        }`}
                      >
                        {delta < 0 ? '-' : '+'}
                        {(Math.abs(delta) / 1000).toFixed(2)}s
                      </span>
                    )}

                    {/* Single Lap Time */}
                    <span className="font-mono font-bold tabular-nums text-white text-base">
                      {formatMilliseconds(lap.lapTime)}
                    </span>

                    {/* Overall Running Total */}
                    <span className="font-mono tabular-nums text-xs text-slate-400 min-w-[70px] text-right">
                      {formatMilliseconds(lap.overallTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
