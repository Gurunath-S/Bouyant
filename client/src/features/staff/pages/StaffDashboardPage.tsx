import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../../services/reports/reportService';
import { ReportOverviewData } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import {
  CalendarPlus,
  Layers,
  Calendar,
  Building,
  BarChart3,
  MapPin,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const StaffDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
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
      console.error('Failed to load staff metrics:', err);
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
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Operations Staff Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back, <strong>{user?.name}</strong>. Submit new exhibitions, track registered events, and review operational schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/staff/events/register">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold"
            >
              Register New Event
            </Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Operational Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Events Registered by Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Registered Events</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalEventsRegistered || 0}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 mt-2 block">
            Attributed to Staff SP: {user?.spcode || 'N/A'}
          </span>
        </div>

        {/* Total Platform Active Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Expos</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.upcomingEvents || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
            Scheduled across platform
          </span>
        </div>

        {/* Stalls in Registered Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stalls In My Events</p>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {data?.totalStallsInRegisteredEvents || 0}
          </p>
          <span className="text-[11px] font-semibold text-purple-600 mt-2 block">
            Capacity created
          </span>
        </div>
      </div>

      {/* Callout Card for Event Registration */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">
            Have a new exhibition to submit?
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Register event dates, venue location, edition codes, and basic information. Once submitted, our Admin team will configure the interactive floor plan and finalize stall pricing.
          </p>
        </div>
        <Link to="/staff/events/register">
          <Button
            variant="secondary"
            size="md"
            className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold shadow-sm shrink-0"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start Event Registration
          </Button>
        </Link>
      </div>

      {/* Recent Events Registered by this Staff */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              My Registered Events
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exhibitions submitted under your account profile.
            </p>
          </div>
          <Link to="/staff/events" className="text-xs font-bold text-emerald-600 hover:underline">
            View All ({data?.registeredEvents?.length || 0}) →
          </Link>
        </div>

        {data?.registeredEvents && data.registeredEvents.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {data.registeredEvents.slice(0, 5).map((e) => (
              <div key={e.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {e.title}
                    </p>
                    <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {e.eventCode}-{e.edition}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDisplayDate(e.startDate)} – {formatDisplayDate(e.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {e.venue}, {e.city}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                      e.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {e.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {e.totalStalls} Stalls planned
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No events registered yet</p>
            <p className="text-slate-400 mt-1">Submit your first event using the "Register New Event" button above.</p>
          </div>
        )}
      </div>
    </div>
  );
};
