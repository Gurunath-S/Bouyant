import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Booking } from '../../../types';
import { BookingStatusBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';
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
} from 'lucide-react';

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  if (!booking) return null;

  const basePrice = Number(booking.totalAmount || 0);
  const taxAmount = Number(booking.taxAmount || 0);
  const grandTotal = Number(booking.grandTotal || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Booking Dossier — ${booking.bookingReference}`}
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

        {/* Financial & Ledger Breakdown */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
            <FileText className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Financial Settlement & Tax Ledger
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Base Rental Fee</p>
              <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                ₹{basePrice.toLocaleString()} INR
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase">GST Tax (18%)</p>
              <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                ₹{taxAmount.toLocaleString()} INR
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Settled Grand Total</p>
              <p className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{grandTotal.toLocaleString()} INR
              </p>
            </div>
          </div>
        </div>

        {/* Payment Transaction Audit */}
        {booking.payment && (
          <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-[#012970] dark:text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <CreditCard className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Gateway Transaction Record
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Payment Ref:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {booking.payment.paymentReference}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Gateway Provider:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {booking.payment.provider}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Method:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {booking.payment.paymentMethod || 'Razorpay UPI'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Txn Reference ID:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {booking.payment.transactionId || 'TXN-AUTO-CONFIRM'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Digital Platform Record Verified</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {booking.invoice && (
              <Link to={`/invoices/${booking.invoice.id}`} target="_blank">
                <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                  View & Print Tax Invoice
                </Button>
              </Link>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close Dossier
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
