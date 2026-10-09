import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import {
  ShieldCheck,
  Layers,
  BookmarkCheck,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
  Eye,
  Calendar,
  MapPin,
  Users,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { formatDisplayDate } from '../../../utils/date';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [publishedExhibitions, setPublishedExhibitions] = useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>('');
  const [currentUpcomingEvent, setCurrentUpcomingEvent] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<any | null>(null);

  // Table Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Searchable Event Selector Popover State
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  const filteredPublishedExhibitions = useMemo(() => {
    if (!eventSearchQuery.trim()) return publishedExhibitions;
    const q = eventSearchQuery.toLowerCase().trim();
    return publishedExhibitions.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.eventCode && e.eventCode.toLowerCase().includes(q))
    );
  }, [publishedExhibitions, eventSearchQuery]);

  async function fetchAdminDashboardData() {
    try {
      setLoading(true);

      const [exhibitionsRes, bookingsRes] = await Promise.all([
        exhibitionService.getExhibitions('PUBLISHED'),
        apiClient.get('/bookings'),
      ]);

      const allExhibitions: Exhibition[] = exhibitionsRes || [];
      const allBookings: any[] = bookingsRes.data || [];

      setPublishedExhibitions(allExhibitions);

      // Chronologically sorted upcoming published exhibitions
      const now = new Date();
      const upcomingPublishedEvents = allExhibitions
        .filter((e) => new Date(e.endDate) >= now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const defaultEvent = upcomingPublishedEvents[0] || allExhibitions[0] || null;

      // Determine target active event
      let targetSummary = null;
      if (selectedExhibitionId) {
        targetSummary = allExhibitions.find((e) => e.id === selectedExhibitionId) || defaultEvent;
      } else {
        targetSummary = defaultEvent;
        if (defaultEvent) {
          setSelectedExhibitionId(defaultEvent.id);
        }
      }

      let fullActiveUpcoming = targetSummary;
      if (targetSummary) {
        try {
          fullActiveUpcoming = await exhibitionService.getExhibitionBySlug(targetSummary.slug || targetSummary.id);
        } catch (e) {
          console.warn('Could not load full stalls details for selected event', e);
        }
      }

      setCurrentUpcomingEvent(fullActiveUpcoming);

      // Filter bookings strictly for the current active upcoming event (or all bookings if no single event)
      const rawCurrentBookings = fullActiveUpcoming
        ? allBookings.filter((b) => b.exhibitionId === fullActiveUpcoming.id)
        : allBookings;

      // Only paid bookings are considered as valid bookings in Admin areas
      const currentBookings = rawCurrentBookings.filter(
        (b) =>
          b.status === 'CONFIRMED' ||
          b.paymentStatus === 'PAID' ||
          b.paymentStatus === 'PARTIALLY_PAID' ||
          (Number(b.paidAmount || 0) > 0 && b.status !== 'CANCELLED' && b.status !== 'EXPIRED')
      );

      // Calculate Stall Occupancy numerical metrics
      let totalStalls = fullActiveUpcoming?.totalStalls || 50;
      let bookedStallsCount = 0;

      if (fullActiveUpcoming?.floorPlans && fullActiveUpcoming.floorPlans.length > 0) {
        const stallsList = fullActiveUpcoming.floorPlans.flatMap((fp) => fp.stalls || []);
        if (stallsList.length > 0) {
          totalStalls = stallsList.length;
          bookedStallsCount = stallsList.filter(
            (s) => s.status === 'BOOKED_CONFIRMED'
          ).length;
        }
      }

      if (bookedStallsCount === 0 && currentBookings.length > 0) {
        bookedStallsCount = currentBookings.reduce((sum, b) => sum + (b.stalls?.length || 1), 0);
      }

      const remainingStalls = Math.max(0, totalStalls - bookedStallsCount);
      const fillPercent = Math.min(100, Math.round((bookedStallsCount / totalStalls) * 100));

      const totalRevenue = currentBookings.reduce(
        (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
        0
      );
      const confirmedBookings = currentBookings.length;

      // Calculate total paid exhibitors
      const uniqueExhibitorsCount = new Set(
        currentBookings.map((b) => b.companyId || b.company?.id || b.userId || b.user?.id).filter(Boolean)
      ).size;

      // Calculate pending payment / balance for active non-cancelled bookings
      const activeBookingsForPending = rawCurrentBookings.filter(
        (b) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED'
      );

      const pendingPaymentBookings = activeBookingsForPending.filter((b) => {
        const bal = Number(b.balanceAmount);
        if (!isNaN(bal) && bal > 0) return true;
        if (b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PARTIALLY_PAID' || b.status === 'PENDING_PAYMENT') return true;
        return b.paymentStatus !== 'PAID' && (Number(b.grandTotal) - Number(b.paidAmount || 0)) > 0;
      });

      const pendingPaymentAmount = pendingPaymentBookings.reduce((sum, b) => {
        const bal = Number(b.balanceAmount);
        if (!isNaN(bal) && bal > 0) return sum + bal;
        const grand = Number(b.grandTotal) || 0;
        const paid = Number(b.paidAmount) || 0;
        return sum + Math.max(0, grand - paid);
      }, 0);

      const pendingPaymentCount = pendingPaymentBookings.length;

      setStats({
        totalBookings: currentBookings.length,
        confirmedBookings: confirmedBookings,
        totalRevenue,
        recentBookings: currentBookings,
        totalStalls,
        bookedStallsCount,
        remainingStalls,
        fillPercent,
        uniqueExhibitorsCount,
        pendingPaymentAmount,
        pendingPaymentCount,
      });
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminDashboardData();
  }, [selectedExhibitionId]);

  // Helper to extract stall numbers safely from booking object
  const getStallNumbers = (b: any) => {
    if (b.stalls && b.stalls.length > 0) {
      const nums = b.stalls.map((bs: any) => bs.stall?.stallNumber || bs.stallNumber).filter(Boolean);
      if (nums.length > 0) return nums.join(', ');
    }
    return b.stall?.stallNumber || b.stallNumber || 'N/A';
  };

  // Filtered Bookings memoized
  const filteredBookings = useMemo(() => {
    if (!stats?.recentBookings) return [];
    return stats.recentBookings.filter((b: any) => {
      const stallStr = getStallNumbers(b).toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        b.bookingReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stallStr.includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CONFIRMED' && b.status === 'CONFIRMED') ||
        (statusFilter === 'PENDING' && (b.status === 'PENDING_PAYMENT' || b.paymentStatus !== 'PAID_FULL')) ||
        (statusFilter === 'HELD' && (b.status === 'HELD' || b.status === 'INITIATED'));

      return matchesSearch && matchesStatus;
    });
  }, [stats?.recentBookings, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-2">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/3" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Section */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor real-time stall occupancy, recent bookings, revenue metrics, and registered exhibitors.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Searchable Event Selector Dropdown Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEventMenuOpen(!isEventMenuOpen)}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 rounded-xl shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center gap-2 max-w-[260px] truncate cursor-pointer"
              title="Click to search and switch active exhibition event"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">
                {currentUpcomingEvent?.title || 'Select Exhibition Event'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 transition-transform ${isEventMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEventMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsEventMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in duration-150">
                  {/* Search Input inside Popover */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search published events..."
                      value={eventSearchQuery}
                      onChange={(e) => setEventSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/30"
                      autoFocus
                    />
                  </div>

                  {/* Scrollable Event List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {filteredPublishedExhibitions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No published exhibitions found.
                      </div>
                    ) : (
                      filteredPublishedExhibitions.map((e) => {
                        const isSelected = selectedExhibitionId === e.id;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setSelectedExhibitionId(e.id);
                              setIsEventMenuOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                            }`}
                          >
                            <div className="truncate">
                              <span className="block truncate font-semibold">{e.title}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                {e.city || 'India'} {e.eventCode ? `• ${e.eventCode}` : ''}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={fetchAdminDashboardData}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/admin/events">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs transition-colors text-xs"
            >
              Manage Exhibitions
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Active Event Card - Professional & Elegant Layout */}
      {currentUpcomingEvent ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Event Cover Image */}
              <div className="w-full sm:w-56 h-36 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-xs">
                <img
                  src={
                    currentUpcomingEvent.bannerUrl ||
                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'
                  }
                  alt={currentUpcomingEvent.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop';
                  }}
                />
              </div>

              {/* Event Info Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-xs font-bold">
                    {currentUpcomingEvent.eventCode || 'EX'}-{currentUpcomingEvent.edition || '01'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Bookings Open
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                  {currentUpcomingEvent.title}
                </h2>

                <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex-wrap font-medium">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    {currentUpcomingEvent.venue}, {currentUpcomingEvent.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    {formatDisplayDate(currentUpcomingEvent.startDate)} – {formatDisplayDate(currentUpcomingEvent.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <Link to={`/exhibitions/${currentUpcomingEvent.slug || currentUpcomingEvent.id}/book`}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<BookmarkCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                  className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shadow-xs"
                >
                  Book Stall for Exhibitor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>No current active upcoming event with open bookings.</span>
          </div>
          <Link to="/admin/events/register">
            <Button size="sm" variant="outline" className="text-xs">Create Event</Button>
          </Link>
        </div>
      )}

      {/* Modern High-Taste KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Confirmed Revenue */}
        <div className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden select-text">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirmed Revenue</p>
            <Link
              to={`/admin/bookings?status=CONFIRMED${currentUpcomingEvent?.id ? `&exhibitionId=${currentUpcomingEvent.id}` : ''}`}
              className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:scale-110 transition-transform flex items-center gap-1 cursor-pointer"
              title="Click to view confirmed bookings ledger for this event"
            >
              <IndianRupee className="w-4 h-4" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-3 tracking-tight select-text">
            ₹{stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '0'}
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">
            <TrendingUp className="w-3.5 h-3.5" /> Total Active Event Receipts
          </div>
        </div>

        {/* Card 2: Stall Occupancy */}
        <div className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between select-text">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stall Occupancy</p>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <BookmarkCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight select-text">
                {stats?.bookedStallsCount || 0}{' '}
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-sans">
                  / {stats?.totalStalls || 50} Stalls
                </span>
              </p>
              <span className="text-xs font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                {stats?.fillPercent || 0}%
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full"
                style={{ width: `${stats?.fillPercent || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
              <span>
                Remaining: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{stats?.remainingStalls || 0} Stalls</strong>
              </span>
              <span>{stats?.totalBookings || 0} Orders</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Registered Exhibitors */}
        <div className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden select-text">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered</p>
            <Link
              to={`/admin/companies${currentUpcomingEvent?.id ? `?exhibitionId=${currentUpcomingEvent.id}` : ''}`}
              className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:scale-110 transition-transform flex items-center gap-1 cursor-pointer"
              title="Click to view registered exhibitor directory for this event"
            >
              <Users className="w-4 h-4" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-3 tracking-tight select-text">
            {stats?.uniqueExhibitorsCount || 0}{' '}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-sans">
              Exhibitors
            </span>
          </p>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2.5 block truncate">
            Across <strong className="text-slate-700 dark:text-slate-300 font-mono">{stats?.totalBookings || 0}</strong> registered bookings
          </span>
        </div>

        {/* Card 4: Pending Balance */}
        <div className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden select-text">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Balance</p>
            <Link
              to={`/admin/bookings?status=PENDING_PAYMENT${currentUpcomingEvent?.id ? `&exhibitionId=${currentUpcomingEvent.id}` : ''}`}
              className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:scale-110 transition-transform flex items-center gap-1 cursor-pointer"
              title="Click to view pending payment bookings for this event"
            >
              <Clock className="w-4 h-4" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-3 tracking-tight select-text">
            ₹{stats?.pendingPaymentAmount ? Number(stats.pendingPaymentAmount).toLocaleString() : '0'}
          </p>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2.5 block truncate">
            <strong className="font-mono">{stats?.pendingPaymentCount || 0}</strong> bookings awaiting balance
          </span>
        </div>
      </div>

      {/* Interactive Recent Bookings Audit Table Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Recent Bookings Ledger</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {filteredBookings.length} items
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live stream of recently placed exhibitor bookings</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, company..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-44 sm:w-56"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'CONFIRMED'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
            </div>

            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline transition-colors ml-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Exhibition Event</th>
                  <th className="py-3.5 px-4">Stall #</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((b: any) => (
                    <tr
                      key={b.id}
                      onClick={() => setInspectedBooking(b)}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400 group-hover:underline">
                        {b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{b.exhibition?.title}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">Stall {getStallNumbers(b)}</td>
                      <td className="py-3.5 px-4 font-medium">{b.company?.name}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(b.grandTotal).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 font-bold text-[10px] rounded-full border ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : b.status === 'PENDING_PAYMENT'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedBooking(b);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-lg transition-all"
                          title="Inspect full booking details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                      No matching bookings found for the selected search/filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
      />
    </div>
  );
};
