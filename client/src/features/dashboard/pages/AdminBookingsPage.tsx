import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { Booking } from '../../../types';
import { BookmarkCheck } from 'lucide-react';
import { BookingStatusBadge } from '../../../components/ui/Badge';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-purple-600" />
            Global Platform Booking Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit exhibition stall reservations across all active events.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Booking Ref</th>
              <th className="py-3.5 px-4">Exhibition</th>
              <th className="py-3.5 px-4">Stall #</th>
              <th className="py-3.5 px-4">Exhibitor Company</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{b.bookingReference}</td>
                <td className="py-3.5 px-4 font-semibold text-slate-900">{b.exhibition?.title}</td>
                <td className="py-3.5 px-4 font-bold text-slate-700">Stall {b.stall?.stallNumber}</td>
                <td className="py-3.5 px-4">{b.company?.name}</td>
                <td className="py-3.5 px-4">
                  <BookingStatusBadge status={b.status} />
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                  ${Number(b.grandTotal).toLocaleString()} USD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
