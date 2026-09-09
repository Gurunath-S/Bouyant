import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import { formatDisplayDate } from '../../../utils/date';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';
import {
  Calendar,
  MapPin,
  Layers,
  ExternalLink,
  Pencil,
  Info,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
} from 'lucide-react';

interface ExhibitionDetailModalProps {
  exhibition: Exhibition | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (exhibition: Exhibition) => void;
}

export const ExhibitionDetailModal: React.FC<ExhibitionDetailModalProps> = ({
  exhibition,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!exhibition) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const startDateFormatted = formatDisplayDate(exhibition.startDate);
  const endDateFormatted = formatDisplayDate(exhibition.endDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exhibition Event Profile"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner Preview */}
        {exhibition.bannerUrl ? (
          <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs group">
            <img
              src={exhibition.bannerUrl}
              alt={exhibition.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex flex-col justify-end p-4">
              <span
                className={`self-start px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider mb-1 ${getStatusBadge(
                  exhibition.status
                )}`}
              >
                {exhibition.status}
              </span>
              <h2 className="text-lg font-bold text-white leading-snug">{exhibition.title}</h2>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                  exhibition.status
                )}`}
              >
                {exhibition.status}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {exhibition.title}
              </h2>
            </div>
          </div>
        )}

        {/* Slug Explanation Card */}
        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900 dark:text-purple-300">
                URL Identifier (Slug):
              </span>
              <code className="font-mono bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                {exhibition.slug}
              </code>
            </div>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
              A <strong>slug</strong> is the human-readable, URL-safe version of the event title. It is used in web addresses to create clean, search-engine-friendly URLs (e.g., <span className="font-mono text-purple-900 dark:text-purple-200">/exhibitions/{exhibition.slug}</span>) and for sharing direct booking links with exhibitors.
            </p>
          </div>
        </div>

        {/* 4-Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Capacity
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-900 dark:text-white">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>{exhibition.totalStalls} Stalls</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Bookings
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-900 dark:text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{exhibition._count?.bookings ?? 0} Reserved</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              City
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-900 dark:text-white">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{exhibition.city}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Floor Canvas
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-900 dark:text-white">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>{exhibition.floorPlans?.length || 1} Floor Plan</span>
            </div>
          </div>
        </div>

        {/* Schedule & Venue Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-500 block text-[11px]">Event Schedule</span>
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                {startDateFormatted} — {endDateFormatted}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <MapPin className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-500 block text-[11px]">Venue Location</span>
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                {exhibition.venue}, {exhibition.city}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Venue Map Preview */}
        <InteractivePinMap
          venueName={exhibition.venue}
          cityName={exhibition.city}
          address={`${exhibition.venue}, ${exhibition.city}`}
          readOnly={true}
          title="Interactive Venue Location & Directions"
          heightClass="h-48"
        />

        {/* Description */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
            Exhibition Overview
          </h4>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            {exhibition.description || 'No detailed description provided for this exhibition.'}
          </p>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(exhibition);
                }}
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
              >
                Edit Event
              </Button>
            )}

            <Link
              to={`/exhibitions/${exhibition.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
            >
              <span>Public Booking Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};
