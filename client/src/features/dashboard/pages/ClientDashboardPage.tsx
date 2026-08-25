import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { bookingService } from '../../../services/bookings/bookingService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Booking, Exhibition } from '../../../types';
import { BookmarkCheck, Calendar, ArrowRight, Building, Sparkles, MapPin, Layers } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const ClientDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsData, exposData] = await Promise.all([
        bookingService.getMyBookings(),
        exhibitionService.getExhibitions('PUBLISHED'),
      ]);
      setRecentBookings(bookingsData.slice(0, 3));
      setExhibitions(exposData.slice(0, 4));
    } catch (err) {
      console.error('Failed to load client dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-xs rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Exhibitor Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Manage your exhibition stall reservations, corporate company tax profile, inspect real-time SVG hall floor plans, and access official tax invoices.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/exhibitions">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Browse Exhibitions & Stalls
              </Button>
            </Link>
            <Link to="/my-company">
              <Button variant="secondary" leftIcon={<Building className="w-4 h-4" />}>
                Corporate Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bookings</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{recentBookings.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BookmarkCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="max-w-[75%]">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corporate Account</p>
            <p className="text-sm font-bold text-slate-800 mt-1 truncate">
              {user?.company?.name || 'Action Required: Setup Profile'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Expos</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{exhibitions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upcoming Exhibitions Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Featured Exhibitions & Trade Fairs
          </h3>
          <Link to="/exhibitions" className="text-xs text-blue-600 font-bold hover:underline">
            View All Trade Fairs →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exhibitions.map((expo) => (
            <div
              key={expo.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="h-32 bg-slate-800 relative overflow-hidden">
                <img
                  src={
                    expo.bannerUrl ||
                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={expo.title}
                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-md text-[11px] font-bold text-slate-800 shadow-2xs">
                  {expo.totalStalls} Stalls Total
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h4 className="text-base font-bold text-slate-900 leading-snug">{expo.title}</h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {expo.venue}, {expo.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(expo.startDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Starting at ₹1,00,000 / $1,200</span>
                <Link to={`/exhibitions/${expo.slug}`}>
                  <Button variant="primary" size="sm" rightIcon={<Layers className="w-3.5 h-3.5" />}>
                    Select Stall
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
