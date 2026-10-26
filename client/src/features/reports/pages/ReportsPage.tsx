import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { reportService } from '../../../services/reports/reportService';
import {
  ReportOverviewData,
  OccupancyReportData,
  Exhibition,
  ReportFilters,
} from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { formatDisplayDate } from '../../../utils/date';
import { BookingStatusBadge, PaymentStatusBadge } from '../../../components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  BookmarkCheck,
  Layers,
  Building,
  Calendar,
  PieChart,
  RefreshCw,
  Filter,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

type ReportTab = 'overview' | 'stalls';
type DatePreset = 'ALL' | '7D' | '30D' | 'MONTH' | 'CUSTOM';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role;

  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';

  const [searchParams, setSearchParams] = useSearchParams();

  // Active Navigation Tab
  const rawTab = searchParams.get('tab');
  const activeTab: ReportTab = rawTab === 'stalls' ? 'stalls' : 'overview';

  // Filters State
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>(
    searchParams.get('exhibitionId') || 'ALL'
  );
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get('datePreset') as DatePreset) || 'ALL'
  );
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(
    searchParams.get('paymentStatus') || 'ALL'
  );

  // Data States
  const [overview, setOverview] = useState<ReportOverviewData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyReportData | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exhibitionsReport, setExhibitionsReport] = useState<any[]>([]);

  // Loading & Request Race Guard
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // 1. Sync Filters to URL Query Parameters
  const syncUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === 'ALL' || val === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Handle Tab Change
  const handleTabChange = (tab: ReportTab) => {
    syncUrlParams({ tab });
  };

  // 2. Load Exhibitions Master List on Mount
  useEffect(() => {
    reportService
      .getExhibitions()
      .then((expos) => {
        setExhibitions(expos || []);
        setExhibitionsReport(expos || []);
      })
      .catch((err) => console.error('Failed to load exhibitions list:', err));
  }, []);

  // 3. Resolve Date Ranges based on Preset
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      syncUrlParams({ datePreset: 'ALL', startDate: null, endDate: null });
    } else if (preset === '7D') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      const s = past.toISOString().split('T')[0];
      const e = today.toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(e);
      syncUrlParams({ datePreset: '7D', startDate: s, endDate: e });
    } else if (preset === '30D') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const s = past.toISOString().split('T')[0];
      const e = today.toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(e);
      syncUrlParams({ datePreset: '30D', startDate: s, endDate: e });
    } else if (preset === 'MONTH') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const e = today.toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(e);
      syncUrlParams({ datePreset: 'MONTH', startDate: s, endDate: e });
    } else if (preset === 'CUSTOM') {
      syncUrlParams({ datePreset: 'CUSTOM' });
    }
  };

  // 4. Fetch Primary Overview & Occupancy Data with Race Condition Prevention
  const loadPrimaryData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setErrorMsg(null);
    setRefreshing(true);

    const filters: ReportFilters = {
      exhibitionId: selectedExhibitionId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: statusFilter,
      paymentStatus: paymentStatusFilter,
    };

    try {
      const [over, occ] = await Promise.all([
        reportService.getOverview(filters),
        reportService.getOccupancy(filters),
      ]);

      if (currentReqId === requestIdRef.current) {
        setOverview(over);
        setOccupancy(occ);
        setLoading(false);
        setRefreshing(false);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        console.error('Failed to load reports overview:', err);
        setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to load report data.');
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedExhibitionId, startDate, endDate, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    loadPrimaryData();
  }, [loadPrimaryData]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedExhibitionId('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    syncUrlParams({
      exhibitionId: null,
      datePreset: null,
      startDate: null,
      endDate: null,
      status: null,
      paymentStatus: null,
    });
  };

  const isEventScoped = selectedExhibitionId !== 'ALL';
  const hasActiveFilters =
    isEventScoped ||
    datePreset !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    statusFilter !== 'ALL' ||
    paymentStatusFilter !== 'ALL';

  // Format Currency
  const fmt = (num?: number) => `₹${Number(num || 0).toLocaleString('en-IN')}`;

  // Page Header Titles
  const getPageTitle = () => {
    if (isSuperAdmin) return 'Platform Executive Reporting Center';
    if (isAdmin) return 'Exhibition Business & Financial Reports';
    if (isStaff) return 'Operational Event Reports & Activity';
    return 'Exhibition Reporting Center';
  };

  const getPageSubtitle = () => {
    if (isSuperAdmin)
      return 'Authoritative platform gross revenues, verified cash collections, outstanding receivables, and occupancy rates.';
    if (isAdmin)
      return 'Event performance, payment collection audit, category sales breakdown, and operational reconciliation.';
    return 'Field operations directory, stall allocation logs, and attributed event schedules.';
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & WORKSPACE BANNER */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg border ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : isAdmin
                  ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {getPageSubtitle()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={loadPrimaryData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PHASE 2: CONSISTENT FILTER AREA */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>Reporting Scope & Parameters</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Exhibition Scope */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
              Exhibition Scope
            </label>
            <select
              value={selectedExhibitionId}
              onChange={(e) => {
                setSelectedExhibitionId(e.target.value);
                syncUrlParams({ exhibitionId: e.target.value });
              }}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Exhibitions & Portfolios (Combined)</option>
              {exhibitions.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.eventCode || 'EX'}-{ex.edition || '01'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Date Range Presets */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
              Time Period
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['ALL', '7D', '30D', 'MONTH'] as DatePreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleDatePresetChange(p)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    datePreset === p
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p === 'ALL' ? 'All Time' : p}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Booking Status Filter */}
          {!isStaff && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                Booking Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  syncUrlParams({ status: e.target.value });
                }}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Booking Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          {/* 4. Payment Status Filter */}
          {!isStaff && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  syncUrlParams({ paymentStatus: e.target.value });
                }}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID_FULL">Fully Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          )}
        </div>

        {/* Custom Date Range Row (Shown when dates are custom) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date Bounds:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
                syncUrlParams({ startDate: e.target.value, datePreset: 'CUSTOM' });
              }}
              className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              placeholder="From Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
                syncUrlParams({ endDate: e.target.value, datePreset: 'CUSTOM' });
              }}
              className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              placeholder="To Date"
            />
          </div>
          {startDate && endDate && (
            <span className="text-[11px] font-mono font-semibold text-purple-600 dark:text-purple-400">
              Active: {startDate} ➔ {endDate}
            </span>
          )}
        </div>
      </div>

      {/* EVENT SCOPE BANNER */}
      {isEventScoped && overview?.exhibition && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide bg-purple-600 text-white shadow-xs">
              {overview.exhibition.status}
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                {overview.exhibition.title} {overview.exhibition.edition ? `(Edition ${overview.exhibition.edition})` : ''}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {overview.exhibition.venue}, {overview.exhibition.city} • Code: {overview.exhibition.eventCode}-{overview.exhibition.edition || '01'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-3 py-1.5 rounded-xl">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>Event-Scoped Business Data Active</span>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORTING TABS NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'stalls', label: 'Stall Inventory & Occupancy', icon: Building },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 rounded-t-lg'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LOADING SKELETON */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Synthesizing authoritative report metrics...
          </p>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* PHASE 3: COMPACT KPI SUMMARY CARDS */}
              {!isStaff ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Booking Value */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Total Booking Value
                      </p>
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                      {fmt(overview?.totalBookingValue)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      Gross active commitments (incl. GST)
                    </span>
                  </div>

                  {/* Actual Payments Received */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actual Payments Received
                      </p>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                      {fmt(overview?.actualPaymentsReceived)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Realized verified cash
                    </span>
                  </div>

                  {/* Outstanding Balance */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Outstanding Balance
                      </p>
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
                      {fmt(overview?.outstandingBalance)}
                    </p>
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-2 block">
                      Pending collection due
                    </span>
                  </div>

                  {/* Stall Occupancy Rate */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stall Occupancy
                      </p>
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        <Building className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-2">
                      {overview?.occupancyRate || 0}%
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 block">
                      {overview?.occupiedStalls || 0} / {overview?.totalStalls || 0} Stalls Reserved
                    </span>
                  </div>
                </div>
              ) : (
                /* STAFF OPERATIONAL KPI CARDS */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Registered Events</p>
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                      {overview?.totalEventsRegistered || 0}
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-600 mt-2 block">
                      Attributed to SP: {user?.spcode || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Expos</p>
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                      {overview?.upcomingEvents || 0}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
                      Active future schedules
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stalls In Scope</p>
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                        <Building className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                      {overview?.totalStallsInRegisteredEvents || 0}
                    </p>
                    <span className="text-[11px] font-semibold text-purple-600 mt-2 block">
                      {overview?.occupancyRate || 0}% Occupied
                    </span>
                  </div>
                </div>
              )}

              {/* SECONDARY ROW: BOOKINGS & ENTITY VOLUMES */}
              {!isStaff && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Confirmed Bookings</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {overview?.confirmedBookings || 0}{' '}
                        <span className="text-xs font-medium text-slate-400">/ {overview?.totalBookings || 0} Total</span>
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                      <BookmarkCheck className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Participating Exhibitors</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {overview?.participatingCompaniesCount || overview?.totalExhibitors || 0}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        {isEventScoped ? 'Event Schedule' : 'Published Exhibitions'}
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {isEventScoped ? 'Active Scope' : `${overview?.publishedExhibitions || 0} Portfolios`}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Invoices Issued</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {overview?.financialSummary?.invoiceMetrics?.invoicesCount || 0} Bills
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* CASH COLLECTION PROGRESS BAR */}
              {!isStaff && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        Revenue Realization & Collection Efficiency
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Verified payments collected vs outstanding receivable balance.
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const total = Number(overview?.totalBookingValue || 0);
                        const paid = Number(overview?.actualPaymentsReceived || 0);
                        const rate = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                        return (
                          <span className="font-mono text-sm font-black text-purple-600 dark:text-purple-400">
                            {rate}% Collected
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const total = Number(overview?.totalBookingValue || 0);
                    const paid = Number(overview?.actualPaymentsReceived || 0);
                    const due = Number(overview?.outstandingBalance || 0);
                    const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                    const duePct = total > 0 ? Math.min(100 - paidPct, (due / total) * 100) : 0;

                    return (
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${paidPct}%` }}
                            title={`Collected: ${fmt(paid)}`}
                          />
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{ width: `${duePct}%` }}
                            title={`Outstanding Due: ${fmt(due)}`}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Collected: {fmt(paid)} ({paidPct.toFixed(1)}%)
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            Outstanding: {fmt(due)} ({duePct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* RECENT BOOKINGS PREVIEW TABLE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      Recent Booking Activity
                    </h3>
                    <p className="text-[11px] text-slate-500">Latest reservations recorded in the current scope.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/workspace/bookings')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Bookings</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Exhibitor Company</th>
                        <th className="px-4 py-3">Exhibition</th>
                        <th className="px-4 py-3 text-right">Grand Total</th>
                        <th className="px-4 py-3 text-right">Paid Amount</th>
                        <th className="px-4 py-3 text-right">Balance Due</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(overview?.recentBookings || []).map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-400">
                            {b.bookingReference}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {b.company?.name || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                            {b.exhibition?.title || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {fmt(b.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            {fmt(b.paidAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                            {fmt(b.balanceAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <BookingStatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}



          {/* ------------------------------------------------------------- */}
          {/* TAB 3: STALL INVENTORY & OCCUPANCY */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'stalls' && (
            <div className="space-y-6">
              {/* STALL STATUS BREAKDOWN */}
              {occupancy && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-purple-600" />
                        Stall Inventory & Category Breakdown
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inventory distribution across floor plan categories and live reservation states.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Available: {occupancy.totalAvailable}
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Booked: {occupancy.totalBooked}
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        Held: {occupancy.totalHeld || 0}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        Blocked: {occupancy.totalBlocked}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {Object.entries(occupancy.categoryBreakdown || {}).map(([cat, stats]) => {
                      const rate = stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0;
                      return (
                        <div
                          key={cat}
                          className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              {cat}
                            </span>
                            <span className="font-mono text-xs font-bold text-purple-600">
                              {rate}% Booked
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-600 h-full rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                            <span>Total: {stats.total} Stalls</span>
                            <span className="text-emerald-600 font-semibold">{stats.available} Open</span>
                          </div>
                          {stats.revenue !== undefined && (
                            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                              Revenue: {fmt(stats.revenue)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EXHIBITIONS PERFORMANCE MATRIX (When All Events is viewed) */}
              {!isEventScoped && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Portfolio Performance Comparison Matrix
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Exhibition-by-exhibition stall occupancy, gross booking commitment, and realized revenue.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Exhibition Title</th>
                          <th className="px-4 py-3">Dates & Venue</th>
                          <th className="px-4 py-3">Stalls</th>
                          <th className="px-4 py-3">Occupancy</th>
                          <th className="px-4 py-3 text-right">Booking Value</th>
                          <th className="px-4 py-3 text-right">Revenue Collected</th>
                          <th className="px-4 py-3 text-right">Due Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {exhibitionsReport.map((expo: any) => (
                          <tr key={expo.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {expo.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {expo.eventCode || 'EX'}-{expo.edition || '01'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                              <div>{formatDisplayDate(expo.startDate)} – {formatDisplayDate(expo.endDate)}</div>
                              <div className="text-[10px] text-slate-400">{expo.venue}, {expo.city}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                              {expo.bookedStalls || 0} / {expo.totalStalls || 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="bg-purple-600 h-full rounded-full"
                                    style={{ width: `${expo.occupancyRate || 0}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs font-bold text-purple-600">
                                  {expo.occupancyRate || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {fmt(expo.totalBookingValue)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                              {fmt(expo.revenueCollected)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                              {fmt(expo.outstandingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </>
      )}
    </div>
  );
};
