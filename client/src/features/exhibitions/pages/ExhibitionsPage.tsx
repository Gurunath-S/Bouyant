import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Calendar, MapPin, Search, ChevronRight } from 'lucide-react';

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

  const filtered = exhibitions.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Exhibitions & Trade Fairs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse upcoming trade shows, inspect interactive hall floor plans, and book exhibition stalls.
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
          {filtered.map((expo) => (
            <div
              key={expo.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
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
                <span className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-900 dark:text-slate-100 font-extrabold text-[10px] rounded uppercase shadow-2xs border border-slate-200/50 dark:border-slate-700/50">
                  {expo.status}
                </span>
              </div>

              <div className="p-5 space-y-3">
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
                      {new Date(expo.startDate).toLocaleDateString()} -{' '}
                      {new Date(expo.endDate).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {expo.totalStalls} Stalls
                </span>
                <Link to={`/exhibitions/${expo.slug}`}>
                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    View Floor Plan
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
