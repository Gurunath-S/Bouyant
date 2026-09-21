import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { CreditCard, Search, Filter, RefreshCw, DollarSign } from 'lucide-react';
import { PaymentStatusBadge } from '../../../components/ui/Badge';
import { formatDisplayDateTime } from '../../../utils/date';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/payments');
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Search filter (Payment Ref, Booking Ref, Payment Method)
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.paymentReference && p.paymentReference.toLowerCase().includes(q)) ||
        (p.booking?.bookingReference && p.booking.bookingReference.toLowerCase().includes(q)) ||
        (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q));

      // 2. Status filter
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      // 3. Payment Method / Plan filter
      let matchMethod = methodFilter === 'ALL';
      if (!matchMethod) {
        if (methodFilter === 'FULL') {
          matchMethod = !p.installmentType || p.installmentType === 'FULL';
        } else if (methodFilter === 'PARTIAL') {
          matchMethod = Boolean(p.installmentType && p.installmentType !== 'FULL');
        } else {
          matchMethod = p.paymentMethod === methodFilter;
        }
      }

      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, searchQuery, statusFilter, methodFilter]);

  // Dynamic total calculations
  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const uniqueMethods = useMemo(() => {
    const methods = new Set<string>();
    payments.forEach((p) => {
      if (p.paymentMethod) methods.add(p.paymentMethod);
    });
    return Array.from(methods);
  }, [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            Payments & Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-1">View payment history, transaction status, and payment gateway references.</p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Payment Ref, Booking Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Payment Plan / Type Filter */}
          <div className="relative">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Payment Plans & Types</option>
              <option value="FULL">Full Payment (100%)</option>
              <option value="PARTIAL">Partial Payment / Installment</option>
              {uniqueMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <span>
            Showing <strong className="text-slate-900">{filteredPayments.length}</strong> of{' '}
            <strong className="text-slate-900">{payments.length}</strong> transactions
          </span>

          <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <DollarSign className="w-3.5 h-3.5" />
            Filtered Total: ₹{totalFilteredAmount.toLocaleString('en-IN')} INR
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading transactions...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No transaction records found matching the applied search and filter criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Payment ID</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Payment Plan / Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPayments.map((p) => {
                const isPartial = p.installmentType && p.installmentType !== 'FULL';
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{p.paymentReference}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{p.booking?.bookingReference || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isPartial ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            PARTIAL PAYMENT ({p.installmentType || 'Token'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            FULL PAYMENT (100%)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        Mode: {p.paymentMethod || 'Simulated Gateway'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDisplayDateTime(p.createdAt)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600">
                      ₹{Number(p.amount).toLocaleString('en-IN')} INR
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

