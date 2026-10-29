import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Booking } from '../../../types';
import { paymentService } from '../../../services/payments/paymentService';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { formatCurrency, formatDisplayDate } from '../../../utils/date';
import { loadRazorpay } from '../../../utils/razorpay';
import {
  CreditCard,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface CompletePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
  isAdminMode?: boolean;
}

export const CompletePaymentModal: React.FC<CompletePaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
  isAdminMode = false,
}) => {
  const { user } = useAuthStore();
  const isStaffOrAdmin = isAdminMode || ['ADMIN', 'SUPERADMIN', 'STAFF'].includes(user?.role || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Partial / reduced payment options
  const [paymentOption, setPaymentOption] = useState<'full' | 'half' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [nextDueDate, setNextDueDate] = useState<string>('');



  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const grandTotal = Number(booking?.grandTotal || 0);
  const paidAmount = Number(booking?.paidAmount || 0);
  const balanceDue = Number(booking?.balanceAmount || Math.max(0, grandTotal - paidAmount));
  const stallNumbers = booking?.stalls?.map((s) => s.stall?.stallNumber || s.stallId).join(', ') || 'Assigned Booth';

  useEffect(() => {
    if (isOpen && booking && balanceDue > 0) {
      setPaymentOption('full');
      setCustomAmount(String(balanceDue));
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setNextDueDate(d.toISOString().slice(0, 10));
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, booking?.id, balanceDue]);

  const payableAmount = useMemo(() => {
    if (paymentOption === 'full') return balanceDue;
    if (paymentOption === 'half') return Math.max(1, Math.round(balanceDue / 2));
    const num = parseFloat(customAmount);
    return isNaN(num) ? 0 : Math.min(balanceDue, Math.max(1, Math.round(num)));
  }, [paymentOption, customAmount, balanceDue]);

  const isPartialPayment = payableAmount < balanceDue;
  const remainingAfterPayment = Math.max(0, balanceDue - payableAmount);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Lock background scrolling and handle Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isProcessing) {
          handleClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isProcessing]);

  if (!isOpen || !booking) return null;

  const executeRazorpay = async (orderData: any) => {
    await loadRazorpay();
    if (typeof (window as any).Razorpay === 'undefined') {
      setError('Razorpay SDK failed to load. Please check your internet connection or ad-blocker and try again.');
      setIsProcessing(false);
      return;
    }

    const key = orderData?.keyId || orderData?.razorpayKeyId || orderData?.key || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_ThoMbxHjNbMlJa';
    const razorpayOrderId = orderData?.razorpayOrderId || orderData?.orderId || orderData?.order_id || orderData?.id;

    if (!razorpayOrderId) {
      setError('Invalid order ID received from payment gateway. Please try again.');
      setIsProcessing(false);
      return;
    }

    const options: any = {
      key,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Buoyant Media',
      description: isPartialPayment
        ? `Partial Payment — Ref: ${booking.bookingReference}`
        : `Balance Payment — Ref: ${booking.bookingReference}`,
      order_id: razorpayOrderId,
      handler: async function (paymentResponse: any) {
        try {
          setIsProcessing(true);
          await paymentService.verifyPayment({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          });
          const successText = isPartialPayment
            ? `Partial payment of ${formatCurrency(payableAmount)} verified successfully! Remaining ${formatCurrency(remainingAfterPayment)} is scheduled for ${formatDisplayDate(nextDueDate)}.`
            : `Payment of ${formatCurrency(payableAmount)} verified successfully! Your booking status has been updated.`;
          setSuccessMessage(successText);
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1800);
        } catch (err: any) {
          console.error('Failed to verify Razorpay balance payment:', err);
          setError(err.response?.data?.message || err.message || 'Razorpay payment verification failed.');
        } finally {
          setIsProcessing(false);
        }
      },
      prefill: {
        name: booking.company?.contactPerson || user?.name || 'Exhibitor',
        email: booking.company?.email || user?.email || 'exhibitor@buoyantmedia.com',
        contact: booking.company?.mobile || user?.phone || '9876543210',
      },
      theme: {
        color: '#012970',
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.error('Razorpay payment failed:', resp?.error);
        setError(resp?.error?.description || 'Payment was declined or cancelled.');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to launch Razorpay popup:', err);
      setError('Unable to launch Razorpay gateway: ' + (err.message || 'Gateway initialization error'));
      setIsProcessing(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (payableAmount <= 0) {
      setError('Please specify a valid payment amount greater than ₹0.');
      return;
    }

    if (payableAmount > balanceDue) {
      setError(`Payment amount cannot exceed the remaining balance of ₹${balanceDue.toLocaleString('en-IN')}.`);
      return;
    }

    if (isPartialPayment && !nextDueDate) {
      setError('Please select a promise due date for the remaining balance.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Online Razorpay Payment flow with custom/reduced amount and due date
      const orderInfo = await paymentService.createBalanceOrder(booking.id, {
        amount: payableAmount,
        nextDueDate: isPartialPayment ? nextDueDate : undefined,
      });

      const actualOrder = orderInfo?.data || orderInfo;
      if (!actualOrder || (!actualOrder.razorpayOrderId && !actualOrder.id && !actualOrder.order_id)) {
        throw new Error('Failed to generate balance payment order from payment gateway.');
      }

      await executeRazorpay(actualOrder);
    } catch (err: any) {
      console.error('Failed to complete payment:', err);
      setError(err.response?.data?.message || err.message || 'Payment processing failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          handleClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all animate-in zoom-in-95 duration-150 my-auto">
        {/* Header - Fixed Top */}
        <div className="shrink-0 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {paidAmount > 0 ? 'Pay Remaining Balance' : 'Complete Booking Payment'}
              </h3>
              <p className="text-xs text-slate-300">
                Ref: <span className="font-mono font-bold text-blue-300">{booking.bookingReference}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container spanning scrollable body and sticky footer */}
        <form onSubmit={handleSubmitPayment} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column (5 cols): Dossier & Authorization Notice */}
              <div className="md:col-span-5 space-y-4">
                {/* Payer Authorization & Audit Notice Banner */}
                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-bold">Payer Authorization Notice</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                      Initiating as <span className="font-semibold">{user?.name || 'Authorized User'}</span> ({user?.role || 'CLIENT'}) for <span className="font-semibold">{booking.company?.name || 'Exhibitor'}</span>.
                    </p>
                  </div>
                </div>

                {/* Booking Summary Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Exhibition:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={booking.exhibition?.title}>
                      {booking.exhibition?.title || 'Trade Fair'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Stalls:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{stallNumbers}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Payment Status:</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {booking.paymentStatus || 'UNPAID'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold block">Total</span>
                      <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{formatCurrency(grandTotal)}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold block">Paid</span>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">{formatCurrency(paidAmount)}</p>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-bold block">Balance</span>
                      <p className="font-extrabold text-amber-700 dark:text-amber-300 text-xs mt-0.5">{formatCurrency(balanceDue)}</p>
                    </div>
                  </div>
                </div>

                {/* Razorpay Supported Instruments & Security Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-xs">Razorpay Secure 256-bit SSL</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-6">
                    UPI • NetBanking • Credit/Debit Cards • Wallets
                  </span>
                </div>
              </div>

              {/* Right Column (7 cols): Payment Amount Selection & Options */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choose Payment Option
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Flexible Installments
                  </span>
                </div>

                {/* Quick Option Selector Chips */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('full')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentOption === 'full'
                        ? 'border-[#012970] dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 text-[#012970] dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">100% Full</div>
                    <div className="font-extrabold text-xs mt-0.5">{formatCurrency(balanceDue)}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('half')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentOption === 'half'
                        ? 'border-[#012970] dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 text-[#012970] dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">50% Part</div>
                    <div className="font-extrabold text-xs mt-0.5">{formatCurrency(Math.round(balanceDue / 2))}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOption('custom');
                      if (!customAmount || parseFloat(customAmount) >= balanceDue) {
                        setCustomAmount(String(Math.round(balanceDue / 2)));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentOption === 'custom'
                        ? 'border-[#012970] dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 text-[#012970] dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Custom</div>
                    <div className="font-extrabold text-xs mt-0.5">Pay Less</div>
                  </button>
                </div>

                {/* Editable Amount Input if Custom */}
                {paymentOption === 'custom' && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Enter Custom Payment Amount (Min: ₹1, Max: {formatCurrency(balanceDue)})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={balanceDue}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-12 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-extrabold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        INR
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Breakdown Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Amount Being Paid Now:</span>
                  <span className="text-base font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(payableAmount)}
                  </span>
                </div>

                {/* When paying less than total balance: Ask for Remaining Due Date */}
                {isPartialPayment && (
                  <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold text-xs">Remaining Balance Promise Date</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      Paying <b>{formatCurrency(payableAmount)}</b> now. The remaining balance of{' '}
                      <b className="text-amber-950 dark:text-amber-100 font-mono">{formatCurrency(remainingAfterPayment)}</b> will be due on:
                    </p>
                    <input
                      type="date"
                      min={tomorrowStr}
                      required
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      Select the scheduled date when the remaining balance will be paid.
                    </p>
                  </div>
                )}


              </div>
            </div>
          </div>

          {/* Footer - Sticky Bottom, Always Visible */}
          <div className="shrink-0 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Payable Now:</span>
              <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                {formatCurrency(payableAmount)}
              </span>
              {isPartialPayment && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  (Remaining: {formatCurrency(remainingAfterPayment)})
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isProcessing || payableAmount <= 0 || (isPartialPayment && !nextDueDate)}
                leftIcon={
                  isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )
                }
                className="bg-[#012970] hover:bg-[#09539b] text-white font-bold px-5"
              >
                {isProcessing
                  ? 'Opening Razorpay...'
                  : isPartialPayment
                  ? `Pay Partial Now (${formatCurrency(payableAmount)})`
                  : `Pay Remaining Balance (${formatCurrency(payableAmount)})`}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
