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
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExhibitions();
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
    startDate: '2026-11-15',
    endDate: '2026-11-18',
    bannerUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
    description: 'India premier medical equipment, healthcare technology, and surgical instruments exhibition hosted by Buoyant Media. Discover cutting-edge medical devices, hospital infrastructure, and diagnostic breakthroughs under one roof.',
    status: 'UPCOMING',
    totalStalls: 150,
  };

  // Display ONLY the 3 next upcoming events on the main page/dashboard view
  const nextThreeEvents = exhibitions.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-[#121B3D] font-sans flex flex-col justify-between selection:bg-[#0E8074] selection:text-white">
      <PublicNavbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION — FOCUSED STRICTLY ON THE NEXT UPCOMING EVENT (FULL-FLEDGED IMAGE) */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-r from-[#EEF4FC] via-[#EEF4FC]/80 to-white py-12 sm:py-16 px-6 lg:px-12 relative overflow-hidden border-b border-[#E6EAF0]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content (6 Spans) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#84CC16]/20 border border-[#84CC16]/50 text-[#121B3D] font-bold text-xs rounded-full uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#0E8074]" /> Next Flagship Event Launch
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1B37A0] leading-[1.15] tracking-tight">
                {featuredEvent.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 pt-1">
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-[#E6EAF0] shadow-xs">
                  <Calendar className="w-4 h-4 text-[#0E8074]" />
                  <span>
                    {new Date(featuredEvent.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                    {new Date(featuredEvent.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-[#E6EAF0] shadow-xs">
                  <MapPin className="w-4 h-4 text-[#0E8074]" />
                  <span>{featuredEvent.venue}, {featuredEvent.city}</span>
                </div>
              </div>

              <p className="text-slate-600 text-base leading-relaxed max-w-xl font-normal">
                {featuredEvent.description}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link to={`/exhibitions/${featuredEvent.slug}/book`}>
                  <button className="inline-flex items-center gap-2 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5">
                    Book Stall Now <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>

                <Link to={`/exhibitions/${featuredEvent.slug}`}>
                  <button className="inline-flex items-center gap-2 bg-white hover:bg-[#EEF4FC] text-[#1E3FA0] border-2 border-[#1E3FA0] font-bold text-sm px-6 py-3.5 rounded-xl transition-all">
                    Explore Event Details
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Full-Fledged Visual Banner Card (6 Spans) */}
            <div className="lg:col-span-6 relative">
              {/* Full-Fledged High-Impact Image Container */}
              <div className="w-full h-80 sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl relative border-2 border-white/80 bg-slate-900 group">
                <img
                  src={featuredEvent.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop'}
                  alt={featuredEvent.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F294D] via-[#0F294D]/30 to-transparent" />

                {/* Category Badge Top Left */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3.5 py-1.5 bg-[#0E8074] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md backdrop-blur-md">
                    {featuredEvent.category || 'Flagship Exhibition'}
                  </span>
                </div>

                {/* Live Countdown Timer Banner Floating at Bottom */}
                <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#121B3D]">
                      Opening Ceremony Countdown
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Official Timer
                    </span>
                  </div>
                  <EventCountdownTimer targetDate={featuredEvent.startDate} />
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

            {/* Event Imagery Grid & Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
                  alt="Inauguration & VIP"
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
                  alt="B2B Networking"
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
                  alt="Live Demos"
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
          <div className="bg-[#121B3D] text-white rounded-3xl p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 mt-8">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white">Explore Full Exhibition Directory</h3>
              <p className="text-xs text-slate-300">
                Filter by sector, location, or search upcoming international B2B trade shows.
              </p>
            </div>
            <Link to="/exhibitions">
              <Button
                variant="primary"
                size="lg"
                className="font-bold bg-[#84CC16] hover:bg-[#73b510] text-[#121B3D] border-none px-6"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Browse All Trade Fairs
              </Button>
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. PAST EVENTS HIGHLIGHTS & GALLERY SECTION */}
        {/* ========================================================================= */}
        <section className="bg-[#EEF4FC]/80 border-t border-[#E6EAF0] py-16 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074]">
                Past Event Highlights & Archives
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B37A0] tracking-tight">
                Our Track Record of Successful Trade Fairs
              </h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Over 40+ premier industrial trade shows hosted across Coimbatore, Chennai, and Bengaluru with verified B2B buyer turnout.
              </p>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
                    alt="BuildinTec 2025"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#121B3D]/80 backdrop-blur-md text-[#84CC16] font-bold text-[10px] uppercase px-2.5 py-1 rounded-full">
                    2025 Edition
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-base text-[#121B3D]">BuildinTec 2025</h3>
                  <p className="text-xs text-slate-500 font-medium">CODISSIA Complex, Coimbatore</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">18,500+ Visitors</span>
                    <span className="text-slate-400 font-medium">210 Exhibitors</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop"
                    alt="InterioTex Expo 2025"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#121B3D]/80 backdrop-blur-md text-[#84CC16] font-bold text-[10px] uppercase px-2.5 py-1 rounded-full">
                    2025 Edition
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-base text-[#121B3D]">InterioTex Expo 2025</h3>
                  <p className="text-xs text-slate-500 font-medium">Chennai Trade Centre</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">14,200+ Visitors</span>
                    <span className="text-slate-400 font-medium">160 Exhibitors</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop"
                    alt="MediTech Summit 2024"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#121B3D]/80 backdrop-blur-md text-[#84CC16] font-bold text-[10px] uppercase px-2.5 py-1 rounded-full">
                    2024 Edition
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-base text-[#121B3D]">MediTech Summit 2024</h3>
                  <p className="text-xs text-slate-500 font-medium">BIEC Centre, Bengaluru</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0E8074]">22,000+ Delegates</span>
                    <span className="text-slate-400 font-medium">290 Exhibitors</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop"
                    alt="AutoTech Expo 2024"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#121B3D]/80 backdrop-blur-md text-[#84CC16] font-bold text-[10px] uppercase px-2.5 py-1 rounded-full">
                    2024 Edition
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-base text-[#121B3D]">AutoTech & Engineering 2024</h3>
                  <p className="text-xs text-slate-500 font-medium">CODISSIA Complex, Coimbatore</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
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
