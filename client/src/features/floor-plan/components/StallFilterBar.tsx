import React, { useEffect, useMemo } from 'react';
import { Stall, StallCategory } from '../../../types';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Filter, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface StallFilterBarProps {
  stalls?: Stall[];
  layoutData?: FloorPlanLayoutData | null;
  onZoomChange?: (zoom: number) => void;
  currentZoom?: number;
  halls?: Array<{ id: string; name: string }>;
  showZoomControls?: boolean;
}

const CATEGORY_STYLES: Record<
  StallCategory,
  { label: string; dotBg: string; swatchBorder: string; swatchBg: string }
> = {
  STANDARD: {
    label: 'Standard',
    dotBg: 'bg-blue-600',
    swatchBorder: 'border-blue-600',
    swatchBg: 'bg-blue-50 dark:bg-blue-950/60',
  },
  PREMIUM: {
    label: 'Premium',
    dotBg: 'bg-emerald-600',
    swatchBorder: 'border-emerald-600',
    swatchBg: 'bg-emerald-50 dark:bg-emerald-950/60',
  },
  CORNER: {
    label: 'Corner',
    dotBg: 'bg-amber-500',
    swatchBorder: 'border-amber-500',
    swatchBg: 'bg-amber-50 dark:bg-amber-950/60',
  },
  ISLAND: {
    label: 'Island',
    dotBg: 'bg-purple-600',
    swatchBorder: 'border-purple-600',
    swatchBg: 'bg-purple-50 dark:bg-purple-950/60',
  },
};

export const StallFilterBar: React.FC<StallFilterBarProps> = ({
  stalls,
  layoutData,
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

  const availableStalls = stalls ? stalls.filter((s) => s.status === 'AVAILABLE') : [];
  const availableCount = availableStalls.length;
  const bookedCount = stalls ? stalls.filter((s) => s.status && s.status !== 'AVAILABLE').length : null;

  const categoryCounts = {
    STANDARD: availableStalls.filter((s) => s.category === 'STANDARD').length,
    PREMIUM: availableStalls.filter((s) => s.category === 'PREMIUM').length,
    CORNER: availableStalls.filter((s) => s.category === 'CORNER').length,
    ISLAND: availableStalls.filter((s) => s.category === 'ISLAND').length,
  };

  // Only display categories that actually exist in this exhibition
  const activeCategories = useMemo(() => {
    const defaultCats: StallCategory[] = ['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];
    if (!stalls || stalls.length === 0) return defaultCats;
    const existing = defaultCats.filter((cat) => stalls.some((s) => s.category === cat));
    return existing.length > 0 ? existing : defaultCats;
  }, [stalls]);

  // Check if any stalls have custom hex colors assigned in studio
  const customColors = useMemo(() => {
    if (!stalls) return [];
    const colors = new Set<string>();
    stalls.forEach((s) => {
      const c =
        (s as any).color ||
        layoutData?.stallColors?.[s.stallNumber] ||
        layoutData?.stallColors?.[s.id];
      if (c && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
        colors.add(c.toLowerCase());
      }
    });
    return Array.from(colors);
  }, [stalls, layoutData]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs transition-colors duration-200">

      {/* Bottom Row: Category Chips, Legend Indicators & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === null
                ? 'bg-[#09539b] text-white shadow-2xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Stalls ({availableCount})
          </button>
          {activeCategories.map((cat) => {
            const style = CATEGORY_STYLES[cat];
            const count = categoryCounts[cat];
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#09539b] text-white border-[#09539b] shadow-2xs font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${style.dotBg} ${isSelected ? 'ring-2 ring-white/80' : ''}`} />
                <span>{style.label}</span>
                <span className={`font-mono text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend Indicators with Category Colors, Custom Colors, Selected and Booked */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
          {/* Available Stall Tiers */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Available:</span>
            {activeCategories.map((cat) => {
              const style = CATEGORY_STYLES[cat];
              return (
                <span key={cat} className="flex items-center gap-1" title={`${style.label} Tier Available`}>
                  <span className={`w-2.5 h-2.5 rounded-xs border-2 ${style.swatchBorder} ${style.swatchBg} inline-block`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">{style.label}</span>
                </span>
              );
            })}
            {customColors.map((hex, idx) => (
              <span key={hex} className="flex items-center gap-1" title={`Custom Color Stall (${hex})`}>
                <span
                  className="w-2.5 h-2.5 rounded-xs border-2 inline-block"
                  style={{ borderColor: hex, backgroundColor: `${hex}26` }}
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                  Custom {customColors.length > 1 ? `#${idx + 1}` : ''}
                </span>
              </span>
            ))}
          </div>

          {/* Selected Status */}
          <span className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
            <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border-2 border-blue-600 ring-2 ring-blue-500/20 inline-block" />
            <span>Selected</span>
          </span>

          {/* Booked Status */}
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 inline-block" />
            <span>Booked {bookedCount !== null && <strong className="font-mono text-slate-700 dark:text-slate-300">({bookedCount})</strong>}</span>
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
