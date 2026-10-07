import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { Button } from '../../../components/ui/Button';
import {
  CheckCircle2,
  FileText,
  Copy,
  Check,
  LogIn,
  Home,
  Mail,
  Building2,
  Receipt,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Copy state for email
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (bookingId) {
      bookingService
        .getPublicBookingSummary(bookingId)
        .then(setBooking)
        .catch((err) => console.error('Failed to load public booking summary:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  const userEmail = booking?.company?.email || booking?.user?.email || '';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-slate-500 font-medium space-y-3">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Fetching Booking & Payment Confirmation...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 dark:text-slate-100">
        
        {/* Confirmed Success Icon Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-block">
              Booking Confirmed Successfully 🎉
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Stall Reservation Verified
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your stall reservation and payment have been confirmed. Below is your official booking confirmation summary.
            </p>
          </div>
        </div>

        {/* Detailed Booking Summary Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-3 text-xs">
          
          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Booking Reference:</span>
            <span className="font-mono font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
              {booking?.bookingReference || 'BKG-CONFIRMED'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Company Name:
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {booking?.company?.name || 'N/A'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Exhibition:
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-right truncate max-w-[240px]">
              {booking?.exhibition?.title || 'Exhibition Event'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Allocated Stall(s):
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {booking?.stalls?.length > 0
                ? booking.stalls.map((bs: any) => `Stall ${bs.stallNumber || bs.stall?.stallNumber}`).join(', ')
                : 'Stall Assigned'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Stall Count & Area:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {booking?.stallCount || 1} Stall(s) ({booking?.totalArea || 0} Sq.Ft)
            </span>
          </div>

          {/* Pricing & GST Breakdown */}
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Base Amount:</span>
              <span className="font-mono">₹{Number(booking?.totalBaseAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>GST / Tax (18%):</span>
              <span className="font-mono">₹{Number(booking?.gstAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-slate-100">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ₹{Number(booking?.grandTotal || booking?.paidAmount || 0).toLocaleString('en-IN')} INR
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-between items-center pt-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Status:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {booking?.paymentStatus || 'COMPLETED'}
            </span>
          </div>
        </div>

        {/* Invoice Notification */}
        {booking?.invoice && (
          <div className="bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs block">
                  Tax Invoice Generated
                </span>
                <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-mono">
                  Invoice #: {booking.invoice.invoiceNumber}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account & Login Information Box */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 space-y-4 shadow-xl border border-indigo-900/60">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white tracking-tight">
                Exhibitor Portal Access
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Action Required
            </span>
          </div>

          <p className="text-xs text-indigo-200 font-medium leading-relaxed">
            Your booking reference and confirmation details have been linked to your registered email identity. To view your full dashboard, download tax invoices, or update your exhibitor profile, please log in with your credentials.
          </p>

          {userEmail && (
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-950/70 border border-indigo-900/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-indigo-400 font-sans font-medium block">Registered Account Email:</span>
                    <span className="font-bold text-white truncate block">{userEmail}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(userEmail)}
                  className="px-2.5 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-lg border border-indigo-700/60 text-[11px] font-sans font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-indigo-300 italic">
            * Check your inbox for account details and notification emails. You are currently not automatically logged in.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 text-xs shadow-md transition-colors"
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Go to Login Page
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 text-xs transition-colors"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Return to Home Page
          </Button>
        </div>

      </div>
    </div>
  );
};

