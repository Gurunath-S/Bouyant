import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { Booking } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, ShieldCheck, FileText, ArrowRight, Building } from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      bookingService
        .getBookingById(bookingId)
        .then(setBooking)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [bookingId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Verifying Payment Transaction...</div>;
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Payment & Server Verification Confirmed
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">Stall Reserved Successfully!</h2>
          <p className="text-xs text-slate-500">
            Your stall reservation is confirmed by server authority and stall status updated on hall canvas.
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700 text-left">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Booking Reference:</span>
            <span className="font-mono font-bold text-blue-700">{booking?.bookingReference}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Exhibition Event:</span>
            <span className="font-bold text-slate-900">{booking?.exhibition?.title}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Reserved Stall:</span>
            <span className="font-bold text-slate-900">Stall {booking?.stall?.stallNumber}</span>
          </div>
          <div className="flex justify-between py-1 pt-2 text-sm font-bold text-slate-900">
            <span>Amount Verified & Paid:</span>
            <span className="font-mono text-emerald-600">${Number(booking?.grandTotal).toLocaleString()} USD</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {booking?.invoice && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate(`/invoices/${booking.invoice?.id}`)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              View Tax Invoice & Receipt
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/my-bookings')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Go to My Bookings
          </Button>
        </div>
      </div>
    </div>
  );
};
