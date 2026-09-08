import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { floorPlanService } from '../../../services/floor-plans/floorPlanService';
import { GenericVisualStudio } from '../../floor-plan/components/studio/GenericVisualStudio';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { STARTER_TEMPLATES } from '../../../data/floorPlanTemplates';
import { Input } from '../../../components/ui/Input';
import { DateInput } from '../../../components/ui/DateInput';
import { MultiImagePicker } from '../../../components/ui/MultiImagePicker';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
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
  Check,
  Tag,
  Clock,
  Image as ImageIcon,
  Sparkles,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const isViewMode = location.pathname.endsWith('/view') || new URLSearchParams(location.search).get('mode') === 'view';
  const isEditMode = !!id && !isViewMode;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);

  // Step 1: Basic Event Information
  const [basicInfo, setBasicInfo] = useState({
    title: 'India Industrial & Automation Expo 2026',
    slug: 'india-industrial-expo-2026',
    category: 'Industrial & Automation',
    description: 'Premier trade fair for industrial machinery, robotics automation, IoT sensors, and smart manufacturing technologies.',
    startDate: '2026-11-10',
    endDate: '2026-11-14',
    venue: 'Bombay Exhibition Centre (BEC)',
    address: 'NSE Nesco Complex, Off Western Express Hwy, Goregaon East',
    city: 'Mumbai',
    state: 'Maharashtra',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'],
    latitude: 19.1551,
    longitude: 72.8553,
    status: 'PUBLISHED',
  });

  useEffect(() => {
    if (id) {
      loadEventData(id);
    }
  }, [id]);

  const loadEventData = async (eventId: string) => {
    try {
      setIsLoadingEvent(true);
      setLoadError(null);
      const data = await exhibitionService.getExhibitionBySlug(eventId);
      if (data) {
        setBasicInfo({
          title: data.title || '',
          slug: data.slug || '',
          category: 'Industrial & Automation',
          description: data.description || '',
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          venue: data.venue || '',
          address: data.venue || '',
          city: data.city || '',
          state: 'Maharashtra',
          bannerUrl: data.bannerUrl || '',
          images: data.bannerUrl ? [data.bannerUrl] : [],
          latitude: 19.1551,
          longitude: 72.8553,
          status: data.status || 'PUBLISHED',
        });

        if (data.floorPlans && data.floorPlans.length > 0) {
          const fp = data.floorPlans[0];
          setFloorPlanId(fp.id);
          setHallConfig({
            hallName: fp.name || 'Grand Pavilion Hall 1',
            widthFt: fp.width || 100,
            heightFt: fp.height || 80,
          });

          if (fp.backgroundUrl) {
            try {
              const parsed = JSON.parse(fp.backgroundUrl);
              setLayoutData(parsed);
            } catch (e) {
              console.warn('Could not parse layoutData JSON', e);
            }
          }

          if (fp.stalls && fp.stalls.length > 0) {
            setStalls(
              fp.stalls.map((s: any) => ({
                id: s.id,
                stallNumber: s.stallNumber,
                xPosition: s.xPosition,
                yPosition: s.yPosition,
                width: s.width,
                height: s.height,
                areaSqFt: s.areaSqFt,
                category: s.category,
                price: Number(s.price),
                status: s.status === 'BLOCKED' ? 'BLOCKED' : s.status,
              }))
            );
            setSelectedStallId(fp.stalls[0]?.id || null);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load exhibition details:', err);
      setLoadError(err.response?.data?.message || 'Failed to load event profile.');
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const calculateDurationDays = () => {
    if (!basicInfo.startDate || !basicInfo.endDate) return null;
    const s = new Date(basicInfo.startDate).getTime();
    const e = new Date(basicInfo.endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return null;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };
  const durationDays = calculateDurationDays();

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

  // Submit & Publish / Update Exhibition
  const handlePublishExhibition = async () => {
    try {
      setIsSubmitting(true);
      if (id) {
        // Updating existing event
        const updatePayload = {
          title: basicInfo.title,
          description: basicInfo.description,
          venue: basicInfo.venue,
          city: basicInfo.city,
          startDate: new Date(basicInfo.startDate).toISOString(),
          endDate: new Date(basicInfo.endDate).toISOString(),
          bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
          status: basicInfo.status,
          totalStalls: stalls.length,
        };
        await exhibitionService.updateExhibition(id, updatePayload);

        // Synchronize floor plan spatial layout & stalls
        if (floorPlanId) {
          await floorPlanService.syncFloorPlan(floorPlanId, {
            name: hallConfig.hallName,
            width: layoutData?.canvasWidth || 1400,
            height: layoutData?.canvasHeight || 850,
            layoutData,
            stalls: stalls.map((s) => ({
              id: s.id,
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
          });
        }
      } else {
        // Creating new event
        const payload = {
          title: basicInfo.title,
          description: basicInfo.description,
          venue: basicInfo.venue,
          city: basicInfo.city,
          startDate: new Date(basicInfo.startDate).toISOString(),
          endDate: new Date(basicInfo.endDate).toISOString(),
          bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
          status: basicInfo.status,
          totalStalls: stalls.length,
          floorPlans: [
            {
              name: hallConfig.hallName,
              width: layoutData?.canvasWidth || 1400,
              height: layoutData?.canvasHeight || 850,
              layoutData,
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
      }
      navigate('/admin/events');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save exhibition event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStall = stalls.find((s) => s.id === selectedStallId);

  return (
    <div className={`space-y-6 w-full transition-all ${currentStep === 3 ? 'max-w-none px-0' : 'max-w-6xl mx-auto'}`}>
      {/* Header & Stepper */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <button
              onClick={() => navigate('/admin/events')}
              className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibitions Console
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600" />
              {isViewMode
                ? `Exhibition Dossier & Studio — ${basicInfo.title}`
                : isEditMode
                ? `Edit Exhibition Event & Floor Plan — ${basicInfo.title}`
                : 'Exhibition & Visual Floor Plan Studio'}
            </h1>
          </div>

          {/* Quick Action Buttons in Header */}
          <div className="flex items-center gap-2">
            {id && isViewMode && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/admin/events/${id}/edit`)}
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Switch to Edit Mode
              </Button>
            )}

            {id && isEditMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/events/${id}/view`)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  View Mode
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublishExhibition}
                  isLoading={isSubmitting}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Mode Banner */}
        {id && isViewMode && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Viewing Mode:</strong> You are inspecting <strong>"{basicInfo.title}"</strong> in the full Studio interface. All 4 cards, interactive location map, and stalls are loaded below.
              </span>
            </div>
            <button
              onClick={() => navigate(`/admin/events/${id}/edit`)}
              className="text-xs font-bold text-blue-700 underline hover:text-blue-900 shrink-0"
            >
              Click here to edit
            </button>
          </div>
        )}

        {id && isEditMode && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Editing Mode:</strong> Any modifications you make to basic information, map pin, media gallery, or canvas stalls will be saved to this event.
              </span>
            </div>
            <span className="font-semibold text-amber-800 text-[11px] bg-amber-100 px-2 py-0.5 rounded">
              Active Edit Session
            </span>
          </div>
        )}

        {loadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {isLoadingEvent && (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Loading Event Parameters into Studio...</p>
          </div>
        )}

        {/* Stepper Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs font-bold text-slate-600 shadow-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 1 ? 'text-purple-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span>Basic Event Info</span>
          </button>
          <div className="h-px bg-slate-200 flex-1 mx-2 min-w-[20px]" />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 2 ? 'text-purple-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Hall Setup & Templates</span>
          </button>
          <div className="h-px bg-slate-200 flex-1 mx-2 min-w-[20px]" />

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 3 ? 'text-purple-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 3 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Exhibition Studio (CAD)</span>
          </button>
          <div className="h-px bg-slate-200 flex-1 mx-2 min-w-[20px]" />

          <button
            type="button"
            onClick={() => setCurrentStep(4)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 4 ? 'text-purple-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep === 4 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              4
            </span>
            <span>Preview & Publish</span>
          </button>
        </div>
      </div>

      {/* STEP 1: BASIC EVENT INFORMATION */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Header Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
                <Building className="w-3.5 h-3.5 text-purple-600" />
                <span>Step 1 of 4: Exhibition Event Profile</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Exhibition Event Profile & Location Setup
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure event identity, timeline, interactive venue location pin, and promotional visual media gallery.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setCurrentStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Step 2
            </Button>
          </div>

          {/* Card 1: Event Identity & Classification */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Event Identity & Category
                </h3>
                <p className="text-xs text-slate-500">
                  Official name, automated SEO web slug, and exhibition theme description
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Exhibition Event Name *"
                  value={basicInfo.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                    setBasicInfo({
                      ...basicInfo,
                      title,
                      slug: autoSlug,
                    });
                  }}
                  placeholder="e.g. India Industrial & Automation Expo 2026"
                  required
                />
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1.5 pl-1">
                  <span className="font-semibold text-slate-400">Live Web Address (Slug):</span>
                  <code className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono text-[11px] border border-purple-200">
                    /events/{basicInfo.slug || 'event-slug'}
                  </code>
                  <span className="text-[10px] text-slate-400 italic">
                    (automatically synchronized with event title)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Sector Category
                </label>
                <select
                  value={basicInfo.category}
                  onChange={(e) => setBasicInfo({ ...basicInfo, category: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 h-[38px]"
                >
                  <option value="Industrial & Automation">Industrial & Automation</option>
                  <option value="Electronics & Technology">Electronics & Technology</option>
                  <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                  <option value="Textiles & Apparel">Textiles & Apparel</option>
                  <option value="Building & Construction">Building & Construction</option>
                  <option value="Food & Hospitality">Food & Hospitality</option>
                  <option value="Automotive & Mobility">Automotive & Mobility</option>
                  <option value="General Trade Fair">General Trade Fair</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exhibition Description & Highlights
              </label>
              <textarea
                rows={3}
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                placeholder="Summarize key industry sectors, visitor profiles, major pavilions, and trade opportunities..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors"
              />
            </div>
          </div>

          {/* Card 2: Dates & Exhibition Schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Dates & Exhibition Schedule
                </h3>
                <p className="text-xs text-slate-500">
                  Enter dates in DD/MM/YYYY format. Date badges display in standard Indian business format.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Exhibition Start Date *"
                value={basicInfo.startDate}
                onChange={(isoVal) => setBasicInfo({ ...basicInfo, startDate: isoVal })}
                required
                helperText="Date input format: DD/MM/YYYY"
              />
              <DateInput
                label="Exhibition End Date *"
                value={basicInfo.endDate}
                onChange={(isoVal) => setBasicInfo({ ...basicInfo, endDate: isoVal })}
                required
                helperText="Date input format: DD/MM/YYYY"
              />
            </div>

            {durationDays !== null && durationDays > 0 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Total Duration: <strong className="font-bold">{durationDays} Days</strong> ({formatDisplayDate(basicInfo.startDate)} to {formatDisplayDate(basicInfo.endDate)})
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Active Schedule
                </span>
              </div>
            ) : null}
          </div>

          {/* Card 3: Venue Location & Interactive Pin Placement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Venue Location & Interactive Pin Placement
                </h3>
                <p className="text-xs text-slate-500">
                  Enter postal venue details and place an exact entrance pin. You can sync the address from the pin or keep them separated.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue / Centre Name *"
                value={basicInfo.venue}
                onChange={(e) => setBasicInfo({ ...basicInfo, venue: e.target.value })}
                placeholder="e.g. Bombay Exhibition Centre (BEC)"
                required
              />
              <Input
                label="City *"
                value={basicInfo.city}
                onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                placeholder="e.g. Mumbai"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Venue Address"
                value={basicInfo.address}
                onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                placeholder="e.g. NSE Nesco Complex, Off Western Express Hwy, Goregaon East"
              />
              <Input
                label="State / Region"
                value={basicInfo.state}
                onChange={(e) => setBasicInfo({ ...basicInfo, state: e.target.value })}
                placeholder="e.g. Maharashtra"
              />
            </div>

            {/* Interactive Pin Map with Sync vs Separate option */}
            <InteractivePinMap
              latitude={basicInfo.latitude}
              longitude={basicInfo.longitude}
              venueName={basicInfo.venue}
              cityName={basicInfo.city}
              address={basicInfo.address}
              onChangeCoordinates={(lat, lng) =>
                setBasicInfo((prev) => ({ ...prev, latitude: lat, longitude: lng }))
              }
              onSyncAddress={(addressData) => {
                setBasicInfo((prev) => ({
                  ...prev,
                  address: addressData.address || prev.address,
                  city: addressData.city || prev.city,
                  state: addressData.state || prev.state,
                }));
              }}
              heightClass="h-80"
              title="Interactive Venue Location & Pin Selection Map"
            />
          </div>

          {/* Card 4: Event Visuals & Media Gallery */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  4. Event Visuals & Media Gallery
                </h3>
                <p className="text-xs text-slate-500">
                  Upload multiple banners from your computer or paste direct image links. No stock presets. Star the primary cover banner.
                </p>
              </div>
            </div>

            <MultiImagePicker
              images={basicInfo.images}
              coverImage={basicInfo.bannerUrl}
              onChangeImages={(newImages, newCover) =>
                setBasicInfo((prev) => ({
                  ...prev,
                  images: newImages,
                  bannerUrl: newCover,
                }))
              }
            />
          </div>

          {/* Step 1 Footer Action */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Next step: Define physical hall dimensions & grid scale.
            </span>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Hall Configuration
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: HALL SETUP & STARTER TEMPLATES */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-purple-600" /> Step 2: Choose Starter Layout or Hall Dimensions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a starter venue template to begin with, or define custom dimensions and build your layout visually.
            </p>
          </div>

          {/* Starter Templates Grid */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Curated Starter Layouts
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STARTER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setLayoutData(tmpl.layoutData);
                    setStalls(tmpl.stalls as any);
                    setCurrentStep(3);
                  }}
                  className="p-4 border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 rounded-xl cursor-pointer transition-all space-y-2 group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                      {tmpl.name}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{tmpl.previewHallsCount} Hall(s)</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{tmpl.previewStallsCount} Stalls</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Hall Settings */}
          <div className="pt-4 border-t border-slate-100 space-y-4 max-w-xl">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Or Customize Primary Hall Identifier
            </span>
            <Input
              label="Primary Hall Identifier / Name"
              value={hallConfig.hallName}
              onChange={(e) => setHallConfig({ ...hallConfig, hallName: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Hall Width (Meters / Scale)"
                type="number"
                value={hallConfig.widthFt}
                onChange={(e) => setHallConfig({ ...hallConfig, widthFt: Number(e.target.value) })}
              />
              <Input
                label="Hall Height / Length"
                type="number"
                value={hallConfig.heightFt}
                onChange={(e) => setHallConfig({ ...hallConfig, heightFt: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)}>
              Back to Basic Info
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Exhibition Studio Canvas
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: INTERACTIVE VISUAL EXHIBITION STUDIO */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <GenericVisualStudio
            exhibitionTitle={basicInfo.title || 'Untitled Exhibition'}
            initialLayoutData={layoutData}
            initialStalls={stalls as any}
            isViewOnly={isViewMode}
            onSaveLayout={async ({ layoutData: savedLayout, stalls: savedStalls }) => {
              setLayoutData(savedLayout);
              setStalls(savedStalls as any);
              if (id && floorPlanId) {
                await floorPlanService.syncFloorPlan(floorPlanId, {
                  name: hallConfig.hallName,
                  width: savedLayout.canvasWidth,
                  height: savedLayout.canvasHeight,
                  layoutData: savedLayout,
                  stalls: savedStalls,
                });
                alert('Floor plan layout saved successfully to database!');
              } else {
                alert('Floor plan draft updated! Click "Proceed to Final Preview" to review and publish.');
              }
            }}
            onBack={() => setCurrentStep(2)}
          />

          <div className="pt-2 flex justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(2)}>
              Back to Hall Setup
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(4)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Final Preview & Launch
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
                {basicInfo.bannerUrl && (
                  <div className="h-28 w-full rounded-lg overflow-hidden mb-2 border border-slate-200">
                    <img src={basicInfo.bannerUrl} alt="Event Banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <p><span className="font-semibold text-slate-500">Title:</span> {basicInfo.title}</p>
                <p><span className="font-semibold text-slate-500">Public Slug:</span> <code className="text-purple-700 font-mono font-bold">/events/{basicInfo.slug}</code></p>
                <p><span className="font-semibold text-slate-500">Category:</span> {basicInfo.category}</p>
                <p><span className="font-semibold text-slate-500">Venue:</span> {basicInfo.venue}, {basicInfo.city}</p>
                <p><span className="font-semibold text-slate-500">Pin Coordinates:</span> {basicInfo.latitude.toFixed(4)}° N, {basicInfo.longitude.toFixed(4)}° E</p>
                <p><span className="font-semibold text-slate-500">Gallery Media:</span> {basicInfo.images.length} Image(s) Attached</p>
                <p><span className="font-semibold text-slate-500">Dates:</span> {formatDisplayDate(basicInfo.startDate)} to {formatDisplayDate(basicInfo.endDate)}</p>
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
                      ₹{stalls.reduce((sum, s) => sum + s.price, 0).toLocaleString()} INR
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
                {id ? 'Save & Update Exhibition Changes' : 'Publish Exhibition & Save Layout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
