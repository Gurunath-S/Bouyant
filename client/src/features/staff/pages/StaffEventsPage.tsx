import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import {
  Layers,
  CalendarPlus,
  Calendar,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const StaffEventsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exhibitions.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      (e.eventCode && e.eventCode.toLowerCase().includes(q)) ||
      (e.spcode && e.spcode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Registered Exhibitions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track operational status and event lifecycle of exhibitions registered across the platform.
          </p>
        </div>

        <Link to="/staff/events/register">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CalendarPlus className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            Register New Event
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exhibitions by title, city, or SP code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filtered.length} exhibitions
        </span>
      </div>

      {/* Exhibitions Grid / Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Loading exhibitions list...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No exhibitions found</p>
          <p className="text-xs text-slate-400 mt-1">Register an event or adjust search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((expo) => {
            const isMine =
              expo.createdByUserId === user?.id ||
              (expo.spcode && user?.spcode && expo.spcode === user.spcode);

            return (
              <div
                key={expo.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* Top Role Attribution Badge */}
                {isMine && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl shadow-xs">
                    My Registration
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {expo.eventCode || 'EX'}-{expo.edition || '01'}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1 group-hover:text-emerald-600 transition-colors">
                        {expo.title}
                      </h3>
                    </div>

                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${
                        expo.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : expo.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {expo.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {expo.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {formatDisplayDate(expo.startDate)} – {formatDisplayDate(expo.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{expo.venue}, {expo.city}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Stalls: <strong className="text-slate-800 dark:text-slate-200">{expo.totalStalls}</strong>
                  </span>

                  {expo.spcode && (
                    <span className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                      SP: {expo.spcode}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
