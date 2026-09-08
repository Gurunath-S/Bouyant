import React from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useThemeStore } from '../../../stores/themeStore';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';

interface FloorPlanCanvasProps {
  stalls: Stall[];
  onStallSelect: (stall: Stall) => void;
  layoutData?: FloorPlanLayoutData | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  stalls,
  onStallSelect,
  layoutData,
  canvasWidth: propWidth,
  canvasHeight: propHeight,
}) => {
  const { selectedStallId, zoomLevel, selectedCategory, selectedStatus, selectedHall } = useFloorPlanStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const width = propWidth || layoutData?.canvasWidth || 1400;
  const height = propHeight || layoutData?.canvasHeight || 850;
  const pxPerMeter = layoutData?.gridSize || 20;

  // Filter stalls based on category, status, and optional hall selection
  const filteredStalls = stalls.filter((stall) => {
    if (selectedCategory && stall.category !== selectedCategory) return false;
    if (selectedStatus && stall.status !== selectedStatus) return false;

    if (selectedHall && layoutData?.halls) {
      const targetHall = layoutData.halls.find(
        (h) => h.id === selectedHall || h.name.toLowerCase().includes(selectedHall.toLowerCase())
      );
      if (targetHall) {
        const inX = stall.xPosition >= targetHall.x && stall.xPosition <= targetHall.x + targetHall.width;
        const inY = stall.yPosition >= targetHall.y && stall.yPosition <= targetHall.y + targetHall.height;
        return inX && inY;
      }
    }

    return true;
  });

  const getStallStyles = (stall: Stall) => {
    const isSelected = stall.id === selectedStallId;

    if (isSelected) {
      return {
        fill: isDark ? '#1e3a8a' : '#dbeafe',
        stroke: '#2563eb',
        strokeWidth: 3,
        textColor: isDark ? '#93c5fd' : '#1d4ed8',
      };
    }

    switch (stall.status) {
      case 'AVAILABLE':
        if (stall.category === 'PREMIUM') {
          return {
            fill: isDark ? '#172554' : '#eff6ff',
            stroke: '#3b82f6',
            strokeWidth: 1.5,
            textColor: isDark ? '#bfdbfe' : '#1d4ed8',
          };
        } else if (stall.category === 'CORNER') {
          return {
            fill: isDark ? '#451a03' : '#fffbeb',
            stroke: '#f59e0b',
            strokeWidth: 1.5,
            textColor: isDark ? '#fde68a' : '#b45309',
          };
        } else if (stall.category === 'ISLAND') {
          return {
            fill: isDark ? '#3b0764' : '#faf5ff',
            stroke: '#8b5cf6',
            strokeWidth: 1.5,
            textColor: isDark ? '#ddd6fe' : '#6d28d9',
          };
        }
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

  // Derive dynamic halls list
  const hallsList = layoutData?.halls && layoutData.halls.length > 0
    ? layoutData.halls
    : [
        {
          id: 'hall-main',
          name: 'Main Exhibition Hall',
          x: 30,
          y: 30,
          width: width - 60,
          height: height - 60,
          color: '#3b82f6',
        },
      ];

  const facilitiesList = layoutData?.facilities || [];
  const annotationsList = layoutData?.annotations || [];

  return (
    <div className="relative w-full overflow-auto bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-xl p-4 min-h-[600px] shadow-inner flex items-center justify-center bg-floor-grid transition-colors duration-200">
      <div
        className="transition-transform duration-200 ease-out origin-top-left"
        style={{ transform: `scale(${zoomLevel / 100})` }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none shadow-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          {/* Dynamic Halls / Pavilions */}
          <g id="halls-layer">
            {hallsList.map((hall) => {
              const strokeColor = hall.color || (isDark ? '#3b82f6' : '#2563eb');
              const widthM = Math.round(hall.width / pxPerMeter);
              const heightM = Math.round(hall.height / pxPerMeter);

              return (
                <g key={hall.id}>
                  <rect
                    x={hall.x}
                    y={hall.y}
                    width={hall.width}
                    height={hall.height}
                    rx="12"
                    fill={isDark ? '#0f172a' : '#f8fafc'}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                  />
                  {/* Hall Name Header */}
                  <rect
                    x={hall.x + 16}
                    y={hall.y + 12}
                    width={Math.min(360, hall.width - 32)}
                    height={26}
                    rx="6"
                    fill={strokeColor}
                    fillOpacity={isDark ? '0.2' : '0.1'}
                  />
                  <text
                    x={hall.x + 28}
                    y={hall.y + 29}
                    fill={strokeColor}
                    fontSize="12"
                    fontWeight="900"
                    letterSpacing="1"
                    className="uppercase select-none"
                  >
                    {hall.name} • {widthM}m × {heightM}m
                  </text>
                </g>
              );
            })}
          </g>

          {/* Dynamic Facilities & Special Zones */}
          <g id="facilities-layer">
            {facilitiesList.map((fac) => {
              let bgFill = isDark ? '#1e293b' : '#f1f5f9';
              let strokeCol = isDark ? '#475569' : '#64748b';
              let textCol = isDark ? '#f1f5f9' : '#334155';

              if (fac.type === 'entrance') {
                bgFill = isDark ? '#064e3b' : '#047857';
                strokeCol = '#059669';
                textCol = '#ffffff';
              } else if (fac.type === 'exit') {
                bgFill = isDark ? '#881337' : '#be123c';
                strokeCol = '#e11d48';
                textCol = '#ffffff';
              } else if (fac.type === 'registration') {
                bgFill = isDark ? '#1e3a8a' : '#1d4ed8';
                strokeCol = '#3b82f6';
                textCol = '#ffffff';
              } else if (fac.type === 'stage') {
                bgFill = isDark ? '#4c1d95' : '#6d28d9';
                strokeCol = '#8b5cf6';
                textCol = '#ffffff';
              } else if (fac.type === 'food-court' || fac.type === 'dining') {
                bgFill = isDark ? '#78350f' : '#fef3c7';
                strokeCol = '#f59e0b';
                textCol = isDark ? '#fde68a' : '#92400e';
              } else if (fac.type === 'restroom') {
                bgFill = isDark ? '#0c4a6e' : '#e0f2fe';
                strokeCol = '#0284c7';
                textCol = isDark ? '#bae6fd' : '#0369a1';
              } else if (fac.type === 'custom-zone') {
                bgFill = isDark ? '#2e1065' : '#f5f3ff';
                strokeCol = '#8b5cf6';
                textCol = isDark ? '#ddd6fe' : '#6d28d9';
              }

              const transformAttr = fac.rotation
                ? `rotate(${fac.rotation} ${fac.x + fac.width / 2} ${fac.y + fac.height / 2})`
                : undefined;

              return (
                <g key={fac.id} transform={transformAttr}>
                  <rect
                    x={fac.x}
                    y={fac.y}
                    width={fac.width}
                    height={fac.height}
                    rx="6"
                    fill={bgFill}
                    stroke={strokeCol}
                    strokeWidth="1.5"
                  />
                  <text
                    x={fac.x + fac.width / 2}
                    y={fac.y + fac.height / 2 + 4}
                    textAnchor="middle"
                    fill={textCol}
                    fontSize="10"
                    fontWeight="bold"
                    letterSpacing="0.8"
                    className="select-none pointer-events-none uppercase"
                  >
                    {fac.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Dynamic Annotations */}
          <g id="annotations-layer">
            {annotationsList.map((ann) => (
              <text
                key={ann.id}
                x={ann.x}
                y={ann.y}
                fill={isDark ? '#94a3b8' : ann.color || '#475569'}
                fontSize={ann.fontSize || 12}
                fontWeight="bold"
                className="select-none"
              >
                {ann.text}
              </text>
            ))}
          </g>

          {/* Stalls Render Grid */}
          <g id="stalls-layer">
            {filteredStalls.map((stall) => {
              const styles = getStallStyles(stall);
              const isSelected = stall.id === selectedStallId;
              const isBlocked = stall.status === 'BLOCKED';
              const isBooked = stall.status === 'BOOKED_CONFIRMED';
              const isAvailable = stall.status === 'AVAILABLE';

              return (
                <g
                  key={stall.id}
                  onClick={() => onStallSelect(stall)}
                  className={`transition-transform duration-150 ${
                    isAvailable ? 'cursor-pointer hover:opacity-85' : 'cursor-pointer opacity-95'
                  }`}
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
                    strokeDasharray={isBlocked ? '4 3' : 'none'}
                    className="transition-colors"
                  />

                  {/* Stall Number Header */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 - (stall.height > 45 ? 5 : 0)}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize={stall.width < 50 ? '9' : '11'}
                    fontWeight="bold"
                    className="select-none pointer-events-none font-mono"
                  >
                    {stall.stallNumber}
                  </text>

                  {/* Price / Status Tag */}
                  {stall.height > 45 && (
                    <text
                      x={stall.xPosition + stall.width / 2}
                      y={stall.yPosition + stall.height / 2 + 11}
                      textAnchor="middle"
                      fill={styles.textColor}
                      fontSize="8"
                      fontWeight="700"
                      className="select-none pointer-events-none font-mono opacity-90"
                    >
                      {isBooked ? 'BOOKED' : isBlocked ? 'BLOCKED' : `₹${Number(stall.price).toLocaleString()}`}
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
