import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../../services/bookings/bookingService';
import { Booking } from '../../../types';
import { BookingStatusBadge } from '../../../components/ui/Badge';
import { BookmarkCheck, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-blue-600" />
            My Stall Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
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
        <div className="p-12 text-center text-slate-500 animate-pulse font-medium">
          Loading Booking Ledger...
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Stall Bookings Yet</h3>
          <p className="text-xs text-slate-500">Explore trade fairs to select and reserve exhibition stalls.</p>
          <Link to="/exhibitions" className="inline-block pt-2">
            <Button variant="primary" size="sm">
              Explore Exhibitions
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Exhibition Event</th>
                <th className="py-3.5 px-4">Stall Number</th>
                <th className="py-3.5 px-4">Company Entity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{b.bookingReference}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{b.exhibition?.title}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">Stall {b.stall?.stallNumber}</td>
                  <td className="py-3.5 px-4">{b.company?.name}</td>
                  <td className="py-3.5 px-4">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    ${Number(b.grandTotal).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {b.invoice ? (
                      <Link to={`/invoices/${b.invoice.id}`}>
                        <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                          Tax Invoice
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[10px] text-slate-400">Processing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
