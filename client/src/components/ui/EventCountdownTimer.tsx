import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface EventCountdownTimerProps {
  targetDate: string | Date;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const EventCountdownTimer: React.FC<EventCountdownTimerProps> = ({ targetDate, className = '' }) => {
  const [time, setTime] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({ days, hours, minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (time.isExpired) {
    return (
      <div className={`p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center font-bold text-xs text-emerald-800 flex items-center justify-center gap-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        Exhibition is Live Now!
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1 text-[#09539b]">
          <Clock className="w-3.5 h-3.5" /> Event Starts In
        </span>
        <span className="text-emerald-600 font-mono text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          Live Timer
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center font-mono">
        <div className="bg-[#121B3D] text-white p-2.5 rounded-xl border border-slate-700/50 shadow-xs flex flex-col justify-center">
          <span className="text-lg sm:text-xl font-black text-[#84CC16]">
            {String(time.days).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-bold text-slate-300">Days</span>
        </div>

        <div className="bg-[#121B3D] text-white p-2.5 rounded-xl border border-slate-700/50 shadow-xs flex flex-col justify-center">
          <span className="text-lg sm:text-xl font-black text-white">
            {String(time.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-bold text-slate-300">Hours</span>
        </div>

        <div className="bg-[#121B3D] text-white p-2.5 rounded-xl border border-slate-700/50 shadow-xs flex flex-col justify-center">
          <span className="text-lg sm:text-xl font-black text-white">
            {String(time.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-bold text-slate-300">Mins</span>
        </div>

        <div className="bg-[#121B3D] text-white p-2.5 rounded-xl border border-slate-700/50 shadow-xs flex flex-col justify-center">
          <span className="text-lg sm:text-xl font-black text-[#84CC16] animate-pulse">
            {String(time.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-bold text-slate-300">Secs</span>
        </div>
      </div>
    </div>
  );
};
