import React, { useEffect, useState } from 'react';
import { Clock, Radio } from 'lucide-react';

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

export const EventCountdownTimer: React.FC<EventCountdownTimerProps> = ({
  targetDate,
  className = '',
}) => {
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
      <div className={`px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center font-bold text-xs text-emerald-800 flex items-center justify-center gap-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        Exhibition is Live Now!
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
        <span className="flex items-center gap-1.5 text-[#1B37A0]">
          <Clock className="w-3.5 h-3.5 text-[#0E8074]" /> Official Event Countdown
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#0E8074] bg-[#E4F5F2] px-2.5 py-0.5 rounded-full border border-[#0E8074]/20">
          <Radio className="w-3 h-3 text-[#0E8074] animate-pulse" /> LIVE
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5 font-mono">
        {/* Days */}
        <div className="flex-1 bg-gradient-to-b from-white to-[#F0F6FE] p-2.5 sm:p-3 rounded-xl border border-[#1E3FA0]/15 text-center flex flex-col justify-center shadow-xs">
          <span className="text-xl sm:text-2xl font-black text-[#1B37A0] tracking-tight">
            {String(time.days).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-extrabold text-slate-500 mt-0.5">Days</span>
        </div>

        <span className="text-[#1E3FA0]/40 font-bold text-lg pb-3">:</span>

        {/* Hours */}
        <div className="flex-1 bg-gradient-to-b from-white to-[#F0F6FE] p-2.5 sm:p-3 rounded-xl border border-[#1E3FA0]/15 text-center flex flex-col justify-center shadow-xs">
          <span className="text-xl sm:text-2xl font-black text-[#1B37A0] tracking-tight">
            {String(time.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-extrabold text-slate-500 mt-0.5">Hours</span>
        </div>

        <span className="text-[#1E3FA0]/40 font-bold text-lg pb-3">:</span>

        {/* Minutes */}
        <div className="flex-1 bg-gradient-to-b from-white to-[#F0F6FE] p-2.5 sm:p-3 rounded-xl border border-[#1E3FA0]/15 text-center flex flex-col justify-center shadow-xs">
          <span className="text-xl sm:text-2xl font-black text-[#1B37A0] tracking-tight">
            {String(time.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-extrabold text-slate-500 mt-0.5">Mins</span>
        </div>

        <span className="text-[#1E3FA0]/40 font-bold text-lg pb-3">:</span>

        {/* Seconds */}
        <div className="flex-1 bg-gradient-to-b from-white to-[#F0F6FE] p-2.5 sm:p-3 rounded-xl border border-[#1E3FA0]/15 text-center flex flex-col justify-center shadow-xs">
          <span className="text-xl sm:text-2xl font-black text-[#0E8074] tracking-tight animate-pulse">
            {String(time.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase font-sans font-extrabold text-slate-500 mt-0.5">Secs</span>
        </div>
      </div>
    </div>
  );
};
