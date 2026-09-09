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
  Sparkles,
  ChevronDown,
  Building,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { StudioTool, FacilityType } from '../../../../types/floorPlanStudio';
import { STARTER_TEMPLATES } from '../../../../data/floorPlanTemplates';

interface CanvasToolboxProps {
  activeTool: StudioTool;
  onSelectTool: (tool: StudioTool) => void;
  onAddHall: () => void;
  onAddStall: () => void;
  onOpenStallRowModal: () => void;
  onAddFacility: (type: FacilityType) => void;
  onAddZone: () => void;
  onAddText: () => void;
  onApplyTemplate: (templateId: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CanvasToolbox: React.FC<CanvasToolboxProps> = ({
  activeTool,
  onSelectTool,
  onAddHall,
  onAddStall,
  onOpenStallRowModal,
  onAddFacility,
  onAddZone,
  onAddText,
  onApplyTemplate,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showFacilitiesMenu, setShowFacilitiesMenu] = useState(false);

  // Compact / Collapsed Icon-Only Strip Mode (w-14)
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-2 shrink-0 select-none shadow-xs z-20 transition-all">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Expand Toolbox Panel ([)"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors mb-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Navigation */}
        <button
          onClick={() => onSelectTool('select')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            activeTool === 'select' || activeTool === 'marquee'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Select & Drag Box (V) — Click item or drag box to select"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectTool('pan')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            activeTool === 'pan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Move Map / Pan (H) — Drag anywhere to move canvas"
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Quick Common Zoom Controls (Available across all tools) */}
        {(onZoomIn || onZoomOut) && (
          <>
            <div className="w-8 h-px bg-slate-200 my-0.5" />
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4 text-blue-600" />
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4 text-blue-600" />
              </button>
            )}
          </>
        )}

        <div className="w-8 h-px bg-slate-200 my-1" />

        {/* Structures */}
        {!readOnly && (
          <>
            <button
              onClick={onAddHall}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors"
              title="+ Hall / Pavilion Container"
            >
              <Maximize2 className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={onAddStall}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 transition-colors"
              title="+ Single Stall (3×3m)"
            >
              <Square className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={onOpenStallRowModal}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
              title="+ Stall Row Wizard (Bulk Placement)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={onAddZone}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 transition-colors"
              title="+ Custom Zone (VIP / Media)"
            >
              <Sliders className="w-4 h-4 text-purple-600" />
            </button>

            <div className="w-8 h-px bg-slate-200 my-1" />

            {/* Facilities */}
            <button
              onClick={() => onAddFacility('entrance')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="+ Main Entrance"
            >
              <DoorOpen className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={() => onAddFacility('stage')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="+ Keynote Stage"
            >
              <Mic className="w-4 h-4 text-purple-600" />
            </button>
            <button
              onClick={() => onAddFacility('food-court')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="+ Food Court Plaza"
            >
              <Utensils className="w-4 h-4 text-amber-600" />
            </button>
            <button
              onClick={() => onAddFacility('restroom')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="+ Restrooms"
            >
              <Bath className="w-4 h-4 text-sky-600" />
            </button>

            <div className="w-8 h-px bg-slate-200 my-1" />

            <button
              onClick={onAddText}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="+ Text Label"
            >
              <Type className="w-4 h-4 text-slate-600" />
            </button>
          </>
        )}
      </aside>
    );
  }

  // Read-only minimal strip
  if (readOnly) {
    return (
      <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 shrink-0 select-none shadow-xs z-20">
        <button
          onClick={() => onSelectTool('select')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Pointer / Select"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectTool('pan')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
            activeTool === 'pan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Pan Canvas (Space / Hand)"
        >
          <Hand className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // Full Expanded Toolbox (w-64)
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none shadow-xs overflow-y-auto z-20 transition-all">
      {/* Toolbox Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-blue-600" /> Studio Tools
        </span>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-500" /> Templates <ChevronDown className="w-3 h-3" />
            </button>

            {showTemplatesMenu && (
              <div className="absolute top-8 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-100 mb-1">
                  Apply Starter Layout
                </div>
                {STARTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Apply "${tmpl.name}"? This will replace your current unsaved studio objects.`
                        )
                      ) {
                        onApplyTemplate(tmpl.id);
                        setShowTemplatesMenu(false);
                      }
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50/80 transition-colors group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {tmpl.name}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">
                      {tmpl.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse Toolbox ([)"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tools */}
      <div className="p-3 border-b border-slate-100 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Navigation & Selection Tools
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onSelectTool('select')}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeTool === 'select' || activeTool === 'marquee'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            title="Single Select, Move, or Drag-Select Box (V)"
          >
            <div className="flex items-center gap-1">
              <MousePointer className="w-3.5 h-3.5" />
              <BoxSelect className="w-3 h-3 opacity-80" />
            </div>
            <span>Select & Box (V)</span>
          </button>
          <button
            onClick={() => onSelectTool('pan')}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            title="Pan / Move Canvas (H)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Move Map (H)</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
          Drag empty canvas to marquee-select stalls & items. Use wheel / trackpad to move around map.
        </p>

        {/* Common Zoom Controls across all tools */}
        {(onZoomIn || onZoomOut) && (
          <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-slate-100">
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                type="button"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5 text-blue-600" /> Zoom In (+)
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                type="button"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5 text-blue-600" /> Zoom Out (-)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Structure Tools */}
      <div className="p-3 border-b border-slate-100 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Spatial Structures
        </div>

        <button
          onClick={onAddHall}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50/60 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs"
          title="+ Add Hall / Pavilion (e.g. Hall A, Hall B) with freehand drag-resizing"
        >
          <span className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" /> + Hall / Pavilion
          </span>
          <span className="text-[10px] text-blue-600 font-bold">Hall A, B</span>
        </button>

        <button
          onClick={onAddStall}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Square className="w-3.5 h-3.5 text-emerald-600" /> + Single Stall
          </span>
          <span className="text-[10px] text-slate-400">3×3m</span>
        </button>

        <button
          onClick={onOpenStallRowModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all"
        >
          <span className="flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" /> + Stall Row (Bulk)
          </span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">
            Fast Row
          </span>
        </button>

        <button
          onClick={onAddZone}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-purple-700 border border-slate-200 hover:border-purple-300 transition-all shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-purple-600" /> + Custom Zone / Area
          </span>
          <span className="text-[10px] text-slate-400">VIP / Media</span>
        </button>
      </div>

      {/* Facilities & Amenities */}
      <div className="p-3 border-b border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Facilities & Amenities
          </span>
          <button
            onClick={() => setShowFacilitiesMenu(!showFacilitiesMenu)}
            className="text-[10px] font-bold text-blue-600"
          >
            {showFacilitiesMenu ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onAddFacility('entrance')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <DoorOpen className="w-3 h-3 text-emerald-600" /> Main Entry
          </button>
          <button
            onClick={() => onAddFacility('exit')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <DoorClosed className="w-3 h-3 text-rose-600" /> Emergency Exit
          </button>
          <button
            onClick={() => onAddFacility('registration')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <ClipboardList className="w-3 h-3 text-blue-600" /> Registration
          </button>
          <button
            onClick={() => onAddFacility('stage')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <Mic className="w-3 h-3 text-purple-600" /> Keynote Stage
          </button>
        </div>

        {showFacilitiesMenu && (
          <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in">
            <button
              onClick={() => onAddFacility('food-court')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Utensils className="w-3 h-3 text-amber-600" /> Food Court
            </button>
            <button
              onClick={() => onAddFacility('dining')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Coffee className="w-3 h-3 text-amber-700" /> Dining / Café
            </button>
            <button
              onClick={() => onAddFacility('restroom')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Bath className="w-3 h-3 text-sky-600" /> Restroom
            </button>
            <button
              onClick={() => onAddFacility('shutter')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Sliders className="w-3 h-3 text-slate-600" /> Shutter Gate
            </button>
          </div>
        )}
      </div>

      {/* Annotations */}
      <div className="p-3 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Annotations & Labels
        </div>
        <button
          onClick={onAddText}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-slate-600" /> + Text Label
          </span>
          <span className="text-[10px] text-slate-400">Notice</span>
        </button>
      </div>
    </aside>
  );
};
