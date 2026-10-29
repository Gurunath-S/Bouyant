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

  const allImages = Array.isArray(exhibition.images) && exhibition.images.length > 0
    ? exhibition.images.filter(Boolean)
    : (exhibition.bannerUrl ? [exhibition.bannerUrl] : []);

  const [selectedPhoto, setSelectedPhoto] = React.useState<string>('');

  React.useEffect(() => {
    setSelectedPhoto(exhibition?.bannerUrl || allImages[0] || '');
  }, [exhibition?.id, exhibition?.bannerUrl, exhibition?.images]);

  const activeDisplayImg = selectedPhoto || exhibition.bannerUrl || allImages[0] || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exhibition Event Profile"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner Preview & Multi-Photo Gallery */}
        {activeDisplayImg ? (
          <div className="space-y-2.5">
            <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs group bg-slate-900">
              <img
                src={activeDisplayImg}
                alt={exhibition.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`self-start px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                      exhibition.status
                    )}`}
                  >
                    {exhibition.status}
                  </span>
                  {allImages.length > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold border border-white/20">
                      {Math.max(1, allImages.indexOf(activeDisplayImg) + 1)} / {allImages.length} Photos
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white leading-snug">{exhibition.title}</h2>
              </div>
            </div>

            {/* Thumbnail Gallery Strip when multiple photos exist */}
            {allImages.length > 1 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Uploaded Event Photos & Banners ({allImages.length})</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">Click any image to preview</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {allImages.map((img, idx) => {
                    const isSelected = activeDisplayImg === img;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhoto(img)}
                        className={`relative h-14 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'border-purple-600 ring-2 ring-purple-400/40 scale-102'
                            : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-purple-300'
                        }`}
                      >
                        <img src={img} alt={`Event photo ${idx + 1}`} className="w-full h-full object-cover" />
                        {img === exhibition.bannerUrl && (
                          <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 bg-purple-600 text-[8px] font-bold text-white rounded">
                            Cover
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              {exhibition.address && (
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  {exhibition.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Venue Map Preview */}
        <InteractivePinMap
          venueName={exhibition.venue}
          cityName={exhibition.city}
          address={exhibition.address || undefined}
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
