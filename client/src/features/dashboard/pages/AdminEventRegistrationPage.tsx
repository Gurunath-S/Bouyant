import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { bookingService } from '../../../services/bookings/bookingService';
import { Exhibition, Booking } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { BackButton } from '../../../components/ui/BackButton';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { formatDisplayDate } from '../../../utils/date';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { AdminRegisterExhibitorModal } from '../components/AdminRegisterExhibitorModal';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import { TablePagination } from '../../../components/ui/TablePagination';
import { CityFilterDropdown } from '../../../components/ui/CityFilterDropdown';
import {
  CalendarPlus,
  Calendar,
  Search,
  UserPlus,
  RefreshCw,
  PlusCircle,
  Eye,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Share2,
  Check,
  Users,
  CreditCard,
  Download,
  Layers,
} from 'lucide-react';

export const AdminEventRegistrationPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStaff = user?.role === 'STAFF';

  // Tab State: 'EVENTS' (Display All Events) vs 'ADMIN_DATA' (Registered Data Separately)
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'ADMIN_DATA'>('EVENTS');

  // Exhibitions & Bookings Data
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Filters for Events Tab
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('PUBLISHED');
  const [eventCityFilter, setEventCityFilter] = useState('ALL');

  // Filters for Registered Data Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingExhibitionFilter, setBookingExhibitionFilter] = useState('ALL');
  const [bookingCityFilter, setBookingCityFilter] = useState('ALL');
  const [registrarFilter, setRegistrarFilter] = useState<string>(isStaff ? 'STAFF' : 'ADMIN');
  const [balanceOnlyFilter, setBalanceOnlyFilter] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const BOOKING_PAGE_SIZE = 10;

  // Modal & Share States
  const [selectedExhibitionForReg, setSelectedExhibitionForReg] = useState<Exhibition | null>(null);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const handleShareEvent = async (e: Exhibition) => {
    const shareUrl = `${window.location.origin}/exhibitions/${e.slug || e.id}/book`;
    const shareData = {
      title: e.title,
      text: `Register for ${e.title} at ${e.venue}, ${e.city}`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedEventId(e.id);
      setTimeout(() => setCopiedEventId(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  async function fetchExhibitions() {
    try {
      setLoadingEvents(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoadingEvents(false);
    }
  }

  async function fetchRegisteredBookings(filterRole?: string, balanceOnly?: boolean) {
    try {
      setLoadingBookings(true);
      const roleToFetch = filterRole ?? registrarFilter;
      const params: any = {};
      if (roleToFetch !== 'ALL') {
        params.registeredByRole = roleToFetch;
      }
      if (balanceOnly ?? balanceOnlyFilter) {
        params.hasBalanceOnly = true;
      }
      const res = await bookingService.getAllBookings(params);
      setAdminBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load registered bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    fetchExhibitions();
    fetchRegisteredBookings(isStaff ? 'STAFF' : 'ADMIN', false);
  }, []);

  const handleRefreshAll = () => {
    fetchExhibitions();
    fetchRegisteredBookings();
  };

  const handleRegistrationSuccess = (newBooking: Booking) => {
    setSuccessBanner(
      `Registration created successfully! Reference: ${newBooking.bookingReference}. Stalls allocated.`
    );
    fetchExhibitions();
    fetchRegisteredBookings();
    setActiveTab('ADMIN_DATA');
    setTimeout(() => setSuccessBanner(null), 8000);
  };

  const currentUpcomingEvent = useMemo(() => {
    const now = new Date();
    const published = exhibitions.filter(
      (e) => e.status === 'PUBLISHED' && new Date(e.endDate) >= now
    );
    if (published.length === 0) return null;
    return published.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0];
  }, [exhibitions]);

  // Distinct unique cities for filtering exhibitions
  const availableEventCities = useMemo(() => {
    const set = new Set<string>();
    for (const e of exhibitions) {
      if (e.city && e.city.trim()) set.add(e.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exhibitions]);

  // Distinct unique cities for filtering registered bookings
  const availableBookingCities = useMemo(() => {
    const set = new Set<string>();
    for (const b of adminBookings) {
      if (b.exhibition?.city && b.exhibition.city.trim()) set.add(b.exhibition.city.trim());
      else if (b.company?.city && b.company.city.trim()) set.add(b.company.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [adminBookings]);

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

      const matchesCity =
        eventCityFilter === 'ALL' ||
        (e.city && e.city.trim().toLowerCase() === eventCityFilter.trim().toLowerCase());

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [exhibitions, eventSearch, eventStatusFilter, eventCityFilter]);

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

      const matchesCity =
        bookingCityFilter === 'ALL' ||
        (b.exhibition?.city && b.exhibition.city.trim().toLowerCase() === bookingCityFilter.trim().toLowerCase()) ||
        (b.company?.city && b.company.city.trim().toLowerCase() === bookingCityFilter.trim().toLowerCase());

      return matchesSearch && matchesExhibition && matchesCity;
    });
  }, [adminBookings, bookingSearch, bookingExhibitionFilter, bookingCityFilter]);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingSearch, bookingExhibitionFilter]);

  const paginatedAdminBookings = useMemo(() => {
    const start = (bookingPage - 1) * BOOKING_PAGE_SIZE;
    return filteredAdminBookings.slice(start, start + BOOKING_PAGE_SIZE);
  }, [filteredAdminBookings, bookingPage]);

  // Statistics
  const totalExhibitions = exhibitions.length;
  const publishedExhibitions = exhibitions.filter((e) => e.status === 'PUBLISHED').length;
  const totalAdminRegistrations = adminBookings.length;
  const totalAdminValue = adminBookings.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Back to Dashboard */}
      <div>
        <BackButton
          to={isStaff ? '/staff/dashboard' : '/admin/dashboard'}
          label="Back to Dashboard"
        />
      </div>

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
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingEvents || loadingBookings ? 'animate-spin' : ''}`} />}
            className="font-bold text-xs shadow-xs"
          >
            Refresh
          </Button>

          {!isStaff && (
            <Link to="/admin/events/new">
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
              >
                Create New Exhibition
              </Button>
            </Link>
          )}
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
              {isStaff ? 'Staff Registrations' : 'Direct Registrations'}
            </span>
            {isStaff ? <Users className="w-4 h-4 text-indigo-500" /> : <ShieldCheck className="w-4 h-4 text-indigo-500" />}
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
            {totalAdminRegistrations}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isStaff ? 'My assisted registrations' : 'Admin & staff registrations'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {isStaff ? 'Staff Allocation Value' : 'Allocation Value'}
            </span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono mt-2 truncate">
            ₹{totalAdminValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isStaff ? 'Revenue generated by you' : 'Total booked revenue'}
          </p>
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
          {isStaff ? <Users className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          <span>{isStaff ? 'My Registered Exhibitors' : 'Registered Exhibitor Data'}</span>
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

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* City / Location Dropdown Filter */}
              <CityFilterDropdown
                label="City"
                value={eventCityFilter}
                onChange={setEventCityFilter}
                cities={availableEventCities}
                placeholder="All Cities"
              />

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-500 shrink-0">Status:</label>
                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PUBLISHED">Published (Ready for Booking)</option>
                  <option value="DRAFT">Draft Mode</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
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
                // Calculate accurate stall numbers
                const allStalls = (e.floorPlans || []).flatMap((fp: any) => fp.stalls || []);
                const stallCountFromDb = allStalls.length > 0 ? allStalls.length : (e.totalStalls || 0);

                let bookedCount = typeof e.bookedStallsCount === 'number'
                  ? e.bookedStallsCount
                  : allStalls.filter((s: any) => s.status !== 'AVAILABLE').length;

                // Fallback check against adminBookings
                if (bookedCount === 0 && adminBookings.length > 0) {
                  const evBookings = adminBookings.filter(
                    (b) => b.exhibitionId === e.id && b.status !== 'CANCELLED' && b.status !== 'EXPIRED'
                  );
                  if (evBookings.length > 0) {
                    bookedCount = evBookings.reduce((sum, b) => sum + (b.stalls?.length || 1), 0);
                  }
                }

                const totalStalls = stallCountFromDb > 0 ? stallCountFromDb : (e.totalStalls || 0);
                const availableStalls = typeof e.availableStallsCount === 'number'
                  ? e.availableStallsCount
                  : Math.max(0, totalStalls - bookedCount);
                const percentBooked = totalStalls > 0 ? Math.min(100, Math.round((bookedCount / totalStalls) * 100)) : 0;
                const isFull = e.isFull === true || (totalStalls > 0 && (availableStalls === 0 || bookedCount >= totalStalls));
                const isCurrentUpcoming = currentUpcomingEvent && e.id === currentUpcomingEvent.id;

                return (
                  <div
                    key={e.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                      isFull
                        ? 'border-rose-300 dark:border-rose-900/60'
                        : isCurrentUpcoming
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
                              isFull
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-sm'
                                : isCurrentUpcoming
                                ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                                : e.status === 'PUBLISHED'
                                ? 'bg-slate-700 text-slate-200'
                                : e.status === 'COMPLETED'
                                ? 'bg-blue-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {isFull
                              ? 'Fully Booked • Housefull'
                              : isCurrentUpcoming
                              ? 'Current Active Event'
                              : e.status}
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
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Booked Stalls:</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {bookedCount} / {totalStalls} stalls ({percentBooked}%)
                              {isFull && (
                                <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase rounded">
                                  Full
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFull
                                  ? 'bg-rose-500'
                                  : percentBooked >= 85
                                  ? 'bg-amber-500'
                                  : 'bg-purple-600'
                              }`}
                              style={{ width: `${percentBooked}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>
                              {isFull ? (
                                <strong className="text-rose-600 dark:text-rose-400 font-semibold">0 stalls remaining</strong>
                              ) : (
                                `${availableStalls} ${availableStalls === 1 ? 'stall' : 'stalls'} available`
                              )}
                            </span>
                            <span>{isFull ? 'Registrations Closed' : 'Allocation Open'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 pt-0">
                      <div className="flex items-center gap-2">
                        {isFull ? (
                          // When stall is full: hide registration and show "See Details" navigating to event details page
                          <Link
                            to={`/exhibitions/${e.slug || e.id}`}
                            className="flex-1"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              leftIcon={<Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                              className="w-full font-black text-xs py-2.5 rounded-xl border-purple-300 dark:border-purple-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs"
                            >
                              See Details
                            </Button>
                          </Link>
                        ) : (
                          // When not full: show regular registration button
                          <>
                            <Button
                              type="button"
                              variant={e.status === 'PUBLISHED' ? 'primary' : 'outline'}
                              size="md"
                              disabled={e.status !== 'PUBLISHED'}
                              onClick={() => setSelectedExhibitionForReg(e)}
                              leftIcon={<UserPlus className="w-4 h-4" />}
                              className={`flex-1 font-black text-xs py-2.5 rounded-xl shadow-xs cursor-pointer ${
                                e.status === 'PUBLISHED'
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              {e.status === 'PUBLISHED' ? 'Register Exhibitor' : `Status: ${e.status}`}
                            </Button>

                            <Link
                              to={e.status === 'PUBLISHED' ? `/exhibitions/${e.slug || e.id}/book` : '#'}
                              title="Open Interactive Floor Plan Booking Wizard"
                              className={`h-[42px] px-2.5 flex items-center justify-center gap-1 rounded-xl font-bold text-xs transition-all active:scale-[0.95] shrink-0 border ${
                                e.status === 'PUBLISHED'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 cursor-pointer'
                                  : 'opacity-40 pointer-events-none border-slate-200'
                              }`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Wizard</span>
                            </Link>
                          </>
                        )}

                        <button
                          type="button"
                          title={copiedEventId === e.id ? 'Event Link Copied!' : 'Share Event'}
                          onClick={() => handleShareEvent(e)}
                          className={`h-[42px] w-[42px] flex items-center justify-center rounded-xl font-bold text-xs transition-all active:scale-[0.95] shrink-0 ${
                            copiedEventId === e.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                          }`}
                        >
                          {copiedEventId === e.id ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTERED DATA DISPLAY (ADMIN & STAFF) */}
      {activeTab === 'ADMIN_DATA' && (
        <div className="space-y-4">
          {/* Filters for Admin & Staff Registered Data */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by company, booking reference, or stall #..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!isStaff && (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-500 shrink-0">Registrar:</label>
                  <select
                    value={registrarFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegistrarFilter(val);
                      fetchRegisteredBookings(val);
                    }}
                    className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="ADMIN">Admin Registered</option>
                    <option value="STAFF">Staff Registered</option>
                    <option value="ALL">All Roles</option>
                  </select>
                </div>
              )}

              <CityFilterDropdown
                label="City"
                value={bookingCityFilter}
                onChange={setBookingCityFilter}
                cities={availableBookingCities}
                placeholder="All Cities"
              />

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-500 shrink-0">Exhibition:</label>
                <select
                  value={bookingExhibitionFilter}
                  onChange={(e) => setBookingExhibitionFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate"
                >
                  <option value="ALL">All Exhibitions</option>
                  {exhibitions.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.eventCode}-{ex.edition})
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-100/50">
                <input
                  type="checkbox"
                  checked={balanceOnlyFilter}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setBalanceOnlyFilter(val);
                    fetchRegisteredBookings(undefined, val);
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Pending Balance Only</span>
              </label>
            </div>
          </div>

          {loadingBookings ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading registered exhibitor data...</div>
          ) : filteredAdminBookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No Registered Exhibitors Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No bookings matching your active filters. Switch to the &quot;Available Exhibitions&quot; tab and click &quot;Register to Event&quot; to allocate stalls.
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
                      <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                      <th className="py-3.5 px-4">Booking Ref</th>
                      <th className="py-3.5 px-4">Exhibition Event</th>
                      <th className="py-3.5 px-4">Registered Company</th>
                      <th className="py-3.5 px-4">Allocated Stalls</th>
                      <th className="py-3.5 px-4">Status & Payment</th>
                      <th className="py-3.5 px-4 text-right">Value & Balance</th>
                      <th className="py-3.5 px-4">Registrar</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {paginatedAdminBookings.map((b, idx) => (
                      <tr
                        key={b.id}
                        onClick={() => setInspectedBooking(b)}
                        className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 cursor-pointer transition-colors"
                      >
                        <td className="w-12 py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                          {(bookingPage - 1) * BOOKING_PAGE_SIZE + idx + 1}
                        </td>
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
                          <div className="flex flex-col gap-1 items-start">
                            <BookingStatusBadge status={b.status} />
                            <PaymentStatusBadge status={b.paymentStatus || 'UNPAID'} />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs block">
                            ₹{Number(b.grandTotal).toLocaleString()}
                          </span>
                          {Number(b.balanceAmount) > 0 ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                              Due: ₹{Number(b.balanceAmount).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                              Fully Paid
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-xs text-purple-700 dark:text-purple-300 block">
                            {(b as any).user?.name || (isStaff ? 'My Account' : 'Administrator')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {(b as any).user?.spcode || (b as any).user?.role || (isStaff ? 'STAFF' : 'ADMIN')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              title="View Booking Dossier"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedBooking(b);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {Number(b.balanceAmount) > 0 && b.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                title="Collect / Record Pending Balance"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayingBooking(b);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Pay</span>
                              </button>
                            )}

                            <button
                              type="button"
                              title="Download Tax Invoice / Bill"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadInvoicePdf(b);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                              <span>Bill</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={bookingPage}
                totalItems={filteredAdminBookings.length}
                pageSize={BOOKING_PAGE_SIZE}
                onPageChange={setBookingPage}
                itemLabel="registrations"
              />
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
        onRefresh={() => {
          fetchRegisteredBookings();
          fetchExhibitions();
        }}
      />

      {/* Complete Payment Modal for Pending Balance */}
      {payingBooking && (
        <CompletePaymentModal
          booking={payingBooking}
          isOpen={!!payingBooking}
          onClose={() => setPayingBooking(null)}
          onSuccess={() => {
            setPayingBooking(null);
            fetchRegisteredBookings();
            setSuccessBanner(`Payment recorded successfully for booking #${payingBooking.bookingReference}`);
          }}
          isAdminMode={true}
        />
      )}
    </div>
  );
};
