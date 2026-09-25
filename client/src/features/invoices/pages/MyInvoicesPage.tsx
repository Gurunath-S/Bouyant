import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Invoice } from '../../../types';
import { FileText, Download, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';

export const MyInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Tax Invoices & Financial Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official B2B GST tax invoices, line-item stall rental records, and downloadable PDFs.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">
          Loading Invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Invoices Issued</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Invoices will appear here automatically upon stall booking completion.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Exhibitor Company</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4 text-right">Base Amount</th>
                <th className="py-3.5 px-4 text-right">Tax (18% GST)</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{inv.company?.name}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatDisplayDate(inv.issueDate)}</td>
                  <td className="py-3.5 px-4 text-right font-mono">₹{Number(inv.totalAmount).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono">₹{Number(inv.taxAmount).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    ₹{Number(inv.grandTotal).toLocaleString()} INR
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link to={`/invoices/${inv.id}`}>
                      <Button variant="outline" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                        View & Print
                      </Button>
                    </Link>
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
