import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stall } from '../../../types';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useAuthStore } from '../../../stores/authStore';
import { useThemeStore } from '../../../stores/themeStore';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

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

import { getStallTypography } from '../utils/stallTypography';
import { getFacilityIconKey, renderFacilitySvgIcon } from '../utils/facilityIconRenderer';

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  stalls,
  onStallSelect,
  layoutData,
  canvasWidth: propWidth,
  canvasHeight: propHeight,
  className,
  children,
  showGrid = false,
}) => {
  const { user } = useAuthStore();
  const { selectedStallIds, heldStallIds, conflictingStallIds, zoomLevel, setZoomLevel, setBaseZoomLevel, selectedCategory, selectedStatus, selectedHall } = useFloorPlanStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const isHeldByMe = useCallback(
    (stall: Stall) => {
      if (selectedStallIds.includes(stall.id)) return true;
      if (heldStallIds.includes(stall.id)) return true;
      if (stall.heldByUserId && user && stall.heldByUserId === user.id) return true;
      return false;
    },
    [selectedStallIds, heldStallIds, user]
  );

  const isInProgressByOther = useCallback(
    (stall: Stall) => {
      const isHoldStatus =
        stall.status === 'TEMPORARILY_HELD' ||
        stall.status === 'PAYMENT_PENDING' ||
        stall.status === 'BOOKING_IN_PROGRESS';
      return isHoldStatus && !isHeldByMe(stall);
    },
    [isHeldByMe]
  );

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
      return { minX: 0, minY: 0, maxX: 1200, maxY: 750, width: 1200, height: 750, centerX: 600, centerY: 375 };
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
      width: Math.max(600, bMaxX - bMinX),
      height: Math.max(450, bMaxY - bMinY),
      centerX: (bMinX + bMaxX) / 2,
      centerY: (bMinY + bMaxY) / 2,
    };
  }, [stalls, layoutData]);

  // Inner Floor Plan Display Size: 1140px (+20px increase for optimal framing & clarity)
  const width = propWidth || 1140;
  const viewBoxWidth = Math.max(1140, contentBounds.maxX + 40);
  const viewBoxHeight = Math.max(730, contentBounds.maxY + 40);
  const height = propHeight || Math.round(width * (viewBoxHeight / viewBoxWidth));
  const pxPerMeter = layoutData?.gridSize || 20;

  // Center floor plan at 100% zoom (locked scale so user only moves around the floor plan)
  const _handleFitToScreen = useCallback(() => {
    setBaseZoomLevel(100);
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoomLevel, setBaseZoomLevel]);

  const hasAutoFitted = useRef(false);
  useEffect(() => {
    if (stalls.length > 0 && !hasAutoFitted.current && containerRef.current) {
      hasAutoFitted.current = true;
      setBaseZoomLevel(100);
      setZoomLevel(100);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [stalls.length, setZoomLevel, setBaseZoomLevel]);

  useEffect(() => {
    const handleResize = () => {
      setBaseZoomLevel(100);
      setZoomLevel(100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setZoomLevel, setBaseZoomLevel]);

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
    const isConflicting = conflictingStallIds.includes(stall.id);
    const myHeld = isHeldByMe(stall);
    const inProgressOther = isInProgressByOther(stall);

    if (isConflicting) {
      return {
        fill: isDark ? '#7f1d1d' : '#fef2f2',
        stroke: '#dc2626',
        strokeWidth: 3,
        textColor: isDark ? '#fca5a5' : '#991b1b',
        strokeDasharray: 'none',
      };
    }

    if (myHeld && stall.status !== 'BOOKED_CONFIRMED' && stall.status !== 'BLOCKED') {
      return {
        fill: isDark ? '#1e3a8a' : '#dbeafe',
        stroke: '#2563eb',
        strokeWidth: 3,
        textColor: isDark ? '#93c5fd' : '#1d4ed8',
        strokeDasharray: 'none',
      };
    }

    // Stalls currently being booked by other users: display as blocked & greyish with dashed border
    if (inProgressOther) {
      return {
        fill: isDark ? '#1e293b' : '#e2e8f0',
        stroke: isDark ? '#475569' : '#94a3b8',
        strokeWidth: 1.5,
        textColor: isDark ? '#94a3b8' : '#64748b',
        strokeDasharray: '4 3',
      };
    }

    switch (stall.status) {
      case 'AVAILABLE': {
        const customStallColor =
          (stall as any).color ||
          layoutData?.stallColors?.[stall.stallNumber] ||
          layoutData?.stallColors?.[stall.id];
        if (customStallColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customStallColor)) {
          return {
            fill: isDark ? `${customStallColor}33` : `${customStallColor}18`,
            stroke: customStallColor,
            strokeWidth: 1.5,
            textColor: isDark ? '#ffffff' : customStallColor,
            strokeDasharray: 'none',
          };
        }
        if (stall.category === 'PREMIUM') {
          return {
            fill: isDark ? '#064e3b' : '#f0fdf4',
            stroke: '#059669',
            strokeWidth: 1.5,
            textColor: isDark ? '#a7f3d0' : '#064e3b',
            strokeDasharray: 'none',
          };
        } else if (stall.category === 'CORNER') {
          return {
            fill: isDark ? '#451a03' : '#fffbeb',
            stroke: '#d97706',
            strokeWidth: 1.5,
            textColor: isDark ? '#fde68a' : '#78350f',
            strokeDasharray: 'none',
          };
        } else if (stall.category === 'ISLAND') {
          return {
            fill: isDark ? '#3b0764' : '#faf5ff',
            stroke: '#7c3aed',
            strokeWidth: 1.5,
            textColor: isDark ? '#ddd6fe' : '#4c1d95',
            strokeDasharray: 'none',
          };
        }
        return {
          fill: isDark ? '#1e293b' : '#f8fafc',
          stroke: '#2563eb',
          strokeWidth: 1.5,
          textColor: isDark ? '#93c5fd' : '#1e3a8a',
          strokeDasharray: 'none',
        };
      }
      case 'TEMPORARILY_HELD':
      case 'PAYMENT_PENDING':
      case 'BOOKING_IN_PROGRESS':
        // If it got here and wasn't inProgressOther, it means it is held by current user
        return {
          fill: isDark ? '#1e3a8a' : '#dbeafe',
          stroke: '#2563eb',
          strokeWidth: 2,
          textColor: isDark ? '#93c5fd' : '#1d4ed8',
          strokeDasharray: 'none',
        };
      case 'BOOKED_CONFIRMED':
        return {
          fill: isDark ? '#1e293b' : '#f1f5f9',
          stroke: isDark ? '#475569' : '#94a3b8',
          strokeWidth: 1.5,
          textColor: isDark ? '#94a3b8' : '#64748b',
          strokeDasharray: 'none',
        };
      case 'BLOCKED':
        return {
          fill: isDark ? '#1e293b' : '#e2e8f0',
          stroke: isDark ? '#475569' : '#94a3b8',
          strokeWidth: 1.5,
          textColor: isDark ? '#94a3b8' : '#64748b',
          strokeDasharray: '4 3',
        };
      default:
        return {
          fill: isDark ? '#0f172a' : '#f8fafc',
          stroke: isDark ? '#334155' : '#cbd5e1',
          strokeWidth: 1,
          textColor: isDark ? '#94a3b8' : '#475569',
          strokeDasharray: 'none',
        };
    }
  };

  // Derive dynamic halls list (Created from scratch by user)
  const hallsList = layoutData?.halls || [];

  const facilitiesList = layoutData?.facilities || [];
  const annotationsList = layoutData?.annotations || [];

  const touchDistanceRef = useRef<number | null>(null);

  // Strict boundary clamping: floor plan edges never detach from viewport, revealing 0 space behind
  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number = zoomLevel) => {
      if (!containerRef.current) return { x, y };
      const containerW = containerRef.current.clientWidth || width;
      const containerH = containerRef.current.clientHeight || height;
      const scale = currentZoom / 100;
      const scaledW = width * scale;
      const scaledH = height * scale;

      // When scaled dimension is larger than container, pan strictly between edges (0 gap)
      // When scaled dimension is smaller or equal, lock to center (0 gap)
      const limitX = Math.max(0, (scaledW - containerW) / 2);
      const limitY = Math.max(0, (scaledH - containerH) / 2);

      return {
        x: Math.round(Math.max(-limitX, Math.min(limitX, x))),
        y: Math.round(Math.max(-limitY, Math.min(limitY, y))),
      };
    },
    [width, height, zoomLevel]
  );

  const handleZoomIn = () => {
    setZoomLevel((prev: number) => {
      const next = Math.min(200, prev + 20);
      setPanOffset((cur) => clampPan(cur.x, cur.y, next));
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev: number) => {
      // Zoom out is allowed down to 100%
      const next = Math.max(100, prev - 20);
      setPanOffset((cur) => clampPan(cur.x, cur.y, next));
      return next;
    });
  };

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
    const rawX = e.clientX - panStart.x;
    const rawY = e.clientY - panStart.y;
    if (Math.abs(rawX - panOffset.x) > 4 || Math.abs(rawY - panOffset.y) > 4) {
      setHasDragged(true);
    }
    setPanOffset(clampPan(rawX, rawY, zoomLevel));
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
      const rawX = e.touches[0].clientX - panStart.x;
      const rawY = e.touches[0].clientY - panStart.y;
      if (Math.abs(rawX - panOffset.x) > 4 || Math.abs(rawY - panOffset.y) > 4) {
        setHasDragged(true);
      }
      setPanOffset(clampPan(rawX, rawY, zoomLevel));
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / touchDistanceRef.current;
      if (Math.abs(ratio - 1) > 0.04) {
        const delta = ratio > 1 ? 10 : -10;
        setZoomLevel((prev: number) => {
          // Minimum zoom is 100% - cannot zoom out past standard view
          const next = Math.max(100, Math.min(200, Math.round(prev + delta)));
          setPanOffset((cur) => clampPan(cur.x, cur.y, next));
          return next;
        });
        touchDistanceRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchDistanceRef.current = null;
  };

  const handleResetMap = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(100);
  };

  const panMoveRef = useRef(handleMouseMove);
  const panUpRef = useRef(handleMouseUp);

  useEffect(() => {
    panMoveRef.current = handleMouseMove;
    panUpRef.current = handleMouseUp;
  }, [handleMouseMove, handleMouseUp]);

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

  // Native non-passive wheel event listener to pan smoothly across the 1140px floor plan and zoom with Ctrl/pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch or Ctrl+Wheel zoom: clamped between 100% and 200%
        const delta = e.deltaY < 0 ? 10 : -10;
        setZoomLevel((prev: number) => {
          const next = Math.max(100, Math.min(200, prev + delta));
          setPanOffset((cur) => clampPan(cur.x, cur.y, next));
          return next;
        });
      } else {
        // Smooth pan canvas in both X and Y directions, clamped to boundaries
        setPanOffset((prev) =>
          clampPan(Math.round(prev.x - e.deltaX), Math.round(prev.y - e.deltaY), zoomLevel)
        );
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
    };
  }, [clampPan, zoomLevel, setZoomLevel]);

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
      className={`relative w-full max-w-[1200px] mx-auto overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-center transition-colors duration-200 select-none ${
        showGrid ? 'bg-floor-grid' : ''
      } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${className || 'min-h-[500px]'}`}
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
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="select-none bg-white dark:bg-slate-900"
        >
          {/* Dynamic Halls / Pavilions */}
          <g id="halls-layer">
            {hallsList.map((hall) => {
              const strokeColor = hall.color || (isDark ? '#3b82f6' : '#2563eb');

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
                  {(() => {
                    const pos = hall.namePosition || 'top-left';
                    const fontSize = hall.fontSize || 12;
                    const bannerHeight = Math.max(26, fontSize + 14);
                    const bannerWidth = Math.min(
                      Math.max(120, hall.name.length * (fontSize * 0.65) + 36),
                      hall.width - 24
                    );

                    let bx = hall.x + 16;
                    let by = hall.y + 12;

                    if (pos === 'top-center') {
                      bx = hall.x + (hall.width - bannerWidth) / 2;
                      by = hall.y + 12;
                    } else if (pos === 'top-right') {
                      bx = hall.x + hall.width - bannerWidth - 16;
                      by = hall.y + 12;
                    } else if (pos === 'center') {
                      bx = hall.x + (hall.width - bannerWidth) / 2;
                      by = hall.y + (hall.height - bannerHeight) / 2;
                    } else if (pos === 'bottom-left') {
                      bx = hall.x + 16;
                      by = hall.y + hall.height - bannerHeight - 12;
                    } else if (pos === 'bottom-center') {
                      bx = hall.x + (hall.width - bannerWidth) / 2;
                      by = hall.y + hall.height - bannerHeight - 12;
                    } else if (pos === 'bottom-right') {
                      bx = hall.x + hall.width - bannerWidth - 16;
                      by = hall.y + hall.height - bannerHeight - 12;
                    } else if (pos === 'outside-top-left') {
                      bx = hall.x + 16;
                      by = hall.y - bannerHeight - 6;
                    } else if (pos === 'outside-top-center') {
                      bx = hall.x + (hall.width - bannerWidth) / 2;
                      by = hall.y - bannerHeight - 6;
                    } else if (pos === 'outside-top-right') {
                      bx = hall.x + hall.width - bannerWidth - 16;
                      by = hall.y - bannerHeight - 6;
                    } else if (pos === 'outside-bottom-left') {
                      bx = hall.x + 16;
                      by = hall.y + hall.height + 6;
                    } else if (pos === 'outside-bottom-center') {
                      bx = hall.x + (hall.width - bannerWidth) / 2;
                      by = hall.y + hall.height + 6;
                    } else if (pos === 'outside-bottom-right') {
                      bx = hall.x + hall.width - bannerWidth - 16;
                      by = hall.y + hall.height + 6;
                    }

                    return (
                      <g>
                        <rect
                          x={bx}
                          y={by}
                          width={bannerWidth}
                          height={bannerHeight}
                          rx="6"
                          fill={strokeColor}
                          fillOpacity={isDark ? '0.2' : '0.1'}
                          stroke={strokeColor}
                          strokeWidth="1"
                        />
                        <text
                          x={bx + bannerWidth / 2}
                          y={by + bannerHeight / 2 + 1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={strokeColor}
                          fontSize={fontSize}
                          fontWeight="800"
                          letterSpacing="0.05em"
                          className="uppercase select-none font-sans"
                        >
                          {hall.name}
                        </text>
                      </g>
                    );
                  })()}
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

              const mode = fac.displayMode || 'both';
              const iconKey = getFacilityIconKey(fac.iconName, fac.type);
              const iconSize = Math.max(12, Math.min(64, fac.iconSize || 24));

              return (
                <g key={fac.id} transform={transformAttr}>
                  {mode !== 'icon-only' && (
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
                  )}

                  {mode === 'icon-only' &&
                    renderFacilitySvgIcon(
                      iconKey,
                      fac.x + fac.width / 2,
                      fac.y + fac.height / 2,
                      iconSize,
                      strokeCol
                    )}

                  {mode === 'text-only' && (
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
                  )}

                  {mode === 'both' && (
                    <g>
                      {fac.height >= 44 ? (
                        <>
                          {renderFacilitySvgIcon(
                            iconKey,
                            fac.x + fac.width / 2,
                            fac.y + fac.height / 2 - 7,
                            iconSize,
                            textCol
                          )}
                          <text
                            x={fac.x + fac.width / 2}
                            y={fac.y + fac.height / 2 + iconSize / 2 + 2}
                            textAnchor="middle"
                            fill={textCol}
                            fontSize="9"
                            fontWeight="bold"
                            letterSpacing="0.8"
                            className="select-none pointer-events-none uppercase"
                          >
                            {fac.label}
                          </text>
                        </>
                      ) : (
                        <>
                          {renderFacilitySvgIcon(
                            iconKey,
                            fac.x + 14,
                            fac.y + fac.height / 2,
                            iconSize,
                            textCol
                          )}
                          <text
                            x={fac.x + 28}
                            y={fac.y + fac.height / 2 + 3}
                            textAnchor="start"
                            fill={textCol}
                            fontSize="9"
                            fontWeight="bold"
                            letterSpacing="0.8"
                            className="select-none pointer-events-none uppercase"
                          >
                            {fac.label}
                          </text>
                        </>
                      )}
                    </g>
                  )}
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
              const inProgressOther = isInProgressByOther(stall);
              const isBlocked = stall.status === 'BLOCKED' || inProgressOther;
              const isBooked = stall.status === 'BOOKED_CONFIRMED';
              const myHeld = isHeldByMe(stall);
              const isAvailable = stall.status === 'AVAILABLE' && !isBlocked && !isBooked;

              const cursorClass = isAvailable || myHeld
                ? 'cursor-pointer hover:opacity-85'
                : 'cursor-not-allowed opacity-90';

              const titleText = inProgressOther
                ? `Stall ${stall.stallNumber} • Blocked (Booking in progress by another user)`
                : isBlocked
                ? `Stall ${stall.stallNumber} • Blocked`
                : isBooked
                ? `Stall ${stall.stallNumber} • Booked`
                : `Stall ${stall.stallNumber} • ${stall.category} • ₹${Number(stall.price).toLocaleString()} • ${Math.round(stall.areaSqFt || (stall.width * stall.height) / 100)} sqft`;

              return (
                <g
                  key={stall.id}
                  onClick={() => {
                    if (!hasDragged && (isAvailable || myHeld)) {
                      onStallSelect(stall);
                    }
                  }}
                  className={`transition-transform duration-150 ${cursorClass}`}
                >
                  <title>{titleText}</title>
                  <rect
                    x={stall.xPosition}
                    y={stall.yPosition}
                    width={stall.width}
                    height={stall.height}
                    rx="5"
                    fill={styles.fill}
                    stroke={styles.stroke}
                    strokeWidth={styles.strokeWidth}
                    strokeDasharray={isBlocked ? (styles.strokeDasharray || '4 3') : 'none'}
                    className="transition-colors"
                  />

                  {/* Clean Centered Stall Number (Adaptive font size & automatic row alignment) */}
                  {(() => {
                    const typo = getStallTypography(
                      stall.stallNumber,
                      stall.width,
                      stall.height,
                      zoomLevel,
                      stall.xPosition,
                      stall.yPosition
                    );
                    const showStatusSubtext =
                      zoomLevel >= 70 &&
                      typo.lines.length === 1 &&
                      (isBooked || isBlocked) &&
                      stall.height > 40;

                    return (
                      <>
                        {typo.lines.map((line, lIdx) => (
                          <text
                            key={lIdx}
                            x={typo.centerX}
                            y={
                              showStatusSubtext
                                ? typo.startY + lIdx * typo.lineHeight - 4
                                : typo.startY + lIdx * typo.lineHeight
                            }
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={styles.textColor}
                            fontSize={typo.fontSize}
                            fontWeight="800"
                            letterSpacing="0.02em"
                            className="select-none pointer-events-none font-mono tracking-tight"
                          >
                            {line}
                          </text>
                        ))}

                        {/* Status Indicator (Only if booked/blocked) */}
                        {showStatusSubtext && (
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
                      </>
                    );
                  })()}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Canvas Controls HUD: Map Navigation & Conditional Zoom Out */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1 text-slate-700 dark:text-slate-200 select-none">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
          <Move className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="hidden sm:inline">Drag Map</span>
        </div>

        {/* Zoom Out: Enabled ONLY when user has zoomed in (> 100%) */}
        <button
          type="button"
          disabled={zoomLevel <= 100}
          onClick={handleZoomOut}
          className={`p-1.5 rounded-lg transition-all ${
            zoomLevel > 100
              ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-35'
          }`}
          title={zoomLevel > 100 ? "Zoom Out towards 100%" : "At standard 100% view (zoom out disabled)"}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="px-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 min-w-[38px] text-center">
          {zoomLevel}%
        </span>

        {/* Zoom In: Always available up to 200% */}
        <button
          type="button"
          disabled={zoomLevel >= 200}
          onClick={handleZoomIn}
          className={`p-1.5 rounded-lg transition-all ${
            zoomLevel < 200
              ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-35'
          }`}
          title="Zoom In (+) to inspect details"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={handleResetMap}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Recenter & Reset to 100%"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      </div>

      {children}
    </div>
  );
};
