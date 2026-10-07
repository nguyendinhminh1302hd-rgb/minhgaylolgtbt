import { X, Volume2, Play, Moon, Sun, Smartphone, Keyboard } from 'lucide-react';
import { AppSettings, SoundEffectType } from '../types/timer';
import { startAlarmSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SOUND_OPTIONS: { id: SoundEffectType; name: string; desc: string }[] = [
  { id: 'alarm', name: 'Còi điện tử', desc: 'Âm báo thể thao dồn dập (Beep-beep)' },
  { id: 'chime', name: 'Chuông êm ái', desc: 'Giai điệu chuông marimba nhẹ nhàng' },
  { id: 'whistle', name: 'Còi trọng tài', desc: 'Tiếng còi huýt thể thao sân cỏ' },
  { id: 'radar', name: 'Sóng Radar', desc: 'Xung âm thanh hiện đại' },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleTestSound = (type: SoundEffectType) => {
    const stop = startAlarmSound(type, settings.volume);
    setTimeout(() => {
      stop();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Cài Đặt Ứng Dụng</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tùy chỉnh âm thanh, màn hình và giao diện
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Sound enable toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Âm thanh thông báo</div>
                <div className="text-xs text-slate-400">Phát âm thanh khi bắt đầu, ghi vòng và hết giờ</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Volume slider */}
          {settings.soundEnabled && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Âm lượng chuông</span>
                <span className="text-white font-mono">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Sound Alarm Types */}
          {settings.soundEnabled && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Kiểu chuông báo hết giờ
              </div>
              <div className="space-y-2">
                {SOUND_OPTIONS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onUpdateSettings({ soundType: item.id })}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      settings.soundType === item.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestSound(item.id);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 transition-colors"
                      title="Nghe thử âm thanh"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Thử</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screen WakeLock */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Giữ màn hình luôn sáng</div>
                <div className="text-xs text-slate-400">Ngăn thiết bị tự tắt màn hình khi đang bấm giờ</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ wakeLockEnabled: !settings.wakeLockEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.wakeLockEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.wakeLockEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Theme Palette */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Chủ đề giao diện
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs font-medium">Bóng Đêm</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'oled' })}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  settings.theme === 'oled'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-500 mx-auto mb-1.5" />
                <span className="text-xs font-medium">AMOLED Đen</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'slate' })}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  settings.theme === 'slate'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs font-medium">Xám Bạc</span>
              </button>
            </div>
          </div>

          {/* Shortcuts Reference Table */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Phím tắt thao tác nhanh</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Bắt đầu / Tạm dừng:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Phím Cách (Space)</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Ghi vòng mới (Lap):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Phím L</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Đặt lại (Reset):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Phím R</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Toàn màn hình:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Phím F</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
