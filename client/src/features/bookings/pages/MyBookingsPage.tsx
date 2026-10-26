import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { Booking } from '../../../types';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { BookmarkCheck, FileText, CreditCard, Download, Clock, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { BackButton } from '../../../components/ui/BackButton';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import { BookingDetailModal } from '../components/BookingDetailModal';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { TablePagination } from '../../../components/ui/TablePagination';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Payment Modal State
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<Booking | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  async function fetchBookings() {
    try {
      setLoading(true);
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return bookings.slice(start, start + PAGE_SIZE);
  }, [bookings, currentPage]);

  return (
    <div className="space-y-6">
      {/* Back to Dashboard */}
      <div>
        <BackButton to="/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            My Stall Bookings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete record of your reserved exhibition stalls, payment verification status, and tax invoices.
          </p>
        </div>

        <Link to="/exhibitions">
          <Button variant="primary" size="sm">
            Book Another Stall
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">
          Loading Bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <BookmarkCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Stall Bookings Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Explore trade fairs to select and reserve exhibition stalls.</p>
          <Link to="/exhibitions" className="inline-block pt-2">
            <Button variant="primary" size="sm">
              Explore Exhibitions
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Exhibition Event</th>
                <th className="py-3.5 px-4">Stall Number</th>
                <th className="py-3.5 px-4">Company Entity</th>
                <th className="py-3.5 px-4">Status & Payment</th>
                <th className="py-3.5 px-4 text-right">Financials (Total / Paid / Due)</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {paginatedBookings.map((b, idx) => {
                const grandTotal = Number(b.grandTotal || 0);
                const paidAmount = Number(b.paidAmount || (b.paymentStatus === 'PAID' || (b.paymentStatus as string) === 'PAID_FULL' ? grandTotal : 0));
                const balanceDue = Number(b.balanceAmount ?? Math.max(0, grandTotal - paidAmount));
                const isEligibleForPayment = b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && b.paymentStatus !== 'PAID' && (b.paymentStatus as string) !== 'PAID_FULL' && balanceDue > 0 && paidAmount > 0;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="w-12 py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">{b.bookingReference}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{b.exhibition?.title}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">Stall(s) {b.stalls?.map(bs => bs.stall?.stallNumber).join(', ')}</td>
                    <td className="py-3.5 px-4">{b.company?.name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus || 'UNPAID'} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 block">
                        ₹{grandTotal.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono block">
                        Paid: ₹{paidAmount.toLocaleString()}
                      </span>
                      {balanceDue > 0 ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold block">
                          Due: ₹{balanceDue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                          Settled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                          onClick={() => {
                            setSelectedDetailBooking(b);
                            setIsDetailModalOpen(true);
                          }}
                          title="View full booking & payment transactions"
                        >
                          Details
                        </Button>
                        {isEligibleForPayment && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setSelectedPaymentBooking(b);
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            Pay Remaining (₹{balanceDue.toLocaleString()})
                          </Button>
                        )}
                        {paidAmount > 0 ? (
                          b.invoice ? (
                            <div className="flex items-center gap-1.5">
                              <Link to={`/invoices/${b.invoice.id}`}>
                                <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Download className="w-3.5 h-3.5" />}
                                onClick={() => downloadInvoicePdf(b)}
                                title="Download Tax Invoice Bill (PDF)"
                              >
                                Bill PDF
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                              onClick={() => downloadInvoicePdf(b)}
                              title="Download Tax Invoice Bill (PDF)"
                            >
                              Bill PDF
                            </Button>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Payment</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <TablePagination
            currentPage={currentPage}
            totalItems={bookings.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="bookings"
          />
        </div>
      )}

      {/* Complete Payment Modal */}
      <CompletePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPaymentBooking(null);
        }}
        booking={selectedPaymentBooking}
        onSuccess={fetchBookings}
      />

      {/* Booking Detail & Payment Transactions Audit Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailBooking(null);
        }}
        booking={selectedDetailBooking}
        onRefresh={fetchBookings}
      />
    </div>
  );
};
