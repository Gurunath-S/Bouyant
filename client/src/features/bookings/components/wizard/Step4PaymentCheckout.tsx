import React from 'react';
import { Booking } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { CreditCard, ShieldCheck, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2 border-b border-slate-100 pb-4">
        <span className="px-3 py-1 bg-[#09539b]/10 text-[#09539b] font-extrabold text-[10px] rounded-full uppercase">
          Razorpay Payment Gateway
        </span>
        <h2 className="text-xl font-black text-[#012970]">Secure Payment Checkout</h2>
        <p className="text-xs text-slate-500">
          Booking Ref: <span className="font-mono font-bold text-slate-800">{booking.bookingReference}</span>
        </p>
      </div>

      <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-slate-600">
            {paymentType === 'PARTIAL' ? `Advance Payment Today (${effectivePartialPercent}%):` : 'Total Amount Payable:'}
          </span>
          <span className="text-xl font-extrabold text-[#09539b] font-mono">
            ₹{payableToday.toLocaleString()} INR
          </span>
        </div>
        {paymentType === 'PARTIAL' && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
            <span className="font-bold">Partial Advance Selected:</span> Remaining balance of{' '}
            <b className="font-mono font-bold">₹{remainingBalance.toLocaleString()} INR</b> must be cleared at least 15 days before the event (on or before <b>{formattedDeadline}</b>).
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="p-3.5 border-2 border-[#09539b] bg-[#f6f9ff] rounded-xl flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <input type="radio" checked readOnly className="text-[#09539b]" />
            <span className="text-xs font-bold text-[#012970]">Razorpay UPI / QR / NetBanking</span>
          </div>
          <span className="text-[10px] bg-[#9cc542] text-[#012970] font-black px-2 py-0.5 rounded">
            Fastest
          </span>
        </div>

        <div className="p-3.5 border border-slate-200 bg-white rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="radio" disabled className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Corporate Credit / Debit Card (Visa, MasterCard, RuPay)</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        256-Bit SSL Encrypted End-to-End Payment Gateway. Instant GST Tax Invoice Generated.
      </div>

      <div className="space-y-2 pt-2">
        <Button
          variant="primary"
          size="lg"
          className="w-full bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] font-black text-sm shadow-md"
          onClick={() => onExecutePayment(false)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Pay ₹{payableToday.toLocaleString()} & Complete Booking
        </Button>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tax Audit
          </button>
          <button
            type="button"
            onClick={() => onExecutePayment(true)}
            className="text-xs text-rose-500 hover:underline"
          >
            Simulate Payment Decline (Test)
          </button>
        </div>
      </div>
    </div>
  );
};
