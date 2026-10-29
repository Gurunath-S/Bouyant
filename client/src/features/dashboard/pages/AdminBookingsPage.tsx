import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Booking, Exhibition } from '../../../types';
import { BookmarkCheck, Eye, Search, Filter, RefreshCw, CreditCard, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { CompletePaymentModal } from '../../payments/components/CompletePaymentModal';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { TablePagination } from '../../../components/ui/TablePagination';
import { formatDisplayDateTime } from '../../../utils/date';

export const AdminBookingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isStaff = user?.role === 'STAFF';
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters state initialized from URL search params if present
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(searchParams.get('paymentStatus') || 'ALL');
  const [exhibitionFilter, setExhibitionFilter] = useState(searchParams.get('exhibitionId') || 'ALL');
  const [registrarFilter, setRegistrarFilter] = useState(
    searchParams.get('registrar') || 'ALL'
  );
  const [balanceOnlyFilter, setBalanceOnlyFilter] = useState(false);

  // Request ID ref to protect against out-of-order race conditions
  const bookingsReqIdRef = useRef(0);

  useEffect(() => {
    exhibitionService.getExhibitions().then((res) => setExhibitions(res || []));
  }, []);

  const fetchBookings = useCallback(async () => {
    const reqId = ++bookingsReqIdRef.current;
    try {
      setLoading(true);
      const bookedByUserId = searchParams.get('bookedByUserId') || undefined;

      const res: any = await bookingService.getAllBookings({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        exhibitionId: exhibitionFilter !== 'ALL' ? exhibitionFilter : undefined,
        registeredByRole: registrarFilter !== 'ALL' ? registrarFilter : undefined,
        bookedByUserId,
        hasBalanceOnly: balanceOnlyFilter || undefined,
      });

      if (reqId === bookingsReqIdRef.current) {
        setBookings(res?.data || []);
        setTotalBookings(res?.meta?.total || 0);
        setTotalValue(Number(res?.meta?.totalValue || 0));
      }
    } catch (err) {
      if (reqId === bookingsReqIdRef.current) {
        console.error('Failed to load bookings:', err);
        setBookings([]);
        setTotalBookings(0);
        setTotalValue(0);
      }
    } finally {
      if (reqId === bookingsReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, paymentStatusFilter, exhibitionFilter, registrarFilter, balanceOnlyFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, paymentStatusFilter, exhibitionFilter, registrarFilter, balanceOnlyFilter]);

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await bookingService.deleteBooking(bookingToDelete.id);
      setBookingToDelete(null);
      await fetchBookings();
    } catch (err: any) {
      console.error('Failed to delete booking:', err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Cannot delete booking. Please ensure it is unpaid or cancelled.';
      setDeleteError(apiMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Bookings & Allocations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View, filter, and audit stall space reservations across all platform exhibitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchBookings}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ref, company name, stall No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30 font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={exhibitionFilter}
                onChange={(e) => setExhibitionFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Exhibitions</option>
                {exhibitions.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.eventCode || 'EX'}-{ex.edition || '01'})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Status Filter (Active statuses only) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Booking Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Payment Status Filter (Active statuses only) */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID_FULL">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>

            <select
              value={registrarFilter}
              onChange={(e) => setRegistrarFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Registered</option>
              <option value="ADMIN">Admin Registered</option>
              <option value="STAFF">Staff Registered</option>
              <option value="CLIENT">Client Direct Online</option>
            </select>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-100/50">
              <input
                type="checkbox"
                checked={balanceOnlyFilter}
                onChange={(e) => setBalanceOnlyFilter(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Pending Balance Only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
          <span>
            Showing <strong>{bookings.length}</strong> of {totalBookings} reservations
          </span>
          <span>
            Total Filtered Value: <strong className="font-mono text-purple-700 dark:text-purple-400">₹{totalValue.toLocaleString()} INR</strong>
          </span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bookings directory...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <BookmarkCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No Bookings Found</p>
            <p>No reservations matched your search or status filter.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                    <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                    <th className="py-3.5 px-4">Booking Ref</th>
                    <th className="py-3.5 px-4">Exhibition Event</th>
                    <th className="py-3.5 px-4">Stall(s)</th>
                    <th className="py-3.5 px-4">Exhibitor Company</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Value & Balance</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {bookings.map((b, idx) => (
                    <tr
                      key={b.id}
                      onClick={() => setInspectedBooking(b)}
                      className="hover:bg-purple-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                    >
                      <td className="w-12 py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400 group-hover:underline block">
                          {b.bookingReference}
                        </span>
                        {b.createdAt && (
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {formatDisplayDateTime(b.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block break-words">{b.exhibition?.title}</span>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {b.exhibition?.eventCode}-{b.exhibition?.edition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        Stall(s) {b.stalls?.map((bs) => bs.stall?.stallNumber).join(', ') || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold block text-slate-900 dark:text-slate-100">{b.company?.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{b.company?.contactPerson}</span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col gap-1.5 items-start justify-center min-w-[125px]">
                          <BookingStatusBadge status={b.status} className="w-full text-center" />
                          <PaymentStatusBadge status={b.paymentStatus || 'UNPAID'} className="w-full text-center" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(() => {
                          const grandTotal = Number(b.grandTotal || 0);
                          const paidAmount = Number(b.paidAmount || (b.paymentStatus === 'PAID' || b.paymentStatus === 'PAID_FULL' ? grandTotal : 0));
                          const balanceDue = Number(b.balanceAmount ?? Math.max(0, grandTotal - paidAmount));
                          return (
                            <div>
                              <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 block">
                                ₹{grandTotal.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                                Paid: ₹{paidAmount.toLocaleString()}
                              </span>
                              {balanceDue > 0 ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold block mt-0.5">
                                  Due: ₹{balanceDue.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-semibold">
                                  Settled
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedBooking(b);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded transition-colors"
                            title="Inspect full booking details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>

                          {(() => {
                            const grandTotal = Number(b.grandTotal || 0);
                            const paidAmount = Number(b.paidAmount || (b.paymentStatus === 'PAID' || b.paymentStatus === 'PAID_FULL' ? grandTotal : 0));
                            const balanceDue = Number(b.balanceAmount ?? Math.max(0, grandTotal - paidAmount));
                            const isEligible = b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PAID_FULL' && balanceDue > 0;

                            if (!isEligible) return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayingBooking(b);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded transition-colors"
                                title="Collect / Pay remaining balance"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Pay Remaining</span>
                              </button>
                            );
                          })()}

                          {Number(b.paidAmount || 0) > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadInvoicePdf(b);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded transition-colors"
                              title="Download Tax Invoice / Bill"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                              <span>Bill</span>
                            </button>
                          )}

                          {isSuperAdmin &&
                            (b.paymentStatus === 'UNPAID' || b.status === 'CANCELLED' || b.status === 'EXPIRED') &&
                            Number(b.paidAmount || 0) <= 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookingToDelete(b);
                                  setDeleteError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded transition-colors"
                                title="Delete Unpaid / Cancelled Booking (Super Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Delete</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={totalBookings}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemLabel="bookings"
            />
          </div>
        )}
      </div>

      {/* Booking Dossier Modal */}
      <BookingDetailModal
        booking={inspectedBooking}
        isOpen={!!inspectedBooking}
        onClose={() => setInspectedBooking(null)}
        onRefresh={fetchBookings}
      />

      {/* Complete Payment Modal for Pending Balance */}
      {payingBooking && (
        <CompletePaymentModal
          booking={payingBooking}
          isOpen={!!payingBooking}
          onClose={() => setPayingBooking(null)}
          onSuccess={() => {
            setPayingBooking(null);
            fetchBookings();
          }}
          isAdminMode={true}
        />
      )}

      {/* Delete Booking Confirmation Modal (Super Admin) */}
      <Modal
        isOpen={!!bookingToDelete}
        onClose={() => {
          if (!isDeleting) {
            setBookingToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Booking Record"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-900 dark:text-rose-200">
              <p className="font-semibold">Irreversible Super Admin Action</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                You are about to delete booking{' '}
                <strong className="font-mono">{bookingToDelete?.bookingReference}</strong> for{' '}
                <strong>{bookingToDelete?.company?.name || 'Company'}</strong>. Any held or reserved stalls will be released back to the available inventory immediately.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Exhibition:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{bookingToDelete?.exhibition?.title || 'Exhibition'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Stalls:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {bookingToDelete?.stalls?.map((s) => s.stall?.stallNumber).filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Booking Status:</span>
              <span className="font-medium">{bookingToDelete?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Payment Status:</span>
              <span className="font-medium">{bookingToDelete?.paymentStatus}</span>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setBookingToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeleting}
              onClick={handleConfirmDeleteBooking}
              className="bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Booking</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
