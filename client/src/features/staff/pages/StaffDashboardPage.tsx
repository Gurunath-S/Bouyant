import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../../services/reports/reportService';
import { bookingService } from '../../../services/bookings/bookingService';
import { ReportOverviewData, Booking } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { formatDisplayDate } from '../../../utils/date';
import {
  CalendarPlus,
  Layers,
  Calendar,
  Building,
  BarChart3,
  MapPin,
  ArrowRight,
  Briefcase,
  Users,
  CreditCard,
  Download,
  Eye,
  UserPlus,
} from 'lucide-react';

export const StaffDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<ReportOverviewData | null>(null);
  const [recentStaffBookings, setRecentStaffBookings] = useState<Booking[]>([]);
  const [totalStaffBookingsCount, setTotalStaffBookingsCount] = useState(0);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  async function fetchMetrics() {
    try {
      const res = await reportService.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load staff metrics:', err);
    }
  }

  async function fetchRecentStaffBookings() {
    try {
      setLoadingBookings(true);
      const res: any = await bookingService.getAllBookings({
        registeredByRole: 'STAFF',
        limit: 5,
      });
      setRecentStaffBookings(res.data || []);
      setTotalStaffBookingsCount(res?.meta?.total || (res.data ? res.data.length : 0));
    } catch (err) {
      console.error('Failed to load recent staff bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    fetchRecentStaffBookings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Operations Staff Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back, <strong>{user?.name}</strong>. Submit new exhibitions, register exhibitors, collect balances, and track operations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/admin/events/register">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-bold"
            >
              Register Exhibitor
            </Button>
          </Link>
          <Link to="/staff/events/register">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarPlus className="w-4 h-4" />}
              className="font-bold border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
            >
              Submit Event
            </Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Events Registered by Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Expos</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalEventsRegistered || 0}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 mt-2 block">
            Attributed to SP: {user?.spcode || 'STAFF'}
          </span>
        </div>

        {/* Exhibitor Bookings by Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Exhibitors Registered
            </p>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {totalStaffBookingsCount}
          </p>
          <span className="text-[11px] font-semibold text-indigo-500 mt-2 block">
            Direct assisted bookings
          </span>
        </div>

        {/* Total Platform Active Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Expos</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.upcomingEvents || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
            Scheduled across platform
          </span>
        </div>

        {/* Stalls in Registered Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity Created</p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalStallsInRegisteredEvents || 0}
          </p>
          <span className="text-[11px] font-semibold text-purple-600 mt-2 block">
            Stalls in your events
          </span>
        </div>
      </div>

      {/* Callout Card for Event Registration */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">
            Register Exhibitors & Allocate Stalls
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Book stalls for exhibitors in the active upcoming exhibition, collect pending advance or balance payments, and download official GST tax invoices on demand.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/admin/events/register">
            <Button
              variant="secondary"
              size="md"
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold shadow-sm shrink-0"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to Event Registration Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* SECTION 1: Recent Exhibitor Registrations by Staff */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              My Recent Exhibitor Registrations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exhibitors you registered into trade shows with stall allocations and balance tracking.
            </p>
          </div>
          <Link
            to="/admin/bookings?registrar=STAFF"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All Bookings ({totalStaffBookingsCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingBookings ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your registrations...</div>
        ) : recentStaffBookings.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {recentStaffBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => setInspectedBooking(b)}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {b.bookingReference}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {b.company?.name || 'Exhibitor'}
                    </span>
                    <BookingStatusBadge status={b.status} />
                    <PaymentStatusBadge status={b.paymentStatus || 'UNPAID'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] mt-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {b.exhibition?.title} ({b.exhibition?.eventCode}-{b.exhibition?.edition})
                    </span>
                    <span>•</span>
                    <span>
                      Stalls:{' '}
                      {b.stalls?.map((bs) => bs.stall?.stallNumber).join(', ') || 'N/A'}
                    </span>
                    <span>•</span>
                    <span>Contact: {b.company?.contactPerson || 'N/A'} ({b.company?.mobile || 'N/A'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {(() => {
                    const grandTotal = Number(b.grandTotal || 0);
                    const paidAmount = Number(b.paidAmount || (b.paymentStatus === 'PAID' || b.paymentStatus === 'PAID_FULL' ? grandTotal : 0));
                    const balanceDue = Number(b.balanceAmount ?? Math.max(0, grandTotal - paidAmount));
                    const isEligible = b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PAID_FULL' && balanceDue > 0 && paidAmount > 0;

                    return (
                      <>
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 block">
                            ₹{grandTotal.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                            Paid: ₹{paidAmount.toLocaleString()}
                          </span>
                          {balanceDue > 0 ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                              Due: ₹{balanceDue.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                              Settled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setInspectedBooking(b)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                            title="View Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isEligible && (
                            <button
                              type="button"
                              onClick={() => setPayingBooking(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                              title="Collect / Record Balance Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Remaining</span>
                            </button>
                          )}

                    {paidAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(b)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Download Tax Bill PDF"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Bill</span>
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No exhibitor bookings registered yet</p>
            <p className="text-slate-400 mt-1">
              Go to the Event Registration Hub to register an exhibitor and allocate stalls.
            </p>
            <Link to="/admin/events/register" className="inline-block mt-3">
              <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Register Exhibitor Now
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* SECTION 2: Recent Events Registered by this Staff */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              My Submitted Events (Catalog)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exhibitions submitted under your account profile.
            </p>
          </div>
          <Link to="/staff/events" className="text-xs font-bold text-emerald-600 hover:underline">
            View All ({data?.registeredEvents?.length || 0}) →
          </Link>
        </div>

        {data?.registeredEvents && data.registeredEvents.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {data.registeredEvents.slice(0, 5).map((e) => (
              <div key={e.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {e.title}
                    </p>
                    <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {e.eventCode}-{e.edition}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDisplayDate(e.startDate)} – {formatDisplayDate(e.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {e.venue}, {e.city}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                      e.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {e.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {e.totalStalls} Stalls planned
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No events submitted yet</p>
            <p className="text-slate-400 mt-1">Submit your first event using the &quot;Submit Event&quot; button above.</p>
          </div>
        )}
      </div>

      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
        onRefresh={() => {
          fetchRecentStaffBookings();
          fetchMetrics();
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
            fetchRecentStaffBookings();
            fetchMetrics();
          }}
          isAdminMode={true}
        />
      )}
    </div>
  );
};
