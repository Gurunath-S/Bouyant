import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { Exhibition, Stall } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { EventCountdownTimer } from '../../../components/ui/EventCountdownTimer';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Check,
  Share2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Lock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { FloorPlanCanvas } from '../../floor-plan/components/FloorPlanCanvas';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { useAuthStore } from '../../../stores/authStore';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { formatDisplayDate, formatExhibitionOperatingHours } from '../../../utils/date';
import { showAlert } from '../../../stores/dialogStore';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';
import { BackButton } from '../../../components/ui/BackButton';
import { getDashboardUrl } from '../../../utils/navigation';

export const ExhibitionDetailPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromQuery = searchParams.get('from');
  const fromReferrer = (location.state as any)?.from || fromQuery;
  const fromReferrerLabel =
    (location.state as any)?.fromLabel ||
    (fromReferrer?.includes('register')
      ? 'Back to Event Registration Hub'
      : fromReferrer?.includes('events')
      ? 'Back to Exhibitions Console'
      : undefined);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const { selectedStallIds, toggleStallSelection, clearStallSelection: _clearStallSelection } = useFloorPlanStore();

  const isBookingClosed = React.useMemo(() => {
    if (!exhibition) return false;
    if (exhibition.status === 'COMPLETED' || exhibition.status === 'CANCELLED' || exhibition.status === 'DRAFT') {
      return true;
    }
    const now = new Date();
    if (exhibition.bookingEndDate && now > new Date(exhibition.bookingEndDate)) {
      return true;
    }
    if (!exhibition.bookingEndDate && exhibition.startDate) {
      const defaultDeadline = new Date(new Date(exhibition.startDate).getTime() - 15 * 24 * 60 * 60 * 1000);
      if (now > defaultDeadline) return true;
    }
    if (exhibition.endDate && now > new Date(exhibition.endDate)) {
      return true;
    }
    return false;
  }, [exhibition]);

  const bookingCloseDisplay = React.useMemo(() => {
    if (!exhibition) return '';
    if (exhibition.bookingEndDate) return formatDisplayDate(exhibition.bookingEndDate);
    if (exhibition.startDate) {
      const defaultDeadline = new Date(new Date(exhibition.startDate).getTime() - 15 * 24 * 60 * 60 * 1000);
      return formatDisplayDate(defaultDeadline.toISOString());
    }
    return '';
  }, [exhibition]);

  const lowestStallPrice = React.useMemo(() => {
    if (!stalls || stalls.length === 0) return null;
    const validPrices = stalls
      .map((s) => Number(s.price))
      .filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length === 0) return null;
    return Math.min(...validPrices);
  }, [stalls]);

  const durationDays = React.useMemo(() => {
    if (!exhibition?.startDate || !exhibition?.endDate) return null;
    const start = new Date(exhibition.startDate);
    const end = new Date(exhibition.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    return `${diffDays} Day${diffDays > 1 ? 's' : ''} Expo`;
  }, [exhibition?.startDate, exhibition?.endDate]);

  const operatingHours = React.useMemo(() => {
    return formatExhibitionOperatingHours(exhibition);
  }, [exhibition]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleViewLocation = () => {
    scrollToSection('section-venue-location');
  };

  const [currentUpcomingEvent, setCurrentUpcomingEvent] = useState<Exhibition | null>(null);

  async function fetchCurrentUpcoming() {
    try {
      const all = await exhibitionService.getExhibitions('PUBLISHED');
      const now = new Date();
      const active = all.filter((e) => new Date(e.endDate) >= now);
      if (active.length > 0) {
        active.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setCurrentUpcomingEvent(active[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchExhibition() {
    try {
      setLoading(true);
      const expo = await exhibitionService.getExhibitionBySlug(slug!);
      setExhibition(expo);

      if (expo.floorPlans && expo.floorPlans.length > 0) {
        const fp = expo.floorPlans[0];
        if (fp.backgroundUrl) {
          try {
            setLayoutData(JSON.parse(fp.backgroundUrl));
          } catch (e) {
            console.warn('Failed to parse floor plan layout', e);
          }
        }
        const stallsData = fp.stalls && fp.stalls.length > 0
          ? fp.stalls
          : await stallService.getStallsByFloorPlan(fp.id);
        setStalls(stallsData || []);
      } else {
        setStalls([]);
      }
    } catch (err) {
      console.error('Failed to load exhibition details:', err);
      setStalls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setActivePhotoIndex(0);
    fetchExhibition();
    fetchCurrentUpcoming();
  }, [slug]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#1E3FA0] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#121B3D] dark:text-slate-300">Loading Event Profile...</p>
      </div>
    );
  }

  const getBackConfig = () => {
    if (fromReferrer) {
      return { to: fromReferrer, label: fromReferrerLabel || 'Back to Event Registration Hub' };
    }
    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'STAFF') {
      return { to: '/workspace/events/register', label: 'Back to Event Registration Hub' };
    }
    return { to: '/exhibitions', label: 'Back to All Exhibitions' };
  };

  const backConfig = getBackConfig();

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Event Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">The requested exhibition could not be located in our directory.</p>
        <div className="flex justify-center">
          <BackButton to={backConfig.to} label={backConfig.label} variant="outline" />
        </div>
      </div>
    );
  }

  const isCurrentUpcoming = !currentUpcomingEvent || (exhibition && exhibition.id === currentUpcomingEvent.id);
  const totalSlots = stalls.length > 0
    ? stalls.length
    : (typeof exhibition.totalStalls === 'number' && exhibition.totalStalls > 0)
    ? exhibition.totalStalls
    : typeof exhibition.bookedStallsCount === 'number' && typeof exhibition.availableStallsCount === 'number'
    ? exhibition.bookedStallsCount + exhibition.availableStallsCount
    : 0;

  const availableCount = stalls.length > 0
    ? stalls.filter((s) => s.status === 'AVAILABLE').length
    : typeof exhibition.availableStallsCount === 'number'
    ? exhibition.availableStallsCount
    : Math.max(0, totalSlots - (exhibition.bookedStallsCount || 0));

  const registeredCount = stalls.length > 0
    ? stalls.filter((s) => s.status !== 'AVAILABLE').length
    : typeof exhibition.bookedStallsCount === 'number'
    ? exhibition.bookedStallsCount
    : Math.max(0, totalSlots - availableCount);

  const fillPercentage = totalSlots > 0 ? Math.min(100, Math.round((registeredCount / totalSlots) * 100)) : 0;
  const isFull = exhibition.isFull === true || (totalSlots > 0 && availableCount <= 0);

  const allEventImages = Array.isArray(exhibition.images) && exhibition.images.length > 0
    ? exhibition.images.filter(Boolean)
    : (exhibition.bannerUrl ? [exhibition.bannerUrl] : []);

  const currentBannerImg = allEventImages[activePhotoIndex] || exhibition.bannerUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 font-sans selection:bg-[#0E8074] selection:text-white transition-colors duration-200">
      {/* Back Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-wrap items-center justify-between gap-3">
        <BackButton to={backConfig.to} label={backConfig.label} />
        {isAuthenticated && (
          <Link
            to={getDashboardUrl(user?.role)}
            className="text-xs font-bold text-slate-500 hover:text-[#09539b] dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
          >
            Go to {user?.role === 'SUPERADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Admin' : user?.role === 'STAFF' ? 'Staff' : 'Exhibitor'} Dashboard →
          </Link>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILS HERO BANNER & MULTI-MEDIA CAROUSEL */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div
          className="h-64 sm:h-[360px] rounded-2xl sm:rounded-3xl bg-cover bg-center relative overflow-hidden flex items-end shadow-md border border-[#E6EAF0] dark:border-slate-800 transition-all duration-500"
          style={{ backgroundImage: `url(${currentBannerImg})` }}
        >
          {/* Banner Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F294D] via-[#0F294D]/40 to-transparent" />

          {/* Navigation Arrows when multiple images are uploaded */}
          {allEventImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allEventImages.length - 1));
                }}
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 cursor-pointer shadow-md border border-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIndex((prev) => (prev < allEventImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 cursor-pointer shadow-md border border-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          <div className="relative z-10 p-5 sm:p-8 text-white space-y-2.5 w-full">
            <div className="flex items-center justify-between gap-3">
              <span className="bg-[#0E8074] text-white font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                {exhibition.category || 'Exhibition'}
              </span>
              {allEventImages.length > 1 && (
                <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white font-mono text-xs font-bold border border-white/20">
                  {activePhotoIndex + 1} / {allEventImages.length} Photos
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight max-w-3xl drop-shadow-md">
              {exhibition.title}
            </h1>
          </div>
        </div>

        {/* Thumbnail Navigation Strip */}
        {allEventImages.length > 1 && (
          <div className="flex items-center gap-2.5 overflow-x-auto py-3 scrollbar-thin">
            {allEventImages.map((img, idx) => {
              const isSelected = idx === activePhotoIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative h-14 sm:h-16 w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-[#0E8074] ring-2 ring-[#0E8074]/40 scale-102'
                      : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-400'
                  }`}
                >
                  <img src={img} alt={`Event photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {img === exhibition.bannerUrl && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-[#0E8074] text-[8px] font-bold text-white rounded">
                      Cover
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILS LAYOUT GRID (MAIN CONTENT + STICKY SIDEBAR) */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start pb-20">
        {/* Left Main Content (8 Spans) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Info Deck: Date, Time & Venue Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* 1. Date & Duration Card */}
            <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1E3FA0] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                    Date
                  </span>
                </div>

                <div className="mt-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Event Dates
                  </div>
                  <div className="text-base font-bold text-[#121B3D] dark:text-slate-100 font-sora leading-snug">
                    {formatDisplayDate(exhibition.startDate)} – {formatDisplayDate(exhibition.endDate)}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Official Expo Schedule
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {durationDays || 'Multi-Day Event'}
                </span>
              </div>
            </div>

            {/* 2. Time & Operating Hours Card */}
            <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                    Time
                  </span>
                </div>

                <div className="mt-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Operating Hours
                  </div>
                  <div className="text-base font-bold text-[#121B3D] dark:text-slate-100 font-sora leading-snug">
                    {operatingHours.hours}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {operatingHours.subtitle}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Daily Expo & Visitor Access
                </span>
              </div>
            </div>

            {/* 3. Venue & City Location Card */}
            <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0E8074] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50">
                    Location
                  </span>
                </div>

                <div className="mt-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Venue Location
                  </div>
                  <div className="text-base font-bold text-[#121B3D] dark:text-slate-100 font-sora leading-snug" title={`${exhibition.venue}, ${exhibition.city}`}>
                    {exhibition.venue}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {exhibition.city}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleViewLocation}
                  className="inline-flex items-center gap-1.5 font-bold text-[#0E8074] dark:text-emerald-400 hover:text-[#09574e] dark:hover:text-emerald-300 transition-colors group/link cursor-pointer"
                >
                  <span>Interactive Map</span>
                  <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section: About Event */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#121B3D] dark:text-slate-100">About this event</h3>
            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              {exhibition.description}
            </p>
          </div>

          {/* Section: Organizer Card */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#121B3D] dark:text-slate-100">Organizer</h3>
            <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#121B3D] dark:bg-blue-600 text-white flex items-center justify-center font-bold font-sora text-base shrink-0">
                BM
              </div>
              <div>
                <div className="font-bold text-[#121B3D] dark:text-slate-100 text-base">Buoyant Media & Trade Fairs</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Official Event Organizer · 40+ events hosted</div>
              </div>
            </div>
          </div>

          {/* Section: Event Photos & Media Gallery */}
          {allEventImages.length > 1 && (
            <div className="space-y-4 bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#0E8074]" />
                  <span>Event Photos & Media Gallery ({allEventImages.length})</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Click any image to view in main banner</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                {allEventImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActivePhotoIndex(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`group relative h-28 sm:h-32 rounded-xl overflow-hidden border cursor-pointer transition-all shadow-2xs ${
                      idx === activePhotoIndex
                        ? 'border-[#0E8074] ring-2 ring-[#0E8074]/40'
                        : 'border-slate-200 dark:border-slate-700 hover:border-[#0E8074]'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Event media ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                        View Photo
                      </span>
                    </div>
                    {img === exhibition.bannerUrl && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#0E8074] text-[8px] font-bold text-white rounded shadow-xs">
                        Cover Banner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPEN CONTENT SECTIONS (ALL VISIBLE IN OPEN AREA) */}
          {/* ========================================================================= */}
          <div className="space-y-8 pt-2">
            {/* Interactive Floor Plan Stall Map */}
            <div id="section-stall-map" className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#1B37A0] dark:text-blue-400 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#1E3FA0] dark:text-blue-400" />
                    <span>Interactive Floor Plan & Stall Map</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Explore exhibition booths, verify dimensions, and click any available stall to reserve immediately.
                  </p>
                </div>
                {!isBookingClosed && (
                  <Link
                    to={`/exhibitions/${slug}/book${fromReferrer ? `?from=${encodeURIComponent(fromReferrer)}` : ''}`}
                    state={{ from: fromReferrer, fromLabel: fromReferrerLabel }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3FA0] dark:text-blue-400 hover:underline shrink-0"
                  >
                    <span>Full Wizard View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {isBookingClosed && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Stall Bookings Closed:</strong> Online registration for this exhibition closed on <strong>{bookingCloseDisplay}</strong>. The floor plan is currently in view-only mode.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded shrink-0">
                    Booking Closed
                  </span>
                </div>
              )}

              <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 max-w-[1200px] mx-auto">
                <FloorPlanCanvas
                  stalls={stalls}
                  layoutData={layoutData}
                  className="w-full h-[500px] sm:h-[540px]"
                  onStallSelect={(s) => {
                    if (isBookingClosed) return;
                    if (s.status === 'AVAILABLE') toggleStallSelection(s);
                  }}
                />
              </div>

              {/* Selected Stall Quick Action Box */}
              {!isBookingClosed && selectedStallIds.length > 0 && (() => {
                const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
                if (selectedStallsObj.length === 0) return null;

                const totalArea = selectedStallsObj.reduce((sum, s) => sum + s.areaSqFt, 0);
                const totalPrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
                const stallNumbers = selectedStallsObj.map((s) => s.stallNumber).join(', ');

                return (
                  <div className="p-4 bg-[#EEF4FC] dark:bg-blue-950/40 border-2 border-[#1E3FA0] dark:border-blue-500 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#121B3D] dark:text-slate-100 text-base font-mono">
                          Stalls: {stallNumbers}
                        </span>
                        <span className="px-2.5 py-0.5 bg-[#0E8074] text-white text-[10px] font-bold rounded-full uppercase">
                          {selectedStallsObj.length} Selected
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {selectedStallsObj.map(s => `${s.stallNumber}: ${s.actualWidth && s.actualHeight ? `${s.actualWidth}m × ${s.actualHeight}m` : `${(s.width / 20).toFixed(1)}m × ${(s.height / 20).toFixed(1)}m`}`).join(' | ')} ({totalArea} Sq.Ft) • Total Rental: <b className="text-[#1E3FA0] dark:text-blue-400 font-mono">₹{totalPrice.toLocaleString()} + GST</b>
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/exhibitions/${slug}/book?stallIds=${selectedStallIds.join(',')}${
                            fromReferrer ? `&from=${encodeURIComponent(fromReferrer)}` : ''
                          }`,
                          { state: { from: fromReferrer, fromLabel: fromReferrerLabel } }
                        )
                      }
                      className="bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shrink-0 cursor-pointer"
                    >
                      Book Selected Stalls <ArrowRight className="w-4 h-4 text-[#84CC16]" />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Venue & Location Map */}
            <div id="section-venue-location" className="space-y-4 scroll-mt-24">
              <h3 className="text-lg font-bold text-[#1B37A0] dark:text-blue-400 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0E8074]" />
                <span>Venue & Location Navigation</span>
              </h3>

              <InteractivePinMap
                venueName={exhibition.venue}
                cityName={exhibition.city}
                address={exhibition.address || undefined}
                readOnly={true}
                title={`Interactive Venue Map & Navigation — ${exhibition.venue}, ${exhibition.city}`}
                heightClass="h-96"
              />

              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs shadow-xs">
                <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                  <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Convention Centre</span>
                  <p className="text-slate-600 dark:text-slate-300">{exhibition.venue}</p>
                  {exhibition.address && (
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{exhibition.address}</p>
                  )}
                </div>
                <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                  <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Host City</span>
                  <p className="text-slate-600 dark:text-slate-300">{exhibition.city}</p>
                </div>
                <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                  <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Parking & Transit</span>
                  <p className="text-slate-600 dark:text-slate-300">On-site visitor parking & VIP delegate drop-off zones available.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar (4 Spans) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          {/* Register Card */}
          <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            {/* Price Row */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#121B3D] dark:text-slate-100 font-sora">
                  {lowestStallPrice !== null ? `₹${lowestStallPrice.toLocaleString('en-IN')}` : 'Stalls Available'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {lowestStallPrice !== null ? 'starting stall price' : 'for booking'}
                </span>
              </div>
              <p className="text-[11px] text-[#09539b] dark:text-blue-400 font-semibold">
                Lowest available booth rate for this exhibition
              </p>
            </div>

            {/* LIVE EVENT COUNTDOWN TIMER */}
            <div className="pt-1">
              <EventCountdownTimer targetDate={exhibition.startDate} />
            </div>

            {/* Slot Track with Clean Spacing Gap */}
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Stall Availability Status</span>
                <span className="text-[#1E3FA0] dark:text-blue-400">
                  <b className="font-bold">{availableCount}</b> {availableCount === 1 ? 'stall' : 'stalls'} available
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E6EAF0] dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0E8074] to-[#1E3FA0] rounded-full transition-all duration-500"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{registeredCount} / {totalSlots} stalls booked ({fillPercentage}%)</span>
                <span>{fillPercentage >= 100 ? 'Fully Booked' : 'Open for Booking'}</span>
              </div>
            </div>

            {/* Book Stall Action Button — Clear Gap Above & Below */}
            <div className="pt-2">
              {exhibition.status !== 'PUBLISHED' ? (
                <div className="w-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs py-3.5 px-4 rounded-xl flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                  <span className="text-amber-900 dark:text-amber-100 font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Bookings Closed For This Event
                  </span>
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    This exhibition is currently in <strong>{exhibition.status}</strong> mode and not open for booking.
                  </span>
                </div>
              ) : isBookingClosed ? (
                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm py-3.5 px-4 rounded-xl flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                  <span className="text-slate-700 dark:text-slate-200 font-extrabold">Stall Bookings Closed</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Registration cut-off date was {bookingCloseDisplay}
                  </span>
                </div>
              ) : isFull ? (
                <button
                  type="button"
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-extrabold text-base py-4 px-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed shadow-none select-none transition-colors"
                  title="All stalls are booked for this exhibition"
                >
                  <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <span>Fully Booked</span>
                </button>
              ) : (
                <Link
                  to={`/exhibitions/${slug}/book${fromReferrer ? `?from=${encodeURIComponent(fromReferrer)}` : ''}`}
                  state={{ from: fromReferrer, fromLabel: fromReferrerLabel }}
                >
                  <button className="w-full bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-extrabold text-base py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer">
                    Book Stall
                    <ArrowRight className="w-5 h-5 text-[#84CC16]" />
                  </button>
                </Link>
              )}
            </div>

            {/* Value Checklist */}
            <ul className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074]" />
                <span>Instant e-ticket & GST invoice via email</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074]" />
                <span>Access to all technical sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074]" />
                <span>B2B Networking lounge access</span>
              </li>
            </ul>
          </div>

          {/* Share Card */}
          <div className="bg-[#121B3D] text-white rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-sm">Know someone who'd love this?</h4>
              <p className="text-xs text-slate-300 mt-0.5">Share this event with your network</p>
            </div>
            <button
              onClick={async () => {
                if (navigator.share) {
                  navigator.share({ title: exhibition.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  await showAlert({
                    title: 'Link Copied',
                    message: 'Event link has been copied to your clipboard!',
                    type: 'success',
                  });
                }
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
              title="Share event"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
