import React, { useEffect, useState } from 'react';
import { reportService } from '../../../services/reports/reportService';
import { ReportOverviewData, OccupancyReportData, Exhibition } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { formatDisplayDate } from '../../../utils/date';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  BookmarkCheck,
  Layers,
  Users,
  Building,
  Calendar,
  CheckCircle2,
  PieChart,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';

  const [overview, setOverview] = useState<ReportOverviewData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyReportData | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [over, occ, expos] = await Promise.all([
        reportService.getOverview(),
        reportService.getOccupancy(),
        reportService.getExhibitions(),
      ]);
      setOverview(over);
      setOccupancy(occ);
      setExhibitions(expos);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (isSuperAdmin) return 'Platform-Wide Executive Analytics';
    if (isAdmin) return 'Exhibition Business & Sales Reports';
    if (isStaff) return 'Operational & Event Registration Reports';
    return 'Exhibition Analytics';
  };

  const getPageSubtitle = () => {
    if (isSuperAdmin)
      return 'Platform gross revenue, booking conversions, active administration teams, and global stall occupancies.';
    if (isAdmin)
      return 'Comprehensive breakdown of exhibition performance, stall sales by category, and booking occupancy.';
    return 'Operational overview of exhibitions registered, event timelines, and stall allocations.';
  };

  // Filtered exhibitions list
  const filteredExhibitions = React.useMemo(() => {
    if (selectedExhibitionId === 'ALL') return exhibitions;
    return exhibitions.filter((e) => e.id === selectedExhibitionId);
  }, [exhibitions, selectedExhibitionId]);

  // Event specific calculation when a particular event is selected
  const activeSelectedEvent = React.useMemo(() => {
    if (selectedExhibitionId === 'ALL') return null;
    return exhibitions.find((e) => e.id === selectedExhibitionId) || null;
  }, [exhibitions, selectedExhibitionId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg border ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : isAdmin
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* Particular Event Filter Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-2xs">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2 shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" /> Event Scope:
            </label>
            <select
              value={selectedExhibitionId}
              onChange={(e) => setSelectedExhibitionId(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
            >
              <option value="ALL">All Exhibitions & Bookings (Combined)</option>
              {exhibitions.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.eventCode || 'EX'}-{ex.edition || '01'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
          Loading report metrics...
        </div>
      ) : (
        <>
          {/* SECTION 1: ROLE-SPECIFIC KPI METRICS */}
          {/* 1.A SUPERADMIN & ADMIN FINANCIALS */}
          {(isSuperAdmin || isAdmin) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {isSuperAdmin ? 'Platform Gross Revenue' : 'Confirmed Booking Revenue'}
                  </p>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                  ₹{overview?.totalRevenue ? Number(overview.totalRevenue).toLocaleString() : '0'} INR
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  <TrendingUp className="w-3.5 h-3.5" /> 100% Tax Compliant
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bookings Placed</p>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {overview?.totalBookings || 0}
                </p>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 block">
                  {overview?.confirmedBookings || 0} Confirmed Reservations
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stall Occupancy</p>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {overview?.occupancyRate || 0}%
                </p>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-2 block">
                  {occupancy?.totalBooked || 0} / {occupancy?.totalStalls || 0} Stalls Reserved
                </span>
              </div>

              {isSuperAdmin ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Teams</p>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {(overview?.activeAdmins || 0) + (overview?.activeStaff || 0)}
                  </p>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-2 block">
                    {overview?.activeAdmins || 0} Admins • {overview?.activeStaff || 0} Staff
                  </span>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Exhibitions</p>
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {overview?.totalExhibitions || 0}
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 block">
                    Across Platform Portfolios
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 1.B STAFF OPERATIONAL KPI CARDS (No Financial Metrics Excluded) */}
          {isStaff && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Registered Events</p>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {overview?.totalEventsRegistered || 0}
                </p>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2 block">
                  Attributed to SP: {user?.spcode || 'N/A'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upcoming Expos</p>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {overview?.upcomingEvents || 0}
                </p>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 block">
                  Active schedules on platform
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stalls In My Events</p>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {overview?.totalStallsInRegisteredEvents || 0}
                </p>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-2 block">
                  Total planned capacity
                </span>
              </div>
            </div>
          )}

          {/* SECTION 2: STALL OCCUPANCY & CATEGORY BREAKDOWN (For SuperAdmin and Admin) */}
          {(isSuperAdmin || isAdmin) && occupancy && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    Stall Inventory & Category Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time distribution of available, booked, and blocked stalls across all floor plans.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Available: {occupancy.totalAvailable}
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Booked: {occupancy.totalBooked}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Blocked: {occupancy.totalBlocked}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {Object.entries(occupancy.categoryBreakdown).map(([cat, stats]) => {
                  const rate = stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0;
                  return (
                    <div
                      key={cat}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex justify-between items-center mb-2">
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
                      <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                        <span>Total: {stats.total}</span>
                        <span className="text-emerald-600 font-semibold">{stats.available} open</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: EXHIBITIONS PERFORMANCE TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {isStaff ? 'My Registered Exhibitions' : 'Exhibitions Performance Directory'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isStaff
                    ? 'Audit logs of events registered under your profile.'
                    : 'Overview of events, schedule, creator attribution, and floor plan statuses.'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="px-5 py-3">Exhibition Title</th>
                    <th className="px-4 py-3">Code / Edition</th>
                    <th className="px-4 py-3">Dates & Venue</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Creator / SP Code</th>
                    <th className="px-4 py-3">Stalls Planned</th>
                    {isSuperAdmin && <th className="px-4 py-3">Bookings</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExhibitions.map((expo) => (
                    <tr key={expo.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {expo.title}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {expo.eventCode || 'EX'}-{expo.edition || '01'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        <div>{formatDisplayDate(expo.startDate)} – {formatDisplayDate(expo.endDate)}</div>
                        <div className="text-[10px] text-slate-400">{expo.venue}, {expo.city}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            expo.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : expo.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {expo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {expo.createdBy ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {expo.createdBy.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({expo.createdBy.role}) • {expo.spcode || 'N/A'}
                            </span>
                          </div>
                        ) : expo.spcode ? (
                          <span className="font-mono font-bold text-indigo-600 text-[11px]">
                            SP: {expo.spcode}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {expo.totalStalls}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                          {expo._count?.bookings || 0}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
