import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { BackButton } from '../../../components/ui/BackButton';
import { useAuthStore } from '../../../stores/authStore';
import { Calendar, MapPin, Search, ChevronRight, Lock, Tag,ChevronLeft,Info} from 'lucide-react';
import { formatDisplayDate } from '../../../utils/date';

export const ExhibitionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  async function fetchExhibitions() {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data || []);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExhibitions();
  }, []);

   useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const currentUpcomingEvent = React.useMemo(() => {
    const now = new Date();
    const published = exhibitions.filter(
      (e) => e.status === 'PUBLISHED' && new Date(e.endDate) >= now
    );
    if (published.length === 0) return null;
    return published.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0];
  }, [exhibitions]);

  const now = new Date();
  const filtered = exhibitions.filter((e) => {
    // Hide DRAFT or CANCELLED exhibitions from public page
    if (e.status === 'DRAFT' || e.status === 'CANCELLED') {
      return false;
    }

    // Hide completed events 3 days after their completion date
    const endDate = new Date(e.endDate);
    const threeDaysAfterCompletion = new Date(endDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (now > threeDaysAfterCompletion) {
      return false;
    }

    const matchesSearch =
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentExhibitions = filtered.slice(startIndex, endIndex);

  const getBackConfig = () => {
    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') {
      return { to: '/workspace/events', label: 'Back to Exhibitions Console' };
    }
    if (user?.role === 'STAFF') {
      return { to: '/staff/dashboard', label: 'Back to Staff Dashboard' };
    }
    if (user?.role === 'CLIENT') {
      return { to: '/dashboard', label: 'Back to Exhibitor Portal' };
    }
    return { to: '/', label: 'Back to Home' };
  };

  const backConfig = getBackConfig();

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8 space-y-6">
      {/* Top Back Navigation */}
      <div>
        <BackButton to={backConfig.to} label={backConfig.label} />
      </div>

          {/* Header */}
      <div className="space-y-3.5 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Top Row: Title on Left, Search Bar on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-[#1E3FA0] dark:text-blue-400" />
            Browse Exhibitions
          </h1>

          <div className="w-full sm:w-80 shrink-0">
            <Input
              placeholder="Search event, city, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        {/* Purple Background Note Banner */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>
            Note: Stall bookings are strictly open for the current upcoming event only.
          </span>
        </div>
      </div>

            {/* Top Pagination Row (All Devices Responsive) */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 text-xs text-slate-600 dark:text-slate-400">
          {/* Left: Showing count */}
          <div className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Showing <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{totalItems}</strong> exhibitions
          </div>

          {/* Right: Per page & Navigation buttons (Never Breaks) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 whitespace-nowrap">
            {/* Per Page */}
            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span className="font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Per Page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer shadow-xs focus:ring-2 focus:ring-purple-500 text-xs"
              >
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </div>

            {/* Prev / Page / Next */}
            <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-1.5 font-mono whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading Trade Fairs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">No exhibitions match your search.</p>
        </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentExhibitions.map((expo) => {
            const isCurrentUpcoming = currentUpcomingEvent && expo.id === currentUpcomingEvent.id;
            const isFull = expo.isFull === true || (expo.totalStalls > 0 && expo.availableStallsCount === 0);

            return (
              <div
                key={expo.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isFull
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : isCurrentUpcoming
                    ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                <div className="h-40 bg-slate-800 dark:bg-slate-950 relative overflow-hidden">
                  <img
                    src={
                      expo.bannerUrl ||
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={expo.title}
                    className="w-full h-full object-cover opacity-90 dark:opacity-80"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    {isFull ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md font-extrabold text-[10px] rounded uppercase shadow-xs bg-rose-600 text-white border border-rose-400">
                        Housefull • Stalls Full
                      </span>
                    ) : expo.status === 'PUBLISHED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md font-extrabold text-[10px] rounded uppercase shadow-xs bg-purple-600 text-white border border-purple-400">
                        <Tag className="w-3 h-3 text-purple-200" /> Open Event
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-slate-300 font-bold text-[10px] rounded border border-slate-700">
                        <Lock className="w-3 h-3 text-slate-400" /> {expo.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    {isFull ? (
                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                        ALL STALLS BOOKED
                      </span>
                    ) : expo.status === 'PUBLISHED' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        OPEN FOR STALL BOOKINGS
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{expo.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{expo.description}</p>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        {expo.venue}, {expo.city}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        {formatDisplayDate(expo.startDate)} – {formatDisplayDate(expo.endDate)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block truncate">
                      {expo.totalStalls} Stalls
                    </span>
                    {typeof expo.bookedStallsCount === 'number' && (
                      <span className="text-[10px] text-slate-400 font-normal block truncate">
                        ({expo.bookedStallsCount} booked)
                      </span>
                    )}
                  </div>
                  <Link to={`/exhibitions/${expo.slug || expo.id}`} className="shrink-0">
                    <Button
                      variant={!isFull && expo.status === 'PUBLISHED' ? 'primary' : 'outline'}
                      size="sm"
                      className={`text-xs px-3 py-1.5 whitespace-nowrap shrink-0 ${
                        !isFull && expo.status === 'PUBLISHED'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white font-extrabold'
                          : ''
                      }`}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      {isFull ? 'See Details' : expo.status === 'PUBLISHED' ? 'Book Stalls Now' : 'View Details'}
                    </Button>
                  </Link>
                </div>
             
              </div>
            );
          })}
        </div>
      )}
    </div>
    
  );
};
