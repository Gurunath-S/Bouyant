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
} from 'lucide-react';

export const ExhibitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'schedule'>('overview');

  useEffect(() => {
    if (slug) fetchEventData();
  }, [slug]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const expo = await exhibitionService.getExhibitionBySlug(slug!);
      setExhibition(expo);

      if (expo.floorPlans && expo.floorPlans.length > 0) {
        const fp = expo.floorPlans[0];
        const stallsData = await stallService.getStallsByFloorPlan(fp.id);
        setStalls(stallsData || []);
      }
    } catch (err) {
      console.error('Failed to load exhibition details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#1E3FA0] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#121B3D]">Loading Event Profile...</p>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-[#121B3D]">Event Not Found</h3>
        <p className="text-xs text-slate-500">The requested exhibition could not be located in our directory.</p>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to all events
        </Button>
      </div>
    );
  }

  const availableCount = stalls.filter((s) => s.status === 'AVAILABLE').length || exhibition.totalStalls || 45;
  const registeredCount = stalls.length > 0 ? stalls.length - availableCount : 120;
  const totalSlots = stalls.length || (availableCount + registeredCount);
  const fillPercentage = Math.min(100, Math.round((registeredCount / totalSlots) * 100));

  const bannerImg = exhibition.bannerUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-white text-[#121B3D] font-sans selection:bg-[#0E8074] selection:text-white">
      {/* Back Navigation Bar */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-6">
        <Link
          to="/exhibitions"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#121B3D] font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all events
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* DETAILS HERO BANNER */}
      {/* ========================================================================= */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mt-4">
        <div
          className="h-80 sm:h-[420px] rounded-3xl bg-cover bg-center relative overflow-hidden flex items-end shadow-md border border-[#E6EAF0]"
          style={{ backgroundImage: `url(${bannerImg})` }}
        >
          {/* Banner Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F294D] via-[#0F294D]/40 to-transparent" />

          <div className="relative z-10 p-6 sm:p-10 text-white space-y-3">
            <span className="bg-[#0E8074] text-white font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
              {exhibition.category || 'Exhibition'}
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight max-w-4xl drop-shadow-md">
              {exhibition.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILS LAYOUT GRID (MAIN CONTENT + STICKY SIDEBAR) */}
      {/* ========================================================================= */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pb-24">
        {/* Left Main Content (8 Spans) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Info Strip */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] text-[#0E8074] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Date
                </span>
                <span className="text-sm font-bold text-[#121B3D] block mt-0.5">
                  {new Date(exhibition.startDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })} –{' '}
                  {new Date(exhibition.endDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] text-[#0E8074] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Time
                </span>
                <span className="text-sm font-bold text-[#121B3D] block mt-0.5">
                  9:00 AM – 6:00 PM
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4F5F2] text-[#0E8074] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Location
                </span>
                <span className="text-sm font-bold text-[#121B3D] block mt-0.5">
                  {exhibition.venue}, {exhibition.city}
                </span>
              </div>
            </div>
          </div>

          {/* Section: About Event */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#121B3D]">About this event</h3>
            <p className="text-slate-600 text-base leading-relaxed">
              {exhibition.description}
            </p>
          </div>

          {/* Section: Organizer Card */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#121B3D]">Organizer</h3>
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#121B3D] text-white flex items-center justify-center font-bold font-sora text-base shrink-0">
                BM
              </div>
              <div>
                <div className="font-bold text-[#121B3D] text-base">Buoyant Media & Trade Fairs</div>
                <div className="text-xs text-slate-500 font-medium">Official Event Organizer · 40+ events hosted</div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* UPSCALE TABBED SECTIONS (ABOUT, PRICING, SCHEDULE) */}
          {/* ========================================================================= */}
          <div className="space-y-6 pt-4">
            <div className="bg-[#EEF4FC] p-1.5 rounded-2xl flex overflow-x-auto gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#1E3FA0] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#121B3D]'
                }`}
              >
                About Exhibition
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'pricing'
                    ? 'bg-[#1E3FA0] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#121B3D]'
                }`}
              >
                Stall & Amenities
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-[#1E3FA0] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#121B3D]'
                }`}
              >
                Important Schedule
              </button>
            </div>

            {/* Tab 1: Overview & Focus Sectors */}
            {activeTab === 'overview' && (
              <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-6 shadow-xs">
                <h4 className="text-lg font-bold text-[#1B37A0] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0E8074]" /> Exhibition Focus & Target Sectors
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="p-4 bg-[#EEF4FC] rounded-xl space-y-1">
                    <span className="font-bold text-[#121B3D] text-sm block">Focus Sectors</span>
                    <p className="text-slate-600 leading-relaxed">
                      Equipment Manufacturers, OEM Suppliers, Importers, Industrial Distributors & Contractors.
                    </p>
                  </div>
                  <div className="p-4 bg-[#EEF4FC] rounded-xl space-y-1">
                    <span className="font-bold text-[#121B3D] text-sm block">Target Visitor Profiles</span>
                    <p className="text-slate-600 leading-relaxed">
                      Managing Directors, Purchase Managers, Technical Engineers, Architects & Trade Dealers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Stall Pricing & Amenities */}
            {activeTab === 'pricing' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-4 shadow-xs hover:border-[#0E8074] transition-colors">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded-full">
                    Standard Scheme
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D]">Standard Shell Stall</h4>
                  <p className="text-2xl font-extrabold text-[#121B3D]">₹1,00,000 <span className="text-xs font-normal text-slate-500">+ GST</span></p>
                  <ul className="text-xs text-slate-600 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 10 ft × 10 ft Turnkey Shell</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Fascia Name Printing</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 1 Table, 2 Chairs, 1 Wastebin</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 5A Power Point & 3 Lights</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="outline" className="w-full font-bold border-[#1E3FA0] text-[#1E3FA0] mt-2">
                      Book Standard Stall
                    </Button>
                  </Link>
                </div>

                <div className="bg-white border-2 border-[#1E3FA0] rounded-2xl p-6 space-y-4 shadow-md relative">
                  <span className="absolute -top-3 right-6 px-3 py-0.5 bg-[#84CC16] text-[#121B3D] font-bold text-[10px] uppercase rounded-full">
                    Popular Choice
                  </span>
                  <span className="px-3 py-1 bg-[#EEF4FC] text-[#1E3FA0] font-bold text-[10px] uppercase rounded-full">
                    Dual Open Corner
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D]">Premium Corner Stall</h4>
                  <p className="text-2xl font-extrabold text-[#1E3FA0]">₹1,50,000 <span className="text-xs font-normal text-slate-500">+ GST</span></p>
                  <ul className="text-xs text-slate-600 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 15 ft × 10 ft Dual Open Aisle</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Maximum Visitor Footfall</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Fascia Branding on 2 Sides</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 2 Tables, 4 Chairs & Spotlights</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="primary" className="w-full font-bold bg-[#1E3FA0] mt-2">
                      Book Corner Stall
                    </Button>
                  </Link>
                </div>

                <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-4 shadow-xs hover:border-[#0E8074] transition-colors">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-[10px] uppercase rounded-full">
                    Custom Space
                  </span>
                  <h4 className="text-lg font-bold text-[#121B3D]">Island Pavilion Zone</h4>
                  <p className="text-2xl font-extrabold text-[#121B3D]">₹3,00,000 <span className="text-xs font-normal text-slate-500">+ GST</span></p>
                  <ul className="text-xs text-slate-600 space-y-2 pt-2">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 20 ft × 20 ft Center Space</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> 4-Side Open Footfall</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> Heavy Power Connection</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#0E8074]" /> VIP Badges Included</li>
                  </ul>
                  <Link to={`/exhibitions/${slug}/book`}>
                    <Button variant="outline" className="w-full font-bold border-[#1E3FA0] text-[#1E3FA0] mt-2">
                      Book Island Pavilion
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Tab 3: Important Schedule */}
            {activeTab === 'schedule' && (
              <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-4 shadow-xs">
                <h4 className="text-lg font-bold text-[#1B37A0]">Exhibition Schedule & Important Dates</h4>
                <div className="space-y-3 text-xs font-medium">
                  <div className="p-4 bg-[#EEF4FC] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] text-sm block">Stall Booking & Fascia Confirmation</span>
                      <span className="text-slate-500">Early bird allocation phase</span>
                    </div>
                    <span className="px-3 py-1 bg-[#1E3FA0] text-[#FFFFFF] rounded-md font-mono font-bold">Active Now</span>
                  </div>
                  <div className="p-4 bg-[#EEF4FC] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] text-sm block">Exhibitor Move-In & Stall Setup</span>
                      <span className="text-slate-500">Hall access for stall branding</span>
                    </div>
                    <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-md font-mono font-bold">1 Day Prior</span>
                  </div>
                  <div className="p-4 bg-[#EEF4FC] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#121B3D] text-sm block">Official Inauguration & Trade Days</span>
                      <span className="text-slate-500">9:00 AM – 6:00 PM</span>
                    </div>
                    <span className="px-3 py-1 bg-[#84CC16] text-[#121B3D] rounded-md font-mono font-bold">Expo Days</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Sidebar (4 Spans) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          {/* Register Card */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-md space-y-6">
            {/* Price Row */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#121B3D] font-sora">₹499</span>
              <span className="text-xs text-slate-500 font-medium">per attendee / stall booking available</span>
            </div>

            {/* LIVE EVENT COUNTDOWN TIMER */}
            <div className="pt-1">
              <EventCountdownTimer targetDate={exhibition.startDate} />
            </div>

            {/* Slot Track with Clean Spacing Gap */}
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Stall Availability Status</span>
                <span className="text-[#1E3FA0]"><b className="font-bold">{availableCount}</b> slots left</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E6EAF0] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0E8074] to-[#1E3FA0] rounded-full transition-all duration-500"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>{registeredCount} stalls reserved</span>
                <span>{totalSlots} total capacity</span>
              </div>
            </div>

            {/* Book Stall Action Button — Clear Gap Above & Below */}
            <div className="pt-2">
              <Link to={`/exhibitions/${slug}/book`}>
                <button className="w-full bg-[#1E3FA0] hover:bg-[#152B75] text-white font-extrabold text-base py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Book Stall
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>

            {/* Value Checklist */}
            <ul className="space-y-2.5 pt-2 border-t border-slate-100 text-xs font-medium text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
                <span>Instant e-ticket & GST invoice via email</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
                <span>Access to all technical sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
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
