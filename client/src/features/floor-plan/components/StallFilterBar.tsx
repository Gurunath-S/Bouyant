import React, { useEffect } from 'react';
import { Stall, StallCategory } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Filter, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface StallFilterBarProps {
  stalls?: Stall[];
  onZoomChange?: (zoom: number) => void;
  currentZoom?: number;
  halls?: Array<{ id: string; name: string }>;
  showZoomControls?: boolean;
}

export const StallFilterBar: React.FC<StallFilterBarProps> = ({
  onZoomChange,
  currentZoom = 100,
  showZoomControls = true,
}) => {
  const {
    selectedCategory,
    setSelectedCategory,
    setSelectedHall,
  } = useFloorPlanStore();

  useEffect(() => {
    setSelectedHall('ALL');
  }, [setSelectedHall]);

  const categories: (StallCategory | null)[] = [null, 'STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs transition-colors duration-200">

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
            <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border-2 border-blue-600 inline-block" />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 inline-block" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-dashed border-slate-500 dark:border-slate-400 inline-block" />
            Blocked / In Progress
          </span>
        </div>

        {/* Zoom Controls: Zoom Out enabled ONLY when user has zoomed in (> 100%) */}
        {showZoomControls && onZoomChange && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg">
            <button
              type="button"
              disabled={currentZoom <= 100}
              onClick={() => onZoomChange(Math.max(100, currentZoom - 15))}
              className={`p-1 rounded transition-colors ${
                currentZoom > 100
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-35'
              }`}
              title={currentZoom > 100 ? "Zoom Out towards 100%" : "At standard 100% view (zoom out disabled)"}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 px-1.5 min-w-[42px] text-center">
              {currentZoom}%
            </span>
            <button
              type="button"
              disabled={currentZoom >= 200}
              onClick={() => onZoomChange(Math.min(200, currentZoom + 15))}
              className={`p-1 rounded transition-colors ${
                currentZoom < 200
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-35'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(100)}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors ml-0.5 cursor-pointer"
              title="Reset to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
