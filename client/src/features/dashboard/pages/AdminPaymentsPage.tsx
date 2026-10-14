import React, { useEffect, useState, useRef, useCallback } from 'react';
import { paymentService } from '../../../services/payments/paymentService';
import { apiClient } from '../../../services/api/apiClient';
import { CreditCard, Search, Filter, RefreshCw, DollarSign, Download, Eye, FileText, Printer, X, Receipt, Loader2 } from 'lucide-react';
import { PaymentStatusBadge } from '../../../components/ui/Badge';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { TablePagination } from '../../../components/ui/TablePagination';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { numberToIndianWords } from '../../../utils/numberToWords';

export const AdminPaymentsPage: React.FC = () => {
  // Navigation Tabs: 'TRANSACTIONS' vs 'INVOICES'
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'INVOICES'>('TRANSACTIONS');

  // Transactions State
  const [payments, setPayments] = useState<any[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalFilteredAmount, setTotalFilteredAmount] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Transactions Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Invoices & Bills State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  // Selected Bill / Invoice for Inspection Modal
  const [selectedBillOrInvoice, setSelectedBillOrInvoice] = useState<any | null>(null);

  // Download Loading States
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isModalDownloading, setIsModalDownloading] = useState(false);

  // Stale request race condition safety
  const paymentsReqIdRef = useRef(0);
  const invoicesReqIdRef = useRef(0);

  const fetchPayments = useCallback(async () => {
    const reqId = ++paymentsReqIdRef.current;
    try {
      setLoadingPayments(true);
      const res: any = await paymentService.getAllPayments({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
      });

      if (reqId === paymentsReqIdRef.current) {
        const list = Array.isArray(res?.data) ? res.data : [];
        setPayments(list);
        setTotalPayments(res?.meta?.total || 0);
        setTotalFilteredAmount(Number(res?.meta?.totalFilteredAmount || 0));
      }
    } catch (err) {
      if (reqId === paymentsReqIdRef.current) {
        console.error('Failed to load payments:', err);
        setPayments([]);
        setTotalPayments(0);
        setTotalFilteredAmount(0);
      }
    } finally {
      if (reqId === paymentsReqIdRef.current) {
        setLoadingPayments(false);
      }
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, methodFilter]);

  const fetchInvoices = useCallback(async () => {
    const reqId = ++invoicesReqIdRef.current;
    try {
      setLoadingInvoices(true);
      const res: any = await apiClient.get('/invoices', {
        params: {
          page: invoicePage,
          limit: invoicePageSize,
          search: invoiceSearch.trim() || undefined,
        },
      });

      if (reqId === invoicesReqIdRef.current) {
        const list = Array.isArray(res?.data) ? res.data : [];
        setInvoices(list);
        setTotalInvoices(res?.meta?.total || 0);
      }
    } catch (err) {
      if (reqId === invoicesReqIdRef.current) {
        console.error('Failed to load invoices:', err);
        setInvoices([]);
        setTotalInvoices(0);
      }
    } finally {
      if (reqId === invoicesReqIdRef.current) {
        setLoadingInvoices(false);
      }
    }
  }, [invoicePage, invoicePageSize, invoiceSearch]);

  useEffect(() => {
    if (activeTab === 'TRANSACTIONS') {
      fetchPayments();
    } else {
      fetchInvoices();
    }
  }, [activeTab, fetchPayments, fetchInvoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter]);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch]);

  const handleRefresh = () => {
    if (activeTab === 'TRANSACTIONS') {
      fetchPayments();
    } else {
      fetchInvoices();
    }
  };

  // Helper to extract invoice data for modal presentation
  const getInvoiceModalData = (item: any) => {
    if (!item) return null;
    const isPayment = Boolean(item.paymentReference);
    const booking = item.booking;
    const company = item.company || booking?.company;
    const exhibition = booking?.exhibition;
    const stalls = booking?.stalls || [];
    const invoiceNumber = item.invoiceNumber || (booking?.invoices && booking.invoices[0]?.invoiceNumber) || `BILL-${item.bookingReference || item.paymentReference || 'RECORD'}`;
    const issueDate = item.issueDate || item.paidAt || item.createdAt;

    const grandTotal = Number(item.grandTotal || item.amount || booking?.grandTotal || 0);
    const taxAmount = Number(item.taxAmount || (grandTotal * 18 / 118).toFixed(2));
    const taxableAmount = Number((grandTotal - taxAmount).toFixed(2));
    const cgstAmount = Number((taxAmount / 2).toFixed(2));
    const sgstAmount = Number((taxAmount / 2).toFixed(2));

    const primaryStall = stalls[0]?.stall || { stallNumber: 'Allocated Stall', category: 'STANDARD', areaSqFt: 100 };
    const totalQty = stalls.reduce((sum: number, bs: any) => sum + (bs.stall?.areaSqFt || 100), 0) || (primaryStall.areaSqFt || 100);

    return {
      isPayment,
      invoiceNumber,
      issueDate,
      company,
      exhibition,
      stalls,
      primaryStall,
      totalQty,
      grandTotal,
      taxAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      idForDownload: item.id || item.invoiceId || booking?.id || item.bookingId,
    };
  };

  const modalData = getInvoiceModalData(selectedBillOrInvoice);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Payments & Billing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit gateway transactions, track payment reconciliations, inspect official bills, and download verified tax invoices (.pdf).
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loadingPayments || loadingInvoices}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments || loadingInvoices ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'TRANSACTIONS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Transactions & Gateway Logs</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
            {totalPayments}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INVOICES')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'INVOICES'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tax Invoices & Billing Records</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono font-bold">
            {totalInvoices}
          </span>
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS & GATEWAY LOGS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keyword Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Payment Ref, Booking Ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Payment Plans & Types</option>
                  <option value="FULL">Full Payment (100%)</option>
                  <option value="PARTIAL">Partial Payment / Installment</option>
                  <option value="RAZORPAY">Razorpay Gateway</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="SIMULATED_GATEWAY">Simulated Gateway</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Filter Summary Stats */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
              <span>
                Showing <strong className="text-slate-900 dark:text-slate-100">{payments.length}</strong> of{' '}
                <strong className="text-slate-900 dark:text-slate-100">{totalPayments}</strong> transactions
              </span>

              <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                <DollarSign className="w-3.5 h-3.5" />
                Filtered Total: ₹{totalFilteredAmount.toLocaleString('en-IN')} INR
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {loadingPayments ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading transactions...</div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                No transaction records found matching the applied search and filter criteria.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                        <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                        <th className="py-3.5 px-4">Payment ID</th>
                        <th className="py-3.5 px-4">Booking Ref</th>
                        <th className="py-3.5 px-4">Payment Plan / Type</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4 text-right">Amount</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {payments.map((p, idx) => {
                        const isPartial = p.installmentType && p.installmentType !== 'FULL';
                        const idToUse = p.invoiceId || p.booking?.id || p.bookingId || p.id;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedBillOrInvoice(p)}
                            className="hover:bg-purple-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <td className="w-12 py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">{p.paymentReference}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">{p.booking?.bookingReference || 'N/A'}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {isPartial ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    PARTIAL PAYMENT ({p.installmentType || 'Token'})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    FULL PAYMENT (100%)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                                Mode: {p.paymentMethod || 'Simulated Gateway'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <PaymentStatusBadge status={p.status} />
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatDisplayDateTime(p.createdAt)}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              ₹{Number(p.amount).toLocaleString('en-IN')} INR
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBillOrInvoice(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded transition-colors"
                                  title="View complete bill and tax invoice breakdown"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={downloadingId === idToUse}
                                  onClick={async () => {
                                    setDownloadingId(idToUse);
                                    try {
                                      await downloadInvoicePdf(idToUse, `Invoice-${p.booking?.bookingReference || p.paymentReference}.pdf`);
                                    } finally {
                                      setDownloadingId(null);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Download official PDF bill (.pdf format)"
                                >
                                  {downloadingId === idToUse ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>{downloadingId === idToUse ? 'Generating...' : 'PDF'}</span>
                                </button>
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
                  totalItems={totalPayments}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemLabel="transactions"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TAX INVOICES & BILLING RECORDS */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          {/* Search Bar for Invoices */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice #, Company Name..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder-slate-400"
              />
              {invoiceSearch && (
                <button
                  onClick={() => setInvoiceSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {loadingInvoices ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading invoices & bills...</div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No Invoices Found</p>
                <p>No billing invoice records matched your search query.</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                        <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Exhibitor Company</th>
                        <th className="py-3.5 px-4">Issue Date</th>
                        <th className="py-3.5 px-4 text-right">Base Amount</th>
                        <th className="py-3.5 px-4 text-right">GST (18%)</th>
                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {invoices.map((inv, idx) => (
                        <tr
                          key={inv.id}
                          onClick={() => setSelectedBillOrInvoice(inv)}
                          className="hover:bg-purple-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="w-12 py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                            {(invoicePage - 1) * invoicePageSize + idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700 dark:text-purple-400">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            {inv.company?.name || 'Enterprise'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            {formatDisplayDate(inv.issueDate || inv.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400">
                            ₹{Number(inv.taxAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                            ₹{Number(inv.grandTotal).toLocaleString('en-IN')} INR
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setSelectedBillOrInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded transition-colors"
                                title="Inspect invoice and bill breakdown"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                disabled={downloadingId === inv.id}
                                onClick={async () => {
                                  setDownloadingId(inv.id);
                                  try {
                                    await downloadInvoicePdf(inv.id, `Invoice-${inv.invoiceNumber}.pdf`);
                                  } finally {
                                    setDownloadingId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download official PDF invoice (.pdf format)"
                              >
                                {downloadingId === inv.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>{downloadingId === inv.id ? 'Generating...' : 'Download PDF'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={invoicePage}
                  totalItems={totalInvoices}
                  pageSize={invoicePageSize}
                  onPageChange={setInvoicePage}
                  onPageSizeChange={(newSize) => {
                    setInvoicePageSize(newSize);
                    setInvoicePage(1);
                  }}
                  itemLabel="invoices"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTED BILL OR INVOICE INSPECTION MODAL */}
      {selectedBillOrInvoice && modalData && (
        <Modal
          isOpen={!!selectedBillOrInvoice}
          onClose={() => setSelectedBillOrInvoice(null)}
          title={`Tax Invoice & Bill: ${modalData.invoiceNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Action Bar inside Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  OFFICIAL GST TAX INVOICE
                </span>
                <span className="font-mono text-xs text-slate-500">
                  Ref: {modalData.invoiceNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isModalDownloading}
                  onClick={async () => {
                    setIsModalDownloading(true);
                    try {
                      await downloadInvoicePdf(modalData.idForDownload, `Invoice-${modalData.invoiceNumber}.pdf`);
                    } finally {
                      setIsModalDownloading(false);
                    }
                  }}
                  leftIcon={
                    isModalDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {isModalDownloading ? 'Generating PDF...' : 'Download PDF (.pdf)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print
                </Button>
              </div>
            </div>

            {/* Printable Tally Layout Box */}
            <div className="bg-white text-black border-[1.5px] border-black text-[11px] leading-tight select-none shadow-md rounded">
              {/* Header Box */}
              <div className="grid grid-cols-2 border-b-[1.5px] border-black">
                {/* Supplier Info */}
                <div className="p-3 border-r-[1.5px] border-black space-y-0.5">
                  <div className="font-bold text-sm">BUOYANT MEDIA</div>
                  <div>NO 57A, 2ND FLOOR,</div>
                  <div>RAMASAMY STREET, KK PUDUR,</div>
                  <div>NSR ROAD, CBE-641038</div>
                  <div>MOBILE : 9500288222</div>
                  <div>GSTIN : 33ACXPH4512M1ZA</div>
                  <div>State Name : Tamil Nadu, Code : 33</div>
                </div>

                {/* Invoice Meta */}
                <div className="grid grid-cols-2">
                  <div className="p-3 border-r border-black">
                    <div className="text-[10px] text-slate-600">Invoice No.</div>
                    <div className="font-bold underline text-xs mt-1">{modalData.invoiceNumber}</div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-slate-600">Dated</div>
                    <div className="font-bold text-xs mt-1">{formatDisplayDate(modalData.issueDate)}</div>
                  </div>
                </div>
              </div>

              {/* Buyer (Bill To) Box */}
              <div className="p-3 border-b-[1.5px] border-black space-y-0.5">
                <div className="text-[10px] text-slate-600">Buyer (Bill To)</div>
                <div className="font-bold text-xs uppercase">{modalData.company?.name || 'REGISTERED EXHIBITOR'}</div>
                <div className="uppercase">{modalData.company?.address || 'CORPORATE ADDRESS ON FILE'}</div>
                <div className="uppercase">{modalData.company?.city || 'INDIA'}</div>
                <div>GSTIN/UIN : {modalData.company?.gstNumber || 'UNREGISTERED'}</div>
                <div>State Name : {modalData.company?.state || 'Tamil Nadu'}</div>
              </div>

              {/* Items Table */}
              <div className="border-b-[1.5px] border-black">
                <div className="grid grid-cols-12 border-b-[1.5px] border-black text-center text-[10px] font-bold py-1 bg-slate-50">
                  <div className="col-span-1 border-r border-black">Sl<br />No</div>
                  <div className="col-span-5 border-r border-black">Description of Goods / Services</div>
                  <div className="col-span-2 border-r border-black">HSN/SAC</div>
                  <div className="col-span-1 border-r border-black">Quantity</div>
                  <div className="col-span-1 border-r border-black">Per</div>
                  <div className="col-span-2">Amount (INR)</div>
                </div>

                <div className="grid grid-cols-12 min-h-[160px]">
                  {/* Sl No */}
                  <div className="col-span-1 border-r border-black p-2 text-right font-mono">1</div>

                  {/* Description */}
                  <div className="col-span-5 border-r border-black p-2 space-y-0.5 leading-snug">
                    <div className="font-bold uppercase">
                      STALL NO : {modalData.stalls?.map((bs: any) => bs.stall?.stallNumber).join(', ') || modalData.primaryStall.stallNumber} ({modalData.primaryStall.category || 'PREMIUM'})
                    </div>
                    <div className="font-bold">{modalData.totalQty} SQFT</div>
                    <div className="font-bold mt-1 uppercase">{modalData.exhibition?.title || 'EXPO EXHIBITION'}</div>
                    <div className="text-[10px]">
                      VENUE: {modalData.exhibition?.venue || 'TRADE CENTRE'}, {modalData.exhibition?.city || 'COIMBATORE'}
                    </div>

                    <div className="pt-6 text-right italic font-bold pr-2 space-y-0.5 text-[10px]">
                      <div>OUTPUT CGST (9%)</div>
                      <div>OUTPUT SGST (9%)</div>
                    </div>
                  </div>

                  {/* HSN/SAC */}
                  <div className="col-span-2 border-r border-black p-2 text-center font-mono">9983</div>

                  {/* Quantity */}
                  <div className="col-span-1 border-r border-black p-2 text-right font-bold">{modalData.totalQty}</div>

                  {/* Per */}
                  <div className="col-span-1 border-r border-black p-2 text-center">SQFT</div>

                  {/* Amount */}
                  <div className="col-span-2 p-0 flex flex-col justify-between">
                    <div className="p-2 text-right font-mono font-bold">
                      {modalData.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="border-t border-black p-2 text-right font-mono text-[10px] space-y-1">
                      <div>{modalData.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="font-bold">{modalData.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="font-bold">{modalData.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>

                {/* Total Row */}
                <div className="grid grid-cols-12 border-t-[1.5px] border-black font-bold p-1 bg-slate-50">
                  <div className="col-span-8 border-r border-black text-right pr-2">Total</div>
                  <div className="col-span-1 border-r border-black text-right pr-1">{modalData.totalQty}</div>
                  <div className="col-span-1 border-r border-black text-center">-</div>
                  <div className="col-span-2 text-right pr-1 font-bold text-xs font-mono">
                    ₹{modalData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="p-2 border-b-[1.5px] border-black flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-slate-600 block">Amount Chargeable (in words):</span>
                  <span className="font-bold">{numberToIndianWords(modalData.grandTotal)}</span>
                </div>
                <div className="italic text-[10px] text-slate-500">E. & O.E</div>
              </div>

              {/* Bank Details Footer */}
              <div className="grid grid-cols-2 text-[10px] p-2 bg-slate-50/50">
                <div className="border-r border-black pr-2 space-y-1">
                  <div className="font-bold">Payment Note:</div>
                  <div>All payments should be made by cheque or draft, account payee only in favor of Buoyant Media.</div>
                </div>
                <div className="pl-3 space-y-0.5">
                  <div><span className="font-bold">BANK</span> : THE FEDERAL BANK LTD</div>
                  <div><span className="font-bold">A/C NO</span> : 18020200001046</div>
                  <div><span className="font-bold">IFSC CODE</span> : FDRL0001802 (SAIBABA COLONY)</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                disabled={isModalDownloading}
                onClick={async () => {
                  setIsModalDownloading(true);
                  try {
                    await downloadInvoicePdf(modalData.idForDownload, `Invoice-${modalData.invoiceNumber}.pdf`);
                  } finally {
                    setIsModalDownloading(false);
                  }
                }}
                leftIcon={
                  isModalDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )
                }
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isModalDownloading ? 'Generating Official PDF...' : 'Download PDF Document (.pdf)'}
              </Button>
              <Button variant="outline" size="md" onClick={() => setSelectedBillOrInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
