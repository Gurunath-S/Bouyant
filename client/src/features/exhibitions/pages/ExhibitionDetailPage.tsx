import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Building,
  Award,
  ShieldCheck,
  LayoutGrid,
  Users,
  Check,
  Share2,
  CheckCircle,
  Layers,
  Info,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { FloorPlanCanvas } from '../../floor-plan/components/FloorPlanCanvas';
import { StallFilterBar } from '../../floor-plan/components/StallFilterBar';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { formatDisplayDate } from '../../../utils/date';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';

export const ExhibitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'pricing' | 'schedule' | 'location'>('overview');
  const { selectedStallIds, toggleStallSelection, clearStallSelection } = useFloorPlanStore();

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

  const [currentUpcomingEvent, setCurrentUpcomingEvent] = useState<Exhibition | null>(null);

  useEffect(() => {
    fetchExhibition();
    fetchCurrentUpcoming();
  }, [slug]);

  const fetchCurrentUpcoming = async () => {
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
  };

  const fetchExhibition = async () => {
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
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#1E3FA0] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#121B3D] dark:text-slate-300">Loading Event Profile...</p>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Event Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">The requested exhibition could not be located in our directory.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to all events
        </Button>
      </div>
    );
  }

  const isCurrentUpcoming = !currentUpcomingEvent || (exhibition && exhibition.id === currentUpcomingEvent.id);
  const availableCount = stalls.filter((s) => s.status === 'AVAILABLE').length || exhibition.totalStalls || 45;
  const registeredCount = stalls.length > 0 ? stalls.length - availableCount : 120;
  const totalSlots = stalls.length || (availableCount + registeredCount);
  const fillPercentage = Math.min(100, Math.round((registeredCount / totalSlots) * 100));

  const bannerImg = exhibition.bannerUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 font-sans selection:bg-[#0E8074] selection:text-white transition-colors duration-200">
      {/* Back Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#121B3D] dark:hover:text-slate-100 font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all events
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* DETAILS HERO BANNER */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div
          className="h-64 sm:h-[340px] rounded-2xl sm:rounded-3xl bg-cover bg-center relative overflow-hidden flex items-end shadow-md border border-[#E6EAF0] dark:border-slate-800"
          style={{ backgroundImage: `url(${bannerImg})` }}
        >
          {/* Banner Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F294D] via-[#0F294D]/40 to-transparent" />

          <div className="relative z-10 p-5 sm:p-8 text-white space-y-2.5">
            <span className="bg-[#0E8074] text-white font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
              {exhibition.category || 'Exhibition'}
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight max-w-3xl drop-shadow-md">
              {exhibition.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILS LAYOUT GRID (MAIN CONTENT + STICKY SIDEBAR) */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start pb-20">
        {/* Left Main Content (8 Spans) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Info Strip */}
          <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] dark:bg-emerald-950/60 text-[#0E8074] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Date
                </span>
                <span className="text-sm font-bold text-[#121B3D] dark:text-slate-100 block mt-0.5">
                  {formatDisplayDate(exhibition.startDate)} – {formatDisplayDate(exhibition.endDate)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] dark:bg-emerald-950/60 text-[#0E8074] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Time
                </span>
                <span className="text-sm font-bold text-[#121B3D] dark:text-slate-100 block mt-0.5">
                  9:00 AM – 6:00 PM
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] dark:bg-emerald-950/60 text-[#0E8074] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Location
                </span>
                <span className="text-sm font-bold text-[#121B3D] dark:text-slate-100 block mt-0.5">
                  {exhibition.venue}, {exhibition.city}
                </span>
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

          {/* ========================================================================= */}
          {/* UPSCALE TABBED SECTIONS (ABOUT, PRICING, SCHEDULE) */}
          {/* ========================================================================= */}
          <div className="space-y-6 pt-4">
            <div className="bg-[#EEF4FC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex overflow-x-auto gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#1E3FA0] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#121B3D] dark:hover:text-white'
                }`}
              >
                About Exhibition
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'map'
                    ? 'bg-[#1E3FA0] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#121B3D] dark:hover:text-white'
                }`}
              >
                Interactive Stall Map
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'pricing'
                    ? 'bg-[#1E3FA0] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#121B3D] dark:hover:text-white'
                }`}
              >
                Stall & Amenities
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'location'
                    ? 'bg-[#1E3FA0] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#121B3D] dark:hover:text-white'
                }`}
              >
                Venue & Location Map
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-[#1E3FA0] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#121B3D] dark:hover:text-white'
                }`}
              >
                Important Schedule
              </button>
            </div>

            {/* Tab 1: Overview & Focus Sectors */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
                  <h4 className="text-lg font-bold text-[#1B37A0] dark:text-blue-400 flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#0E8074] dark:text-emerald-400" /> Exhibition Focus & Target Sectors
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                      <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Focus Sectors</span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Equipment Manufacturers, OEM Suppliers, Importers, Industrial Distributors & Contractors.
                      </p>
                    </div>
                    <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                      <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Target Visitor Profiles</span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Managing Directors, Purchase Managers, Technical Engineers, Architects & Trade Dealers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Venue Location Map */}
                <InteractivePinMap
                  venueName={exhibition.venue}
                  cityName={exhibition.city}
                  address={`${exhibition.venue}, ${exhibition.city}`}
                  readOnly={true}
                  title={`Exhibition Venue Location — ${exhibition.venue}, ${exhibition.city}`}
                  heightClass="h-72"
                />

                {/* Quick Map Teaser in Overview */}
                <div className="bg-gradient-to-r from-[#1E3FA0] to-[#0F294D] text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                  <div className="space-y-1">
                    <span className="px-3 py-1 bg-[#84CC16] text-[#121B3D] font-extrabold text-[10px] uppercase rounded-full">
                      Real-time Floor Plan
                    </span>
                    <h4 className="text-lg font-black">View Interactive Stall Map & Floor Plan</h4>
                    <p className="text-xs text-slate-200">
                      Explore stall availability, corner locations, and reserve directly on the map.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab('map')}
                    className="bg-white text-[#1E3FA0] hover:bg-slate-100 font-extrabold shadow-sm shrink-0"
                    rightIcon={<Layers className="w-4 h-4 text-[#0E8074]" />}
                  >
                    Open Stall Map
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: Interactive Floor Plan Stall Map */}
            {activeTab === 'map' && (
              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6EAF0] dark:border-slate-800 pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-[#1B37A0] dark:text-blue-400 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#0E8074] dark:text-emerald-400" /> Interactive Hall Floor Plan & Stall Availability
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Click any available green stall on the map to inspect position, price, and reserve immediately.
                    </p>
                  </div>
                  <StallFilterBar stalls={stalls} showZoomControls={false} halls={layoutData?.halls} />
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
                  const selectedStallsObj = stalls.filter(s => selectedStallIds.includes(s.id));
                  if (selectedStallsObj.length === 0) return null;
                  
                  const totalArea = selectedStallsObj.reduce((sum, s) => sum + s.areaSqFt, 0);
                  const totalPrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
                  const stallNumbers = selectedStallsObj.map(s => s.stallNumber).join(', ');

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
                          Total Area: {totalArea} Sq.Ft • Total Rental: <b className="text-[#1E3FA0] dark:text-blue-400 font-mono">₹{totalPrice.toLocaleString()} + GST</b>
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(`/exhibitions/${slug}/book?stallIds=${selectedStallIds.join(',')}`)}
                        className="bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shrink-0"
                      >
                        Book Selected Stalls <ArrowRight className="w-4 h-4 text-[#84CC16]" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab 2: Stall Pricing & Amenities */}
            {activeTab === 'pricing' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs hover:border-[#0E8074] transition-colors">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase rounded-full">
                    Standard Scheme
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Standard Shell Stall</h4>
                  <p className="text-2xl font-extrabold text-[#121B3D] dark:text-slate-100">₹1,00,000 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">+ GST</span></p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 10 ft × 10 ft Turnkey Shell</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Fascia Name Printing</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 1 Table, 2 Chairs, 1 Wastebin</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 5A Power Point & 3 Lights</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="outline" className="w-full font-bold border-[#1E3FA0] dark:border-blue-500 text-[#1E3FA0] dark:text-blue-400 mt-2">
                      Book Standard Stall
                    </Button>
                  </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 border-2 border-[#1E3FA0] dark:border-blue-500 rounded-2xl p-6 space-y-4 shadow-md relative">
                  <span className="absolute -top-3 right-6 px-3 py-0.5 bg-[#84CC16] text-[#121B3D] font-bold text-[10px] uppercase rounded-full">
                    Popular Choice
                  </span>
                  <span className="px-3 py-1 bg-[#EEF4FC] dark:bg-blue-950/60 text-[#1E3FA0] dark:text-blue-300 font-bold text-[10px] uppercase rounded-full">
                    Dual Open Corner
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Premium Corner Stall</h4>
                  <p className="text-2xl font-extrabold text-[#1E3FA0] dark:text-blue-400">₹1,50,000 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">+ GST</span></p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 15 ft × 10 ft Dual Open Aisle</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Maximum Visitor Footfall</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Fascia Branding on 2 Sides</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 2 Tables, 4 Chairs & Spotlights</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="primary" className="w-full font-bold bg-[#1E3FA0] dark:bg-blue-600 mt-2">
                      Book Corner Stall
                    </Button>
                  </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs hover:border-[#0E8074] transition-colors">
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase rounded-full">
                    Custom Space
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Island Pavilion Zone</h4>
                  <p className="text-2xl font-extrabold text-[#121B3D] dark:text-slate-100">₹3,00,000 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">+ GST</span></p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 20 ft × 20 ft Center Space</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 4-Side Open Footfall</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Heavy Power Connection</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> VIP Badges Included</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="outline" className="w-full font-bold border-[#1E3FA0] dark:border-blue-500 text-[#1E3FA0] dark:text-blue-400 mt-2">
                      Book Island Pavilion
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Tab 3: Important Schedule */}
            {activeTab === 'schedule' && (
              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
                <h4 className="text-lg font-bold text-[#1B37A0] dark:text-blue-400">Exhibition Schedule & Important Dates</h4>
                <div className="space-y-3 text-xs font-medium">
                  <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Stall Booking & Fascia Confirmation</span>
                      <span className="text-slate-500 dark:text-slate-400">Early bird allocation phase</span>
                    </div>
                    <span className="px-3 py-1 bg-[#1E3FA0] dark:bg-blue-600 text-[#FFFFFF] rounded-md font-mono font-bold">Active Now</span>
                  </div>
                  <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Exhibitor Move-In & Stall Setup</span>
                      <span className="text-slate-500 dark:text-slate-400">Hall access for stall branding</span>
                    </div>
                    <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md font-mono font-bold">1 Day Prior</span>
                  </div>
                  <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Official Inauguration & Trade Days</span>
                      <span className="text-slate-500 dark:text-slate-400">9:00 AM – 6:00 PM</span>
                    </div>
                    <span className="px-3 py-1 bg-[#84CC16] text-[#121B3D] rounded-md font-mono font-bold">Expo Days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Venue & Location Map */}
            {activeTab === 'location' && (
              <div className="space-y-6">
                <InteractivePinMap
                  venueName={exhibition.venue}
                  cityName={exhibition.city}
                  address={`${exhibition.venue}, ${exhibition.city}`}
                  readOnly={true}
                  title={`Interactive Venue Map & Navigation — ${exhibition.venue}, ${exhibition.city}`}
                  heightClass="h-96"
                />

                <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs shadow-xs">
                  <div className="p-4 bg-[#EEF4FC] dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="font-bold text-[#121B3D] dark:text-slate-100 text-sm block">Convention Centre</span>
                    <p className="text-slate-600 dark:text-slate-300">{exhibition.venue}</p>
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
            )}
          </div>
        </div>

        {/* Right Sticky Sidebar (4 Spans) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          {/* Register Card */}
          <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            {/* Price Row */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#121B3D] dark:text-slate-100 font-sora">₹499</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">per attendee / stall booking available</span>
            </div>

            {/* LIVE EVENT COUNTDOWN TIMER */}
            <div className="pt-1">
              <EventCountdownTimer targetDate={exhibition.startDate} />
            </div>

            {/* Slot Track with Clean Spacing Gap */}
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Stall Availability Status</span>
                <span className="text-[#1E3FA0] dark:text-blue-400"><b className="font-bold">{availableCount}</b> slots left</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E6EAF0] dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0E8074] to-[#1E3FA0] rounded-full transition-all duration-500"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{registeredCount} stalls reserved</span>
                <span>{totalSlots} total capacity</span>
              </div>
            </div>

            {/* Book Stall Action Button — Clear Gap Above & Below */}
            <div className="pt-2">
              {!isCurrentUpcoming ? (
                <div className="w-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs py-3.5 px-4 rounded-xl flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                  <span className="text-amber-900 dark:text-amber-100 font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Bookings Closed For This Event
                  </span>
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    Stall booking is strictly restricted to the current upcoming event: <strong>"{currentUpcomingEvent?.title}"</strong>
                  </span>
                </div>
              ) : isBookingClosed ? (
                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm py-3.5 px-4 rounded-xl flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                  <span className="text-slate-700 dark:text-slate-200 font-extrabold">Stall Bookings Closed</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Registration cut-off date was {bookingCloseDisplay}
                  </span>
                </div>
              ) : (
                <Link to={`/exhibitions/${slug}/book`}>
                  <button className="w-full bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-extrabold text-base py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
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
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: exhibition.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Event link copied to clipboard!');
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
