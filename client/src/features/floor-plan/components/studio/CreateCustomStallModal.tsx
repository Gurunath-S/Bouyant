import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Square, Check, Sliders, ArrowRight } from 'lucide-react';
import { StallCategory } from '../../../../types';
import { DraftStallItem } from '../../../../types/floorPlanStudio';

interface CreateCustomStallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStall: (stall: DraftStallItem) => void;
  existingStallsCount: number;
  nextSuggestedNumber: string;
}

const PRESET_DIMENSIONS = [
  { label: '3×3m', widthMeters: 3, depthMeters: 3, desc: 'Standard Booth (9 sq.m / 97 sq.ft)', category: 'STANDARD' as StallCategory },
  { label: '4×3m', widthMeters: 4, depthMeters: 3, desc: 'Expanded Booth (12 sq.m / 129 sq.ft)', category: 'STANDARD' as StallCategory },
  { label: '6×3m', widthMeters: 6, depthMeters: 3, desc: 'Double-Wide Frontage (18 sq.m / 194 sq.ft)', category: 'PREMIUM' as StallCategory },
  { label: '6×6m', widthMeters: 6, depthMeters: 6, desc: 'Quad Island Pavilion (36 sq.m / 388 sq.ft)', category: 'ISLAND' as StallCategory },
  { label: '2×2m', widthMeters: 2, depthMeters: 2, desc: 'Compact Kiosk (4 sq.m / 43 sq.ft)', category: 'STANDARD' as StallCategory },
];

export const CreateCustomStallModal: React.FC<CreateCustomStallModalProps> = ({
  isOpen,
  onClose,
  onCreateStall,
  existingStallsCount: _existingStallsCount,
  nextSuggestedNumber,
}) => {
  const [widthMeters, setWidthMeters] = useState<number>(3);
  const [depthMeters, setDepthMeters] = useState<number>(3);
  const [widthFeet, setWidthFeet] = useState<number>(9.8);
  const [depthFeet, setDepthFeet] = useState<number>(9.8);
  const [stallNumber, setStallNumber] = useState<string>(nextSuggestedNumber);
  const [customLabel, setCustomLabel] = useState<string>('3×3m');
  const [category, setCategory] = useState<StallCategory>('STANDARD');
  const [unit, setUnit] = useState<'m' | 'ft'>('m');
  const [price, setPrice] = useState<number>(50000);
  const [autoNameDimension, setAutoNameDimension] = useState<boolean>(true);

  if (!isOpen) return null;

  // Conversion: 20 pixels = 1 meter
  const pxPerMeter = 20;

  // Live calculations
  const effectiveWidthMeters = unit === 'm' ? widthMeters : Number((widthFeet / 3.28084).toFixed(2));
  const effectiveDepthMeters = unit === 'm' ? depthMeters : Number((depthFeet / 3.28084).toFixed(2));
  const areaSqMeters = Number((effectiveWidthMeters * effectiveDepthMeters).toFixed(1));
  const areaSqFt = Math.round(areaSqMeters * 10.764);

  const handleApplyPreset = (preset: typeof PRESET_DIMENSIONS[0]) => {
    setUnit('m');
    setWidthMeters(preset.widthMeters);
    setDepthMeters(preset.depthMeters);
    setWidthFeet(Number((preset.widthMeters * 3.28084).toFixed(1)));
    setDepthFeet(Number((preset.depthMeters * 3.28084).toFixed(1)));
    setCategory(preset.category);
    if (autoNameDimension) {
      setCustomLabel(preset.label);
    }
    // Set baseline price estimate based on area
    const basePrice = Math.round(preset.widthMeters * preset.depthMeters * 5500);
    setPrice(basePrice);
  };

  const handleUnitToggle = (newUnit: 'm' | 'ft') => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === 'ft') {
      const wFt = Number((widthMeters * 3.28084).toFixed(1));
      const dFt = Number((depthMeters * 3.28084).toFixed(1));
      setWidthFeet(wFt);
      setDepthFeet(dFt);
      if (autoNameDimension) {
        setCustomLabel(`${wFt}×${dFt}ft`);
      }
    } else {
      const wM = Number((widthFeet / 3.28084).toFixed(1));
      const dM = Number((depthFeet / 3.28084).toFixed(1));
      setWidthMeters(wM);
      setDepthMeters(dM);
      if (autoNameDimension) {
        setCustomLabel(`${wM}×${dM}m`);
      }
    }
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(0.5, val);
    if (unit === 'm') {
      setWidthMeters(w);
      const wFt = Number((w * 3.28084).toFixed(1));
      setWidthFeet(wFt);
      if (autoNameDimension) {
        setCustomLabel(`${w}×${depthMeters}m`);
      }
    } else {
      setWidthFeet(w);
      const wM = Number((w / 3.28084).toFixed(2));
      setWidthMeters(wM);
      if (autoNameDimension) {
        setCustomLabel(`${w}×${depthFeet}ft`);
      }
    }
  };

  const handleDepthChange = (val: number) => {
    const d = Math.max(0.5, val);
    if (unit === 'm') {
      setDepthMeters(d);
      const dFt = Number((d * 3.28084).toFixed(1));
      setDepthFeet(dFt);
      if (autoNameDimension) {
        setCustomLabel(`${widthMeters}×${d}m`);
      }
    } else {
      setDepthFeet(d);
      const dM = Number((d / 3.28084).toFixed(2));
      setDepthMeters(dM);
      if (autoNameDimension) {
        setCustomLabel(`${widthFeet}×${d}ft`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const widthPx = Math.round(effectiveWidthMeters * pxPerMeter);
    const heightPx = Math.round(effectiveDepthMeters * pxPerMeter);

    const newStall: DraftStallItem = {
      id: `stall-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stallNumber: stallNumber.trim() || nextSuggestedNumber,
      name: customLabel.trim() || `${effectiveWidthMeters}×${effectiveDepthMeters}`,
      category,
      price: Number(price) || 50000,
      areaSqFt,
      width: Math.max(20, widthPx),
      height: Math.max(20, heightPx),
      xPosition: 120,
      yPosition: 120,
      status: 'AVAILABLE',
    };

    onCreateStall(newStall);
    onClose();
  };

  // Preview styling matching upgraded palette
  const getCategoryTheme = (cat: StallCategory) => {
    switch (cat) {
      case 'PREMIUM':
        return { fill: '#ecfdf5', stroke: '#059669', text: '#065f46', badge: 'bg-emerald-100 text-emerald-800' };
      case 'CORNER':
        return { fill: '#fffbeb', stroke: '#d97706', text: '#92400e', badge: 'bg-amber-100 text-amber-900' };
      case 'ISLAND':
        return { fill: '#f5f3ff', stroke: '#7c3aed', text: '#5b21b6', badge: 'bg-purple-100 text-purple-900' };
      case 'STANDARD':
      default:
        return { fill: '#f0f7ff', stroke: '#2563eb', text: '#1e3a8a', badge: 'bg-blue-100 text-blue-900' };
    }
  };

  const theme = getCategoryTheme(category);

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0 w-screen h-screen bg-transparent" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Square className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Add Custom Sized Stall
              </h2>
              <p className="text-xs text-slate-500">
                Configure custom stall dimensions, booth category, and pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
          {/* Quick Dimension Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Standard Industry Presets
              </span>
              <span className="text-[11px] font-semibold text-blue-600">Quick 1-Click Sizes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DIMENSIONS.map((p) => {
                const isActive = widthMeters === p.widthMeters && depthMeters === p.depthMeters && unit === 'm';
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{p.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Physical Footprint on Floor Plan */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Physical Booth Dimensions (Canvas Footprint)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Controls the real geometric width and depth drawn on the floor plan map.
                </p>
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('m')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    unit === 'm' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Meters (m)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('ft')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    unit === 'ft' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Feet (ft)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Frontage Width ({unit})
                </label>
                <input
                  type="number"
                  step={unit === 'm' ? '0.5' : '1'}
                  min="0.5"
                  value={unit === 'm' ? widthMeters : widthFeet}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {unit === 'm' ? `≈ ${(widthMeters * 3.28084).toFixed(1)} ft` : `≈ ${(widthFeet / 3.28084).toFixed(1)} m`}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Depth / Length ({unit})
                </label>
                <input
                  type="number"
                  step={unit === 'm' ? '0.5' : '1'}
                  min="0.5"
                  value={unit === 'm' ? depthMeters : depthFeet}
                  onChange={(e) => handleDepthChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {unit === 'm' ? `≈ ${(depthMeters * 3.28084).toFixed(1)} ft` : `≈ ${(depthFeet / 3.28084).toFixed(1)} m`}
                </span>
              </div>
            </div>

            {/* Calculated Footprint Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-semibold text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Footprint: <strong className="text-slate-800">{effectiveWidthMeters}m × {effectiveDepthMeters}m</strong> ({areaSqMeters} sq.m / {areaSqFt} sq.ft)
              </span>
              <span className="text-slate-400 font-mono text-[10px]">Canvas: {Math.round(effectiveWidthMeters * pxPerMeter)}px × {Math.round(effectiveDepthMeters * pxPerMeter)}px</span>
            </div>
          </div>

          {/* Section 2: Stall Identification & Display Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stall Identifier / Code
              </label>
              <input
                type="text"
                value={stallNumber}
                onChange={(e) => setStallNumber(e.target.value.toUpperCase())}
                placeholder="e.g. S-01, B-12"
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Unique stall number on this floor plan
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Booth Display Label (On Map)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoNameDimension;
                    setAutoNameDimension(next);
                    if (next) {
                      setCustomLabel(unit === 'm' ? `${widthMeters}×${depthMeters}m` : `${widthFeet}×${depthFeet}ft`);
                    }
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    autoNameDimension
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={autoNameDimension ? 'Dimensions automatically format label' : 'Click to auto-sync with dimensions'}
                >
                  {autoNameDimension ? '✓ Auto-Sync' : 'Custom'}
                </button>
              </div>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => {
                  setAutoNameDimension(false);
                  setCustomLabel(e.target.value);
                }}
                placeholder="e.g. 3×3m, 10×10ft, VIP Pavilion"
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Visual text printed on booth (doesn't alter physical canvas size)
              </span>
            </div>
          </div>

          {/* Category & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stall Category / Placement
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StallCategory)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="STANDARD">Standard Shell Scheme</option>
                <option value="PREMIUM">Premium Frontage</option>
                <option value="CORNER">Dual Open Corner</option>
                <option value="ISLAND">Island Suite (4-Side Open)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rental Price (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Live Stall Visual Preview */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              Visual Preview on Floor Plan
            </span>
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-slate-200 shadow-inner">
              <div
                style={{
                  backgroundColor: theme.fill,
                  borderColor: theme.stroke,
                  color: theme.text,
                  width: `${Math.max(70, Math.min(180, effectiveWidthMeters * 24))}px`,
                  height: `${Math.max(50, Math.min(130, effectiveDepthMeters * 24))}px`,
                }}
                className="border-2 rounded-lg flex flex-col items-center justify-center shadow-xs transition-all relative select-none"
              >
                <span className="font-mono font-extrabold text-xs tracking-tight">
                  {stallNumber || 'S-01'}
                </span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">
                  {customLabel || `${effectiveWidthMeters}×${effectiveDepthMeters}m`}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>Add Stall to Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
