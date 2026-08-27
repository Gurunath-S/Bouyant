import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { CountdownTimer } from '../../../components/ui/CountdownTimer';
import { PublicNavbar } from '../../../components/layout/PublicNavbar';
import { PublicFooter } from '../../../components/layout/PublicFooter';
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  CheckCircle,
  Eye,
  Award,
  Phone,
  LayoutGrid,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Featured Hero Carousel Items (Full Width, Clear Images)
  const heroEvents = [
    {
      title: 'Mediccon Expo 2026',
      slug: 'mediccon-expo-2026',
      category: 'Medical & Healthcare',
      venue: 'CODISSIA Trade Fair Complex',
      city: 'Coimbatore, TN',
      dates: 'Nov 15 - Nov 18, 2026',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80',
      description: 'India premier medical equipment, healthcare technology, and surgical instruments exhibition hosted by Buoyant Media.',
      badge: 'Flagship Event • Booking Open',
    },
    {
      title: 'BuildAsia Industrial & Robotics Summit 2026',
      slug: 'buildasia-industrial-summit-2026',
      category: 'Industrial & Engineering',
      venue: 'Suntec International Centre',
      city: 'Singapore',
      dates: 'Nov 20 - Nov 23, 2026',
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80',
      description: 'The premier exhibition for heavy machinery, smart automation, robotics, and industrial IoT solutions.',
      badge: 'International Expo',
    },
    {
      title: 'Global Tech Expo 2026',
      slug: 'global-tech-expo-2026',
      category: 'Software & Technology',
      venue: 'Metropolitan Convention Center',
      city: 'San Francisco, CA',
      dates: 'Oct 12 - Oct 15, 2026',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
      description: 'The world premier B2B technology summit showcasing enterprise AI, SaaS innovations, and cloud infrastructure leaders.',
      badge: 'Enterprise AI & Cloud',
    },
  ];

  useEffect(() => {
    fetchExhibitions();
    const interval = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroEvents.length);
    }, 6000);
    return () => clearInterval(interval);
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

  const nextHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev + 1) % heroEvents.length);
  };

  const prevHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev - 1 + heroEvents.length) % heroEvents.length);
  };

  const categories = ['ALL', 'Medical & Healthcare', 'Interiors & Architecture', 'Industrial & Engineering', 'Textiles'];

  const filteredExhibitions = exhibitions.filter((expo) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      expo.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      expo.title?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      expo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expo.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expo.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeSlide = heroEvents[heroSlideIndex];

  return (
    <div className="min-h-screen bg-[#f6f9ff] text-[#012970] font-sans flex flex-col justify-between selection:bg-[#09539b] selection:text-white">
      <PublicNavbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* FULL-WIDTH HERO CAROUSEL — CRYSTAL CLEAR IMAGES (NO OVERLAY COLORS) */}
        {/* ========================================================================= */}
        <section className="relative bg-slate-950 text-white min-h-[540px] sm:min-h-[580px] flex items-center overflow-hidden border-b border-slate-800 group">
          {/* Background Slides (Full Opacity, 100% Clear & Visible) */}
          {heroEvents.map((event, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                heroSlideIndex === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
              style={{
                backgroundImage: `url(${event.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transitionProperty: 'opacity, transform',
              }}
            />
          ))}

          {/* Minimal Bottom & Side Dark Shadow for Text Legibility (No Full Overlay Tint) */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-12 flex flex-col justify-between min-h-[500px]">
            {/* Top Carousel Bar */}
            <div className="flex justify-between items-center">
              <div className="inline-flex items-center px-3.5 py-1.5 bg-[#9cc542] text-[#012970] font-black text-xs uppercase tracking-wider rounded-lg shadow-xl">
                {activeSlide.badge}
              </div>

              {/* Carousel Arrow Controls */}
              <div className="flex items-center gap-3 bg-slate-950/70 backdrop-blur-md p-1.5 rounded-xl border border-white/30 shadow-2xl">
                <button
                  onClick={prevHeroSlide}
                  className="p-2 text-white hover:text-[#9cc542] transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Previous Hero Event"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono font-bold px-2 text-slate-100">
                  {heroSlideIndex + 1} / {heroEvents.length}
                </span>
                <button
                  onClick={nextHeroSlide}
                  className="p-2 text-white hover:text-[#9cc542] transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Next Hero Event"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Carousel Event Content (Animated Transition) */}
            <div key={heroSlideIndex} className="max-w-3xl space-y-5 my-auto animate-hero-text">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-100">
                <div className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-md">
                  <MapPin className="w-4 h-4 text-[#9cc542]" />
                  <span>{activeSlide.venue}, {activeSlide.city}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-md">
                  <Calendar className="w-4 h-4 text-[#9cc542]" />
                  <span>{activeSlide.dates}</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                {activeSlide.title}
              </h1>

              <p className="text-slate-100 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl font-semibold drop-shadow-md">
                {activeSlide.description}
              </p>

              {/* Action Buttons: 1. Book Stall (Primary), 2. Explore Exhibition (Secondary) */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link to={`/exhibitions/${activeSlide.slug}/book`}>
                  <Button
                    variant="primary"
                    size="lg"
                    className="font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] border-none shadow-2xl px-8 py-3.5"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Book Stall / Register Now
                  </Button>
                </Link>

                <Link to={`/exhibitions/${activeSlide.slug}`}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="font-bold border-2 border-white bg-slate-950/50 backdrop-blur-md text-white hover:bg-white/20 px-7 py-3.5 shadow-xl"
                    rightIcon={<ChevronRight className="w-4 h-4 text-[#9cc542]" />}
                  >
                    Explore Exhibition
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bottom Indicators & Scroll Link */}
            <div className="pt-6 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => {
                  const el = document.getElementById('upcoming-grid');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-extrabold text-[#9cc542] hover:underline flex items-center gap-2 drop-shadow-sm"
              >
                <span>Explore All Scheduled Trade Shows & Fairs</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Slide Navigation Dots */}
              <div className="flex gap-2 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {heroEvents.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroSlideIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      heroSlideIndex === i ? 'w-8 bg-[#9cc542]' : 'w-2.5 bg-white/50 hover:bg-white'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BELOW HERO: IMAGE CONTAINER CARDS FOR UPCOMING EVENTS */}
        {/* ========================================================================= */}
        <section id="upcoming-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#09539b] uppercase tracking-wider mb-1">
                <LayoutGrid className="w-4 h-4 text-[#9cc542]" /> Upcoming Exhibition Showcase
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#012970] tracking-tight">
                Scheduled B2B Trade Fairs & Expos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Explore rich event profiles, venue location details, and real-time stall layout maps.
              </p>
            </div>

            {/* Sector Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#09539b] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'ALL' ? 'All Trade Fairs' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Exhibition Image Container Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-3">
                  <div className="h-44 bg-slate-200 rounded-xl" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredExhibitions.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-[#012970]">No Exhibitions Found Matching Filter</h3>
              <p className="text-xs text-slate-500">Try adjusting your search query or sector filters.</p>
              <Button variant="outline" size="sm" onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExhibitions.map((expo) => (
                <div
                  key={expo.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Large High-Res Image Container Header */}
                  <div className="relative h-56 bg-slate-900 overflow-hidden">
                    <img
                      src={expo.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                      alt={expo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 bg-[#012970]/90 backdrop-blur-md text-white font-extrabold text-[10px] uppercase rounded-lg shadow-xs">
                        {expo.category || 'Trade Fair'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded-lg shadow-xs">
                        {expo.status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#9cc542]" /> {expo.venue}, {expo.city}
                      </p>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-extrabold text-[#012970] group-hover:text-[#09539b] transition-colors leading-snug">
                        {expo.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-[#09539b] shrink-0" />
                        <span>
                          {new Date(expo.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                          {new Date(expo.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed pt-1">
                        {expo.description}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        {expo.totalStalls || 24} Stalls
                      </span>
                      <div className="flex gap-2">
                        <Link to={`/exhibitions/${expo.slug}/book`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] border-none"
                          >
                            Book Stall
                          </Button>
                        </Link>
                        <Link to={`/exhibitions/${expo.slug}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-bold border-slate-300 text-[#012970]"
                          >
                            Explore
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* RICH EVENT GALLERY SHOWCASE SECTION */}
        {/* ========================================================================= */}
        <section className="bg-white border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-extrabold text-[#09539b] uppercase tracking-wider flex items-center justify-center gap-1">
                <ImageIcon className="w-4 h-4 text-[#9cc542]" /> Exhibition Atmosphere & Footfall
              </span>
              <h2 className="text-3xl font-black text-[#012970] tracking-tight">
                Visual Highlights from Recent Expos
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Glimpse into high footfall trade shows, turnkey booth setups, and business networking sessions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="group relative h-64 rounded-2xl overflow-hidden shadow-md border border-slate-200 cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
                  alt="VIP Inauguration"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#012970] via-[#012970]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <span className="px-2 py-0.5 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded">Grand Opening</span>
                  <h3 className="text-base font-extrabold text-white">VIP Ribbon Cutting Ceremony</h3>
                </div>
              </div>

              <div className="group relative h-64 rounded-2xl overflow-hidden shadow-md border border-slate-200 cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                  alt="Trade Footfall"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#012970] via-[#012970]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <span className="px-2 py-0.5 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded">Visitor Density</span>
                  <h3 className="text-base font-extrabold text-white">Over 15,000 Verified B2B Buyers</h3>
                </div>
              </div>

              <div className="group relative h-64 rounded-2xl overflow-hidden shadow-md border border-slate-200 cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=800&q=80"
                  alt="Shell Stalls"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#012970] via-[#012970]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <span className="px-2 py-0.5 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded">Shell Scheme</span>
                  <h3 className="text-base font-extrabold text-white">Turnkey 10x10 ft Standard Stalls</h3>
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
