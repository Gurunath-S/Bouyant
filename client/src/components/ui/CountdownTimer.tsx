import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      setTimeLeft({ minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (!timeLeft) return null;

  const isWarning = timeLeft.minutes < 3;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
        isWarning
          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          : 'bg-amber-50 text-amber-800 border-amber-200'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Hold Expires in:{' '}
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
