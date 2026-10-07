export type TabMode = 'stopwatch' | 'timer' | 'interval' | 'clock';

export interface LapItem {
  id: number;
  lapNumber: number;
  lapTime: number; // in milliseconds
  overallTime: number; // in milliseconds
  timestamp: number;
}

export type SoundEffectType = 'chime' | 'alarm' | 'whistle' | 'radar';

export interface SavedRecord {
  id: string;
  type: 'stopwatch' | 'timer' | 'interval';
  title: string;
  date: string;
  totalTime: number; // milliseconds
  laps?: LapItem[];
  fastestLap?: number;
  slowestLap?: number;
  intervalDetails?: {
    sets: number;
    workSec: number;
    restSec: number;
  };
}

export interface IntervalConfig {
  warmupSec: number;
  workSec: number;
  restSec: number;
  totalSets: number;
}

export type IntervalPhase = 'ready' | 'warmup' | 'work' | 'rest' | 'finished';

export interface AppSettings {
  soundEnabled: boolean;
  soundType: SoundEffectType;
  volume: number;
  wakeLockEnabled: boolean;
  theme: 'dark' | 'slate' | 'oled';
}
