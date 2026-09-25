import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Invoice } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Printer, ArrowLeft, ShieldCheck, Award, FileCheck2, CreditCard, Layers } from 'lucide-react';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'SINGLE_RECEIPT' | 'CONSOLIDATED'>('SINGLE_RECEIPT');

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get(`/invoices/${id}`);
      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading Tax Invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Invoice Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const booking = (invoice as any).booking;
  const payments: any[] = booking?.payments || [];
  const invoices: any[] = booking?.invoices || [];
  const totalPaid = Number(booking?.paidAmount || invoice.grandTotal);
  const totalGrand = Number(booking?.grandTotal || invoice.grandTotal);
  const balanceDue = Number(booking?.balanceAmount ?? (totalGrand - totalPaid));
  const isConsolidatedAvailable = payments.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:bg-white print:text-black">
      {/* Actions & View Switcher (Hidden during print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </button>

        {isConsolidatedAvailable && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('SINGLE_RECEIPT')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'SINGLE_RECEIPT'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Transaction Receipt (#{invoice.invoiceNumber})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CONSOLIDATED')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'CONSOLIDATED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Final Consolidated Statement
            </button>
          </div>
        )}

        <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
          Print / Save PDF
        </Button>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-2xl text-slate-900 dark:text-slate-100 print:text-black">
              <Award className="w-7 h-7 text-blue-600 dark:text-blue-400 print:text-blue-700" />
              <span>Buoyant Media Ltd.</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600 mt-1">
              Global Exhibition & Stall Management SaaS Platform
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 font-extrabold text-xs rounded uppercase tracking-wider print:border ${
                viewMode === 'CONSOLIDATED'
                  ? 'bg-purple-50 dark:bg-purple-950/60 border border-purple-200 text-purple-700 dark:text-purple-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {viewMode === 'CONSOLIDATED' ? 'CONSOLIDATED TAX STATEMENT' : 'OFFICIAL PAYMENT RECEIPT'}
            </span>
            <h3 className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 print:text-black mt-2">
              {viewMode === 'CONSOLIDATED' ? `STATEMENT-${booking?.bookingReference}` : invoice.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600">
              Date: {formatDisplayDate(invoice.issueDate)}
            </p>
          </div>
        </div>

        {/* Billed To / Exhibition Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-slate-300 print:text-gray-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 print:bg-gray-50 print:border-gray-200">
            <p className="font-bold text-blue-700 dark:text-blue-400 uppercase text-[10px] tracking-wider">
              Billed To (Exhibitor Corporate Entity):
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-black">{invoice.company?.name}</p>
            <p>Client Code: {invoice.company?.companyCode}</p>
            <p>Contact: {invoice.company?.contactPerson} ({invoice.company?.email})</p>
            <p>GST / Tax ID: {invoice.company?.gstNumber || 'N/A'}</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 print:bg-gray-50 print:border-gray-200">
            <p className="font-bold text-blue-700 dark:text-blue-400 uppercase text-[10px] tracking-wider">
              Exhibition Event Details:
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-black">
              {booking?.exhibition?.title}
            </p>
            <p>Venue: {booking?.exhibition?.venue}, {booking?.exhibition?.city}</p>
            <p>Booking Ref: {booking?.bookingReference}</p>
            <p>Payment Ref: {invoice.payment?.paymentReference || 'VERIFIED_SERVER_PAYMENT'}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
            Exhibition Stall Specification
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold print:bg-gray-100 print:text-black">
                  <th className="py-3 px-4 font-semibold">Line Item Description</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Stall #</th>
                  <th className="py-3 px-4 font-semibold text-right">Contract Fee (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-200 text-slate-800 dark:text-slate-200">
                {booking?.stalls?.map((bs: any) => (
                  <tr key={bs.id}>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 print:text-black">
                      Exhibition Stall Rental Fee
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400 print:text-gray-700 uppercase font-medium">
                      {bs.stall?.category}
                    </td>
                    <td className="py-4 px-4 font-bold text-blue-700 dark:text-blue-400 print:text-blue-800">
                      Stall {bs.stall?.stallNumber}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 print:text-black">
                      ₹{Number(bs.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History & Installments Ledger */}
        {payments.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" /> Payment & Installments Ledger
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method / Ref</th>
                    <th className="py-2.5 px-3">Txn ID</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p: any, idx: number) => (
                    <tr key={p.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 px-3 font-mono text-[11px]">{formatDisplayDateTime(p.createdAt)}</td>
                      <td className="py-2.5 px-3 font-medium">
                        Installment #{idx + 1} ({p.paymentMethod || 'Online'})
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-600 font-semibold">
                        {p.transactionId || p.paymentReference}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(p.amount).toLocaleString()} INR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Total Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-200 print:border-gray-200">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold print:text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>
              {balanceDue === 0 ? 'Digital Server Signature: Paid in Full' : 'Digital Server Signature: Partial Payment Verified'}
            </span>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-xs text-slate-700 print:text-gray-800">
            <div className="flex justify-between py-1 border-b border-slate-100 print:border-gray-200">
              <span>Full Base Rental Fee:</span>
              <span className="font-mono">₹{Number(booking?.totalAmount || invoice.totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 print:border-gray-200">
              <span>GST Tax (18%):</span>
              <span className="font-mono">₹{Number(booking?.taxAmount || invoice.taxAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200">
              <span>Total Contract Value:</span>
              <span className="font-mono">₹{totalGrand.toLocaleString()} INR</span>
            </div>
            <div className="flex justify-between py-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
              <span>Total Payments Received:</span>
              <span className="font-mono">₹{totalPaid.toLocaleString()} INR</span>
            </div>
            {balanceDue > 0 ? (
              <div className="flex justify-between py-2 text-sm font-black text-rose-600 border-t border-rose-200">
                <span>Remaining Balance Due:</span>
                <span className="font-mono">₹{balanceDue.toLocaleString()} INR</span>
              </div>
            ) : (
              <div className="flex justify-between py-2 text-sm font-black text-emerald-600 border-t border-emerald-200">
                <span>Account Status:</span>
                <span className="font-mono uppercase tracking-wider">PAID IN FULL</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
