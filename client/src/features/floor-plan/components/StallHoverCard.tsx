import React from 'react';
import { Stall } from '../../../types';
import { StallStatusBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../stores/authStore';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { X, Lock, ArrowRight, Maximize2, Tag, Sliders } from 'lucide-react';

interface StallHoverCardProps {
  stall: Stall;
  onClose: () => void;
  onHold: () => void;
}

export const StallHoverCard: React.FC<StallHoverCardProps> = ({ stall, onClose, onHold }) => {
  const { user } = useAuthStore();
  const { heldStallIds, selectedStallIds } = useFloorPlanStore();

  const isHeldByMe =
    selectedStallIds.includes(stall.id) ||
    heldStallIds.includes(stall.id) ||
    (!!stall.heldByUserId && !!user && stall.heldByUserId === user.id);

  const isInProgressByOther =
    (stall.status === 'TEMPORARILY_HELD' ||
      stall.status === 'PAYMENT_PENDING' ||
      stall.status === 'BOOKING_IN_PROGRESS') &&
    !isHeldByMe;

  const isAvailable = stall.status === 'AVAILABLE' && !isInProgressByOther;
  const isHeld =
    isHeldByMe &&
    (stall.status === 'TEMPORARILY_HELD' ||
      stall.status === 'PAYMENT_PENDING' ||
      stall.status === 'BOOKING_IN_PROGRESS');

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
        <StallStatusBadge status={isInProgressByOther || stall.status === 'BLOCKED' ? 'BOOKED_CONFIRMED' : stall.status} userView={true} />
        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded uppercase">
          {stall.category}
        </span>
      </div>

      {/* Specifications */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Size & Dimensions:
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {stall.actualWidth && stall.actualHeight
              ? `${stall.actualWidth}m × ${stall.actualHeight}m`
              : stall.name && stall.name !== `Stall ${stall.stallNumber}`
              ? stall.name
              : `${(stall.width / 20).toFixed(1)}m × ${(stall.height / 20).toFixed(1)}m`}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Physical Area:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {Math.round(stall.areaSqFt)} Sq.Ft ({Math.round(stall.areaSqFt / 10.764)} m²)
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Rental Fee:
          </span>
          <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400 text-sm">
            ₹{Number(stall.price).toLocaleString()} INR
          </span>
        </div>
      </div>

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
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-center text-xs font-semibold text-red-700 dark:text-red-300 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-red-500 dark:text-red-400" />
            Stall Already Booked
          </div>
        )}
      </div>
    </div>
  );
};
