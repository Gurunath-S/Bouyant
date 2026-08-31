import React from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useThemeStore } from '../../../stores/themeStore';

interface FloorPlanCanvasProps {
  stalls: Stall[];
  onStallSelect: (stall: Stall) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({ stalls, onStallSelect }) => {
  const { selectedStallId, zoomLevel, selectedCategory, selectedStatus, selectedHall } = useFloorPlanStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const filteredStalls = stalls.filter((stall) => {
    if (selectedCategory && stall.category !== selectedCategory) return false;
    if (selectedStatus && stall.status !== selectedStatus) return false;

    // Hall A vs Hall B filtering based on stallNumber prefix or position
    if (selectedHall === 'HALL_A') {
      return stall.stallNumber.startsWith('A') || stall.xPosition < 480;
    }
    if (selectedHall === 'HALL_B') {
      return stall.stallNumber.startsWith('B') || stall.stallNumber.startsWith('C') || stall.stallNumber.startsWith('F') || stall.xPosition >= 480;
    }

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
    <div className="relative w-full overflow-auto bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-xl p-4 min-h-[600px] shadow-inner flex items-center justify-center bg-floor-grid transition-colors duration-200">
      <div
        className="transition-transform duration-200 ease-out origin-top-left"
        style={{ transform: `scale(${zoomLevel / 100})` }}
      >
        <svg width="1400" height="850" viewBox="0 0 1400 850" className="select-none shadow-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {/* Outer Boundary & Hall Split */}
          <rect x="20" y="20" width="1360" height="810" rx="14" fill="none" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" strokeDasharray="6 6" />

          {/* Pavilion - A Boundary (Left Hall) */}
          <rect x="35" y="35" width="620" height="770" rx="10" fill={isDark ? '#0f172a' : '#f8fafc'} stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="1.5" />
          <text x="345" y="62" textAnchor="middle" fill="#012970" fontSize="15" fontWeight="900" letterSpacing="1">
            PAVILION - A (HALL - A) • 47 STALLS (A1 - A48)
          </text>
          <text x="345" y="80" textAnchor="middle" fill="#09539b" fontSize="10" fontWeight="bold">
            Regular Stalls: ₹6,500/Sqm • Corner Premium: ₹7,000/Sqm (+18% GST)
          </text>

          {/* Pavilion - B Boundary (Right Hall) */}
          <rect x="690" y="35" width="670" height="770" rx="10" fill={isDark ? '#0f172a' : '#f8fafc'} stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="1.5" />
          <text x="1025" y="62" textAnchor="middle" fill="#012970" fontSize="15" fontWeight="900" letterSpacing="1">
            PAVILION - B (HALL - B) • 141 STALLS (B1-B94, C1-C37, F1-F10)
          </text>
          <text x="1025" y="80" textAnchor="middle" fill="#09539b" fontSize="10" fontWeight="bold">
            Regular Stalls: ₹6,500/Sqm • Corner Premium: ₹7,000/Sqm (+18% GST)
          </text>

          {/* Central Connecting Corridor */}
          <line x1="665" y1="35" x2="665" y2="805" stroke="#09539b" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.4" />
          <text x="665" y="420" textAnchor="middle" fill="#09539b" fontSize="11" fontWeight="bold" transform="rotate(-90 665 420)" letterSpacing="2">
            MAIN CENTRAL CONNECTING CORRIDOR
          </text>

          {/* Special Facility Zones from PDF */}
          <g>
            {/* Main Entry & Registration Desk */}
            <rect x="520" y="808" width="290" height="28" fill="#012970" rx="6" />
            <text x="665" y="826" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="1">
              MAIN ENTRY & REGISTRATION DESK
            </text>

            {/* Food Court & Dining Zone (Hall B Top Right) */}
            <rect x="1140" y="95" width="200" height="55" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" rx="8" />
            <text x="1240" y="120" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="800">
              FOOD COURT & DINING (F1-F10)
            </text>
            <text x="1240" y="136" textAnchor="middle" fill="#b45309" fontSize="9" fontWeight="bold">
              Exhibitor Refreshment Area
            </text>

            {/* Restrooms & Exit Shutters */}
            <rect x="50" y="750" width="130" height="40" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" rx="6" />
            <text x="115" y="774" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="bold">
              RESTROOMS & EXIT
            </text>

            <rect x="1220" y="750" width="120" height="40" fill="#f1f5f9" stroke="#64748b" strokeWidth="1" rx="6" />
            <text x="1280" y="774" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold">
              SERVICE SHUTTER
            </text>
          </g>

          {/* Stalls Render Grid */}
          <g>
            {filteredStalls.map((stall) => {
              const styles = getStallStyles(stall);
              const isLarge = stall.width > 60 || stall.height > 40;
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
                    rx="5"
                    fill={styles.fill}
                    stroke={styles.stroke}
                    strokeWidth={styles.strokeWidth}
                  />

                  {/* Stall Number Header */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 - (isLarge ? 6 : 2)}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize={isLarge ? '12' : '10'}
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {stall.stallNumber}
                  </text>

                  {/* Category / Dimensions */}
                  {isLarge && (
                    <text
                      x={stall.xPosition + stall.width / 2}
                      y={stall.yPosition + stall.height / 2 + 8}
                      textAnchor="middle"
                      fill={styles.textColor}
                      fontSize="8"
                      fontWeight="600"
                      opacity="0.85"
                    >
                      {stall.category}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
