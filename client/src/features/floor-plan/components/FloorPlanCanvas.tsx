import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useThemeStore } from '../../../stores/themeStore';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { ZoomIn, ZoomOut, Move, RotateCcw, Maximize2 } from 'lucide-react';

interface FloorPlanCanvasProps {
  stalls: Stall[];
  onStallSelect: (stall: Stall) => void;
  layoutData?: FloorPlanLayoutData | null;
  canvasWidth?: number;
  canvasHeight?: number;
  className?: string;
  children?: React.ReactNode;
  showBackgroundImage?: boolean;
  showGrid?: boolean;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  stalls,
  onStallSelect,
  layoutData,
  canvasWidth: propWidth,
  canvasHeight: propHeight,
  className,
  children,
  showBackgroundImage = false,
  showGrid = false,
}) => {
  const { selectedStallIds, zoomLevel, setZoomLevel, baseZoomLevel, setBaseZoomLevel, selectedCategory, selectedStatus, selectedHall } = useFloorPlanStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Map-like pan & move state
  const containerRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  // Dynamic bounding box computation ensuring all stalls, halls, and facilities are fully framed
  const contentBounds = React.useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    stalls.forEach((s) => {
      minX = Math.min(minX, s.xPosition);
      minY = Math.min(minY, s.yPosition);
      maxX = Math.max(maxX, s.xPosition + s.width);
      maxY = Math.max(maxY, s.yPosition + s.height);
    });

    (layoutData?.halls || []).forEach((h) => {
      minX = Math.min(minX, h.x);
      minY = Math.min(minY, h.y);
      maxX = Math.max(maxX, h.x + h.width);
      maxY = Math.max(maxY, h.y + h.height);
    });

    (layoutData?.facilities || []).forEach((f) => {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    });

    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 1400, maxY: 850, width: 1400, height: 850, centerX: 700, centerY: 425 };
    }

    const pad = 60;
    const bMinX = Math.max(0, minX - pad);
    const bMinY = Math.max(0, minY - pad);
    const bMaxX = maxX + pad;
    const bMaxY = maxY + pad;

    return {
      minX: bMinX,
      minY: bMinY,
      maxX: bMaxX,
      maxY: bMaxY,
      width: Math.max(800, bMaxX - bMinX),
      height: Math.max(600, bMaxY - bMinY),
      centerX: (bMinX + bMaxX) / 2,
      centerY: (bMinY + bMaxY) / 2,
    };
  }, [stalls, layoutData]);

  const width = Math.max(propWidth || 0, layoutData?.canvasWidth || 0, contentBounds.maxX + 60, 1600);
  const height = Math.max(propHeight || 0, layoutData?.canvasHeight || 0, contentBounds.maxY + 60, 1000);
  const pxPerMeter = layoutData?.gridSize || 20;

  // Auto-fit entire floor plan into view on first load or when requested
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width || 900;
    const containerH = rect.height || 600;

    const scaleX = (containerW - 80) / contentBounds.width;
    const scaleY = (containerH - 80) / contentBounds.height;
    const fitScale = Math.min(1.0, Math.max(0.2, Math.min(scaleX, scaleY)));

    const svgCenterX = width / 2;
    const svgCenterY = height / 2;
    const offsetX = (svgCenterX - contentBounds.centerX) * fitScale;
    const offsetY = (svgCenterY - contentBounds.centerY) * fitScale;

    const targetZoom = Math.round(fitScale * 100);
    setBaseZoomLevel(targetZoom);
    setZoomLevel(targetZoom);
    setPanOffset({ x: Math.round(offsetX), y: Math.round(offsetY) });
  }, [contentBounds, width, height, setZoomLevel, setBaseZoomLevel]);

  const hasAutoFitted = useRef(false);
  useEffect(() => {
    if (stalls.length > 0 && !hasAutoFitted.current && containerRef.current) {
      hasAutoFitted.current = true;
      const timer = setTimeout(handleFitToScreen, 150);
      return () => clearTimeout(timer);
    }
  }, [stalls.length, handleFitToScreen]);

  useEffect(() => {
    const handleResize = () => {
      handleFitToScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleFitToScreen]);

  // Filter stalls based on category, status, and optional hall selection
  const filteredStalls = stalls.filter((stall) => {
    if (selectedCategory && stall.category !== selectedCategory) return false;
    if (selectedStatus && stall.status !== selectedStatus) return false;

    // ONLY filter by hall if a specific hall is chosen (NOT 'ALL')
    if (selectedHall && selectedHall !== 'ALL') {
      if (layoutData?.halls && layoutData.halls.length > 0) {
        const targetHall = layoutData.halls.find(
          (h) => h.id === selectedHall || h.name.trim().toLowerCase() === selectedHall.trim().toLowerCase()
        );
        if (targetHall) {
          const inX = stall.xPosition >= targetHall.x - 8 && stall.xPosition <= targetHall.x + targetHall.width + 8;
          const inY = stall.yPosition >= targetHall.y - 8 && stall.yPosition <= targetHall.y + targetHall.height + 8;
          return inX && inY;
        }
      }

      // Check stall prefix if matching by prefix (e.g. "A" for "A-01")
      const prefix = stall.stallNumber.split('-')[0];
      if (prefix && prefix.toUpperCase() === selectedHall.toUpperCase()) {
        return true;
      }

      return false;
    }

    return true;
  });

  const getStallStyles = (stall: Stall) => {
    const isSelected = selectedStallIds.includes(stall.id);

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

  // Derive dynamic halls list (Created from scratch by user)
  const hallsList = layoutData?.halls || [];

  const facilitiesList = layoutData?.facilities || [];
  const annotationsList = layoutData?.annotations || [];

  const touchDistanceRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setHasDragged(false);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStart.x;
    const newY = e.clientY - panStart.y;
    if (Math.abs(newX - panOffset.x) > 4 || Math.abs(newY - panOffset.y) > 4) {
      setHasDragged(true);
    }
    setPanOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setHasDragged(false);
      setPanStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const newX = e.touches[0].clientX - panStart.x;
      const newY = e.touches[0].clientY - panStart.y;
      if (Math.abs(newX - panOffset.x) > 4 || Math.abs(newY - panOffset.y) > 4) {
        setHasDragged(true);
      }
      setPanOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / touchDistanceRef.current;
      if (Math.abs(ratio - 1) > 0.04) {
        const delta = ratio > 1 ? 6 : -6;
        setZoomLevel((prev: number) => Math.max(baseZoomLevel, Math.min(200, prev + delta)));
        touchDistanceRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchDistanceRef.current = null;
  };

  const handleResetMap = () => {
    handleFitToScreen();
  };

  const panMoveRef = useRef(handleMouseMove);
  panMoveRef.current = handleMouseMove;
  const panUpRef = useRef(handleMouseUp);
  panUpRef.current = handleMouseUp;

  // Window-level mouse move & mouse up to ensure panning never gets stuck or interrupted by browser
  useEffect(() => {
    if (!isPanning) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      panMoveRef.current(e as unknown as React.MouseEvent);
    };

    const onGlobalMouseUp = () => {
      panUpRef.current();
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isPanning]);

  // Native non-passive wheel event listener to prevent browser zoom & page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch or Ctrl+Wheel zoom (clamped to baseZoomLevel minimum)
        const delta = e.deltaY < 0 ? 8 : -8;
        setZoomLevel((prev: number) => Math.max(baseZoomLevel, Math.min(200, prev + delta)));
      } else {
        // Smooth pan canvas
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
    };
  }, [setZoomLevel, baseZoomLevel]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-inner flex items-center justify-center transition-colors duration-200 select-none ${
        showGrid ? 'bg-floor-grid' : ''
      } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${className || 'min-h-[600px]'}`}
    >
      <div
        className="select-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none shadow-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          {/* Optional Full Background Blueprint / Venue Image */}
          {showBackgroundImage && layoutData?.backgroundImageUrl && (
            <image
              href={layoutData.backgroundImageUrl}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
              opacity={layoutData.backgroundOpacity ?? 0.85}
            />
          )}
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
                    className="uppercase select-none font-sans"
                  >
                    {hall.name}
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
              const isSelected = selectedStallIds.includes(stall.id);
              const isBlocked = stall.status === 'BLOCKED';
              const isBooked = stall.status === 'BOOKED_CONFIRMED';
              const isAvailable = stall.status === 'AVAILABLE';

              return (
                <g
                  key={stall.id}
                  onClick={() => {
                    if (!hasDragged) onStallSelect(stall);
                  }}
                  className={`transition-transform duration-150 ${
                    isAvailable ? 'cursor-pointer hover:opacity-85' : 'cursor-pointer opacity-95'
                  }`}
                >
                  <title>{`Stall ${stall.stallNumber} • ${stall.category} • ${stall.status} • ₹${Number(stall.price).toLocaleString()} • ${stall.areaSqFt || Math.round((stall.width * stall.height) / 100)} sqft`}</title>
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

                  {/* Clean Centered Stall Number */}
                  <text
                    x={stall.xPosition + stall.width / 2}
                    y={stall.yPosition + stall.height / 2 + (isBooked || isBlocked ? -4 : (stall.height >= 48 ? -2 : 3))}
                    textAnchor="middle"
                    fill={styles.textColor}
                    fontSize={stall.width < 50 ? '9' : '11'}
                    fontWeight="bold"
                    className="select-none pointer-events-none font-mono"
                  >
                    {stall.stallNumber}
                  </text>

                  {/* Stall Area / Dimension Subtext if space permits */}
                  {isAvailable && stall.height >= 48 && stall.width >= 45 && (
                    <text
                      x={stall.xPosition + stall.width / 2}
                      y={stall.yPosition + stall.height / 2 + 10}
                      textAnchor="middle"
                      fill={styles.textColor}
                      fontSize="8"
                      fontWeight="600"
                      className="select-none pointer-events-none font-mono opacity-80"
                    >
                      {stall.areaSqFt ? `${stall.areaSqFt} sqft` : `${Math.round(stall.width / pxPerMeter)}×${Math.round(stall.height / pxPerMeter)}m`}
                    </text>
                  )}

                  {/* Status Indicator (Only if booked/blocked) */}
                  {(isBooked || isBlocked) && stall.height > 40 && (
                    <text
                      x={stall.xPosition + stall.width / 2}
                      y={stall.yPosition + stall.height / 2 + 11}
                      textAnchor="middle"
                      fill={styles.textColor}
                      fontSize="8"
                      fontWeight="800"
                      className="select-none pointer-events-none font-mono opacity-90 tracking-wider uppercase"
                    >
                      {isBooked ? 'BOOKED' : 'BLOCKED'}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Canvas Controls HUD: Map Navigation & Zoom */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1 text-slate-700 dark:text-slate-200 select-none">
        <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
          <Move className="w-3.5 h-3.5 text-blue-600" />
          <span>Drag Map</span>
        </div>

        {/* Zoom Out is ONLY needed & shown when user has zoomed in on the chart */}
        {zoomLevel > baseZoomLevel && (
          <button
            type="button"
            onClick={() => setZoomLevel((prev: number) => Math.max(baseZoomLevel, prev - 10))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 cursor-pointer text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-90 duration-150"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleFitToScreen}
          className="px-2 py-1 text-xs font-mono font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors min-w-[50px] text-center cursor-pointer"
          title={`Current zoom: ${zoomLevel}%. Click to reset to fit (${baseZoomLevel}%)`}
        >
          {zoomLevel}%
        </button>

        <button
          type="button"
          onClick={() => setZoomLevel((prev: number) => Math.min(200, prev + 10))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-95 cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={handleFitToScreen}
          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer text-blue-600 dark:text-blue-400"
          title="Fit all stalls to screen overview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit View</span>
        </button>

        <button
          type="button"
          onClick={handleResetMap}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-95 cursor-pointer"
          title="Center & Reset Map View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {children}
    </div>
  );
};
