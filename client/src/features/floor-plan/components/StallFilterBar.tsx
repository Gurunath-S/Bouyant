import React from 'react';
import { Stall, StallCategory } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Filter, ZoomIn, ZoomOut, RotateCcw, Building } from 'lucide-react';

interface StallFilterBarProps {
  stalls: Stall[];
  onZoomChange: (zoom: number) => void;
  currentZoom: number;
  halls?: Array<{ id: string; name: string }>;
}

export const StallFilterBar: React.FC<StallFilterBarProps> = ({
  stalls,
  onZoomChange,
  currentZoom,
  halls,
}) => {
  const {
    selectedCategory,
    setSelectedCategory,
    selectedHall,
    setSelectedHall,
  } = useFloorPlanStore();

  const categories: (StallCategory | null)[] = [null, 'STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];

  // Extract unique stall prefixes if halls aren't provided
  const stallPrefixes = React.useMemo(() => {
    if (halls && halls.length > 0) return halls.map((h) => ({ id: h.id, label: h.name }));
    const set = new Set<string>();
    stalls.forEach((s) => {
      const parts = s.stallNumber.split('-');
      if (parts.length > 1 && parts[0].length <= 4) {
        set.add(parts[0]);
      }
    });
    return Array.from(set).map((p) => ({ id: p, label: `Zone / Hall ${p}` }));
  }, [stalls, halls]);

  // Derive dynamic pricing
  const prices = stalls.map((s) => Number(s.price)).filter((p) => !isNaN(p) && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3 transition-colors duration-200">
      {/* Top Row: Hall / Zone Filter & Live Pricing */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        {/* Hall / Pavilion Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Building className="w-3.5 h-3.5 text-blue-600" /> Filter by Area:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedHall('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                selectedHall === 'ALL'
                  ? 'bg-[#012970] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Stalls ({stalls.length})
            </button>
            {stallPrefixes.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedHall(p.id)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedHall === p.id
                    ? 'bg-[#09539b] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Pricing Rates Display */}
        {prices.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="px-2.5 py-1 bg-[#EEF4FC] text-[#09539b] rounded-lg border border-[#09539b]/20">
              Starting from: <b className="font-mono">₹{minPrice.toLocaleString()}</b>
            </span>
            {maxPrice > minPrice && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-300">
                Premium up to: <b className="font-mono text-amber-950">₹{maxPrice.toLocaleString()}</b>
              </span>
            )}
            <span className="text-slate-400 font-mono text-[10px]">* GST 18% Applicable</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Category Chips, Legend Indicators & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat || 'ALL'}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#09539b] text-white shadow-2xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat ? cat : 'All Categories'}
            </button>
          ))}
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-500 inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-500 inline-block" />
            Held
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 inline-block" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 dark:bg-rose-950 border border-rose-500 inline-block" />
            Blocked
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg">
          <button
            onClick={() => onZoomChange(Math.max(60, currentZoom - 15))}
            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 px-2">{currentZoom}%</span>
          <button
            onClick={() => onZoomChange(Math.min(180, currentZoom + 15))}
            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => onZoomChange(100)}
            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
