import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { paymentService } from '../../../services/payments/paymentService';
import { formatDisplayDate } from '../../../utils/date';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { showAlert } from '../../../stores/dialogStore';
interface ChequeVerificationModalProps {
  isOpen: boolean;
  payment: any | null;
  action: 'VERIFY' | 'REJECT';
  onClose: () => void;
  onSuccess: () => void;
}

export const ChequeVerificationModal: React.FC<ChequeVerificationModalProps> = ({
  isOpen,
  payment,
  action,
  onClose,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!payment) return null;

  const handleProcess = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const status = action === 'VERIFY' ? 'CHEQUE_VERIFIED' : 'CHEQUE_REJECTED';

      await paymentService.verifyChequePayment({
        paymentId: payment.id,
        status,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
      });

        const companyName =
        payment.booking?.company?.companyName ||
        payment.booking?.billingName ||
        'Client';
        
      const paymentRef = payment.paymentReference || 'Payment';
        if (action === 'VERIFY') {
        showAlert({
          title: 'Cheque Verified',
          message: `Cheque verified successfully for payment ${paymentRef} and ${companyName}.`,
          type: 'success',
          confirmText: 'Okay',
        });
      } else {
        showAlert({
          title: 'Cheque Cancelled',
          message: `Cheque cancelled by Super Admin for payment ${paymentRef} and ${companyName}.`,
          type: 'danger',
          confirmText: 'Okay',
        });
      }

      // Reset state and notify parent to refresh table
      setRejectionReason('');
      onSuccess();

    } catch (err: any) {
    
      const apiMsg =
        err?.response?.data?.message || err?.message || 'Failed to process cheque payment.';
      setErrorMessage(apiMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setErrorMessage(null);
      setRejectionReason('');
      onClose();
    }
  };

  const paidSoFar = Number(payment.booking?.paidAmount || 0);
  const isInitialCheque = paidSoFar === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={action === 'VERIFY' ? 'Verify Cheque Payment' : 'Reject Cheque Payment'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Cheque & Booking Details Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Booking Reference
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                {payment.booking?.bookingReference || 'N/A'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cheque Amount
              </span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                ₹{Number(payment.amount).toLocaleString('en-IN')} INR
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Bank Name
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {payment.bankName || 'Not Specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Cheque Number
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {payment.chequeNumber || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Cheque Date
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {payment.chequeDate ? formatDisplayDate(payment.chequeDate) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Client / Company
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {payment.booking?.company?.companyName || payment.booking?.billingName || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* VERIFY MODE */}
        {action === 'VERIFY' ? (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-bold text-sm">Approve Cheque & Generate Invoice</p>
              <p className="text-emerald-700 dark:text-emerald-300">
                Clicking <strong>Confirm Verification</strong> will mark this payment as <strong>SUCCESS</strong>, credit the amount towards the booking balance, and generate the official Tax Invoice for the user.
              </p>
            </div>
          </div>
        ) : (
          /* REJECT MODE */
          <div className="space-y-3">
            {isInitialCheque ? (
              // Initial Booking Bounce Notice
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                  <p className="font-bold text-sm">Initial Cheque Bounced (Zero Advance Paid)</p>
                  <p className="text-rose-700 dark:text-rose-300">
                    This is the <strong>initial booking payment</strong>. Rejecting this cheque will mark the payment as <strong>CANCELLED</strong>, cancel the booking, and <strong>RELEASE all stalls back to AVAILABLE</strong> for other users to book!
                  </p>
                </div>
              </div>
            ) : (
              // Balance Cheque Bounce Notice
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold text-sm">Balance Cheque Bounced (Partial Paid Booking)</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    The client has already paid <strong>₹{paidSoFar.toLocaleString('en-IN')}</strong> in advance. Rejecting this cheque will mark this payment as <strong>CANCELLED</strong>, but the booking and stalls will be <strong>SAFELY RETAINED</strong>!
                  </p>
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rejection / Bounce Reason <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Insufficient funds, signature mismatch, stopped payment..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>

          {action === 'VERIFY' ? (
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Cheque...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Verify Cheque</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting Cheque...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm & Reject Cheque</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};