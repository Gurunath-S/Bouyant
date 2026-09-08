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
  onSaveLayout: (data: { layoutData: FloorPlanLayoutData; stalls: DraftStallItem[] }) => Promise<void>;
  onBack?: () => void;
  isViewOnly?: boolean;
}

export const GenericVisualStudio: React.FC<GenericVisualStudioProps> = ({
  exhibitionTitle,
  initialLayoutData,
  initialStalls = [],
  onSaveLayout,
  onBack,
  isViewOnly = false,
}) => {
  // Unit conversion: 20 pixels = 1 meter
  const pxPerMeter = 20;

  // Canvas View Dimensions
  const canvasWidth = initialLayoutData?.canvasWidth || 1400;
  const canvasHeight = initialLayoutData?.canvasHeight || 850;

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

  // Core Floor Plan Model
  const [halls, setHalls] = useState<HallZone[]>(
    initialLayoutData?.halls && initialLayoutData.halls.length > 0
      ? initialLayoutData.halls
      : [
          {
            id: 'hall-main',
            name: 'Grand Pavilion Hall',
            x: 40,
            y: 40,
            width: 1320,
            height: 770,
            color: '#3b82f6',
          },
        ]
  );

  const [facilities, setFacilities] = useState<FacilityObject[]>(
    initialLayoutData?.facilities || [
      {
        id: 'fac-ent-default',
        type: 'entrance',
        label: 'MAIN ENTRY & REGISTRATION',
        x: 550,
        y: 790,
        width: 300,
        height: 28,
      },
    ]
  );

  const [annotations, setAnnotations] = useState<AnnotationObject[]>(
    initialLayoutData?.annotations || []
  );

  const [stalls, setStalls] = useState<DraftStallItem[]>(
    initialStalls.length > 0
      ? initialStalls
      : [
          {
            id: 'stall-1',
            stallNumber: 'A-01',
            name: 'Stall A-01',
            category: 'STANDARD',
            price: 50000,
            areaSqFt: 100,
            width: 60,
            height: 60,
            xPosition: 100,
            yPosition: 140,
            status: 'AVAILABLE',
          },
          {
            id: 'stall-2',
            stallNumber: 'A-02',
            name: 'Stall A-02',
            category: 'STANDARD',
            price: 50000,
            areaSqFt: 100,
            width: 60,
            height: 60,
            xPosition: 180,
            yPosition: 140,
            status: 'AVAILABLE',
          },
          {
            id: 'stall-3',
            stallNumber: 'A-03',
            name: 'Stall A-03',
            category: 'PREMIUM',
            price: 65000,
            areaSqFt: 100,
            width: 60,
            height: 60,
            xPosition: 260,
            yPosition: 140,
            status: 'AVAILABLE',
          },
        ]
  );

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

  // Marquee Selection Box
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

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

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRefs, isReadOnly, handleUndo, handleRedo, snapToGrid, snapInterval, pxPerMeter]);

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

  // Add Handlers
  const handleAddHall = () => {
    const nextNum = halls.length + 1;
    const newHall: HallZone = {
      id: `hall-${Date.now()}`,
      name: `Pavilion Hall ${nextNum}`,
      x: snapCoord(60 + (nextNum - 1) * 40),
      y: snapCoord(60 + (nextNum - 1) * 40),
      width: snapCoord(500),
      height: snapCoord(400),
      color: nextNum % 2 === 0 ? '#8b5cf6' : '#3b82f6',
    };
    const nextHalls = [...halls, newHall];
    setHalls(nextHalls);
    setSelectedRefs([{ type: 'hall', id: newHall.id }]);
    pushHistory(nextHalls, facilities, annotations, stalls);
  };

  const handleAddStall = () => {
    const nextNum = stalls.length + 1;
    const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const newStall: DraftStallItem = {
      id: `stall-${Date.now()}`,
      stallNumber: `S-${numStr}`,
      name: `Stall S-${numStr}`,
      category: 'STANDARD',
      price: 50000,
      areaSqFt: 100,
      width: 60, // 3m
      height: 60, // 3m
      xPosition: snapCoord(140 + (nextNum % 6) * 80),
      yPosition: snapCoord(160 + Math.floor(nextNum / 6) * 80),
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

    const newFac: FacilityObject = {
      id: `fac-${Date.now()}`,
      type,
      label: defaultLabels[type] || 'FACILITY',
      x: snapCoord(400),
      y: snapCoord(type === 'entrance' ? 760 : 100),
      width: snapCoord(type === 'stage' ? 300 : type === 'entrance' ? 240 : 180),
      height: snapCoord(type === 'stage' ? 60 : 36),
      rotation: 0,
    };

    const nextFacs = [...facilities, newFac];
    setFacilities(nextFacs);
    setSelectedRefs([{ type: 'facility', id: newFac.id }]);
    pushHistory(halls, nextFacs, annotations, stalls);
  };

  const handleAddZone = () => {
    const newZone: FacilityObject = {
      id: `zone-${Date.now()}`,
      type: 'custom-zone',
      label: 'VIP & MEDIA NETWORKING ZONE',
      x: snapCoord(100),
      y: snapCoord(100),
      width: snapCoord(240),
      height: snapCoord(140),
    };
    const nextFacs = [...facilities, newZone];
    setFacilities(nextFacs);
    setSelectedRefs([{ type: 'facility', id: newZone.id }]);
    pushHistory(halls, nextFacs, annotations, stalls);
  };

  const handleAddText = () => {
    const newAnn: AnnotationObject = {
      id: `ann-${Date.now()}`,
      text: 'Exhibition Hall Notice',
      x: snapCoord(200),
      y: snapCoord(200),
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

  // Property Update Handlers
  const handleUpdateStall = (id: string, updates: Partial<DraftStallItem>) => {
    const nextStalls = stalls.map((s) => (s.id === id ? { ...s, ...updates } : s));
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
              const nextVal = parseInt(digits, 10) + c;
              nextStallNum = `${prefix}${nextVal.toString().padStart(digits.length, '0')}`;
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

  // Fit to screen calculation
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    const scaleX = containerW / canvasWidth;
    const scaleY = containerH / canvasHeight;
    const optimalScale = Math.min(scaleX, scaleY);
    setZoomLevel(Math.max(40, Math.min(150, Math.round(optimalScale * 100))));
    setPanOffset({ x: 0, y: 0 });
  };

  // Canvas Mouse Down (Selection, Dragging, Pan, Marquee)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If pan tool or middle click or space key held: start canvas panning
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button

    const pt = getSVGCoordinates(e);

    // If clicked on canvas background:
    // If shift key held or select tool: start marquee selection box
    if (!e.shiftKey) {
      setSelectedRefs([]);
    }
    setMarqueeBox({ startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y });
  };

  // Item Click & Drag Initiation
  const handleItemMouseDown = (
    e: React.MouseEvent,
    type: 'stall' | 'hall' | 'facility' | 'annotation',
    id: string
  ) => {
    e.stopPropagation();

    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return;

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
    const pt = getSVGCoordinates(e);
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
    if (isReadOnly) return;

    setIsResizing(true);
    setResizeHandle(handle);
    setResizeInitial({ id, type, x, y, width, height });
    const pt = getSVGCoordinates(e);
    setDragStartPos({ x: pt.x, y: pt.y });
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
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

      if (resizeHandle.includes('e')) newW = Math.max(30, resizeInitial.width + dx);
      if (resizeHandle.includes('s')) newH = Math.max(30, resizeInitial.height + dy);
      if (resizeHandle.includes('w')) {
        const potentialW = resizeInitial.width - dx;
        if (potentialW >= 30) {
          newW = potentialW;
          newX = resizeInitial.x + dx;
        }
      }
      if (resizeHandle.includes('n')) {
        const potentialH = resizeInitial.height - dy;
        if (potentialH >= 30) {
          newH = potentialH;
          newY = resizeInitial.y + dy;
        }
      }

      newX = snapCoord(newX);
      newY = snapCoord(newY);
      newW = snapCoord(newW);
      newH = snapCoord(newH);

      if (resizeInitial.type === 'stall') {
        const areaSqFt = Math.round((newW / pxPerMeter) * (newH / pxPerMeter) * 10.764);
        setStalls((prev) =>
          prev.map((s) =>
            s.id === resizeInitial.id ? { ...s, xPosition: newX, yPosition: newY, width: newW, height: newH, areaSqFt } : s
          )
        );
      } else if (resizeInitial.type === 'hall') {
        setHalls((prev) =>
          prev.map((h) =>
            h.id === resizeInitial.id ? { ...h, x: newX, y: newY, width: newW, height: newH } : h
          )
        );
      }
      return;
    }

    // 2. Dragging object(s) active
    if (isDraggingObj && dragItemInitialCoords.length > 0) {
      const rawDx = pt.x - dragStartPos.x;
      const rawDy = pt.y - dragStartPos.y;
      const dx = snapToGrid ? snapCoord(rawDx) : rawDx;
      const dy = snapToGrid ? snapCoord(rawDy) : rawDy;

      const stallUpdates: Record<string, { x: number; y: number }> = {};
      const hallUpdates: Record<string, { x: number; y: number }> = {};
      const facUpdates: Record<string, { x: number; y: number }> = {};
      const annUpdates: Record<string, { x: number; y: number }> = {};

      dragItemInitialCoords.forEach((init) => {
        const nx = snapCoord(init.x + dx);
        const ny = snapCoord(init.y + dy);
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
      pushHistory(halls, facilities, annotations, stalls);
    }

    if (marqueeBox) {
      // Find objects enclosed in marquee box
      const minX = Math.min(marqueeBox.startX, marqueeBox.currX);
      const maxX = Math.max(marqueeBox.startX, marqueeBox.currX);
      const minY = Math.min(marqueeBox.startY, marqueeBox.currY);
      const maxY = Math.max(marqueeBox.startY, marqueeBox.currY);

      // Only perform marquee selection if dragged more than 5px
      if (maxX - minX > 5 || maxY - minY > 5) {
        const foundRefs: SelectedItemReference[] = [];
        stalls.forEach((s) => {
          if (s.xPosition >= minX && s.xPosition + s.width <= maxX && s.yPosition >= minY && s.yPosition + s.height <= maxY) {
            foundRefs.push({ type: 'stall', id: s.id });
          }
        });
        if (foundRefs.length > 0) {
          setSelectedRefs(foundRefs);
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
      };
      await onSaveLayout({ layoutData, stalls });
    } catch (err: any) {
      alert(err.message || 'Failed to save floor plan layout.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSingleRef = selectedRefs.length === 1 ? selectedRefs[0] : null;

  return (
    <div
      className={`relative flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden ${
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

          {/* Max Canvas Space Mode (Sideways expansion) */}
          <button
            onClick={handleToggleMaxCanvas}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isMaxCanvas
                ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title={
              isMaxCanvas
                ? 'Restore sidebars (Toolbox & Inspector)'
                : 'Full View Mode: Maximize sideways canvas drawing area'
            }
          >
            {isMaxCanvas ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-purple-700" />
                <span>Sidebars Minimized</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Max Canvas Space</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Studio'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Save Action */}
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save & Publish'}
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
          readOnly={isReadOnly}
          isCollapsed={isLeftCollapsed}
          onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
        />

        {/* Center Dominant Canvas Workspace */}
        <div
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className={`flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center ${
            activeTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
        >
          {/* Zoom & Pan Container */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.08s ease-out',
            }}
            className="select-none"
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              className="bg-white rounded-xl shadow-2xl border border-slate-300 select-none"
              style={{ minWidth: canvasWidth, minHeight: canvasHeight }}
            >
              {/* SVG Definitions for Grid & Patterns */}
              <defs>
                {/* 1-Meter Small Grid Pattern (20px) */}
                <pattern id="smallGrid" width={pxPerMeter} height={pxPerMeter} patternUnits="userSpaceOnUse">
                  <path d={`M ${pxPerMeter} 0 L 0 0 0 ${pxPerMeter}`} fill="none" stroke="#f1f5f9" strokeWidth="1" />
                </pattern>
                {/* 5-Meter Major Grid Pattern (100px) */}
                <pattern id="grid" width={pxPerMeter * 5} height={pxPerMeter * 5} patternUnits="userSpaceOnUse">
                  <rect width={pxPerMeter * 5} height={pxPerMeter * 5} fill="url(#smallGrid)" />
                  <path d={`M ${pxPerMeter * 5} 0 L 0 0 0 ${pxPerMeter * 5}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                </pattern>
              </defs>

              {/* Grid Background */}
              {showGrid && <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />}

              {/* 1. RENDER HALLS (Containers) */}
              <g id="halls-layer">
                {halls.map((hall) => {
                  const isSelected = selectedRefs.some((r) => r.type === 'hall' && r.id === hall.id);
                  const strokeColor = hall.color || '#3b82f6';
                  return (
                    <g
                      key={hall.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'hall', hall.id)}
                      className="cursor-move"
                    >
                      {/* Hall boundary rectangle */}
                      <rect
                        x={hall.x}
                        y={hall.y}
                        width={hall.width}
                        height={hall.height}
                        rx="14"
                        fill="#fafafa"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeDasharray={isSelected ? 'none' : '8 6'}
                        className="transition-all"
                      />

                      {/* Hall Title Banner */}
                      <rect
                        x={hall.x + 16}
                        y={hall.y + 12}
                        width={Math.min(320, hall.width - 32)}
                        height={26}
                        rx="6"
                        fill={strokeColor}
                        fillOpacity="0.12"
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
                        {hall.name} • {Math.round(hall.width / pxPerMeter)}m × {Math.round(hall.height / pxPerMeter)}m
                      </text>

                      {/* Hall Resize Handles when selected */}
                      {isSelected && !isReadOnly && (
                        <>
                          <rect
                            x={hall.x + hall.width - 8}
                            y={hall.y + hall.height - 8}
                            width="16"
                            height="16"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="cursor-se-resize"
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

                      {/* Stall Number Header */}
                      <text
                        x={stall.xPosition + stall.width / 2}
                        y={stall.yPosition + stall.height / 2 - (stall.height > 45 ? 5 : 0)}
                        textAnchor="middle"
                        fill={textCol}
                        fontSize={stall.width < 50 ? '9' : '11'}
                        fontWeight="bold"
                        className="select-none pointer-events-none font-mono"
                      >
                        {stall.stallNumber}
                      </text>

                      {/* Price Tag if sufficient height */}
                      {stall.height > 45 && (
                        <text
                          x={stall.xPosition + stall.width / 2}
                          y={stall.yPosition + stall.height / 2 + 11}
                          textAnchor="middle"
                          fill={textCol}
                          fontSize="8"
                          fontWeight="700"
                          className="select-none pointer-events-none font-mono opacity-90"
                        >
                          ₹{(stall.price / 1000).toFixed(0)}k
                        </text>
                      )}

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
      />

      {/* Bulk Stall Row Creation Wizard Modal */}
      <CreateStallRowModal
        isOpen={isRowModalOpen}
        onClose={() => setIsRowModalOpen(false)}
        onGenerateRow={handleGenerateStallRow}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </div>
  );
};
