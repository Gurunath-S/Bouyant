import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { Exhibition, Stall } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { FloorPlanCanvas } from '../../floor-plan/components/FloorPlanCanvas';
import {
  Calendar,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Building,
  Award,
  ShieldCheck,
  Tag,
  LayoutGrid,
  CheckCircle,
  Users,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Download,
  ExternalLink,
  Check,
} from 'lucide-react';

export const ExhibitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'floorplan' | 'pricing' | 'schedule' | 'sponsors'>('overview');

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
        <div className="w-12 h-12 border-4 border-[#09539b] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#012970]">Loading Exhibition Profile...</p>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-[#012970]">Exhibition Event Not Found</h3>
        <p className="text-xs text-slate-500">The requested trade fair could not be located in our directory.</p>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to All Exhibitions
        </Button>
      </div>
    );
  }

  const galleryImages = [
    exhibition.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80',
  ];

  const availableCount = stalls.filter((s) => s.status === 'AVAILABLE').length;

  return (
    <div className="space-y-10 max-w-7xl mx-auto font-sans pb-16">
      {/* Back Navigation */}
      <div>
        <button
          onClick={() => navigate('/exhibitions')}
          className="text-xs font-bold text-[#09539b] hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Exhibition Catalog
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HERO BANNER & PRIMARY SUMMARY */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-md grid grid-cols-1 lg:grid-cols-12">
        {/* Gallery Image (7 Spans) */}
        <div className="lg:col-span-7 relative h-80 lg:h-auto bg-slate-900">
          <img
            src={galleryImages[activeImageIndex]}
            alt={exhibition.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-[#012970]/90 backdrop-blur-md text-white font-extrabold text-xs uppercase rounded-lg shadow-sm border border-white/20">
              {exhibition.category || 'B2B Trade Fair'}
            </span>
            <span className="px-3 py-1 bg-[#9cc542] text-[#012970] font-black text-xs uppercase rounded-lg shadow-sm">
              {exhibition.status}
            </span>
          </div>

          {/* Gallery Thumbnails */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto p-1.5 bg-slate-950/50 backdrop-blur-md rounded-xl">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  activeImageIndex === idx ? 'border-[#9cc542] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Info & CTA (5 Spans) */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#f6f9ff] border-t lg:border-t-0 lg:border-l border-slate-200">
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-black text-[#012970] leading-tight">{exhibition.title}</h1>

            <div className="space-y-2.5 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#09539b] shrink-0" />
                <span className="text-slate-900 font-bold">{exhibition.venue}, {exhibition.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#09539b] shrink-0" />
                <span className="text-slate-900 font-bold">
                  {new Date(exhibition.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                  {new Date(exhibition.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#09539b] shrink-0" />
                <span className="text-slate-900 font-bold">{availableCount} Shell Scheme Stalls Available</span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-2xs">
              <p className="text-xs font-extrabold text-[#09539b] uppercase tracking-wider">Stall Rental Rates Starting At</p>
              <p className="text-2xl font-black text-[#012970] font-mono">₹1,00,000 GST / $1,200</p>
              <p className="text-[11px] text-slate-500 font-medium">Includes 10×10 ft turnkey shell scheme, lighting, fascia printing & power.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link to={`/exhibitions/${slug}/book`}>
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-md py-3.5 text-sm font-extrabold bg-[#09539b] hover:bg-[#012970]"
                rightIcon={<ArrowRight className="w-4 h-4 text-[#9cc542]" />}
              >
                Become an Exhibitor & Book Stall
              </Button>
            </Link>
            <p className="text-[11px] text-center text-slate-500 font-semibold flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Instant GST Invoicing & Secured Stall Allocation
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KEY EVENT STATISTICS RIBBON */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-[#09539b]">
            <Users className="w-5 h-5 text-[#09539b]" />
            <span className="text-xs font-extrabold uppercase text-slate-400">Trade Visitors</span>
          </div>
          <p className="text-2xl font-black text-[#012970]">15,000+</p>
          <p className="text-[11px] text-slate-500 font-medium">Pre-registered B2B Buyers</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-[#09539b]">
            <Building className="w-5 h-5 text-[#09539b]" />
            <span className="text-xs font-extrabold uppercase text-slate-400">Exhibitors</span>
          </div>
          <p className="text-2xl font-black text-[#012970]">{stalls.length > 0 ? stalls.length * 3 : '250+'}</p>
          <p className="text-[11px] text-slate-500 font-medium">Leading Industry Brands</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-[#09539b]">
            <LayoutGrid className="w-5 h-5 text-[#09539b]" />
            <span className="text-xs font-extrabold uppercase text-slate-400">Gross Space</span>
          </div>
          <p className="text-2xl font-black text-[#012970]">100,000</p>
          <p className="text-[11px] text-slate-500 font-medium">Square Feet Air-Conditioned</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-[#09539b]">
            <Award className="w-5 h-5 text-[#9cc542]" />
            <span className="text-xs font-extrabold uppercase text-slate-400">Venue Grade</span>
          </div>
          <p className="text-2xl font-black text-[#012970]">Grade A+</p>
          <p className="text-[11px] text-slate-500 font-medium">International Standard Complex</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION ANCHOR TABS */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'overview' ? 'bg-[#012970] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          About Exhibition
        </button>
        <button
          onClick={() => setActiveTab('floorplan')}
          className={`px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'floorplan' ? 'bg-[#012970] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Interactive Floor Plan
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'pricing' ? 'bg-[#012970] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Stall Pricing & Amenities
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'schedule' ? 'bg-[#012970] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Important Schedule
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT SECTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
              <h2 className="text-xl font-extrabold text-[#012970] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#09539b]" /> Event Profile & Objectives
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{exhibition.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs font-medium">
                <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-[#012970] text-sm block">Focus Sectors</span>
                  <p className="text-slate-600">Equipment Manufacturers, OEM Suppliers, Importers, Industrial Distributors.</p>
                </div>
                <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-[#012970] text-sm block">Target Visitor Profiles</span>
                  <p className="text-slate-600">Managing Directors, Purchase Managers, Technical Engineers, Trade Dealers.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <h3 className="text-xs font-extrabold text-[#012970] uppercase tracking-wider border-b border-slate-100 pb-2">
                Organizer Contacts
              </h3>
              <div className="space-y-3 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#09539b]" />
                  <span>Buoyant Media & Trade Fairs Pvt Ltd</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#09539b]" />
                  <span>+91 (0422) 4910-880</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#09539b]" />
                  <span>support@buoyantevents.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'floorplan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#012970]">Interactive Hall A Floor Map</h2>
              <p className="text-xs text-slate-500">Preview stall positions, aisles, and main entrance zones</p>
            </div>
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="primary" size="sm" className="font-bold bg-[#09539b]">
                Select Stall & Book
              </Button>
            </Link>
          </div>

          <FloorPlanCanvas
            stalls={stalls}
            onStallSelect={(stall) => {
              navigate(`/exhibitions/${slug}/book`);
            }}
          />
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs hover:border-[#09539b] transition-colors">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase rounded-md">
              Standard Scheme
            </span>
            <h3 className="text-xl font-extrabold text-[#012970]">Standard Shell Stall</h3>
            <p className="text-2xl font-black font-mono text-[#012970]">₹1,00,000 <span className="text-xs text-slate-500 font-normal">+ GST</span></p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 10 ft × 10 ft (100 Sq.Ft) Area</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Octanorm Partition Panels</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Fascia Board Name Printing</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 1 Table, 2 Chairs, 1 Wastebin</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 5A Power Outlet & 3 Spotlights</li>
            </ul>
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="outline" className="w-full font-bold border-[#012970] text-[#012970]">
                Book Standard Stall
              </Button>
            </Link>
          </div>

          <div className="bg-white border-2 border-[#09539b] rounded-2xl p-6 space-y-4 shadow-md relative">
            <span className="absolute -top-3 right-6 px-3 py-0.5 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded-md shadow-xs">
              Most Popular
            </span>
            <span className="px-3 py-1 bg-[#09539b]/10 text-[#09539b] font-extrabold text-[10px] uppercase rounded-md">
              Corner Position
            </span>
            <h3 className="text-xl font-extrabold text-[#012970]">Premium Corner Stall</h3>
            <p className="text-2xl font-black font-mono text-[#09539b]">₹1,50,000 <span className="text-xs text-slate-500 font-normal">+ GST</span></p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 15 ft × 10 ft (150 Sq.Ft) Dual Open</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Dual Side Open Footfall Visibility</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Fascia Printing on Both Aisle Sides</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 2 Tables, 4 Chairs & 5 Spotlights</li>
            </ul>
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="primary" className="w-full font-bold bg-[#09539b]">
                Book Corner Stall
              </Button>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs hover:border-[#09539b] transition-colors">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-[10px] uppercase rounded-md">
              4-Side Open
            </span>
            <h3 className="text-xl font-extrabold text-[#012970]">Island Pavilion Zone</h3>
            <p className="text-2xl font-black font-mono text-[#012970]">₹3,00,000 <span className="text-xs text-slate-500 font-normal">+ GST</span></p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 20 ft × 20 ft (400 Sq.Ft) Center Hall</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Custom Fabrication Floor Space</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 3-Phase Heavy Power Connection</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> VIP Exhibitor Passes Included</li>
            </ul>
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="outline" className="w-full font-bold border-[#012970] text-[#012970]">
                Book Island Pavilion
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <h2 className="text-xl font-extrabold text-[#012970] border-b border-slate-100 pb-3">Exhibition Schedule & Key Dates</h2>
          <div className="space-y-4 max-w-2xl text-xs font-semibold text-slate-700">
            <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#012970] text-sm block">Stall Booking & Fascia Confirmation</span>
                <span className="text-slate-500">Early bird priority allocation phase</span>
              </div>
              <span className="px-3 py-1 bg-[#09539b] text-white rounded-lg font-mono">Active Now</span>
            </div>
            <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#012970] text-sm block">Exhibitor Move-In & Stall Fabrication</span>
                <span className="text-slate-500">Hall access for stall setup & branding</span>
              </div>
              <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg font-mono">1 Day Prior to Opening</span>
            </div>
            <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#012970] text-sm block">Official Expo Inauguration & Trade Days</span>
                <span className="text-slate-500">Hall open for trade visitors (10:00 AM - 6:00 PM)</span>
              </div>
              <span className="px-3 py-1 bg-[#9cc542] text-[#012970] rounded-lg font-mono">Expo Days</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INESCAPABLE BOTTOM CTA CONVERSION BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#012970] via-[#09539b] to-[#012970] text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-black text-white">Ready to exhibit at {exhibition.title}?</h3>
          <p className="text-slate-200 text-xs sm:text-sm">
            Reserve your preferred stall location on our interactive SVG floor map today.
          </p>
        </div>
        <Link to={`/exhibitions/${slug}/book`}>
          <Button
            variant="primary"
            size="lg"
            className="font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] shadow-md border-none px-8 py-3.5"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Book Your Stall Now
          </Button>
        </Link>
      </div>
    </div>
  );
};
