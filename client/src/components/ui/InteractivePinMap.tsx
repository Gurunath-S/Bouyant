import React, { useMemo } from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';

export interface InteractivePinMapProps {
  latitude?: number;
  longitude?: number;
  venueName?: string;
  cityName?: string;
  address?: string;
  stateName?: string;
  readOnly?: boolean;
  onChangeCoordinates?: (lat: number, lng: number) => void;
  onSyncAddress?: (addressData: { address?: string; city?: string; state?: string }) => void;
  heightClass?: string;
  title?: string;
}

export const InteractivePinMap: React.FC<InteractivePinMapProps> = ({
  latitude,
  longitude,
  venueName = '',
  cityName = '',
  address = '',
  heightClass = 'h-80',
  title = 'Venue Location Map & Navigation',
}) => {
  // Construct search query string for Google Maps
  const searchQuery = useMemo(() => {
    const parts = [venueName, address, cityName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
    if (latitude && longitude) {
      return `${latitude},${longitude}`;
    }
    return 'India';
  }, [venueName, address, cityName, latitude, longitude]);

  // Google Maps Embed iframe URL (100% free embed endpoint)
  const embedUrl = useMemo(() => {
    return `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&t=m&z=15&output=embed&iwloc=near`;
  }, [searchQuery]);

  // Direct turn-by-turn navigation URL for Google Maps app / web
  const googleDirectionsUrl = useMemo(() => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchQuery)}`;
  }, [latitude, longitude, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-0 transition-colors">
      {/* Header bar with title & 1-click Google Navigation button */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {searchQuery}
            </p>
          </div>
        </div>

        {/* Action Button: Open Directions in Google Maps */}
        <a
          href={googleDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          title="Open directions in Google Maps"
        >
          <Navigation className="w-3.5 h-3.5 text-purple-200" />
          <span>Get Directions</span>
          <ExternalLink className="w-3 h-3 text-purple-200 opacity-80" />
        </a>
      </div>

      {/* Google Maps Embed Canvas */}
      <div className={`w-full ${heightClass} relative bg-slate-100 dark:bg-slate-950 z-0`}>
        <iframe
          title={title}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
