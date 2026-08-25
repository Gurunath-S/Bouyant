import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  Layers,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Building,
  Maximize2,
  Calendar,
  MapPin,
  Sparkles,
  Check,
} from 'lucide-react';

export interface DraftStall {
  id: string;
  stallNumber: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  areaSqFt: number;
  category: 'STANDARD' | 'PREMIUM' | 'CORNER' | 'ISLAND';
  price: number;
  status: 'AVAILABLE' | 'BLOCKED';
}

export const AdminExhibitionBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Event Information
  const [basicInfo, setBasicInfo] = useState({
    title: 'India Industrial & Automation Expo 2026',
    slug: 'india-industrial-expo-2026',
    description: 'Premier trade fair for industrial machinery, robotics automation, IoT sensors, and smart manufacturing technologies.',
    startDate: '2026-11-10',
    endDate: '2026-11-14',
    venue: 'Bombay Exhibition Centre (BEC)',
    address: 'NSE Nesco Complex, Off Western Express Hwy, Goregaon East',
    city: 'Mumbai',
    state: 'Maharashtra',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED',
  });

  // Step 2: Hall Configuration
  const [hallConfig, setHallConfig] = useState({
    hallName: 'Grand Pavilion Hall 1',
    widthFt: 100,
    heightFt: 80,
  });

  // Derived Usable Area
  const totalUsableArea = hallConfig.widthFt * hallConfig.heightFt;

  // Step 3: Visual Floor Plan Stalls
  const [stalls, setStalls] = useState<DraftStall[]>([
    { id: '1', stallNumber: 'A-01', xPosition: 70, yPosition: 100, width: 80, height: 80, areaSqFt: 100, category: 'STANDARD', price: 1200, status: 'AVAILABLE' },
    { id: '2', stallNumber: 'A-02', xPosition: 170, yPosition: 100, width: 80, height: 80, areaSqFt: 100, category: 'STANDARD', price: 1200, status: 'AVAILABLE' },
    { id: '3', stallNumber: 'A-03', xPosition: 270, yPosition: 100, width: 80, height: 80, areaSqFt: 100, category: 'PREMIUM', price: 1800, status: 'AVAILABLE' },
    { id: '4', stallNumber: 'A-04', xPosition: 370, yPosition: 100, width: 80, height: 80, areaSqFt: 100, category: 'PREMIUM', price: 1800, status: 'AVAILABLE' },

    { id: '5', stallNumber: 'B-01', xPosition: 70, yPosition: 220, width: 80, height: 80, areaSqFt: 100, category: 'CORNER', price: 2000, status: 'AVAILABLE' },
    { id: '6', stallNumber: 'B-02', xPosition: 170, yPosition: 220, width: 80, height: 80, areaSqFt: 100, category: 'STANDARD', price: 1200, status: 'AVAILABLE' },
    { id: '7', stallNumber: 'B-03', xPosition: 270, yPosition: 220, width: 80, height: 80, areaSqFt: 100, category: 'STANDARD', price: 1200, status: 'AVAILABLE' },
    { id: '8', stallNumber: 'B-04', xPosition: 370, yPosition: 220, width: 80, height: 80, areaSqFt: 100, category: 'CORNER', price: 2000, status: 'AVAILABLE' },

    { id: '9', stallNumber: 'C-01', xPosition: 700, yPosition: 100, width: 140, height: 140, areaSqFt: 400, category: 'ISLAND', price: 4500, status: 'AVAILABLE' },
    { id: '10', stallNumber: 'VIP-1', xPosition: 700, yPosition: 300, width: 140, height: 100, areaSqFt: 250, category: 'PREMIUM', price: 3000, status: 'BLOCKED' },
  ]);

  const [selectedStallId, setSelectedStallId] = useState<string | null>('1');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Add Stall Helper
  const handleAddStall = () => {
    const nextNum = stalls.length + 1;
    const newStall: DraftStall = {
      id: Date.now().toString(),
      stallNumber: `S-${nextNum < 10 ? '0' + nextNum : nextNum}`,
      xPosition: 100 + (nextNum % 5) * 90,
      yPosition: 360 + Math.floor(nextNum / 5) * 90,
      width: 80,
      height: 80,
      areaSqFt: 100,
      category: 'STANDARD',
      price: 1200,
      status: 'AVAILABLE',
    };
    setStalls([...stalls, newStall]);
    setSelectedStallId(newStall.id);
  };

  const handleUpdateStall = (id: string, updates: Partial<DraftStall>) => {
    setStalls(
      stalls.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        if (updates.width !== undefined || updates.height !== undefined) {
          // Derive area
          updated.areaSqFt = Math.round((updated.width * updated.height) / 64) * 100;
        }
        return updated;
      })
    );
  };

  const handleDeleteStall = (id: string) => {
    setStalls(stalls.filter((s) => s.id !== id));
    if (selectedStallId === id) setSelectedStallId(null);
  };

  // Submit & Publish Exhibition
  const handlePublishExhibition = async () => {
    try {
      setIsSubmitting(true);
      // Format floor plan & stalls payload
      const payload = {
        ...basicInfo,
        totalStalls: stalls.length,
        floorPlans: [
          {
            name: hallConfig.hallName,
            width: hallConfig.widthFt,
            height: hallConfig.heightFt,
            stalls: stalls.map((s) => ({
              stallNumber: s.stallNumber,
              xPosition: s.xPosition,
              yPosition: s.yPosition,
              width: s.width,
              height: s.height,
              areaSqFt: s.areaSqFt,
              category: s.category,
              price: s.price,
              status: s.status,
            })),
          },
        ],
      };

      await exhibitionService.createExhibition(payload as any);
      navigate('/admin/events');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish exhibition event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStall = stalls.find((s) => s.id === selectedStallId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <button
              onClick={() => navigate('/admin/events')}
              className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibitions Console
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" /> Exhibition & Visual Floor Plan Studio
            </h1>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs font-bold text-slate-600 shadow-xs">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-purple-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            Basic Event Info
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-purple-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Hall Configuration
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-purple-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 3 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            Interactive Canvas Builder
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep === 4 ? 'text-purple-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep === 4 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
            Preview & Publish
          </div>
        </div>
      </div>

      {/* STEP 1: BASIC EVENT INFORMATION */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-600" /> Step 1: Exhibition Event Profile Details
            </h2>
            <p className="text-xs text-slate-500 mt-1">Configure event title, venue, dates, and cover visuals.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Exhibition Name"
                value={basicInfo.title}
                onChange={(e) =>
                  setBasicInfo({
                    ...basicInfo,
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
              />
              <Input
                label="URL Slug"
                value={basicInfo.slug}
                onChange={(e) => setBasicInfo({ ...basicInfo, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue Name"
                value={basicInfo.venue}
                onChange={(e) => setBasicInfo({ ...basicInfo, venue: e.target.value })}
              />
              <Input
                label="City"
                value={basicInfo.city}
                onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Venue Address"
                value={basicInfo.address}
                onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
              />
              <Input
                label="State"
                value={basicInfo.state}
                onChange={(e) => setBasicInfo({ ...basicInfo, state: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={basicInfo.startDate}
                onChange={(e) => setBasicInfo({ ...basicInfo, startDate: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={basicInfo.endDate}
                onChange={(e) => setBasicInfo({ ...basicInfo, endDate: e.target.value })}
              />
            </div>

            <Input
              label="Banner / Cover Image URL"
              value={basicInfo.bannerUrl}
              onChange={(e) => setBasicInfo({ ...basicInfo, bannerUrl: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exhibition Description</label>
              <textarea
                rows={3}
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" size="lg" onClick={() => setCurrentStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Continue to Hall Configuration
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: HALL CONFIGURATION */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-purple-600" /> Step 2: Exhibition Hall Physical Dimensions
            </h2>
            <p className="text-xs text-slate-500 mt-1">Define the hall boundary dimensions. Total usable floor area will be derived automatically.</p>
          </div>

          <div className="space-y-4 max-w-xl">
            <Input
              label="Hall Name / Identifier"
              value={hallConfig.hallName}
              onChange={(e) => setHallConfig({ ...hallConfig, hallName: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Hall Width (Feet)"
                type="number"
                value={hallConfig.widthFt}
                onChange={(e) => setHallConfig({ ...hallConfig, widthFt: Number(e.target.value) })}
              />
              <Input
                label="Hall Height / Length (Feet)"
                type="number"
                value={hallConfig.heightFt}
                onChange={(e) => setHallConfig({ ...hallConfig, heightFt: Number(e.target.value) })}
              />
            </div>

            {/* Derived Area Box */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
              <span className="text-xs font-bold text-purple-900 uppercase">Calculated Total Usable Floor Space</span>
              <p className="text-2xl font-extrabold text-purple-700 font-mono">
                {totalUsableArea.toLocaleString()} Sq.Ft ({hallConfig.widthFt} ft × {hallConfig.heightFt} ft)
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)}>
              Back to Basic Info
            </Button>
            <Button variant="primary" size="lg" onClick={() => setCurrentStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Visual Canvas Floor Plan Editor
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: INTERACTIVE VISUAL CANVAS BUILDER */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleAddStall} leftIcon={<Plus className="w-4 h-4" />}>
                Add Stall
              </Button>
              <span className="text-xs font-bold text-slate-500 ml-2">
                Total Stalls Configured: <span className="text-slate-900">{stalls.length}</span>
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-lg">
              <button onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))} className="p-1 text-slate-600 hover:bg-white rounded">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-800 px-2">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(160, zoomLevel + 15))} className="p-1 text-slate-600 hover:bg-white rounded">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoomLevel(100)} className="p-1 text-slate-600 hover:bg-white rounded ml-1">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas + Properties Drawer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Center Canvas (3 Spans) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs overflow-auto min-h-[550px] flex items-center justify-center bg-floor-grid">
              <div style={{ transform: `scale(${zoomLevel / 100})` }} className="origin-top-left transition-transform duration-150">
                <svg width="1000" height="600" viewBox="0 0 1000 600" className="select-none bg-white rounded-lg border border-slate-200 shadow-xs">
                  {/* Outer Hall Boundaries */}
                  <rect x="20" y="20" width="960" height="560" rx="12" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 6" />

                  {/* Main Entrance & Stage */}
                  <rect x="400" y="568" width="200" height="12" fill="#0f172a" rx="4" />
                  <text x="500" y="562" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">MAIN ENTRANCE</text>

                  <rect x="350" y="32" width="300" height="40" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" rx="6" />
                  <text x="500" y="56" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">KEYNOTE AUDITORIUM STAGE</text>

                  {/* Stalls Render */}
                  {stalls.map((s) => {
                    const isSelected = s.id === selectedStallId;
                    const isBlocked = s.status === 'BLOCKED';

                    return (
                      <g
                        key={s.id}
                        onClick={() => setSelectedStallId(s.id)}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <rect
                          x={s.xPosition}
                          y={s.yPosition}
                          width={s.width}
                          height={s.height}
                          rx="6"
                          fill={isSelected ? '#dbeafe' : isBlocked ? '#fef2f2' : '#ecfdf5'}
                          stroke={isSelected ? '#2563eb' : isBlocked ? '#f43f5e' : '#10b981'}
                          strokeWidth={isSelected ? 3 : 1.5}
                        />
                        <text
                          x={s.xPosition + s.width / 2}
                          y={s.yPosition + s.height / 2 - 4}
                          textAnchor="middle"
                          fill={isSelected ? '#1d4ed8' : isBlocked ? '#be123c' : '#047857'}
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {s.stallNumber}
                        </text>
                        <text
                          x={s.xPosition + s.width / 2}
                          y={s.yPosition + s.height / 2 + 12}
                          textAnchor="middle"
                          fill={isSelected ? '#1d4ed8' : isBlocked ? '#be123c' : '#047857'}
                          fontSize="9"
                          fontWeight="600"
                        >
                          ${s.price}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right Stall Properties Panel (1 Span) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-purple-700">
                Stall Properties
              </h3>

              {selectedStall ? (
                <div className="space-y-3">
                  <Input
                    label="Stall Number"
                    value={selectedStall.stallNumber}
                    onChange={(e) => handleUpdateStall(selectedStall.id, { stallNumber: e.target.value })}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="X Pos"
                      type="number"
                      value={selectedStall.xPosition}
                      onChange={(e) => handleUpdateStall(selectedStall.id, { xPosition: Number(e.target.value) })}
                    />
                    <Input
                      label="Y Pos"
                      type="number"
                      value={selectedStall.yPosition}
                      onChange={(e) => handleUpdateStall(selectedStall.id, { yPosition: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Width"
                      type="number"
                      value={selectedStall.width}
                      onChange={(e) => handleUpdateStall(selectedStall.id, { width: Number(e.target.value) })}
                    />
                    <Input
                      label="Height"
                      type="number"
                      value={selectedStall.height}
                      onChange={(e) => handleUpdateStall(selectedStall.id, { height: Number(e.target.value) })}
                    />
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Calculated Area</span>
                    <span className="font-extrabold text-slate-900 block">{selectedStall.areaSqFt} Sq.Ft</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Stall Category</label>
                    <select
                      value={selectedStall.category}
                      onChange={(e) => handleUpdateStall(selectedStall.id, { category: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="CORNER">CORNER</option>
                      <option value="ISLAND">ISLAND</option>
                    </select>
                  </div>

                  <Input
                    label="Stall Price ($ USD)"
                    type="number"
                    value={selectedStall.price}
                    onChange={(e) => handleUpdateStall(selectedStall.id, { price: Number(e.target.value) })}
                  />

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant={selectedStall.status === 'BLOCKED' ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => handleUpdateStall(selectedStall.id, { status: selectedStall.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED' })}
                      leftIcon={selectedStall.status === 'BLOCKED' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    >
                      {selectedStall.status === 'BLOCKED' ? 'Unblock Stall' : 'Block Stall'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteStall(selectedStall.id)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Remove Stall
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Click any stall on the visual canvas to configure properties.</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(2)}>
              Back to Hall Config
            </Button>
            <Button variant="primary" size="lg" onClick={() => setCurrentStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Proceed to Final Preview
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & PUBLISH */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" /> Step 4: Final Exhibition Read-Only Preview
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review event parameters and stall inventory before publishing to live production.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
              Back to Canvas Editor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-sm uppercase text-purple-700">Event Overview</h4>
                <p><span className="font-semibold text-slate-500">Title:</span> {basicInfo.title}</p>
                <p><span className="font-semibold text-slate-500">Venue:</span> {basicInfo.venue}, {basicInfo.city}</p>
                <p><span className="font-semibold text-slate-500">Dates:</span> {basicInfo.startDate} to {basicInfo.endDate}</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-sm uppercase text-purple-700">Hall Specifications</h4>
                <p><span className="font-semibold text-slate-500">Hall Name:</span> {hallConfig.hallName}</p>
                <p><span className="font-semibold text-slate-500">Dimensions:</span> {hallConfig.widthFt} ft × {hallConfig.heightFt} ft ({totalUsableArea.toLocaleString()} Sq.Ft)</p>
                <p><span className="font-semibold text-slate-500">Total Configured Stalls:</span> {stalls.length} Stalls</p>
              </div>
            </div>

            {/* Inventory Valuation Card */}
            <div className="p-6 bg-slate-900 text-white rounded-xl space-y-4 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm font-bold border-b border-slate-800 pb-2 uppercase text-purple-400">Inventory Valuation</h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Available Stalls:</span>
                    <span className="font-bold text-white">{stalls.filter((s) => s.status === 'AVAILABLE').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked Stalls:</span>
                    <span className="font-bold text-white">{stalls.filter((s) => s.status === 'BLOCKED').length}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-extrabold text-white">
                    <span>Total Potential Value:</span>
                    <span className="font-mono text-purple-400 text-lg">
                      ${stalls.reduce((sum, s) => sum + s.price, 0).toLocaleString()} USD
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handlePublishExhibition}
                isLoading={isSubmitting}
                rightIcon={<Check className="w-4 h-4" />}
              >
                Publish Exhibition & Save Layout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
