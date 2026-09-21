import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { bookingService } from '../../../services/bookings/bookingService';
import { Exhibition, Booking } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BookingStatusBadge } from '../../../components/ui/Badge';
import { formatDisplayDate } from '../../../utils/date';
import { AdminRegisterExhibitorModal } from '../components/AdminRegisterExhibitorModal';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import {
  CalendarPlus,
  Calendar,
  Layers,
  Building2,
  Search,
  UserPlus,
  RefreshCw,
  PlusCircle,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const AdminEventRegistrationPage: React.FC = () => {
  const navigate = useNavigate();

  // Tab State: 'EVENTS' (Display All Events) vs 'ADMIN_DATA' (Admin Registered Data Separately)
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'ADMIN_DATA'>('EVENTS');

  // Exhibitions & Bookings Data
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Filters for Events Tab
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('PUBLISHED');

  // Filters for Admin Data Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingExhibitionFilter, setBookingExhibitionFilter] = useState('ALL');

  // Modal States
  const [selectedExhibitionForReg, setSelectedExhibitionForReg] = useState<Exhibition | null>(null);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    fetchExhibitions();
    fetchAdminBookings();
  }, []);

  const fetchExhibitions = async () => {
    try {
      setLoadingEvents(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchAdminBookings = async () => {
    try {
      setLoadingBookings(true);
      const res = await bookingService.getAllBookings({ registeredByRole: 'ADMIN' });
      setAdminBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load admin bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleRefreshAll = () => {
    fetchExhibitions();
    fetchAdminBookings();
  };

  const handleRegistrationSuccess = (newBooking: Booking) => {
    setSuccessBanner(
      `Registration created successfully! Reference: ${newBooking.bookingReference}. Stalls allocated.`
    );
    fetchExhibitions();
    fetchAdminBookings();
    setActiveTab('ADMIN_DATA');
    setTimeout(() => setSuccessBanner(null), 8000);
  };

  const now = new Date();
  const currentUpcomingEvent = useMemo(() => {
    const published = exhibitions.filter(
      (e) => e.status === 'PUBLISHED' && new Date(e.endDate) >= now
    );
    if (published.length === 0) return null;
    return published.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0];
  }, [exhibitions]);

  // Filtered Events
  const filteredExhibitions = useMemo(() => {
    return exhibitions.filter((e) => {
      const matchesSearch =
        !eventSearch.trim() ||
        e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
        (e.city && e.city.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (e.venue && e.venue.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (e.eventCode && e.eventCode.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (e.category && e.category.toLowerCase().includes(eventSearch.toLowerCase()));

      const matchesStatus =
        eventStatusFilter === 'ALL' || e.status === eventStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [exhibitions, eventSearch, eventStatusFilter]);

  // Filtered Admin Bookings
  const filteredAdminBookings = useMemo(() => {
    return adminBookings.filter((b) => {
      const q = bookingSearch.toLowerCase();
      const matchesSearch =
        !bookingSearch.trim() ||
        b.bookingReference.toLowerCase().includes(q) ||
        (b.company?.name && b.company.name.toLowerCase().includes(q)) ||
        (b.company?.contactPerson && b.company.contactPerson.toLowerCase().includes(q)) ||
        (b.exhibition?.title && b.exhibition.title.toLowerCase().includes(q)) ||
        (b.stalls && b.stalls.some((bs) => bs.stall?.stallNumber.toLowerCase().includes(q)));

      const matchesExhibition =
        bookingExhibitionFilter === 'ALL' || b.exhibitionId === bookingExhibitionFilter;

      return matchesSearch && matchesExhibition;
    });
  }, [adminBookings, bookingSearch, bookingExhibitionFilter]);

  // Statistics
  const totalExhibitions = exhibitions.length;
  const publishedExhibitions = exhibitions.filter((e) => e.status === 'PUBLISHED').length;
  const totalAdminRegistrations = adminBookings.length;
  const totalAdminValue = adminBookings.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
              <CalendarPlus className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Event Registration Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Browse exhibitions, register exhibitors to events with direct stall allocation, and audit administration data. <strong className="text-purple-600 dark:text-purple-400">Bookings are strictly open for the current upcoming event alone.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Link to="/admin/events/new">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 text-xs shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create New Exhibition
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Exhibitions</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {totalExhibitions}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Platform catalog</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Open For Booking
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            {publishedExhibitions}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Published & active</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Admin Registrations
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
            {totalAdminRegistrations}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Direct admin allocations</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Admin Allocation Value
            </span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono mt-2 truncate">
            ₹{totalAdminValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total booked revenue</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('EVENTS')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'EVENTS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Available Exhibitions (Register to Event)</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
            {exhibitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ADMIN_DATA')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'ADMIN_DATA'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Registered Data</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono font-bold">
            {adminBookings.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ALL EXHIBITIONS DISPLAY */}
      {activeTab === 'EVENTS' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search exhibitions by title, city, venue, or code..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500 shrink-0">Status:</label>
              <select
                value={eventStatusFilter}
                onChange={(e) => setEventStatusFilter(e.target.value)}
                className="w-full sm:w-auto text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published (Ready for Booking)</option>
                <option value="DRAFT">Draft Mode</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loadingEvents ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading platform exhibitions...</div>
          ) : filteredExhibitions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Exhibitions Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No events matched your search keyword or status filter. Try clearing filters or create a new exhibition.
              </p>
              <Link to="/admin/events/new">
                <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white mt-2">
                  Create Exhibition
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredExhibitions.map((e) => {
                const bookedCount = (e as any)._count?.bookings || 0;
                const totalStalls = e.totalStalls || 50;
                const availableApprox = Math.max(0, totalStalls - bookedCount);
                const percentBooked = Math.min(100, Math.round((bookedCount / totalStalls) * 100));
                const isCurrentUpcoming = currentUpcomingEvent && e.id === currentUpcomingEvent.id;

                return (
                  <div
                    key={e.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                      isCurrentUpcoming
                        ? 'border-purple-600 ring-2 ring-purple-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 opacity-90'
                    }`}
                  >
                    <div>
                      {/* Event Banner Header */}
                      <div className="h-32 bg-slate-900 relative p-4 flex flex-col justify-between text-white overflow-hidden">
                        {e.bannerUrl && (
                          <img
                            src={e.bannerUrl}
                            alt={e.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs text-purple-200 border border-purple-400/30">
                            {e.eventCode || 'EX'}-{e.edition || '01'}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isCurrentUpcoming
                                ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                                : e.status === 'PUBLISHED'
                                ? 'bg-slate-700 text-slate-200'
                                : e.status === 'COMPLETED'
                                ? 'bg-blue-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {isCurrentUpcoming ? 'Current Active Event' : e.status}
                          </span>
                        </div>

                        <div className="relative z-10">
                          {e.category && (
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                              {e.category}
                            </span>
                          )}
                          <h3 className="font-black text-sm text-white line-clamp-1 group-hover:text-purple-200 transition-colors">
                            {e.title}
                          </h3>
                        </div>
                      </div>

                      {/* Event Metadata */}
                      <div className="p-4 space-y-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{e.venue}, {e.city}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            {formatDisplayDate(e.startDate)} – {formatDisplayDate(e.endDate)}
                          </span>
                        </div>

                        {/* Stall Capacity Meter */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">Booked Stalls:</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {bookedCount} / {totalStalls} stalls ({percentBooked}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all"
                              style={{ width: `${percentBooked}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 pt-0">
                      <Link to={isCurrentUpcoming ? `/exhibitions/${e.slug || e.id}/book` : '#'}>
                        <Button
                          type="button"
                          variant={isCurrentUpcoming ? 'primary' : 'outline'}
                          size="md"
                          disabled={!isCurrentUpcoming}
                          className={`w-full font-black text-xs flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-xs ${
                            isCurrentUpcoming
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{isCurrentUpcoming ? 'Register to Event' : 'Booking Restricted (Non-Current)'}</span>
                        </Button>
                      </Link>

                      <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Link
                          to={`/events/${e.slug || e.id}`}
                          target="_blank"
                          className="text-slate-500 hover:text-purple-600 font-semibold"
                        >
                          View Public Page ↗
                        </Link>
                        <Link
                          to={`/admin/events/${e.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Floor Plan Studio →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADMIN REGISTERED DATA DISPLAY SEPARATELY */}
      {activeTab === 'ADMIN_DATA' && (
        <div className="space-y-4">
          {/* Filters for Admin Registered Data */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by company, booking reference, or stall #..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500 shrink-0">Exhibition:</label>
              <select
                value={bookingExhibitionFilter}
                onChange={(e) => setBookingExhibitionFilter(e.target.value)}
                className="w-full sm:w-auto text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold"
              >
                <option value="ALL">All Exhibitions</option>
                {exhibitions.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.eventCode}-{ex.edition})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingBookings ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading admin registered data...</div>
          ) : filteredAdminBookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No Admin Registrations Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No bookings have been registered through the administration side matching your search. Switch to the "Available Exhibitions" tab and click "Register to Event".
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('EVENTS')}
                className="bg-purple-600 hover:bg-purple-700 text-white mt-2"
              >
                Browse Exhibitions to Register
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3.5 px-4">Booking Ref</th>
                      <th className="py-3.5 px-4">Exhibition Event</th>
                      <th className="py-3.5 px-4">Registered Company</th>
                      <th className="py-3.5 px-4">Allocated Stalls</th>
                      <th className="py-3.5 px-4">Status & Payment</th>
                      <th className="py-3.5 px-4 text-right">Value (INR)</th>
                      <th className="py-3.5 px-4">Admin Registrar</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredAdminBookings.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setInspectedBooking(b)}
                        className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300 block">
                            {b.bookingReference}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-xs">
                            {b.exhibition?.title}
                          </span>
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                            {b.exhibition?.eventCode}-{b.exhibition?.edition} • {b.exhibition?.city}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold block text-slate-900 dark:text-slate-100">
                            {b.company?.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {b.company?.contactPerson} ({b.company?.mobile})
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {b.stalls && b.stalls.length > 0 ? (
                              b.stalls.map((bs) => (
                                <span
                                  key={bs.id}
                                  className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px]"
                                >
                                  {bs.stall?.stallNumber}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <BookingStatusBadge status={b.status} />
                          <span className="text-[10px] text-slate-400 block mt-1 font-semibold">
                            {b.paymentStatus || 'UNPAID'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs">
                            ₹{Number(b.grandTotal).toLocaleString()}
                          </span>
                          {Number(b.paidAmount) > 0 && (
                            <span className="text-[10px] text-emerald-600 block">
                              Paid: ₹{Number(b.paidAmount).toLocaleString()}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-xs text-purple-700 dark:text-purple-300 block">
                            {(b as any).user?.name || 'Administrator'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {(b as any).user?.spcode || (b as any).user?.role || 'ADMIN'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedBooking(b);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Registration Modal */}
      {selectedExhibitionForReg && (
        <AdminRegisterExhibitorModal
          isOpen={!!selectedExhibitionForReg}
          onClose={() => setSelectedExhibitionForReg(null)}
          exhibition={selectedExhibitionForReg}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
      />
    </div>
  );
};
