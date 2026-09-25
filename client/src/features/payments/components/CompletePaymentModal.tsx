import React, { useState, useEffect } from 'react';
import { Booking } from '../../../types';
import { paymentService } from '../../../services/payments/paymentService';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/date';
import {
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Banknote,
  FileCheck,
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

  const [paymentMethod, setPaymentMethod] = useState<string>('CREDIT_CARD_VISA');
  const [transactionId, setTransactionId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      const balance = Number(booking.balanceAmount || 0);
      const grandTotal = Number(booking.grandTotal || 0);
      const currentPaid = Number(booking.paidAmount || 0);
      const due = balance > 0 ? balance : Math.max(0, grandTotal - currentPaid);
      setPayAmount(due > 0 ? due : grandTotal);
      setTransactionId(`TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setPaymentMethod(isStaffOrAdmin ? 'ADMIN_CASH_DIRECT' : 'CREDIT_CARD_VISA');
      setError(null);
      setSuccessMessage(null);
    }
  }, [booking, isStaffOrAdmin]);

  if (!isOpen || !booking) return null;

  const grandTotal = Number(booking.grandTotal || 0);
  const paidAmount = Number(booking.paidAmount || 0);
  const balanceDue = Number(booking.balanceAmount || Math.max(0, grandTotal - paidAmount));
  const stallNumbers = booking.stalls?.map((s) => s.stall?.stallNumber || s.stallId).join(', ') || 'Assigned Booth';

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      setError(null);

      await paymentService.verifyPayment({
        bookingId: booking.id,
        action: 'SUCCESS',
        paymentMethod,
        transactionId: transactionId.trim() || `TXN-${Date.now()}`,
        payAmount: payAmount > 0 ? payAmount : balanceDue,
      });

      setSuccessMessage(
        isStaffOrAdmin
          ? `Payment recorded successfully! Booking ${booking.bookingReference} status updated.`
          : `Payment of ${formatCurrency(payAmount)} successful! Your booking status has been updated.`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to complete payment:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-8 transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {isStaffOrAdmin ? 'Record / Complete Payment (Admin)' : 'Complete Booking Payment'}
              </h3>
              <p className="text-xs text-slate-300">
                Ref: <span className="font-mono font-bold text-blue-300">{booking.bookingReference}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmitPayment} className="p-6 space-y-5">
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

          {/* Booking Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Exhibition:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {booking.exhibition?.title || 'Trade Fair'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Stalls:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{stallNumbers}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Company:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {booking.company?.name || 'Company Account'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Grand Total</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Paid So Far</span>
                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Balance Due</span>
                <p className="font-extrabold text-amber-700 dark:text-amber-300 text-xs mt-0.5">{formatCurrency(balanceDue)}</p>
              </div>
            </div>
          </div>

          {/* Amount to Pay Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Payment Amount (₹)</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                {balanceDue > 0 ? 'Remaining Balance' : 'Full Invoice Amount'}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max={grandTotal}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD_VISA')}
                className={`p-3 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                  paymentMethod === 'CREDIT_CARD_VISA'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" /> Credit / Debit Card
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI_RAZORPAY')}
                className={`p-3 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                  paymentMethod === 'UPI_RAZORPAY'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" /> UPI / QR Code
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('NETBANKING')}
                className={`p-3 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                  paymentMethod === 'NETBANKING'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-600" /> Net Banking
              </button>

              {isStaffOrAdmin ? (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ADMIN_CASH_DIRECT')}
                  className={`p-3 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                    paymentMethod === 'ADMIN_CASH_DIRECT'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-600" /> Cash / Offline (Admin)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-indigo-600" /> Bank Wire (NEFT)
                </button>
              )}
            </div>
          </div>

          {/* Transaction Reference Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Transaction / Reference ID
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={isProcessing}
              placeholder="e.g. TXN-998811 or Bank Ref"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isProcessing || payAmount <= 0}
              leftIcon={
                isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )
              }
            >
              {isProcessing
                ? 'Processing Payment...'
                : `Pay ${formatCurrency(payAmount)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
