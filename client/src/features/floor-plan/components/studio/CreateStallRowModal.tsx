import React, { useState } from 'react';
import { X, LayoutGrid, ArrowRight, Check } from 'lucide-react';
import { StallCategory } from '../../../../types';
import { DraftStallItem } from '../../../../types/floorPlanStudio';

interface CreateStallRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateRow: (stalls: DraftStallItem[]) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const CreateStallRowModal: React.FC<CreateStallRowModalProps> = ({
  isOpen,
  onClose,
  onGenerateRow,
  canvasWidth,
  canvasHeight,
}) => {
  const [prefix, setPrefix] = useState('A');
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(10);
  const [widthMeters, setWidthMeters] = useState(3);
  const [depthMeters, setDepthMeters] = useState(3);
  const [gapMeters, setGapMeters] = useState(1);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [category, setCategory] = useState<StallCategory>('STANDARD');
  const [price, setPrice] = useState(50000);

  if (!isOpen) return null;

  // Grid conversion: 1 meter = 20 pixels
  const pxPerMeter = 20;
  const stallWidthPx = widthMeters * pxPerMeter;
  const stallHeightPx = depthMeters * pxPerMeter;
  const gapPx = gapMeters * pxPerMeter;
  const areaSqMeters = widthMeters * depthMeters;
  const areaSqFt = Math.round(areaSqMeters * 10.764);

  const totalSpanMeters =
    direction === 'horizontal'
      ? count * widthMeters + (count - 1) * gapMeters
      : count * depthMeters + (count - 1) * gapMeters;

  const handleCreate = () => {
    // Center the row by default or place nicely on canvas
    const startX = Math.max(60, Math.min(canvasWidth - 100, Math.round((canvasWidth - (direction === 'horizontal' ? count * (stallWidthPx + gapPx) : stallWidthPx)) / 2)));
    const startY = Math.max(80, Math.min(canvasHeight - 100, Math.round((canvasHeight - (direction === 'vertical' ? count * (stallHeightPx + gapPx) : stallHeightPx)) / 2)));

    const newStalls: DraftStallItem[] = [];

    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const numStr = num < 10 ? `0${num}` : `${num}`;
      const stallNumber = prefix ? `${prefix}-${numStr}` : `${numStr}`;

      const x = direction === 'horizontal' ? startX + i * (stallWidthPx + gapPx) : startX;
      const y = direction === 'vertical' ? startY + i * (stallHeightPx + gapPx) : startY;

      newStalls.push({
        id: `stall-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        stallNumber,
        name: `Stall ${stallNumber}`,
        category,
        price,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Create Stall Row (Bulk Placement)</h3>
              <p className="text-xs text-emerald-100">
                Rapidly generate an entire aligned row or column of numbered stalls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-4">
          {/* Row 1: Prefix & Numbering */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="A"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">e.g. A, B, VIP</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Number
              </label>
              <input
                type="number"
                min="1"
                value={startNum}
                onChange={(e) => setStartNum(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">e.g. 1 (starts A-01)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stall Count
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">e.g. 10 or 20</span>
            </div>
          </div>

          {/* Row 2: Dimensions & Gap */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Width (Meters)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={widthMeters}
                onChange={(e) => setWidthMeters(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">e.g. 3m</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Depth (Meters)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={depthMeters}
                onChange={(e) => setDepthMeters(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">e.g. 3m</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aisle Gap (m)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={gapMeters}
                onChange={(e) => setGapMeters(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Between stalls</span>
            </div>
          </div>

          {/* Row 3: Direction & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Placement Alignment
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('horizontal')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    direction === 'horizontal'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Horizontal Row →
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('vertical')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    direction === 'vertical'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Vertical Col ↓
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StallCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="CORNER">Corner</option>
                <option value="ISLAND">Island Suite</option>
              </select>
            </div>
          </div>

          {/* Row 4: Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rental Price per Stall (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="1000"
                min="0"
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Summary Preview Pill */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>
                Generated: {prefix ? `${prefix}-01` : '01'} to {prefix ? `${prefix}-${count < 10 ? '0' + count : count}` : count}
              </span>
              <span>{count} Stalls</span>
            </div>
            <div className="text-[11px] text-emerald-700">
              Each: {widthMeters}×{depthMeters}m ({areaSqMeters} Sq.m / {areaSqFt} Sq.ft) • Total row span: {totalSpanMeters}m • Total Valuation: ₹{(count * price).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" /> Place {count} Stalls on Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
