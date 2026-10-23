import React, { useMemo, useState } from 'react';
import { MapPin, Navigation, ExternalLink, Search, RotateCcw, Crosshair, X, Check } from 'lucide-react';

export interface InteractivePinMapProps {
  latitude?: number;
  longitude?: number;
  venueName?: string;
  cityName?: string;
  address?: string;
  stateName?: string;
  readOnly?: boolean;
  onChangeCoordinates?: (lat: number, lng: number) => void;
  onSyncAddress?: (addressData: { address?: string; city?: string; state?: string; venue?: string }) => void;
  heightClass?: string;
  title?: string;
}

export const InteractivePinMap: React.FC<InteractivePinMapProps> = ({
  latitude,
  longitude,
  venueName = '',
  cityName = '',
  address = '',
  stateName = '',
  readOnly = false,
  onChangeCoordinates,
  onSyncAddress,
  heightClass = 'h-80',
  title = 'Venue Location Map & Navigation',
}) => {
  // In-map custom search query override
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchOverride, setActiveSearchOverride] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Construct query string based strictly on entered form values (no hardcoded Maharashtra/India fallback)
  const formSearchQuery = useMemo(() => {
    const cleanVenue = venueName?.trim() || '';
    const cleanCity = cityName?.trim() || '';
    const cleanAddress = address?.trim() || '';
    const cleanState = stateName?.trim() || '';

    const parts: string[] = [];
    if (cleanVenue) parts.push(cleanVenue);

    if (cleanAddress && !cleanAddress.toLowerCase().includes(cleanVenue.toLowerCase())) {
      parts.push(cleanAddress);
    }

    if (cleanCity) {
      const fullSoFar = parts.join(', ').toLowerCase();
      if (!fullSoFar.includes(cleanCity.toLowerCase())) {
        parts.push(cleanCity);
      }
    }

    if (cleanState) {
      const fullSoFar = parts.join(', ').toLowerCase();
      if (!fullSoFar.includes(cleanState.toLowerCase())) {
        parts.push(cleanState);
      }
    }

    return parts.join(', ');
  }, [venueName, address, cityName, stateName]);

  // Track previous form search query so changing form inputs clears any manual search override and moves the map immediately
  const [prevFormQuery, setPrevFormQuery] = useState(formSearchQuery);
  if (prevFormQuery !== formSearchQuery) {
    setPrevFormQuery(formSearchQuery);
    if (activeSearchOverride) {
      setActiveSearchOverride(null);
    }
  }

  // Determine effective search query (override takes precedence, then form fields, then coordinates)
  const effectiveQuery = useMemo(() => {
    if (activeSearchOverride) return activeSearchOverride;
    if (formSearchQuery) return formSearchQuery;
    if (latitude && longitude) return `${latitude},${longitude}`;
    return '';
  }, [activeSearchOverride, formSearchQuery, latitude, longitude]);

  // Check if any location information is available
  const hasLocation = Boolean(effectiveQuery || (latitude && longitude));

  // Flag if user has customized/overridden the map location
  const isCustomized = Boolean(activeSearchOverride || (latitude && longitude && !formSearchQuery));

  // Google Maps Embed iframe URL (Roadmap mode t=m forces standard road tiles, avoiding "Sorry, we have no imagery here", NO API KEY needed)
  const embedUrl = useMemo(() => {
    // 1. Manual in-map search override takes top priority
    if (activeSearchOverride) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(activeSearchOverride)}&t=m&z=15&hl=en&output=embed`;
    }

    // 2. Form fields (Venue / Centre Name, Full Venue Address, City, State) directly move and update the map live!
    if (formSearchQuery) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(formSearchQuery)}&t=m&z=15&hl=en&output=embed`;
    }

    // 3. Fallback to coordinates only if no venue name, address, or city are entered
    if (latitude && longitude) {
      return `https://maps.google.com/maps?q=${latitude},${longitude}&t=m&z=15&hl=en&output=embed`;
    }

    return '';
  }, [formSearchQuery, activeSearchOverride, latitude, longitude]);

  // Direct turn-by-turn navigation URL for Google Maps app / web
  const googleDirectionsUrl = useMemo(() => {
    if (activeSearchOverride) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeSearchOverride)}`;
    }
    if (formSearchQuery) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formSearchQuery)}`;
    }
    if (latitude && longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    return '';
  }, [formSearchQuery, activeSearchOverride, latitude, longitude]);

  // Handle in-map search submission
  const handleMapSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setActiveSearchOverride(query);
    setGeoNotice(null);
  };

  // Reset pin position back to entered form address
  const handleResetPosition = () => {
    setActiveSearchOverride(null);
    setSearchInput('');
    setGeoNotice(null);
    if (onChangeCoordinates) {
      onChangeCoordinates(undefined as unknown as number, undefined as unknown as number);
    }
  };

  // Use browser GPS Geolocation to pin user's current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoLoading(false);
        setActiveSearchOverride(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        if (onChangeCoordinates) {
          onChangeCoordinates(lat, lng);
        }
        setGeoNotice('Pin placed at current GPS location');
        setTimeout(() => setGeoNotice(null), 4000);
      },
      (err) => {
        setGeoLoading(false);
        setGeoNotice(err.message || 'Unable to retrieve your current location.');
        setTimeout(() => setGeoNotice(null), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Sync searched venue/landmark back into parent form inputs
  const handleApplyToForm = () => {
    if (!activeSearchOverride || !onSyncAddress) return;
    const segments = activeSearchOverride.split(',').map((s) => s.trim());
    if (segments.length === 1) {
      onSyncAddress({ venue: segments[0], address: segments[0] });
    } else if (segments.length === 2) {
      onSyncAddress({ venue: segments[0], city: segments[1] });
    } else {
      onSyncAddress({
        venue: segments[0],
        address: segments.slice(0, -2).join(', ') || segments[0],
        city: segments[segments.length - 2],
        state: segments[segments.length - 1],
      });
    }
    setGeoNotice('Applied location to form fields');
    setTimeout(() => setGeoNotice(null), 3000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-0 transition-colors">
      {/* Header bar */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h4>
              {!hasLocation && (
                <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  Awaiting Venue / Address
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-sm sm:max-w-md">
              {venueName ? (
                <>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">{venueName}</strong>
                  {effectiveQuery && effectiveQuery !== venueName ? ` • ${effectiveQuery}` : ''}
                </>
              ) : (
                effectiveQuery || 'No location specified'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Reset, Current GPS, Directions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!readOnly && isCustomized && (
            <button
              type="button"
              onClick={handleResetPosition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Reset map pin back to the entered venue and address from the form"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset to Form Address</span>
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              disabled={geoLoading}
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Use current GPS device location to position pin"
            >
              <Crosshair className={`w-3.5 h-3.5 text-slate-500 ${geoLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{geoLoading ? 'Locating...' : 'My Location'}</span>
            </button>
          )}

          {googleDirectionsUrl && (
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
          )}
        </div>
      </div>

      {/* In-Map Search Bar (Optional inline search tool for exact positioning) */}
      {!readOnly && (
        <div className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleMapSearch} className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search venue, exhibition center, or city on map..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              Pin on Map
            </button>
          </form>

          {/* Active Override Feedback & Sync action */}
          {activeSearchOverride && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-xl text-[11px] text-purple-700 dark:text-purple-300">
              <span className="truncate max-w-[200px]">Pin: <strong>{activeSearchOverride}</strong></span>
              {onSyncAddress && (
                <button
                  type="button"
                  onClick={handleApplyToForm}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 dark:text-purple-200 underline hover:no-underline ml-1 cursor-pointer"
                  title="Copy this searched venue into the form's venue and address inputs"
                >
                  <Check className="w-3 h-3" />
                  Apply to Form
                </button>
              )}
            </div>
          )}

          {geoNotice && (
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{geoNotice}</span>
            </div>
          )}
        </div>
      )}

      {/* Map Content: Official Google Maps Embed Canvas (NO API KEY REQUIRED) OR Clean Empty State */}
      <div className={`w-full ${heightClass} relative bg-slate-100 dark:bg-slate-950 z-0`}>
        {hasLocation && embedUrl ? (
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-950">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center mb-3 shadow-sm">
              <MapPin className="w-6 h-6 animate-bounce" />
            </div>
            <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              No Venue Location Specified
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
              Enter an Exhibition Venue or Address in the fields above, or use the search bar to locate and pin the exhibition venue on Google Maps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


