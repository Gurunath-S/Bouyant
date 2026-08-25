import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Invoice } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Printer, ArrowLeft, Building2, ShieldCheck, Award } from 'lucide-react';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:bg-white print:text-black">
      {/* Actions (Hidden during print) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </button>

        <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
          Print / Save PDF
        </Button>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-2xl text-slate-900 print:text-black">
              <Award className="w-7 h-7 text-blue-600 print:text-blue-700" />
              <span>Buoyant Media Ltd.</span>
            </div>
            <p className="text-xs text-slate-500 print:text-gray-600 mt-1">
              Global Exhibition & Stall Management SaaS Platform
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs rounded uppercase tracking-wider print:border-emerald-600 print:text-emerald-700">
              OFFICIAL TAX INVOICE
            </span>
            <h3 className="text-xl font-mono font-bold text-slate-900 print:text-black mt-2">
              {invoice.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-500 print:text-gray-600">
              Date: {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Billed To / Exhibition Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 print:text-gray-800">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 print:bg-gray-50 print:border-gray-200">
            <p className="font-bold text-blue-700 uppercase text-[10px] tracking-wider">
              Billed To (Exhibitor Corporate Entity):
            </p>
            <p className="text-sm font-bold text-slate-900 print:text-black">{invoice.company?.name}</p>
            <p>Client Code: {invoice.company?.companyCode}</p>
            <p>Contact: {invoice.company?.contactPerson} ({invoice.company?.email})</p>
            <p>GST / Tax ID: {invoice.company?.gstNumber || 'N/A'}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 print:bg-gray-50 print:border-gray-200">
            <p className="font-bold text-blue-700 uppercase text-[10px] tracking-wider">
              Exhibition Event Details:
            </p>
            <p className="text-sm font-bold text-slate-900 print:text-black">
              {invoice.booking?.exhibition?.title}
            </p>
            <p>Venue: {invoice.booking?.exhibition?.venue}, {invoice.booking?.exhibition?.city}</p>
            <p>Booking Ref: {invoice.booking?.bookingReference}</p>
            <p>Payment Ref: {invoice.payment?.paymentReference || 'VERIFIED_SERVER_PAYMENT'}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider font-bold print:bg-gray-100 print:text-black">
                <th className="py-3 px-4 font-semibold">Line Item Description</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Stall #</th>
                <th className="py-3 px-4 font-semibold text-right">Amount (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-gray-200 text-slate-800">
              <tr>
                <td className="py-4 px-4 font-semibold text-slate-900 print:text-black">
                  Exhibition Stall Rental Fee
                </td>
                <td className="py-4 px-4 text-slate-600 print:text-gray-700 uppercase font-medium">
                  {invoice.booking?.stall?.category}
                </td>
                <td className="py-4 px-4 font-bold text-blue-700 print:text-blue-800">
                  Stall {invoice.booking?.stall?.stallNumber}
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 print:text-black">
                  ${Number(invoice.totalAmount).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-200 print:border-gray-200">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold print:text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Digital Server Signature: Verified & Paid</span>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs text-slate-700 print:text-gray-800">
            <div className="flex justify-between py-1 border-b border-slate-100 print:border-gray-200">
              <span>Subtotal:</span>
              <span className="font-mono">${Number(invoice.totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 print:border-gray-200">
              <span>Tax / GST (18%):</span>
              <span className="font-mono">${Number(invoice.taxAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 text-base font-extrabold text-blue-700 print:text-black border-t border-slate-300 print:border-gray-300">
              <span>Grand Total:</span>
              <span className="font-mono">${Number(invoice.grandTotal).toLocaleString()} USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
