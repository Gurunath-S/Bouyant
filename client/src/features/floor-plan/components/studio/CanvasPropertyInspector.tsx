import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Copy,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Maximize,
  Maximize2,
  Minimize2,
  Grid,
  Info,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Ban,
  CheckCircle2,
  Palette,
  RotateCcw,
  DoorOpen,
  LogIn,
  LogOut,
  BadgeCheck,
  Bath,
  Utensils,
  Coffee,
  Presentation,
  Shield,
  Zap,
  Star,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';
import { StallCategory, StallStatus } from '../../../../types';
import {
  DraftStallItem,
  HallZone,
  HallNamePosition,
  FacilityObject,
  AnnotationObject,
  SelectedItemReference,
  isStallBookedOrHeld,
} from '../../../../types/floorPlanStudio';
import { Tooltip } from '../../../../components/ui/Tooltip';

interface CanvasPropertyInspectorProps {
  selectedRefs: SelectedItemReference[];
  stalls: DraftStallItem[];
  halls: HallZone[];
  facilities: FacilityObject[];
  annotations: AnnotationObject[];
  onUpdateStall: (id: string, updates: Partial<DraftStallItem>, options?: { pushNeighbors?: boolean }) => void;
  onUpdateHall: (id: string, updates: Partial<HallZone>) => void;
  onUpdateFacility: (id: string, updates: Partial<FacilityObject>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<AnnotationObject>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: (count?: number) => void;
  onBulkUpdateStalls: (updates: Partial<DraftStallItem>) => void;
  onBulkResizeStalls?: (params: {
    width?: number;
    height?: number;
    scaleMultiplier?: number;
    deltaPx?: number;
    deltaW?: number;
    deltaH?: number;
    keepFlush?: boolean;
  }) => void;
  onPackFlushStalls?: () => void;
  onAlignStalls: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeStalls: (direction: 'horizontal' | 'vertical') => void;
  canvasWidth: number;
  canvasHeight: number;
  canReduceCanvas?: boolean;
  onReduceCanvas?: () => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  unlockedBookedStallIds?: Set<string>;
  onUnlockStall?: (stallId: string, stallNumber: string) => void;
  onRelockStall?: (stallId: string) => void;
}

interface InspectorNumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const InspectorNumericInput: React.FC<InspectorNumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 'any',
  disabled,
  className,
  placeholder,
}) => {
  const [text, setText] = useState<string>(() => (value !== undefined && !isNaN(value) ? String(value) : ''));

  useEffect(() => {
    setText(value !== undefined && !isNaN(value) ? String(value) : '');
  }, [value]);

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const str = e.target.value;
        setText(str);
        if (str !== '') {
          const num = Number(str);
          if (!isNaN(num)) {
            onChange(num);
          }
        }
      }}
      onBlur={() => {
        if (text === '' || isNaN(Number(text))) {
          const fallback = min !== undefined ? min : 0;
          setText(String(fallback));
          onChange(fallback);
        } else {
          let num = Number(text);
          if (min !== undefined && num < min) num = min;
          if (max !== undefined && num > max) num = max;
          setText(String(num));
          onChange(num);
        }
      }}
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
};

export const CanvasPropertyInspector: React.FC<CanvasPropertyInspectorProps> = ({
  selectedRefs,
  stalls,
  halls,
  facilities,
  annotations,
  onUpdateStall,
  onUpdateHall,
  onUpdateFacility,
  onUpdateAnnotation,
  onDeleteSelected,
  onDuplicateSelected,
  onBulkUpdateStalls,
  onBulkResizeStalls,
  onPackFlushStalls,
  onAlignStalls,
  onDistributeStalls,
  canvasWidth,
  canvasHeight,
  canReduceCanvas = false,
  onReduceCanvas,
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse,
  unlockedBookedStallIds,
  onUnlockStall,
  onRelockStall,
}) => {
  const pxPerMeter = 20;
  const [bulkKeepFlush, setBulkKeepFlush] = useState<boolean>(true);
  const [singlePushNeighbors, setSinglePushNeighbors] = useState<boolean>(true);

  // Collapsed Vertical Strip Mode
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-l border-slate-200 flex flex-col items-center py-3 shrink-0 select-none shadow-xs z-20 transition-all justify-between">
        <div className="flex flex-col items-center gap-3 w-full">
          {onToggleCollapse && (
            <Tooltip content="Expand Inspector" shortcut="]" description="Expand right inspector panel" position="left">
              <button
                onClick={onToggleCollapse}
                aria-label="Expand Property Inspector"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <div className="w-6 h-px bg-slate-200" />
          <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold tracking-wider uppercase text-slate-500 select-none py-2 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 inline rotate-90 text-slate-400" />
            <span>Inspector {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}</span>
          </div>
        </div>
        {selectedRefs.length > 0 && (
          <div className="flex flex-col items-center gap-1 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" title="Active selection" />
            <span className="text-[9px] font-bold text-blue-600">{selectedRefs.length}</span>
          </div>
        )}
      </aside>
    );
  }

  // Multi-select state
  if (selectedRefs.length > 1) {
    const selectedStallIds = selectedRefs
      .filter((r) => r.type === 'stall')
      .map((r) => r.id);
    const selectedHallIds = selectedRefs
      .filter((r) => r.type === 'hall')
      .map((r) => r.id);
    const selectedFacIds = selectedRefs
      .filter((r) => r.type === 'facility')
      .map((r) => r.id);
    const selectedAnnIds = selectedRefs
      .filter((r) => r.type === 'annotation')
      .map((r) => r.id);

    const selectedStallsList = stalls.filter((s) => selectedStallIds.includes(s.id));
    const bookedStallsCount = selectedStallsList.filter(isStallBookedOrHeld).length;
    const allSelectedAreBookedStalls =
      selectedRefs.length === bookedStallsCount && bookedStallsCount > 0;

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Multiple Selected ({selectedRefs.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Tooltip
                content={allSelectedAreBookedStalls ? 'Protected from Deletion' : 'Delete Unbooked Selected'}
                description={allSelectedAreBookedStalls ? 'Booked or held stalls cannot be removed' : 'Remove all selected unbooked elements from floor plan'}
                position="bottom"
              >
                <button
                  onClick={allSelectedAreBookedStalls ? undefined : onDeleteSelected}
                  disabled={allSelectedAreBookedStalls}
                  className={`text-xs font-bold flex items-center gap-1 ${
                    allSelectedAreBookedStalls
                      ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                      : 'text-rose-600 hover:text-rose-700 cursor-pointer'
                  }`}
                  aria-label="Delete Selected Elements"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </Tooltip>
            )}
            {onToggleCollapse && (
              <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse Inspector"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Multi-Select Item Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Selected Elements
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedStallIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedStallIds.length} Stall{selectedStallIds.length > 1 ? 's' : ''}
                </span>
              )}
              {selectedHallIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedHallIds.length} Hall{selectedHallIds.length > 1 ? 's' : ''}
                </span>
              )}
              {selectedFacIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {selectedFacIds.length} Facility / Amenit{selectedFacIds.length > 1 ? 'ies' : 'y'}
                </span>
              )}
              {selectedAnnIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedAnnIds.length} Label{selectedAnnIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="space-y-1.5 mt-1.5">
                <button
                  onClick={allSelectedAreBookedStalls ? undefined : onDeleteSelected}
                  disabled={allSelectedAreBookedStalls}
                  className={`w-full py-1.5 px-3 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    allSelectedAreBookedStalls
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                  }`}
                  title={allSelectedAreBookedStalls ? 'Cannot delete: Selected stalls are booked/held' : undefined}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  {allSelectedAreBookedStalls ? 'Booked Stalls Protected' : `Delete All Selected (${selectedRefs.length})`}
                </button>
                {bookedStallsCount > 0 && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 shrink-0" />
                    {bookedStallsCount} booked stall{bookedStallsCount > 1 ? 's' : ''} strictly protected from deletion
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Quick Duplicate */}
          {!readOnly && (
            <div className="space-y-1.5">
              <Tooltip content="Duplicate Selected" shortcut="Ctrl+D" description="Create a clone of all selected items" position="top">
                <button
                  type="button"
                  onClick={() => onDuplicateSelected(1)}
                  className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                  aria-label="Duplicate selected items"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Duplicate Selected</span>
                </button>
              </Tooltip>
            </div>
          )}

          {/* Alignment Tools */}
          {!readOnly && selectedStallsList.length >= 2 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alignment & Distribution
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <Tooltip content="Align Left" description="Align left edges of all selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('left')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Left
                  </button>
                </Tooltip>
                <Tooltip content="Align Center" description="Align horizontal centers of selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('center')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" /> Center
                  </button>
                </Tooltip>
                <Tooltip content="Align Right" description="Align right edges of all selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('right')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" /> Right
                  </button>
                </Tooltip>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <Tooltip content="Align Top" description="Align top edges of all selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('top')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Top"
                  >
                    <AlignStartVertical className="w-3.5 h-3.5" /> Top
                  </button>
                </Tooltip>
                <Tooltip content="Align Middle" description="Align vertical centers of selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('middle')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Middle"
                  >
                    <AlignCenterVertical className="w-3.5 h-3.5" /> Middle
                  </button>
                </Tooltip>
                <Tooltip content="Align Bottom" description="Align bottom edges of all selected stalls" position="top">
                  <button
                    onClick={() => onAlignStalls('bottom')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors cursor-pointer"
                    aria-label="Align Bottom"
                  >
                    <AlignEndVertical className="w-3.5 h-3.5" /> Bottom
                  </button>
                </Tooltip>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <Tooltip content="Distribute Horizontally" description="Evenly space stalls along the horizontal axis" position="top">
                  <button
                    onClick={() => onDistributeStalls('horizontal')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                    aria-label="Distribute Horizontally"
                  >
                    Even Spacing ↔
                  </button>
                </Tooltip>
                <Tooltip content="Distribute Vertically" description="Evenly space stalls along the vertical axis" position="top">
                  <button
                    onClick={() => onDistributeStalls('vertical')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                    aria-label="Distribute Vertically"
                  >
                    Even Spacing ↕
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Bulk Stall Dimensions & Size Reduction */}
          {!readOnly && selectedStallsList.length > 0 && onBulkResizeStalls && (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-blue-600" />
                  Quick Scale & Size Reduction ({selectedStallsList.length} Stalls)
                </span>
              </div>

              {/* Snap Together / Keep Flush Option */}
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkKeepFlush}
                    onChange={(e) => setBulkKeepFlush(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-800">
                    Snap together without gaps
                  </span>
                </label>
                {onPackFlushStalls && (
                  <Tooltip content="Snap Flush" description="Align and pack stalls tightly edge-to-edge without gaps" position="left">
                    <button
                      type="button"
                      onClick={() => onPackFlushStalls()}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                      aria-label="Snap stalls together tightly edge-to-edge"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Snap Now</span>
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* 1. Proportional Overall Scale (Both Width & Depth) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Overall Scale (W & D)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">±0.5m</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip content="Quick Reduce Both" description="Shrink both Width & Depth by 0.5m (−10px)" position="top">
                    <button
                      type="button"
                      onClick={() => onBulkResizeStalls({ deltaPx: -10, keepFlush: bulkKeepFlush })}
                      className="py-1.5 px-3 bg-white hover:bg-rose-50 hover:border-rose-300 border border-slate-200 text-rose-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      aria-label="Shrink both Width and Depth by 0.5m"
                    >
                      <Minimize2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>−0.5m Both</span>
                    </button>
                  </Tooltip>
                  <Tooltip content="Quick Scale Both" description="Expand both Width & Depth by 0.5m (+10px)" position="top">
                    <button
                      type="button"
                      onClick={() => onBulkResizeStalls({ deltaPx: 10, keepFlush: bulkKeepFlush })}
                      className="py-1.5 px-3 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-emerald-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      aria-label="Expand both Width and Depth by 0.5m"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+0.5m Both</span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* 2. Independent Width & Depth Nudges */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Dimensional Nudge
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Width Nudge */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-slate-500 block text-center">Width</span>
                    <div className="grid grid-cols-2 gap-1">
                      <Tooltip content="Width -0.5m" description="Reduce stall width by 0.5m (-10px)" position="top">
                        <button
                          type="button"
                          onClick={() => onBulkResizeStalls({ deltaW: -10, keepFlush: bulkKeepFlush })}
                          className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          aria-label="Reduce width by 0.5m"
                        >
                          <span>−0.5</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Width +0.5m" description="Expand stall width by 0.5m (+10px)" position="top">
                        <button
                          type="button"
                          onClick={() => onBulkResizeStalls({ deltaW: 10, keepFlush: bulkKeepFlush })}
                          className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          aria-label="Expand width by 0.5m"
                        >
                          <span>+0.5</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  {/* Depth Nudge */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-slate-500 block text-center">Depth</span>
                    <div className="grid grid-cols-2 gap-1">
                      <Tooltip content="Depth -0.5m" description="Reduce stall depth by 0.5m (-10px)" position="top">
                        <button
                          type="button"
                          onClick={() => onBulkResizeStalls({ deltaH: -10, keepFlush: bulkKeepFlush })}
                          className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          aria-label="Reduce depth by 0.5m"
                        >
                          <span>−0.5</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Depth +0.5m" description="Expand stall depth by 0.5m (+10px)" position="top">
                        <button
                          type="button"
                          onClick={() => onBulkResizeStalls({ deltaH: 10, keepFlush: bulkKeepFlush })}
                          className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          aria-label="Expand depth by 0.5m"
                        >
                          <span>+0.5</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Standard Preset Dimensions */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Standard Presets
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '3×3m', w: 60, h: 60 },
                    { label: '3×2m', w: 60, h: 40 },
                    { label: '4×3m', w: 80, h: 60 },
                    { label: '2×2m', w: 40, h: 40 },
                  ].map((preset) => (
                    <Tooltip key={preset.label} content={`Preset ${preset.label}`} description={`Resize all selected stalls to ${preset.label}`} position="top">
                      <button
                        type="button"
                        onClick={() => onBulkResizeStalls({ width: preset.w, height: preset.h, keepFlush: bulkKeepFlush })}
                        className="w-full py-1 px-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-700 hover:text-blue-700 font-mono font-bold rounded-md text-[10px] transition-colors cursor-pointer text-center"
                        aria-label={`Set all selected stalls to ${preset.label}`}
                      >
                        {preset.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* 4. Exact Dimension Numeric Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase tracking-wider">Exact Width (m)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="40"
                    disabled={readOnly}
                    key={`w_${selectedStallsList[0]?.id}_${selectedStallsList[0]?.width}`}
                    defaultValue={((selectedStallsList[0]?.width || 60) / pxPerMeter).toFixed(1)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onBulkResizeStalls({ width: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(val) && val > 0) {
                          onBulkResizeStalls({ width: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase tracking-wider">Exact Depth (m)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="40"
                    disabled={readOnly}
                    key={`h_${selectedStallsList[0]?.id}_${selectedStallsList[0]?.height}`}
                    defaultValue={((selectedStallsList[0]?.height || 60) / pxPerMeter).toFixed(1)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onBulkResizeStalls({ height: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(val) && val > 0) {
                          onBulkResizeStalls({ height: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bulk Category & Pricing */}
          {!readOnly && selectedStallsList.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bulk Stall Attributes ({selectedStallsList.length} Stalls)
              </span>

              {/* Bulk Booking Availability & Block Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Booking Availability Status
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {selectedStallsList.filter((s) => s.status === 'AVAILABLE').length} Available
                    </span>
                    <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {selectedStallsList.filter((s) => s.status === 'BLOCKED').length} Blocked
                    </span>
                  </div>
                </div>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkUpdateStalls({ status: e.target.value as StallStatus });
                    }
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                >
                  <option value="" disabled>
                    Change status for {selectedStallsList.length} stalls...
                  </option>
                  <option value="BLOCKED">🚫 Blocked / Reserved by Admin</option>
                  <option value="AVAILABLE">✓ Available for Public Booking</option>
                  <option value="BOOKED_CONFIRMED">★ Booked Confirmed</option>
                </select>

                {/* Instant Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onBulkUpdateStalls({ status: 'BLOCKED' })}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Block all selected stalls so attendees cannot book them"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Block All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkUpdateStalls({ status: 'AVAILABLE' })}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Make all selected stalls available for public booking"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Make Available</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Set Category for All Selected
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkUpdateStalls({ category: e.target.value as StallCategory });
                    }
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="" disabled>
                    Choose category...
                  </option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="CORNER">Corner</option>
                  <option value="ISLAND">Island</option>
                </select>
              </div>

              {/* Bulk Custom Stall Color Applicator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" /> Bulk Stall Accent Color
                  </span>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onBulkUpdateStalls({ color: undefined })}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Defaults
                  </button>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {[
                    { name: 'Standard Blue', hex: '#2563eb' },
                    { name: 'Emerald', hex: '#059669' },
                    { name: 'Amber', hex: '#d97706' },
                    { name: 'Purple', hex: '#7c3aed' },
                    { name: 'Rose', hex: '#e11d48' },
                    { name: 'Cyan', hex: '#0891b2' },
                    { name: 'Indigo', hex: '#4f46e5' },
                    { name: 'Orange', hex: '#ea580c' },
                    { name: 'Teal', hex: '#0d9488' },
                    { name: 'Slate', hex: '#475569' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      disabled={readOnly}
                      title={c.name}
                      onClick={() => onBulkUpdateStalls({ color: c.hex })}
                      className="w-5 h-5 rounded-md transition-transform border border-black/10 hover:scale-110 cursor-pointer shadow-2xs"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  <div className="relative w-5 h-5 rounded-md overflow-hidden border border-slate-300 ml-1">
                    <input
                      type="color"
                      disabled={readOnly}
                      defaultValue="#2563eb"
                      onChange={(e) => onBulkUpdateStalls({ color: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Pick custom color for selected stalls"
                    />
                    <div className="w-full h-full bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Set Rental Price (₹ INR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1000"
                    placeholder="e.g. 60000"
                    id="bulk-price-input"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('bulk-price-input') as HTMLInputElement;
                      if (el && el.value) {
                        onBulkUpdateStalls({ price: Number(el.value) });
                        el.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Single select or None selected
  const singleRef = selectedRefs[0];

  // 1. Stall Selected
  if (singleRef && singleRef.type === 'stall') {
    const stall = stalls.find((s) => s.id === singleRef.id);
    if (!stall) return null;

    const isBooked = isStallBookedOrHeld(stall);
    const isPositionLocked = isBooked && !(unlockedBookedStallIds && unlockedBookedStallIds.has(stall.id));
    const widthMeters = Number((stall.width / pxPerMeter).toFixed(1));
    const depthMeters = Number((stall.height / pxPerMeter).toFixed(1));
    const areaSqMeters = Number((widthMeters * depthMeters).toFixed(1));

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isBooked ? 'bg-amber-500' : 'bg-emerald-600'}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 font-mono">
              Stall No: {stall.stallNumber}
            </h3>
            {isBooked && (
              isPositionLocked ? (
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-rose-300 dark:border-rose-800 animate-pulse">
                  <Unlock className="w-2.5 h-2.5" /> Relocating
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!readOnly && (
              <>
                <Tooltip content="Duplicate Stall" shortcut="Ctrl+D" description="Duplicate this stall next to the current position" position="bottom">
                  <button
                    onClick={() => onDuplicateSelected(1)}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded cursor-pointer"
                    aria-label="Duplicate Stall"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip
                  content={isBooked ? 'Protected from Deletion' : 'Delete Stall'}
                  shortcut="Del"
                  description={isBooked ? 'Cannot delete: Stall is booked or held by customer' : 'Remove this stall from the floor plan'}
                  position="bottom"
                >
                  <button
                    onClick={isBooked ? undefined : onDeleteSelected}
                    disabled={isBooked}
                    className={`p-1 rounded transition-colors ${
                      isBooked
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                        : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                    }`}
                    aria-label="Delete Stall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </>
            )}
            {onToggleCollapse && (
              <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse Inspector"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isBooked && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                isPositionLocked
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  {isPositionLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Position Locked (Booked)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                      <span className="text-rose-700 dark:text-rose-300">Relocation Mode Active</span>
                    </>
                  )}
                </span>
                {!readOnly && (
                  isPositionLocked ? (
                    <Tooltip content="Unlock Stall" description="Enable moving or resizing this booked stall on the canvas" position="left">
                      <button
                        type="button"
                        onClick={() => onUnlockStall?.(stall.id, stall.stallNumber)}
                        className="text-[11px] font-bold px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                        aria-label="Unlock this booth for deliberate relocation"
                      >
                        <Unlock className="w-3 h-3" /> Unlock to Relocate
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Lock Position" description="Lock coordinates and prevent accidental movements" position="left">
                      <button
                        type="button"
                        onClick={() => onRelockStall?.(stall.id)}
                        className="text-[11px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                        aria-label="Lock position back to prevent accidental changes"
                      >
                        <Lock className="w-3 h-3" /> Re-lock Position
                      </button>
                    </Tooltip>
                  )
                )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {isPositionLocked
                  ? 'This stall is reserved or confirmed by a customer. Position, dimensions, and coordinates are locked to protect the reservation from accidental movement.'
                  : 'Caution: Relocation mode is active. You may now reposition or resize this stall on the canvas. Be sure to re-lock it when finished and notify the exhibitor of any changes.'}
              </p>
            </div>
          )}
          {/* 1. Stall Name / Number */}
          {(() => {
            const isDuplicate = Boolean(
              stall.stallNumber &&
              stalls.some(
                (s) => s.id !== stall.id && s.stallNumber.trim().toUpperCase() === stall.stallNumber.trim().toUpperCase()
              )
            );
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Stall Name / Number
                  </label>
                  {isDuplicate && (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Duplicate!
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  disabled={readOnly}
                  value={stall.stallNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    onUpdateStall(stall.id, { stallNumber: val, name: val });
                  }}
                  placeholder="e.g. TECH-C06, A-101"
                  className={`w-full px-3 py-2 text-sm border rounded-lg font-mono font-bold uppercase focus:ring-2 ${
                    isDuplicate
                      ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-400 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 bg-white text-slate-900'
                  }`}
                />
                {isDuplicate && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Stall No: {stall.stallNumber} is already in use by another booth. Stall numbers must be unique.
                  </p>
                )}
              </div>
            );
          })()}

          {/* 2. Actual Stall Dimensions: Width × Height (for example, 3m × 3m) */}
          {(() => {
            const actualW =
              stall.actualWidth !== undefined
                ? stall.actualWidth
                : Number(((stall.width || 60) / pxPerMeter).toFixed(1));
            const actualH =
              stall.actualHeight !== undefined
                ? stall.actualHeight
                : Number(((stall.height || 60) / pxPerMeter).toFixed(1));
            const actualAreaSqM = Number((actualW * actualH).toFixed(1));
            const actualAreaSqFt = Math.round(actualW * actualH * 10.764);

            return (
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Actual Stall Dimensions
                  </label>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    {actualW}m × {actualH}m
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Width (m)
                    </label>
                    <InspectorNumericInput
                      disabled={readOnly || isPositionLocked}
                      step="0.5"
                      min={0.1}
                      value={actualW}
                      onChange={(w) => {
                        onUpdateStall(stall.id, {
                          actualWidth: w,
                          actualDimensions: `${w}m × ${actualH}m`,
                          areaSqFt: Math.round(w * actualH * 10.764),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Height (m)
                    </label>
                    <InspectorNumericInput
                      disabled={readOnly || isPositionLocked}
                      step="0.5"
                      min={0.1}
                      value={actualH}
                      onChange={(h) => {
                        onUpdateStall(stall.id, {
                          actualHeight: h,
                          actualDimensions: `${actualW}m × ${h}m`,
                          areaSqFt: Math.round(actualW * h * 10.764),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                  <span>Footprint: {actualW}m × {actualH}m</span>
                  <span>{actualAreaSqFt} sq.ft ({actualAreaSqM} m²)</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Informational physical dimensions. Does not modify canvas pixel size, coordinates, or layout reflow.
                </p>
              </div>
            );
          })()}

          {/* 3. Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category
            </label>
            <select
              disabled={readOnly}
              value={stall.category}
              onChange={(e) => onUpdateStall(stall.id, { category: e.target.value as StallCategory })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium bg-white"
            >
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
              <option value="CORNER">Corner</option>
              <option value="ISLAND">Island Suite</option>
            </select>
          </div>

          {/* 4. Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Price (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
              <InspectorNumericInput
                disabled={readOnly}
                step="1000"
                min={0}
                value={stall.price}
                onChange={(p) => onUpdateStall(stall.id, { price: p })}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* 5. Availability Status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Availability Status
              </label>
              {isBooked && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </div>
            <select
              disabled={readOnly || isBooked}
              value={stall.status}
              onChange={(e) => onUpdateStall(stall.id, { status: e.target.value as StallStatus })}
              className={`w-full px-3 py-2 text-xs border rounded-lg font-medium ${
                isBooked
                  ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="AVAILABLE">Available for Public Booking</option>
              <option value="BLOCKED">Blocked / Reserved by Admin</option>
              <option value="BOOKED_CONFIRMED">Booked Confirmed</option>
              {stall.status === 'PAYMENT_PENDING' && <option value="PAYMENT_PENDING">Payment Pending</option>}
              {stall.status === 'TEMPORARILY_HELD' && <option value="TEMPORARILY_HELD">Temporarily Held</option>}
              {stall.status === 'BOOKING_IN_PROGRESS' && <option value="BOOKING_IN_PROGRESS">Booking in Progress</option>}
            </select>
            {isBooked && (
              <p className="mt-1 text-[10px] text-amber-700 font-medium">
                Locked by customer reservation rule. Editor cannot override booked/held status.
              </p>
            )}
          </div>

          {/* 6. UI Display Size: Canvas Width × Canvas Height in pixels */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                UI Display Size (Pixels)
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                {Math.round(stall.width)}px × {Math.round(stall.height)}px
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Canvas Width (px)
                </label>
                <InspectorNumericInput
                  disabled={readOnly || isPositionLocked}
                  step="5"
                  min={20}
                  value={Math.round(stall.width)}
                  onChange={(newW) => {
                    onUpdateStall(stall.id, { width: Math.round(newW) }, { pushNeighbors: singlePushNeighbors });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Canvas Height (px)
                </label>
                <InspectorNumericInput
                  disabled={readOnly || isPositionLocked}
                  step="5"
                  min={20}
                  value={Math.round(stall.height)}
                  onChange={(newH) => {
                    onUpdateStall(stall.id, { height: Math.round(newH) }, { pushNeighbors: singlePushNeighbors });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Keep Flush / Push Adjacent Stalls Toggle */}
            <div className="flex items-center justify-between p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={readOnly || isPositionLocked}
                  checked={singlePushNeighbors}
                  onChange={(e) => setSinglePushNeighbors(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-[11px] font-bold text-blue-900">
                  Push / Pull Row (No Gaps)
                </span>
              </label>
            </div>

            {/* Quick Dimension Nudges */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60">
              <Tooltip content="Shrink Width" description="Decrease visual canvas width by 10px" position="top">
                <button
                  type="button"
                  disabled={readOnly || isPositionLocked || stall.width <= 20}
                  onClick={() =>
                    onUpdateStall(
                      stall.id,
                      { width: Math.max(20, stall.width - 10) },
                      { pushNeighbors: singlePushNeighbors }
                    )
                  }
                  className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 text-slate-700 font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  aria-label="Shrink canvas width by 10px"
                >
                  <Minimize2 className="w-3 h-3 text-rose-600" /> −10px W
                </button>
              </Tooltip>
              <Tooltip content="Expand Width" description="Increase visual canvas width by 10px" position="top">
                <button
                  type="button"
                  disabled={readOnly || isPositionLocked}
                  onClick={() =>
                    onUpdateStall(
                      stall.id,
                      { width: stall.width + 10 },
                      { pushNeighbors: singlePushNeighbors }
                    )
                  }
                  className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 text-slate-700 font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  aria-label="Expand canvas width by 10px"
                >
                  <Maximize2 className="w-3 h-3 text-emerald-600" /> +10px W
                </button>
              </Tooltip>
              <Tooltip content="Shrink Height" description="Decrease visual canvas height by 10px" position="top">
                <button
                  type="button"
                  disabled={readOnly || isPositionLocked || stall.height <= 20}
                  onClick={() =>
                    onUpdateStall(
                      stall.id,
                      { height: Math.max(20, stall.height - 10) },
                      { pushNeighbors: singlePushNeighbors }
                    )
                  }
                  className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 text-slate-700 font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  aria-label="Shrink canvas height by 10px"
                >
                  <Minimize2 className="w-3 h-3 text-rose-600" /> −10px H
                </button>
              </Tooltip>
              <Tooltip content="Expand Height" description="Increase visual canvas height by 10px" position="top">
                <button
                  type="button"
                  disabled={readOnly || isPositionLocked}
                  onClick={() =>
                    onUpdateStall(
                      stall.id,
                      { height: stall.height + 10 },
                      { pushNeighbors: singlePushNeighbors }
                    )
                  }
                  className="w-full py-1 px-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 text-slate-700 font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  aria-label="Expand canvas height by 10px"
                >
                  <Maximize2 className="w-3 h-3 text-emerald-600" /> +10px H
                </button>
              </Tooltip>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Controls visual rendered size on canvas. Does not overwrite actual physical dimensions.
            </p>
          </div>

          {/* 7. Custom Stall Color */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                Custom Stall Color
              </label>
              {stall.color && (
                <Tooltip content="Reset Color" description="Restore standard category theme color" position="left">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onUpdateStall(stall.id, { color: undefined })}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    aria-label="Reset Default Color"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Default
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Presets Grid */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Standard Blue', hex: '#2563eb' },
                { name: 'Emerald', hex: '#059669' },
                { name: 'Amber', hex: '#d97706' },
                { name: 'Purple', hex: '#7c3aed' },
                { name: 'Rose', hex: '#e11d48' },
                { name: 'Cyan', hex: '#0891b2' },
                { name: 'Indigo', hex: '#4f46e5' },
                { name: 'Orange', hex: '#ea580c' },
                { name: 'Teal', hex: '#0d9488' },
                { name: 'Slate', hex: '#475569' },
              ].map((c) => {
                const isSelected = (stall.color || '').toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    disabled={readOnly}
                    title={c.name}
                    onClick={() => onUpdateStall(stall.id, { color: c.hex })}
                    className={`w-6 h-6 rounded-lg transition-transform border border-black/10 relative cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 shadow-xs' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>

            {/* Custom Color Native Picker & Hex Input */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
              <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-slate-300 shadow-2xs">
                <input
                  type="color"
                  disabled={readOnly}
                  value={
                    stall.color ||
                    (stall.category === 'PREMIUM'
                      ? '#059669'
                      : stall.category === 'CORNER'
                      ? '#d97706'
                      : stall.category === 'ISLAND'
                      ? '#7c3aed'
                      : '#2563eb')
                  }
                  onChange={(e) => onUpdateStall(stall.id, { color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick custom color"
                />
                <div
                  className="w-full h-full rounded-lg"
                  style={{
                    backgroundColor:
                      stall.color ||
                      (stall.category === 'PREMIUM'
                        ? '#059669'
                        : stall.category === 'CORNER'
                        ? '#d97706'
                        : stall.category === 'ISLAND'
                        ? '#7c3aed'
                        : '#2563eb'),
                  }}
                />
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  disabled={readOnly}
                  value={stall.color || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateStall(stall.id, { color: val });
                  }}
                  placeholder="Custom Hex (e.g. #3b82f6)"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* Rotation & Position */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Transform & Orientation
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Rotation</span>
              <div className="flex items-center gap-1">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    disabled={readOnly || isPositionLocked}
                    onClick={() => onUpdateStall(stall.id, { rotation: deg })}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      (stall.rotation || 0) === deg
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-1">
                <span>X: {Math.round(stall.xPosition)}px</span>
                {isPositionLocked && (
                  <span title="Position locked">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span>Y: {Math.round(stall.yPosition)}px</span>
                {isPositionLocked && (
                  <span title="Position locked">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div className="pt-2 flex flex-col gap-2">
              <Tooltip content="Duplicate Next Stall" shortcut="Ctrl+D" description="Duplicate stall and align it right next to this one" position="top">
                <button
                  onClick={() => onDuplicateSelected(1)}
                  className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  aria-label="Duplicate Next Stall"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Next Stall
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // 2. Hall Selected
  if (singleRef && singleRef.type === 'hall') {
    const hall = halls.find((h) => h.id === singleRef.id);
    if (!hall) return null;

    const widthMeters = Number((hall.width / pxPerMeter).toFixed(1));
    const heightMeters = Number((hall.height / pxPerMeter).toFixed(1));
    const totalAreaSqMeters = Number((widthMeters * heightMeters).toFixed(1));

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Hall Settings
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Tooltip content="Delete Hall" shortcut="Del" description="Remove this hall and boundaries from canvas" position="bottom">
                <button
                  onClick={onDeleteSelected}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  aria-label="Delete Hall"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Hall
                </button>
              </Tooltip>
            )}
            {onToggleCollapse && (
              <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse Inspector"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hall Name / Identifier
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={hall.name}
              onChange={(e) => onUpdateHall(hall.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-400">e.g. Hall A, Hall B, Pavilion 1</span>
          </div>

          {/* Hall Name Position & Typography Controls */}
          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Title Banner Customization
            </span>
            {/* Inside vs Outside Mode Switch */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Banner Placement Mode
              </label>
              <div className="grid grid-cols-2 gap-1 mb-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    const currentPos = hall.namePosition || 'top-left';
                    const newPos = currentPos.replace('outside-', '') as HallNamePosition;
                    onUpdateHall(hall.id, { namePosition: newPos });
                  }}
                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                    !(hall.namePosition || 'top-left').startsWith('outside')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Inside Hall
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    const currentPos = hall.namePosition || 'top-left';
                    let newPos: HallNamePosition = 'outside-top-left';
                    if (currentPos.includes('center')) newPos = 'outside-top-center';
                    else if (currentPos.includes('right')) newPos = 'outside-top-right';
                    else if (currentPos.includes('bottom')) newPos = 'outside-bottom-left';
                    onUpdateHall(hall.id, { namePosition: newPos });
                  }}
                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                    (hall.namePosition || 'top-left').startsWith('outside')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Outside Hall (Tab)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Exact Position / Alignment
              </label>
              <select
                disabled={readOnly}
                value={hall.namePosition || 'top-left'}
                onChange={(e) => onUpdateHall(hall.id, { namePosition: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              >
                <optgroup label="Outside Hall (Header Tabs)">
                  <option value="outside-top-left">Outside Top-Left (Floating Header Tab)</option>
                  <option value="outside-top-center">Outside Top-Center (Centered Marquee)</option>
                  <option value="outside-top-right">Outside Top-Right</option>
                  <option value="outside-bottom-left">Outside Bottom-Left</option>
                  <option value="outside-bottom-center">Outside Bottom-Center</option>
                  <option value="outside-bottom-right">Outside Bottom-Right</option>
                </optgroup>
                <optgroup label="Inside Hall Interior">
                  <option value="top-left">Inside Top-Left Banner</option>
                  <option value="top-center">Inside Top-Center Banner</option>
                  <option value="top-right">Inside Top-Right Banner</option>
                  <option value="center">Inside Center Banner</option>
                  <option value="bottom-left">Inside Bottom-Left Banner</option>
                  <option value="bottom-center">Inside Bottom-Center Banner</option>
                  <option value="bottom-right">Inside Bottom-Right Banner</option>
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Size (px)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  min="10"
                  max="36"
                  value={hall.fontSize || 13}
                  onChange={(e) => onUpdateHall(hall.id, { fontSize: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Weight
                </label>
                <select
                  disabled={readOnly}
                  value={hall.fontWeight || 'bold'}
                  onChange={(e) => onUpdateHall(hall.id, { fontWeight: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="normal">Normal</option>
                  <option value="semibold">SemiBold</option>
                  <option value="bold">Bold</option>
                  <option value="black">Black</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
            <span className="font-bold text-blue-600">Freehand Sizing:</span> No need to calculate rigid measurements. Simply drag the white handles on the corners or edges of <strong>{hall.name}</strong> on the canvas to resize it.
          </div>

          <details className="group">
            <summary className="text-[11px] font-bold text-slate-500 cursor-pointer hover:text-slate-800 transition-colors py-1 flex items-center justify-between">
              <span>Optional Numeric Scale</span>
              <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Width (m)
                </label>
                <InspectorNumericInput
                  disabled={readOnly}
                  step="1"
                  min={5}
                  value={widthMeters}
                  onChange={(val) => onUpdateHall(hall.id, { width: val * pxPerMeter })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Height (m)
                </label>
                <InspectorNumericInput
                  disabled={readOnly}
                  step="1"
                  min={5}
                  value={heightMeters}
                  onChange={(val) => onUpdateHall(hall.id, { height: val * pxPerMeter })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </details>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Accent Tone
            </label>
            <div className="flex gap-2">
              {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateHall(hall.id, { color: c })}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    (hall.color || '#3b82f6') === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 3. Facility Selected
  if (singleRef && singleRef.type === 'facility') {
    const fac = facilities.find((f) => f.id === singleRef.id);
    if (!fac) return null;

    const availableIcons = [
      { id: 'door', label: 'Door / Gate', icon: DoorOpen },
      { id: 'log-in', label: 'Entrance', icon: LogIn },
      { id: 'log-out', label: 'Exit', icon: LogOut },
      { id: 'badge', label: 'Registration', icon: BadgeCheck },
      { id: 'restroom', label: 'Restroom', icon: Bath },
      { id: 'utensils', label: 'Food / Dining', icon: Utensils },
      { id: 'coffee', label: 'Cafeteria', icon: Coffee },
      { id: 'presentation', label: 'Stage', icon: Presentation },
      { id: 'shield', label: 'Security', icon: Shield },
      { id: 'info', label: 'Info Booth', icon: Info },
      { id: 'zap', label: 'Power / Tech', icon: Zap },
      { id: 'star', label: 'VIP Zone', icon: Star },
    ];

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Facility: {fac.type}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Tooltip content="Delete Facility" shortcut="Del" description="Remove this amenity/facility marker from canvas" position="bottom">
                <button
                  onClick={onDeleteSelected}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  aria-label="Delete Facility"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </Tooltip>
            )}
            {onToggleCollapse && (
              <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse Inspector"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Display Label
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={fac.label}
              onChange={(e) => onUpdateFacility(fac.id, { label: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold uppercase text-slate-900"
            />
          </div>

          {/* Custom Display Mode (Icon / Text / Both) */}
          <div className="space-y-3 p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
              Icon & Typography Customization
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Display Format
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'both', label: 'Icon + Text' },
                  { id: 'icon-only', label: 'Icon Only' },
                  { id: 'text-only', label: 'Text Only' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onUpdateFacility(fac.id, { displayMode: mode.id as any })}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                      (fac.displayMode || 'both') === mode.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Standalone Icon Grid Picker */}
            {(fac.displayMode || 'both') !== 'text-only' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  Select Standalone Icon
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {availableIcons.map((ic) => {
                    const IconComp = ic.icon;
                    const isSelected = (fac.iconName || (fac.type === 'entrance' ? 'log-in' : fac.type === 'exit' ? 'log-out' : fac.type === 'restroom' ? 'restroom' : fac.type === 'dining' || fac.type === 'food-court' ? 'utensils' : 'door')) === ic.id;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onUpdateFacility(fac.id, { iconName: ic.id })}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={ic.label}
                      >
                        <IconComp className="w-4 h-4 shrink-0" />
                        <span className="text-[9px] font-semibold truncate w-full text-center">
                          {ic.label.split('/')[0].trim()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Icon Size Controls: Presets (Small, Medium, Large) + Numeric Input */}
            {(fac.displayMode || 'both') !== 'text-only' && (
              <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Icon Size
                  </label>
                  <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                    {fac.iconSize || 24}px
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: 'Small', size: 16 },
                    { label: 'Medium', size: 24 },
                    { label: 'Large', size: 36 },
                  ].map((p) => {
                    const isSelected = (fac.iconSize || 24) === p.size;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onUpdateFacility(fac.id, { iconSize: p.size })}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.label} ({p.size}px)
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    disabled={readOnly}
                    min="12"
                    max="64"
                    step="2"
                    value={fac.iconSize || 24}
                    onChange={(e) => onUpdateFacility(fac.id, { iconSize: Number(e.target.value) })}
                    className="flex-1 accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <InspectorNumericInput
                    disabled={readOnly}
                    min={12}
                    max={64}
                    step={1}
                    value={fac.iconSize || 24}
                    onChange={(size) => onUpdateFacility(fac.id, { iconSize: size })}
                    className="w-14 px-1.5 py-1 text-xs border border-slate-300 rounded-lg font-mono text-center bg-white"
                  />
                </div>
              </div>
            )}

            {/* Font Size Customization for Text */}
            {(fac.displayMode || 'both') !== 'icon-only' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Size (px)
                </label>
                <InspectorNumericInput
                  disabled={readOnly}
                  min={8}
                  max={28}
                  step={1}
                  value={fac.fontSize || 10}
                  onChange={(size) => onUpdateFacility(fac.id, { fontSize: size })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>
            )}

            {(fac.displayMode || 'both') !== 'icon-only' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Weight
                </label>
                <select
                  disabled={readOnly}
                  value={fac.fontWeight || 'bold'}
                  onChange={(e) => onUpdateFacility(fac.id, { fontWeight: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="normal">Normal</option>
                  <option value="semibold">SemiBold</option>
                  <option value="bold">Bold</option>
                  <option value="black">Black</option>
                </select>
              </div>
            )}
          </div>

          {/* Dimensions in Meters & Pixels */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Dimensions (Meters)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {fac.width}px × {fac.height}px
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Width (m)
                </label>
                <InspectorNumericInput
                  disabled={readOnly}
                  step="0.5"
                  min={0.5}
                  value={Number((fac.width / pxPerMeter).toFixed(1))}
                  onChange={(m) => onUpdateFacility(fac.id, { width: Math.round(m * pxPerMeter) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Depth / Height (m)
                </label>
                <InspectorNumericInput
                  disabled={readOnly}
                  step="0.5"
                  min={0.5}
                  value={Number((fac.height / pxPerMeter).toFixed(1))}
                  onChange={(m) => onUpdateFacility(fac.id, { height: Math.round(m * pxPerMeter) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Rotation
            </span>
            <div className="flex gap-1.5">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  disabled={readOnly}
                  onClick={() => onUpdateFacility(fac.id, { rotation: deg })}
                  className={`px-2.5 py-1 text-xs font-bold rounded ${
                    (fac.rotation || 0) === deg
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 4. Annotation Selected
  if (singleRef && singleRef.type === 'annotation') {
    const ann = annotations.find((a) => a.id === singleRef.id);
    if (!ann) return null;

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Text Label Settings
          </h3>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Tooltip content="Delete Text Label" shortcut="Del" description="Remove this text label from canvas" position="bottom">
                <button
                  onClick={onDeleteSelected}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  aria-label="Delete Text Label"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </Tooltip>
            )}
            {onToggleCollapse && (
              <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse Inspector"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Text Content
            </label>
            <textarea
              rows={3}
              disabled={readOnly}
              value={ann.text}
              onChange={(e) => onUpdateAnnotation(ann.id, { text: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="space-y-3 p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 block">
              Label Styling & Icon Customization
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Display Format
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'both', label: 'Icon + Text' },
                  { id: 'icon-only', label: 'Icon Only' },
                  { id: 'text-only', label: 'Text Only' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onUpdateAnnotation(ann.id, { displayMode: mode.id as any })}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                      (ann.displayMode || 'text-only') === mode.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {(ann.displayMode || 'text-only') !== 'text-only' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Choose Icon
                </label>
                <select
                  disabled={readOnly}
                  value={ann.iconName || 'info'}
                  onChange={(e) => onUpdateAnnotation(ann.id, { iconName: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                >
                  <option value="info">Info Circle</option>
                  <option value="star">Star Mark</option>
                  <option value="door">Door / Gate</option>
                  <option value="badge">Badge</option>
                  <option value="zap">Power / Electric</option>
                  <option value="shield">Security</option>
                  <option value="coffee">Coffee / Refreshment</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Size (px)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  min="8"
                  max="72"
                  value={ann.fontSize || 12}
                  onChange={(e) => onUpdateAnnotation(ann.id, { fontSize: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    disabled={readOnly || (ann.fontSize || 12) <= 8}
                    onClick={() => onUpdateAnnotation(ann.id, { fontSize: Math.max(8, (ann.fontSize || 12) - 2) })}
                    className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    −2px
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || (ann.fontSize || 12) >= 72}
                    onClick={() => onUpdateAnnotation(ann.id, { fontSize: Math.min(72, (ann.fontSize || 12) + 2) })}
                    className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    +2px
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Font Weight
                </label>
                <select
                  disabled={readOnly}
                  value={ann.fontWeight || 'bold'}
                  onChange={(e) => onUpdateAnnotation(ann.id, { fontWeight: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="normal">Normal</option>
                  <option value="semibold">SemiBold</option>
                  <option value="bold">Bold</option>
                  <option value="black">Black</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  Text & Icon Color
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  {ann.color || '#475569'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { hex: '#475569', label: 'Slate' },
                  { hex: '#0f172a', label: 'Dark Navy' },
                  { hex: '#2563eb', label: 'Blue' },
                  { hex: '#059669', label: 'Emerald' },
                  { hex: '#d97706', label: 'Amber' },
                  { hex: '#dc2626', label: 'Crimson' },
                  { hex: '#7c3aed', label: 'Purple' },
                  { hex: '#db2777', label: 'Rose Pink' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    disabled={readOnly}
                    onClick={() => onUpdateAnnotation(ann.id, { color: c.hex })}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer shadow-2xs ${
                      (ann.color || '#475569').toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-purple-600 scale-110'
                        : 'opacity-85 hover:scale-105'
                    }`}
                  />
                ))}
                {/* Native Custom Color Picker */}
                <div
                  className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-300 shadow-2xs cursor-pointer ml-1"
                  title="Choose Custom Color"
                >
                  <input
                    type="color"
                    disabled={readOnly}
                    value={ann.color || '#475569'}
                    onChange={(e) => onUpdateAnnotation(ann.id, { color: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: ann.color || '#475569' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 5. Nothing selected: Show Floor-Plan Overview Summary
  const totalValuation = stalls.reduce((sum, s) => sum + Number(s.price), 0);
  const availableCount = stalls.filter((s) => s.status === 'AVAILABLE').length;
  const blockedCount = stalls.filter((s) => s.status === 'BLOCKED').length;
  const bookedCount = stalls.filter((s) => s.status === 'BOOKED_CONFIRMED').length;

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-blue-600" /> Floor Plan Summary
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Live spatial stats & inventory valuation
          </p>
        </div>
        {onToggleCollapse && (
          <Tooltip content="Collapse Inspector" shortcut="]" description="Collapse right panel to compact icon strip" position="bottom">
            <button
              onClick={onToggleCollapse}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              aria-label="Collapse Inspector"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Total Valuation Card */}
        <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
            Total Stall Value
          </span>
          <p className="text-xl font-extrabold text-blue-700 font-mono">
            ₹{totalValuation.toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-600 block">
            Across {stalls.length} configured stalls
          </span>
        </div>

        {/* Breakdown Counts */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Floor Plan Overview
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-slate-500 block text-[10px] font-medium truncate">Halls</span>
              <span className="text-base font-bold text-slate-800 font-mono">{halls.length}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-slate-500 block text-[10px] font-medium truncate">Stalls</span>
              <span className="text-base font-bold text-slate-800 font-mono">{stalls.length}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-slate-500 block text-[10px] font-medium truncate">Facilities</span>
              <span className="text-base font-bold text-slate-800 font-mono">{facilities.length}</span>
            </div>
          </div>
          {canReduceCanvas && onReduceCanvas && (
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[11px] font-bold text-amber-900 block">Canvas Size Expanded</span>
                <span className="text-[10px] text-amber-700 block font-mono">
                  Current: {canvasWidth}×{canvasHeight}px
                </span>
              </div>
              <button
                type="button"
                onClick={onReduceCanvas}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Reduce canvas dimensions back towards default"
              >
                − Reduce Canvas
              </button>
            </div>
          )}
        </div>

        {/* Stall Status Distribution */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stall Status Distribution
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="font-mono font-bold">{availableCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500" /> Booked Confirmed
              </span>
              <span className="font-mono font-bold">{bookedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-800">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked
              </span>
              <span className="font-mono font-bold">{blockedCount}</span>
            </div>
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-3.5 h-3.5 text-amber-600" /> Quick Tips
          </div>
          <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
            <li>Click any object to edit dimensions & price</li>
            <li>Drag corner handles to resize stalls physically</li>
            <li>Shift + Click to multi-select and bulk-edit</li>
            <li>Use <b>+ Stall Row</b> to generate 20+ stalls in 1 click</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};
