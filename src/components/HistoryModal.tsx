import { useState } from 'react';
import { X, Trash2, Download, Calendar, Timer, Clock, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { SavedRecord } from '../types/timer';
import { formatMilliseconds, downloadCSV } from '../utils/formatters';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  records,
  onDeleteRecord,
  onClearAll,
}: HistoryModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportAll = () => {
    if (records.length === 0) return;
    const headers = ['Loại', 'Tiêu đề', 'Thời gian hoàn thành (ms)', 'Thời điểm'];
    const rows = records.map((r) =>
      [r.type, `"${r.title}"`, r.totalTime, `"${r.date}"`].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `lich-su-bam-gio-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Lịch Sử Lưu Trữ</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Danh sách kết quả bấm giờ và bài tập đã ghi lại ({records.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-800/80">
          {records.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">Chưa có bản ghi nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Nhấn &quot;Lưu kết quả&quot; sau khi bấm giờ hoặc hoàn thành bài tập để lưu lại tại đây.
              </p>
            </div>
          ) : (
            records.map((item) => {
              const isExpanded = expandedId === item.id;
              const hasLaps = item.laps && item.laps.length > 0;

              return (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        {item.type === 'stopwatch' && <Timer className="w-4 h-4" />}
                        {item.type === 'timer' && <Clock className="w-4 h-4" />}
                        {item.type === 'interval' && <Activity className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="font-semibold text-white text-sm">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.date}
                        </div>
                        <div className="font-mono text-base font-bold text-emerald-400 mt-1">
                          {formatMilliseconds(item.totalTime)}
                        </div>

                        {item.fastestLap && (
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>Vòng nhanh nhất: <strong className="text-emerald-300 font-mono">{formatMilliseconds(item.fastestLap)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasLaps && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 transition-colors"
                        >
                          <span>{item.laps?.length} vòng</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteRecord(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa bản ghi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded lap list details */}
                  {isExpanded && hasLaps && item.laps && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-400 mb-2">
                        Chi tiết các vòng:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {item.laps.map((lap) => (
                          <div
                            key={lap.id}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/60 text-xs"
                          >
                            <span className="text-slate-400">Vòng {lap.lapNumber}:</span>{' '}
                            <span className="font-mono text-white font-medium">
                              {formatMilliseconds(lap.lapTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        {records.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <button
              onClick={onClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ lịch sử</span>
            </button>

            <button
              onClick={handleExportAll}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất toàn bộ CSV</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
