import React from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useThemeStore } from '../../../stores/themeStore';

interface FloorPlanCanvasProps {
  stalls: Stall[];
  onStallSelect: (stall: Stall) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({ stalls, onStallSelect }) => {
  const { selectedStallId, zoomLevel, selectedCategory, selectedStatus } = useFloorPlanStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const filteredStalls = stalls.filter((stall) => {
    if (selectedCategory && stall.category !== selectedCategory) return false;
    if (selectedStatus && stall.status !== selectedStatus) return false;
    return true;
  });

  const getStallStyles = (stall: Stall) => {
    const isSelected = stall.id === selectedStallId;

    if (isSelected) {
      return {
        fill: isDark ? '#1e3a8a' : '#dbeafe',
        stroke: '#3b82f6',
        strokeWidth: 3,
        textColor: isDark ? '#93c5fd' : '#1d4ed8',
      };
    }

    switch (stall.status) {
      case 'AVAILABLE':
        return {
          fill: isDark ? '#064e3b' : '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 1.5,
          textColor: isDark ? '#a7f3d0' : '#047857',
        };
      case 'TEMPORARILY_HELD':
        return {
          fill: isDark ? '#78350f' : '#fffbeb',
          stroke: '#f59e0b',
          strokeWidth: 1.5,
          textColor: isDark ? '#fde68a' : '#b45309',
        };
      case 'PAYMENT_PENDING':
      case 'BOOKING_IN_PROGRESS':
        return {
          fill: isDark ? '#075985' : '#f0f9ff',
          stroke: '#38bdf8',
          strokeWidth: 1.5,
          textColor: isDark ? '#bae6fd' : '#0369a1',
        };
      case 'BOOKED_CONFIRMED':
        return {
          fill: isDark ? '#1e293b' : '#f1f5f9',
          stroke: isDark ? '#475569' : '#94a3b8',
          strokeWidth: 1.5,
          textColor: isDark ? '#94a3b8' : '#64748b',
        };
      case 'BLOCKED':
        return {
          fill: isDark ? '#881337' : '#fef2f2',
          stroke: '#f43f5e',
          strokeWidth: 1.5,
          textColor: isDark ? '#fecdd3' : '#be123c',
        };
      default:
        return {
          fill: isDark ? '#0f172a' : '#f8fafc',
          stroke: isDark ? '#334155' : '#cbd5e1',
          strokeWidth: 1,
          textColor: isDark ? '#94a3b8' : '#475569',
        };
    }
  };

  return (
    <div className="relative w-full overflow-auto bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-xl p-4 min-h-[550px] shadow-inner flex items-center justify-center bg-floor-grid transition-colors duration-200">
      <div
        className="transition-transform duration-200 ease-out origin-top-left"
        style={{ transform: `scale(${zoomLevel / 100})` }}
      >
        <svg width="1050" height="650" viewBox="0 0 1050 650" className="select-none shadow-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {/* Hall Outer Boundary */}
          <rect x="20" y="20" width="1010" height="610" rx="12" fill="none" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" strokeDasharray="6 6" />

          {/* Entrance & Common Zones */}
          <g>
            {/* Main Entrance */}
            <rect x="425" y="618" width="200" height="12" fill={isDark ? '#38bdf8' : '#0f172a'} rx="4" />
            <text x="525" y="612" textAnchor="middle" fill={isDark ? '#38bdf8' : '#0f172a'} fontSize="11" fontWeight="bold" letterSpacing="1">
              MAIN ENTRANCE / REGISTRATION
            </text>

            {/* Stage / Keynote Zone */}
            <rect x="375" y="32" width="300" height="40" fill={isDark ? '#1e293b' : '#f1f5f9'} stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" rx="6" />
            <text x="525" y="56" textAnchor="middle" fill={isDark ? '#cbd5e1' : '#334155'} fontSize="12" fontWeight="bold">
              CENTER STAGE & KEYNOTE AUDITORIUM
            </text>

            {/* Aisle Markers */}
            <text x="70" y="320" textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} fontSize="11" fontWeight="bold" letterSpacing="2">
              AISLE A
            </text>
            <text x="980" y="320" textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} fontSize="11" fontWeight="bold" letterSpacing="2">
              AISLE B
            </text>
          </g>

          {/* Stalls Render Grid */}
          <g>
            {filteredStalls.map((stall) => {
              const styles = getStallStyles(stall);
              return (
                <g
                  key={stall.id}
                  onClick={() => onStallSelect(stall)}
                  className="cursor-pointer transition-transform duration-150 hover:opacity-90"
                >
                  <rect
                    x={stall.xPosition}
                    y={stall.yPosition}
                    width={stall.width}
                    height={stall.height}
                    rx="6"
                    fill={styles.fill}
                    stroke={styles.stroke}
                    strokeWidth={styles.strokeWidth}
                  />

                  {/* Stall Number Header */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 - 8}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize="13"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {stall.stallNumber}
                  </text>

                  {/* Category / Dimensions */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 + 8}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize="9"
                    fontWeight="600"
                    opacity="0.85"
                  >
                    {stall.category}
                  </text>

                  {/* Price */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 + 22}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    ${Number(stall.price).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
