import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Clock } from 'lucide-react';
import { Button } from './Button';

interface TimerExtensionModalProps {
  isOpen: boolean;
  type?: 'EXTENSION_PROMPT' | 'EXPIRED_TIMEOUT';
  remainingSeconds?: number;
  onExtendHold?: () => void;
  onCancelBooking?: () => void;
  onRestartBooking: () => void;
}

export const TimerExtensionModal: React.FC<TimerExtensionModalProps> = ({
  isOpen,
  onRestartBooking,
}) => {
  if (!isOpen) return null;

  const modalNode = (
    <div className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden transform transition-all scale-100 my-auto">
        
        {/* Visual Top Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        {/* Bespoke Time Out Vector Illustration */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center mt-1">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-500/10 rounded-full blur-xl animate-pulse" />
          <svg
            className="w-24 h-24 relative z-10 drop-shadow-md"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Dial Base */}
            <circle cx="60" cy="64" r="44" className="fill-slate-50 dark:fill-slate-800/90 stroke-slate-200 dark:stroke-slate-700" strokeWidth="2.5" />
            
            {/* Top Stopwatch stem & pusher crown */}
            <rect x="56" y="10" width="8" height="10" rx="3" className="fill-slate-400 dark:fill-slate-500" />
            <rect x="52" y="8" width="16" height="4" rx="2" className="fill-slate-600 dark:fill-slate-300" />
            <rect x="80" y="18" width="6" height="8" rx="2" transform="rotate(35 80 18)" className="fill-slate-400 dark:fill-slate-500" />

            {/* Expired Meter Outer Ring (amber to rose) */}
            <circle
              cx="60"
              cy="64"
              r="38"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="170 60"
              className="text-amber-500/30 dark:text-amber-400/25"
            />
            <circle
              cx="60"
              cy="64"
              r="38"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="45 200"
              className="text-rose-500 dark:text-rose-400"
            />

            {/* Cardinal Clock ticks */}
            <line x1="60" y1="31" x2="60" y2="36" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
            <line x1="60" y1="92" x2="60" y2="97" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
            <line x1="27" y1="64" x2="32" y2="64" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
            <line x1="88" y1="64" x2="93" y2="64" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />

            {/* Inner Plate */}
            <circle cx="60" cy="64" r="28" className="fill-white dark:fill-slate-900 shadow-xs" />

            {/* Digital readout badge "00:00" */}
            <rect x="42" y="55" width="36" height="18" rx="6" className="fill-rose-50 dark:fill-rose-950/80 stroke-rose-200 dark:stroke-rose-800/60" strokeWidth="1" />
            <text x="60" y="68" textAnchor="middle" className="fill-rose-600 dark:fill-rose-400 text-[11px] font-black font-mono tracking-tight">00:00</text>

            {/* Alert / Exclamation Indicator */}
            <circle cx="60" cy="42" r="3" className="fill-rose-500 animate-ping opacity-75" />
            <circle cx="60" cy="42" r="3" className="fill-rose-500" />
          </svg>
        </div>

        {/* Content Header & Short Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Time Out
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sora">
            Reservation Session Expired
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your 15-minute stall hold has ended. Selected booths were released back to the floor plan so other exhibitors can reserve them.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={onRestartBooking}
            className="w-full justify-center bg-gradient-to-r from-[#09539b] to-[#1E3FA0] hover:from-[#073d74] hover:to-[#152B75] text-white font-extrabold py-3.5 shadow-md hover:shadow-lg transition-all rounded-xl cursor-pointer"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Re-select Stall on Floor Plan
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
};
