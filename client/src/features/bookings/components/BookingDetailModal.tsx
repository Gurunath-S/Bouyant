import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Booking } from '../../../types';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import {
  Building2,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Tag,
  Maximize2,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Booking Details — ${booking.bookingReference}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs text-slate-700 dark:text-slate-200 max-h-[75vh] overflow-y-auto pr-1">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Current Status:</span>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Booked on: {formatDisplayDateTime(booking.createdAt)}</span>
          </div>
        </div>

        {/* 2-Column Grid: Exhibitor Company & Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exhibitor Details Card */}
          <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Building2 className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Exhibitor Company
            </h4>

            <div className="space-y-1.5">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {booking.company?.name || 'N/A'}
              </p>
              {booking.company?.companyCode && (
                <p className="text-[11px] font-mono text-slate-500">
                  Code: {booking.company.companyCode}
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1 text-[11px]">
              <p>
                <span className="font-semibold text-slate-500">GSTIN:</span>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {booking.company?.gstNumber || 'Not provided'}
                </span>
              </p>
              {booking.company?.panNumber && (
                <p>
                  <span className="font-semibold text-slate-500">PAN:</span>{' '}
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {booking.company.panNumber}
                  </span>
                </p>
              )}
              {booking.company?.contactPerson && (
                <p className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">Representative:</span>{' '}
                  {booking.company.contactPerson}
                  {booking.company.designation ? ` (${booking.company.designation})` : ''}
                </p>
              )}
              {booking.company?.email && (
                <p className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <a href={`mailto:${booking.company.email}`} className="text-blue-600 hover:underline">
                    {booking.company.email}
                  </a>
                </p>
              )}
              {booking.company?.mobile && (
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{booking.company.mobile}</span>
                </p>
              )}
              {booking.company?.address && (
                <p className="text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                  {booking.company.address}, {booking.company.city}, {booking.company.state}
                </p>
              )}
            </div>
          </div>

          {/* Exhibition & Reserved Stall Card */}
          <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Calendar className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Event & Stall Allocation
            </h4>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {booking.exhibition?.title || 'Exhibition Event'}
              </p>
              {booking.exhibition?.venue && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {booking.exhibition.venue}, {booking.exhibition.city}
                </p>
              )}
              {booking.exhibition?.startDate && (
                <p className="text-[11px] text-slate-500">
                  Dates: {formatDisplayDate(booking.exhibition.startDate)} –{' '}
                  {formatDisplayDate(booking.exhibition.endDate)}
                </p>
              )}
            </div>

            {/* Reserved Stall Highlight */}
            <div className="p-3 bg-[#f6f9ff] dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#09539b] dark:text-blue-400 text-sm font-mono flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Stall(s) {booking.stalls?.map(bs => bs.stall?.stallNumber).join(', ') || 'N/A'}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] rounded uppercase">
                  {booking.stalls && booking.stalls.length > 0 ? Array.from(new Set(booking.stalls.map(bs => bs.stall?.category))).join(', ') : 'STANDARD'}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-slate-400" /> Total Carpet Area:
                </span>
                <span className="font-bold">{booking.stalls?.reduce((sum, bs) => sum + (bs.stall?.areaSqFt || 0), 0) || 100} Sq.Ft</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
            <FileText className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Payment & Tax Summary
          </h4>

          {(() => {
            const grandTotal = Number(booking.grandTotal || 0);
            const paidAmount = Number(booking.paidAmount || (booking.paymentStatus === 'PAID' || (booking.paymentStatus as string) === 'PAID_FULL' ? grandTotal : 0));
            const balanceDue = Number(booking.balanceAmount ?? Math.max(0, grandTotal - paidAmount));

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</p>
                  <p className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    ₹{grandTotal.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Already Paid</p>
                  <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{paidAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Remaining Due</p>
                  <p className="text-sm font-black font-mono text-amber-700 dark:text-amber-300 mt-1">
                    ₹{balanceDue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Status</p>
                  <PaymentStatusBadge status={booking.paymentStatus || 'UNPAID'} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Payment Transaction Audit & History */}
        {(() => {
          const paymentList = (booking.payments && booking.payments.length > 0)
            ? booking.payments
            : (booking.payment ? [booking.payment] : []);

          if (paymentList.length === 0) return null;

          const successfulPayments = paymentList.filter((p: any) => p.status === 'SUCCESS');

          return (
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                  Payment Records &amp; Transactions ({successfulPayments.length} Completed)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {paymentList.length} {paymentList.length === 1 ? 'Transaction' : 'Transactions'} Total
                </span>
              </div>

              <div className="space-y-2.5">
                {paymentList.map((p: any, idx: number) => {
                  const isSuccess = p.status === 'SUCCESS';
                  const isPending = p.status === 'PENDING';
                  const isFailed = p.status === 'FAILED';

                  const badgeClass = isSuccess
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : isPending
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                  const installmentLabel = p.installmentType?.includes('PARTIAL')
                    ? 'Partial Advance'
                    : p.installmentType?.includes('BALANCE')
                    ? 'Balance Payment'
                    : idx === 0
                    ? 'Initial Payment'
                    : `Payment #${idx + 1}`;

                  return (
                    <div
                      key={p.id || p.paymentReference || idx}
                      className={`p-3 rounded-lg border text-xs transition-colors ${
                        isSuccess
                          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            #{idx + 1} {installmentLabel}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{Number(p.amount || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">INR</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Payment Ref:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block" title={p.paymentReference}>
                            {p.paymentReference || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Provider / Method:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {p.provider || 'RAZORPAY'} • {p.paymentMethod || 'UPI / Gateway'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Txn Reference ID:</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 block truncate" title={p.transactionId || p.razorpayPaymentId || '-'}>
                            {p.transactionId || p.razorpayPaymentId || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Paid At / Date:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 block">
                            {p.paidAt ? formatDisplayDateTime(p.paidAt) : (p.createdAt ? formatDisplayDateTime(p.createdAt) : '-')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Digital Platform Record Verified</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(() => {
              const grandTotal = Number(booking.grandTotal || 0);
              const paidAmount = Number(booking.paidAmount || (booking.paymentStatus === 'PAID' || (booking.paymentStatus as string) === 'PAID_FULL' ? grandTotal : 0));
              const balanceDue = Number(booking.balanceAmount ?? Math.max(0, grandTotal - paidAmount));
              const isEligible = booking.status !== 'CANCELLED' && booking.status !== 'EXPIRED' && booking.paymentStatus !== 'PAID' && (booking.paymentStatus as string) !== 'PAID_FULL' && balanceDue > 0 && paidAmount > 0;

              if (!isEligible) return null;
              return (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() => setShowPaymentModal(true)}
                  leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                >
                  Pay Remaining Amount (₹{balanceDue.toLocaleString()})
                </Button>
              );
            })()}
            {Number(booking.paidAmount || 0) > 0 && (booking.invoice || booking.id) && (
              <>
                {booking.invoice?.id && (
                  <Link to={`/invoices/${booking.invoice.id}`} target="_blank">
                    <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}>
                      View Tax Invoice
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => downloadInvoicePdf(booking.invoice?.id || booking.id, booking.bookingReference)}
                >
                  Download Official PDF
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <CompletePaymentModal
          booking={booking}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            onRefresh?.();
            onClose();
          }}
          isAdminMode={true}
        />
      )}
    </Modal>
  );
};
