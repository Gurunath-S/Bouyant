import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { PaymentStatusBadge } from '../../../components/ui/Badge';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/payments');
      setPayments(res.data);
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
            <CreditCard className="w-6 h-6 text-purple-600" />
            Financial Transaction Audits
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit payment transaction logs, verification statuses, and gateway references.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Payment Ref</th>
              <th className="py-3.5 px-4">Booking Ref</th>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-4">Verification Status</th>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4 text-right">Amount Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{p.paymentReference}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{p.booking?.bookingReference}</td>
                <td className="py-3.5 px-4 font-semibold text-slate-900">{p.paymentMethod}</td>
                <td className="py-3.5 px-4">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="py-3.5 px-4 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600">
                  ${Number(p.amount).toLocaleString()} USD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
