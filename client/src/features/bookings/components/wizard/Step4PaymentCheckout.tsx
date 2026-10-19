import React from 'react';
import { Booking } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { ShieldCheck, ArrowLeft, ArrowRight, CreditCard, Smartphone } from 'lucide-react';

interface Step4PaymentCheckoutProps {
  booking: Booking;
  paymentType: 'FULL' | 'PARTIAL';
  payableToday: number;
  remainingBalance: number;
  effectivePartialPercent: number;
  formattedDeadline: string;
  onExecutePayment: (shouldFail?: boolean) => void;
  onBack: () => void;
}

export const Step4PaymentCheckout: React.FC<Step4PaymentCheckoutProps> = ({
  booking,
  paymentType,
  payableToday,
  remainingBalance,
  effectivePartialPercent,
  formattedDeadline,
  onExecutePayment,
  onBack,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className="px-3 py-1 bg-[#09539b]/10 dark:bg-blue-950/60 text-[#09539b] dark:text-blue-300 font-extrabold text-[10px] rounded-full uppercase border border-blue-200 dark:border-blue-800">
          Razorpay Payment Gateway
        </span>
        <h2 className="text-xl font-black text-[#012970] dark:text-slate-100">Secure Payment Checkout</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Booking Ref: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{booking.bookingReference}</span>
        </p>
      </div>

      <div className="p-4 bg-[#f6f9ff] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-slate-600 dark:text-slate-300">
            {paymentType === 'PARTIAL' ? `Advance Payment Today (${effectivePartialPercent}%):` : 'Total Amount Payable:'}
          </span>
          <span className="text-xl font-extrabold text-[#09539b] dark:text-blue-400 font-mono">
            ₹{payableToday.toLocaleString()} INR
          </span>
        </div>
        {paymentType === 'PARTIAL' && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 font-medium">
            <span className="font-bold">Partial Advance Selected:</span> Remaining balance of{' '}
            <b className="font-mono font-bold">₹{remainingBalance.toLocaleString()} INR</b> must be cleared at least 15 days before the event (on or before <b>{formattedDeadline}</b>).
          </div>
        )}
      </div>

      {/* Payment Gateway Supported Instruments */}
      <div className="space-y-3">
        <div className="p-4 border border-blue-200 dark:border-blue-800/60 bg-[#f6f9ff]/70 dark:bg-blue-950/20 rounded-2xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <CreditCard className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
              <span className="text-xs font-bold text-[#012970] dark:text-slate-100">
                All Payment Methods Supported via Razorpay
              </span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black px-2 py-0.5 rounded">
              Secured
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pay via UPI (GPay, PhonePe, Paytm, QR), Corporate Cards (Visa, MasterCard, RuPay), or NetBanking inside the official Razorpay checkout window.
          </p>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        256-Bit SSL Encrypted End-to-End Payment Gateway. Instant GST Tax Invoice Generated.
      </div>

      <div className="space-y-2 pt-2">
        <Button
          variant="primary"
          size="lg"
          className="w-full bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] font-black text-sm shadow-md cursor-pointer"
          onClick={() => onExecutePayment(false)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Pay ₹{payableToday.toLocaleString()} &amp; Complete Booking
        </Button>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tax Audit
          </button>
          <button
            type="button"
            onClick={() => onExecutePayment(true)}
            className="text-xs text-rose-500 hover:underline cursor-pointer"
          >
            Simulate Payment Decline (Test)
          </button>
        </div>
      </div>
    </div>
  );
};
