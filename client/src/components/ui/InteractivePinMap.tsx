import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Search, Check, RefreshCw, Compass, Crosshair } from 'lucide-react';
import { Button } from './Button';

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

// Default fallback coordinates (India central / Mumbai)
const DEFAULT_LAT = 19.1551;
const DEFAULT_LNG = 72.8553;

export const InteractivePinMap: React.FC<InteractivePinMapProps> = ({
  latitude = DEFAULT_LAT,
  longitude = DEFAULT_LNG,
  venueName = '',
  cityName = '',
  address = '',
  stateName = '',
  readOnly = false,
  onChangeCoordinates,
  onSyncAddress,
  heightClass = 'h-80',
  title = 'Interactive Venue Location & Pin Selection Map',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([latitude, longitude]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingSyncLocation, setPendingSyncLocation] = useState<{
    displayName: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Track the last geocoded input string to prevent redundant auto-search loops
  const lastAutoGeocodedRef = useRef<string>('');
  const userInteractedRef = useRef<boolean>(false);
  const manualPinPlacedRef = useRef<boolean>(false);

  // Ultra-precise SVG Pin Icon.
  // Icon dimensions: 36px width x 44px total height.
  // The needle tip is located at center x=18px and bottom y=44px.
  // Leaflet anchor [18, 44] places the needle tip with pixel-perfect accuracy on the exact clicked coordinate.
  const createPinIcon = () =>
    L.divIcon({
      className: 'bg-transparent border-0 outline-none',
      html: `
        <div style="width: 36px; height: 44px; position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); user-select: none;">
          <!-- Pin Circular Head (36px x 36px) -->
          <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <!-- Pin Pointer Needle Tip leading to bottom center (x: 18px, y: 44px) -->
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #6d28d9; margin-top: -1px;"></div>
          <!-- Precision target dot at the very tip -->
          <div style="width: 3px; height: 3px; background: #4c1d95; border-radius: 50%; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44],
    });

  // Reverse geocode coords to check address when pin is dropped/moved
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.address) {
        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.state_district ||
          '';
        const state = data.address.state || '';
        const street =
          data.address.road ||
          data.address.suburb ||
          data.address.neighbourhood ||
          data.display_name.split(',')[0];

        setPendingSyncLocation({
          displayName: street ? `${street}, ${city}` : data.display_name,
          city,
          state,
        });
      }
    } catch (err) {
      console.error('Reverse geocode failed:', err);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: currentCoords,
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap high-performance tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Marker with needle tip anchor
      const marker = L.marker(currentCoords, {
        icon: createPinIcon(),
        draggable: !readOnly,
      }).addTo(map);

      markerRef.current = marker;

      // Handle Pin Drag
      if (!readOnly) {
        marker.on('dragend', () => {
          manualPinPlacedRef.current = true;
          userInteractedRef.current = true;
          lastAutoGeocodedRef.current = 'MANUAL_PIN';
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          setCurrentCoords([newLat, newLng]);
          onChangeCoordinates?.(newLat, newLng);
          fetchAddressFromCoords(newLat, newLng);
          setSyncStatusMessage(`📍 Pin positioned at: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
          setTimeout(() => setSyncStatusMessage(null), 4000);
        });

        // Handle Map Click: drop pin exactly at the clicked spot
        map.on('click', (e: L.LeafletMouseEvent) => {
          manualPinPlacedRef.current = true;
          userInteractedRef.current = true;
          lastAutoGeocodedRef.current = 'MANUAL_PIN';
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setCurrentCoords([newLat, newLng]);
          onChangeCoordinates?.(newLat, newLng);
          fetchAddressFromCoords(newLat, newLng);
          setSyncStatusMessage(`📍 Pin dropped at: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
          setTimeout(() => setSyncStatusMessage(null), 4000);
        });
      }

      mapInstanceRef.current = map;

      // Ensure coordinate-to-pixel matrix is accurate on mount
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 600);
    }

    // ResizeObserver ensures map is always calibrated if parent container resizes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker position when external coords change
  useEffect(() => {
    if (latitude && longitude && mapInstanceRef.current && markerRef.current) {
      if (latitude !== currentCoords[0] || longitude !== currentCoords[1]) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
        setCurrentCoords([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Robust multi-tier geocoding search with smart fallback
  const handleGeocodeSearch = async (customQuery?: string, isManual = false) => {
    let queries: string[] = [];

    if (customQuery && customQuery.trim()) {
      queries = [customQuery.trim()];
    } else {
      const v = (venueName || '').trim();
      const a = (address || '').trim();
      const c = (cityName || '').trim();
      const s = (stateName || '').trim();

      // Tier 1: Venue + Address + City + State
      if (v && a && c) queries.push(`${v}, ${a}, ${c}, ${s}`);
      // Tier 2: Venue + City + State
      if (v && c) queries.push(`${v}, ${c}, ${s}`);
      // Tier 3: Venue + City
      if (v && c) queries.push(`${v}, ${c}`);
      // Tier 4: Address + City
      if (a && c) queries.push(`${a}, ${c}, ${s}`);
      // Tier 5: Just Venue
      if (v) queries.push(v);
      // Tier 6: City + State
      if (c) queries.push(`${c}, ${s}`);
      // Tier 7: Just City
      if (c) queries.push(c);
    }

    const uniqueQueries = Array.from(
      new Set(queries.map((q) => q.replace(/,\s*,/g, ',').replace(/(^,\s*|,\s*$)/g, '').trim()))
    ).filter((q) => q.length > 2);

    if (uniqueQueries.length === 0) return;

    try {
      setIsGeocoding(true);

      for (const q of uniqueQueries) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              q
            )}&limit=1&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en' },
            }
          );
          if (!res.ok) continue;
          const results = await res.json();
          if (results && results.length > 0) {
            const first = results[0];
            const newLat = parseFloat(first.lat);
            const newLng = parseFloat(first.lon);

            // Determine optimal zoom level based on result specificity
            let targetZoom = 16;
            if (first.type === 'administrative' || first.class === 'boundary') {
              targetZoom = 12;
            } else if (first.type === 'city' || first.type === 'town') {
              targetZoom = 13;
            } else if (first.type === 'suburb' || first.type === 'neighbourhood') {
              targetZoom = 15;
            } else {
              targetZoom = 16; // building / specific venue
            }

            if (mapInstanceRef.current && markerRef.current) {
              markerRef.current.setLatLng([newLat, newLng]);
              mapInstanceRef.current.flyTo([newLat, newLng], targetZoom, {
                duration: 1.2,
              });
            }

            setCurrentCoords([newLat, newLng]);
            onChangeCoordinates?.(newLat, newLng);

            const displaySnippet = first.display_name.split(',').slice(0, 3).join(',');
            setSyncStatusMessage(`📍 Map centered on: ${displaySnippet}`);
            setTimeout(() => setSyncStatusMessage(null), 5000);
            return;
          }
        } catch (subErr) {
          console.warn('Geocoding query attempt failed:', q, subErr);
        }
      }

      if (isManual) {
        setSyncStatusMessage('Location not found automatically. You can click on the map to drop the pin.');
        setTimeout(() => setSyncStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Automatic debounced geocoding as user types in Venue Name, City, Address, or State
  useEffect(() => {
    if (readOnly) return;
    // If the user has manually dropped or dragged a pin on the map, do NOT auto-override it with typed address geocoding!
    if (manualPinPlacedRef.current) return;

    const combined = [venueName, address, cityName, stateName]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(', ');

    if (!combined || combined.length < 3) return;
    if (combined === lastAutoGeocodedRef.current) return;

    // Debounce 900ms after user pauses typing
    const timer = setTimeout(() => {
      if (manualPinPlacedRef.current) return;
      lastAutoGeocodedRef.current = combined;
      handleGeocodeSearch(undefined, false);
    }, 900);

    return () => clearTimeout(timer);
  }, [venueName, cityName, address, stateName, readOnly]);

  const handleSyncAddressConfirmed = () => {
    if (pendingSyncLocation && onSyncAddress) {
      lastAutoGeocodedRef.current = 'MANUAL_PIN';
      manualPinPlacedRef.current = true;
      onSyncAddress({
        address: pendingSyncLocation.displayName,
        city: pendingSyncLocation.city,
        state: pendingSyncLocation.state,
      });
      setSyncStatusMessage('Address updated from pin location.');
      setPendingSyncLocation(null);
      setTimeout(() => setSyncStatusMessage(null), 3000);
    }
  };

  const handleKeepSeparated = () => {
    lastAutoGeocodedRef.current = 'MANUAL_PIN';
    manualPinPlacedRef.current = true;
    setPendingSyncLocation(null);
    setSyncStatusMessage('Custom pin location saved. Typed address preserved.');
    setTimeout(() => setSyncStatusMessage(null), 3000);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    manualPinPlacedRef.current = false;
    handleGeocodeSearch(searchQuery, true);
  };

  const googleDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${currentCoords[0]},${currentCoords[1]}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header bar with title, quick search box, and action buttons */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span className="font-mono">
                Lat: {currentCoords[0].toFixed(4)}, Lng: {currentCoords[1].toFixed(4)}
              </span>
              {!readOnly && (
                <span className="text-purple-600 dark:text-purple-400 font-semibold hidden sm:inline">
                  • Click map or drag pin to position
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Tools: Direct Map Search + Directions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {!readOnly && (
            <form onSubmit={handleManualSearchSubmit} className="flex items-center gap-1.5 flex-1 sm:w-64">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search venue or city..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isGeocoding || !searchQuery.trim()}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Search this place on the map"
              >
                {isGeocoding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
              </button>
            </form>
          )}

          {!readOnly && (venueName || cityName) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGeocodeSearch(undefined, true)}
              disabled={isGeocoding}
              leftIcon={
                isGeocoding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5 text-purple-600" />
                )
              }
              className="text-xs bg-white dark:bg-slate-800 shrink-0"
              title="Locate based on typed Venue, City, and Address fields"
            >
              {isGeocoding ? 'Locating...' : 'Sync Map'}
            </Button>
          )}

          <a
            href={googleDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold transition-colors shrink-0"
            title="Open in Google Maps Navigation"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-600" />
            <span>Directions</span>
          </a>
        </div>
      </div>

      {/* Sync vs Keep Separated Interactive Prompt Banner */}
      {pendingSyncLocation && !readOnly && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">Pin moved to new location!</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300">
                Detected: {pendingSyncLocation.displayName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAddressConfirmed}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sync Address from Pin</span>
            </button>
            <button
              type="button"
              onClick={handleKeepSeparated}
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-amber-300 hover:bg-amber-100/50 text-amber-900 dark:text-amber-100 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Keep Separated
            </button>
          </div>
        </div>
      )}

      {/* Status notification */}
      {syncStatusMessage && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{syncStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMessage(null)}
            className="underline text-[11px] hover:opacity-75 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div className={`w-full ${heightClass} relative z-0`}>
        <div
          ref={mapContainerRef}
          className={`w-full h-full ${!readOnly ? 'cursor-crosshair' : ''}`}
        />
      </div>
    </div>
  );
};
