import React from 'react';
import { Clock, AlertTriangle, RotateCcw, ShieldCheck, RefreshCw, XCircle } from 'lucide-react';
import { Button } from './Button';

interface TimerExtensionModalProps {
  isOpen: boolean;
  type: 'EXTENSION_PROMPT' | 'EXPIRED_TIMEOUT';
  remainingSeconds: number;
  onExtendHold: () => void;
  onCancelBooking: () => void;
  onRestartBooking: () => void;
}

export const TimerExtensionModal: React.FC<TimerExtensionModalProps> = ({
  isOpen,
  type,
  remainingSeconds,
  onExtendHold,
  onCancelBooking,
  onRestartBooking,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden transform transition-all scale-100">
        
        {/* Visual Top Decorative Banner */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${type === 'EXTENSION_PROMPT' ? 'bg-gradient-to-r from-[#0E8074] via-[#09539b] to-[#1E3FA0]' : 'bg-gradient-to-r from-rose-600 to-red-600'}`} />

        {type === 'EXTENSION_PROMPT' ? (
          <>
            {/* ICON & TIMER BADGE */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E4F5F2] dark:bg-emerald-950/80 border border-[#0E8074]/30 text-[#0E8074] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0E8074] dark:text-emerald-400 block">
                  Stall Reservation Lock Active
                </span>
                <h3 className="text-xl font-extrabold text-[#012970] dark:text-slate-100 font-sora mt-0.5">
                  Would you like to extend your hold?
                </h3>
              </div>
            </div>

            {/* COUNTDOWN DISPLAY CARD */}
            <div className="bg-[#f0f7ff] dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 rounded-2xl p-4 text-center space-y-1">
              <p className="text-xs text-[#09539b] dark:text-blue-300 font-semibold">
                Your temporary stall hold expires in:
              </p>
              <div className="text-4xl font-black text-[#012970] dark:text-blue-400 font-mono tracking-tight">
                {timeFormatted}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Clicking <strong className="font-extrabold text-[#09539b] dark:text-blue-300">"Extend Hold (+5 Mins)"</strong> grants an extra 5 minutes to complete your reservation.
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If no action is taken, your stall reservation will automatically expire and return to the live floor plan.
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={onExtendHold}
                className="w-full justify-center bg-gradient-to-r from-[#09539b] to-[#1E3FA0] hover:from-[#073d74] hover:to-[#152B75] text-white font-extrabold py-3.5 shadow-md hover:shadow-lg"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Extend Hold (+5 Mins)
              </Button>
              <Button
                variant="outline"
                onClick={onCancelBooking}
                className="w-full sm:w-auto justify-center border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold py-3.5"
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* TIMEOUT / EXPIRED DISPLAY */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                  Reservation Session Timed Out
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-sora mt-0.5">
                  Your stall hold has expired
                </h3>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/40 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-red-900 dark:text-red-200 font-bold">
                Why did this happen?
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                The 10-minute hold window for your selected stalls ended. To prevent double-booking, the stalls were released back to the live floor plan.
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please restart your reservation to re-select available stalls on the interactive hall layout.
            </p>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={onRestartBooking}
                className="w-full justify-center bg-[#09539b] hover:bg-[#073d74] text-white font-extrabold py-3.5 shadow-md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Re-select Stalls on Floor Plan
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
