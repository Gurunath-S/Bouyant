import React from 'react';
import { Stall } from '../../../types';
import { StallStatusBadge } from '../../../components/ui/Badge';
import { CountdownTimer } from '../../../components/ui/CountdownTimer';
import { Button } from '../../../components/ui/Button';
import { X, Lock, ArrowRight, Maximize2, Tag } from 'lucide-react';

interface StallHoverCardProps {
  stall: Stall;
  onClose: () => void;
  onHold: () => void;
}

export const StallHoverCard: React.FC<StallHoverCardProps> = ({ stall, onClose, onHold }) => {
  const isAvailable = stall.status === 'AVAILABLE';
  const isHeld = stall.status === 'TEMPORARILY_HELD';

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 space-y-4 shrink-0 animate-in slide-in-from-right duration-200 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Selected Stall</span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-none mt-0.5">
            Stall {stall.stallNumber}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status & Category */}
      <div className="flex items-center justify-between">
        <StallStatusBadge status={stall.status} />
        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded uppercase">
          {stall.category}
        </span>
      </div>

      {/* Specifications */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Physical Area:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{stall.areaSqFt} Sq.Ft</span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Rental Fee:
          </span>
          <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400 text-sm">
            ${Number(stall.price).toLocaleString()} USD
          </span>
        </div>
      </div>

      {/* Timer if held */}
      {isHeld && stall.heldUntil && (
        <div className="text-center py-1">
          <CountdownTimer targetDate={stall.heldUntil} />
        </div>
      )}

      {/* Actions */}
      <div className="pt-2">
        {isAvailable ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={onHold}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Hold & Proceed to Booking
          </Button>
        ) : isHeld ? (
          <Button variant="primary" className="w-full" onClick={onHold}>
            Resume Checkout
          </Button>
        ) : (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            Stall Currently Unavailable
          </div>
        )}
      </div>
    </div>
  );
};
