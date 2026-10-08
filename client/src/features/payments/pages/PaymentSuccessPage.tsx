import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { bookingService } from '../../../services/bookings/bookingService';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Button } from '../../../components/ui/Button';
import {
  Check,
  X,
  LogIn,
  Home,
  Building2,
  Calendar,
  Layers, 
  MapPin,
  ShieldCheck,
  Headphones,
  Sparkles,
  ArrowRight,
  Download,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
} from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Copy state for email
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    useFloorPlanStore.getState().clearStallSelection();
    if (bookingId) {
      bookingService
        .getPublicBookingSummary(bookingId)
        .then((data) => {
          setBooking(data);
          // Dual corner party-popper confetti burst
          try {
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0.15, y: 0.2 },
              disableForReducedMotion: true,
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 0.85, y: 0.2 },
              disableForReducedMotion: true,
            });
          } catch (e) {
            // Ignore if confetti is disabled/unsupported
          }
        })
        .catch((err) => console.error('Failed to load public booking summary:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  const userEmail = booking?.company?.email || booking?.user?.email || '';

  const handleDownloadPdf = async () => {
    const idToUse = booking?.invoices?.[0]?.id || booking?.id || bookingId;
    if (!idToUse) return;

    setDownloading(true);
    try {
      const downloadUrl = `/api/v1/invoices/public/${idToUse}/pdf`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${booking?.bookingReference || 'Bill'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center py-12 px-4">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Generating Digital Receipt...</p>
      </div>
    );
  }

  // Calculate Accurate Payment Summary
  const grandTotal = Number(booking?.grandTotal || 0);
  const taxAmount = Number(booking?.taxAmount || 0);
  const baseAmount = Number(booking?.totalAmount || (grandTotal > taxAmount ? grandTotal - taxAmount : 0));
  const paidAmount = Number(booking?.paidAmount || (booking?.paymentStatus === 'PAID_FULL' || booking?.paymentStatus === 'SUCCESS' ? grandTotal : 0));
  const pendingBalance = Math.max(0, Number(booking?.balanceAmount ?? (grandTotal - paidAmount)));

  const isFullyPaid = pendingBalance === 0 && paidAmount > 0;
  const isPartialPayment = paidAmount > 0 && pendingBalance > 0;

  let paymentStatusBadgeText = 'PENDING';
  let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';

  if (isFullyPaid) {
    paymentStatusBadgeText = 'Successful';
    badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
  } else if (isPartialPayment) {
    paymentStatusBadgeText = 'Partial';
    badgeStyle = 'bg-blue-600 text-white border-blue-600';
  }

  const invoiceNumber = booking?.invoices?.[0]?.invoiceNumber || `INV-${booking?.bookingReference || '2026'}`;
  const bookingDate = booking?.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
  const paymentMethod = booking?.payments?.[0]?.paymentMethod || 'Online Payment';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* HEADER BANNER */}
      <div className="mb-6 text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Booking Confirmed
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Thank you for registering.
        </p>
      </div>

      {/* GRID LAYOUT: LEFT SIDE INFO CARDS | CENTER RECEIPT MODAL | RIGHT SIDE NEXT STEPS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (Desktop): Exhibition & Company Overview Card */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          {/* Exhibition Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Exhibition Details</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {booking?.exhibition?.title || 'Exhibition Event'}
                </h3>
                {booking?.exhibition?.eventCode && (
                  <span className="inline-block mt-1 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Code: {booking.exhibition.eventCode} {booking.exhibition.edition ? `(${booking.exhibition.edition})` : ''}
                  </span>
                )}
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    <strong>Venue:</strong> {booking?.exhibition?.venue || 'Trade Fair Center'}
                    {booking?.exhibition?.city ? `, ${booking.exhibition.city}` : ''}
                    {booking?.exhibition?.state ? `, ${booking.exhibition.state}` : ''}
                  </span>
                </p>
                {booking?.exhibition?.startDate && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>
                      <strong>Dates:</strong> {new Date(booking.exhibition.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {booking.exhibition.endDate ? ` - ${new Date(booking.exhibition.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    <strong>Stall(s):</strong> {booking?.stalls?.length > 0
                      ? booking.stalls.map((bs: any) => bs.stallNumber || bs.stall?.stallNumber).join(', ')
                      : 'Assigned'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Exhibitor Identity Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Exhibitor Identity</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Registered Company</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  {booking?.company?.name || booking?.companyName || 'Registered Corporate'}
                </span>
              </div>
              
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span><strong>Contact:</strong> {booking?.company?.contactPerson || booking?.contactPerson || booking?.user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate"><strong>Email:</strong> {userEmail || 'N/A'}</span>
                </div>
                {(booking?.company?.phone || booking?.contactPhone || booking?.phone) && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span><strong>Phone:</strong> {booking?.company?.phone || booking?.contactPhone || booking?.phone}</span>
                  </div>
                )}
                {booking?.company?.gstNumber && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span><strong>GSTIN:</strong> {booking.company.gstNumber}</span>
                  </div>
                )}
                {(booking?.company?.city || booking?.company?.state) && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span><strong>Location:</strong> {[booking?.company?.city, booking?.company?.state, booking?.company?.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: THE MAIN DIGITAL RECEIPT CARD */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="relative w-full max-w-[480px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl">
            
            {/* Close Button Top-Right */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full z-20 cursor-pointer"
              title="Close Receipt"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* HEADER SECTION */}
            <div className="pt-8 pb-5 px-6 text-center space-y-3">
              {/* Green Circular Success Icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Payment Successful
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Your booking has been confirmed successfully.
                </p>
              </div>
            </div>

            {/* PERFORATED / DASHED DIVIDER WITH SIDE CUTOUTS */}
            <div className="relative flex items-center my-1 overflow-hidden">
              {/* Left Notch */}
              <div className="w-4 h-7 bg-slate-100 dark:bg-slate-950 rounded-r-full -ml-2 border-r border-slate-200 dark:border-slate-800 shrink-0" />
              {/* Dashed Line */}
              <div className="flex-1 border-b-2 border-dashed border-slate-200 dark:border-slate-700/80 mx-2" />
              {/* Right Notch */}
              <div className="w-4 h-7 bg-slate-100 dark:bg-slate-950 rounded-l-full -mr-2 border-l border-slate-200 dark:border-slate-800 shrink-0" />
            </div>

            {/* RECEIPT DETAILS BODY */}
            <div className="p-6 pt-3 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Payment Details
                </span>
                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                  {booking?.bookingReference}
                </span>
              </div>

              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{invoiceNumber}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Booking Date</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{bookingDate}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Method</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{paymentMethod}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Status</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeStyle}`}>
                    {paymentStatusBadgeText}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Allocated Stall(s)</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {booking?.stalls?.length > 0
                      ? booking.stalls.map((bs: any) => bs.stallNumber || bs.stall?.stallNumber).join(', ')
                      : 'Assigned'}
                  </span>
                </div>

                {/* FINANCIAL SUMMARY */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Base Amount</span>
                    <span className="font-mono font-medium">₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">GST / Tax (18%)</span>
                    <span className="font-mono font-medium">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700/80 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    <span>Total Amount</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Amount Paid</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {pendingBalance > 0 && (
                    <div className="flex justify-between items-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <span>Pending Balance</span>
                      <span className="font-mono">
                        ₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* EXHIBITOR PORTAL ACCOUNT NOTICE */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Exhibitor Credentials Sent:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[190px]">
                    {userEmail}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Login details have been emailed. Log in to view your dashboard or track stall setup.
                </p>
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="pt-2 pb-1 flex flex-col sm:flex-row gap-2.5 w-full">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<LogIn className="w-4 h-4 shrink-0" />}
                  className="flex-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer py-2.5"
                  onClick={() => navigate('/login')}
                >
                  Login to Portal
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Home className="w-4 h-4 shrink-0" />}
                  className="flex-1 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center cursor-pointer py-2.5"
                  onClick={() => navigate('/')}
                >
                  Go to Home
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Desktop): Next Steps Checklist & Support */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          {/* Next Steps Checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Next Steps</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>Check email inbox for login credentials.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>Access Exhibitor Portal to submit company profile.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>Download tax invoice PDF from Exhibitor Portal.</span>
              </li>
            </ul>
          </div>

          {/* Exhibitor Support Card */}
          <div className="bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
              <Headphones className="w-4 h-4" />
              <span>Need Help?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Our exhibition operations team is available to assist with stall setup and venue guidelines.
            </p>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold block pt-1">
              support@buoyantmedia.com
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};




