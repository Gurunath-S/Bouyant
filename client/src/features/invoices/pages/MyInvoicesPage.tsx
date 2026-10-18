import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Invoice } from '../../../types';
import { FileText, Download, Eye, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { TablePagination } from '../../../components/ui/TablePagination';

const STATUS_STYLES: Record<string, string> = {
  ISSUED: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  PAID: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  CANCELLED: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  VOID: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const MyInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const reqIdRef = React.useRef(0);

  const fetchInvoices = useCallback(async (page: number, limit: number, q: string) => {
    const reqId = ++reqIdRef.current;
    try {
      setLoading(true);
      // CLIENT must use /invoices/my-invoices — the base /invoices requires INVOICE_MANAGE (admin only)
      const res: any = await apiClient.get('/invoices/my-invoices', {
        params: { page, limit, search: q || undefined },
      });

      if (reqId !== reqIdRef.current) return;

      // Defensive unwrapping — server may return array or { data: [], total } shapes
      const payload = res?.data ?? res;
      const list: Invoice[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.invoices)
        ? payload.invoices
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      const total: number =
        typeof payload?.total === 'number' ? payload.total : list.length;

      setInvoices(list);
      setTotalInvoices(total);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      console.error('Failed to load invoices:', err);
      setInvoices([]);
      setTotalInvoices(0);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(currentPage, pageSize, search);
  }, [currentPage, pageSize, search, fetchInvoices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Tax Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official B2B GST tax invoices for your stall bookings — view details or download as PDF.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by invoice # or exhibition..."
            className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" variant="primary" size="sm">
          Search
        </Button>
      </form>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">
          Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No invoices match your search' : 'No Invoices Issued Yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {search
              ? 'Try a different invoice number or exhibition name.'
              : 'Invoices are generated automatically once a stall booking payment is completed.'}
          </p>
          {search && (
            <button
              onClick={handleClearSearch}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                  <th className="w-10 py-3.5 px-3 text-center">#</th>
                  <th className="py-3.5 px-4">Invoice No.</th>
                  <th className="py-3.5 px-4">Exhibition</th>
                  <th className="py-3.5 px-4">Stalls</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4 text-right">Base (excl. GST)</th>
                  <th className="py-3.5 px-4 text-right">GST 18%</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {invoices.map((inv, idx) => {
                  const displayStatus = (inv as any).status === 'ISSUED' ? 'PAID' : ((inv as any).status || 'PAID');
                  const statusStyle =
                    STATUS_STYLES[displayStatus] || STATUS_STYLES['PAID'];
                  const stallNumbers =
                    (inv as any).booking?.stalls
                      ?.map((s: any) => s.stall?.stallNumber || s.stallId)
                      .join(', ') || '—';
                  const exhibitionTitle =
                    (inv as any).booking?.exhibition?.title || '—';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="w-10 py-3.5 px-3 text-center font-mono text-slate-400 font-bold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td
                        className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-[180px] truncate"
                        title={exhibitionTitle}
                      >
                        {exhibitionTitle}
                      </td>
                      <td
                        className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[120px] truncate"
                        title={stallNumbers}
                      >
                        {stallNumbers}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDisplayDate(inv.issueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                        ₹{Number(inv.taxAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link to={`/invoices/${inv.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={
                              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            }
                            onClick={() =>
                              downloadInvoicePdf(inv.id, inv.invoiceNumber)
                            }
                          >
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={totalInvoices}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="invoices"
          />
        </div>
      )}
    </div>
  );
};

