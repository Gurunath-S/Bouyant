import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';

export interface VenueMapProps {
  venue: string;
  city: string;
  address?: string;
  title?: string;
  heightClass?: string;
  showDirectionsButton?: boolean;
  className?: string;
}

export const VenueMap: React.FC<VenueMapProps> = ({
  venue,
  city,
  address,
  title = 'Venue Location & Interactive Map',
  heightClass = 'h-64',
  showDirectionsButton = true,
  className = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // If neither venue nor city is provided, display a friendly placeholder
  if (!venue && !city) {
    return (
      <div
        className={`p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 ${className}`}
      >
        <MapPin className="w-6 h-6 text-slate-300" />
        <span>Specify venue and city to load interactive map preview</span>
      </div>
    );
  }

  // Combine venue, address, and city for exact geocoding query
  const queryParts = [venue, address, city].filter(Boolean);
  const locationQuery = queryParts.join(', ');
  const encodedQuery = encodeURIComponent(locationQuery);

  const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs space-y-0 ${className}`}
    >
      {/* Header bar */}
      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h4>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {venue ? `${venue}, ` : ''}{city}
            </p>
          </div>
        </div>

        {showDirectionsButton && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Get Directions</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>

      {/* Map Iframe Container */}
      <div className={`relative w-full ${heightClass} bg-slate-100 dark:bg-slate-800`}>
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs gap-2">
            <Compass className="w-4 h-4 animate-spin text-purple-600" />
            <span>Loading interactive map...</span>
          </div>
        )}
        <iframe
          title={`Map of ${locationQuery}`}
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
};
