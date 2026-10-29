import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Focus,
  Grid,
  Magnet,
  Undo2,
  Redo2,
  Expand,
  Shrink,
  Layers,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { Tooltip } from '../../../../components/ui/Tooltip';

interface CanvasBottomToolbarProps {
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  snapInterval: number;
  onChangeSnapInterval: (val: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  stallsCount: number;
  hallsCount: number;
  canvasWidth?: number;
  canvasHeight?: number;
  onExpandCanvas?: () => void;
  canReduceCanvas?: boolean;
  onReduceCanvas?: () => void;
  hasBlueprint?: boolean;
  showBlueprint?: boolean;
  onToggleBlueprint?: () => void;
  isBlueprintInspectMode?: boolean;
  onToggleInspectMode?: () => void;
  isMultiSelectMode?: boolean;
  onToggleMultiSelectMode?: () => void;
}

export const CanvasBottomToolbar: React.FC<CanvasBottomToolbarProps> = ({
  zoomLevel,
  onZoomChange,
  onFitToScreen,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  snapInterval,
  onChangeSnapInterval,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  stallsCount,
  hallsCount,
  canvasWidth,
  canvasHeight,
  onExpandCanvas,
  canReduceCanvas = false,
  onReduceCanvas,
  hasBlueprint,
  showBlueprint = true,
  onToggleBlueprint,
  isBlueprintInspectMode = false,
  onToggleInspectMode,
  isMultiSelectMode = false,
  onToggleMultiSelectMode,
}) => {
  return (
    <footer className="h-12 bg-white border-t border-slate-200 px-4 flex items-center justify-between select-none shadow-xs z-20 shrink-0">
      {/* Left: History & Snap Controls */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Tooltip content="Undo" shortcut="Ctrl+Z" description="Revert last floor plan change" position="top">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-700 rounded transition-colors cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Redo" shortcut="Ctrl+Y" description="Reapply reverted floor plan change" position="top">
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-700 rounded transition-colors cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Blueprint Comparison Toggle (Shown when a blueprint is added) */}
        {hasBlueprint && onToggleBlueprint && (
          <Tooltip content="Blueprint Overlay" shortcut="B" description="Toggle blueprint comparison in exact position" position="top">
            <button
              onClick={onToggleBlueprint}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                showBlueprint
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Blueprint {showBlueprint ? 'ON' : 'OFF'}</span>
            </button>
          </Tooltip>
        )}

        {/* Blueprint X-Ray Inspect Mode (100% sharp blueprint + translucent stalls) */}
        {hasBlueprint && onToggleInspectMode && (
          <Tooltip content="X-Ray Inspection" shortcut="X" description="View transparent stalls over blueprint to check alignment" position="top">
            <button
              onClick={onToggleInspectMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isBlueprintInspectMode
                  ? 'bg-purple-600 border-purple-700 text-white shadow-xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>X-Ray {isBlueprintInspectMode ? 'ON' : 'OFF'}</span>
            </button>
          </Tooltip>
        )}

        {/* Multi-Select Random Pick Mode */}
        {onToggleMultiSelectMode && (
          <Tooltip content="Multi-Select Mode" shortcut="M" description="Click stalls anywhere to add or remove from selection" position="top">
            <button
              onClick={onToggleMultiSelectMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-purple-600 border-purple-700 text-white shadow-xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Multi-Pick {isMultiSelectMode ? 'ON' : 'OFF'}</span>
            </button>
          </Tooltip>
        )}

        {/* Grid Toggle */}
        <Tooltip content="Canvas Grid" description="Toggle background alignment grid lines" position="top">
          <button
            onClick={onToggleGrid}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              showGrid
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid {showGrid ? 'ON' : 'OFF'}</span>
          </button>
        </Tooltip>

        {/* Snap Toggle & Interval */}
        <div className="flex items-center gap-1">
          <Tooltip content="Snap to Grid" description="Align objects cleanly to grid increments" position="top">
            <button
              onClick={onToggleSnap}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-l-lg border transition-colors cursor-pointer ${
                snapToGrid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>Snap {snapToGrid ? 'ON' : 'OFF'}</span>
            </button>
          </Tooltip>

          {snapToGrid && (
            <Tooltip content="Snap Interval" description="Grid step size in meters" position="top">
              <select
                value={snapInterval}
                onChange={(e) => onChangeSnapInterval(Number(e.target.value))}
                className="text-xs font-mono font-bold bg-emerald-50/50 border border-l-0 border-emerald-300 text-emerald-800 py-1 px-2 rounded-r-lg focus:outline-hidden cursor-pointer"
              >
                <option value="0.5">0.5 m</option>
                <option value="1">1.0 m</option>
                <option value="2">2.0 m</option>
              </select>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Center: Live Overview Pill & Expand Canvas */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 font-medium">
        <span>
          <strong className="text-slate-900">{hallsCount}</strong> {hallsCount === 1 ? 'Hall' : 'Halls'}
        </span>
        <span>•</span>
        <span>
          <strong className="text-slate-900">{stallsCount}</strong> Stalls
        </span>
        {onExpandCanvas && canvasWidth && canvasHeight && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Tooltip content="Expand Canvas Area" description="+600px width, +400px height for larger layout space" position="top">
                <button
                  onClick={onExpandCanvas}
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition-colors cursor-pointer text-[11px]"
                >
                  <Expand className="w-3 h-3" />
                  <span>Canvas: {canvasWidth}×{canvasHeight}px (+ Expand)</span>
                </button>
              </Tooltip>
              {canReduceCanvas && onReduceCanvas && (
                <Tooltip content="Reduce Canvas Area" description="-600px width, -400px height" position="top">
                  <button
                    onClick={onReduceCanvas}
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold border border-amber-200 transition-colors cursor-pointer text-[11px]"
                  >
                    <Shrink className="w-3 h-3" />
                    <span>− Reduce</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Zoom Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Tooltip content="Zoom Out" shortcut="-" description="Decrease view magnification" position="top">
            <button
              onClick={() => onZoomChange(Math.max(25, zoomLevel - 15))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Reset Zoom" shortcut="Ctrl+0" description="Reset magnification to 100%" position="top">
            <button
              onClick={() => onZoomChange(100)}
              className="text-xs font-mono font-bold text-slate-800 px-2 min-w-[50px] text-center hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
            >
              {zoomLevel}%
            </button>
          </Tooltip>
          <Tooltip content="Zoom In" shortcut="+" description="Increase view magnification" position="top">
            <button
              onClick={() => onZoomChange(Math.min(200, zoomLevel + 15))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Reset to 100%" shortcut="Ctrl+0" description="Restore 100% standard zoom" position="top">
            <button
              onClick={() => onZoomChange(100)}
              className="p-1 text-slate-500 hover:text-slate-900 rounded ml-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>

        <Tooltip content="Fit to Screen" shortcut="F" description="Scale and center entire floor plan in window" position="top">
          <button
            onClick={onFitToScreen}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5 text-slate-600" /> Fit
          </button>
        </Tooltip>
      </div>
    </footer>
  );
};
