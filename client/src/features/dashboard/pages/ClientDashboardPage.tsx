import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { bookingService } from '../../../services/bookings/bookingService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Booking, Exhibition } from '../../../types';
import {
  BookmarkCheck,
  Calendar,
  ArrowRight,
  Building,
  MapPin,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { formatDisplayDate, formatCurrency } from '../../../utils/date';

import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';

export const ClientDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  // Show welcome banner only on first visit or after long absence (1 day threshold)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    const lastSeen = localStorage.getItem('client_dashboard_last_seen');
    if (!lastSeen) return true;
    const timeDiff = Date.now() - parseInt(lastSeen, 10);
    return timeDiff > 86400000;
  });

  const dismissWelcomeBanner = () => {
    localStorage.setItem('client_dashboard_last_seen', Date.now().toString());
    setShowWelcomeBanner(false);
  };

  // Payment Modal State
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<Booking | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
      setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setExhibitions(Array.isArray(exposData) ? exposData.slice(0, 3) : []);
    } catch (err) {
      console.error('Failed to load client dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived financial metrics
  const totalPaid = useMemo(() => {
    return myBookings.reduce((acc, b) => acc + Number(b.paidAmount || 0), 0);
  }, [myBookings]);

  const totalBalanceDue = useMemo(() => {
    return myBookings.reduce((acc, b) => acc + Number(b.balanceAmount || 0), 0);
  }, [myBookings]);

  const confirmedBookingsCount = useMemo(() => {
    return myBookings.filter((b) => b.status === 'CONFIRMED' || b.paymentStatus === 'PAID').length;
  }, [myBookings]);

  return (
    <div className="space-y-8 pb-10">
      {/* 1. WELCOME HEADER BANNER (Shown only on first visit or after long absence) */}
      {showWelcomeBanner && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden animate-in fade-in duration-200">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <button
            type="button"
            onClick={dismissWelcomeBanner}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors z-20"
            title="Dismiss Welcome Message"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-xs rounded-full">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                {user?.company?.name || 'Buoyant Media Tech Solutions Pvt Ltd'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold text-[11px] rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> GST Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name || 'Client User'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
              Track your active stall bookings, inspect payment installments, access official GST invoices, and manage your company profile.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to="/my-bookings">
                <Button variant="primary" leftIcon={<BookmarkCheck className="w-4 h-4" />}>
                  My Stall Bookings ({myBookings.length})
                </Button>
              </Link>
              <Link to="/invoices">
                <Button variant="secondary" leftIcon={<Receipt className="w-4 h-4" />}>
                  Tax Invoices
                </Button>
              </Link>
              <Link to="/exhibitions">
                <Button
                  variant="ghost"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-xs"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Book New Stall
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Stall Bookings</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{myBookings.length}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{confirmedBookingsCount} Confirmed</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BookmarkCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Amount Paid</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Successful Receipts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Balance Due */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className={`text-2xl font-extrabold ${totalBalanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {formatCurrency(totalBalanceDue)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {totalBalanceDue > 0 ? 'Action Required' : 'All Dues Cleared'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Corporate Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corporate Tax Profile</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {user?.company?.name || 'Set Up Profile'}
            </p>
            <Link to="/my-company" className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1">
              View & Edit Details →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. MY STALL BOOKINGS & RESERVATIONS (USER-FOCUSED MAIN SECTION) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              My Stall Bookings & Reservations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your reserved stall booths, booking references, and payment progress.
            </p>
          </div>
          <Link to="/my-bookings" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            View All ({myBookings.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">Loading your stall reservations...</p>
          </div>
        ) : myBookings.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No active stall bookings found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You haven't booked any exhibition stalls yet. Explore upcoming trade fairs and select your preferred booth.
            </p>
            <div className="pt-2">
              <Link to="/exhibitions">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Explore Trade Fairs & Book Stall
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myBookings.map((booking) => {
              const stallsList = booking.stalls?.map((s) => s.stall?.stallNumber || s.stallId).join(', ') || 'Assigned Booth';
              return (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs rounded-md border border-slate-200 dark:border-slate-700">
                        {booking.bookingReference}
                      </span>
                      <BookingStatusBadge status={booking.status} />
                      <PaymentStatusBadge status={booking.paymentStatus || 'UNPAID'} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                      {booking.exhibition?.title || 'Exhibition Event'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <BookmarkCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Stalls: <strong className="text-slate-900 dark:text-slate-100">{stallsList}</strong>
                      </span>
                      {booking.exhibition?.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {booking.exhibition.venue}, {booking.exhibition.city}
                        </span>
                      )}
                      {booking.exhibition?.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDisplayDate(booking.exhibition.startDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary & Actions */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Grand Total</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(Number(booking.grandTotal || 0))}
                      </p>
                      {Number(booking.balanceAmount || 0) > 0 ? (
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> Balance Due: {formatCurrency(Number(booking.balanceAmount))}
                        </p>
                      ) : (
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Fully Paid
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {Number(booking.balanceAmount || 0) > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setSelectedPaymentBooking(booking);
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          Pay Balance ({formatCurrency(Number(booking.balanceAmount))})
                        </Button>
                      )}
                      {booking.invoice?.id ? (
                        <Link to={`/invoices/${booking.invoice.id}`}>
                          <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                            Invoice
                          </Button>
                        </Link>
                      ) : (
                        <Link to="/invoices">
                          <Button variant="outline" size="sm" leftIcon={<Receipt className="w-3.5 h-3.5" />}>
                            Invoices
                          </Button>
                        </Link>
                      )}
                      <Link to="/my-bookings">
                        <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. COMPANY & CORPORATE TAX SUMMARY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Corporate Tax & Company Details
          </h3>
          <Link to="/my-company" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Manage Company Profile →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Company Name</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{user?.company?.name || 'Not Specified'}</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">GSTIN Number</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{user?.company?.gstNumber || 'Not Provided'}</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">PAN Number</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{user?.company?.panNumber || 'Not Provided'}</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">City / State</p>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {user?.company?.city ? `${user.company.city}, ${user.company.state || ''}` : 'Location Not Set'}
            </p>
          </div>
        </div>
      </div>

      {/* 5. SECONDARY SECTION: DISCOVER MORE TRADE FAIRS */}
      {exhibitions.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Explore More Trade Fairs & Exhibitions
            </h3>
            <Link to="/exhibitions" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All Exhibitions →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exhibitions.map((expo) => (
              <div
                key={expo.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="h-28 bg-slate-800 relative overflow-hidden">
                  <img
                    src={
                      expo.bannerUrl ||
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={expo.title}
                    className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded text-[10px] font-bold text-slate-800 dark:text-slate-200">
                    {expo.totalStalls} Stalls Total
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{expo.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{expo.venue}, {expo.city}</span>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Open for Booking</span>
                  <Link to={`/exhibitions/${expo.slug}`}>
                    <Button variant="primary" size="sm" className="text-xs py-1 px-3">
                      View Floor Plan
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Payment Modal */}
      <CompletePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPaymentBooking(null);
        }}
        booking={selectedPaymentBooking}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};
