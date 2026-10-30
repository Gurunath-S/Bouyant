import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companyService } from '../../../services/companies/companyService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Company, Exhibition } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import { TablePagination } from '../../../components/ui/TablePagination';
import { formatDisplayDate } from '../../../utils/date';
import { EventSelectorDropdown } from '../../../components/ui/EventSelectorDropdown';
import {
  Building2,
  Search,
  Filter,
  CalendarPlus,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  AlertCircle,
  X,
  Phone,
  Mail,
  User,
  Globe,
  CalendarOff,
} from 'lucide-react';

export const AdminCompaniesPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [summary, setSummary] = useState({
    paidCount: 0,
    notPaidCount: 0,
    pendingGstCount: 0,
    totalCount: 0,
  });
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filtering criteria initialized from query params
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>(searchParams.get('exhibitionId') || '');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAID' | 'NOT_PAID'>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Race condition protection
  const companiesReqIdRef = useRef(0);

  useEffect(() => {
    exhibitionService.getExhibitions().then((allExhibitions: Exhibition[]) => {
      setExhibitions(allExhibitions || []);
      const paramExId = searchParams.get('exhibitionId');
      if (paramExId) {
        setSelectedExhibitionId(paramExId);
      }
      // Note: Default to "" (All Exhibitions) if no query param is passed,
      // ensuring all platform exhibitors are displayed initially.
    });
  }, []);

  const fetchCompanies = useCallback(async () => {
    const reqId = ++companiesReqIdRef.current;
    try {
      setLoading(true);
      const res: any = await companyService.listCompanies(
        currentPage,
        search.trim(),
        selectedExhibitionId || undefined,
        undefined,
        pageSize,
        activeTab !== 'ALL' ? activeTab : undefined
      );

      if (reqId === companiesReqIdRef.current) {
        setCompanies(res.data || []);
        setTotalCompanies(res.meta?.total || 0);
        if (res.meta?.summary) {
          setSummary(res.meta.summary);
        }
      }
    } catch (err) {
      if (reqId === companiesReqIdRef.current) {
        console.error('Failed to load companies:', err);
        setCompanies([]);
        setTotalCompanies(0);
      }
    } finally {
      if (reqId === companiesReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize, search, selectedExhibitionId, activeTab]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedExhibitionId, activeTab]);

  // Metrics from server-side summary aggregation
  const totalCount = summary.totalCount;
  const paidCount = summary.paidCount;
  const notPaidCount = summary.notPaidCount;

  const getStatusBadge = (status?: string) => {
    return <BookingStatusBadge status={status || 'CONFIRMED'} />;
  };

  const getBookingPaymentBadge = (
    paymentStatus?: string,
    paidAmount?: number | string,
    grandTotal?: number | string
  ) => {
    const paid = Number(paidAmount || 0);
    const total = Number(grandTotal || 0);
    let effectiveStatus = paymentStatus;
    if (!effectiveStatus) {
      if (total > 0 && paid >= total) effectiveStatus = 'PAID_FULL';
      else if (paid > 0) effectiveStatus = 'PARTIALLY_PAID';
      else effectiveStatus = 'UNPAID';
    }
    return <PaymentStatusBadge status={effectiveStatus} />;
  };

  const getCustomerStatusBadge = (companyBookings?: any[]) => {
    if (!companyBookings || companyBookings.length === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          No Bookings
        </span>
      );
    }

    const hasPaidFull = companyBookings.some(
      (b) =>
        b.paymentStatus === 'PAID_FULL' ||
        b.paymentStatus === 'PAID' ||
        (Number(b.grandTotal || 0) > 0 && Number(b.paidAmount || 0) >= Number(b.grandTotal || 0)) ||
        (b.status === 'CONFIRMED' && Number(b.paidAmount || 0) > 0 && b.paymentStatus !== 'PARTIALLY_PAID')
    );

    if (hasPaidFull) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 whitespace-nowrap">
          Paid
        </span>
      );
    }

    const hasPartial = companyBookings.some(
      (b) =>
        b.paymentStatus === 'PARTIALLY_PAID' ||
        Number(b.paidAmount || 0) > 0
    );

    if (hasPartial) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 whitespace-nowrap">
          Partially Paid
        </span>
      );
    }

    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 whitespace-nowrap">
        Payment Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Exhibitor Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse exhibitor corporate profiles, filter by registered exhibitions, track stall reservations, and view financial payment history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/workspace/events/register">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarPlus className="w-4 h-4 text-purple-600" />}
              className="border-purple-200 hover:border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Register New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar: Exhibition Selector, Search & Status Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>All Exhibitors</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ml-1 ${
                  activeTab === 'ALL'
                    ? 'bg-purple-700 text-purple-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paid Exhibitors</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ml-1 ${
                  activeTab === 'PAID'
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {paidCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('NOT_PAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'NOT_PAID'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Not Paid Exhibitors</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ml-1 ${
                  activeTab === 'NOT_PAID'
                    ? 'bg-amber-700 text-amber-100'
                    : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                }`}
              >
                {notPaidCount}
              </span>
            </button>
          </div>

          {/* Exhibition Dropdown & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Exhibition Filter Dropdown */}
            <EventSelectorDropdown
              events={exhibitions}
              selectedEventId={selectedExhibitionId || 'ALL'}
              onSelectEvent={(eventId) => setSelectedExhibitionId(eventId === 'ALL' ? '' : eventId)}
              allowAllOption={true}
              allOptionLabel={`All Exhibitions (${exhibitions.length})`}
              align="left"
              className="w-full sm:w-auto"
              buttonClassName="w-full sm:min-w-[280px]"
            />

            {/* Search Input */}
            <div className="w-full sm:w-80 md:w-96 lg:w-[400px] shrink-0">
              <Input
                placeholder="Search company, contact, GST, stall..."
                title="Search company, contact, GST, stall..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                rightIcon={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null
                }
                className="py-2 text-xs sm:text-[13px] placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Selected Event Context Banner */}
        {selectedExhibitionId && selectedExhibitionId !== 'ALL' ? (
          (() => {
            const currentExpo = exhibitions.find((e) => e.id === selectedExhibitionId);
            if (!currentExpo) return null;
            return (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Event Context:</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {currentExpo.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                        {currentExpo.venue || 'Convention Center'}, {currentExpo.city}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                        {formatDisplayDate(currentExpo.startDate)} – {formatDisplayDate(currentExpo.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
                    {totalCompanies} Exhibitors Registered
                  </span>
                  <button
                    onClick={() => setSelectedExhibitionId('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title="View All Events"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Showing <strong>{companies.length}</strong> of{' '}
                <strong>{totalCompanies}</strong> exhibitors across all historical trade fairs.
              </span>
            </div>
            {(activeTab !== 'ALL' || search) && (
              <button
                onClick={() => {
                  setSelectedExhibitionId('');
                  setActiveTab('ALL');
                  setSearch('');
                }}
                className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exhibitors Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="w-12 py-3.5 px-3 text-center">S.No</th>
                <th className="py-3.5 px-4 min-w-[220px]">Corporate Entity Name</th>
                <th className="py-3.5 px-4 min-w-[150px]">Contact Person</th>
                <th className="py-3.5 px-4 min-w-[180px]">Contact Info & Tax ID</th>
                <th className="py-3.5 px-4 min-w-[340px]">Registered Event(s) & Stalls</th>
                <th className="py-3.5 px-4 text-center min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading exhibitors and event bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No exhibitors match the selected filter criteria.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try clearing your search query or selecting "All Exhibitions".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((c, idx) => {
                  const companyBookings = c.bookings || [];
                  const isRegistered = companyBookings.length > 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* S.No */}
                      <td className="w-12 py-4 px-3 text-center align-top font-mono font-bold text-slate-400 text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Entity Name & Code */}
                      <td className="py-4 px-4 align-top space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/workspace/companies/${c.id}`}
                            className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-purple-600 dark:hover:text-purple-400 transition-colors leading-snug break-words"
                          >
                            {c.name}
                          </Link>
                          {getCustomerStatusBadge(companyBookings)}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/workspace/companies/${c.id}`}
                            className="font-mono text-[10px] text-slate-600 dark:text-slate-400 hover:text-purple-600 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-1.5 py-0.5 rounded transition-colors"
                            title="Company Code"
                          >
                            {c.companyCode}
                          </Link>
                          {c.regNo && (
                            <span
                              className="font-mono text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-900/40 px-1.5 py-0.5 rounded font-semibold"
                              title="Registration Number"
                            >
                              Reg: {c.regNo}
                            </span>
                          )}
                          {c.spcode && (
                            <span
                              className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 px-1.5 py-0.5 rounded font-medium"
                              title="Salesperson Code"
                            >
                              SP: {c.spcode}
                            </span>
                          )}
                        </div>
                        {c.website && (
                          <div>
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium hover:underline"
                            >
                              <Globe className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="py-4 px-4 align-top space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.contactPerson || '—'}</span>
                        </div>
                        {c.designation && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">{c.designation}</div>
                        )}
                        <div className="pl-5 pt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {c.industry || 'General Industry'}
                          </span>
                        </div>
                      </td>

                      {/* Contact Info & Tax ID */}
                      <td className="py-4 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.mobile || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 break-all">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</span>
                        </div>
                        {c.gstNumber && (
                          <div className="pt-0.5">
                            <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded inline-block">
                              GSTIN: {c.gstNumber}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Registered Event(s) & Stalls */}
                      <td className="py-4 px-4 align-top min-w-[340px]">
                        {isRegistered ? (
                          <div className="space-y-2">
                            {/* Primary / Latest Booking Card */}
                            {(() => {
                              const b = companyBookings[0];
                              const stallsList =
                                b.stalls?.map((s) => s.stall?.stallNumber).filter(Boolean) || [];

                              return (
                                <div
                                  key={b.id}
                                  className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs space-y-2 shadow-2xs"
                                >
                                  {/* Exhibition Title & Status */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1.5 min-w-0">
                                      <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                      <div className="min-w-0">
                                        <span className="break-words font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                                          {b.exhibition?.title || 'Exhibition Event'}
                                        </span>
                                        {b.exhibition?.edition && (
                                          <span className="ml-1.5 font-mono text-[9px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded font-bold uppercase inline-block align-middle">
                                            Ed. {b.exhibition.edition}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {getStatusBadge(b.status)}
                                      {getBookingPaymentBadge(b.paymentStatus, b.paidAmount, b.grandTotal)}
                                    </div>
                                  </div>

                                  {/* Venue & City */}
                                  {(b.exhibition?.city || b.exhibition?.venue) && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span>{[b.exhibition.city, b.exhibition.venue].filter(Boolean).join(' • ')}</span>
                                    </div>
                                  )}

                                  {/* Stalls Allocated & Value */}
                                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 gap-2 flex-wrap pt-1.5 border-t border-purple-100/80 dark:border-purple-900/30">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Stalls:</span>
                                      {stallsList.length > 0 ? (
                                        stallsList.map((sn) => (
                                          <span
                                            key={sn}
                                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-[10px]"
                                          >
                                            {sn}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 italic text-[10px]">Unallocated</span>
                                      )}
                                    </div>

                                    {b.grandTotal && (
                                      <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs shrink-0">
                                        ₹{Number(b.grandTotal).toLocaleString()} INR
                                      </span>
                                    )}
                                  </div>

                                  {/* Booking Reference & Balance Due */}
                                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                                    <span>
                                      Ref: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{b.bookingReference}</strong>
                                    </span>
                                    {b.balanceAmount && Number(b.balanceAmount) > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold font-sans">
                                        Due: ₹{Number(b.balanceAmount).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Multi-event indicator pill for repeat exhibitors */}
                            {companyBookings.length > 1 && (
                              <Link
                                to={`/workspace/companies/${c.id}`}
                                className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/50 border border-slate-200 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-800 text-[11px] font-bold text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                                title={`Click to view all ${companyBookings.length} event registrations for ${c.name}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>
                                    {(() => {
                                      const uniqueEvents = new Set(
                                        companyBookings.map((bk) => bk.exhibition?.id).filter(Boolean)
                                      ).size;
                                      if (uniqueEvents > 1) {
                                        return `+${uniqueEvents - 1} more event${uniqueEvents - 1 > 1 ? 's' : ''} attended`;
                                      }
                                      return `+${companyBookings.length - 1} more booking${companyBookings.length - 1 > 1 ? 's' : ''}`;
                                    })()}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 group-hover:underline">
                                  <span>View History ({companyBookings.length})</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs">
                            <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">No Event Registrations</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-center">
                        <div className="flex items-center justify-center">
                          <Link
                            to={`/workspace/companies/${c.id}`}
                            title="View Complete Event Registration History & Company Profile"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-950/50 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>View Profile</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={totalCompanies}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="exhibitors"
        />
      </div>



    </div>
  );
};
