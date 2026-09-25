import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAuthStore } from '../../../stores/authStore';
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
  Mail,
  Bell,
  AtSign,
  UserCheck,
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRESET_CATEGORIES = [
  'Industrial & Automation',
  'Electronics & Technology',
  'Healthcare & Pharma',
  'Textiles & Apparel',
  'Building & Construction',
  'Food & Hospitality',
  'Automotive & Mobility',
  'General Trade Fair',
];

// Helper to extract 2-digit month from ISO date string (e.g. '2026-10-15' -> '10', fallback to current month)
const getMonthEditionCode = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  }
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2 && parts[1]) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) {
        return String(m).padStart(2, '0');
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return String(d.getMonth() + 1).padStart(2, '0');
    }
  } catch {
    // fallback
  }
  return String(new Date().getMonth() + 1).padStart(2, '0');
};

const getMonthNameByEdition = (editionStr: string): string => {
  const m = parseInt(editionStr, 10);
  if (!isNaN(m) && m >= 1 && m <= 12) {
    return MONTH_NAMES[m - 1];
  }
  return '';
};

// Helper to generate event short code from title (e.g. "India Industrial & Automation Expo 2026" -> "IIAE", "Mediccon Expo" -> "ME")
const generateEventShortCode = (title: string): string => {
  if (!title) return '';
  const stopWords = new Set(['and', '&', 'the', 'of', 'for', 'to', 'in', 'a', 'an', 'at', 'by', 'on', 'with']);
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^\d{4}$/.test(w) && !stopWords.has(w.toLowerCase()));

  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0].toUpperCase()).join('');
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return title.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
};

const formatTimeDisplay = (time24?: string): string => {
  if (!time24) return '10:00 AM';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr || '10', 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
};

const formatIsoWithTime = (dateStr: string, timeStr: string, defaultHour: number) => {
  if (!dateStr) return new Date().toISOString();
  try {
    const [h, m] = (timeStr || `${defaultHour}:00`).split(':');
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    d.setHours(parseInt(h || `${defaultHour}`, 10), parseInt(m || '0', 10), 0, 0);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

// Helper to calculate default booking end date (15 days prior to start date)
const calculateDefaultBookingEndDate = (startDateIso: string): string => {
  if (!startDateIso) return '';
  try {
    const d = new Date(startDateIso);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Helper to generate a guaranteed unique event short code
const getUniqueEventShortCode = (
  title: string,
  existingEvents: { id: string; slug?: string; eventCode?: string }[],
  currentEventId?: string
): string => {
  if (!title || !title.trim()) return '';
  const base = generateEventShortCode(title);
  if (!base) return '';

  const takenCodes = new Set(
    existingEvents
      .filter((e) => e.id !== currentEventId && (!e.slug || e.slug !== currentEventId))
      .map((e) => (e.eventCode || '').toUpperCase().trim())
      .filter(Boolean)
  );

  if (!takenCodes.has(base)) {
    return base;
  }

  // If base exists, generate newer unique code by appending next counter (e.g. BAE2, BAE3)
  let counter = 2;
  while (takenCodes.has(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
};

export const AdminExhibitionBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuthStore();

  const isViewMode = location.pathname.endsWith('/view') || new URLSearchParams(location.search).get('mode') === 'view';
  const isEditMode = !!id && !isViewMode;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [hallConfig, setHallConfig] = useState({
    hallName: 'Hall A',
    widthFt: 100,
    heightFt: 80,
  });
  const [stalls, setStalls] = useState<DraftStall[]>([]);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);

  // Existing exhibitions loaded from DB to guarantee unique short codes
  const [existingEvents, setExistingEvents] = useState<{ id: string; slug?: string; title: string; eventCode: string; edition: string }[]>([]);

  useEffect(() => {
    exhibitionService
      .getExhibitions()
      .then((events) => {
        setExistingEvents(
          (events || []).map((e) => ({
            id: e.id,
            slug: e.slug,
            title: e.title,
            eventCode: ((e as any).eventCode || '').toUpperCase().trim(),
            edition: ((e as any).edition || '').toUpperCase().trim(),
          }))
        );
      })
      .catch((err) => console.warn('Could not fetch existing events for uniqueness check', err));
  }, []);

  // Step 1: Basic Event Information
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    slug: '',
    edition: getMonthEditionCode(''),
    eventCode: '',
    spcode: 'B003', // Internal admin allocation code
    category: 'Industrial & Automation',
    description: '',
    startDate: '',
    endDate: '',
    bookingEndDate: '',
    startTime: '10:00',
    endTime: '18:00',
    venue: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    bannerUrl: '',
    images: [] as string[],
    notificationEmails: '',
    latitude: 19.1551,
    longitude: 72.8553,
    status: 'DRAFT',
  });

  const [isEventCodeCustom, setIsEventCodeCustom] = useState<boolean>(false);
  const [isEditionCustom, setIsEditionCustom] = useState<boolean>(false);
  const [isBookingEndDateCustom, setIsBookingEndDateCustom] = useState<boolean>(false);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);

  const loadEventData = useCallback(async (eventId: string) => {
    try {
      setIsLoadingEvent(true);
      setLoadError(null);
      const data = await exhibitionService.getExhibitionBySlug(eventId);
      if (data) {
        let loadedStartTime = '10:00';
        let loadedEndTime = '18:00';
        if (data.startDate) {
          const sDate = new Date(data.startDate);
          if (!isNaN(sDate.getTime()) && (sDate.getHours() !== 0 || sDate.getMinutes() !== 0)) {
            loadedStartTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
          }
        }
        if (data.endDate) {
          const eDate = new Date(data.endDate);
          if (!isNaN(eDate.getTime()) && (eDate.getHours() !== 0 || eDate.getMinutes() !== 0)) {
            loadedEndTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
          }
        }

        const startIso = data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '';
        const endIso = data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '';
        const loadedBookingEndIso = (data as any).bookingEndDate
          ? new Date((data as any).bookingEndDate).toISOString().split('T')[0]
          : calculateDefaultBookingEndDate(startIso);
        const loadedEdition = (data as any).edition || getMonthEditionCode(startIso);
        const loadedEventCode = (data as any).eventCode || '';
        const loadedCategory = (data as any).category || 'Industrial & Automation';

        setBasicInfo({
          title: data.title || '',
          slug: data.slug || '',
          edition: loadedEdition,
          eventCode: loadedEventCode,
          spcode: (data as any).spcode || 'B003',
          category: loadedCategory,
          description: data.description || '',
          startDate: startIso,
          endDate: endIso,
          bookingEndDate: loadedBookingEndIso,
          startTime: (data as any).startTime || loadedStartTime,
          endTime: (data as any).endTime || loadedEndTime,
          venue: data.venue || '',
          address: data.venue || '',
          city: data.city || '',
          state: 'Maharashtra',
          bannerUrl: data.bannerUrl || '',
          images: data.bannerUrl ? [data.bannerUrl] : [],
          notificationEmails: (data as any).notificationEmails || '',
          latitude: (data as any).latitude || 19.1551,
          longitude: (data as any).longitude || 72.8553,
          status: data.status || 'PUBLISHED',
        });

        setIsEventCodeCustom(false);
        setIsEditionCustom(false);
        if (loadedCategory && !PRESET_CATEGORIES.includes(loadedCategory)) {
          setIsCustomCategory(true);
        }
        if ((data as any).bookingEndDate) setIsBookingEndDateCustom(true);

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
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (id) {
      loadEventData(id);
    }
  }, [id, loadEventData]);

  const calculateDurationDays = () => {
    if (!basicInfo.startDate || !basicInfo.endDate) return null;
    const s = new Date(basicInfo.startDate).getTime();
    const e = new Date(basicInfo.endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return null;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };
  const durationDays = calculateDurationDays();

  // Derived Usable Area
  const _totalUsableArea = hallConfig.widthFt * hallConfig.heightFt;

  const [_zoomLevel, _setZoomLevel] = useState<number>(100);

  // Crash Recovery & Auto-Save
  const DRAFT_STORAGE_KEY = id ? `buoyant_exhibition_draft_${id}` : 'buoyant_exhibition_draft_new';
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const hasAttemptedRestoreRef = useRef(false);

  // Crash Recovery: Auto-restore if session crashed or tab was closed (run only once on mount)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!id && !hasAttemptedRestoreRef.current) {
      hasAttemptedRestoreRef.current = true;
      try {
        const saved = localStorage.getItem('buoyant_exhibition_draft_new');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed &&
            (parsed.stalls?.length > 0 || parsed.layoutData?.halls?.length > 0)
          ) {
            if (parsed.basicInfo) setBasicInfo(parsed.basicInfo);
            if (parsed.hallConfig) setHallConfig(parsed.hallConfig);
            if (parsed.stalls) setStalls(parsed.stalls);
            if (parsed.layoutData) setLayoutData(parsed.layoutData);
            setHasRestoredDraft(true);
          }
        }
      } catch (e) {
        console.warn('Could not restore draft from localStorage', e);
      }
    }
  }, [id]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (isLoadingEvent) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          basicInfo,
          hallConfig,
          stalls,
          layoutData,
          currentStep,
          timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn('Auto-save failed', e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [basicInfo, hallConfig, stalls, layoutData, currentStep, DRAFT_STORAGE_KEY, isLoadingEvent]);

  // Window beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const draft = {
          basicInfo,
          hallConfig,
          stalls,
          layoutData,
          currentStep,
          timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [basicInfo, hallConfig, stalls, layoutData, currentStep, DRAFT_STORAGE_KEY]);

  const handleDiscardDraft = () => {
    if (window.confirm('Discard the restored draft and start completely clean from scratch?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem('buoyant_exhibition_draft_new');
      setHasRestoredDraft(false);
      setStalls([]);
      setLayoutData(null);
      setCurrentStep(1);
    }
  };

  // Add Stall Helper
  const handleAddStall = () => {
    const existingNums = new Set(stalls.map((s) => s.stallNumber.toUpperCase()));
    let nextNum = stalls.length + 1;
    let candidate = `A-${String(nextNum).padStart(3, '0')}`;
    while (existingNums.has(candidate)) {
      nextNum++;
      candidate = `A-${String(nextNum).padStart(3, '0')}`;
    }

    const newStall: DraftStall = {
      id: `stall_draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      stallNumber: candidate,
      xPosition: 40 + (stalls.length % 5) * 120,
      yPosition: 40 + Math.floor(stalls.length / 5) * 120,
      width: 100,
      height: 100,
      areaSqFt: 100,
      category: 'STANDARD',
      price: 50000,
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
          updated.areaSqFt = Math.round((updated.width * updated.height) / 100);
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
      const computedBookingEndDate = basicInfo.bookingEndDate
        ? formatIsoWithTime(basicInfo.bookingEndDate, '23:59', 23)
        : basicInfo.startDate
        ? formatIsoWithTime(calculateDefaultBookingEndDate(basicInfo.startDate), '23:59', 23)
        : null;

      if (id) {
        // Updating existing event
        const updatePayload = {
          title: basicInfo.title,
          description: basicInfo.description,
          edition: basicInfo.edition,
          eventCode: basicInfo.eventCode,
          spcode: basicInfo.spcode,
          venue: basicInfo.venue,
          city: basicInfo.city,
          startDate: formatIsoWithTime(basicInfo.startDate, basicInfo.startTime, 10),
          endDate: formatIsoWithTime(basicInfo.endDate, basicInfo.endTime, 18),
          bookingEndDate: computedBookingEndDate,
          bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
          notificationEmails: basicInfo.notificationEmails || null,
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
          edition: basicInfo.edition,
          eventCode: basicInfo.eventCode,
          spcode: basicInfo.spcode,
          venue: basicInfo.venue,
          city: basicInfo.city,
          startDate: formatIsoWithTime(basicInfo.startDate, basicInfo.startTime, 10),
          endDate: formatIsoWithTime(basicInfo.endDate, basicInfo.endTime, 18),
          bookingEndDate: computedBookingEndDate,
          bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
          notificationEmails: basicInfo.notificationEmails || null,
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
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate('/admin/events');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save exhibition event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStall = stalls.find((s) => s.id === selectedStallId);

  return (
    <div className={`space-y-6 w-full transition-all ${currentStep === 2 ? 'max-w-none px-0' : 'max-w-6xl mx-auto'}`}>
      {/* Auto-Save & Crash Recovery Banner */}
      {hasRestoredDraft && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>Draft Restored:</strong> We recovered your unsaved floor plan and event details from your previous session. You can continue right where you left off.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setHasRestoredDraft(false)}
              className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Continue Working
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-2.5 py-1 bg-white text-emerald-800 border border-emerald-300 font-bold rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Start Clean (Discard)
            </button>
          </div>
        </div>
      )}

      {/* Header & Stepper */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <button
              onClick={() => navigate('/admin/events')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibitions Console
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              {isViewMode
                ? `View Exhibition — ${basicInfo.title}`
                : isEditMode
                ? `Edit Exhibition & Floor Plan — ${basicInfo.title}`
                : 'Create Exhibition & Floor Plan'}
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
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Viewing Mode:</strong> You are inspecting <strong>"{basicInfo.title}"</strong> in the full Studio interface. All 4 cards, interactive location map, and stalls are loaded below.
              </span>
            </div>
            <button
              onClick={() => navigate(`/admin/events/${id}/edit`)}
              className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-100 shrink-0"
            >
              Click here to edit
            </button>
          </div>
        )}

        {id && isEditMode && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Editing Mode:</strong> Any modifications you make to basic information, map pin, media gallery, or canvas stalls will be saved to this event.
              </span>
            </div>
            <span className="font-semibold text-amber-800 dark:text-amber-200 text-[11px] bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
              Active Edit Session
            </span>
          </div>
        )}

        {loadError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {isLoadingEvent && (
          <div className="p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <Loader2 className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading Event & Floor Plan...</p>
          </div>
        )}

        {/* Stepper Header (Streamlined 3 Steps) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 shadow-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 1 ? 'text-purple-700 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              1
            </span>
            <span>Event Details</span>
          </button>
          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 mx-2 min-w-[20px]" />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 2 ? 'text-purple-700 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              2
            </span>
            <span>Floor Plan Designer</span>
          </button>
          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 mx-2 min-w-[20px]" />

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              currentStep === 3 ? 'text-purple-700 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 3 ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              3
            </span>
            <span>Review & Publish</span>
          </button>
        </div>
      </div>

      {/* STEP 1: BASIC EVENT INFORMATION */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Header Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-2">
                <Building className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Step 1 of 3: Event Details</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Event Details & Location Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure event identity, dates, venue location, and promotional images.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setCurrentStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Floor Plan Designer
            </Button>
          </div>

          {/* Card 1: Event Identity & Category */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  1. Event Overview & Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Event name, unique codes, timings, and category
                </p>
              </div>
            </div>

            {/* Event Name + Event Short Code + Edition Code */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Exhibition Event Name */}
              <div className="md:col-span-6">
                <Input
                  label="Exhibition Event Name *"
                  value={basicInfo.title}
                  disabled={isViewMode}
                  onChange={(e) => {
                    if (isViewMode) return;
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');

                    let newEventCode = basicInfo.eventCode;
                    if (!id && !isEventCodeCustom) {
                      newEventCode = title.trim() ? getUniqueEventShortCode(title, existingEvents, id) : '';
                    }

                    setBasicInfo((prev) => ({
                      ...prev,
                      title,
                      slug: !id ? autoSlug : prev.slug,
                      eventCode: newEventCode,
                    }));
                  }}
                  placeholder="e.g. India Industrial & Automation Expo 2026"
                  required
                />
                {/* Client Reg No preview directly below event name */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 pl-1">
                  <span className="font-semibold text-slate-400">Client Reg No:</span>
                  <code className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    {basicInfo.edition || '10'}/{basicInfo.startDate ? new Date(basicInfo.startDate).getFullYear().toString().slice(-2) : '26'}/{basicInfo.eventCode || 'EX'}/01
                  </code>
                  <span className="text-[10px] text-slate-400 italic">
                    (Edition • Year • Code • Client #)
                  </span>
                </div>
              </div>

              {/* Event Short Code & Edition Code Row */}
              <div className="md:col-span-6 flex flex-col justify-between">
                <div className="grid grid-cols-12 gap-3">
                  {/* Event Short Code */}
                  <div className="col-span-7 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Event Short Code *
                      </label>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const auto = basicInfo.title.trim() ? getUniqueEventShortCode(basicInfo.title, existingEvents, id) : '';
                            setIsEventCodeCustom(false);
                            setBasicInfo((prev) => ({ ...prev, eventCode: auto }));
                          }}
                          title="Re-generate automatically from event title"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{isEventCodeCustom ? 'Reset Auto' : 'Auto-Sync'}</span>
                        </button>
                      )}
                    </div>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="text"
                        value={basicInfo.eventCode}
                        disabled={isViewMode}
                        readOnly={isViewMode}
                        onChange={(e) => {
                          if (isViewMode) return;
                          setIsEventCodeCustom(true);
                          setBasicInfo((prev) => ({
                            ...prev,
                            eventCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
                          }));
                        }}
                        placeholder="Auto-generated on title typing"
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 px-3 py-2 uppercase transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {isViewMode
                        ? 'Unique event short code • registered in catalog'
                        : isEventCodeCustom
                        ? 'Custom short code • click Auto-Sync to re-generate'
                        : basicInfo.eventCode
                        ? 'Auto-generated from title'
                        : 'Type event name above to auto-generate short code'}
                    </p>
                  </div>

                  {/* Edition Code */}
                  <div className="col-span-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Edition Code *
                      </label>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const autoEd = getMonthEditionCode(basicInfo.startDate);
                            setIsEditionCustom(false);
                            setBasicInfo((prev) => ({ ...prev, edition: autoEd }));
                          }}
                          title="Sync edition code with start date month"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Sync Month</span>
                        </button>
                      )}
                    </div>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="text"
                        value={basicInfo.edition}
                        disabled={isViewMode}
                        readOnly={isViewMode}
                        onChange={(e) => {
                          if (isViewMode) return;
                          setIsEditionCustom(true);
                          setBasicInfo((prev) => ({
                            ...prev,
                            edition: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
                          }));
                        }}
                        placeholder="e.g. 10"
                        maxLength={4}
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 px-3 py-2 text-center uppercase transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={getMonthNameByEdition(basicInfo.edition) ? `Month of ${getMonthNameByEdition(basicInfo.edition)}` : `Edition ${basicInfo.edition}`}>
                      {getMonthNameByEdition(basicInfo.edition)
                        ? `${getMonthNameByEdition(basicInfo.edition)} (${basicInfo.edition}) • ${isEditionCustom ? 'Custom' : 'Matches start date'}`
                        : `Edition ${basicInfo.edition || 'Current'}`}
                    </p>
                  </div>
                </div>

                {/* Collision Notice */}
                {(() => {
                  if (isViewMode || !basicInfo.eventCode || !basicInfo.eventCode.trim()) return null;
                  const collision = existingEvents.find(
                    (e) =>
                      e.id !== id &&
                      (!e.slug || e.slug !== id) &&
                      e.eventCode &&
                      e.eventCode.toUpperCase().trim() === basicInfo.eventCode.toUpperCase().trim()
                  );
                  if (!collision) return null;
                  const suggestedNewer = getUniqueEventShortCode(
                    basicInfo.title || basicInfo.eventCode,
                    existingEvents,
                    id
                  );
                  return (
                    <div className="mt-1.5 p-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md text-[10px] text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 animate-in fade-in">
                      <span className="truncate">
                        ⚠️ Code <strong>{basicInfo.eventCode}</strong> is already used by "{collision.title}".
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBasicInfo((prev) => ({ ...prev, eventCode: suggestedNewer }));
                          setIsEventCodeCustom(true);
                        }}
                        className="font-bold underline text-amber-900 dark:text-amber-300 hover:text-amber-700 shrink-0 cursor-pointer text-[10px] bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded transition-colors"
                      >
                        Use Newer ({suggestedNewer})
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Dates & Exhibition Schedule / Timings */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Exhibition Dates & Daily Visiting Timings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DateInput
                  label="Exhibition Start Date"
                  value={basicInfo.startDate}
                  disabled={isViewMode}
                  onChange={(isoVal) => {
                    if (isViewMode) return;
                    setBasicInfo((prev) => {
                      const newEdition = (!id && !isEditionCustom) ? getMonthEditionCode(isoVal) : prev.edition;
                      const newBookingEndDate = !isBookingEndDateCustom ? calculateDefaultBookingEndDate(isoVal) : prev.bookingEndDate;
                      return {
                        ...prev,
                        startDate: isoVal,
                        edition: newEdition,
                        bookingEndDate: newBookingEndDate,
                      };
                    });
                  }}
                  required
                  helperText="Format: DD/MM/YYYY"
                />
                <DateInput
                  label="Exhibition End Date"
                  value={basicInfo.endDate}
                  disabled={isViewMode}
                  onChange={(isoVal) => {
                    if (isViewMode) return;
                    setBasicInfo({ ...basicInfo, endDate: isoVal });
                  }}
                  required
                  helperText="Format: DD/MM/YYYY"
                />

                {/* Event Time: Opening Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Opening Time
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="time"
                      value={basicInfo.startTime}
                      disabled={isViewMode}
                      onChange={(e) => {
                        if (isViewMode) return;
                        setBasicInfo({ ...basicInfo, startTime: e.target.value });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600 pl-8 pr-3 py-2 h-[38px] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Visiting start time</p>
                </div>

                {/* Event Time: Closing Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Closing Time
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="time"
                      value={basicInfo.endTime}
                      disabled={isViewMode}
                      onChange={(e) => {
                        if (isViewMode) return;
                        setBasicInfo({ ...basicInfo, endTime: e.target.value });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600 pl-8 pr-3 py-2 h-[38px] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Visiting close time</p>
                </div>
              </div>

              {/* Quick Time Presets */}
              {!isViewMode && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quick Hours Presets:</span>
                  {[
                    { label: '10:00 AM – 06:00 PM', start: '10:00', end: '18:00' },
                    { label: '09:30 AM – 06:30 PM', start: '09:30', end: '18:30' },
                    { label: '10:00 AM – 07:00 PM', start: '10:00', end: '19:00' },
                    { label: '11:00 AM – 08:00 PM', start: '11:00', end: '20:00' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setBasicInfo((prev) => ({
                          ...prev,
                          startTime: preset.start,
                          endTime: preset.end,
                        }))
                      }
                      className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                        basicInfo.startTime === preset.start && basicInfo.endTime === preset.end
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Stall Booking Cut-Off Date Card */}
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-xs text-purple-950 dark:text-purple-200">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Stall Booking Closing Date (Registration Cut-Off)</span>
                      <span className="text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                        Default: 15 Days Prior
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      New stall reservations, holds, and public checkouts will automatically stop after this date.
                    </p>
                  </div>

                  {!isViewMode && basicInfo.startDate && (
                    <button
                      type="button"
                      onClick={() => {
                        const autoDate = calculateDefaultBookingEndDate(basicInfo.startDate);
                        setBasicInfo((prev) => ({ ...prev, bookingEndDate: autoDate }));
                        setIsBookingEndDateCustom(false);
                      }}
                      className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                      title="Reset booking cut-off date to 15 days prior to event start"
                    >
                      Reset to 15 Days Before Start
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <DateInput
                    label="Booking Closing Date"
                    value={basicInfo.bookingEndDate}
                    disabled={isViewMode}
                    onChange={(isoVal) => {
                      if (isViewMode) return;
                      setIsBookingEndDateCustom(true);
                      setBasicInfo((prev) => ({ ...prev, bookingEndDate: isoVal }));
                    }}
                    required
                    helperText={
                      basicInfo.startDate && basicInfo.bookingEndDate
                        ? `${Math.max(
                            0,
                            Math.round(
                              (new Date(basicInfo.startDate).getTime() - new Date(basicInfo.bookingEndDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )} days before exhibition start date`
                        : 'Format: DD/MM/YYYY'
                    }
                  />

                  <div className="p-3 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 rounded-lg flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <p className="text-[11px] leading-relaxed">
                      {basicInfo.bookingEndDate ? (
                        <>
                          Stall bookings will stop on <strong className="text-purple-900 dark:text-purple-200 font-bold">{formatDisplayDate(basicInfo.bookingEndDate)}</strong>. After this cut-off, public exhibitors cannot select or hold stalls.
                        </>
                      ) : (
                        'Select an Exhibition Start Date above to automatically compute the 15-day cut-off date.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {durationDays !== null && durationDays > 0 ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      Total Duration: <strong className="font-bold">{durationDays} Days</strong> ({formatDisplayDate(basicInfo.startDate)} to {formatDisplayDate(basicInfo.endDate)}) • Daily Visiting Hours: <strong className="font-bold">{formatTimeDisplay(basicInfo.startTime)} – {formatTimeDisplay(basicInfo.endTime)}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
                    Active Schedule
                  </span>
                </div>
              ) : null}
            </div>

            {/* Category and Registration Format */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-8 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Industry / Sector Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <select
                    value={PRESET_CATEGORIES.includes(basicInfo.category) ? basicInfo.category : 'OTHER'}
                    disabled={isViewMode}
                    onChange={(e) => {
                      if (isViewMode) return;
                      const val = e.target.value;
                      if (val === 'OTHER') {
                        setIsCustomCategory(true);
                        if (PRESET_CATEGORIES.includes(basicInfo.category)) {
                          setBasicInfo({ ...basicInfo, category: '' });
                        }
                      } else {
                        setIsCustomCategory(false);
                        setBasicInfo({ ...basicInfo, category: val });
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600 h-[38px] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="OTHER">Other (Type custom sector...)</option>
                  </select>

                  {(isCustomCategory || !PRESET_CATEGORIES.includes(basicInfo.category)) && (
                    <Input
                      placeholder="Enter custom industry sector..."
                      value={basicInfo.category}
                      disabled={isViewMode}
                      onChange={(e) => {
                        if (isViewMode) return;
                        setBasicInfo({ ...basicInfo, category: e.target.value });
                      }}
                      required
                    />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Choose from industry sector presets or select "Other" to type your own custom sector.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exhibition Description & Highlights
              </label>
              <textarea
                rows={3}
                value={basicInfo.description}
                disabled={isViewMode}
                onChange={(e) => {
                  if (isViewMode) return;
                  setBasicInfo({ ...basicInfo, description: e.target.value });
                }}
                placeholder="Summarize key industry sectors, visitor profiles, major pavilions, and trade opportunities..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Card 2: Venue Location & Interactive Pin Placement */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  2. Venue & Location
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter venue address and set the location pin on the map.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue / Centre Name *"
                value={basicInfo.venue}
                disabled={isViewMode}
                onChange={(e) => {
                  if (isViewMode) return;
                  setBasicInfo({ ...basicInfo, venue: e.target.value });
                }}
                placeholder="e.g. Bombay Exhibition Centre (BEC)"
                required
              />
              <Input
                label="City *"
                value={basicInfo.city}
                disabled={isViewMode}
                onChange={(e) => {
                  if (isViewMode) return;
                  setBasicInfo({ ...basicInfo, city: e.target.value });
                }}
                placeholder="e.g. Mumbai"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Venue Address"
                value={basicInfo.address}
                disabled={isViewMode}
                onChange={(e) => {
                  if (isViewMode) return;
                  setBasicInfo({ ...basicInfo, address: e.target.value });
                }}
                placeholder="e.g. NSE Nesco Complex, Off Western Express Hwy, Goregaon East"
              />
              <Input
                label="State / Region"
                value={basicInfo.state}
                disabled={isViewMode}
                onChange={(e) => {
                  if (isViewMode) return;
                  setBasicInfo({ ...basicInfo, state: e.target.value });
                }}
                placeholder="e.g. Maharashtra"
              />
            </div>

            {/* Interactive Pin Map */}
            <InteractivePinMap
              latitude={basicInfo.latitude}
              longitude={basicInfo.longitude}
              venueName={basicInfo.venue}
              cityName={basicInfo.city}
              address={basicInfo.address}
              stateName={basicInfo.state}
              readOnly={isViewMode}
              onChangeCoordinates={(lat, lng) => {
                if (isViewMode) return;
                setBasicInfo((prev) => ({ ...prev, latitude: lat, longitude: lng }));
              }}
              onSyncAddress={(addressData) => {
                if (isViewMode) return;
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

          {/* Card 3: Event Visuals & Media Gallery */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  3. Photos & Banners
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload event banners or paste image links. Click the star icon to set the primary cover image.
                </p>
              </div>
            </div>

            <MultiImagePicker
              images={basicInfo.images}
              coverImage={basicInfo.bannerUrl}
              disabled={isViewMode}
              onChangeImages={(newImages, newCover) => {
                if (isViewMode) return;
                setBasicInfo((prev) => ({
                  ...prev,
                  images: newImages,
                  bannerUrl: newCover,
                }));
              }}
            />
          </div>

          {/* Card 4: Event Alert & Notification Email Recipients */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  4. Notification Routing & Admin Email Recipients
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Targeted alerts: Event registrations, stall reservations, and booking payment notices will be routed to these email addresses.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Email Addresses <span className="text-slate-400 font-normal">(Separate multiple emails with commas)</span>
                  </label>

                  {/* Quick-Add Logged-in Admin Email Action */}
                  {!isViewMode && user?.email && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentEmails = basicInfo.notificationEmails
                          ? basicInfo.notificationEmails.split(',').map((e) => e.trim()).filter(Boolean)
                          : [];
                        if (!currentEmails.includes(user.email)) {
                          const updated = [...currentEmails, user.email].join(', ');
                          setBasicInfo((prev) => ({ ...prev, notificationEmails: updated }));
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#09539b] dark:text-blue-400 hover:text-[#012970] bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                      title="Add your current admin email to the notification list"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#09539b] dark:text-blue-400" />
                      <span>+ Add My Email ({user.email})</span>
                    </button>
                  )}
                </div>

                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={basicInfo.notificationEmails}
                    disabled={isViewMode}
                    onChange={(e) => {
                      if (isViewMode) return;
                      setBasicInfo((prev) => ({ ...prev, notificationEmails: e.target.value }));
                    }}
                    placeholder="e.g. event-director@buoyant.com, accounts@company.com, admin@expo.org"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-600 pl-9 pr-3 py-2.5 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Active Recipient Tags Preview */}
              {basicInfo.notificationEmails && basicInfo.notificationEmails.trim() ? (
                <div className="p-3 bg-[#f8faff] dark:bg-slate-800/40 border border-blue-100 dark:border-slate-700 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Active Alert Recipients for this Exhibition:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {basicInfo.notificationEmails
                      .split(',')
                      .map((e) => e.trim())
                      .filter(Boolean)
                      .map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-[#09539b] dark:text-blue-300 px-2.5 py-1 rounded-md text-[11px] font-semibold font-mono shadow-2xs"
                        >
                          <Mail className="w-3 h-3 text-blue-500" />
                          <span>{email}</span>
                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = basicInfo.notificationEmails
                                  .split(',')
                                  .map((x) => x.trim())
                                  .filter((x) => x && x !== email)
                                  .join(', ');
                                setBasicInfo((prev) => ({ ...prev, notificationEmails: filtered }));
                              }}
                              className="ml-1 text-slate-400 hover:text-rose-600 text-xs font-bold leading-none cursor-pointer"
                              title="Remove recipient"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    No specific emails entered. System default: All platform super-administrators and the event creator will receive registration and payment notifications.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 1 Footer Action */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Next step: Design your halls and stalls on the interactive floor plan.
            </span>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Floor Plan Designer
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: INTERACTIVE VISUAL EXHIBITION STUDIO */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <GenericVisualStudio
            exhibitionTitle={basicInfo.title || 'Untitled Exhibition'}
            initialLayoutData={layoutData}
            initialStalls={stalls as any}
            isViewOnly={isViewMode}
            onChangeLayout={({ layoutData: currentLayout, stalls: currentStalls }) => {
              setLayoutData(currentLayout);
              setStalls(currentStalls as any);
            }}
            onSaveLayout={async ({ layoutData: savedLayout, stalls: savedStalls }) => {
              setLayoutData(savedLayout);
              setStalls(savedStalls as any);
              try {
                if (id && floorPlanId) {
                  await floorPlanService.syncFloorPlan(floorPlanId, {
                    name: hallConfig.hallName,
                    width: savedLayout.canvasWidth,
                    height: savedLayout.canvasHeight,
                    layoutData: savedLayout,
                    stalls: savedStalls,
                  });
                  alert('Floor plan layout saved successfully to database!');
                } else if (id && !floorPlanId) {
                  const ev = await exhibitionService.getExhibitionBySlug(id);
                  const fp = ev?.floorPlans?.[0];
                  if (fp) {
                    setFloorPlanId(fp.id);
                    await floorPlanService.syncFloorPlan(fp.id, {
                      name: hallConfig.hallName,
                      width: savedLayout.canvasWidth,
                      height: savedLayout.canvasHeight,
                      layoutData: savedLayout,
                      stalls: savedStalls,
                    });
                    alert('Floor plan layout saved successfully to database!');
                  }
                } else {
                  const payload = {
                    title: basicInfo.title || 'Untitled Exhibition',
                    description: basicInfo.description,
                    edition: basicInfo.edition || undefined,
                    eventCode: basicInfo.eventCode || undefined,
                    spcode: basicInfo.spcode || undefined,
                    venue: basicInfo.venue || 'Exhibition Venue',
                    city: basicInfo.city || 'City',
                    startDate: formatIsoWithTime(basicInfo.startDate, basicInfo.startTime, 10),
                    endDate: formatIsoWithTime(basicInfo.endDate, basicInfo.endTime, 18),
                    bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
                    status: 'DRAFT',
                    totalStalls: savedStalls.length,
                    floorPlans: [
                      {
                        name: hallConfig.hallName || 'Hall A',
                        width: savedLayout.canvasWidth || 1400,
                        height: savedLayout.canvasHeight || 850,
                        layoutData: savedLayout,
                        stalls: savedStalls.map((s) => ({
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
                  const created = await exhibitionService.createExhibition(payload as any);
                  if (created?.floorPlans?.[0]?.id) {
                    setFloorPlanId(created.floorPlans[0].id);
                  }
                  if (created?.slug) {
                    navigate(`/admin/events/${created.slug}/edit`, { replace: true });
                  }
                  alert('Exhibition draft and floor plan saved successfully to database!');
                }
              } catch (err: any) {
                console.error('Failed to save layout:', err);
                alert(err?.response?.data?.message || err?.message || 'Failed to save floor plan layout to database.');
              }
            }}
            onBack={() => setCurrentStep(1)}
          />

          <div className="pt-2 flex justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)}>
              Back to Event Details
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Review & Publish
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & PUBLISH */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Step 3: Review & Publish Exhibition
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review event details and stall layout before publishing.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
              Back to Floor Plan Designer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs text-slate-800 dark:text-slate-200">
                <h4 className="font-bold text-sm uppercase text-purple-700 dark:text-purple-400">Event Overview</h4>
                {basicInfo.bannerUrl && (
                  <div className="h-28 w-full rounded-lg overflow-hidden mb-2 border border-slate-200 dark:border-slate-700">
                    <img src={basicInfo.bannerUrl} alt="Event Banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Title:</span> {basicInfo.title}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Category:</span> {basicInfo.category}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Venue:</span> {basicInfo.venue}, {basicInfo.city}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Pin Coordinates:</span> {basicInfo.latitude.toFixed(4)}° N, {basicInfo.longitude.toFixed(4)}° E</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">SP Code (Admin/Staff):</span> <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded text-[11px]">{basicInfo.spcode || 'B001'}</span></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Edition & Event Code:</span> <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{basicInfo.edition || '10'}</span> / <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{basicInfo.eventCode || 'IIAE'}</span></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Client Reg No Preview:</span> <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-[11px]">{basicInfo.edition || '10'}/{basicInfo.startDate ? new Date(basicInfo.startDate).getFullYear().toString().slice(-2) : '26'}/{basicInfo.eventCode || 'IIAE'}/01</code></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Gallery Media:</span> {basicInfo.images.length} Image(s) Attached</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Dates & Timings:</span> {formatDisplayDate(basicInfo.startDate)} to {formatDisplayDate(basicInfo.endDate)} ({formatTimeDisplay(basicInfo.startTime)} – {formatTimeDisplay(basicInfo.endTime)})</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Stall Booking Cut-Off:</span> <span className="font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded text-[11px]">{formatDisplayDate(basicInfo.bookingEndDate) || '15 Days Prior'}</span></p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs text-slate-800 dark:text-slate-200">
                <h4 className="font-bold text-sm uppercase text-purple-700 dark:text-purple-400">Hall Layout</h4>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Primary Hall:</span> {hallConfig.hallName}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Halls / Pavilions:</span> {layoutData?.halls?.length || 1} Configured (Dynamic Canvas Scale)</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Total Configured Stalls:</span> {stalls.length} Stalls</p>
              </div>
            </div>

            {/* Inventory Valuation Card */}
            <div className="p-6 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white rounded-xl space-y-4 shadow-md flex flex-col justify-between">
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
