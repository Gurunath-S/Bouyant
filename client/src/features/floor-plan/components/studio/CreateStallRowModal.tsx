import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, Check, ArrowRight, ArrowDown, Sparkles } from 'lucide-react';
import { StallCategory } from '../../../../types';
import { DraftStallItem } from '../../../../types/floorPlanStudio';

interface CreateStallRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateRow: (stalls: DraftStallItem[]) => void;
  canvasWidth: number;
  canvasHeight: number;
  existingStallsCount?: number;
  nextSuggestedNumber?: string;
}

type SizePreset = '3x3' | '4x3' | '6x3' | '6x6' | '2x2' | 'custom';
type DimensionUnit = 'm' | 'ft';

export const CreateStallRowModal: React.FC<CreateStallRowModalProps> = ({
  isOpen,
  onClose,
  onGenerateRow,
  canvasWidth,
  canvasHeight,
  existingStallsCount = 0,
  nextSuggestedNumber,
}) => {
  // Dimension & Preset State
  const [selectedPreset, setSelectedPreset] = useState<SizePreset>('3x3');
  const [unit, setUnit] = useState<DimensionUnit>('m');
  const [widthMeters, setWidthMeters] = useState<number>(3);
  const [depthMeters, setDepthMeters] = useState<number>(3);
  const [widthFeet, setWidthFeet] = useState<number>(9.8);
  const [depthFeet, setDepthFeet] = useState<number>(9.8);

  // Row Generation Config
  const [prefix, setPrefix] = useState<string>('A');
  const [startNum, setStartNum] = useState<number>(1);
  const [count, setCount] = useState<number>(10);
  const [gapMeters, setGapMeters] = useState<number>(0.5);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [category, setCategory] = useState<StallCategory>('STANDARD');
  const [price, setPrice] = useState<number>(50000);
  const [customLabel, setCustomLabel] = useState<string>('3×3');

  // Initialize suggestions on open
  useEffect(() => {
    if (!isOpen) return;

    if (nextSuggestedNumber) {
      const parts = nextSuggestedNumber.split('-');
      if (parts.length === 2 && isNaN(Number(parts[0]))) {
        setPrefix(parts[0]);
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) setStartNum(num);
      } else {
        const num = parseInt(nextSuggestedNumber.replace(/\D/g, ''), 10);
        if (!isNaN(num)) setStartNum(num);
      }
    } else if (existingStallsCount > 0) {
      setStartNum(existingStallsCount + 1);
    }
  }, [isOpen, nextSuggestedNumber, existingStallsCount]);

  if (!isOpen) return null;

  // Preset Handler
  const applyPreset = (preset: SizePreset) => {
    setSelectedPreset(preset);
    let w = 3;
    let d = 3;
    let label = '3×3';

    switch (preset) {
      case '3x3':
        w = 3; d = 3; label = '3×3'; break;
      case '4x3':
        w = 4; d = 3; label = '4×3'; break;
      case '6x3':
        w = 6; d = 3; label = '6×3'; break;
      case '6x6':
        w = 6; d = 6; label = '6×6'; break;
      case '2x2':
        w = 2; d = 2; label = '2×2'; break;
      case 'custom':
        return;
    }

    setWidthMeters(w);
    setDepthMeters(d);
    setWidthFeet(Number((w * 3.28084).toFixed(1)));
    setDepthFeet(Number((d * 3.28084).toFixed(1)));
    setCustomLabel(label);
  };

  // Unit Toggle Handler
  const handleUnitToggle = (newUnit: DimensionUnit) => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === 'ft') {
      setWidthFeet(Number((widthMeters * 3.28084).toFixed(1)));
      setDepthFeet(Number((depthMeters * 3.28084).toFixed(1)));
    } else {
      setWidthMeters(Number((widthFeet / 3.28084).toFixed(1)));
      setDepthMeters(Number((depthFeet / 3.28084).toFixed(1)));
    }
  };

  // Dimensions in Meters for internal CAD scale
  const effectiveWidthMeters = unit === 'm' ? widthMeters : Number((widthFeet / 3.28084).toFixed(2));
  const effectiveDepthMeters = unit === 'm' ? depthMeters : Number((depthFeet / 3.28084).toFixed(2));

  // CAD Grid conversion: 1 meter = 20 pixels
  const pxPerMeter = 20;
  const stallWidthPx = Math.round(effectiveWidthMeters * pxPerMeter);
  const stallHeightPx = Math.round(effectiveDepthMeters * pxPerMeter);
  const gapPx = Math.round(gapMeters * pxPerMeter);

  const areaSqMeters = Number((effectiveWidthMeters * effectiveDepthMeters).toFixed(1));
  const areaSqFt = Math.round(areaSqMeters * 10.7639);

  const totalSpanMeters = Number(
    (
      direction === 'horizontal'
        ? count * effectiveWidthMeters + (count - 1) * gapMeters
        : count * effectiveDepthMeters + (count - 1) * gapMeters
    ).toFixed(1)
  );

  const totalSpanFeet = Math.round(totalSpanMeters * 3.28084);

  // Category Theme Colors matching high-contrast architectural CAD palette
  const getCategoryTheme = (cat: StallCategory) => {
    switch (cat) {
      case 'PREMIUM':
        return {
          fill: '#ecfdf5',
          stroke: '#059669',
          text: '#064e3b',
          accent: '#10b981',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'CORNER':
        return {
          fill: '#fffbeb',
          stroke: '#d97706',
          text: '#78350f',
          accent: '#f59e0b',
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'ISLAND':
        return {
          fill: '#faf5ff',
          stroke: '#7c3aed',
          text: '#4c1d95',
          accent: '#8b5cf6',
          badge: 'bg-purple-100 text-purple-900 border-purple-300',
        };
      case 'STANDARD':
      default:
        return {
          fill: '#f0f7ff',
          stroke: '#2563eb',
          text: '#1e3a8a',
          accent: '#3b82f6',
          badge: 'bg-blue-100 text-blue-900 border-blue-300',
        };
    }
  };

  const theme = getCategoryTheme(category);

  const handleCreate = () => {
    // Center the row nicely on canvas
    const rowSpanPx =
      direction === 'horizontal'
        ? count * stallWidthPx + (count - 1) * gapPx
        : count * stallHeightPx + (count - 1) * gapPx;

    const startX = Math.max(
      60,
      Math.min(
        canvasWidth - 120,
        Math.round((canvasWidth - (direction === 'horizontal' ? rowSpanPx : stallWidthPx)) / 2)
      )
    );
    const startY = Math.max(
      80,
      Math.min(
        canvasHeight - 120,
        Math.round((canvasHeight - (direction === 'vertical' ? rowSpanPx : stallHeightPx)) / 2)
      )
    );

    const newStalls: DraftStallItem[] = [];
    const dimensionLabelToSave = customLabel.trim() || `${effectiveWidthMeters}×${effectiveDepthMeters}`;

    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const numStr = num < 10 ? `0${num}` : `${num}`;
      const stallNumber = prefix ? `${prefix}-${numStr}` : `${numStr}`;

      const x = direction === 'horizontal' ? startX + i * (stallWidthPx + gapPx) : startX;
      const y = direction === 'vertical' ? startY + i * (stallHeightPx + gapPx) : startY;

      newStalls.push({
        id: `stall-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        stallNumber,
        name: dimensionLabelToSave, // Dimension mark rendered directly on canvas
        category,
        price: Number(price) || 50000,
        areaSqFt,
        width: stallWidthPx,
        height: stallHeightPx,
        xPosition: Math.round(x),
        yPosition: Math.round(y),
        status: 'AVAILABLE',
      });
    }

    onGenerateRow(newStalls);
    onClose();
  };

  // Generate preview items (show up to 4 stalls)
  const previewCount = Math.min(count, 4);
  const previewStalls = Array.from({ length: previewCount }).map((_, i) => {
    const num = startNum + i;
    const numStr = num < 10 ? `0${num}` : `${num}`;
    return {
      stallNumber: prefix ? `${prefix}-${numStr}` : `${numStr}`,
      dimLabel: customLabel.trim() || `${effectiveWidthMeters}×${effectiveDepthMeters}m`,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shadow-xs">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Add Stall Row</h3>
              <p className="text-xs text-blue-100">
                Quickly generate a row or column of stalls with custom dimensions and pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800">
          {/* Section 1: Standard Industry Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Standard Industry Presets
              </label>
              <span className="text-[11px] font-semibold text-blue-600">Quick 1-Click Sizes</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(
                [
                  { id: '3x3', title: '3×3m', desc: 'Standard' },
                  { id: '4x3', title: '4×3m', desc: 'Expanded' },
                  { id: '6x3', title: '6×3m', desc: 'Frontage' },
                  { id: '6x6', title: '6×6m', desc: 'Pavilion' },
                  { id: '2x2', title: '2×2m', desc: 'Kiosk' },
                ] as const
              ).map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`px-2.5 py-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{p.title}</div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Dimension Inputs with Unit Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Exact Dimensions</span>
                {selectedPreset === 'custom' && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                    Custom
                  </span>
                )}
              </div>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('m')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    unit === 'm'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Meters (m)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('ft')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    unit === 'ft'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Feet (ft)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Width ({unit})
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={unit === 'm' ? widthMeters : widthFeet}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    const val = Math.max(0.5, Number(e.target.value));
                    if (unit === 'm') {
                      setWidthMeters(val);
                      setWidthFeet(Number((val * 3.28084).toFixed(1)));
                    } else {
                      setWidthFeet(val);
                      setWidthMeters(Number((val / 3.28084).toFixed(1)));
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Depth / Height ({unit})
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={unit === 'm' ? depthMeters : depthFeet}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    const val = Math.max(0.5, Number(e.target.value));
                    if (unit === 'm') {
                      setDepthMeters(val);
                      setDepthFeet(Number((val * 3.28084).toFixed(1)));
                    } else {
                      setDepthFeet(val);
                      setDepthMeters(Number((val / 3.28084).toFixed(1)));
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Aisle Gap ({unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={gapMeters}
                  onChange={(e) => setGapMeters(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
              <span>
                Single stall area:{' '}
                <strong className="text-slate-800 font-bold">{areaSqMeters} sq.m</strong> ({areaSqFt} sq.ft)
              </span>
              <span>
                Total row span:{' '}
                <strong className="text-slate-800 font-bold">{totalSpanMeters} m</strong> ({totalSpanFeet} ft)
              </span>
            </div>
          </div>

          {/* Section 3: Row Numbering & Custom Dimension Marking */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="A"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">e.g. A, B, VIP</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start No.</label>
              <input
                type="number"
                min="1"
                value={startNum}
                onChange={(e) => setStartNum(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Starts {prefix ? `${prefix}-01` : '01'}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stall Count</label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Total stalls in row</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dimension Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={`${effectiveWidthMeters}×${effectiveDepthMeters}`}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Rendered under ID</span>
            </div>
          </div>

          {/* Section 4: Direction, Category & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Orientation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Row Alignment</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirection('horizontal')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all flex items-center justify-center gap-1 ${
                    direction === 'horizontal'
                      ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Horiz →
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('vertical')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all flex items-center justify-center gap-1 ${
                    direction === 'vertical'
                      ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" /> Vert ↓
                </button>
              </div>
            </div>

            {/* Stall Category with Color Theme */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Theme</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StallCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold bg-white"
              >
                <option value="STANDARD">Standard (Blue Scheme)</option>
                <option value="PREMIUM">Premium (Emerald Scheme)</option>
                <option value="CORNER">Corner (Amber Scheme)</option>
                <option value="ISLAND">Island Suite (Purple Scheme)</option>
              </select>
            </div>

            {/* Rental Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price per Stall (₹)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-6 pr-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Live SVG Visual Row Preview */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Live Row Preview on Floor Plan
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {count} stalls • ₹{(count * price).toLocaleString()} Total
              </span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200/80 p-3 overflow-x-auto flex items-center justify-center min-h-[90px]">
              <div
                className={`flex gap-2 items-center ${
                  direction === 'vertical' ? 'flex-col' : 'flex-row'
                }`}
              >
                {previewStalls.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: theme.fill,
                      borderColor: theme.stroke,
                      color: theme.text,
                    }}
                    className="relative flex flex-col items-center justify-center border-2 rounded-md shadow-xs text-center transition-all px-3 py-2 min-w-[62px] min-h-[52px]"
                  >
                    {/* Top Accent Strip */}
                    <div
                      style={{ backgroundColor: theme.accent }}
                      className="absolute top-0.5 left-1 right-1 h-1 rounded-xs"
                    />
                    <div className="font-extrabold text-[12px] leading-tight pt-1">
                      {s.stallNumber}
                    </div>
                    <div className="text-[9px] font-semibold opacity-80 leading-none">
                      {s.dimLabel}
                    </div>
                  </div>
                ))}
                {count > previewCount && (
                  <div className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
                    <span>···</span>
                    <span className="text-[10px]">+{count - previewCount} more</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Generating: <strong className="text-slate-800">{prefix ? `${prefix}-${startNum < 10 ? '0' + startNum : startNum}` : startNum}</strong> to{' '}
            <strong className="text-slate-800">
              {prefix
                ? `${prefix}-${startNum + count - 1 < 10 ? '0' + (startNum + count - 1) : startNum + count - 1}`
                : startNum + count - 1}
            </strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" /> Place {count} Stalls on Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
