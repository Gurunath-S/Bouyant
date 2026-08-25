import React from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';

interface FloorPlanCanvasProps {
  stalls: Stall[];
  onStallSelect: (stall: Stall) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({ stalls, onStallSelect }) => {
  const { selectedStallId, zoomLevel, selectedCategory, selectedStatus } = useFloorPlanStore();

  const filteredStalls = stalls.filter((stall) => {
    if (selectedCategory && stall.category !== selectedCategory) return false;
    if (selectedStatus && stall.status !== selectedStatus) return false;
    return true;
  });

  const getStallStyles = (stall: Stall) => {
    const isSelected = stall.id === selectedStallId;

    if (isSelected) {
      return {
        fill: '#dbeafe',
        stroke: '#2563eb',
        strokeWidth: 3,
        textColor: '#1d4ed8',
      };
    }

    switch (stall.status) {
      case 'AVAILABLE':
        return {
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 1.5,
          textColor: '#047857',
        };
      case 'TEMPORARILY_HELD':
        return {
          fill: '#fffbeb',
          stroke: '#f59e0b',
          strokeWidth: 1.5,
          textColor: '#b45309',
        };
      case 'PAYMENT_PENDING':
      case 'BOOKING_IN_PROGRESS':
        return {
          fill: '#f0f9ff',
          stroke: '#0284c7',
          strokeWidth: 1.5,
          textColor: '#0369a1',
        };
      case 'BOOKED_CONFIRMED':
        return {
          fill: '#f1f5f9',
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          textColor: '#64748b',
        };
      case 'BLOCKED':
        return {
          fill: '#fef2f2',
          stroke: '#f43f5e',
          strokeWidth: 1.5,
          textColor: '#be123c',
        };
      default:
        return {
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          textColor: '#475569',
        };
    }
  };

  return (
    <div className="relative w-full overflow-auto bg-slate-100/80 border border-slate-300 rounded-xl p-4 min-h-[550px] shadow-inner flex items-center justify-center bg-floor-grid">
      <div
        className="transition-transform duration-200 ease-out origin-top-left"
        style={{ transform: `scale(${zoomLevel / 100})` }}
      >
        <svg width="1050" height="650" viewBox="0 0 1050 650" className="select-none shadow-sm bg-white rounded-lg border border-slate-200">
          {/* Hall Outer Boundary */}
          <rect x="20" y="20" width="1010" height="610" rx="12" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 6" />

          {/* Entrance & Common Zones */}
          <g>
            {/* Main Entrance */}
            <rect x="425" y="618" width="200" height="12" fill="#0f172a" rx="4" />
            <text x="525" y="612" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold" letterSpacing="1">
              MAIN ENTRANCE / REGISTRATION
            </text>

            {/* Stage / Keynote Zone */}
            <rect x="375" y="32" width="300" height="40" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" rx="6" />
            <text x="525" y="56" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">
              CENTER STAGE & KEYNOTE AUDITORIUM
            </text>

            {/* Aisle Markers */}
            <text x="70" y="320" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" letterSpacing="2">
              AISLE A
            </text>
            <text x="980" y="320" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" letterSpacing="2">
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
