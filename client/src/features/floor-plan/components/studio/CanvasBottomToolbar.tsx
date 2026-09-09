import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Grid,
  Magnet,
  Undo2,
  Redo2,
  Expand,
} from 'lucide-react';

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
}) => {
  return (
    <footer className="h-12 bg-white border-t border-slate-200 px-4 flex items-center justify-between select-none shadow-xs z-20 shrink-0">
      {/* Left: History & Snap Controls */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-700 rounded transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Shift+Ctrl+Z)"
            className="p-1.5 text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-700 rounded transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Grid Toggle */}
        <button
          onClick={onToggleGrid}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
            showGrid
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="Toggle Grid Lines"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Grid {showGrid ? 'ON' : 'OFF'}</span>
        </button>

        {/* Snap Toggle & Interval */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSnap}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-l-lg border transition-colors ${
              snapToGrid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title="Toggle Snap to Grid (Aligns objects cleanly)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap {snapToGrid ? 'ON' : 'OFF'}</span>
          </button>

          {snapToGrid && (
            <select
              value={snapInterval}
              onChange={(e) => onChangeSnapInterval(Number(e.target.value))}
              className="text-xs font-mono font-bold bg-emerald-50/50 border border-l-0 border-emerald-300 text-emerald-800 py-1 px-2 rounded-r-lg focus:outline-hidden"
              title="Snap Interval Increment in Meters"
            >
              <option value="0.5">0.5 m</option>
              <option value="1">1.0 m</option>
              <option value="2">2.0 m</option>
            </select>
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
            <button
              onClick={onExpandCanvas}
              type="button"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition-colors cursor-pointer text-[11px]"
              title="Expand Canvas Area (+600px width, +400px height for boundless layout)"
            >
              <Expand className="w-3 h-3" />
              <span>Canvas: {canvasWidth}×{canvasHeight}px (+ Expand)</span>
            </button>
          </>
        )}
      </div>

      {/* Right: Zoom Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onZoomChange(Math.max(25, zoomLevel - 15))}
            className="p-1 text-slate-600 hover:text-slate-900 rounded"
            title="Zoom Out (Down to 25% for high-level floor view)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-800 px-2 min-w-[50px] text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(200, zoomLevel + 15))}
            className="p-1 text-slate-600 hover:text-slate-900 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoomChange(100)}
            className="p-1 text-slate-500 hover:text-slate-900 rounded ml-0.5"
            title="Reset to 100%"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={onFitToScreen}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
          title="Fit Floor Plan to Screen"
        >
          <Maximize className="w-3.5 h-3.5" /> Fit
        </button>
      </div>
    </footer>
  );
};
