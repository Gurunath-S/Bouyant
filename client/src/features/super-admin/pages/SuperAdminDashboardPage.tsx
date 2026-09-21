import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../../services/reports/reportService';
import { ReportOverviewData } from '../../../types';
import { Button } from '../../../components/ui/Button';
import {
  ShieldAlert,
  Users,
  Layers,
  IndianRupee,
  BookmarkCheck,
  TrendingUp,
  UserCheck,
  Building,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const SuperAdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<ReportOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await reportService.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load SuperAdmin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Platform Super Admin Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Highest-level platform governance, team administration, exhibitions oversight, and global reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/super-admin/users">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-4 h-4" />}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white border-0 shadow-sm"
            >
              Manage Admins & Staff
            </Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Platform Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Platform Revenue</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            ₹{data?.totalRevenue ? Number(data.totalRevenue).toLocaleString() : '0'} INR
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> All confirmed orders
          </span>
        </div>

        {/* Active Admins & Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admins & Operations</p>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {(data?.activeAdmins || 0) + (data?.activeStaff || 0)}
            </p>
            <span className="text-[11px] text-slate-500 font-semibold">Active Team</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
              {data?.activeAdmins || 0} Admins
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
              {data?.activeStaff || 0} Staff
            </span>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bookings Volume</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalBookings || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
            {data?.confirmedBookings || 0} Confirmed Reservations
          </span>
        </div>

        {/* Exhibitions & Occupancy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Exhibitions</p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalExhibitions || 0}
          </p>
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-2 block">
            {data?.occupancyRate || 0}% Stall Occupancy Rate
          </span>
        </div>
      </div>

      {/* Governance & Operations Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              User & Team Governance
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Create and manage Admin and Staff accounts. Provision SP codes, toggle active statuses, and perform password resets.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/super-admin/users">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Go to User Management
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              Exhibitions & Floor Plans
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Oversee all platform expos, review draft submissions from Staff, design visual floor plans, and configure stall layouts.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/admin/events">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Manage All Exhibitions
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              Platform-Wide Analytics
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Access executive financial reports, stall occupancy breakdown by category, and booking conversion logs.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/reports">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                View Full Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Platform Activity */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Recent Platform Bookings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auditable stream of incoming reservations across all exhibitions.
            </p>
          </div>
          <Link to="/admin/bookings" className="text-xs font-bold text-amber-600 hover:underline">
            View All Bookings →
          </Link>
        </div>

        {data?.recentBookings && data.recentBookings.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {data.recentBookings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {b.company?.name || 'Exhibitor Client'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {b.exhibition?.title || 'Exhibition'} • Ref: <span className="font-mono">{b.bookingReference}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    ₹{Number(b.grandTotal).toLocaleString()} INR
                  </p>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded ${
                      b.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No booking activities recorded yet.
          </div>
        )}
      </div>

      {/* Security & Health Card */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Role-Based Access Control (RBAC) Active
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Super Admin, Admin, Staff, and Client permissions are enforced server-side.
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] font-bold text-slate-400">
          PLATFORM LEVEL 4 RBAC
        </span>
      </div>
    </div>
  );
};
