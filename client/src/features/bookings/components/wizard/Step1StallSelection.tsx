import React from 'react';
import { Exhibition, Stall } from '../../../../types';
import { FloorPlanLayoutData } from '../../../../types/floorPlanStudio';
import { FloorPlanCanvas } from '../../../floor-plan/components/FloorPlanCanvas';
import { StallFilterBar } from '../../../floor-plan/components/StallFilterBar';
import { useFloorPlanStore } from '../../../../stores/floorPlanStore';
import { Button } from '../../../../components/ui/Button';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';

interface Step1StallSelectionProps {
  exhibition: Exhibition;
  stalls: Stall[];
  layoutData: FloorPlanLayoutData | null;
  selectedStallIds: string[];
  toggleStallSelection: (stall: Stall) => void;
  clearStallSelection: () => void;
  stallHoldError: string;
  isBookingClosed: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  onProceed: () => void;
}

export const Step1StallSelection: React.FC<Step1StallSelectionProps> = ({
  exhibition,
  stalls,
  layoutData,
  selectedStallIds,
  toggleStallSelection,
  clearStallSelection,
  stallHoldError,
  isBookingClosed,
  isFullscreen,
  setIsFullscreen,
  onProceed,
}) => {
  const { conflicts, removeStallFromSelection } = useFloorPlanStore();

  // Exclude conflicting stalls from price, count, area calculations
  const validSelectedStallIds = selectedStallIds.filter(
    (id) => !conflicts.some((c) => c.stallId === id)
  );
  const selectedStallsObj = stalls.filter((s) => validSelectedStallIds.includes(s.id));
  const basePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
  const taxAmount = Math.round(basePrice * 0.18);
  const grandTotal = basePrice + taxAmount;

  return (
    <div className="flex flex-col gap-2 space-y-2">
      {/* Conflicts Banner */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 rounded-xl text-rose-800 dark:text-rose-200 text-xs shadow-md space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{conflicts.length} selected stall(s) are no longer available</span>
          </div>
          <p className="text-rose-600 dark:text-rose-300">
            Another user has reserved or booked the following stall(s). Please remove them to proceed with your remaining selection:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {conflicts.map((c) => (
              <div
                key={c.stallId}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 rounded-lg text-rose-900 dark:text-rose-100 font-mono font-bold"
              >
                <span>Stall #{c.stallNumber} — No longer available</span>
                <button
                  onClick={() => removeStallFromSelection(c.stallId)}
                  className="p-1 hover:bg-rose-200 dark:hover:bg-rose-800 rounded-md text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                  title={`Remove stall ${c.stallNumber}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stallHoldError && conflicts.length === 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          {stallHoldError}
        </div>
      )}

      {isBookingClosed && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Stall Bookings Closed:</strong> The registration cut-off date for this exhibition has passed. Stall reservations are closed.
            </span>
          </div>
        </div>
      )}

      {/* Stalls Filter Bar */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <StallFilterBar stalls={stalls} showZoomControls={false} halls={layoutData?.halls} />
        </div>
      </div>

      {/* Canvas Wrapper */}
      <div className="relative w-full max-w-[1200px] mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm h-[500px] sm:h-[540px] lg:h-[560px]">
        <FloorPlanCanvas
          stalls={stalls}
          layoutData={layoutData}
          showBackgroundImage={false}
          showGrid={false}
          className="w-full h-full min-h-full"
          onStallSelect={(s) => {
            if (isBookingClosed) return;
            if (s.status === 'AVAILABLE' || selectedStallIds.includes(s.id)) toggleStallSelection(s);
          }}
        />
      </div>

      {/* Cinema-Style Bottom Bar */}
      {selectedStallsObj.length > 0 ? (
        <div className="sticky bottom-2 z-40 max-w-[1200px] mx-auto w-full bg-[#012970]/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-blue-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-[#9cc542] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {selectedStallsObj.length} Stall(s) Selected:
              </span>
              {selectedStallsObj.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-mono font-bold text-white transition-colors"
                >
                  #{s.stallNumber}
                  <button
                    onClick={() => toggleStallSelection(s)}
                    className="text-blue-300 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                    title={`Remove stall ${s.stallNumber}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearStallSelection}
                className="text-[11px] text-slate-300 hover:text-rose-400 underline ml-2 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
            <p className="text-[11px] text-blue-200 font-medium">
              Combined Area: <b className="text-white">{selectedStallsObj.reduce((sum, s) => sum + s.areaSqFt, 0)} Sq.Ft</b> • Base Rental: <b className="text-white font-mono">₹{basePrice.toLocaleString()}</b> (+ 18% GST: ₹{taxAmount.toLocaleString()})
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-[10px] text-blue-200 uppercase font-semibold block">Total Payable</span>
              <span className="text-lg sm:text-xl font-black font-mono text-[#9cc542]">₹{grandTotal.toLocaleString()} INR</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={onProceed}
              disabled={conflicts.length > 0}
              className={`font-black shadow-lg px-6 py-3 text-sm flex items-center gap-2 ${
                conflicts.length > 0
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#9cc542] hover:bg-[#8bb433] text-[#012970]'
              }`}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Booking
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-slate-500 rounded-xl text-center text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Click any available green stall to select your booth(s). Multiple stalls can be reserved together.
        </div>
      )}
    </div>
  );
};

