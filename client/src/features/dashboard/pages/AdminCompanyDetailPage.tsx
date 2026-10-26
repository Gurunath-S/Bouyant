import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { companyService } from '../../../services/companies/companyService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Company, Exhibition, Booking } from '../../../types';
import { normalizeCountryName } from '../../../data/indianStatesCities';
import { BackButton } from '../../../components/ui/BackButton';
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Layers,
  Search,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  User,
  CalendarPlus,
  RefreshCw,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { TablePagination } from '../../../components/ui/TablePagination';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';

export const AdminCompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search for bookings
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID_FULL' | 'PARTIALLY_PAID' | 'UNPAID'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'VALUE_HIGH'>('NEWEST');

  // Pagination for bookings
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expandable row & Payment modal
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [inspectingBookingPayment, setInspectingBookingPayment] = useState<Booking | null>(null);

  // Event registration modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [targetExhibitionId, setTargetExhibitionId] = useState('');

  const fetchCompanyData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [compRes, expoRes] = await Promise.all([
        companyService.getCompanyById(id),
        exhibitionService.getExhibitions(),
      ]);
      setCompany(compRes);
      setExhibitions(expoRes || []);
      if (expoRes && expoRes.length > 0) {
        setTargetExhibitionId(expoRes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load company details:', err);
      setError(err?.response?.data?.message || 'Failed to load exhibitor company profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const allBookings = useMemo(() => {
    return company?.bookings || [];
  }, [company]);

  // Overall financial and event metrics
  const metrics = useMemo(() => {
    const totalEvents = allBookings.length;
    const confirmedEvents = allBookings.filter((b) => b.status === 'CONFIRMED').length;
    const totalStalls = allBookings.reduce((acc, b) => acc + (b.stalls?.length || 0), 0);
    const totalContractValue = allBookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((acc, b) => acc + Number(b.grandTotal || 0), 0);
    const totalPaid = allBookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((acc, b) => acc + Number(b.paidAmount || 0), 0);
    const totalBalance = Math.max(0, totalContractValue - totalPaid);
    const fulfillmentRate = totalContractValue > 0 ? Math.round((totalPaid / totalContractValue) * 100) : 0;

    return {
      totalEvents,
      confirmedEvents,
      totalStalls,
      totalContractValue,
      totalPaid,
      totalBalance,
      fulfillmentRate,
    };
  }, [allBookings]);

  // Live Counts for Status Tabs
  const statusFilterCounts = useMemo(() => {
    const confirmed = allBookings.filter((b) => b.status === 'CONFIRMED').length;
    const pending = allBookings.filter((b) => b.status === 'PENDING_PAYMENT').length;
    const cancelled = allBookings.filter((b) => b.status === 'CANCELLED').length;
    return { confirmed, pending, cancelled, total: allBookings.length };
  }, [allBookings]);

  // Live Counts for Payment Tabs
  const paymentFilterCounts = useMemo(() => {
    let paid = 0;
    let partial = 0;
    let unpaid = 0;
    for (const b of allBookings) {
      const p = Number(b.paidAmount || 0);
      const t = Number(b.grandTotal || 0);
      if (
        b.paymentStatus === 'PAID_FULL' ||
        b.paymentStatus === 'PAID' ||
        (t > 0 && p >= t) ||
        (b.status === 'CONFIRMED' && p > 0 && b.paymentStatus !== 'PARTIALLY_PAID')
      ) {
        paid++;
      } else if (b.paymentStatus === 'PARTIALLY_PAID' || (p > 0 && p < t)) {
        partial++;
      } else {
        unpaid++;
      }
    }
    return { paid, partial, unpaid, total: allBookings.length };
  }, [allBookings]);

  // Filtered & sorted bookings
  const filteredBookings = useMemo(() => {
    return allBookings
      .filter((b: any) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = b.exhibition?.title?.toLowerCase() || '';
          const city = b.exhibition?.city?.toLowerCase() || '';
          const ref = b.bookingReference?.toLowerCase() || '';
          const hasStall = b.stalls?.some((s: any) =>
            s.stall?.stallNumber?.toLowerCase().includes(q)
          );
          if (!title.includes(q) && !city.includes(q) && !ref.includes(q) && !hasStall) {
            return false;
          }
        }

        // Booking status
        if (statusFilter !== 'ALL' && b.status !== statusFilter) {
          return false;
        }

        // Payment status
        if (paymentFilter !== 'ALL') {
          if (paymentFilter === 'PAID_FULL') {
            const isFull =
              b.paymentStatus === 'PAID_FULL' ||
              b.paymentStatus === 'PAID' ||
              (Number(b.grandTotal || 0) > 0 && Number(b.paidAmount || 0) >= Number(b.grandTotal || 0)) ||
              (b.status === 'CONFIRMED' && Number(b.paidAmount || 0) > 0 && b.paymentStatus !== 'PARTIALLY_PAID');
            if (!isFull) return false;
          } else if (paymentFilter === 'PARTIALLY_PAID') {
            const isPartial =
              b.paymentStatus === 'PARTIALLY_PAID' ||
              (Number(b.paidAmount || 0) > 0 && Number(b.paidAmount || 0) < Number(b.grandTotal || 0));
            if (!isPartial) return false;
          } else if (paymentFilter === 'UNPAID') {
            const isUnpaid =
              b.paymentStatus === 'UNPAID' ||
              Number(b.paidAmount || 0) === 0;
            if (!isUnpaid) return false;
          }
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'VALUE_HIGH') {
          return Number(b.grandTotal || 0) - Number(a.grandTotal || 0);
        }
        return 0;
      });
  }, [allBookings, searchQuery, statusFilter, paymentFilter, sortBy]);

  // Paginated slice
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Reset page when filter changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, paymentFilter, sortBy]);

  const formatDisplayDate = (d?: string | Date) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const getCustomerOverallStatusBadge = () => {
    if (allBookings.length === 0) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          No Bookings
        </span>
      );
    }
    const hasPaidFull = allBookings.some(
      (b) =>
        b.paymentStatus === 'PAID_FULL' ||
        b.paymentStatus === 'PAID' ||
        (Number(b.grandTotal || 0) > 0 && Number(b.paidAmount || 0) >= Number(b.grandTotal || 0)) ||
        (b.status === 'CONFIRMED' && Number(b.paidAmount || 0) > 0 && b.paymentStatus !== 'PARTIALLY_PAID')
    );
    if (hasPaidFull) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Paid Full
        </span>
      );
    }
    const hasPartial = allBookings.some(
      (b) => b.paymentStatus === 'PARTIALLY_PAID' || Number(b.paidAmount || 0) > 0
    );
    if (hasPartial) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Payment Pending
      </span>
    );
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Payment
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status || 'Active'}
          </span>
        );
    }
  };

  const getBookingPaymentBadge = (
    paymentStatus?: string,
    paidAmount?: number | string,
    grandTotal?: number | string,
    bookingStatus?: string
  ) => {
    const paid = Number(paidAmount || 0);
    const total = Number(grandTotal || 0);

    if (
      paymentStatus === 'PAID_FULL' ||
      paymentStatus === 'PAID' ||
      (total > 0 && paid >= total) ||
      (bookingStatus === 'CONFIRMED' && paid > 0 && paymentStatus !== 'PARTIALLY_PAID')
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid Full
        </span>
      );
    }

    if (paymentStatus === 'PARTIALLY_PAID' || paid > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3 text-blue-600" /> Partially Paid
        </span>
      );
    }

    if (paymentStatus === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Refunded
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-3 h-3 text-amber-600" /> Unpaid
      </span>
    );
  };

  const handleRegisterCompanyToEvent = () => {
    if (!company || !targetExhibitionId) return;
    const targetExpo = exhibitions.find((e) => e.id === targetExhibitionId);
    if (!targetExpo) return;
    navigate(`/exhibitions/${targetExpo.slug}/book`, {
      state: {
        from: `/workspace/companies/${id}`,
        fromLabel: `Company ${company.name}`,
        preselectedCompany: company,
        preselectedCompanyId: company.id,
        adminBooking: true,
      },
    });
  };

  const toggleExpandBooking = (bookingId: string) => {
    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading exhibitor profile & registration history...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Exhibitor Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'The requested company record does not exist.'}</p>
        <div className="flex justify-center">
          <BackButton to="/workspace/companies" label="Back to Exhibitors Directory" variant="outline" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Page Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BackButton to="/workspace/companies" label="Exhibitors Directory" variant="ghost" size="xs" />
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
            {company.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            leftIcon={<CalendarPlus className="w-4 h-4" />}
            className="text-xs"
          >
            Register for Event
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {company.name}
                </h1>
                {getCustomerOverallStatusBadge()}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {company.companyCode}
                </span>
                {company.regNo && (
                  <span className="font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[11px] font-bold">
                    Reg: {company.regNo}
                  </span>
                )}
                {company.spcode && (
                  <span className="font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px]">
                    SP: {company.spcode}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                  {company.industry || 'General Industry'}
                </span>
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:underline font-bold"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lifetime Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Events Attended */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Events Attended
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                {metrics.totalEvents}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                {metrics.confirmedEvents} Confirmed
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Stalls Booked */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Stalls Booked
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                {metrics.totalStalls}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Across all editions
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Contract Value */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Contract Value
              </span>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                ₹{metrics.totalContractValue.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Lifetime Booking Total
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Fulfillment Rate */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Fulfillment
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                {metrics.fulfillmentRate}%
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-0.5">
                Paid: ₹{metrics.totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details & Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Person Details */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Primary Contact
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Authorized Representative</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {company.contactPerson}
              </span>
              {company.designation && (
                <span className="text-[11px] text-slate-500 block">{company.designation}</span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1 text-slate-600 dark:text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <a href={`mailto:${company.email}`} className="hover:text-purple-600 hover:underline">
                {company.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{company.mobile}</span>
            </div>
          </div>
        </div>

        {/* Statutory & Tax Info */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Tax & Compliance
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">GSTIN</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {company.gstNumber || 'Pending / Unset'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">PAN</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {company.panNumber || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">TAN</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {company.tanNumber || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Sales Person Code</span>
              <span className="font-mono text-purple-600 font-bold">
                {company.spcode || 'B001'}
              </span>
            </div>
          </div>
        </div>

        {/* Corporate Address */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Registered Office
            </h3>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="line-clamp-2">{company.address || 'Address not provided'}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {company.city}, {company.state} - {company.pinCode}
            </p>
            <p className="text-[11px] text-slate-400">{normalizeCountryName(company.country || 'India')}</p>
          </div>
        </div>
      </div>

      {/* Event Registration & Booking History Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Event Registration & Booking History</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {filteredBookings.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete historical record of exhibitions, stall allocations, and payments for this exhibitor.
            </p>
          </div>

          {/* Quick Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="NEWEST">Newest Bookings First</option>
              <option value="OLDEST">Oldest Bookings First</option>
              <option value="VALUE_HIGH">Highest Contract Value</option>
            </select>
          </div>
        </div>

        {/* Filter Toolbar: Search, Status Tabs & Payment Tabs */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs with Live Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Statuses ({statusFilterCounts.total})
            </button>
            <button
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Confirmed ({statusFilterCounts.confirmed})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_PAYMENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'PENDING_PAYMENT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              Pending Payment ({statusFilterCounts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              Cancelled ({statusFilterCounts.cancelled})
            </button>
          </div>

          {/* Payment Status Tabs with Live Counts & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setPaymentFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paymentFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-purple-600 dark:text-purple-300 font-bold'
                    : 'text-slate-500'
                }`}
              >
                All Pay ({paymentFilterCounts.total})
              </button>
              <button
                onClick={() => setPaymentFilter('PAID_FULL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paymentFilter === 'PAID_FULL'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-emerald-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Paid ({paymentFilterCounts.paid})
              </button>
              <button
                onClick={() => setPaymentFilter('PARTIALLY_PAID')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paymentFilter === 'PARTIALLY_PAID'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-blue-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Partial ({paymentFilterCounts.partial})
              </button>
              <button
                onClick={() => setPaymentFilter('UNPAID')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paymentFilter === 'UNPAID'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-amber-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Unpaid ({paymentFilterCounts.unpaid})
              </button>
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Search event, stall, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="py-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Exhibition Event</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment & Invoices</th>
                <th className="py-3 px-4">Stalls Allocated</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4">Booking Reference</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allBookings.length === 0 ? (
                /* Empty state when the company truly has no registrations */
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          No Exhibition Registrations Found
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          "{company.name}" has not registered or booked any stalls for exhibitions on the platform yet.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="gap-1.5 text-xs mx-auto"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Register for an Exhibition Now</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : paginatedBookings.length === 0 ? (
                /* Empty state when active filter returns 0 matches */
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        No event registrations match the active filter criteria.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try clearing search terms or resetting filters.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setStatusFilter('ALL');
                            setPaymentFilter('ALL');
                            setSearchQuery('');
                          }}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 underline cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b: any, idx: number) => {
                  const stallsList =
                    b.stalls?.map((s: any) => s.stall?.stallNumber).filter(Boolean) || [];
                  const isExpanded = expandedBookingId === b.id;
                  const paymentsCount = b.payments?.length || 0;
                  const invoicesCount = b.invoices?.length || 0;

                  return (
                    <React.Fragment key={b.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>

                        {/* Event Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate max-w-[200px]" title={b.exhibition?.title}>
                              {b.exhibition?.title || 'Exhibition'}
                            </span>
                            {b.exhibition?.edition && (
                              <span className="font-mono text-[10px] px-1 bg-purple-100 dark:bg-purple-950 rounded font-semibold shrink-0">
                                Ed. {b.exhibition.edition}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{b.exhibition?.city} • {b.exhibition?.venue}</span>
                            <span>•</span>
                            <span>{formatDisplayDate(b.exhibition?.startDate)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(b.status)}
                        </td>

                        {/* Payment Details Column */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div>
                            {getBookingPaymentBadge(b.paymentStatus, b.paidAmount, b.grandTotal, b.status)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-bold">
                            ₹{Number(b.paidAmount || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ ₹{Number(b.grandTotal || 0).toLocaleString()}</span>
                          </div>

                          {/* Quick clickable transactions breakdown toggle */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleExpandBooking(b.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Toggle payment breakdown"
                            >
                              <Receipt className="w-2.5 h-2.5" />
                              <span>{paymentsCount} Payment{paymentsCount === 1 ? '' : 's'}</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                            {invoicesCount > 0 && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {invoicesCount} Inv
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Stalls */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {stallsList.length > 0 ? (
                              stallsList.map((sn: string) => (
                                <span
                                  key={sn}
                                  className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 font-mono font-bold text-purple-800 dark:text-purple-300 text-[10px]"
                                >
                                  {sn}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">Unallocated</span>
                            )}
                          </div>
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                            ₹{Number(b.grandTotal || 0).toLocaleString()}
                          </div>
                          {Number(b.balanceAmount || 0) > 0 && (
                            <div className="text-[10px] text-amber-600 font-mono font-bold">
                              Due: ₹{Number(b.balanceAmount || 0).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Reference & Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {b.bookingReference}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Booked: {formatDisplayDate(b.createdAt)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectingBookingPayment(b)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                              title="View Full Payment Records & Receipts"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>

                            {b.exhibition?.slug && (
                              <Link
                                to={`/exhibitions/${b.exhibition.slug}`}
                                target="_blank"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border border-slate-200 transition-colors inline-flex items-center justify-center"
                                title="View Public Exhibition Portal"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Drawer: Inline Payment Records & Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-y border-purple-200/60 dark:border-purple-900/60">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="space-y-4 max-w-5xl mx-auto">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                <div className="flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-purple-600" />
                                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                    Payment Transactions & Invoices for {b.bookingReference}
                                  </h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleExpandBooking(b.id)}
                                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  Close Details ▲
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Transactions List */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Payment Transactions ({b.payments?.length || 0})
                                  </span>
                                  {!b.payments || b.payments.length === 0 ? (
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center">
                                      No payment transaction records logged yet.
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {b.payments.map((p: any) => (
                                        <div
                                          key={p.id}
                                          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                              {p.paymentReference}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                p.status === 'SUCCESS'
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : p.status === 'PENDING'
                                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                              }`}
                                            >
                                              {p.status === 'SUCCESS' ? 'Success' : p.status === 'PENDING' ? 'Pending' : p.status === 'FAILED' ? 'Failed' : p.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                            <span>
                                              Method: <strong className="text-slate-700 dark:text-slate-300">{p.paymentMethod || p.provider || 'ONLINE'}</strong>
                                            </span>
                                            <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                                              ₹{Number(p.amount || 0).toLocaleString()} {p.currency || 'INR'}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-1 mt-1">
                                            <span>Txn ID: {p.transactionId || 'N/A'}</span>
                                            <span>{formatDisplayDate(p.paidAt || p.createdAt)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Invoices & Stalls Breakdown */}
                                <div className="space-y-3">
                                  {/* Invoices */}
                                  <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                      Issued Tax Invoices ({b.invoices?.length || 0})
                                    </span>
                                    {!b.invoices || b.invoices.length === 0 ? (
                                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center">
                                        No invoices generated for this booking yet.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {b.invoices.map((inv: any) => (
                                          <div
                                            key={inv.id}
                                            className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between shadow-2xs"
                                          >
                                            <div>
                                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                                                {inv.invoiceNumber}
                                              </span>
                                              <span className="text-[10px] text-slate-400">
                                                Issued: {formatDisplayDate(inv.issueDate || inv.createdAt)}
                                              </span>
                                            </div>
                                            <div className="text-right">
                                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                                                ₹{Number(inv.grandTotal || 0).toLocaleString()}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => downloadInvoicePdf(inv.id || inv.invoiceNumber, `Invoice-${inv.invoiceNumber || 'bill'}.pdf`)}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline mt-0.5"
                                              >
                                                <Download className="w-2.5 h-2.5" />
                                                <span>Download PDF</span>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Stall Allocation Details */}
                                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider block">
                                      Allocated Stall Specifications
                                    </span>
                                    {b.stalls && b.stalls.length > 0 ? (
                                      <div className="space-y-1">
                                        {b.stalls.map((bs: any) => (
                                          <div
                                            key={bs.id || bs.stall?.id}
                                            className="flex items-center justify-between text-[11px]"
                                          >
                                            <span className="font-mono font-bold text-purple-800 dark:text-purple-300">
                                              Stall #{bs.stall?.stallNumber || 'N/A'} ({bs.stall?.category || 'STANDARD'})
                                            </span>
                                            <span className="text-slate-500 font-mono">
                                              {bs.stall?.areaSqFt ? `${bs.stall.areaSqFt} sq.ft` : ''} • ₹{Number(bs.price || bs.stall?.price || 0).toLocaleString()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-slate-400 italic text-[11px]">No specific stalls linked.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Numbered Pagination */}
        {filteredBookings.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredBookings.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="events"
          />
        )}
      </div>

      {/* Modal: Comprehensive Payment & Invoices Record */}
      {inspectingBookingPayment && (
        <Modal
          isOpen={!!inspectingBookingPayment}
          onClose={() => setInspectingBookingPayment(null)}
          title={`Payment & Invoices: ${inspectingBookingPayment.bookingReference}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Header / Event Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                  {inspectingBookingPayment.exhibition?.title || 'Exhibition Event'}
                </h4>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{inspectingBookingPayment.exhibition?.city} • {inspectingBookingPayment.exhibition?.venue}</span>
                </div>
              </div>
              <div className="text-right">
                {getBookingPaymentBadge(
                  inspectingBookingPayment.paymentStatus,
                  inspectingBookingPayment.paidAmount,
                  inspectingBookingPayment.grandTotal,
                  inspectingBookingPayment.status
                )}
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                  {inspectingBookingPayment.bookingReference}
                </span>
              </div>
            </div>

            {/* Financial Summary KPIs */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contract Total</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">
                  ₹{Number(inspectingBookingPayment.grandTotal || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Total Paid</span>
                <span className="font-mono font-black text-sm text-emerald-800 dark:text-emerald-200 mt-0.5 block">
                  ₹{Number(inspectingBookingPayment.paidAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">Balance Due</span>
                <span className="font-mono font-black text-sm text-amber-800 dark:text-amber-200 mt-0.5 block">
                  ₹{Number(inspectingBookingPayment.balanceAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Transactions List */}
            <div className="space-y-2">
              <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Transaction Receipts ({inspectingBookingPayment.payments?.length || 0})</span>
              </h5>

              {!inspectingBookingPayment.payments || inspectingBookingPayment.payments.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                  No payment transactions logged for this booking yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {inspectingBookingPayment.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {p.paymentReference}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Provider: {p.provider || 'GATEWAY'} • Method: {p.paymentMethod || 'ONLINE'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Txn: {p.transactionId || 'N/A'} • {formatDisplayDate(p.paidAt || p.createdAt)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          ₹{Number(p.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices List */}
            <div className="space-y-2">
              <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Issued Invoices ({inspectingBookingPayment.invoices?.length || 0})</span>
              </h5>

              {!inspectingBookingPayment.invoices || inspectingBookingPayment.invoices.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                  No tax invoices issued yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {inspectingBookingPayment.invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Date: {formatDisplayDate(inv.issueDate || inv.createdAt)} • Status: {inv.status === 'ISSUED' ? 'PAID' : (inv.status || 'PAID')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                          ₹{Number(inv.grandTotal || 0).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadInvoicePdf(inv.id || inv.invoiceNumber, `Invoice-${inv.invoiceNumber || 'bill'}.pdf`)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setInspectingBookingPayment(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Register New Event Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title={`Register ${company.name} to an Exhibition`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select an active upcoming exhibition to initiate stall reservation on behalf of this company.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Exhibition Event
            </label>
            <select
              value={targetExhibitionId}
              onChange={(e) => setTargetExhibitionId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {exhibitions.map((expo) => (
                <option key={expo.id} value={expo.id}>
                  {expo.title} ({expo.city})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegisterCompanyToEvent}
              leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
            >
              Proceed to Booking Wizard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
