import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Search, Check, RefreshCw, Layers, Compass } from 'lucide-react';
import { Button } from './Button';

export interface InteractivePinMapProps {
  latitude?: number;
  longitude?: number;
  venueName?: string;
  cityName?: string;
  address?: string;
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
  readOnly = false,
  onChangeCoordinates,
  onSyncAddress,
  heightClass = 'h-72',
  title = 'Interactive Venue Location & Pin Selection',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([latitude, longitude]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [pendingSyncLocation, setPendingSyncLocation] = useState<{
    displayName: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Modern SVG Pin Icon
  const createPinIcon = () =>
    L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer select-none">
          <div class="w-9 h-9 bg-purple-600 rounded-full shadow-xl border-2 border-white flex items-center justify-center text-white transform hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2 h-2 bg-purple-800 rotate-45"></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
    });

  // Reverse geocode coords to check address
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

      // OpenStreetMap Tiles (free, high performance, no API keys needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Marker
      const marker = L.marker(currentCoords, {
        icon: createPinIcon(),
        draggable: !readOnly,
      }).addTo(map);

      markerRef.current = marker;

      // Handle Pin Drag
      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          setCurrentCoords([newLat, newLng]);
          onChangeCoordinates?.(newLat, newLng);
          fetchAddressFromCoords(newLat, newLng);
        });

        // Handle Map Click (click to drop pin)
        map.on('click', (e: L.LeafletMouseEvent) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setCurrentCoords([newLat, newLng]);
          onChangeCoordinates?.(newLat, newLng);
          fetchAddressFromCoords(newLat, newLng);
        });
      }

      mapInstanceRef.current = map;

      // Invalidate size on initial mount
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
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

  // Search / Locate from typed venue & city
  const handleLocateTypedVenue = async () => {
    const query = [venueName, cityName, address].filter(Boolean).join(', ');
    if (!query.trim()) return;

    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const first = results[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng], 15);
        }

        setCurrentCoords([newLat, newLng]);
        onChangeCoordinates?.(newLat, newLng);
        setSyncStatusMessage(`Pin placed at: ${first.display_name.slice(0, 50)}...`);
        setTimeout(() => setSyncStatusMessage(null), 4000);
      } else {
        setSyncStatusMessage('Venue not found automatically. You can click on the map to set the pin.');
        setTimeout(() => setSyncStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSyncAddressConfirmed = () => {
    if (pendingSyncLocation && onSyncAddress) {
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
    setPendingSyncLocation(null);
    setSyncStatusMessage('Custom pin location saved. Typed address preserved.');
    setTimeout(() => setSyncStatusMessage(null), 3000);
  };

  const googleDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${currentCoords[0]},${currentCoords[1]}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header bar */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
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
                <span className="text-purple-600 font-semibold">• Click map or drag pin to position</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (venueName || cityName) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLocateTypedVenue}
              disabled={isGeocoding}
              leftIcon={
                isGeocoding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                )
              }
              className="text-xs bg-white dark:bg-slate-800"
            >
              {isGeocoding ? 'Locating...' : 'Locate Venue on Map'}
            </Button>
          )}

          <a
            href={googleDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold transition-colors"
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
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sync Address from Pin</span>
            </button>
            <button
              type="button"
              onClick={handleKeepSeparated}
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-amber-300 hover:bg-amber-100/50 text-amber-900 dark:text-amber-100 rounded-md text-xs font-semibold transition-colors"
            >
              Keep Separated
            </button>
          </div>
        </div>
      )}

      {/* Status notification */}
      {syncStatusMessage && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold flex items-center justify-between">
          <span>{syncStatusMessage}</span>
          <button
            type="button"
            onClick={() => setSyncStatusMessage(null)}
            className="underline text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div className={`w-full ${heightClass} relative z-0`}>
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
