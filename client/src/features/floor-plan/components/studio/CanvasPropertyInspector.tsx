import React, { useState } from 'react';
import {
  Trash2,
  Copy,
  Layers,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
  Maximize2,
  Minimize2,
  DollarSign,
  Grid,
  Info,
  ChevronRight,
  ChevronLeft,
  Sliders,
} from 'lucide-react';
import { StallCategory, StallStatus } from '../../../../types';
import {
  DraftStallItem,
  HallZone,
  FacilityObject,
  AnnotationObject,
  SelectedItemReference,
} from '../../../../types/floorPlanStudio';

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
  onBulkResizeStalls?: (params: { width?: number; height?: number; scaleMultiplier?: number; deltaPx?: number; keepFlush?: boolean }) => void;
  onPackFlushStalls?: () => void;
  onAlignStalls: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeStalls: (direction: 'horizontal' | 'vertical') => void;
  canvasWidth: number;
  canvasHeight: number;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

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
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse,
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
            <button
              onClick={onToggleCollapse}
              title="Expand Property Inspector (])"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
              <button
                onClick={onDeleteSelected}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector (])"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
              <button
                onClick={onDeleteSelected}
                className="w-full mt-1.5 py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete All Selected ({selectedRefs.length})
              </button>
            )}
          </div>
          {/* Quick Duplicate */}
          {!readOnly && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bulk Duplication
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onDuplicateSelected(1)}
                  className="py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button
                  onClick={() => onDuplicateSelected(10)}
                  className="py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate ×10
                </button>
              </div>
            </div>
          )}

          {/* Alignment Tools */}
          {!readOnly && selectedStallsList.length >= 2 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alignment & Distribution
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onAlignStalls('left')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" /> Left
                </button>
                <button
                  onClick={() => onAlignStalls('center')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" /> Center
                </button>
                <button
                  onClick={() => onAlignStalls('right')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-slate-700"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" /> Right
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => onDistributeStalls('horizontal')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Distribute Horiz ↔
                </button>
                <button
                  onClick={() => onDistributeStalls('vertical')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Distribute Vert ↕
                </button>
              </div>
            </div>
          )}

          {/* Bulk Stall Dimensions & Size Reduction */}
          {!readOnly && selectedStallsList.length > 0 && onBulkResizeStalls && (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-blue-600" />
                  Resize All Selected ({selectedStallsList.length} Stalls)
                </span>
              </div>

              {/* No-gap / Flush Toggle & Instant Pack Button */}
              <div className="space-y-1.5 pb-2 border-b border-slate-200/80">
                <div className="flex items-center justify-between p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkKeepFlush}
                      onChange={(e) => setBulkKeepFlush(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-blue-900">
                      Keep Flush / No Gaps (Auto-Pack)
                    </span>
                  </label>
                </div>

                {onPackFlushStalls && (
                  <button
                    type="button"
                    onClick={() => onPackFlushStalls()}
                    className="w-full py-1.5 px-2 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove all gaps and pack selected stalls tightly edge-to-edge"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Snap & Pack Flush (0 Gap)</span>
                  </button>
                )}
              </div>

              {/* Quick Scaling / Reduction Buttons */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Scale & Reduction
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onBulkResizeStalls({ scaleMultiplier: 0.85, keepFlush: bulkKeepFlush })}
                    className="py-1.5 px-2 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Reduce dimensions of all selected stalls by 15%"
                  >
                    <Minimize2 className="w-3 h-3 text-rose-600" />
                    <span>Reduce -15%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkResizeStalls({ scaleMultiplier: 1.15, keepFlush: bulkKeepFlush })}
                    className="py-1.5 px-2 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Enlarge dimensions of all selected stalls by 15%"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-600" />
                    <span>Enlarge +15%</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onBulkResizeStalls({ deltaPx: -10, keepFlush: bulkKeepFlush })}
                    className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Shrink width and depth by 0.5m (-10px)"
                  >
                    <span>−0.5m (-10px)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkResizeStalls({ deltaPx: 10, keepFlush: bulkKeepFlush })}
                    className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Expand width and depth by 0.5m (+10px)"
                  >
                    <span>+0.5m (+10px)</span>
                  </button>
                </div>
              </div>

              {/* Preset Standard Sizes */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Preset Dimensions for All
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '2×2m', w: 40, h: 40 },
                    { label: '3×3m', w: 60, h: 60 },
                    { label: '4×3m', w: 80, h: 60 },
                    { label: '6×3m', w: 120, h: 60 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => onBulkResizeStalls({ width: p.w, height: p.h, keepFlush: bulkKeepFlush })}
                      className="py-1 px-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-700 font-bold rounded-md text-[10px] transition-colors cursor-pointer text-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Dimension Numeric Inputs */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Set Exact Width & Depth
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Width (m)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="40"
                      disabled={readOnly}
                      placeholder={((selectedStallsList[0]?.width || 60) / pxPerMeter).toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onBulkResizeStalls({ width: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                        }
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Depth (m)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="40"
                      disabled={readOnly}
                      placeholder={((selectedStallsList[0]?.height || 60) / pxPerMeter).toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onBulkResizeStalls({ height: Math.round(val * pxPerMeter), keepFlush: bulkKeepFlush });
                        }
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
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
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
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

    const widthMeters = Number((stall.width / pxPerMeter).toFixed(1));
    const depthMeters = Number((stall.height / pxPerMeter).toFixed(1));
    const areaSqMeters = Number((widthMeters * depthMeters).toFixed(1));

    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 font-mono">
              Stall #{stall.stallNumber}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {!readOnly && (
              <>
                <button
                  onClick={() => onDuplicateSelected(1)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onDeleteSelected}
                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                  title="Delete Stall"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector (])"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Stall Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Stall Identifier / Number
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={stall.stallNumber}
              onChange={(e) => onUpdateStall(stall.id, { stallNumber: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category
            </label>
            <select
              disabled={readOnly}
              value={stall.category}
              onChange={(e) => onUpdateStall(stall.id, { category: e.target.value as StallCategory })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            >
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
              <option value="CORNER">Corner</option>
              <option value="ISLAND">Island Suite</option>
            </select>
          </div>

          {/* Dimensions & Push Row Controls */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Dimensions & Row Reflow
              </span>
            </div>

            {/* Keep Flush / Push Adjacent Stalls Toggle */}
            <div className="flex items-center justify-between p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={singlePushNeighbors}
                  onChange={(e) => setSinglePushNeighbors(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-bold text-blue-900">
                  Push / Pull Row (No Gaps)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Width (m)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  step="0.5"
                  min="1"
                  value={widthMeters}
                  onChange={(e) => {
                    const wm = Math.max(1, Number(e.target.value));
                    const newW = wm * pxPerMeter;
                    const newAreaSqFt = Math.round(wm * depthMeters * 10.764);
                    onUpdateStall(
                      stall.id,
                      { width: newW, areaSqFt: newAreaSqFt },
                      { pushNeighbors: singlePushNeighbors }
                    );
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Depth (m)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  step="0.5"
                  min="1"
                  value={depthMeters}
                  onChange={(e) => {
                    const dm = Math.max(1, Number(e.target.value));
                    const newH = dm * pxPerMeter;
                    const newAreaSqFt = Math.round(widthMeters * dm * 10.764);
                    onUpdateStall(
                      stall.id,
                      { height: newH, areaSqFt: newAreaSqFt },
                      { pushNeighbors: singlePushNeighbors }
                    );
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
            </div>

            {/* Quick Row Expand & Shrink (Push / Pull Row) */}
            <div className="space-y-1 pt-1 border-t border-slate-200/80">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Row Width Nudge
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={readOnly || widthMeters <= 1}
                  onClick={() => {
                    const newW = Math.max(20, stall.width - 10);
                    const newWm = newW / pxPerMeter;
                    const newAreaSqFt = Math.round(newWm * depthMeters * 10.764);
                    onUpdateStall(
                      stall.id,
                      { width: newW, areaSqFt: newAreaSqFt },
                      { pushNeighbors: singlePushNeighbors }
                    );
                  }}
                  className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Shrink stall width by 0.5m and pull row neighbors closer (0 gap)"
                >
                  <Minimize2 className="w-3 h-3 text-rose-600" />
                  <span>−0.5m (Pull Row)</span>
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    const newW = stall.width + 10;
                    const newWm = newW / pxPerMeter;
                    const newAreaSqFt = Math.round(newWm * depthMeters * 10.764);
                    onUpdateStall(
                      stall.id,
                      { width: newW, areaSqFt: newAreaSqFt },
                      { pushNeighbors: singlePushNeighbors }
                    );
                  }}
                  className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Expand stall width by 0.5m and push row neighbors right (0 gap)"
                >
                  <Maximize2 className="w-3 h-3 text-emerald-600" />
                  <span>+0.5m (Push Row)</span>
                </button>
              </div>
            </div>

            {/* Area derivation pill */}
            <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500 font-medium">Calculated Area</span>
              <span className="font-mono font-bold text-slate-800">
                {areaSqMeters} Sq.m ({stall.areaSqFt} Sq.ft)
              </span>
            </div>
          </div>

          {/* Rental Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rental Price (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                disabled={readOnly}
                step="1000"
                min="0"
                value={stall.price}
                onChange={(e) => onUpdateStall(stall.id, { price: Math.max(0, Number(e.target.value)) })}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Booking Availability Status
            </label>
            <select
              disabled={readOnly}
              value={stall.status}
              onChange={(e) => onUpdateStall(stall.id, { status: e.target.value as StallStatus })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            >
              <option value="AVAILABLE">Available for Public Booking</option>
              <option value="BLOCKED">Blocked / Reserved by Admin</option>
              <option value="BOOKED_CONFIRMED">Booked Confirmed</option>
            </select>
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
                    disabled={readOnly}
                    onClick={() => onUpdateStall(stall.id, { rotation: deg })}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      (stall.rotation || 0) === deg
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono">
              <div>X: {Math.round(stall.xPosition)}px</div>
              <div>Y: {Math.round(stall.yPosition)}px</div>
            </div>
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onDuplicateSelected(1)}
                className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate Next Stall
              </button>
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
              <button
                onClick={onDeleteSelected}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Hall
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector (])"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
                <input
                  type="number"
                  disabled={readOnly}
                  step="1"
                  min="10"
                  value={widthMeters}
                  onChange={(e) => onUpdateHall(hall.id, { width: Math.max(10, Number(e.target.value)) * pxPerMeter })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Height (m)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  step="1"
                  min="10"
                  value={heightMeters}
                  onChange={(e) => onUpdateHall(hall.id, { height: Math.max(10, Number(e.target.value)) * pxPerMeter })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </details>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Usable Hall Surface Area</span>
            <p className="text-base font-extrabold text-blue-700 font-mono">
              {totalAreaSqMeters.toLocaleString()} Sq.m ({Math.round(totalAreaSqMeters * 10.764).toLocaleString()} Sq.ft)
            </p>
          </div>

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
              <button
                onClick={onDeleteSelected}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector (])"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
                <input
                  type="number"
                  disabled={readOnly}
                  step="0.5"
                  min="0.5"
                  value={Number((fac.width / pxPerMeter).toFixed(1))}
                  onChange={(e) => {
                    const m = Math.max(0.5, Number(e.target.value));
                    onUpdateFacility(fac.id, { width: Math.round(m * pxPerMeter) });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Depth / Height (m)
                </label>
                <input
                  type="number"
                  disabled={readOnly}
                  step="0.5"
                  min="0.5"
                  value={Number((fac.height / pxPerMeter).toFixed(1))}
                  onChange={(e) => {
                    const m = Math.max(0.5, Number(e.target.value));
                    onUpdateFacility(fac.id, { height: Math.round(m * pxPerMeter) });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>
            </div>
          </div>

          {/* Quick Size Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Size Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '3×2m', w: 3, h: 2 },
                { label: '4×3m', w: 4, h: 3 },
                { label: '6×4m', w: 6, h: 4 },
                { label: '8×4m', w: 8, h: 4 },
                { label: '10×6m', w: 10, h: 6 },
                { label: '12×8m', w: 12, h: 8 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    onUpdateFacility(fac.id, {
                      width: p.w * pxPerMeter,
                      height: p.h * pxPerMeter,
                    })
                  }
                  className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded transition-colors text-center cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Resize Nudges */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Size Nudge
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={readOnly || fac.width <= pxPerMeter}
                onClick={() =>
                  onUpdateFacility(fac.id, {
                    width: Math.max(pxPerMeter, fac.width - pxPerMeter),
                  })
                }
                className="py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>−1m Width</span>
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onUpdateFacility(fac.id, {
                    width: fac.width + pxPerMeter,
                  })
                }
                className="py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>+1m Width</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                disabled={readOnly || fac.height <= pxPerMeter}
                onClick={() =>
                  onUpdateFacility(fac.id, {
                    height: Math.max(pxPerMeter, fac.height - pxPerMeter),
                  })
                }
                className="py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>−1m Depth</span>
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onUpdateFacility(fac.id, {
                    height: fac.height + pxPerMeter,
                  })
                }
                className="py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>+1m Depth</span>
              </button>
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
              <button
                onClick={onDeleteSelected}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector (])"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Font Size (px)
            </label>
            <input
              type="number"
              disabled={readOnly}
              min="8"
              max="48"
              value={ann.fontSize || 12}
              onChange={(e) => onUpdateAnnotation(ann.id, { fontSize: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
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
          <button
            onClick={onToggleCollapse}
            title="Collapse Inspector (])"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Total Valuation Card */}
        <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
            Total Inventory Valuation
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
            Spatial Components
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-medium">Halls / Pavilions</span>
              <span className="text-base font-bold text-slate-800 font-mono">{halls.length}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-medium">Total Stalls</span>
              <span className="text-base font-bold text-slate-800 font-mono">{stalls.length}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-medium">Facilities & Gates</span>
              <span className="text-base font-bold text-slate-800 font-mono">{facilities.length}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-medium">Canvas Dimension</span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {Math.round(canvasWidth / pxPerMeter)}m × {Math.round(canvasHeight / pxPerMeter)}m
              </span>
            </div>
          </div>
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
