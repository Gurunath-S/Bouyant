import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { ShieldCheck, Layers, Building, BookmarkCheck, IndianRupee, ArrowUpRight, TrendingUp, Eye, CalendarPlus, Calendar, MapPin, Tag } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { formatDisplayDate } from '../../../utils/date';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [currentUpcomingEvent, setCurrentUpcomingEvent] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<any | null>(null);

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);

      const [exhibitionsRes, bookingsRes] = await Promise.all([
        exhibitionService.getExhibitions('PUBLISHED'),
        apiClient.get('/bookings'),
      ]);

      const allExhibitions: Exhibition[] = exhibitionsRes || [];
      const allBookings: any[] = bookingsRes.data || [];

      // Find Current Active Upcoming Event (PUBLISHED, endDate >= now, earliest startDate)
      const now = new Date();
      const activeUpcomingSummary = allExhibitions
        .filter((e) => new Date(e.endDate) >= now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;

      let fullActiveUpcoming = activeUpcomingSummary;
      if (activeUpcomingSummary) {
        try {
          fullActiveUpcoming = await exhibitionService.getExhibitionBySlug(activeUpcomingSummary.slug || activeUpcomingSummary.id);
        } catch (e) {
          console.warn('Could not load full stalls details for active event', e);
        }
      }

      setCurrentUpcomingEvent(fullActiveUpcoming);

      // Filter bookings strictly for the current active upcoming event
      const currentBookings = fullActiveUpcoming
        ? allBookings.filter((b) => b.exhibitionId === fullActiveUpcoming.id)
        : [];

      // Calculate Stall Occupancy numerical metrics
      let totalStalls = fullActiveUpcoming?.totalStalls || 50;
      let bookedStallsCount = 0;

      if (fullActiveUpcoming?.floorPlans && fullActiveUpcoming.floorPlans.length > 0) {
        const stallsList = fullActiveUpcoming.floorPlans.flatMap((fp) => fp.stalls || []);
        if (stallsList.length > 0) {
          totalStalls = stallsList.length;
          bookedStallsCount = stallsList.filter(
            (s) => s.status === 'BOOKED_CONFIRMED' || s.status === 'PAYMENT_PENDING' || s.status === 'TEMPORARILY_HELD' || s.status === 'BOOKING_IN_PROGRESS'
          ).length;
        }
      }

      if (bookedStallsCount === 0 && currentBookings.length > 0) {
        bookedStallsCount = currentBookings.reduce((sum, b) => sum + (b.stalls?.length || 1), 0);
      }

      const remainingStalls = Math.max(0, totalStalls - bookedStallsCount);
      const fillPercent = Math.min(100, Math.round((bookedStallsCount / totalStalls) * 100));

      const totalRevenue = currentBookings.reduce(
        (sum, b) => sum + (Number(b.grandTotal) || 0),
        0
      );
      const confirmedBookings = currentBookings.filter((b) => b.status === 'CONFIRMED');

      setStats({
        totalBookings: currentBookings.length,
        confirmedBookings: confirmedBookings.length,
        totalRevenue,
        recentBookings: currentBookings,
        totalStalls,
        bookedStallsCount,
        remainingStalls,
        fillPercent,
      });
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time stall occupancy, recent bookings, payments, and registered exhibitors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/events/register">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarPlus className="w-4 h-4 text-purple-600" />}
              className="border-purple-200 hover:border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Register Event
            </Button>
          </Link>
          <Link to="/admin/events">
            <Button variant="primary" size="sm" leftIcon={<Layers className="w-4 h-4" />}>
              Manage Exhibitions
            </Button>
          </Link>
        </div>
      </div>

      {/* Current Active Event Overview Banner */}
      {currentUpcomingEvent ? (
        <div className="bg-purple-50 dark:bg-purple-950/40 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-xs border border-purple-200 dark:border-purple-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 font-mono text-[11px] font-bold">
                {currentUpcomingEvent.eventCode || 'EX'}-{currentUpcomingEvent.edition || '01'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                Bookings Open
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-purple-950 dark:text-purple-100">
              {currentUpcomingEvent.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 flex-wrap font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                {currentUpcomingEvent.venue}, {currentUpcomingEvent.city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                {formatDisplayDate(currentUpcomingEvent.startDate)} – {formatDisplayDate(currentUpcomingEvent.endDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to={`/exhibitions/${currentUpcomingEvent.slug || currentUpcomingEvent.id}`}>
              <Button variant="outline" size="sm" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 text-xs font-semibold">
                View Public Page
              </Button>
            </Link>
            <Link to="/admin/events/register">
              <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
                Register Exhibitor
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold">
          No current active upcoming event with open bookings.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Event Revenue</p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            ₹{stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '0'} INR
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
            <TrendingUp className="w-3 h-3" /> Confirmed Event Revenue
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stall Occupancy</p>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <BookmarkCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-extrabold text-slate-900 font-mono">
                {stats?.bookedStallsCount || 0} <span className="text-xs font-normal text-slate-500">/ {stats?.totalStalls || 50} Stalls Filled</span>
              </p>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {stats?.fillPercent || 0}%
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${stats?.fillPercent || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
              <span>Remaining: <strong className="text-emerald-600 font-mono">{stats?.remainingStalls || 0} Stalls</strong></span>
              <span>{stats?.totalBookings || 0} Total Orders</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Code & Edition</p>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold font-mono text-purple-700 mt-2 truncate">
            {currentUpcomingEvent ? `${currentUpcomingEvent.eventCode || 'EX'}-${currentUpcomingEvent.edition || '01'}` : 'N/A'}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block truncate" title={currentUpcomingEvent?.title}>
            {currentUpcomingEvent ? currentUpcomingEvent.title : 'No active event'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Venue</p>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-extrabold text-slate-900 mt-2 truncate">
            {currentUpcomingEvent ? currentUpcomingEvent.city : 'N/A'}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block truncate" title={currentUpcomingEvent?.venue}>
            {currentUpcomingEvent ? currentUpcomingEvent.venue : 'N/A'}
          </span>
        </div>
      </div>

      {/* Recent Ledger Audit */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Recent Bookings</h3>
          <Link to="/admin/bookings" className="text-xs text-blue-600 font-bold hover:underline">
            View All Bookings →
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Exhibition Event</th>
                <th className="py-3 px-4">Stall #</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {stats?.recentBookings?.map((b: any) => (
                <tr
                  key={b.id}
                  onClick={() => setInspectedBooking(b)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-700 group-hover:underline">
                    {b.bookingReference}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{b.exhibition?.title}</td>
                  <td className="py-3 px-4 font-bold text-slate-700">Stall {b.stall?.stallNumber}</td>
                  <td className="py-3 px-4">{b.company?.name}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(b.grandTotal).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] rounded">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedBooking(b);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                      title="Inspect full booking details"
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

      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
      />
    </div>
  );
};
