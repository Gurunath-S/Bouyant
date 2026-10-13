import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Booking, Exhibition } from '../../../types';
import { BookmarkCheck, Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { BookingStatusBadge } from '../../../components/ui/Badge';
import { BookingDetailModal } from '../../bookings/components/BookingDetailModal';
import { Button } from '../../../components/ui/Button';
import { TablePagination } from '../../../components/ui/TablePagination';

export const AdminBookingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters state initialized from URL search params if present
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [exhibitionFilter, setExhibitionFilter] = useState(searchParams.get('exhibitionId') || 'ALL');
  const [registrarFilter, setRegistrarFilter] = useState('ALL');

  // Request ID ref to protect against out-of-order race conditions
  const bookingsReqIdRef = useRef(0);

  useEffect(() => {
    exhibitionService.getExhibitions().then((res) => setExhibitions(res || []));
  }, []);

  const fetchBookings = useCallback(async () => {
    const reqId = ++bookingsReqIdRef.current;
    try {
      setLoading(true);
      const res: any = await bookingService.getAllBookings({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        exhibitionId: exhibitionFilter !== 'ALL' ? exhibitionFilter : undefined,
        registeredByRole: registrarFilter !== 'ALL' ? registrarFilter : undefined,
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
  }, [currentPage, pageSize, searchQuery, statusFilter, exhibitionFilter, registrarFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, exhibitionFilter, registrarFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Exhibition Bookings
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
              placeholder="Search by ref, company name, stall #..."
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Booking Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="INITIATED">INITIATED</option>
              <option value="HELD">HELD</option>
              <option value="PENDING_PAYMENT">PENDING PAYMENT</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>

            <select
              value={registrarFilter}
              onChange={(e) => setRegistrarFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Registrars</option>
              <option value="ADMIN">Admin Registered</option>
              <option value="STAFF">Staff Registered</option>
              <option value="CLIENT">Client Direct Online</option>
            </select>
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
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700 dark:text-purple-400 group-hover:underline">
                        {b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-xs">{b.exhibition?.title}</span>
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
                      <td className="py-3.5 px-4">
                        <BookingStatusBadge status={b.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{Number(b.grandTotal).toLocaleString()} INR
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedBooking(b);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded transition-colors"
                          title="Inspect full booking details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
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
    </div>
  );
};
