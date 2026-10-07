import { LapItem } from '../types/timer';

export interface FormattedTimeParts {
  hours: string;
  minutes: string;
  seconds: string;
  hundredths: string;
}

/**
 * Decomposes milliseconds into 2-digit zero-padded parts
 */
export function formatTimeParts(ms: number): FormattedTimeParts {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    hundredths: hundredths.toString().padStart(2, '0'),
  };
}

/**
 * Formats milliseconds to full string: "00:01:23.45" or "01:23.45"
 */
export function formatMilliseconds(ms: number, showHoursAlways = false): string {
  const parts = formatTimeParts(ms);
  if (parts.hours !== '00' || showHoursAlways) {
    return `${parts.hours}:${parts.minutes}:${parts.seconds}.${parts.hundredths}`;
  }
  return `${parts.minutes}:${parts.seconds}.${parts.hundredths}`;
}

/**
 * Formats total seconds to "HH:MM:SS" or "MM:SS"
 */
export function formatSecondsToTime(totalSec: number, showHoursAlways = false): string {
  const safeSec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');

  if (hours > 0 || showHoursAlways) {
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

/**
 * Format milliseconds to human readable Vietnamese duration
 */
export function formatHumanVietnamese(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return parts.join(' ');
}

/**
 * Generate CSV data from recorded laps
 */
export function generateLapsCSV(laps: LapItem[], title = 'Ket_qua_bam_gio'): string {
  const headers = ['Vòng', 'Thời gian vòng', 'Tổng thời gian (ms)', 'Thời điểm'];
  const rows = laps.map((lap) => {
    return [
      `Vòng ${lap.lapNumber}`,
      formatMilliseconds(lap.lapTime),
      lap.overallTime,
      new Date(lap.timestamp).toLocaleTimeString('vi-VN'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger file download for CSV
 */
export function downloadCSV(content: string, filename = 'ket-qua-bam-gio.csv'): void {
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
