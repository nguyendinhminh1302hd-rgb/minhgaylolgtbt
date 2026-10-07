import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Flag, Download, Copy, Check, BookmarkPlus, ArrowDown, ArrowUp, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [showChart, setShowChart] = useState<boolean>(false);

  // Precision timings
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  accumulatedTimeRef.current = elapsedTime;

  const updateTimer = useCallback(() => {
    if (!isRunning) return;
    const now = performance.now();
    const currentElapsed = now - startTimeRef.current;
    setElapsedTime(currentElapsed);
    animFrameIdRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning]);

  const handleStart = useCallback(() => {
    if (soundEnabled) playClickSound();
    startTimeRef.current = performance.now() - accumulatedTimeRef.current;
    setIsRunning(true);
  }, [soundEnabled]);

  const handlePause = useCallback(() => {
    if (soundEnabled) playClickSound();
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsRunning(false);
  }, [soundEnabled]);

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

  // Frame loop
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

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Fast & Slow metrics
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

  const averageLapTime = useMemo(() => {
    if (laps.length === 0) return null;
    const sum = laps.reduce((acc, lap) => acc + lap.lapTime, 0);
    return sum / laps.length;
  }, [laps]);

  const time = formatTimeParts(elapsedTime);

  // Dial rotation: 60s sweep
  const secondsFraction = (elapsedTime % 60000) / 60000;
  const strokeDashoffset = 880 - 880 * secondsFraction;

  // Sub-second 1s revolution needle angle (0 to 360 deg every second)
  const subSecondAngle = ((elapsedTime % 1000) / 1000) * 360;

  // Exact coordinates for the glowing pointer tip on outer circle (radius = 140, center = 150)
  // angle starts at -90deg (top of clock)
  const currentAngleRad = secondsFraction * 2 * Math.PI - Math.PI / 2;
  const pointerX = 150 + 140 * Math.cos(currentAngleRad);
  const pointerY = 150 + 140 * Math.sin(currentAngleRad);

  const handleExportCSV = () => {
    if (laps.length === 0) return;
    const csvContent = generateLapsCSV(laps);
    downloadCSV(csvContent, `bam-gio-${new Date().toISOString().slice(0, 10)}.csv`);
  };

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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center relative">
      {/* Dynamic Ambient Background Glow Orb */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
          isRunning
            ? 'bg-emerald-500/20 scale-110'
            : elapsedTime > 0
            ? 'bg-amber-500/15 scale-100'
            : 'bg-emerald-500/5 scale-90'
        }`}
      />

      {/* Main Glassmorphic Chronometer Card */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl glass-panel glass-panel-hover">
        {/* Subtle status kicker */}
        <div className="mb-4 flex items-center gap-2 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              isRunning ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-400 uppercase tracking-widest text-[11px]">
            {isRunning ? 'Chrono Active · 100 FPS' : elapsedTime > 0 ? 'Paused' : 'Standby'}
          </span>
        </div>

        {/* Circular Dial with Glowing Track & Pointer */}
        <div className="relative w-76 h-76 sm:w-92 sm:h-92 flex items-center justify-center">
          {/* Subtle Outer Concentric Pulse Rings when Running */}
          {isRunning && (
            <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse-ring pointer-events-none" />
          )}

          <svg className="w-full h-full transform" viewBox="0 0 300 300">
            <defs>
              {/* Neon Glow Filter */}
              <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="track-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Background Dial Track */}
            <circle
              cx="150"
              cy="150"
              r="140"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="5"
              fill="transparent"
            />

            {/* Precision Hash Marks around the bezel */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i * 6 * Math.PI) / 180 - Math.PI / 2;
              const isMajor = i % 5 === 0;
              const innerR = isMajor ? 122 : 129;
              const outerR = 136;
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
                  stroke={isMajor ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.12)'}
                  strokeWidth={isMajor ? '2' : '1'}
                />
              );
            })}

            {/* Major Numbers around Bezel (05, 15, 30, 45) */}
            <text x="150" y="32" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono">60</text>
            <text x="270" y="153" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono">15</text>
            <text x="150" y="274" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono">30</text>
            <text x="30" y="153" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono">45</text>

            {/* Main Progress Sweep Arc (rotated -90deg via start point) */}
            <circle
              cx="150"
              cy="150"
              r="140"
              className="-rotate-90 origin-center transition-[stroke-dashoffset] duration-75 ease-linear"
              stroke={isRunning ? 'url(#track-gradient)' : '#64748b'}
              strokeWidth="5"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter={isRunning ? 'url(#emerald-glow)' : undefined}
            />

            {/* Glowing Pointer Orb at the leading tip of the sweep */}
            {elapsedTime > 0 && (
              <g>
                <circle
                  cx={pointerX}
                  cy={pointerY}
                  r="7"
                  fill="#10b981"
                  filter="url(#emerald-glow)"
                />
                <circle
                  cx={pointerX}
                  cy={pointerY}
                  r="3.5"
                  fill="#ffffff"
                />
              </g>
            )}

            {/* Sub-Dial for 1/100s Micro-spinner (Miniature Motorsport Needle) */}
            <g transform="translate(150, 96)">
              <circle r="18" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-14"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${subSecondAngle})`}
              />
              <circle r="2.5" fill="#06b6d4" />
            </g>
          </svg>

          {/* Central Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            {/* Lap pill if active */}
            <div className="h-6 mb-1">
              {laps.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Flag className="w-3 h-3" />
                  <span>Vòng {laps.length + 1}</span>
                </div>
              )}
            </div>

            {/* Primary Digits: Hours : Minutes : Seconds */}
            <div className="flex items-baseline font-mono tracking-tight text-white font-bold">
              {time.hours !== '00' && (
                <>
                  <span className={`text-4xl sm:text-6xl tabular-nums ${isRunning ? 'glow-emerald' : ''}`}>
                    {time.hours}
                  </span>
                  <span className="text-3xl sm:text-5xl text-slate-500 mx-0.5">:</span>
                </>
              )}
              <span className={`text-5xl sm:text-7xl tabular-nums ${isRunning ? 'glow-emerald' : ''}`}>
                {time.minutes}
              </span>
              <span className={`text-4xl sm:text-6xl mx-0.5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                :
              </span>
              <span className={`text-5xl sm:text-7xl tabular-nums ${isRunning ? 'glow-emerald' : ''}`}>
                {time.seconds}
              </span>
            </div>

            {/* Split Hundredths Milliseconds */}
            <div className="mt-1 flex items-center gap-1.5 font-mono">
              <span className="text-[11px] uppercase tracking-widest text-slate-500">ms</span>
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400 glow-emerald">
                .{time.hundredths}
              </span>
            </div>

            {/* Current Active Lap Elapsed */}
            {laps.length > 0 && (
              <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
                <span>Vòng này:</span>
                <span className="text-white font-semibold">
                  {formatMilliseconds(elapsedTime - laps[0].overallTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Controls with tactile spring feedback */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
          {/* Reset Button */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleReset}
            disabled={elapsedTime === 0}
            className={`min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              elapsedTime > 0
                ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/80 shadow-md'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/30 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại</span>
          </motion.button>

          {/* Primary Start / Pause with Vibrant Glowing Gradient */}
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
              <span>{elapsedTime === 0 ? 'Bắt đầu' : 'Tiếp tục'}</span>
            </motion.button>
          )}

          {/* Lap Button */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleLap}
            disabled={!isRunning}
            className={`min-h-[50px] px-5 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              isRunning
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/40 hover:brightness-110'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/30 cursor-not-allowed'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Vòng</span>
          </motion.button>
        </div>

        {/* Keyboard shortcut tips */}
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-slate-500">
          <span>Phím tắt:</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Space</kbd> Chạy/Dừng</span>
          <span aria-hidden="true">·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">L</kbd> Vòng</span>
          <span aria-hidden="true">·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">R</kbd> Đặt lại</span>
        </div>
      </div>

      {/* Laps Section with Animated Entry & Lap Bar Chart */}
      {laps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-8 glass-panel rounded-3xl p-5 sm:p-8"
        >
          {/* Header of Lap Table */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Bảng Ghi Vòng ({laps.length} vòng)
                </h3>
                <button
                  onClick={() => setShowChart(!showChart)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    showChart
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Biểu đồ so sánh thời gian vòng"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Biểu đồ</span>
                </button>
              </div>

              {averageLapTime && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Trung bình một vòng:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {formatMilliseconds(averageLapTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Lap Action Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLaps}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={handleSaveToHistory}
                disabled={savedSuccess}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Đã lưu' : 'Lưu kết quả'}</span>
              </button>
            </div>
          </div>

          {/* Highlights */}
          {laps.length >= 2 && fastestLapTime && slowestLapTime && (
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-white/10">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" />
                    <span>Vòng nhanh nhất</span>
                  </div>
                  <div className="font-mono text-base font-bold text-emerald-300 mt-0.5 glow-emerald">
                    {formatMilliseconds(fastestLapTime)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <span>Vòng chậm nhất</span>
                  </div>
                  <div className="font-mono text-base font-bold text-rose-300 mt-0.5 glow-rose">
                    {formatMilliseconds(slowestLapTime)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Lap Speed Comparison Chart */}
          {showChart && laps.length >= 2 && slowestLapTime && (
            <div className="py-4 border-b border-white/10 space-y-2">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                So sánh tốc độ các vòng:
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {laps.map((lap) => {
                  const widthPercent = Math.max(15, (lap.lapTime / slowestLapTime) * 100);
                  const isFast = lap.lapTime === fastestLapTime;
                  const isSlow = lap.lapTime === slowestLapTime;

                  return (
                    <div key={`chart-${lap.id}`} className="flex items-center gap-3 text-xs">
                      <span className="w-12 text-slate-400 font-mono font-medium">V.{lap.lapNumber}</span>
                      <div className="flex-1 bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isFast
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_#10b981]'
                              : isSlow
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                        />
                      </div>
                      <span className="w-20 text-right font-mono text-white font-medium">
                        {formatMilliseconds(lap.lapTime)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Animated Lap list table */}
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto pr-1 mt-2">
            <AnimatePresence initial={false}>
              {laps.map((lap, index) => {
                const isFastest = laps.length >= 2 && lap.lapTime === fastestLapTime;
                const isSlowest = laps.length >= 2 && lap.lapTime === slowestLapTime;
                const previousLap = laps[index + 1];
                const delta = previousLap ? lap.lapTime - previousLap.lapTime : 0;

                return (
                  <motion.div
                    key={lap.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`py-3 px-3 rounded-xl flex items-center justify-between text-sm transition-colors ${
                      isFastest
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : isSlowest
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-300 min-w-[60px]">
                        Vòng {lap.lapNumber}
                      </span>
                      {isFastest && (
                        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                          Nhanh nhất
                        </span>
                      )}
                      {isSlowest && (
                        <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                          Chậm nhất
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      {previousLap && (
                        <span
                          className={`text-xs font-mono hidden sm:inline-block ${
                            delta < 0 ? 'text-emerald-400 font-bold' : delta > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {delta < 0 ? '-' : '+'}
                          {(Math.abs(delta) / 1000).toFixed(2)}s
                        </span>
                      )}

                      <span className="font-mono font-bold tabular-nums text-white text-base">
                        {formatMilliseconds(lap.lapTime)}
                      </span>

                      <span className="font-mono tabular-nums text-xs text-slate-400 min-w-[70px] text-right">
                        {formatMilliseconds(lap.overallTime)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
