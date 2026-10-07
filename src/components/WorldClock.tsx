import { useState, useEffect } from 'react';
import { Globe, MapPin } from 'lucide-react';

export function WorldClock() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Vietnam time (Asia/Ho_Chi_Minh)
  const vnTimeStr = now.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const vnDateStr = now.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Analog hands angles
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const worldCities = [
    { name: 'Tokyo', zone: 'Asia/Tokyo', offset: 'UTC+9' },
    { name: 'London', zone: 'Europe/London', offset: 'UTC+1' },
    { name: 'New York', zone: 'America/New_York', offset: 'UTC-4' },
    { name: 'Sydney', zone: 'Australia/Sydney', offset: 'UTC+11' },
    { name: 'Paris', zone: 'Europe/Paris', offset: 'UTC+2' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center relative">
      {/* Dynamic Ambient Background Glow Orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[100px] pointer-events-none bg-emerald-500/10" />

      {/* Primary Vietnam Clock */}
      <div className="w-full relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl glass-panel glass-panel-hover">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-4 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <MapPin className="w-3.5 h-3.5" />
          <span>Giờ Chuẩn Việt Nam (GMT+7)</span>
        </div>

        {/* Analog Clock Face */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-white/10 bg-slate-950/90 shadow-2xl flex items-center justify-center mb-6">
          {/* Dial markers */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-3 bg-slate-500 rounded-full"
              style={{
                top: 8,
                transformOrigin: '50% 112px',
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}

          {/* Hour hand */}
          <div
            className="absolute w-1.5 h-16 bg-white rounded-full transition-transform shadow-md"
            style={{
              top: '28%',
              transformOrigin: '50% 100%',
              transform: `rotate(${hourDeg}deg)`,
            }}
          />

          {/* Minute hand */}
          <div
            className="absolute w-1 h-22 bg-slate-300 rounded-full transition-transform shadow-md"
            style={{
              top: '18%',
              transformOrigin: '50% 100%',
              transform: `rotate(${minuteDeg}deg)`,
            }}
          />

          {/* Second hand with glow */}
          <div
            className="absolute w-0.5 h-26 bg-emerald-400 rounded-full transition-transform shadow-[0_0_8px_#10b981]"
            style={{
              top: '12%',
              transformOrigin: '50% 100%',
              transform: `rotate(${secondDeg}deg)`,
            }}
          />

          {/* Center Pin */}
          <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 z-10 shadow-[0_0_8px_#10b981]" />
        </div>

        {/* Digital Clock Display */}
        <div className="text-5xl sm:text-7xl font-mono font-bold tracking-tight text-white tabular-nums glow-emerald">
          {vnTimeStr}
        </div>

        {/* Vietnamese Date */}
        <div className="mt-3 text-sm sm:text-base text-slate-400 capitalize">
          {vnDateStr}
        </div>
      </div>

      {/* World Time zones */}
      <div className="w-full mt-8 glass-panel rounded-3xl p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-4 text-base font-semibold text-white">
          <Globe className="w-4 h-4 text-slate-400" />
          <span>Múi Giờ Quốc Tế</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {worldCities.map((city) => {
            const cityTime = now.toLocaleTimeString('vi-VN', {
              timeZone: city.zone,
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={city.name}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50"
              >
                <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  <span>{city.name}</span>
                  <span className="text-[10px] text-slate-500">{city.offset}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white mt-1 tabular-nums">
                  {cityTime}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
