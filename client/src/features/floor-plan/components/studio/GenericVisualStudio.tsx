import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Eye,
  Pencil,
  Check,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  BoxSelect,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
  Hand,
  Upload,
  Trash2,
  X,
  Undo2,
  Redo2,
  Loader2,
} from 'lucide-react';
import {
  HallZone,
  FacilityObject,
  AnnotationObject,
  FloorPlanLayoutData,
  DraftStallItem,
  StudioTool,
  SelectedItemReference,
  FacilityType,
} from '../../../../types/floorPlanStudio';
import { CanvasToolbox } from './CanvasToolbox';
import { CanvasPropertyInspector } from './CanvasPropertyInspector';
import { CanvasBottomToolbar } from './CanvasBottomToolbar';
import { CreateStallRowModal } from './CreateStallRowModal';
import { STARTER_TEMPLATES } from '../../../../data/floorPlanTemplates';

interface GenericVisualStudioProps {
  exhibitionTitle: string;
  initialLayoutData?: FloorPlanLayoutData | null;
  initialStalls?: DraftStallItem[];
  onSaveLayout: (data: { layoutData: FloorPlanLayoutData; stalls: DraftStallItem[] }) => Promise<void> | void;
  onChangeLayout?: (data: { layoutData: FloorPlanLayoutData; stalls: DraftStallItem[] }) => void;
  onBack?: () => void;
  isViewOnly?: boolean;
}

export const GenericVisualStudio: React.FC<GenericVisualStudioProps> = ({
  exhibitionTitle,
  initialLayoutData,
  initialStalls = [],
  onSaveLayout,
  onChangeLayout,
  onBack,
  isViewOnly = false,
}) => {
  // Unit conversion: 20 pixels = 1 meter
  const pxPerMeter = 20;

  // Canvas View Dimensions (Default expansive size: 3200x2000 for spacious "no-end" CAD workspace)
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: initialLayoutData?.canvasWidth && initialLayoutData.canvasWidth >= 2000 ? initialLayoutData.canvasWidth : 3200,
    height: initialLayoutData?.canvasHeight && initialLayoutData.canvasHeight >= 1400 ? initialLayoutData.canvasHeight : 2000,
  });
  const canvasWidth = canvasDimensions.width;
  const canvasHeight = canvasDimensions.height;

  const handleExpandCanvas = () => {
    setCanvasDimensions((prev) => ({
      width: prev.width + 600,
      height: prev.height + 400,
    }));
  };

  // Active Tool & Mode
  const [activeTool, setActiveTool] = useState<StudioTool>('select');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(isViewOnly);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRowModalOpen, setIsRowModalOpen] = useState<boolean>(false);

  // Collapsible panels state for full-width expansive workspace
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);

  const isMaxCanvas = isLeftCollapsed && isRightCollapsed;
  const handleToggleMaxCanvas = () => {
    if (isMaxCanvas) {
      setIsLeftCollapsed(false);
      setIsRightCollapsed(false);
    } else {
      setIsLeftCollapsed(true);
      setIsRightCollapsed(true);
    }
  };

  // Canvas Display State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapInterval, setSnapInterval] = useState<number>(initialLayoutData?.snapInterval || 1);

  // Core Floor Plan Model (Always created by user from scratch)
  const [halls, setHalls] = useState<HallZone[]>(initialLayoutData?.halls || []);
  const [facilities, setFacilities] = useState<FacilityObject[]>(initialLayoutData?.facilities || []);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>(initialLayoutData?.annotations || []);
  const [stalls, setStalls] = useState<DraftStallItem[]>(initialStalls || []);

  // Full Background Image / Blueprint
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(
    initialLayoutData?.backgroundImageUrl
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    initialLayoutData?.backgroundOpacity ?? 0.85
  );
  const [isBgModalOpen, setIsBgModalOpen] = useState<boolean>(false);

  // Map Movement State (Spacebar held or Pan mode)
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Auto-Save Key for Crash Protection
  // Auto-Save Key for Crash Protection
  const autoSaveKey = `buoyant_studio_autosave_${exhibitionTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  const [restoredFromBackup, setRestoredFromBackup] = useState<boolean>(false);
  const hasAttemptedRestoreRef = useRef(false);

  // Crash Recovery: Auto-restore if session crashed or tab was closed (run only once on mount)
  useEffect(() => {
    if (hasAttemptedRestoreRef.current) return;
    if (
      (!initialLayoutData?.halls || initialLayoutData.halls.length === 0) &&
      (!initialStalls || initialStalls.length === 0)
    ) {
      hasAttemptedRestoreRef.current = true;
      try {
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed &&
            (parsed.halls?.length > 0 ||
              parsed.stalls?.length > 0 ||
              parsed.facilities?.length > 0 ||
              parsed.backgroundImageUrl)
          ) {
            if (parsed.halls) setHalls(parsed.halls);
            if (parsed.stalls) setStalls(parsed.stalls);
            if (parsed.facilities) setFacilities(parsed.facilities);
            if (parsed.annotations) setAnnotations(parsed.annotations);
            if (parsed.backgroundImageUrl) setBackgroundImageUrl(parsed.backgroundImageUrl);
            if (parsed.backgroundOpacity !== undefined) setBackgroundOpacity(parsed.backgroundOpacity);
            if (parsed.canvasWidth && parsed.canvasHeight) {
              setCanvasDimensions({ width: parsed.canvasWidth, height: parsed.canvasHeight });
            }
            setRestoredFromBackup(true);
          }
        }
      } catch (e) {
        console.warn('Could not restore studio draft from localStorage', e);
      }
    }
  }, [autoSaveKey, initialLayoutData, initialStalls]);


  // Selection
  const [selectedRefs, setSelectedRefs] = useState<SelectedItemReference[]>([]);

  // Dragging & Resizing Interactions
  const [isDraggingObj, setIsDraggingObj] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragItemInitialCoords, setDragItemInitialCoords] = useState<
    Array<{ id: string; type: string; x: number; y: number }>
  >([]);

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeInitial, setResizeInitial] = useState<{
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [resizeNeighbors, setResizeNeighbors] = useState<Array<{ id: string; origX: number; origY: number }>>([]);

  // Marquee Selection Box
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    startInsideHallId?: string | null;
  } | null>(null);

  // Track last canvas click coordinates for viewport-aware smart element placement
  const lastCanvasClickPos = useRef<{ x: number; y: number } | null>(null);

  // Debounced auto-save to localStorage (runs only when idle, not mid-drag)
  useEffect(() => {
    if (isDraggingObj || isResizing) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          halls,
          facilities,
          annotations,
          stalls,
          canvasWidth,
          canvasHeight,
          backgroundImageUrl,
          backgroundOpacity,
          timestamp: Date.now(),
        };
        localStorage.setItem(autoSaveKey, JSON.stringify(draft));
      } catch (e) {
        console.warn('Auto-save failed', e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    halls,
    facilities,
    annotations,
    stalls,
    canvasWidth,
    canvasHeight,
    backgroundImageUrl,
    backgroundOpacity,
    autoSaveKey,
    isDraggingObj,
    isResizing,
  ]);

  // Window beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const draft = {
          halls,
          facilities,
          annotations,
          stalls,
          canvasWidth,
          canvasHeight,
          backgroundImageUrl,
          backgroundOpacity,
          timestamp: Date.now(),
        };
        localStorage.setItem(autoSaveKey, JSON.stringify(draft));
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [halls, facilities, annotations, stalls, canvasWidth, canvasHeight, backgroundImageUrl, backgroundOpacity, autoSaveKey]);

  // Debounced real-time bidirectional layout synchronizer with parent wizard
  const onChangeLayoutRef = useRef(onChangeLayout);
  onChangeLayoutRef.current = onChangeLayout;
  useEffect(() => {
    if (isDraggingObj || isResizing) return;

    const timer = setTimeout(() => {
      if (onChangeLayoutRef.current) {
        const currentLayout: FloorPlanLayoutData = {
          canvasWidth,
          canvasHeight,
          gridSize: pxPerMeter,
          snapInterval,
          halls,
          facilities,
          annotations,
          backgroundImageUrl,
          backgroundOpacity,
        };
        onChangeLayoutRef.current({ layoutData: currentLayout, stalls });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    halls,
    facilities,
    annotations,
    stalls,
    canvasWidth,
    canvasHeight,
    pxPerMeter,
    snapInterval,
    backgroundImageUrl,
    backgroundOpacity,
    isDraggingObj,
    isResizing,
  ]);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<
    Array<{
      halls: HallZone[];
      facilities: FacilityObject[];
      annotations: AnnotationObject[];
      stalls: DraftStallItem[];
    }>
  >([
    {
      halls: initialLayoutData?.halls || [],
      facilities: initialLayoutData?.facilities || [],
      annotations: initialLayoutData?.annotations || [],
      stalls: initialStalls || [],
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Snap coordinate helper
  const snapCoord = useCallback(
    (val: number): number => {
      if (!snapToGrid) return Math.round(val);
      const step = snapInterval * pxPerMeter;
      return Math.round(val / step) * step;
    },
    [snapToGrid, snapInterval, pxPerMeter]
  );

  // Record history snapshot
  const pushHistory = useCallback(
    (
      newHalls: HallZone[],
      newFacs: FacilityObject[],
      newAnns: AnnotationObject[],
      newStalls: DraftStallItem[]
    ) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push({
        halls: newHalls,
        facilities: newFacs,
        annotations: newAnns,
        stalls: newStalls,
      });
      // Limit history to 30 states
      if (nextHistory.length > 30) nextHistory.shift();
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex]
  );

  // History Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      const targetState = history[nextIdx];
      setHalls(targetState.halls);
      setFacilities(targetState.facilities);
      setAnnotations(targetState.annotations);
      setStalls(targetState.stalls);
      setHistoryIndex(nextIdx);
      setSelectedRefs([]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetState = history[nextIdx];
      setHalls(targetState.halls);
      setFacilities(targetState.facilities);
      setAnnotations(targetState.annotations);
      setStalls(targetState.stalls);
      setHistoryIndex(nextIdx);
      setSelectedRefs([]);
    }
  }, [history, historyIndex]);

  // Convert client mouse position to SVG coordinates
  const getSVGCoordinates = useCallback(
    (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgRef.current.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const localPt = pt.matrixTransform(ctm.inverse());
      return { x: localPt.x, y: localPt.y };
    },
    []
  );

  // Fit to screen calculation
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    const scaleX = containerW / canvasWidth;
    const scaleY = containerH / canvasHeight;
    const optimalScale = Math.min(scaleX, scaleY);
    setZoomLevel(Math.max(25, Math.min(150, Math.round(optimalScale * 100))));
    setPanOffset({ x: 0, y: 0 });
  }, [canvasWidth, canvasHeight]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveTool('marquee');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('pan');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isReadOnly && selectedRefs.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (!isReadOnly && selectedRefs.length > 0) {
          handleDuplicateSelected(1);
        }
      } else if (e.key === 'Escape') {
        setSelectedRefs([]);
      } else if (e.key === '[') {
        e.preventDefault();
        setIsLeftCollapsed((prev) => !prev);
      } else if (e.key === ']') {
        e.preventDefault();
        setIsRightCollapsed((prev) => !prev);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomLevel((prev) => Math.min(200, prev + 10));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomLevel((prev) => Math.max(25, prev - 10));
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoomLevel(100);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFitToScreen();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Nudge selected items
        if (!isReadOnly && selectedRefs.length > 0) {
          e.preventDefault();
          const step = snapToGrid ? snapInterval * pxPerMeter : 5;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          nudgeSelected(dx, dy);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedRefs, isReadOnly, handleUndo, handleRedo, snapToGrid, snapInterval, pxPerMeter, handleFitToScreen]);

  // Nudge selected items by (dx, dy)
  const nudgeSelected = (dx: number, dy: number) => {
    let nextStalls = [...stalls];
    let nextHalls = [...halls];
    let nextFacs = [...facilities];
    let nextAnns = [...annotations];

    selectedRefs.forEach((ref) => {
      if (ref.type === 'stall') {
        nextStalls = nextStalls.map((s) =>
          s.id === ref.id ? { ...s, xPosition: s.xPosition + dx, yPosition: s.yPosition + dy } : s
        );
      } else if (ref.type === 'hall') {
        nextHalls = nextHalls.map((h) =>
          h.id === ref.id ? { ...h, x: h.x + dx, y: h.y + dy } : h
        );
      } else if (ref.type === 'facility') {
        nextFacs = nextFacs.map((f) =>
          f.id === ref.id ? { ...f, x: f.x + dx, y: f.y + dy } : f
        );
      } else if (ref.type === 'annotation') {
        nextAnns = nextAnns.map((a) =>
          a.id === ref.id ? { ...a, x: a.x + dx, y: a.y + dy } : a
        );
      }
    });

    setStalls(nextStalls);
    setHalls(nextHalls);
    setFacilities(nextFacs);
    setAnnotations(nextAnns);
    pushHistory(nextHalls, nextFacs, nextAnns, nextStalls);
  };

  // Helper to compute smart spawn coordinates:
  // Spawns items centered in the current visible screen viewport (or at last clicked spot if visible)
  const getNewItemSpawnCoordinates = (itemWidth = 60, itemHeight = 60) => {
    if (containerRef.current && svgRef.current) {
      const contRect = containerRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      const scale = zoomLevel / 100;

      // Screen center of the visible workspace container
      const centerScreenX = contRect.left + contRect.width / 2;
      const centerScreenY = contRect.top + contRect.height / 2;

      const canvasCenterX = (centerScreenX - svgRect.left) / scale;
      const canvasCenterY = (centerScreenY - svgRect.top) / scale;

      let targetX = canvasCenterX - itemWidth / 2;
      let targetY = canvasCenterY - itemHeight / 2;

      // If last clicked canvas position is currently visible on screen, prioritize placing there!
      if (lastCanvasClickPos.current) {
        const screenX = svgRect.left + lastCanvasClickPos.current.x * scale;
        const screenY = svgRect.top + lastCanvasClickPos.current.y * scale;
        const isVisible =
          screenX >= contRect.left + 30 &&
          screenX <= contRect.right - 30 &&
          screenY >= contRect.top + 30 &&
          screenY <= contRect.bottom - 30;

        if (isVisible) {
          targetX = lastCanvasClickPos.current.x - itemWidth / 2;
          targetY = lastCanvasClickPos.current.y - itemHeight / 2;
        }
      }

      // Clamp within canvas boundaries with safe margin
      const clampedX = Math.max(20, Math.min(canvasWidth - itemWidth - 20, targetX));
      const clampedY = Math.max(20, Math.min(canvasHeight - itemHeight - 20, targetY));

      return {
        x: snapCoord(clampedX),
        y: snapCoord(clampedY),
      };
    }

    return { x: snapCoord(140), y: snapCoord(160) };
  };

  // Add Handlers (Spawn right where the user is looking or last clicked)
  const handleAddHall = () => {
    const hallLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = hallLetters[halls.length % hallLetters.length] || `${halls.length + 1}`;
    const nextNum = halls.length + 1;
    const hallW = Math.min(1100, canvasWidth - 60);
    const hallH = Math.min(750, canvasHeight - 60);
    const spawnPos = getNewItemSpawnCoordinates(hallW, hallH);

    const newHall: HallZone = {
      id: `hall-${Date.now()}`,
      name: `Hall ${nextLetter}`,
      x: spawnPos.x,
      y: spawnPos.y,
      width: snapCoord(hallW),
      height: snapCoord(hallH),
      color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'][(nextNum - 1) % 6],
    };
    const nextHalls = [...halls, newHall];
    setHalls(nextHalls);
    setSelectedRefs([{ type: 'hall', id: newHall.id }]);
    pushHistory(nextHalls, facilities, annotations, stalls);
  };

  const handleAddStall = () => {
    const existingNums = new Set(stalls.map((s) => s.stallNumber.toUpperCase()));
    let nextNum = stalls.length + 1;
    let numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    while (existingNums.has(`S-${numStr}`.toUpperCase())) {
      nextNum++;
      numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    }
    const spawnPos = getNewItemSpawnCoordinates(60, 60);
    const cascade = (nextNum % 6) * 16;

    const newStall: DraftStallItem = {
      id: `stall-${Date.now()}`,
      stallNumber: `S-${numStr}`,
      name: `Stall S-${numStr}`,
      category: 'STANDARD',
      price: 50000,
      areaSqFt: 100,
      width: 60, // 3m
      height: 60, // 3m
      xPosition: snapCoord(Math.min(canvasWidth - 70, spawnPos.x + cascade)),
      yPosition: snapCoord(Math.min(canvasHeight - 70, spawnPos.y + cascade)),
      status: 'AVAILABLE',
    };
    const nextStalls = [...stalls, newStall];
    setStalls(nextStalls);
    setSelectedRefs([{ type: 'stall', id: newStall.id }]);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  const handleAddFacility = (type: FacilityType) => {
    const defaultLabels: Record<FacilityType, string> = {
      entrance: 'MAIN ENTRY GATE',
      exit: 'EMERGENCY EXIT',
      registration: 'REGISTRATION & BADGING',
      restroom: 'RESTROOMS (M/F)',
      'food-court': 'FOOD COURT PLAZA',
      dining: 'DINING & CAFETERIA',
      stage: 'PRESENTATION STAGE',
      shutter: 'CARGO SERVICE SHUTTER',
      'custom-zone': 'SPECIAL EXHIBIT ZONE',
      corridor: 'CONNECTING AISLE',
    };

    const facW = snapCoord(type === 'stage' ? 300 : type === 'entrance' ? 240 : 180);
    const facH = snapCoord(type === 'stage' ? 60 : 36);
    const spawnPos = getNewItemSpawnCoordinates(facW, facH);

    const newFac: FacilityObject = {
      id: `fac-${Date.now()}`,
      type,
      label: defaultLabels[type] || 'FACILITY',
      x: spawnPos.x,
      y: spawnPos.y,
      width: facW,
      height: facH,
      rotation: 0,
    };

    const nextFacs = [...facilities, newFac];
    setFacilities(nextFacs);
    setSelectedRefs([{ type: 'facility', id: newFac.id }]);
    pushHistory(halls, nextFacs, annotations, stalls);
  };

  const handleAddZone = () => {
    const spawnPos = getNewItemSpawnCoordinates(240, 140);
    const newZone: FacilityObject = {
      id: `zone-${Date.now()}`,
      type: 'custom-zone',
      label: 'VIP & MEDIA NETWORKING ZONE',
      x: spawnPos.x,
      y: spawnPos.y,
      width: snapCoord(240),
      height: snapCoord(140),
    };
    const nextFacs = [...facilities, newZone];
    setFacilities(nextFacs);
    setSelectedRefs([{ type: 'facility', id: newZone.id }]);
    pushHistory(halls, nextFacs, annotations, stalls);
  };

  const handleAddText = () => {
    const spawnPos = getNewItemSpawnCoordinates(140, 30);
    const newAnn: AnnotationObject = {
      id: `ann-${Date.now()}`,
      text: 'Exhibition Hall Notice',
      x: spawnPos.x,
      y: spawnPos.y,
      fontSize: 14,
    };
    const nextAnns = [...annotations, newAnn];
    setAnnotations(nextAnns);
    setSelectedRefs([{ type: 'annotation', id: newAnn.id }]);
    pushHistory(halls, facilities, nextAnns, stalls);
  };

  // Bulk Row Placement Generator
  const handleGenerateStallRow = (generatedStalls: DraftStallItem[]) => {
    const nextStalls = [...stalls, ...generatedStalls];
    setStalls(nextStalls);
    setSelectedRefs(generatedStalls.map((s) => ({ type: 'stall', id: s.id })));
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  // Apply Starter Template
  const handleApplyTemplate = (templateId: string) => {
    const tmpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    setHalls(tmpl.layoutData.halls);
    setFacilities(tmpl.layoutData.facilities);
    setAnnotations(tmpl.layoutData.annotations);
    setStalls(tmpl.stalls);
    setSelectedRefs([]);
    pushHistory(tmpl.layoutData.halls, tmpl.layoutData.facilities, tmpl.layoutData.annotations, tmpl.stalls);
  };

  // Property Update Handlers (with Single Stall Push / Pull Adjacent Row Neighbors)
  const handleUpdateStall = (
    id: string,
    updates: Partial<DraftStallItem>,
    options?: { pushNeighbors?: boolean }
  ) => {
    const target = stalls.find((s) => s.id === id);
    if (!target) return;

    const deltaW = updates.width !== undefined ? updates.width - target.width : 0;
    const deltaH = updates.height !== undefined ? updates.height - target.height : 0;

    let nextStalls = stalls.map((s) => (s.id === id ? { ...s, ...updates } : s));

    if (options?.pushNeighbors !== false && (deltaW !== 0 || deltaH !== 0)) {
      // 1. Shift contiguous row neighbors to the right
      if (deltaW !== 0) {
        const rowNeighbors = stalls.filter((s) => {
          if (s.id === id) return false;
          const verticalOverlap =
            Math.max(target.yPosition, s.yPosition) <
            Math.min(target.yPosition + target.height, s.yPosition + s.height) - 5;
          const isToRight = s.xPosition >= target.xPosition + target.width - 16;
          return verticalOverlap && isToRight;
        });

        rowNeighbors.sort((a, b) => a.xPosition - b.xPosition);

        const shiftedIds = new Set<string>();
        let currentRightEdge = target.xPosition + target.width;

        for (const neighbor of rowNeighbors) {
          if (neighbor.xPosition <= currentRightEdge + 16) {
            shiftedIds.add(neighbor.id);
            currentRightEdge = neighbor.xPosition + neighbor.width;
          }
        }

        if (shiftedIds.size > 0) {
          nextStalls = nextStalls.map((s) => {
            if (shiftedIds.has(s.id)) {
              return {
                ...s,
                xPosition: snapCoord(Math.max(0, Math.min(canvasWidth - s.width, s.xPosition + deltaW))),
              };
            }
            return s;
          });
        }
      }

      // 2. Shift contiguous column neighbors below
      if (deltaH !== 0) {
        const colNeighbors = stalls.filter((s) => {
          if (s.id === id) return false;
          const horizontalOverlap =
            Math.max(target.xPosition, s.xPosition) <
            Math.min(target.xPosition + target.width, s.xPosition + s.width) - 5;
          const isBelow = s.yPosition >= target.yPosition + target.height - 16;
          return horizontalOverlap && isBelow;
        });

        colNeighbors.sort((a, b) => a.yPosition - b.yPosition);

        const shiftedIds = new Set<string>();
        let currentBottomEdge = target.yPosition + target.height;

        for (const neighbor of colNeighbors) {
          if (neighbor.yPosition <= currentBottomEdge + 16) {
            shiftedIds.add(neighbor.id);
            currentBottomEdge = neighbor.yPosition + neighbor.height;
          }
        }

        if (shiftedIds.size > 0) {
          nextStalls = nextStalls.map((s) => {
            if (shiftedIds.has(s.id)) {
              return {
                ...s,
                yPosition: snapCoord(Math.max(0, Math.min(canvasHeight - s.height, s.yPosition + deltaH))),
              };
            }
            return s;
          });
        }
      }
    }

    setStalls(nextStalls);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  const handleUpdateHall = (id: string, updates: Partial<HallZone>) => {
    const nextHalls = halls.map((h) => (h.id === id ? { ...h, ...updates } : h));
    setHalls(nextHalls);
    pushHistory(nextHalls, facilities, annotations, stalls);
  };

  const handleUpdateFacility = (id: string, updates: Partial<FacilityObject>) => {
    const nextFacs = facilities.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setFacilities(nextFacs);
    pushHistory(halls, nextFacs, annotations, stalls);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<AnnotationObject>) => {
    const nextAnns = annotations.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setAnnotations(nextAnns);
    pushHistory(halls, facilities, nextAnns, stalls);
  };

  // Bulk Stalls Update
  const handleBulkUpdateStalls = (updates: Partial<DraftStallItem>) => {
    const selectedIds = new Set(selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id));
    const nextStalls = stalls.map((s) => (selectedIds.has(s.id) ? { ...s, ...updates } : s));
    setStalls(nextStalls);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  // Bulk Stalls Resize (Reduce / Enlarge / Preset Dimensions with Flush Row & Column Reflow)
  const handleBulkResizeStalls = (params: {
    width?: number;
    height?: number;
    scaleMultiplier?: number;
    deltaPx?: number;
    keepFlush?: boolean;
  }) => {
    const selectedIds = new Set(selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id));
    if (selectedIds.size === 0) return;

    const keepFlush = params.keepFlush !== false; // Default: maintain flush contact with no gaps

    // 1. Calculate new dimensions for all selected stalls
    const newDims = new Map<string, { width: number; height: number; areaSqFt: number }>();
    stalls.forEach((s) => {
      if (!selectedIds.has(s.id)) return;

      let newW = s.width;
      let newH = s.height;

      if (params.width !== undefined) newW = params.width;
      if (params.height !== undefined) newH = params.height;

      if (params.scaleMultiplier !== undefined) {
        newW = Math.max(30, Math.round(s.width * params.scaleMultiplier));
        newH = Math.max(30, Math.round(s.height * params.scaleMultiplier));
      }

      if (params.deltaPx !== undefined) {
        newW = Math.max(30, s.width + params.deltaPx);
        newH = Math.max(30, s.height + params.deltaPx);
      }

      newW = snapCoord(newW);
      newH = snapCoord(newH);
      const areaSqFt = Math.round((newW / pxPerMeter) * (newH / pxPerMeter) * 10.764);
      newDims.set(s.id, { width: newW, height: newH, areaSqFt });
    });

    // 2. Reflow positions so adjacent stalls keep 0 gap
    const posUpdates = new Map<string, { x: number; y: number }>();

    if (keepFlush) {
      const selectedList = stalls.filter((s) => selectedIds.has(s.id));

      // Partition stalls into rows:
      const rows: DraftStallItem[][] = [];
      const sortedByY = [...selectedList].sort((a, b) => a.yPosition - b.yPosition);

      sortedByY.forEach((stall) => {
        const matchingRow = rows.find((row) => {
          const first = row[0];
          const overlap =
            Math.max(stall.yPosition, first.yPosition) <
            Math.min(stall.yPosition + stall.height, first.yPosition + first.height) - 5;
          const closeY = Math.abs(stall.yPosition - first.yPosition) <= 16;
          return overlap || closeY;
        });

        if (matchingRow) {
          matchingRow.push(stall);
        } else {
          rows.push([stall]);
        }
      });

      // Sort rows by vertical position
      rows.sort((r1, r2) => {
        const y1 = r1.reduce((acc, s) => acc + s.yPosition, 0) / r1.length;
        const y2 = r2.reduce((acc, s) => acc + s.yPosition, 0) / r2.length;
        return y1 - y2;
      });

      let prevRowEndY: number | null = null;
      let prevRowOrigEndY: number | null = null;

      rows.forEach((row, rowIndex) => {
        // Sort stalls in this row from left to right
        row.sort((a, b) => a.xPosition - b.xPosition);

        const firstInRow = row[0];
        let rowY = firstInRow.yPosition;

        if (rowIndex > 0 && prevRowEndY !== null && prevRowOrigEndY !== null) {
          const origRowGap = firstInRow.yPosition - prevRowOrigEndY;
          // If rows were touching back-to-back:
          if (origRowGap <= 16) {
            rowY = prevRowEndY;
          } else {
            rowY = prevRowEndY + origRowGap;
          }
        }

        let currentX = row[0].xPosition;
        let maxRowH = 0;
        let maxOrigRowH = 0;

        row.forEach((stall, idx) => {
          const dims = newDims.get(stall.id)!;
          maxRowH = Math.max(maxRowH, dims.height);
          maxOrigRowH = Math.max(maxOrigRowH, stall.height);

          let newX = stall.xPosition;
          if (idx === 0) {
            newX = stall.xPosition;
            currentX = newX + dims.width;
          } else {
            const prevStall = row[idx - 1];
            const origGap = stall.xPosition - (prevStall.xPosition + prevStall.width);
            if (origGap <= 16) {
              // Touching / Flush: NO GAP!
              newX = currentX;
            } else {
              // Preserve intentional aisle distance
              newX = currentX + origGap;
            }
            currentX = newX + dims.width;
          }

          posUpdates.set(stall.id, {
            x: snapCoord(Math.max(0, Math.min(canvasWidth - dims.width, newX))),
            y: snapCoord(Math.max(0, Math.min(canvasHeight - dims.height, rowY))),
          });
        });

        prevRowEndY = rowY + maxRowH;
        prevRowOrigEndY = firstInRow.yPosition + maxOrigRowH;
      });
    }

    const nextStalls = stalls.map((s) => {
      if (!selectedIds.has(s.id)) return s;
      const dims = newDims.get(s.id);
      if (!dims) return s;
      const pos = posUpdates.get(s.id);
      return {
        ...s,
        width: dims.width,
        height: dims.height,
        areaSqFt: dims.areaSqFt,
        xPosition: pos ? pos.x : s.xPosition,
        yPosition: pos ? pos.y : s.yPosition,
      };
    });

    setStalls(nextStalls);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  // Pack Selected Stalls 100% Flush (Remove all gaps)
  const handlePackFlushStalls = () => {
    const selectedStallIds = selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id);
    const targetStalls = stalls.filter((s) => selectedStallIds.includes(s.id));
    if (targetStalls.length < 2) return;

    // Group into horizontal rows
    const rows: DraftStallItem[][] = [];
    const sortedByY = [...targetStalls].sort((a, b) => a.yPosition - b.yPosition);

    sortedByY.forEach((stall) => {
      const matchingRow = rows.find((row) => {
        const first = row[0];
        const overlap =
          Math.max(stall.yPosition, first.yPosition) <
          Math.min(stall.yPosition + stall.height, first.yPosition + first.height) - 5;
        const closeY = Math.abs(stall.yPosition - first.yPosition) <= 20;
        return overlap || closeY;
      });

      if (matchingRow) {
        matchingRow.push(stall);
      } else {
        rows.push([stall]);
      }
    });

    rows.sort((r1, r2) => {
      const y1 = r1.reduce((acc, s) => acc + s.yPosition, 0) / r1.length;
      const y2 = r2.reduce((acc, s) => acc + s.yPosition, 0) / r2.length;
      return y1 - y2;
    });

    const posUpdates = new Map<string, { x: number; y: number }>();
    let prevRowEndY: number | null = null;

    rows.forEach((row, rowIndex) => {
      row.sort((a, b) => a.xPosition - b.xPosition);

      let rowY = row[0].yPosition;
      if (rowIndex > 0 && prevRowEndY !== null) {
        if (Math.abs(row[0].yPosition - prevRowEndY) <= 30) {
          rowY = prevRowEndY;
        }
      }

      let currentX = row[0].xPosition;
      let maxH = 0;

      row.forEach((stall, idx) => {
        maxH = Math.max(maxH, stall.height);
        if (idx === 0) {
          currentX = stall.xPosition + stall.width;
          posUpdates.set(stall.id, { x: stall.xPosition, y: rowY });
        } else {
          const newX = snapCoord(currentX);
          posUpdates.set(stall.id, { x: newX, y: rowY });
          currentX = newX + stall.width;
        }
      });

      prevRowEndY = rowY + maxH;
    });

    const nextStalls = stalls.map((s) => {
      const update = posUpdates.get(s.id);
      if (update) {
        return { ...s, xPosition: update.x, yPosition: update.y };
      }
      return s;
    });

    setStalls(nextStalls);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  // Align Stalls
  const handleAlignStalls = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const selectedStallIds = selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id);
    const targetStalls = stalls.filter((s) => selectedStallIds.includes(s.id));
    if (targetStalls.length < 2) return;

    let targetCoord = 0;
    if (alignment === 'left') targetCoord = Math.min(...targetStalls.map((s) => s.xPosition));
    else if (alignment === 'right') targetCoord = Math.max(...targetStalls.map((s) => s.xPosition + s.width));
    else if (alignment === 'top') targetCoord = Math.min(...targetStalls.map((s) => s.yPosition));
    else if (alignment === 'bottom') targetCoord = Math.max(...targetStalls.map((s) => s.yPosition + s.height));
    else if (alignment === 'center') {
      const minX = Math.min(...targetStalls.map((s) => s.xPosition));
      const maxX = Math.max(...targetStalls.map((s) => s.xPosition + s.width));
      targetCoord = (minX + maxX) / 2;
    } else if (alignment === 'middle') {
      const minY = Math.min(...targetStalls.map((s) => s.yPosition));
      const maxY = Math.max(...targetStalls.map((s) => s.yPosition + s.height));
      targetCoord = (minY + maxY) / 2;
    }

    const nextStalls = stalls.map((s) => {
      if (!selectedStallIds.includes(s.id)) return s;
      let newX = s.xPosition;
      let newY = s.yPosition;
      if (alignment === 'left') newX = targetCoord;
      else if (alignment === 'right') newX = targetCoord - s.width;
      else if (alignment === 'top') newY = targetCoord;
      else if (alignment === 'bottom') newY = targetCoord - s.height;
      else if (alignment === 'center') newX = targetCoord - s.width / 2;
      else if (alignment === 'middle') newY = targetCoord - s.height / 2;
      return { ...s, xPosition: snapCoord(newX), yPosition: snapCoord(newY) };
    });

    setStalls(nextStalls);
    pushHistory(halls, facilities, annotations, nextStalls);
  };

  // Distribute Stalls
  const handleDistributeStalls = (direction: 'horizontal' | 'vertical') => {
    const selectedStallIds = selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id);
    const targetStalls = stalls.filter((s) => selectedStallIds.includes(s.id));
    if (targetStalls.length < 3) return;

    if (direction === 'horizontal') {
      const sorted = [...targetStalls].sort((a, b) => a.xPosition - b.xPosition);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalDist = last.xPosition - first.xPosition;
      const step = totalDist / (sorted.length - 1);

      const nextStalls = stalls.map((s) => {
        const idx = sorted.findIndex((st) => st.id === s.id);
        if (idx === -1) return s;
        return { ...s, xPosition: snapCoord(first.xPosition + idx * step) };
      });
      setStalls(nextStalls);
      pushHistory(halls, facilities, annotations, nextStalls);
    } else {
      const sorted = [...targetStalls].sort((a, b) => a.yPosition - b.yPosition);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalDist = last.yPosition - first.yPosition;
      const step = totalDist / (sorted.length - 1);

      const nextStalls = stalls.map((s) => {
        const idx = sorted.findIndex((st) => st.id === s.id);
        if (idx === -1) return s;
        return { ...s, yPosition: snapCoord(first.yPosition + idx * step) };
      });
      setStalls(nextStalls);
      pushHistory(halls, facilities, annotations, nextStalls);
    }
  };

  // Duplicate Selected Items
  const handleDuplicateSelected = (repeatCount = 1) => {
    if (selectedRefs.length === 0) return;

    const newStallsToAdd: DraftStallItem[] = [];
    const newRefs: SelectedItemReference[] = [];

    for (let c = 1; c <= repeatCount; c++) {
      selectedRefs.forEach((ref) => {
        if (ref.type === 'stall') {
          const orig = stalls.find((s) => s.id === ref.id);
          if (orig) {
            // Auto-increment stallNumber if it contains digits
            const match = orig.stallNumber.match(/^(.*?)(\d+)$/);
            let nextStallNum = `${orig.stallNumber}-copy`;
            if (match) {
              const prefix = match[1];
              const digits = match[2];
              let nextVal = parseInt(digits, 10) + c;
              nextStallNum = `${prefix}${nextVal.toString().padStart(digits.length, '0')}`;
              while (
                stalls.some((s) => s.stallNumber.toUpperCase() === nextStallNum.toUpperCase()) ||
                newStallsToAdd.some((s) => s.stallNumber.toUpperCase() === nextStallNum.toUpperCase())
              ) {
                nextVal++;
                nextStallNum = `${prefix}${nextVal.toString().padStart(digits.length, '0')}`;
              }
            }

            const cloned: DraftStallItem = {
              ...orig,
              id: `stall-${Date.now()}-${c}-${Math.random().toString(36).substr(2, 4)}`,
              stallNumber: nextStallNum,
              name: `Stall ${nextStallNum}`,
              xPosition: snapCoord(orig.xPosition + c * (orig.width + 10)),
              yPosition: snapCoord(orig.yPosition),
              status: 'AVAILABLE',
            };
            newStallsToAdd.push(cloned);
            newRefs.push({ type: 'stall', id: cloned.id });
          }
        }
      });
    }

    if (newStallsToAdd.length > 0) {
      const nextStalls = [...stalls, ...newStallsToAdd];
      setStalls(nextStalls);
      setSelectedRefs(newRefs);
      pushHistory(halls, facilities, annotations, nextStalls);
    }
  };

  // Delete Selected Items
  const handleDeleteSelected = () => {
    if (selectedRefs.length === 0) return;

    const stallIdsToDelete = new Set(
      selectedRefs.filter((r) => r.type === 'stall').map((r) => r.id)
    );
    const hallIdsToDelete = new Set(
      selectedRefs.filter((r) => r.type === 'hall').map((r) => r.id)
    );
    const facIdsToDelete = new Set(
      selectedRefs.filter((r) => r.type === 'facility').map((r) => r.id)
    );
    const annIdsToDelete = new Set(
      selectedRefs.filter((r) => r.type === 'annotation').map((r) => r.id)
    );

    const nextStalls = stalls.filter((s) => !stallIdsToDelete.has(s.id));
    const nextHalls = halls.filter((h) => !hallIdsToDelete.has(h.id));
    const nextFacs = facilities.filter((f) => !facIdsToDelete.has(f.id));
    const nextAnns = annotations.filter((a) => !annIdsToDelete.has(a.id));

    setStalls(nextStalls);
    setHalls(nextHalls);
    setFacilities(nextFacs);
    setAnnotations(nextAnns);
    setSelectedRefs([]);
    pushHistory(nextHalls, nextFacs, nextAnns, nextStalls);
  };

  // Delete Hall Directly
  const handleDeleteHall = (hallId: string) => {
    if (isReadOnly) return;
    const nextHalls = halls.filter((h) => h.id !== hallId);
    setHalls(nextHalls);
    setSelectedRefs((prev) => prev.filter((r) => !(r.type === 'hall' && r.id === hallId)));
    pushHistory(nextHalls, facilities, annotations, stalls);
  };

  // Canvas Mouse Down (Selection, Dragging, Pan, Marquee)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // In preview mode, pan tool, middle click (1), right click (2), or Space key held: pan around canvas like in Google Maps!
    if (isReadOnly || activeTool === 'pan' || e.button === 1 || e.button === 2 || isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button
    e.preventDefault(); // Stop browser native selection or drag

    const pt = getSVGCoordinates(e);
    lastCanvasClickPos.current = { x: pt.x, y: pt.y };

    // If clicked on canvas background:
    if (!e.shiftKey) {
      setSelectedRefs([]);
    }
    setMarqueeBox({ startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y, startInsideHallId: null });
  };

  // Item Click & Drag Initiation
  const handleItemMouseDown = (
    e: React.MouseEvent,
    type: 'stall' | 'hall' | 'facility' | 'annotation',
    id: string
  ) => {
    e.stopPropagation();

    // In preview mode or if panning/space/right-click: pan map instead of dragging item
    if (isReadOnly || activeTool === 'pan' || e.button === 1 || e.button === 2 || isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();

    const pt = getSVGCoordinates(e);
    lastCanvasClickPos.current = { x: pt.x, y: pt.y };

    // Shift-click toggles selection
    if (e.shiftKey) {
      const exists = selectedRefs.some((r) => r.type === type && r.id === id);
      if (exists) {
        setSelectedRefs(selectedRefs.filter((r) => !(r.type === type && r.id === id)));
      } else {
        setSelectedRefs([...selectedRefs, { type, id }]);
      }
      return;
    }

    // Normal click: If not already part of selected group, select only this
    const isAlreadySelected = selectedRefs.some((r) => r.type === type && r.id === id);
    const activeRefs = isAlreadySelected ? selectedRefs : [{ type, id }];
    if (!isAlreadySelected) {
      setSelectedRefs(activeRefs);
    }

    if (isReadOnly) return;

    // Start object drag
    setIsDraggingObj(true);
    setDragStartPos({ x: pt.x, y: pt.y });

    // Store initial coordinates of all selected objects
    const initialCoords: Array<{ id: string; type: string; x: number; y: number }> = [];
    activeRefs.forEach((ref) => {
      if (ref.type === 'stall') {
        const item = stalls.find((s) => s.id === ref.id);
        if (item) initialCoords.push({ id: item.id, type: 'stall', x: item.xPosition, y: item.yPosition });
      } else if (ref.type === 'hall') {
        const item = halls.find((h) => h.id === ref.id);
        if (item) initialCoords.push({ id: item.id, type: 'hall', x: item.x, y: item.y });
      } else if (ref.type === 'facility') {
        const item = facilities.find((f) => f.id === ref.id);
        if (item) initialCoords.push({ id: item.id, type: 'facility', x: item.x, y: item.y });
      } else if (ref.type === 'annotation') {
        const item = annotations.find((a) => a.id === ref.id);
        if (item) initialCoords.push({ id: item.id, type: 'annotation', x: item.x, y: item.y });
      }
    });
    setDragItemInitialCoords(initialCoords);
  };

  // Resize Handle Initiation
  const handleResizeHandleMouseDown = (
    e: React.MouseEvent,
    handle: string,
    type: string,
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (isReadOnly) return;

    setIsResizing(true);
    setResizeHandle(handle);
    setResizeInitial({ id, type, x, y, width, height });
    const pt = getSVGCoordinates(e);
    setDragStartPos({ x: pt.x, y: pt.y });

    if (type === 'stall') {
      const targetStall = stalls.find((s) => s.id === id);
      if (targetStall) {
        const neighborCoords: Array<{ id: string; origX: number; origY: number }> = [];
        if (handle.includes('e')) {
          // Chain of contiguous stalls in same row to the right
          const rowNeighbors = stalls.filter((s) => {
            if (s.id === id) return false;
            const verticalOverlap =
              Math.max(targetStall.yPosition, s.yPosition) <
              Math.min(targetStall.yPosition + targetStall.height, s.yPosition + s.height) - 5;
            const isToRight = s.xPosition >= targetStall.xPosition + targetStall.width - 16;
            return verticalOverlap && isToRight;
          });
          rowNeighbors.sort((a, b) => a.xPosition - b.xPosition);
          let currentRight = targetStall.xPosition + targetStall.width;
          for (const nb of rowNeighbors) {
            if (nb.xPosition <= currentRight + 16) {
              neighborCoords.push({ id: nb.id, origX: nb.xPosition, origY: nb.yPosition });
              currentRight = nb.xPosition + nb.width;
            }
          }
        } else if (handle.includes('s')) {
          // Chain of contiguous stalls in same column below
          const colNeighbors = stalls.filter((s) => {
            if (s.id === id) return false;
            const horizontalOverlap =
              Math.max(targetStall.xPosition, s.xPosition) <
              Math.min(targetStall.xPosition + targetStall.width, s.xPosition + s.width) - 5;
            const isBelow = s.yPosition >= targetStall.yPosition + targetStall.height - 16;
            return horizontalOverlap && isBelow;
          });
          colNeighbors.sort((a, b) => a.yPosition - b.yPosition);
          let currentBottom = targetStall.yPosition + targetStall.height;
          for (const nb of colNeighbors) {
            if (nb.yPosition <= currentBottom + 16) {
              neighborCoords.push({ id: nb.id, origX: nb.xPosition, origY: nb.yPosition });
              currentBottom = nb.yPosition + nb.height;
            }
          }
        }
        setResizeNeighbors(neighborCoords);
      } else {
        setResizeNeighbors([]);
      }
    } else {
      setResizeNeighbors([]);
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (isPanning) {
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const pt = getSVGCoordinates(e);

    // 1. Resizing active
    if (isResizing && resizeInitial && resizeHandle) {
      const dx = pt.x - dragStartPos.x;
      const dy = pt.y - dragStartPos.y;

      let newX = resizeInitial.x;
      let newY = resizeInitial.y;
      let newW = resizeInitial.width;
      let newH = resizeInitial.height;

      const fixedRight = resizeInitial.x + resizeInitial.width;
      const fixedBottom = resizeInitial.y + resizeInitial.height;

      if (resizeHandle.includes('e')) {
        const rawW = Math.max(30, resizeInitial.width + dx);
        newW = snapToGrid ? snapCoord(rawW) : Math.round(rawW);
      }
      if (resizeHandle.includes('s')) {
        const rawH = Math.max(30, resizeInitial.height + dy);
        newH = snapToGrid ? snapCoord(rawH) : Math.round(rawH);
      }
      if (resizeHandle.includes('w')) {
        const rawX = resizeInitial.x + dx;
        const candidateX = snapToGrid ? snapCoord(rawX) : Math.round(rawX);
        if (fixedRight - candidateX >= 30) {
          newX = candidateX;
          newW = fixedRight - candidateX;
        }
      }
      if (resizeHandle.includes('n')) {
        const rawY = resizeInitial.y + dy;
        const candidateY = snapToGrid ? snapCoord(rawY) : Math.round(rawY);
        if (fixedBottom - candidateY >= 30) {
          newY = candidateY;
          newH = fixedBottom - candidateY;
        }
      }

      if (resizeInitial.type === 'stall') {
        const areaSqFt = Math.round((newW / pxPerMeter) * (newH / pxPerMeter) * 10.764);
        const deltaW = newW - resizeInitial.width;
        const deltaH = newH - resizeInitial.height;
        const neighborMap = new Map(resizeNeighbors.map((n) => [n.id, n]));

        setStalls((prev) =>
          prev.map((s) => {
            if (s.id === resizeInitial.id) {
              return { ...s, xPosition: newX, yPosition: newY, width: newW, height: newH, areaSqFt };
            }
            if (neighborMap.has(s.id)) {
              const orig = neighborMap.get(s.id)!;
              const nx = resizeHandle.includes('e') ? snapCoord(orig.origX + deltaW) : s.xPosition;
              const ny = resizeHandle.includes('s') ? snapCoord(orig.origY + deltaH) : s.yPosition;
              return { ...s, xPosition: nx, yPosition: ny };
            }
            return s;
          })
        );
      } else if (resizeInitial.type === 'hall') {
        setHalls((prev) =>
          prev.map((h) =>
            h.id === resizeInitial.id ? { ...h, x: newX, y: newY, width: newW, height: newH } : h
          )
        );
      } else if (resizeInitial.type === 'facility') {
        setFacilities((prev) =>
          prev.map((f) =>
            f.id === resizeInitial.id ? { ...f, x: newX, y: newY, width: newW, height: newH } : f
          )
        );
      }
      return;
    }

    // 2. Dragging object(s) active
    if (isDraggingObj && dragItemInitialCoords.length > 0) {
      const rawDx = pt.x - dragStartPos.x;
      const rawDy = pt.y - dragStartPos.y;

      const stallUpdates: Record<string, { x: number; y: number }> = {};
      const hallUpdates: Record<string, { x: number; y: number }> = {};
      const facUpdates: Record<string, { x: number; y: number }> = {};
      const annUpdates: Record<string, { x: number; y: number }> = {};

      dragItemInitialCoords.forEach((init) => {
        const nx = snapToGrid ? snapCoord(init.x + rawDx) : Math.round(init.x + rawDx);
        const ny = snapToGrid ? snapCoord(init.y + rawDy) : Math.round(init.y + rawDy);
        if (init.type === 'stall') stallUpdates[init.id] = { x: nx, y: ny };
        else if (init.type === 'hall') hallUpdates[init.id] = { x: nx, y: ny };
        else if (init.type === 'facility') facUpdates[init.id] = { x: nx, y: ny };
        else if (init.type === 'annotation') annUpdates[init.id] = { x: nx, y: ny };
      });

      if (Object.keys(stallUpdates).length > 0) {
        setStalls((prev) =>
          prev.map((s) => (stallUpdates[s.id] ? { ...s, xPosition: stallUpdates[s.id].x, yPosition: stallUpdates[s.id].y } : s))
        );
      }
      if (Object.keys(hallUpdates).length > 0) {
        setHalls((prev) =>
          prev.map((h) => (hallUpdates[h.id] ? { ...h, x: hallUpdates[h.id].x, y: hallUpdates[h.id].y } : h))
        );
      }
      if (Object.keys(facUpdates).length > 0) {
        setFacilities((prev) =>
          prev.map((f) => (facUpdates[f.id] ? { ...f, x: facUpdates[f.id].x, y: facUpdates[f.id].y } : f))
        );
      }
      if (Object.keys(annUpdates).length > 0) {
        setAnnotations((prev) =>
          prev.map((a) => (annUpdates[a.id] ? { ...a, x: annUpdates[a.id].x, y: annUpdates[a.id].y } : a))
        );
      }
      return;
    }

    // 3. Marquee Box active
    if (marqueeBox) {
      setMarqueeBox({ ...marqueeBox, currX: pt.x, currY: pt.y });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDraggingObj || isResizing) {
      setIsDraggingObj(false);
      setIsResizing(false);
      setResizeHandle(null);
      setResizeInitial(null);
      setResizeNeighbors([]);
      pushHistory(halls, facilities, annotations, stalls);

      // Immediately sync with parent on drag/resize release
      if (onChangeLayoutRef.current) {
        const currentLayout: FloorPlanLayoutData = {
          canvasWidth,
          canvasHeight,
          gridSize: pxPerMeter,
          snapInterval,
          halls,
          facilities,
          annotations,
          backgroundImageUrl,
          backgroundOpacity,
        };
        onChangeLayoutRef.current({ layoutData: currentLayout, stalls });
      }
    }

    if (marqueeBox) {
      // Find objects enclosed or intersecting marquee box
      const minX = Math.min(marqueeBox.startX, marqueeBox.currX);
      const maxX = Math.max(marqueeBox.startX, marqueeBox.currX);
      const minY = Math.min(marqueeBox.startY, marqueeBox.currY);
      const maxY = Math.max(marqueeBox.startY, marqueeBox.currY);

      // Check if dragged more than 4px (marquee selection box)
      const isDrag = maxX - minX > 4 || maxY - minY > 4;

      if (isDrag) {
        const foundRefs: SelectedItemReference[] = [];

        // 1. Multi-select Stalls
        stalls.forEach((s) => {
          const overlaps = !(
            s.xPosition > maxX ||
            s.xPosition + s.width < minX ||
            s.yPosition > maxY ||
            s.yPosition + s.height < minY
          );
          if (overlaps) {
            foundRefs.push({ type: 'stall', id: s.id });
          }
        });

        // 2. Multi-select Facilities & Amenities
        facilities.forEach((f) => {
          const fW = f.width || 60;
          const fH = f.height || 60;
          const overlaps = !(
            f.x > maxX ||
            f.x + fW < minX ||
            f.y > maxY ||
            f.y + fH < minY
          );
          if (overlaps) {
            foundRefs.push({ type: 'facility', id: f.id });
          }
        });

        // 3. Multi-select Annotations & Labels
        annotations.forEach((a) => {
          const fontSize = a.fontSize || 12;
          const aW = Math.max(60, a.text.length * fontSize * 0.65);
          const aH = fontSize * 1.5;
          const overlaps = !(
            a.x > maxX ||
            a.x + aW < minX ||
            a.y - aH > maxY ||
            a.y + aH < minY
          );
          if (overlaps) {
            foundRefs.push({ type: 'annotation', id: a.id });
          }
        });

        // 4. Halls:
        // Rule: If user started drag INSIDE this hall, DO NOT select the hall (prevents accidental deletion of the container)
        // If user started drag OUTSIDE this hall, DO select the hall if it overlaps
        halls.forEach((h) => {
          if (marqueeBox.startInsideHallId === h.id) return;
          const overlaps = !(
            h.x > maxX ||
            h.x + h.width < minX ||
            h.y > maxY ||
            h.y + h.height < minY
          );
          if (overlaps) {
            foundRefs.push({ type: 'hall', id: h.id });
          }
        });

        setSelectedRefs(foundRefs);
      } else {
        // Single click without drag (>4px)
        if (marqueeBox.startInsideHallId) {
          // User clicked inside a hall: select the hall!
          setSelectedRefs([{ type: 'hall', id: marqueeBox.startInsideHallId }]);
        } else {
          // User clicked empty canvas background: deselect
          setSelectedRefs([]);
        }
      }

      setMarqueeBox(null);
    }
  };

  // Save draft / Publish handler
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const layoutData: FloorPlanLayoutData = {
        canvasWidth,
        canvasHeight,
        gridSize: pxPerMeter,
        snapInterval,
        halls,
        facilities,
        annotations,
        backgroundImageUrl,
        backgroundOpacity,
      };
      await onSaveLayout({ layoutData, stalls });
      // Keep autoSaveKey active so unexpected network drops or wizard step changes never erase user work
    } catch (err: any) {
      console.error('Failed to save layout:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to save floor plan layout.');
    } finally {
      setIsSaving(false);
    }
  };

  const mouseMoveRef = useRef(handleCanvasMouseMove);
  mouseMoveRef.current = handleCanvasMouseMove;
  const mouseUpRef = useRef(handleCanvasMouseUp);
  mouseUpRef.current = handleCanvasMouseUp;

  // Window-level mouse move & mouse up so dragging/panning/marquee never gets stuck or interrupted by browser
  useEffect(() => {
    if (!isPanning && !isDraggingObj && !isResizing && !marqueeBox) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      mouseMoveRef.current(e);
    };

    const onGlobalMouseUp = () => {
      mouseUpRef.current();
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isPanning, isDraggingObj, isResizing, !!marqueeBox]);

  // Native non-passive wheel listener on containerRef to prevent browser zoom & page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Prevent browser webpage zoom, outer page scroll, and swipe navigation
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad or Ctrl+Wheel: smoothly adjust studio zoom
        const zoomStep = 8;
        const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
        setZoomLevel((prev) => Math.max(25, Math.min(200, prev + delta)));
      } else {
        // 2-finger trackpad scroll or mouse wheel: smoothly pan canvas
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
  }, []);

  const selectedSingleRef = selectedRefs.length === 1 ? selectedRefs[0] : null;

  return (
    <div
      className={`relative flex flex-col bg-slate-100 text-slate-900 select-none overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-4.5rem)] rounded-2xl border border-slate-200'
      }`}
    >
      {/* Studio Top Control Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-slate-800 shadow-xs z-30 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          <div className="h-4 w-px bg-slate-200" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900">{exhibitionTitle}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Exhibition Studio CAD
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Drag to arrange stalls, halls, and venue facilities in normalized coordinates
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Background Blueprint Image Modal Trigger */}
          <button
            onClick={() => setIsBgModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              backgroundImageUrl
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>{backgroundImageUrl ? 'Blueprint Set' : 'Add Blueprint Image'}</span>
          </button>

          {/* Mode Switch: Edit vs Preview */}
          <button
            onClick={() => setIsReadOnly(!isReadOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isReadOnly
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {isReadOnly ? <Pencil className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
            {isReadOnly ? 'Switch to Edit' : 'Preview Floor Plan'}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Undo / Redo */}
          {!isReadOnly && (
            <div className="flex items-center border-l border-slate-200 pl-2 ml-1 gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`p-2 rounded-lg transition-colors ${
                  historyIndex <= 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded-lg transition-colors ${
                  historyIndex >= history.length - 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Save Action */}
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Floor Plan</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Center Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbox */}
        <CanvasToolbox
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onAddHall={handleAddHall}
          onAddStall={handleAddStall}
          onOpenStallRowModal={() => setIsRowModalOpen(true)}
          onAddFacility={handleAddFacility}
          onAddZone={handleAddZone}
          onAddText={handleAddText}
          onApplyTemplate={handleApplyTemplate}
          onZoomIn={() => setZoomLevel((prev) => Math.min(200, prev + 10))}
          onZoomOut={() => setZoomLevel((prev) => Math.max(25, prev - 10))}
          onResetZoom={() => setZoomLevel(100)}
          readOnly={isReadOnly}
          isCollapsed={isLeftCollapsed}
          onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
        />

        {/* Center Dominant Canvas Workspace - Complete Light Graph (No Black) */}
        <div
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={(e) => {
            // If active interaction is underway, the global window listener handles it smoothly without double-dispatch
            if (isPanning || isDraggingObj || isResizing || marqueeBox) return;
            handleCanvasMouseMove(e);
          }}
          onMouseUp={handleCanvasMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 relative overflow-hidden bg-slate-50 flex items-center justify-center select-none ${
            isPanning || isSpacePressed || activeTool === 'pan'
              ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
              : activeTool === 'marquee'
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
          style={{
            backgroundColor: '#f8fafc',
            touchAction: 'none',
            overscrollBehavior: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px),
              linear-gradient(to right, #cbd5e1 1.5px, transparent 1.5px),
              linear-gradient(to bottom, #cbd5e1 1.5px, transparent 1.5px)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
          }}
        >
          {/* Local Auto-Save Restoration Banner */}
          {restoredFromBackup && (
            <div className="absolute top-4 left-4 z-30 bg-emerald-900/90 text-white px-3 py-1.5 rounded-xl shadow-xl border border-emerald-400 text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Restored from auto-saved session</span>
              <button
                onClick={() => {
                  if (window.confirm('Clear auto-saved draft and reset to empty canvas?')) {
                    localStorage.removeItem(autoSaveKey);
                    setHalls([]);
                    setFacilities([]);
                    setAnnotations([]);
                    setStalls([]);
                    setBackgroundImageUrl(undefined);
                    setRestoredFromBackup(false);
                  }
                }}
                className="ml-2 text-emerald-300 hover:text-white underline font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Multi-Select Floating Action Pill */}
          {selectedRefs.filter((r) => r.type === 'stall').length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-2xl border border-purple-400 text-xs font-bold flex items-center gap-2.5 pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <BoxSelect className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>
                {selectedRefs.filter((r) => r.type === 'stall').length} Stalls Selected • Drag any stall to move together
              </span>
            </div>
          )}
          {/* Zoom & Pan Container */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: 'none',
              willChange: 'transform',
            }}
            className="select-none"
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              className="select-none shadow-md border border-slate-300 rounded-xl"
              style={{
                minWidth: canvasWidth,
                minHeight: canvasHeight,
                backgroundColor: backgroundImageUrl ? 'transparent' : '#ffffff',
              }}
            >
              {/* SVG Definitions for Grid & Patterns */}
              <defs>
                {/* 1-Meter Small Grid Pattern (20px) */}
                <pattern id="smallGrid" width={pxPerMeter} height={pxPerMeter} patternUnits="userSpaceOnUse">
                  <path d={`M ${pxPerMeter} 0 L 0 0 0 ${pxPerMeter}`} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                </pattern>
                {/* 5-Meter Major Grid Pattern (100px) */}
                <pattern id="grid" width={pxPerMeter * 5} height={pxPerMeter * 5} patternUnits="userSpaceOnUse">
                  <rect width={pxPerMeter * 5} height={pxPerMeter * 5} fill="url(#smallGrid)" />
                  <path d={`M ${pxPerMeter * 5} 0 L 0 0 0 ${pxPerMeter * 5}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                </pattern>
              </defs>

              {/* Single Full Background Image / Blueprint, or Unified Grid Surface */}
              {backgroundImageUrl ? (
                <image
                  href={backgroundImageUrl}
                  x="0"
                  y="0"
                  width={canvasWidth}
                  height={canvasHeight}
                  preserveAspectRatio="none"
                  opacity={backgroundOpacity}
                  className="pointer-events-none"
                />
              ) : (
                showGrid && <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />
              )}

              {/* 1. RENDER HALLS (Containers) */}
              <g id="halls-layer">
                {halls.map((hall) => {
                  const isSelected = selectedRefs.some((r) => r.type === 'hall' && r.id === hall.id);
                  const strokeColor = hall.color || '#3b82f6';
                  const bannerWidth = Math.min(320, Math.max(170, hall.name.length * 10 + 90));

                  return (
                    <g key={hall.id}>
                      {/* Hall boundary rectangle - clicking/dragging interior allows marquee drag-select or single-click select */}
                      <rect
                        x={hall.x}
                        y={hall.y}
                        width={hall.width}
                        height={hall.height}
                        rx="14"
                        fill="#fafafa"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3.5 : 2}
                        strokeDasharray={isSelected ? 'none' : '8 6'}
                        className="transition-all cursor-default"
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          if (activeTool === 'pan') {
                            setIsPanning(true);
                            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                            return;
                          }
                          // Allow drag-select or click-select over hall interior
                          const pt = getSVGCoordinates(e);
                          lastCanvasClickPos.current = { x: pt.x, y: pt.y };
                          setMarqueeBox({ startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y, startInsideHallId: hall.id });
                          e.stopPropagation();
                        }}
                      />

                      {/* Border stroke hit-area for easy clicking/dragging hall boundary directly */}
                      <rect
                        x={hall.x - 4}
                        y={hall.y - 4}
                        width={hall.width + 8}
                        height={hall.height + 8}
                        rx="16"
                        fill="none"
                        stroke="transparent"
                        strokeWidth="14"
                        className="cursor-move"
                        onMouseDown={(e) => handleItemMouseDown(e, 'hall', hall.id)}
                      />

                      {/* Hall Title Banner (Dedicated drag handle to move Hall + Direct Delete Button) */}
                      <g className="group select-none">
                        <rect
                          x={hall.x + 16}
                          y={hall.y + 12}
                          width={bannerWidth}
                          height={32}
                          rx="8"
                          fill={strokeColor}
                          fillOpacity={isSelected ? 0.25 : 0.15}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 2 : 1.5}
                          className="cursor-move"
                          onMouseDown={(e) => handleItemMouseDown(e, 'hall', hall.id)}
                        />
                        <text
                          x={hall.x + 28}
                          y={hall.y + 33}
                          fill={strokeColor}
                          fontSize="13"
                          fontWeight="900"
                          letterSpacing="1"
                          className="uppercase select-none font-sans pointer-events-none cursor-move"
                        >
                          {hall.name}
                        </text>

                        {/* Direct Delete Hall Trash Button right on header banner */}
                        {!isReadOnly && (
                          <g
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHall(hall.id);
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <rect
                              x={hall.x + bannerWidth - 28}
                              y={hall.y + 17}
                              width={22}
                              height={22}
                              rx="6"
                              fill="#fee2e2"
                              stroke="#f87171"
                              strokeWidth="1"
                            />
                            <path
                              d={`M ${hall.x + bannerWidth - 23} ${hall.y + 23} h 12 m -10 0 v 8 a 1 1 0 0 0 1 1 h 6 a 1 1 0 0 0 1 -1 v -8 m -5 0 v -2 a 1 1 0 0 1 1 -1 h 2 a 1 1 0 0 1 1 1 v 2`}
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        )}
                      </g>

                      {/* Hall Resize Handles when selected (All 8 Cardinal & Diagonal Handles) */}
                      {isSelected && !isReadOnly && (
                        <>
                          {/* SE Corner Handle */}
                          <rect
                            x={hall.x + hall.width - 9}
                            y={hall.y + hall.height - 9}
                            width="18"
                            height="18"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="cursor-se-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'se',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* SW Corner Handle */}
                          <rect
                            x={hall.x - 9}
                            y={hall.y + hall.height - 9}
                            width="18"
                            height="18"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="cursor-sw-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'sw',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* NE Corner Handle */}
                          <rect
                            x={hall.x + hall.width - 9}
                            y={hall.y - 9}
                            width="18"
                            height="18"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="cursor-ne-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'ne',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* NW Corner Handle */}
                          <rect
                            x={hall.x - 9}
                            y={hall.y - 9}
                            width="18"
                            height="18"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="cursor-nw-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'nw',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* E Edge Handle */}
                          <rect
                            x={hall.x + hall.width - 6}
                            y={hall.y + hall.height / 2 - 14}
                            width="12"
                            height="28"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="cursor-e-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'e',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* W Edge Handle */}
                          <rect
                            x={hall.x - 6}
                            y={hall.y + hall.height / 2 - 14}
                            width="12"
                            height="28"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="cursor-w-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'w',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* S Edge Handle */}
                          <rect
                            x={hall.x + hall.width / 2 - 14}
                            y={hall.y + hall.height - 6}
                            width="28"
                            height="12"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="cursor-s-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                's',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                          {/* N Edge Handle */}
                          <rect
                            x={hall.x + hall.width / 2 - 14}
                            y={hall.y - 6}
                            width="28"
                            height="12"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="cursor-n-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'n',
                                'hall',
                                hall.id,
                                hall.x,
                                hall.y,
                                hall.width,
                                hall.height
                              )
                            }
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 2. RENDER FACILITIES & AMENITIES */}
              <g id="facilities-layer">
                {facilities.map((fac) => {
                  const isSelected = selectedRefs.some((r) => r.type === 'facility' && r.id === fac.id);

                  let bgFill = '#f1f5f9';
                  let strokeCol = '#64748b';
                  let textCol = '#334155';

                  if (fac.type === 'entrance') {
                    bgFill = '#065f46';
                    strokeCol = '#047857';
                    textCol = '#ffffff';
                  } else if (fac.type === 'exit') {
                    bgFill = '#881337';
                    strokeCol = '#be123c';
                    textCol = '#ffffff';
                  } else if (fac.type === 'registration') {
                    bgFill = '#1e3a8a';
                    strokeCol = '#2563eb';
                    textCol = '#ffffff';
                  } else if (fac.type === 'stage') {
                    bgFill = '#4c1d95';
                    strokeCol = '#7c3aed';
                    textCol = '#ffffff';
                  } else if (fac.type === 'food-court' || fac.type === 'dining') {
                    bgFill = '#fef3c7';
                    strokeCol = '#d97706';
                    textCol = '#92400e';
                  } else if (fac.type === 'restroom') {
                    bgFill = '#e0f2fe';
                    strokeCol = '#0284c7';
                    textCol = '#0369a1';
                  } else if (fac.type === 'custom-zone') {
                    bgFill = '#f5f3ff';
                    strokeCol = '#8b5cf6';
                    textCol = '#6d28d9';
                  }

                  const transformAttr = fac.rotation ? `rotate(${fac.rotation} ${fac.x + fac.width / 2} ${fac.y + fac.height / 2})` : undefined;

                  return (
                    <g
                      key={fac.id}
                      transform={transformAttr}
                      onMouseDown={(e) => handleItemMouseDown(e, 'facility', fac.id)}
                      className="cursor-move"
                    >
                      <rect
                        x={fac.x}
                        y={fac.y}
                        width={fac.width}
                        height={fac.height}
                        rx="6"
                        fill={bgFill}
                        stroke={isSelected ? '#2563eb' : strokeCol}
                        strokeWidth={isSelected ? 3 : 1.5}
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

                      {/* Facility Resize Handles when selected (All 8 Cardinal & Diagonal Handles) */}
                      {isSelected && !isReadOnly && (
                        <>
                          {/* Corner Handles */}
                          <rect
                            x={fac.x + fac.width - 6}
                            y={fac.y + fac.height - 6}
                            width="12"
                            height="12"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-se-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'se',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x - 6}
                            y={fac.y + fac.height - 6}
                            width="12"
                            height="12"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-sw-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'sw',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x + fac.width - 6}
                            y={fac.y - 6}
                            width="12"
                            height="12"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-ne-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'ne',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x - 6}
                            y={fac.y - 6}
                            width="12"
                            height="12"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-nw-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'nw',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />

                          {/* Edge Handles */}
                          <rect
                            x={fac.x + fac.width - 5}
                            y={fac.y + fac.height / 2 - 8}
                            width="10"
                            height="16"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-e-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'e',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x - 5}
                            y={fac.y + fac.height / 2 - 8}
                            width="10"
                            height="16"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-w-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'w',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x + fac.width / 2 - 8}
                            y={fac.y + fac.height - 5}
                            width="16"
                            height="10"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-s-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                's',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                          <rect
                            x={fac.x + fac.width / 2 - 8}
                            y={fac.y - 5}
                            width="16"
                            height="10"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-n-resize shadow-md"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'n',
                                'facility',
                                fac.id,
                                fac.x,
                                fac.y,
                                fac.width,
                                fac.height
                              )
                            }
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 3. RENDER ANNOTATIONS */}
              <g id="annotations-layer">
                {annotations.map((ann) => {
                  const isSelected = selectedRefs.some((r) => r.type === 'annotation' && r.id === ann.id);
                  return (
                    <g
                      key={ann.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'annotation', ann.id)}
                      className="cursor-move"
                    >
                      <text
                        x={ann.x}
                        y={ann.y}
                        fill={isSelected ? '#2563eb' : ann.color || '#475569'}
                        fontSize={ann.fontSize || 12}
                        fontWeight="bold"
                        className="select-none"
                      >
                        {ann.text}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* 4. RENDER STALLS */}
              <g id="stalls-layer">
                {stalls.map((stall) => {
                  const isSelected = selectedRefs.some((r) => r.type === 'stall' && r.id === stall.id);
                  const isBlocked = stall.status === 'BLOCKED';
                  const isBooked = stall.status === 'BOOKED_CONFIRMED';

                  let fillCol = '#ecfdf5';
                  let strokeCol = '#10b981';
                  let textCol = '#047857';

                  if (stall.category === 'PREMIUM') {
                    fillCol = '#eff6ff';
                    strokeCol = '#3b82f6';
                    textCol = '#1d4ed8';
                  } else if (stall.category === 'CORNER') {
                    fillCol = '#fffbeb';
                    strokeCol = '#f59e0b';
                    textCol = '#b45309';
                  } else if (stall.category === 'ISLAND') {
                    fillCol = '#faf5ff';
                    strokeCol = '#8b5cf6';
                    textCol = '#6d28d9';
                  }

                  if (isBlocked) {
                    fillCol = '#fef2f2';
                    strokeCol = '#f43f5e';
                    textCol = '#be123c';
                  } else if (isBooked) {
                    fillCol = '#f1f5f9';
                    strokeCol = '#64748b';
                    textCol = '#334155';
                  }

                  const transformAttr = stall.rotation
                    ? `rotate(${stall.rotation} ${stall.xPosition + stall.width / 2} ${stall.yPosition + stall.height / 2})`
                    : undefined;

                  return (
                    <g
                      key={stall.id}
                      transform={transformAttr}
                      onMouseDown={(e) => handleItemMouseDown(e, 'stall', stall.id)}
                      className="cursor-pointer group"
                    >
                      {/* Stall physical geometry */}
                      <rect
                        x={stall.xPosition}
                        y={stall.yPosition}
                        width={stall.width}
                        height={stall.height}
                        rx="5"
                        fill={fillCol}
                        stroke={isSelected ? '#2563eb' : strokeCol}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={isBlocked ? '4 3' : 'none'}
                        className="transition-colors"
                      />

                      {/* Clean Centered Stall Number (No inside price clutter) */}
                      <text
                        x={stall.xPosition + stall.width / 2}
                        y={stall.yPosition + stall.height / 2 + 4}
                        textAnchor="middle"
                        fill={textCol}
                        fontSize={stall.width < 50 ? '10' : '12'}
                        fontWeight="bold"
                        className="select-none pointer-events-none font-mono"
                      >
                        {stall.stallNumber}
                      </text>

                      {/* Resize Handles (Only when single stall is selected) */}
                      {isSelected && selectedRefs.length === 1 && !isReadOnly && (
                        <>
                          <rect
                            x={stall.xPosition + stall.width - 5}
                            y={stall.yPosition + stall.height - 5}
                            width="10"
                            height="10"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="cursor-se-resize"
                            onMouseDown={(e) =>
                              handleResizeHandleMouseDown(
                                e,
                                'se',
                                'stall',
                                stall.id,
                                stall.xPosition,
                                stall.yPosition,
                                stall.width,
                                stall.height
                              )
                            }
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 5. MARQUEE SELECTION RECTANGLE */}
              {marqueeBox && (
                <rect
                  x={Math.min(marqueeBox.startX, marqueeBox.currX)}
                  y={Math.min(marqueeBox.startY, marqueeBox.currY)}
                  width={Math.abs(marqueeBox.currX - marqueeBox.startX)}
                  height={Math.abs(marqueeBox.currY - marqueeBox.startY)}
                  fill="#3b82f6"
                  fillOpacity="0.12"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
            </svg>
          </div>

          {/* Common Floating Canvas Zoom & Map Navigation Controller HUD */}
          <div className="absolute bottom-4 right-4 z-30 flex items-center bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/90 rounded-xl p-1 gap-1 text-slate-700 select-none">
            {/* Quick Map Pan Mode Toggle */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTool === 'pan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Map Move Mode (H / Space+Drag / Right-Click Drag)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{activeTool === 'pan' ? 'Moving Map' : 'Move Map'}</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(25, prev - 10))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-md transition-colors min-w-[54px] text-center cursor-pointer"
              title="Click to reset zoom to 100% (Ctrl+0)"
            >
              {zoomLevel}%
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(200, prev + 10))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={handleFitToScreen}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer"
              title="Fit Floor Plan to Screen (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPanOffset({ x: 0, y: 0 });
                setZoomLevel(100);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer"
              title="Reset Map Position & Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Dynamic Property Inspector */}
        {!isReadOnly && (
          <CanvasPropertyInspector
            selectedRefs={selectedRefs}
            stalls={stalls}
            halls={halls}
            facilities={facilities}
            annotations={annotations}
            onUpdateStall={handleUpdateStall}
            onUpdateHall={handleUpdateHall}
            onUpdateFacility={handleUpdateFacility}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onBulkUpdateStalls={handleBulkUpdateStalls}
            onBulkResizeStalls={handleBulkResizeStalls}
            onPackFlushStalls={handlePackFlushStalls}
            onAlignStalls={handleAlignStalls}
            onDistributeStalls={handleDistributeStalls}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            readOnly={isReadOnly}
            isCollapsed={isRightCollapsed}
            onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
          />
        )}
      </div>

      {/* Bottom Controls Bar */}
      <CanvasBottomToolbar
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onFitToScreen={handleFitToScreen}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        snapInterval={snapInterval}
        onChangeSnapInterval={setSnapInterval}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        stallsCount={stalls.length}
        hallsCount={halls.length}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onExpandCanvas={handleExpandCanvas}
      />

      {/* Bulk Stall Row Creation Wizard Modal */}
      <CreateStallRowModal
        isOpen={isRowModalOpen}
        onClose={() => setIsRowModalOpen(false)}
        onGenerateRow={handleGenerateStallRow}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />

      {/* Background Blueprint Image Modal */}
      {isBgModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Venue Blueprint / Background Image</h3>
                  <p className="text-[11px] text-slate-500">
                    Keep one full background image to trace and draw your floor plan over
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBgModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={backgroundImageUrl || ''}
                  onChange={(e) => setBackgroundImageUrl(e.target.value)}
                  placeholder="https://example.com/venue-blueprint.png"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Or Upload Local Image (PNG, JPG, SVG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setBackgroundImageUrl(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {backgroundImageUrl && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Background Opacity</span>
                    <span>{Math.round(backgroundOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={backgroundOpacity}
                    onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {backgroundImageUrl && (
                <div className="h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative flex items-center justify-center">
                  <img
                    src={backgroundImageUrl}
                    alt="Blueprint Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    onClick={() => setBackgroundImageUrl(undefined)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 text-xs flex items-center gap-1 font-bold cursor-pointer"
                    title="Remove Background Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Image
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsBgModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
