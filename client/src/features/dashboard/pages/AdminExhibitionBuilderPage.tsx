import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { floorPlanService } from '../../../services/floor-plans/floorPlanService';
import { GenericVisualStudio } from '../../floor-plan/components/studio/GenericVisualStudio';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { Input } from '../../../components/ui/Input';
import { DateInput } from '../../../components/ui/DateInput';
import { SearchableCombobox } from '../../../components/ui/SearchableCombobox';
import { MultiImagePicker } from '../../../components/ui/MultiImagePicker';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';
import { Button } from '../../../components/ui/Button';
import { BackButton } from '../../../components/ui/BackButton';
import { formatDisplayDate, displayInputDateToIso } from '../../../utils/date';
import { ALL_INDIAN_STATES, getCitiesForLocation, getStateForCity } from '../../../data/indianStatesCities';
import { useAuthStore } from '../../../stores/authStore';
import { showConfirm, showAlert } from '../../../stores/dialogStore';
import {
  Layers,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  Building,
  Calendar,
  MapPin,
  Check,
  Tag,
  Clock,
  Image as ImageIcon,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
  Mail,
  Bell,
  AtSign,
  UserCheck,
  Compass,
  Sparkles,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';

export interface DraftStall {
  id: string;
  stallNumber: string;
  name?: string;
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

const getInitialBasicInfo = () => ({
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
  state: '',
  bannerUrl: '',
  images: [] as string[],
  notificationEmails: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  status: 'DRAFT',
});

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

  const urlStep = Number(new URLSearchParams(location.search).get('step'));
  const [currentStep, setCurrentStep] = useState<number>(urlStep === 2 ? 2 : 1);

  useEffect(() => {
    const s = Number(new URLSearchParams(location.search).get('step'));
    if (s === 1 || s === 2) {
      setCurrentStep(s);
    }
  }, [location.search]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventDbId, setEventDbId] = useState<string | null>(null);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [hallConfig, setHallConfig] = useState({
    hallName: 'Hall A',
    widthFt: 100,
    heightFt: 80,
  });
  const [stalls, setStalls] = useState<DraftStall[]>([]);

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
  const [basicInfo, setBasicInfo] = useState(getInitialBasicInfo());
  const [studioKey, setStudioKey] = useState<number>(0);

  // Dynamic city list based on selected state, auto-detecting states from city selection
  const availableCities = useMemo(() => {
    return getCitiesForLocation('India', basicInfo.state);
  }, [basicInfo.state]);

  const [isEventCodeCustom, setIsEventCodeCustom] = useState<boolean>(false);
  const [isEditionCustom, setIsEditionCustom] = useState<boolean>(false);
  const [isBookingEndDateCustom, setIsBookingEndDateCustom] = useState<boolean>(false);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);

  // Mandatory Field Validation State & Helpers
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const clearValidationError = useCallback((field: string) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateStep1 = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // 1. Exhibition Event Name
    if (!basicInfo.title || !basicInfo.title.trim()) {
      errors.title = 'Exhibition event name is required';
    }

    // 2. Event Short Code
    if (!basicInfo.eventCode || !basicInfo.eventCode.trim()) {
      errors.eventCode = 'Event short code is required';
    } else {
      const collision = existingEvents.find(
        (e) =>
          e.id !== id &&
          (!e.slug || e.slug !== id) &&
          e.eventCode &&
          e.eventCode.toUpperCase().trim() === basicInfo.eventCode.toUpperCase().trim()
      );
      if (collision) {
        errors.eventCode = `Event short code '${basicInfo.eventCode}' is already in use by '${collision.title}'`;
      }
    }

    // 3. Edition Code
    if (!basicInfo.edition || !basicInfo.edition.trim()) {
      errors.edition = 'Edition code is required';
    }

    // Helper date parsing
    const toDateObj = (d?: string) => {
      if (!d || !d.trim()) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? null : dt;
      }
      const iso = displayInputDateToIso(d);
      const dt = new Date(iso);
      return isNaN(dt.getTime()) ? null : dt;
    };

    // 4. Start Date
    if (!basicInfo.startDate || !basicInfo.startDate.trim()) {
      errors.startDate = 'Exhibition start date is required';
    } else if (!toDateObj(basicInfo.startDate)) {
      errors.startDate = 'Please enter a valid start date (DD/MM/YYYY)';
    }

    // 5. End Date
    if (!basicInfo.endDate || !basicInfo.endDate.trim()) {
      errors.endDate = 'Exhibition end date is required';
    } else if (!toDateObj(basicInfo.endDate)) {
      errors.endDate = 'Please enter a valid end date (DD/MM/YYYY)';
    } else {
      const startDt = toDateObj(basicInfo.startDate);
      const endDt = toDateObj(basicInfo.endDate);
      if (startDt && endDt && endDt < startDt) {
        errors.endDate = 'End date cannot be earlier than start date';
      }
    }

    // 6. Booking Closing Date
    if (!basicInfo.bookingEndDate || !basicInfo.bookingEndDate.trim()) {
      errors.bookingEndDate = 'Booking closing date is required';
    } else if (!toDateObj(basicInfo.bookingEndDate)) {
      errors.bookingEndDate = 'Please enter a valid booking closing date (DD/MM/YYYY)';
    } else {
      const startDt = toDateObj(basicInfo.startDate);
      const bookingEndDt = toDateObj(basicInfo.bookingEndDate);
      if (startDt && bookingEndDt && bookingEndDt > startDt) {
        errors.bookingEndDate = 'Booking closing date cannot be after exhibition start date';
      }
    }

    // 7. Industry / Sector Category
    if (!basicInfo.category || !basicInfo.category.trim()) {
      errors.category = 'Industry / sector category is required';
    }

    // 8. Venue Name
    if (!basicInfo.venue || !basicInfo.venue.trim()) {
      errors.venue = 'Venue / centre name is required';
    }

    // 9. City
    if (!basicInfo.city || !basicInfo.city.trim()) {
      errors.city = 'City is required';
    }

    setValidationErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const fieldOrder = [
        'title',
        'eventCode',
        'edition',
        'startDate',
        'endDate',
        'bookingEndDate',
        'category',
        'venue',
        'city',
      ];
      const firstInvalidField = fieldOrder.find((f) => errors[f]);
      if (firstInvalidField) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstInvalidField}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
              el.focus();
            } else {
              const inp = el.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
              if (inp) inp.focus();
            }
          }
        }, 50);
      }
      return false;
    }

    return true;
  }, [basicInfo, existingEvents, id]);

  const handleContinueToStep2 = useCallback(() => {
    if (isViewMode) {
      setCurrentStep(2);
      return;
    }
    if (validateStep1()) {
      setValidationErrors({});
      setCurrentStep(2);
    }
  }, [isViewMode, validateStep1]);

  const loadEventData = useCallback(async (eventId: string) => {
    try {
      setIsLoadingEvent(true);
      setLoadError(null);
      const data = await exhibitionService.getExhibitionBySlug(eventId);
      if (data) {
        setEventDbId(data.id);
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
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          bannerUrl: data.bannerUrl || '',
          images: data.bannerUrl ? [data.bannerUrl] : [],
          notificationEmails: (data as any).notificationEmails || '',
          latitude: data.latitude ? Number(data.latitude) : undefined,
          longitude: data.longitude ? Number(data.longitude) : undefined,
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

    // Do not auto-save an empty blank draft
    const hasMeaningfulContent =
      !!basicInfo.title.trim() ||
      stalls.length > 0 ||
      (layoutData?.halls && layoutData.halls.length > 0);

    if (!hasMeaningfulContent) {
      if (!id) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      return;
    }

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
  }, [basicInfo, hallConfig, stalls, layoutData, currentStep, DRAFT_STORAGE_KEY, isLoadingEvent, id]);

  // Window beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const hasMeaningfulContent =
          !!basicInfo.title.trim() ||
          stalls.length > 0 ||
          (layoutData?.halls && layoutData.halls.length > 0);
        if (!hasMeaningfulContent) return;

        const draft = {
          basicInfo,
          hallConfig,
          stalls,
          layoutData,
          currentStep,
          timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (_e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [basicInfo, hallConfig, stalls, layoutData, currentStep, DRAFT_STORAGE_KEY]);

  const handleDiscardDraft = async () => {
    const confirmed = await showConfirm({
      title: 'Discard Restored Draft?',
      message: 'Discard the restored draft and start completely clean from scratch? All unsaved hall configurations and event details will be reset.',
      type: 'warning',
      confirmText: 'Discard Draft',
      cancelText: 'Keep Draft',
    });
    if (confirmed) {
      // 1. Remove parent draft keys and all studio autosave keys from localStorage
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem('buoyant_exhibition_draft_new');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('buoyant_studio_autosave_') || key.startsWith('buoyant_exhibition_draft_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (_e) {}

      // 2. Reset event information back to initial blank defaults
      setBasicInfo(getInitialBasicInfo());
      setIsEventCodeCustom(false);
      setIsEditionCustom(false);
      setIsBookingEndDateCustom(false);
      setIsCustomCategory(false);
      setHallConfig({
        hallName: 'Hall A',
        widthFt: 100,
        heightFt: 80,
      });

      // 3. Clear stalls and layout
      setStalls([]);
      setLayoutData(null);
      setHasRestoredDraft(false);
      setCurrentStep(1);

      // 4. Force GenericVisualStudio to mount freshly without retained state
      setStudioKey((prev) => prev + 1);
    }
  };

  // Submit & Publish / Update Exhibition
  const handlePublishExhibition = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      await showAlert({
        title: 'Mandatory Fields Required',
        message: 'Please complete all required fields marked with an asterisk (*) before publishing.',
        type: 'danger',
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const computedBookingEndDate = basicInfo.bookingEndDate
        ? formatIsoWithTime(basicInfo.bookingEndDate, '23:59', 23)
        : basicInfo.startDate
        ? formatIsoWithTime(calculateDefaultBookingEndDate(basicInfo.startDate), '23:59', 23)
        : null;

      if (id || eventDbId) {
        // Updating existing event
        const updatePayload = {
          title: basicInfo.title,
          slug: basicInfo.slug || undefined,
          description: basicInfo.description,
          edition: basicInfo.edition,
          eventCode: basicInfo.eventCode,
          spcode: basicInfo.spcode,
          category: basicInfo.category,
          venue: basicInfo.venue,
          address: basicInfo.address,
          city: basicInfo.city,
          state: basicInfo.state,
          latitude: basicInfo.latitude,
          longitude: basicInfo.longitude,
          startDate: formatIsoWithTime(basicInfo.startDate, basicInfo.startTime, 10),
          endDate: formatIsoWithTime(basicInfo.endDate, basicInfo.endTime, 18),
          bookingEndDate: computedBookingEndDate,
          bannerUrl: basicInfo.bannerUrl || basicInfo.images[0] || '',
          notificationEmails: basicInfo.notificationEmails || null,
          status: basicInfo.status,
          totalStalls: stalls.length,
        };
        const targetId = eventDbId || id;
        await exhibitionService.updateExhibition(targetId!, updatePayload);

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
              name: s.name,
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
          category: basicInfo.category,
          venue: basicInfo.venue,
          address: basicInfo.address,
          city: basicInfo.city,
          state: basicInfo.state,
          latitude: basicInfo.latitude,
          longitude: basicInfo.longitude,
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
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('buoyant_studio_autosave_') || key.startsWith('buoyant_exhibition_draft_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (_e) {}
      navigate('/admin/events');
    } catch (err: any) {
      await showAlert({
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to save exhibition event.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {currentStep === 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mb-1 cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Event Details (Step 1)
              </button>
            ) : (
              <BackButton
                to="/admin/events"
                label="Back to Exhibitions Console"
                variant="ghost"
                size="xs"
                className="text-purple-600 dark:text-purple-400 hover:underline mb-1 p-0"
              />
            )}
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
                onClick={() => navigate(`/admin/events/${id}/edit?step=${currentStep}`)}
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
                  onClick={() => navigate(`/admin/events/${id}/view?step=${currentStep}`)}
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
              onClick={() => navigate(`/admin/events/${id}/edit?step=${currentStep}`)}
              className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-100 shrink-0 cursor-pointer"
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
            onClick={() => {
              if (currentStep === 1) {
                handleContinueToStep2();
              } else {
                setCurrentStep(2);
              }
            }}
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
            onClick={() => {
              if (currentStep === 1) {
                if (validateStep1()) {
                  setValidationErrors({});
                  setCurrentStep(3);
                }
              } else {
                setCurrentStep(3);
              }
            }}
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
              onClick={handleContinueToStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Floor Plan Designer
            </Button>
          </div>

          {/* Validation Errors Notice Banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-900 dark:text-rose-200 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Mandatory Fields Required ({Object.keys(validationErrors).length} missing)
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Please fill in all mandatory fields marked with an asterisk (<span className="font-bold text-rose-600">*</span>) before proceeding to the Floor Plan Designer.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {Object.entries(validationErrors).map(([key, err]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`field-${key}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
                            el.focus();
                          } else {
                            const inp = el.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
                            if (inp) inp.focus();
                          }
                        }
                      }}
                      className="text-[11px] font-semibold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                    >
                      • {err}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  id="field-title"
                  label="Exhibition Event Name"
                  value={basicInfo.title}
                  disabled={isViewMode}
                  error={validationErrors.title}
                  onChange={(e) => {
                    if (isViewMode) return;
                    clearValidationError('title');
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');

                    let newEventCode = basicInfo.eventCode;
                    if (!id && !isEventCodeCustom) {
                      newEventCode = title.trim() ? getUniqueEventShortCode(title, existingEvents, id) : '';
                      if (newEventCode) clearValidationError('eventCode');
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
                      <label htmlFor="field-eventCode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Event Short Code <span className="text-rose-500">*</span>
                      </label>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const auto = basicInfo.title.trim() ? getUniqueEventShortCode(basicInfo.title, existingEvents, id) : '';
                            setIsEventCodeCustom(false);
                            if (auto) clearValidationError('eventCode');
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
                        id="field-eventCode"
                        type="text"
                        value={basicInfo.eventCode}
                        disabled={isViewMode}
                        readOnly={isViewMode}
                        onChange={(e) => {
                          if (isViewMode) return;
                          clearValidationError('eventCode');
                          setIsEventCodeCustom(true);
                          setBasicInfo((prev) => ({
                            ...prev,
                            eventCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
                          }));
                        }}
                        placeholder="Auto-generated on title typing"
                        required
                        className={`w-full bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 px-3 py-2 uppercase transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed ${
                          validationErrors.eventCode
                            ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600'
                        }`}
                      />
                    </div>
                    {validationErrors.eventCode && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{validationErrors.eventCode}</p>
                    )}
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
                      <label htmlFor="field-edition" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Edition Code <span className="text-rose-500">*</span>
                      </label>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const autoEd = getMonthEditionCode(basicInfo.startDate);
                            setIsEditionCustom(false);
                            if (autoEd) clearValidationError('edition');
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
                        id="field-edition"
                        type="text"
                        value={basicInfo.edition}
                        disabled={isViewMode}
                        readOnly={isViewMode}
                        onChange={(e) => {
                          if (isViewMode) return;
                          clearValidationError('edition');
                          setIsEditionCustom(true);
                          setBasicInfo((prev) => ({
                            ...prev,
                            edition: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
                          }));
                        }}
                        placeholder="e.g. 10"
                        maxLength={4}
                        required
                        className={`w-full bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 px-3 py-2 text-center uppercase transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed ${
                          validationErrors.edition
                            ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600'
                        }`}
                      />
                    </div>
                    {validationErrors.edition && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{validationErrors.edition}</p>
                    )}
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
                  id="field-startDate"
                  label="Exhibition Start Date"
                  value={basicInfo.startDate}
                  disabled={isViewMode}
                  error={validationErrors.startDate}
                  onChange={(isoVal) => {
                    if (isViewMode) return;
                    clearValidationError('startDate');
                    setBasicInfo((prev) => {
                      const newEdition = (!id && !isEditionCustom) ? getMonthEditionCode(isoVal) : prev.edition;
                      const newBookingEndDate = !isBookingEndDateCustom ? calculateDefaultBookingEndDate(isoVal) : prev.bookingEndDate;
                      if (newEdition) clearValidationError('edition');
                      if (newBookingEndDate) clearValidationError('bookingEndDate');
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
                  id="field-endDate"
                  label="Exhibition End Date"
                  value={basicInfo.endDate}
                  disabled={isViewMode}
                  error={validationErrors.endDate}
                  onChange={(isoVal) => {
                    if (isViewMode) return;
                    clearValidationError('endDate');
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
                    id="field-bookingEndDate"
                    label="Booking Closing Date"
                    value={basicInfo.bookingEndDate}
                    disabled={isViewMode}
                    error={validationErrors.bookingEndDate}
                    onChange={(isoVal) => {
                      if (isViewMode) return;
                      clearValidationError('bookingEndDate');
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
                <label htmlFor="field-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Industry / Sector Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <select
                    id="field-category"
                    value={PRESET_CATEGORIES.includes(basicInfo.category) ? basicInfo.category : 'OTHER'}
                    disabled={isViewMode}
                    onChange={(e) => {
                      if (isViewMode) return;
                      clearValidationError('category');
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
                    className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 h-[38px] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed ${
                      validationErrors.category
                        ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600'
                    }`}
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
                      id="field-category-custom"
                      placeholder="Enter custom industry sector..."
                      value={basicInfo.category}
                      disabled={isViewMode}
                      error={validationErrors.category}
                      onChange={(e) => {
                        if (isViewMode) return;
                        clearValidationError('category');
                        setBasicInfo({ ...basicInfo, category: e.target.value });
                      }}
                      required
                    />
                  )}
                </div>
                {validationErrors.category && !isCustomCategory && PRESET_CATEGORIES.includes(basicInfo.category) && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{validationErrors.category}</p>
                )}
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
                  Enter venue details below. The map and directions will update automatically based on your address.
                </p>
              </div>
            </div>

            {/* Row 1: Venue Name & Full Street Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="field-venue"
                label="Venue / Centre Name"
                value={basicInfo.venue}
                disabled={isViewMode}
                error={validationErrors.venue}
                onChange={(e) => {
                  if (isViewMode) return;
                  clearValidationError('venue');
                  setBasicInfo({ ...basicInfo, venue: e.target.value });
                }}
                placeholder="e.g. Bombay Exhibition Centre (BEC)"
                required
              />
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
            </div>

            {/* Row 2: State / Region first, then City (filtered by state) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableCombobox
                label="State / Region"
                value={basicInfo.state}
                disabled={isViewMode}
                onChange={(val) => {
                  if (isViewMode) return;
                  setBasicInfo((prev) => ({
                    ...prev,
                    state: val,
                    // If state changed and current city does not match new state, clear city
                    city: prev.city && val ? prev.city : '',
                  }));
                }}
                options={ALL_INDIAN_STATES}
                placeholder="Select or type State first..."
              />
              <SearchableCombobox
                id="field-city"
                label="City"
                required
                value={basicInfo.city}
                disabled={isViewMode}
                error={validationErrors.city}
                onChange={(val) => {
                  if (isViewMode) return;
                  clearValidationError('city');
                  setBasicInfo((prev) => {
                    const next = { ...prev, city: val };
                    if (!prev.state && val) {
                      const detected = getStateForCity(val, 'India');
                      if (detected) next.state = detected;
                    }
                    return next;
                  });
                }}
                options={availableCities}
                placeholder={basicInfo.state ? `Select City in ${basicInfo.state}...` : "Select or type City..."}
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
                  venue: addressData.venue || prev.venue,
                  address: addressData.address || prev.address,
                  city: addressData.city || prev.city,
                  state: addressData.state || prev.state,
                }));
              }}
              heightClass="h-80"
              title="Live Venue Map & Navigation Preview"
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
              images={basicInfo.images || []}
              coverImage={basicInfo.bannerUrl || ''}
              disabled={isViewMode}
              onChangeImages={(newImages, newCover) => {
                if (isViewMode) return;
                setBasicInfo((prev) => ({
                  ...prev,
                  images: newImages,
                  bannerUrl: newCover || newImages[0] || '',
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
              onClick={handleContinueToStep2}
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
            key={studioKey}
            exhibitionTitle={basicInfo.title || 'Untitled Exhibition'}
            initialLayoutData={layoutData}
            initialStalls={stalls as any}
            isViewOnly={isViewMode}
            onBack={() => setCurrentStep(1)}
            onChangeLayout={({ layoutData: currentLayout, stalls: currentStalls }) => {
              setLayoutData(currentLayout);
              setStalls(currentStalls as any);
            }}
            onSaveLayout={async ({ layoutData: savedLayout, stalls: savedStalls }) => {
              setLayoutData(savedLayout);
              setStalls(savedStalls as any);
              try {
                const existingId = eventDbId || id;
                if (existingId && floorPlanId) {
                  await exhibitionService.updateExhibition(existingId, {
                    title: basicInfo.title,
                    description: basicInfo.description,
                    venue: basicInfo.venue,
                    address: basicInfo.address,
                    city: basicInfo.city,
                    state: basicInfo.state,
                    latitude: basicInfo.latitude,
                    longitude: basicInfo.longitude,
                    category: basicInfo.category,
                    totalStalls: savedStalls.length,
                  });
                  await floorPlanService.syncFloorPlan(floorPlanId, {
                    name: hallConfig.hallName,
                    width: savedLayout.canvasWidth,
                    height: savedLayout.canvasHeight,
                    layoutData: savedLayout,
                    stalls: savedStalls,
                  });
                  await showAlert({
                    title: 'Floor Plan Saved',
                    message: 'Floor plan layout saved successfully to database!',
                    type: 'success',
                  });
                } else if (existingId && !floorPlanId) {
                  const ev = await exhibitionService.getExhibitionBySlug(existingId);
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
                    await showAlert({
                      title: 'Floor Plan Saved',
                      message: 'Floor plan layout saved successfully to database!',
                      type: 'success',
                    });
                  } else {
                    const updated = await exhibitionService.updateExhibition(ev?.id || existingId, {
                      title: basicInfo.title,
                      description: basicInfo.description,
                      venue: basicInfo.venue,
                      address: basicInfo.address,
                      city: basicInfo.city,
                      state: basicInfo.state,
                      latitude: basicInfo.latitude,
                      longitude: basicInfo.longitude,
                      category: basicInfo.category,
                      totalStalls: savedStalls.length,
                      floorPlans: [
                        {
                          name: hallConfig.hallName || 'Hall A',
                          width: savedLayout.canvasWidth || 1400,
                          height: savedLayout.canvasHeight || 850,
                          layoutData: savedLayout,
                          stalls: savedStalls.map((s) => ({
                            stallNumber: s.stallNumber,
                            name: s.name,
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
                    });
                    if (updated?.floorPlans?.[0]?.id) {
                      setFloorPlanId(updated.floorPlans[0].id);
                    }
                    await showAlert({
                      title: 'Floor Plan Saved',
                      message: 'Floor plan layout created and saved successfully to database!',
                      type: 'success',
                    });
                  }
                } else {
                  const payload = {
                    title: basicInfo.title || 'Untitled Exhibition',
                    description: basicInfo.description,
                    edition: basicInfo.edition || undefined,
                    eventCode: basicInfo.eventCode || undefined,
                    spcode: basicInfo.spcode || undefined,
                    category: basicInfo.category,
                    venue: basicInfo.venue || 'Exhibition Venue',
                    address: basicInfo.address,
                    city: basicInfo.city || 'City',
                    state: basicInfo.state,
                    latitude: basicInfo.latitude,
                    longitude: basicInfo.longitude,
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
                          name: s.name,
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
                  if (created?.id) {
                    setEventDbId(created.id);
                  }
                  if (created?.slug) {
                    navigate(`/admin/events/${created.slug}/edit`, { replace: true });
                  }
                  await showAlert({
                    title: 'Floor Plan Saved',
                    message: 'Exhibition draft and floor plan saved successfully to database!',
                    type: 'success',
                  });
                }
              } catch (err: any) {
                console.error('Failed to save layout:', err);
                await showAlert({
                  title: 'Save Failed',
                  message: err?.response?.data?.message || err?.message || 'Failed to save floor plan layout to database.',
                  type: 'danger',
                });
              }
            }}
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
      {currentStep === 3 && (() => {
        const availableStallsCount = stalls.filter((s) => s.status === 'AVAILABLE').length;
        const blockedStallsCount = stalls.filter((s) => s.status === 'BLOCKED').length;
        const totalValuation = stalls.reduce((sum, s) => sum + s.price, 0);
        const standardStalls = stalls.filter((s) => s.category === 'STANDARD');
        const premiumStalls = stalls.filter((s) => s.category === 'PREMIUM');
        const cornerStalls = stalls.filter((s) => s.category === 'CORNER');
        const islandStalls = stalls.filter((s) => s.category === 'ISLAND');
        const clientRegPreview = `${basicInfo.edition || '10'}/${
          basicInfo.startDate ? new Date(basicInfo.startDate).getFullYear().toString().slice(-2) : '26'
        }/${basicInfo.eventCode || 'GT-01'}/01`;
        const mapsUrl = `https://www.google.com/maps?q=${basicInfo.latitude},${basicInfo.longitude}`;

        return (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Pre-flight Review
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">Final Verification Gate</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Eye className="w-6 h-6 text-purple-600" />
                  Step 3: Review &amp; Publish Exhibition
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                  Review event details, venue logistics, stall architectural scale, and commercial inventory valuation before launching.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  className="hover:border-purple-300 text-slate-700 hover:text-purple-700 text-xs sm:text-sm"
                >
                  Back to Floor Plan Designer
                </Button>
              </div>
            </div>

            {/* Hero Event Showcase Banner (Pure Light Theme) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Visual Banner Media */}
              <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-purple-100 via-indigo-50 to-pink-50 overflow-hidden border-b border-slate-200">
                {basicInfo.bannerUrl ? (
                  <img
                    src={basicInfo.bannerUrl}
                    alt={basicInfo.title || 'Event Banner'}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <ImageIcon className="w-10 h-10 text-purple-300" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Event Banner Preview
                    </span>
                  </div>
                )}
                {/* Floating Top Status Tags */}
                <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 text-purple-700 rounded-full text-xs font-bold tracking-wide uppercase shadow-xs pointer-events-auto">
                      {basicInfo.category || 'General Exhibition'}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50/95 backdrop-blur-md border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs pointer-events-auto">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Ready to Publish
                    </span>
                  </div>
                  <div className="px-3.5 py-1 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 font-mono text-xs font-bold rounded-full flex items-center gap-2 shadow-xs pointer-events-auto">
                    <span>Edition: <strong className="text-purple-700">{basicInfo.edition || '10'}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Code: <strong className="text-indigo-700">{basicInfo.eventCode || 'GT-01'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Banner Showcase Details Bar */}
              <div className="p-5 sm:p-7 space-y-3 bg-white">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {basicInfo.title || 'Untitled Exhibition Event'}
                </h1>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="font-semibold text-slate-800">{basicInfo.venue || 'Venue Pending'}, {basicInfo.city || 'City'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      {formatDisplayDate(basicInfo.startDate)} to {formatDisplayDate(basicInfo.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      {formatTimeDisplay(basicInfo.startTime)} – {formatTimeDisplay(basicInfo.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid: Specs (2 cols) & Valuation Hub (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Left 2 Columns: Structured Event Specifications */}
              <div className="lg:col-span-2 space-y-6">

                {/* Event Core Identity & Administrative Codes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Event Identity &amp; Administrative Codes
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest bg-slate-100 px-2 py-0.5 rounded font-semibold">
                      STEP 1 VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Title & Category */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Title &amp; Category</span>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{basicInfo.title}</p>
                      <p className="text-xs text-purple-700 font-semibold">{basicInfo.category}</p>
                    </div>

                    {/* SP Allocation Code */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SP Code (Admin/Staff Allocation)</span>
                      <div>
                        <span className="font-mono font-bold bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg text-xs tracking-wider inline-block">
                          {basicInfo.spcode || 'B001'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Staff routing and commercial sales allocation identifier</p>
                    </div>

                    {/* Edition & Event Code */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Edition &amp; Short Code</span>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                          Edition: {basicInfo.edition || '10'}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                          Code: {basicInfo.eventCode || 'GT-01'}
                        </span>
                      </div>
                    </div>

                    {/* Client Reg No Preview */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Reg No Preview</span>
                      <div>
                        <code className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs tracking-wider inline-block">
                          {clientRegPreview}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-500">Standard serial stamped on verified exhibitor registrations</p>
                    </div>
                  </div>
                </div>

                {/* Dates & Schedule */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Dates, Visiting Hours &amp; Booking Cut-Off
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exhibition Dates</span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatDisplayDate(basicInfo.startDate)}
                      </p>
                      <p className="text-[11px] text-slate-500">to {formatDisplayDate(basicInfo.endDate)}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Visiting Hours</span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatTimeDisplay(basicInfo.startTime)} – {formatTimeDisplay(basicInfo.endTime)}
                      </p>
                      <p className="text-[11px] text-slate-500">Standard exhibition visiting window</p>
                    </div>

                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Stall Booking Cut-Off</span>
                      <p className="text-xs sm:text-sm font-bold text-purple-900">
                        {formatDisplayDate(basicInfo.bookingEndDate) || '15 Days Prior'}
                      </p>
                      <p className="text-[11px] text-purple-600 font-medium">Automatic portal hold cut-off</p>
                    </div>
                  </div>
                </div>

                {/* Venue & Geographic Coordinates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Venue &amp; Geographic Coordinates
                    </h3>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-semibold"
                    >
                      <span>View in Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Venue Location</span>
                      <p className="text-sm font-bold text-slate-900">{basicInfo.venue || 'Venue Pending'}</p>
                      <p className="text-xs text-slate-600">{basicInfo.city || 'City'}, {basicInfo.state || 'State'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pin Map Coordinates</span>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
                        <Compass className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>
                          {basicInfo.latitude != null && basicInfo.longitude != null
                            ? `${basicInfo.latitude.toFixed(4)}° N, ${basicInfo.longitude.toFixed(4)}° E`
                            : 'Auto-resolved from Venue'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Calibrated interactive map location</p>
                    </div>
                  </div>

                  {/* Gallery Media Thumbnail Strip */}
                  {basicInfo.images && basicInfo.images.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                          Gallery Media ({basicInfo.images.length} Image{basicInfo.images.length > 1 ? 's' : ''} Attached)
                        </span>
                      </div>
                      <div className="flex gap-2.5 overflow-x-auto pb-2">
                        {basicInfo.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={imgUrl}
                              alt={`Gallery ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hall Layout & Architecture */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      Hall Layout Architecture &amp; Stall Inventory
                    </h3>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                      {stalls.length} Total Configured Stalls
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Hall</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{hallConfig.hallName || 'Main Hall'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Halls / Pavilions</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{layoutData?.halls?.length || 1} Configured</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Canvas Scale</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{hallConfig.widthFt} ft × {hallConfig.heightFt} ft</p>
                    </div>
                  </div>

                  {/* Category Breakdown Chips */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stall Category Distribution</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-1">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Standard</div>
                        <div className="text-xl font-extrabold text-emerald-700 font-mono">{standardStalls.length}</div>
                        <div className="text-[11px] text-emerald-600 font-mono">
                          {standardStalls.length > 0 ? `₹${standardStalls[0].price.toLocaleString()}/ea` : '—'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 space-y-1">
                        <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Premium</div>
                        <div className="text-xl font-extrabold text-blue-700 font-mono">{premiumStalls.length}</div>
                        <div className="text-[11px] text-blue-600 font-mono">
                          {premiumStalls.length > 0 ? `₹${premiumStalls[0].price.toLocaleString()}/ea` : '—'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 space-y-1">
                        <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Corner</div>
                        <div className="text-xl font-extrabold text-purple-700 font-mono">{cornerStalls.length}</div>
                        <div className="text-[11px] text-purple-600 font-mono">
                          {cornerStalls.length > 0 ? `₹${cornerStalls[0].price.toLocaleString()}/ea` : '—'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1">
                        <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">VIP Island</div>
                        <div className="text-xl font-extrabold text-amber-700 font-mono">{islandStalls.length}</div>
                        <div className="text-[11px] text-amber-600 font-mono">
                          {islandStalls.length > 0 ? `₹${islandStalls[0].price.toLocaleString()}/ea` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Commercial Valuation Hub & Publishing Action (Pure Light Theme) */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-6">
                  {/* Valuation Header */}
                  <div className="border-b border-slate-100 pb-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
                          Overview
                        </h4>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 ml-9">
                      Live stall commercial pricing
                    </p>
                  </div>

                  {/* Inventory Metrics */}
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Available Stalls:</span>
                      <span className="font-bold text-emerald-600 text-sm font-mono">{availableStallsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Blocked Stalls:</span>
                      <span className="font-bold text-amber-600 text-sm font-mono">{blockedStallsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Configured Units:</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">{stalls.length}</span>
                    </div>
                  </div>

                  {/* Total Potential Value Highlight (Crisp Light Gradient) */}
                  <div className="bg-gradient-to-br from-purple-50 via-indigo-50/40 to-white border border-purple-200 rounded-xl p-5 space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-bold tracking-widest text-purple-700 uppercase">
                      TOTAL POTENTIAL VALUE
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-purple-950 font-mono tracking-tight">
                      ₹{totalValuation.toLocaleString()} <span className="text-xs font-semibold text-purple-600 font-sans">INR</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Commercial inventory across {stalls.length} published units.
                    </p>
                  </div>

                  {/* Pre-flight Checklist */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pre-flight Checklist</span>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Venue logistics &amp; timings confirmed</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{stalls.length} stalls mapped to interactive canvas</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Reg format: {clientRegPreview}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Cut-off: {formatDisplayDate(basicInfo.bookingEndDate) || '15 Days Prior'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Publishing Action CTA */}
                  <div className="space-y-3 pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full font-bold shadow-sm bg-purple-600 hover:bg-purple-700 text-white border-0 py-3 text-sm flex items-center justify-center gap-2"
                      onClick={handlePublishExhibition}
                      isLoading={isSubmitting}
                      rightIcon={<Check className="w-4 h-4" />}
                    >
                      {id ? 'Save & Update Exhibition Changes' : 'Publish Exhibition & Launch Stalls'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50 text-xs"
                      onClick={() => setCurrentStep(2)}
                    >
                      Adjust Floor Plan in Step 2
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
