import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Calendar, MapPin, Search, ChevronRight } from 'lucide-react';
import { formatDisplayDate } from '../../../utils/date';

export const ExhibitionsPage: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchExhibitions();
  }, []);

  const fetchExhibitions = async () => {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data || []);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const currentUpcomingEvent = React.useMemo(() => {
    const published = exhibitions.filter(
      (e) => e.status === 'PUBLISHED' && new Date(e.endDate) >= now
    );
    if (published.length === 0) return null;
    return published.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0];
  }, [exhibitions]);

  const filtered = exhibitions.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Exhibitions & Trade Fairs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse trade shows. <strong className="text-purple-600 dark:text-purple-400">Note: Stall bookings are strictly open for the current upcoming event alone.</strong>
          </p>
        </div>

        <div className="max-w-xs w-full">
          <Input
            placeholder="Search by event, city, or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((expo) => {
            const isCurrentUpcoming = currentUpcomingEvent && expo.id === currentUpcomingEvent.id;

            return (
              <div
                key={expo.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isCurrentUpcoming
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
                    <span
                      className={`px-2.5 py-1 backdrop-blur-xs font-extrabold text-[10px] rounded uppercase shadow-2xs border ${
                        isCurrentUpcoming
                          ? 'bg-purple-600 text-white border-purple-400 font-black'
                          : 'bg-slate-900/90 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isCurrentUpcoming ? '🔥 Current Upcoming Event' : expo.status}
                    </span>
                    {!isCurrentUpcoming && (
                      <span className="px-2 py-0.5 bg-rose-950/80 text-rose-200 font-bold text-[9px] rounded border border-rose-800">
                        🔒 Booking Closed
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    {isCurrentUpcoming && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        OPEN FOR STALL BOOKINGS
                      </span>
                    )}
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

                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {expo.totalStalls} Stalls
                  </span>
                  <Link to={`/exhibitions/${expo.slug || expo.id}`}>
                    <Button
                      variant={isCurrentUpcoming ? 'primary' : 'outline'}
                      size="sm"
                      className={isCurrentUpcoming ? 'bg-purple-600 hover:bg-purple-700 text-white font-extrabold' : ''}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      {isCurrentUpcoming ? 'Book Stalls Now' : 'View Details'}
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
