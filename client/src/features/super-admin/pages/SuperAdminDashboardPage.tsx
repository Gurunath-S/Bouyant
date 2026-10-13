import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { reportService } from '../../../services/reports/reportService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { ReportOverviewData, Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import {
  ShieldAlert,
  Users,
  Layers,
  IndianRupee,
  BookmarkCheck,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SuperAdminDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get('exhibitionId') || 'ALL';

  const [data, setData] = useState<ReportOverviewData | null>(null);
  const [publishedEvents, setPublishedEvents] = useState<Exhibition[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  // Filters for recent bookings stream
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Request race-condition protection ref
  const requestIdRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const events = await exhibitionService.getExhibitions('PUBLISHED');
      setPublishedEvents(events || []);
    } catch (err) {
      console.error('Failed to load published events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const fetchMetrics = useCallback(async (eventId: string) => {
    const currentReqId = ++requestIdRef.current;
    try {
      setLoadingMetrics(true);
      setErrorMetrics(null);
      const res = await reportService.getOverview(eventId !== 'ALL' ? eventId : undefined);
      if (currentReqId === requestIdRef.current) {
        setData(res);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        console.error('Failed to load SuperAdmin overview metrics:', err);
        setErrorMetrics(err?.response?.data?.message || err?.message || 'Failed to load metrics.');
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoadingMetrics(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchMetrics(selectedEventId);
  }, [selectedEventId, fetchMetrics]);

  const handleEventChange = (eventId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (eventId === 'ALL') {
      nextParams.delete('exhibitionId');
    } else {
      nextParams.set('exhibitionId', eventId);
    }
    setSearchParams(nextParams);
  };

  const isEventScoped = selectedEventId !== 'ALL' && data?.eventScoped;

  // Filter recent bookings based on search query and status filter
  const filteredRecentBookings = (data?.recentBookings || []).filter((b: any) => {
    const matchesSearch =
      bookingSearch.trim() === '' ||
      (b.bookingReference && b.bookingReference.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.company?.name && b.company.name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.exhibition?.title && b.exhibition.title.toLowerCase().includes(bookingSearch.toLowerCase()));

    const matchesStatus =
      bookingStatusFilter === 'ALL' ||
      b.status === bookingStatusFilter ||
      b.paymentStatus === bookingStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Platform Super Admin Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Platform-wide governance, event-scoped performance oversight, team administration, and executive analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchEvents();
              fetchMetrics(selectedEventId);
            }}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />}
            className="text-slate-600 dark:text-slate-300 font-semibold"
          >
            Refresh Data
          </Button>
          <Link to="/super-admin/users">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-4 h-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold border-0 shadow-xs"
            >
              User Governance
            </Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Analytics Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Top Filter Bar & Event Scope Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label
              htmlFor="overview-event-selector"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Event Scope Filter
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                id="overview-event-selector"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                disabled={loadingEvents}
                className="w-full sm:w-auto min-w-[280px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
              >
                <option value="ALL">All Events (Platform-Wide Overview)</option>
                {publishedEvents.length > 0 ? (
                  publishedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} {ev.edition ? `(Edition ${ev.edition})` : ''} — {ev.city}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    {loadingEvents ? 'Loading published events...' : 'No published events found'}
                  </option>
                )}
              </select>
              {isEventScoped && (
                <button
                  onClick={() => handleEventChange('ALL')}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 underline shrink-0 px-2"
                >
                  Reset to All Events
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isEventScoped
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isEventScoped ? 'bg-purple-500' : 'bg-amber-500'} animate-pulse`}
            />
            {isEventScoped ? 'Event-Scoped Data' : 'Platform-Wide Aggregation'}
          </span>
        </div>
      </div>

      {/* 3. Event Scope Metadata Card (Displayed when a specific published event is selected) */}
      {isEventScoped && data?.exhibition && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200 dark:border-purple-900/60 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  {data.exhibition.status}
                </span>
                {data.exhibition.eventCode && (
                  <span className="font-mono text-xs font-bold text-slate-500">
                    CODE: {data.exhibition.eventCode}-{data.exhibition.edition || '01'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {data.exhibition.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  {data.exhibition.venue}, {data.exhibition.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  {formatDisplayDate(data.exhibition.startDate)} – {formatDisplayDate(data.exhibition.endDate)}
                </span>
                {data.exhibition.createdBy && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Managed by: {data.exhibition.createdBy.name} ({data.exhibition.createdBy.role})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to={`/admin/events`}>
                <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                  Floor Plan & Stalls
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error notification if metrics failed to load */}
      {errorMetrics && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <p className="font-semibold">Failed to fetch metrics: {errorMetrics}</p>
          <Button variant="outline" size="sm" onClick={() => fetchMetrics(selectedEventId)}>
            Retry
          </Button>
        </div>
      )}

      {/* 4. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          {loadingMetrics && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
          )}
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEventScoped ? 'Event Confirmed Revenue' : 'Gross Platform Revenue'}
            </p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            ₹{data?.totalRevenue ? Number(data.totalRevenue).toLocaleString() : '0'} INR
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {isEventScoped ? 'Attributed to this exhibition' : 'All confirmed reservations'}
          </span>
        </div>

        {/* KPI 2: Team Operations OR Participating Exhibitors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          {loadingMetrics && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          )}
          {isEventScoped ? (
            <>
              <div className="flex justify-between items-start">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Participating Exhibitors
                </p>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {data?.totalExhibitors || 0}
                </p>
                <span className="text-[11px] text-slate-500 font-semibold">Unique Companies</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-2 block">
                Booked stall spaces in this event
              </span>
            </>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Admins & Operations Team
                </p>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {(data?.activeAdmins || 0) + (data?.activeStaff || 0)}
                </p>
                <span className="text-[11px] text-slate-500 font-semibold">Active Team</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
                  {data?.activeAdmins || 0} Admins
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                  {data?.activeStaff || 0} Staff
                </span>
              </div>
            </>
          )}
        </div>

        {/* KPI 3: Bookings Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          {loadingMetrics && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          )}
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEventScoped ? 'Event Bookings Volume' : 'Total Bookings Volume'}
            </p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalBookings || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
            {data?.confirmedBookings || 0} Confirmed Reservations
          </span>
        </div>

        {/* KPI 4: Exhibitions / Stall Occupancy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          {loadingMetrics && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          )}
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEventScoped ? 'Event Stall Occupancy' : 'Exhibitions & Occupancy'}
            </p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {data?.occupancyRate || 0}%
            </p>
            <span className="text-[11px] text-slate-500 font-semibold">
              {data?.occupiedStalls || 0} / {data?.totalStalls || 0} Stalls
            </span>
          </div>
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-2 block">
            {isEventScoped
              ? `${(data?.totalStalls || 0) - (data?.occupiedStalls || 0)} Stalls Available`
              : `${data?.totalExhibitions || 0} Total Expos (${data?.publishedExhibitions || 0} Published)`}
          </span>
        </div>
      </div>

      {/* 5. Governance & Operations Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              User & Team Governance
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Administrative user directory, role governance, account activation, staff SP allocations, and audit details.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/super-admin/users">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Go to User Directory
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              Exhibitions & Floor Plans
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Manage platform exhibitions, design canvas floor plans, configure booth categories, and publish layouts.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/admin/events">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Manage All Exhibitions
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              Platform-Wide Analytics
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Financial summaries, stall occupancy breakdown by category, payment conversions, and exportable logs.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/reports">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                View Full Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Recent Platform Bookings Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {isEventScoped
                ? `Recent Bookings — ${data?.exhibition?.title}`
                : 'Recent Platform Bookings'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEventScoped
                ? 'Audited reservations for this specific exhibition.'
                : 'Stream of incoming reservations across all platform exhibitions.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, company..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40 w-44"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PAID_FULL">PAID FULL</option>
                <option value="INITIATED">INITIATED</option>
                <option value="HELD">HELD</option>
              </select>
            </div>

            <Link
              to={isEventScoped ? `/admin/bookings?exhibitionId=${selectedEventId}` : '/admin/bookings'}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline shrink-0 ml-2"
            >
              All Bookings →
            </Link>
          </div>
        </div>

        {loadingMetrics ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            Loading booking reservations...
          </div>
        ) : filteredRecentBookings.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {filteredRecentBookings.map((b: any) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {b.company?.name || 'Exhibitor Client'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {b.exhibition?.title || 'Exhibition'} • Ref: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{b.bookingReference}</span>
                    {b.createdAt && ` • ${formatDisplayDate(b.createdAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    ₹{Number(b.grandTotal || 0).toLocaleString()} INR
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      b.status === 'CONFIRMED' || b.paymentStatus === 'PAID_FULL'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {b.status || b.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400">
            No booking activities recorded for this selection.
          </div>
        )}
      </div>
    </div>
  );
};
