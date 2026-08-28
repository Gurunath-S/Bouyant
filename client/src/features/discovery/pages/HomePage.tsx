import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { PublicNavbar } from '../../../components/layout/PublicNavbar';
import { PublicFooter } from '../../../components/layout/PublicFooter';
import { EventCountdownTimer } from '../../../components/ui/EventCountdownTimer';
import {
  Calendar,
  MapPin,
  ArrowRight,
  Building,
  Users,
  Award,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Search,
  MousePointerClick,
  FileCheck2,
  Compass,
  Trophy,
  TrendingUp,
} from 'lucide-react';

const HERO_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
    title: 'BuildinTec Trade Fair Floor',
  },
  {
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
    title: 'B2B Trade Show Booths',
  },
  {
    url: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=1200&auto=format&fit=crop',
    title: 'Industrial & Healthcare Summit',
  },
  {
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
    title: 'Engineering & Machinery Expo',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    fetchExhibitions();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchExhibitions = async () => {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data || []);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Flagship upcoming event (First in list or default Mediccon Expo 2026)
  const featuredEvent: Exhibition = exhibitions[0] || {
    id: 'mediccon-2026',
    title: 'Mediccon Expo 2026',
    slug: 'mediccon-expo-2026',
    category: 'Medical & Healthcare',
    venue: 'CODISSIA Trade Fair Complex',
    city: 'Coimbatore, TN',
    startDate: '2026-03-15T09:00:00Z',
    endDate: '2026-03-18T18:00:00Z',
    description:
      'South India’s largest international exhibition for medical devices, healthcare technology, and hospital equipment. Connect with 15,000+ healthcare leaders and trade buyers.',
    bannerUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
    totalStalls: 180,
    availableStalls: 42,
  };

  // Display ONLY the 3 next upcoming events on the main page/dashboard view
  const nextThreeEvents = exhibitions.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-[#121B3D] font-sans flex flex-col justify-between selection:bg-[#0E8074] selection:text-white">
      <PublicNavbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION — SOFT BLUE BACKDROP WITH DOT MATRIX */}
        {/* ========================================================================= */}
        <section className="bg-[#F4F8FD] py-20 sm:py-28 px-6 lg:px-12 relative overflow-hidden border-b border-[#E6EAF0]">
          {/* Architectural Dot Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#1E3FA0 1.2px, transparent 1.2px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            {/* Left Content (6 Spans) */}
            <div className="lg:col-span-6 space-y-7">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#1B37A0] leading-[1.08] tracking-tight">
                {featuredEvent.title}
              </h1>

              <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-semibold text-slate-700 pt-1">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#E6EAF0] shadow-xs">
                  <Calendar className="w-4 h-4 text-[#0E8074]" />
                  <span>
                    {new Date(featuredEvent.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                    {new Date(featuredEvent.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#E6EAF0] shadow-xs">
                  <MapPin className="w-4 h-4 text-[#0E8074]" />
                  <span>{featuredEvent.venue}, {featuredEvent.city}</span>
                </div>
              </div>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                {featuredEvent.description}
              </p>

              {/* Modern Light Glass Countdown Timer Container */}
              <div className="max-w-md bg-white p-4 sm:p-5 rounded-2xl shadow-xs border-2 border-[#1E3FA0]/15 space-y-3">
                <EventCountdownTimer targetDate={featuredEvent.startDate} />
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link to={`/exhibitions/${featuredEvent.slug}`}>
                  <button className="inline-flex items-center gap-2 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                    Explore Event Details <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              </div>

              {/* Trust & Guarantee Highlights Bar */}
              <div className="pt-4 border-t border-slate-300/60 flex flex-wrap gap-5 text-xs sm:text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-1.5 text-[#0E8074]">
                  <CheckCircle2 className="w-4 h-4 text-[#0E8074]" /> Official Buoyant Event
                </span>
                <span className="flex items-center gap-1.5 text-[#1E3FA0]">
                  <CheckCircle2 className="w-4 h-4 text-[#1E3FA0]" /> Real-time Interactive Floor Plan
                </span>
                <span className="flex items-center gap-1.5 text-[#0E8074]">
                  <CheckCircle2 className="w-4 h-4 text-[#0E8074]" /> Instant Online Reservation
                </span>
              </div>
            </div>

            {/* Right Multi-Image Animated Exhibition Showcase (6 Spans) — Pure & Clear (No Inner Shadow) */}
            <div className="lg:col-span-6 relative">
              {/* Decorative Background Glow Plate */}
              <div className="absolute -inset-3 bg-gradient-to-r from-[#1E3FA0]/15 to-[#0E8074]/15 rounded-3xl blur-2xl opacity-70 pointer-events-none" />

              {/* Multi-Image Animated Container */}
              <div className="w-full h-96 sm:h-[500px] lg:h-[540px] rounded-3xl overflow-hidden shadow-xl relative border-4 border-white bg-white group">
                {HERO_SLIDES.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      index === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <img
                      src={slide.url}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                ))}

                {/* Category Pill Tag Top Left */}
                <div className="absolute top-5 left-5 z-20">
                  <span className="px-4 py-2 bg-[#0E8074] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md backdrop-blur-md">
                    {featuredEvent.category || 'Flagship Exhibition'}
                  </span>
                </div>

                {/* Animated Pagination Indicators Bottom Right */}
                <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/60 shadow-md">
                  {HERO_SLIDES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlideIndex(index)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === currentSlideIndex ? 'w-7 bg-[#1E3FA0]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                      title={`Slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SECTION BELOW HERO — MORE ABOUT THIS PARTICULAR EVENT */}
        {/* ========================================================================= */}
        <section className="py-16 px-6 lg:px-12 bg-white border-b border-[#E6EAF0]">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074]">
                Event Spotlight
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B37A0] tracking-tight">
                About {featuredEvent.title}
              </h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Get an exclusive glimpse into the venue infrastructure, expected trade footfall, and key sector highlights for our upcoming flagship exhibition.
              </p>
            </div>

            {/* Event Key Statistics Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 bg-[#EEF4FC] rounded-2xl border border-[#E6EAF0] space-y-1 text-center">
                <Users className="w-6 h-6 text-[#0E8074] mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] block">15,000+</span>
                <span className="text-xs text-slate-500 font-medium">B2B Trade Buyers</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] rounded-2xl border border-[#E6EAF0] space-y-1 text-center">
                <Building className="w-6 h-6 text-[#1E3FA0] mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] block">250+</span>
                <span className="text-xs text-slate-500 font-medium">Exhibiting Brands</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] rounded-2xl border border-[#E6EAF0] space-y-1 text-center">
                <LayoutGrid className="w-6 h-6 text-[#0E8074] mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] block">100,000</span>
                <span className="text-xs text-slate-500 font-medium">Sq.Ft Air-Conditioned</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] rounded-2xl border border-[#E6EAF0] space-y-1 text-center">
                <Award className="w-6 h-6 text-[#84CC16] mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] block">Grade A+</span>
                <span className="text-xs text-slate-500 font-medium">International Complex</span>
              </div>
            </div>

            {/* Event Authentic Photography Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
                  alt="Exhibition Shell Schemes"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Exhibition Hall</span>
                  <h3 className="text-sm font-bold">State-of-the-Art Shell Schemes</h3>
                </div>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop"
                  alt="Verified Buyer Footfall"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Trade Footfall</span>
                  <h3 className="text-sm font-bold">Verified Buyer & Dealer Delegation</h3>
                </div>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop"
                  alt="Live Product Demos"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Product Launches</span>
                  <h3 className="text-sm font-bold">Live Demos & Technical Seminars</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2.5 INFOGRAPHIC SECTION — HOW ONLINE STALL BOOKING WORKS */}
        {/* ========================================================================= */}
        <section className="py-16 px-6 lg:px-12 bg-gradient-to-b from-white to-[#F4F8FD] border-b border-[#E6EAF0]">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074]">
                Seamless Booking Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B37A0] tracking-tight">
                How Online Stall Hold & Reservation Works
              </h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Reserve your exhibition booth in 3 simple steps on Buoyant Media digital booking portal.
              </p>
            </div>

            {/* Step Infographic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-white border border-[#E6EAF0] p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#EEF4FC] text-[#1E3FA0] rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] uppercase tracking-wider block">Step 01</span>
                  <h3 className="text-lg font-bold text-[#121B3D]">Select Trade Fair</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Browse upcoming exhibitions by sector, dates, and venue specs across major industrial hubs.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-[#E6EAF0] p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#E4F5F2] text-[#0E8074] rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <MousePointerClick className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] uppercase tracking-wider block">Step 02</span>
                  <h3 className="text-lg font-bold text-[#121B3D]">Choose Stall on Live Map</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    View real-time stall availability, dimensions, premium corner slots, and shell scheme pricing.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-[#E6EAF0] p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#F3FCE8] text-[#73b510] rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <FileCheck2 className="w-8 h-8 text-[#0E8074]" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] uppercase tracking-wider block">Step 03</span>
                  <h3 className="text-lg font-bold text-[#121B3D]">Instant Hold & Invoice</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Lock your booth instantly with a 15-minute online hold, submit company details, and receive GST invoice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. UPCOMING EVENTS SHOWCASE SECTION — SHOWING ONLY 3 NEXT EVENTS */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074] block mb-1">
                Upcoming Trade Shows
              </span>
              <h2 className="text-3xl font-extrabold text-[#1B37A0] tracking-tight">
                Next 3 Scheduled Events
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Explore upcoming industrial exhibitions, check stall availability, and reserve your booth.
              </p>
            </div>

            {/* View All Events Link */}
            <Link to="/exhibitions">
              <Button
                variant="outline"
                size="sm"
                className="font-bold border-[#1E3FA0] text-[#1E3FA0] hover:bg-[#EEF4FC]"
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                View All Events ({exhibitions.length})
              </Button>
            </Link>
          </div>

          {/* Exhibition List Cards (Limited to 3) */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-[#EEF4FC] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : nextThreeEvents.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-[#121B3D]">No Events Scheduled</h3>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {nextThreeEvents.map((expo) => (
                <div
                  key={expo.id}
                  onClick={() => navigate(`/exhibitions/${expo.slug}`)}
                  className="bg-white border border-[#E6EAF0] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch gap-5 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  {/* Event Thumbnail */}
                  <div className="w-full md:w-56 h-44 md:h-auto rounded-xl overflow-hidden relative shrink-0 bg-slate-900">
                    <img
                      src={expo.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop'}
                      alt={expo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-[#0F294D]/80 text-white font-bold text-[10px] uppercase px-2.5 py-1 rounded-full backdrop-blur-md">
                      {expo.category || 'Exhibition'}
                    </span>
                  </div>

                  {/* Event Body */}
                  <div className="flex-1 flex flex-col justify-center space-y-2.5 min-w-0">
                    <h3 className="text-xl font-bold text-[#1B37A0] group-hover:text-[#1E3FA0] transition-colors leading-snug">
                      {expo.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                      {expo.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-700 font-medium pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0E8074]" />
                        {new Date(expo.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0E8074]" />
                        {expo.venue}, {expo.city}
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 bg-[#E4F5F2] text-[#0E8074] font-bold text-xs px-3 py-1 rounded-full">
                        {expo.totalStalls || 45} slots left
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-end md:pr-2 pt-2 md:pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/exhibitions/${expo.slug}`);
                      }}
                      className="inline-flex items-center gap-2 bg-transparent text-[#0E8074] border-1.5 border-[#0E8074] hover:bg-[#0E8074] hover:text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all whitespace-nowrap"
                    >
                      Know Event Details <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Banner to Separate All Events Page */}
          <div className="bg-gradient-to-r from-[#EEF4FC] via-[#F4F8FD] to-white border-2 border-[#1E3FA0]/20 rounded-3xl p-8 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 mt-10">
            <div className="space-y-2 text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E4F5F2] text-[#0E8074] font-extrabold text-[11px] uppercase tracking-wider rounded-full">
                <Compass className="w-3.5 h-3.5 text-[#0E8074]" /> Complete Exhibition Directory
              </div>
              <h3 className="text-2xl font-black text-[#1B37A0]">Explore Full Exhibition Directory</h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Filter by sector, location, or search upcoming international B2B trade shows across India.
              </p>
            </div>
            <Link to="/exhibitions">
              <button className="inline-flex items-center gap-2.5 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 whitespace-nowrap">
                Browse All Trade Fairs <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. PAST EVENTS HIGHLIGHTS & GALLERY SECTION — LIGHT CORPORATE SHOWCASE */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-br from-[#F4F8FD] via-[#EEF4FC] to-white border-t border-[#E6EAF0] py-20 px-6 lg:px-12 relative overflow-hidden">
          {/* Subtle Ambient Background Accent */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#1E3FA0]/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-[1600px] mx-auto space-y-12 relative z-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#E6EAF0] pb-6">
              <div className="space-y-2.5 max-w-3xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E4F5F2] text-[#0E8074] border border-[#0E8074]/30 font-extrabold text-xs uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-[#0E8074]" /> Historical Track Record
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1B37A0] leading-tight">
                  Past Event Highlights & Success Archives
                </h2>
                <p className="text-slate-600 text-sm sm:text-base font-normal leading-relaxed">
                  Over 40+ premier industrial trade fairs hosted across Coimbatore, Chennai, and Bengaluru with verified B2B buyer turnout.
                </p>
              </div>

              {/* Verified Metrics Counter Strip — Tight & Connected */}
              <div className="flex items-center gap-6 sm:gap-8 bg-white border border-[#1E3FA0]/20 px-6 py-4 rounded-2xl shrink-0 shadow-xs">
                <div className="pr-6 border-r border-slate-200">
                  <span className="text-2xl sm:text-3xl font-black text-[#1B37A0] block">150,000+</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">B2B Trade Visitors</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-[#0E8074] block">1,200+</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">Exhibitors Served</span>
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {/* Event Card 1 */}
              <div className="bg-white border border-[#E6EAF0] rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#1E3FA0] hover:-translate-y-2 transition-all duration-300 group">
                <div className="h-56 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
                    alt="BuildinTec 2025"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/75 via-[#121B3D]/20 to-transparent" />
                  <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-md text-[#1E3FA0] font-extrabold text-[11px] uppercase px-3 py-1 rounded-full border border-white/50 shadow-xs">
                    2025 Edition
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-extrabold text-lg text-[#121B3D] group-hover:text-[#1E3FA0] transition-colors">BuildinTec 2025</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0E8074]" /> CODISSIA Complex, Coimbatore
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">18,500+ Visitors</span>
                    <span className="text-slate-400 font-medium">210 Exhibitors</span>
                  </div>
                </div>
              </div>

              {/* Event Card 2 */}
              <div className="bg-white border border-[#E6EAF0] rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#1E3FA0] hover:-translate-y-2 transition-all duration-300 group">
                <div className="h-56 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop"
                    alt="InterioTex Expo 2025"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/75 via-[#121B3D]/20 to-transparent" />
                  <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-md text-[#1E3FA0] font-extrabold text-[11px] uppercase px-3 py-1 rounded-full border border-white/50 shadow-xs">
                    2025 Edition
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-extrabold text-lg text-[#121B3D] group-hover:text-[#1E3FA0] transition-colors">InterioTex Expo 2025</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0E8074]" /> Chennai Trade Centre
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">14,200+ Visitors</span>
                    <span className="text-slate-400 font-medium">160 Exhibitors</span>
                  </div>
                </div>
              </div>

              {/* Event Card 3 */}
              <div className="bg-white border border-[#E6EAF0] rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#1E3FA0] hover:-translate-y-2 transition-all duration-300 group">
                <div className="h-56 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop"
                    alt="MediTech Summit 2024"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/75 via-[#121B3D]/20 to-transparent" />
                  <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-md text-[#1E3FA0] font-extrabold text-[11px] uppercase px-3 py-1 rounded-full border border-white/50 shadow-xs">
                    2024 Edition
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-extrabold text-lg text-[#121B3D] group-hover:text-[#1E3FA0] transition-colors">MediTech Summit 2024</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0E8074]" /> BIEC Centre, Bengaluru
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">22,000+ Delegates</span>
                    <span className="text-slate-400 font-medium">290 Exhibitors</span>
                  </div>
                </div>
              </div>

              {/* Event Card 4 */}
              <div className="bg-white border border-[#E6EAF0] rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#1E3FA0] hover:-translate-y-2 transition-all duration-300 group">
                <div className="h-56 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop"
                    alt="AutoTech Expo 2024"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/75 via-[#121B3D]/20 to-transparent" />
                  <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-md text-[#1E3FA0] font-extrabold text-[11px] uppercase px-3 py-1 rounded-full border border-white/50 shadow-xs">
                    2024 Edition
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-extrabold text-lg text-[#121B3D] group-hover:text-[#1E3FA0] transition-colors">AutoTech & Engineering 2024</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0E8074]" /> CODISSIA Complex, Coimbatore
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">19,800+ Visitors</span>
                    <span className="text-slate-400 font-medium">240 Exhibitors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
