import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { bookingService } from '../../../services/bookings/bookingService';
import { Exhibition, Booking } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';
import {
  Layers,
  Calendar,
  Building,
  MapPin,
  ArrowRight,
  Briefcase,
  Users,
  CreditCard,
  Download,
  Eye,
  UserPlus,
  Filter,
  TrendingUp,
} from 'lucide-react';

import { EventSelectorDropdown } from '../../../components/ui/EventSelectorDropdown';

export const StaffDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>('ALL');
  const [staffMetrics, setStaffMetrics] = useState({
    totalBookings: 0,
    totalValue: 0,
    totalBalance: 0,
    totalStalls: 0,
  });
  const [recentStaffBookings, setRecentStaffBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  async function fetchExhibitionsList() {
    try {
      const res = await exhibitionService.getExhibitions();
      setExhibitions(res || []);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    }
  }

  async function fetchStaffDashboardData(exhibitionId: string = selectedExhibitionId) {
    try {
      setLoadingBookings(true);
      const res: any = await bookingService.getAllBookings({
        bookedByUserId: 'me',
        exhibitionId: exhibitionId !== 'ALL' ? exhibitionId : undefined,
        limit: 10,
      });
      setRecentStaffBookings(res?.data || []);
      setStaffMetrics({
        totalBookings: Number(res?.meta?.total || (res?.data ? res.data.length : 0)),
        totalValue: Number(res?.meta?.totalValue || 0),
        totalBalance: Number(res?.meta?.totalBalanceValue || 0),
        totalStalls: Number(res?.meta?.totalStallsCount || 0),
      });
    } catch (err) {
      console.error('Failed to load staff bookings & metrics:', err);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    fetchExhibitionsList();
    fetchStaffDashboardData('ALL');

    const onFocus = () => {
      fetchExhibitionsList();
      fetchStaffDashboardData(selectedExhibitionId);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchStaffDashboardData(selectedExhibitionId);
    }
  }, [user?.id, selectedExhibitionId]);

  const activeExhibition = exhibitions.find((e) => e.id === selectedExhibitionId);

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
              Staff Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back, <strong>{user?.name}</strong>. Register exhibitors, collect balances, and track operations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/workspace/events/register">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-bold"
            >
              Book Stall for Exhibitor
            </Button>
          </Link>
        </div>
      </div>

      {/* Performance Filter by Exhibition */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Filter Performance by Exhibition
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select an exhibition to review bookings, sales, pending balances, and stalls allocated by you on that event.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <EventSelectorDropdown
            events={exhibitions}
            selectedEventId={selectedExhibitionId}
            onSelectEvent={setSelectedExhibitionId}
            allowAllOption={true}
            allOptionLabel={`All Exhibitions (${exhibitions.length})`}
            placeholder="Select Exhibition"
          />
          {selectedExhibitionId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedExhibitionId('ALL')}
              className="px-2.5 py-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Reset
            </button>
          )}
          {activeExhibition && (
            <div className="flex items-center shrink-0">
              <Link to={`/workspace/events/${activeExhibition.id}/view`}>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                >
                  Manage This Event
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 4 Clean Staff-Specific KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Bookings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Total Bookings
            </p>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono">
            {staffMetrics.totalBookings}
          </p>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-2 block">
            Exhibitors registered by you
          </span>
        </div>

        {/* 2. Total Booking Value */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Booking Value
            </p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{staffMetrics.totalValue.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 mt-2 block">
            Gross revenue booked by you
          </span>
        </div>

        {/* 3. Pending Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Balance
            </p>
            <div
              className={`p-2 rounded-xl border ${
                staffMetrics.totalBalance > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-black mt-2 font-mono ${
              staffMetrics.totalBalance > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            ₹{staffMetrics.totalBalance.toLocaleString('en-IN')}
          </p>
          <span
            className={`text-[11px] font-semibold mt-2 block ${
              staffMetrics.totalBalance > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {staffMetrics.totalBalance > 0 ? 'Remaining balance to collect' : 'All accounts fully settled'}
          </span>
        </div>

        {/* 4. Stalls Booked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Stalls Booked
            </p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {staffMetrics.totalStalls}
          </p>
          <span className="text-[11px] font-semibold text-purple-600/80 dark:text-purple-400/80 mt-2 block">
            Stalls booked & allocated by you
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
          <Link to="/workspace/events/register">
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
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/workspace/events/register?tab=registrations"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All My Bookings ({staffMetrics.totalBookings})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-300 dark:text-slate-700 select-none hidden sm:inline">|</span>
            <Link
              to="/workspace/bookings"
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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
                    <div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 block">
                        {b.bookingReference}
                      </span>
                      {b.createdAt && (
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {formatDisplayDateTime(b.createdAt)}
                        </span>
                      )}
                    </div>
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
                    const isEligible = b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PAID_FULL' && balanceDue > 0;

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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
                            title="View complete booking details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
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
            <Link to="/workspace/events/register" className="inline-block mt-3">
              <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Book Stall for Exhibitor
              </Button>
            </Link>
          </div>
        )}
      </div>



      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
        onRefresh={() => {
          fetchStaffDashboardData(selectedExhibitionId);
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
            fetchStaffDashboardData(selectedExhibitionId);
          }}
          isAdminMode={true}
        />
      )}
    </div>
  );
};
