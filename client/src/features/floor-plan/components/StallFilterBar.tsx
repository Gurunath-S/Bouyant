import React from 'react';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { StallCategory, Stall } from '../../../types';
import { ZoomIn, ZoomOut, RotateCcw, Filter } from 'lucide-react';

interface StallFilterBarProps {
  stalls: Stall[];
  onZoomChange: (zoom: number) => void;
  currentZoom: number;
}

export const StallFilterBar: React.FC<StallFilterBarProps> = ({ onZoomChange, currentZoom }) => {
  const { selectedCategory, setSelectedCategory } = useFloorPlanStore();

  const categories: (StallCategory | null)[] = [null, 'STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
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
                ? 'bg-blue-600 text-white shadow-2xs'
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
  );
};
