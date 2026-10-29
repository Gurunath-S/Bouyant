import React, { useState } from 'react';
import {
  MousePointer,
  BoxSelect,
  Hand,
  Square,
  LayoutGrid,
  Maximize2,
  DoorOpen,
  DoorClosed,
  ClipboardList,
  Utensils,
  Coffee,
  Mic,
  Bath,
  Sliders,
  Type,
  Building,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckSquare,
} from 'lucide-react';
import { StudioTool, FacilityType } from '../../../../types/floorPlanStudio';
import { Tooltip } from '../../../../components/ui/Tooltip';

interface CanvasToolboxProps {
  activeTool: StudioTool;
  onSelectTool: (tool: StudioTool) => void;
  onAddHall: () => void;
  onAddStall: () => void;
  onOpenCustomStallModal?: () => void;
  onOpenStallRowModal: () => void;
  onAddFacility: (type: FacilityType) => void;
  onAddZone: () => void;
  onAddText: () => void;
  onApplyTemplate?: (templateId: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMultiSelectMode?: boolean;
  onToggleMultiSelectMode?: () => void;
}

export const CanvasToolbox: React.FC<CanvasToolboxProps> = ({
  activeTool,
  onSelectTool,
  onAddHall,
  onAddStall,
  onOpenCustomStallModal,
  onOpenStallRowModal,
  onAddFacility,
  onAddZone,
  onAddText,
  onZoomIn,
  onZoomOut,
  onResetZoom: _onResetZoom,
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse,
  isMultiSelectMode = false,
  onToggleMultiSelectMode,
}) => {
  const [showFacilitiesMenu, setShowFacilitiesMenu] = useState(false);

  // Compact / Collapsed Icon-Only Strip Mode (w-14)
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-2 shrink-0 select-none shadow-xs z-20 transition-all">
        {onToggleCollapse && (
          <Tooltip content="Expand Toolbox" shortcut="[" description="Open the full tools drawer" position="right">
            <button
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors mb-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Navigation */}
        <Tooltip content="Select & Move Tool" shortcut="V" description="Click item or drag box to select multiple items" position="right">
          <button
            onClick={() => {
              if (isMultiSelectMode && onToggleMultiSelectMode) onToggleMultiSelectMode();
              onSelectTool('select');
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              (activeTool === 'select' || activeTool === 'marquee') && !isMultiSelectMode
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>
        </Tooltip>

        {onToggleMultiSelectMode && (
          <Tooltip content="Multi-Select Pick Mode" shortcut="M" description="Click any stalls anywhere to toggle selection" position="right">
            <button
              onClick={onToggleMultiSelectMode}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        <Tooltip content="Pan Canvas" shortcut="H" description="Drag anywhere or hold Space to move the map" position="right">
          <button
            onClick={() => onSelectTool('pan')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Quick Common Zoom Controls (Available across all tools) */}
        {(onZoomIn || onZoomOut) && (
          <>
            <div className="w-8 h-px bg-slate-200 my-0.5" />
            {onZoomIn && (
              <Tooltip content="Zoom In" shortcut="+" description="Increase view magnification" position="right">
                <button
                  onClick={onZoomIn}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4 text-blue-600" />
                </button>
              </Tooltip>
            )}
            {onZoomOut && (
              <Tooltip content="Zoom Out" shortcut="-" description="Decrease view magnification" position="right">
                <button
                  onClick={onZoomOut}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4 text-blue-600" />
                </button>
              </Tooltip>
            )}
          </>
        )}

        <div className="w-8 h-px bg-slate-200 my-1" />

        {/* Structures */}
        {!readOnly && (
          <>
            <Tooltip content="Add Hall / Pavilion" description="Create a hall container with drag-resizing" position="right">
              <button
                onClick={onAddHall}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-blue-600" />
              </button>
            </Tooltip>
            <Tooltip content="Add Single Stall" description="Quick 1-click spawn standard 3×3m booth" position="right">
              <button
                onClick={onAddStall}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 text-emerald-600" />
              </button>
            </Tooltip>
            {onOpenCustomStallModal && (
              <Tooltip content="Custom Size Stall" description="Configure custom width, height, and label" position="right">
                <button
                  onClick={onOpenCustomStallModal}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-blue-600" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Stall Row Wizard" description="Bulk place aligned stall rows and blocks" position="right">
              <button
                onClick={onOpenStallRowModal}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Add Text Label" description="Place text label, pillar sign, or marker on floor" position="right">
              <button
                onClick={onAddText}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
              >
                <Type className="w-4 h-4 text-purple-600" />
              </button>
            </Tooltip>
            <Tooltip content="Add Special Zone" description="Create VIP lounge, media zone, or custom area" position="right">
              <button
                onClick={onAddZone}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 transition-colors cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-purple-600" />
              </button>
            </Tooltip>

            <div className="w-8 h-px bg-slate-200 my-1" />

            {/* Facilities */}
            <Tooltip content="Main Entrance" description="Place main visitor entrance gate" position="right">
              <button
                onClick={() => onAddFacility('entrance')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <DoorOpen className="w-4 h-4 text-emerald-600" />
              </button>
            </Tooltip>
            <Tooltip content="Keynote Stage" description="Place keynote stage / presentation platform" position="right">
              <button
                onClick={() => onAddFacility('stage')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4 text-purple-600" />
              </button>
            </Tooltip>
            <Tooltip content="Food Court" description="Place dining & food court plaza" position="right">
              <button
                onClick={() => onAddFacility('food-court')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Utensils className="w-4 h-4 text-amber-600" />
              </button>
            </Tooltip>
            <Tooltip content="Restrooms" description="Place restroom facility markers" position="right">
              <button
                onClick={() => onAddFacility('restroom')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Bath className="w-4 h-4 text-sky-600" />
              </button>
            </Tooltip>
          </>
        )}
      </aside>
    );
  }

  // Read-only minimal strip
  if (readOnly) {
    return (
      <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 shrink-0 select-none shadow-xs z-20">
        <Tooltip content="Pointer / Select" shortcut="V" description="Select items to inspect details" position="right">
          <button
            onClick={() => onSelectTool('select')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip content="Pan Canvas" shortcut="H" description="Drag to pan around the floor plan" position="right">
          <button
            onClick={() => onSelectTool('pan')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
        </Tooltip>
      </aside>
    );
  }

  // Full Expanded Toolbox (w-64)
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20 transition-all">
      {/* Toolbox Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-blue-600" /> Design Tools
        </span>

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Tooltip content="Collapse Toolbox" shortcut="[" description="Collapse panel into compact icon strip" position="left">
              <button
                onClick={onToggleCollapse}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Navigation Tools */}
      <div className="p-3 border-b border-slate-100 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Selection Tools
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Tooltip content="Select & Move Tool" shortcut="V" description="Click item or drag box to select multiple items" position="top">
            <button
              onClick={() => {
                if (isMultiSelectMode && onToggleMultiSelectMode) onToggleMultiSelectMode();
                onSelectTool('select');
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                (activeTool === 'select' || activeTool === 'marquee') && !isMultiSelectMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <MousePointer className="w-3.5 h-3.5" />
              </div>
              <span>Select (V)</span>
            </button>
          </Tooltip>
          {onToggleMultiSelectMode ? (
            <Tooltip content="Multi-Select Pick Mode" shortcut="M" description="Click stalls anywhere to toggle selection" position="top">
              <button
                onClick={onToggleMultiSelectMode}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  isMultiSelectMode
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Multi-Select (M)</span>
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Box Select" shortcut="M" description="Drag box across canvas to select stalls" position="top">
              <button
                onClick={() => onSelectTool('marquee')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  activeTool === 'marquee'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BoxSelect className="w-3.5 h-3.5" />
                <span>Box Select</span>
              </button>
            </Tooltip>
          )}
          <Tooltip content="Pan Canvas" shortcut="H" description="Drag canvas or hold Space to move the map" position="top">
            <button
              onClick={() => onSelectTool('pan')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTool === 'pan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan Canvas (H)</span>
            </button>
          </Tooltip>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
          {isMultiSelectMode
            ? 'Multi-Select Active: Click stalls anywhere to add or remove them from selection.'
            : 'Click stall to select, or drag empty canvas to select multiple.'}
        </p>

        {/* Common Zoom Controls across all tools */}
        {(onZoomIn || onZoomOut) && (
          <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-slate-100">
            {onZoomIn && (
              <Tooltip content="Zoom In" shortcut="+" description="Increase view magnification" position="top">
                <button
                  onClick={onZoomIn}
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" /> Zoom In (+)
                </button>
              </Tooltip>
            )}
            {onZoomOut && (
              <Tooltip content="Zoom Out" shortcut="-" description="Decrease view magnification" position="top">
                <button
                  onClick={onZoomOut}
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-blue-600" /> Zoom Out (-)
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Structure Tools */}
      <div className="p-3 border-b border-slate-100 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Halls, Stalls & Labels
        </div>

        <Tooltip content="Add Hall / Pavilion" description="Create a hall container with freehand drag-resizing" position="right">
          <button
            onClick={onAddHall}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50/60 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" /> + Add Hall / Zone
            </span>
            <span className="text-[10px] text-blue-600 font-bold">Hall A, B</span>
          </button>
        </Tooltip>

        <Tooltip content="Add Single Stall" description="Quick 1-click spawn standard 3×3m booth" position="right">
          <button
            onClick={onAddStall}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Square className="w-3.5 h-3.5 text-emerald-600" /> + Add Stall (3×3m)
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">3×3m</span>
          </button>
        </Tooltip>

        {onOpenCustomStallModal && (
          <Tooltip content="Custom Size Stall" description="Create stall with custom width, height, and label" position="right">
            <button
              onClick={onOpenCustomStallModal}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50/60 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-600" /> + Custom Size Stall
              </span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">3×3, 6×3...</span>
            </button>
          </Tooltip>
        )}

        <Tooltip content="Stall Row Wizard" description="Bulk place aligned stall rows and blocks with auto-numbering" position="right">
          <button
            onClick={onOpenStallRowModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5" /> + Add Stall Row
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">
              Fast Row
            </span>
          </button>
        </Tooltip>

        <Tooltip content="Add Text Label" description="Place text label, pillar sign, or marker on floor" position="right">
          <button
            onClick={onAddText}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100/90 border border-purple-200 hover:border-purple-300 transition-all shadow-2xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-purple-600" /> + Add Text Label
            </span>
            <span className="text-[10px] text-purple-700 font-bold bg-white border border-purple-200 px-1.5 py-0.5 rounded">
              Text / Sign
            </span>
          </button>
        </Tooltip>

        <Tooltip content="Add Special Zone" description="Create VIP lounge, media zone, or custom area" position="right">
          <button
            onClick={onAddZone}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-purple-700 border border-slate-200 hover:border-purple-300 transition-all shadow-2xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-purple-600" /> + Special Area (VIP / Stage)
            </span>
            <span className="text-[10px] text-slate-400">VIP / Media</span>
          </button>
        </Tooltip>
      </div>

      {/* Facilities & Amenities */}
      <div className="p-3 border-b border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Amenities & Entry Gates
          </span>
          <button
            onClick={() => setShowFacilitiesMenu(!showFacilitiesMenu)}
            className="text-[10px] font-bold text-blue-600 cursor-pointer"
            title={showFacilitiesMenu ? 'Collapse amenities list' : 'Expand full amenities list'}
          >
            {showFacilitiesMenu ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip content="Main Entrance" description="Place main visitor entrance gate marker" position="top">
            <button
              onClick={() => onAddFacility('entrance')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <DoorOpen className="w-3 h-3 text-emerald-600" /> Main Entry
            </button>
          </Tooltip>
          <Tooltip content="Emergency Exit" description="Place emergency exit door marker" position="top">
            <button
              onClick={() => onAddFacility('exit')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <DoorClosed className="w-3 h-3 text-rose-600" /> Emergency Exit
            </button>
          </Tooltip>
          <Tooltip content="Registration Desk" description="Place attendee check-in and badges desk" position="top">
            <button
              onClick={() => onAddFacility('registration')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <ClipboardList className="w-3 h-3 text-blue-600" /> Registration
            </button>
          </Tooltip>
          <Tooltip content="Keynote Stage" description="Place presentation stage or podium platform" position="top">
            <button
              onClick={() => onAddFacility('stage')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <Mic className="w-3 h-3 text-purple-600" /> Keynote Stage
            </button>
          </Tooltip>
        </div>

        {showFacilitiesMenu && (
          <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in">
            <Tooltip content="Food Court" description="Place food court plaza and stalls" position="top">
              <button
                onClick={() => onAddFacility('food-court')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Utensils className="w-3 h-3 text-amber-600" /> Food Court
              </button>
            </Tooltip>
            <Tooltip content="Dining / Café" description="Place dining seating and coffee bar" position="top">
              <button
                onClick={() => onAddFacility('dining')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Coffee className="w-3 h-3 text-amber-700" /> Dining / Café
              </button>
            </Tooltip>
            <Tooltip content="Restrooms" description="Place public restroom facilities" position="top">
              <button
                onClick={() => onAddFacility('restroom')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Bath className="w-3 h-3 text-sky-600" /> Restroom
              </button>
            </Tooltip>
            <Tooltip content="Shutter Gate" description="Place security / delivery shutter gate" position="top">
              <button
                onClick={() => onAddFacility('shutter')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Sliders className="w-3 h-3 text-slate-600" /> Shutter Gate
              </button>
            </Tooltip>
          </div>
        )}
      </div>

    </aside>
  );
};
