import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { Exhibition, Stall } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Calendar, MapPin, ArrowLeft, ArrowRight, Building, Award, ShieldCheck, Tag, LayoutGrid, CheckCircle } from 'lucide-react';

export const ExhibitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
        setStalls(stallsData);
      }
    } catch (err) {
      console.error('Failed to load exhibition details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading Exhibition Profile...</div>;
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Exhibition Event Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to Exhibitions
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation & Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/exhibitions')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Exhibitions
        </button>
      </div>

      {/* Main Hero Header */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-3">
        {/* Cover / Main Gallery Image (2 Spans) */}
        <div className="lg:col-span-2 relative h-80 lg:h-auto bg-slate-900">
          <img
            src={galleryImages[activeImageIndex]}
            alt={exhibition.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-blue-600 text-white font-extrabold text-xs uppercase rounded-full shadow-sm">
              {exhibition.status}
            </span>
          </div>

          {/* Image Thumbnails Selector */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto p-1 bg-slate-950/40 backdrop-blur-md rounded-xl">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  activeImageIndex === idx ? 'border-blue-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Info & CTA Card (1 Span) */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-200">
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{exhibition.title}</h1>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">{exhibition.venue}, {exhibition.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {new Date(exhibition.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                  {new Date(exhibition.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">{availableCount} Stalls Available / {stalls.length} Total</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
              <p className="text-xs font-bold text-blue-900">Rental Rates Starting At</p>
              <p className="text-xl font-extrabold text-blue-700 font-mono">₹1,00,000 GST / $1,200</p>
              <p className="text-[11px] text-blue-600">Includes 10×10 ft standard shell scheme stall layout</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="primary" size="lg" className="w-full shadow-md py-3 text-sm font-bold" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Book Your Stall
              </Button>
            </Link>
            <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Company profile setup required prior to selection
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event Specs, Descriptions & Categories (2 Spans) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> About the Exhibition
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{exhibition.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-400 font-semibold uppercase block text-[10px]">Expected Visitors</span>
                <span className="text-slate-900 font-bold text-sm mt-0.5 block">15,000+ Trade Buyers</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-400 font-semibold uppercase block text-[10px]">Total Stalls</span>
                <span className="text-slate-900 font-bold text-sm mt-0.5 block">{stalls.length} Premium Stalls</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-400 font-semibold uppercase block text-[10px]">Hall Type</span>
                <span className="text-slate-900 font-bold text-sm mt-0.5 block">Air-Conditioned Hall 1 & 2</span>
              </div>
            </div>
          </div>

          {/* Stall Categories & Pricing Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" /> Stall Categories & Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-2 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Standard Stall</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded border border-emerald-200">
                    Available
                  </span>
                </div>
                <p className="text-lg font-extrabold text-slate-900 font-mono">₹1,00,000 / $1,200</p>
                <p className="text-xs text-slate-600">10 ft × 10 ft (100 Sq.Ft) shell scheme with basic lighting, table, 2 chairs, power outlet.</p>
              </div>

              <div className="p-4 border border-blue-200 bg-blue-50/30 rounded-xl space-y-2 hover:border-blue-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Premium Corner Stall</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded border border-blue-300">
                    High Demand
                  </span>
                </div>
                <p className="text-lg font-extrabold text-blue-900 font-mono">₹1,50,000 / $1,800</p>
                <p className="text-xs text-slate-600">15 ft × 10 ft (150 Sq.Ft) dual-side open corner position, high footfall visibility.</p>
              </div>

              <div className="p-4 border border-purple-200 bg-purple-50/30 rounded-xl space-y-2 hover:border-purple-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Island Pavilion</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded border border-purple-300">
                    4-Side Open
                  </span>
                </div>
                <p className="text-lg font-extrabold text-purple-900 font-mono">₹3,00,000 / $3,600</p>
                <p className="text-xs text-slate-600">20 ft × 20 ft (400 Sq.Ft) center hall island zone with custom fabrication clearance.</p>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Includes In Package</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Fascia Board Name Printing</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Directory Listing & Exhibitor Passes</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 24/7 Hall Security & Daily Cleaning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Organizer & Venue Info (1 Span) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <Building className="w-4 h-4" /> Organizer & Venue
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px] block">Event Organizer</span>
                <span className="font-bold text-slate-900 text-sm">Buoyant Media & Trade Fairs Pvt Ltd</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-400 uppercase text-[10px] block">Venue Address</span>
                <span className="font-medium text-slate-800">{exhibition.venue}, {exhibition.city}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-400 uppercase text-[10px] block">Helpdesk Support</span>
                <span className="font-medium text-slate-800">+91 (022) 4910-8800 | support@buoyantmedia.com</span>
              </div>
            </div>
          </div>

          {/* Sticky CTA Card */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-extrabold text-white leading-tight">Ready to reserve your booth?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ensure high visibility for your company by reserving your stall position before availability fills up.
            </p>
            <Link to={`/exhibitions/${slug}/book`}>
              <Button variant="primary" size="lg" className="w-full font-bold py-3" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Book Your Stall
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
