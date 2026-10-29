import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  ExternalLink,
  Search,
  X,
  Crosshair,
  Building2,
  MapPin,
  Plus,
  Minus,
} from 'lucide-react';
import {
  findPresetByText,
  searchCuratedVenuesAndHalls,
  findNearbyExhibitionVenue,
  SearchResultItem,
} from '../../data/exhibitionVenues';

export interface InteractivePinMapProps {
  latitude?: number;
  longitude?: number;
  venueName?: string;
  cityName?: string;
  address?: string;
  stateName?: string;
  readOnly?: boolean;
  onChangeCoordinates?: (lat: number, lng: number) => void;
  onSyncAddress?: (addressData: {
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
  }) => void;
  heightClass?: string;
  title?: string;
}

// Major Indian cities coordinates for initial map centering
const CITY_COORDINATES: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  coimbatore: [11.0168, 76.9558],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  chandigarh: [30.7333, 76.7794],
  kochi: [9.9312, 76.2673],
  cochin: [9.9312, 76.2673],
  indore: [22.7196, 75.8577],
  goa: [15.2993, 74.124],
  surat: [21.1702, 72.8311],
  nagpur: [21.1458, 79.0882],
  noida: [28.5355, 77.391],
  'greater noida': [28.4744, 77.504],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  visakhapatnam: [17.6868, 83.2185],
  bhopal: [23.2599, 77.4126],
  patna: [25.5941, 85.1376],
  vadodara: [22.3072, 73.1812],
  ghaziabad: [28.6692, 77.4538],
  ludhiana: [30.901, 75.8573],
  agra: [27.1767, 78.0081],
  nashik: [19.9975, 73.7898],
  varanasi: [25.3176, 82.9739],
  amritsar: [31.634, 74.8723],
  rajkot: [22.3039, 70.8022],
  mysore: [12.2958, 76.6394],
  mysuru: [12.2958, 76.6394],
  madurai: [9.9252, 78.1198],
  tiruchirappalli: [10.7905, 78.7047],
  salem: [11.6643, 78.146],
};

const createGoogleMapsPinIcon = (venueLabel?: string) => {
  const safeLabel = venueLabel ? venueLabel.replace(/[<>&"]/g, '') : '';
  return L.divIcon({
    className: 'interactive-google-pin',
    html: `
      <div style="position: relative; transform: translate(-50%, -100%); pointer-events: none; display: flex; flex-direction: column; align-items: center;">
        ${
          safeLabel
            ? `
          <div style="
            background: #1e293b;
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          ">
            ${safeLabel}
          </div>
        `
            : ''
        }
        <div style="position: relative; cursor: pointer; pointer-events: auto;">
          <svg width="32" height="42" viewBox="0 0 384 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z" fill="#EA4335"/>
            <circle cx="192" cy="192" r="76" fill="#FFFFFF"/>
            <circle cx="192" cy="192" r="42" fill="#B31412"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

type GoogleMapType = 'roadmap' | 'satellite';

const GOOGLE_TILE_LAYERS: Record<GoogleMapType, { url: string; subdomains: string[]; name: string; maxZoom: number; minZoom: number }> = {
  roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    name: 'Map',
    minZoom: 3,
    maxZoom: 20,
  },
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    name: 'Satellite',
    minZoom: 3,
    maxZoom: 20,
  },
};

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
  title = 'Venue Location',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Keep stable refs to parent callbacks to avoid unnecessary effect triggers
  const onChangeCoordinatesRef = useRef(onChangeCoordinates);
  onChangeCoordinatesRef.current = onChangeCoordinates;
  const onSyncAddressRef = useRef(onSyncAddress);
  onSyncAddressRef.current = onSyncAddress;

  // Track previous inputs to only react when user actually types a new value
  const prevVenueInputRef = useRef<string>(venueName);
  const prevCityInputRef = useRef<string>(cityName);
  const isMapInitiatedChangeRef = useRef<boolean>(false);

  // Search states
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Map layer
  const [mapType, setMapType] = useState<GoogleMapType>('roadmap');

  // Local coordinates
  const [currentCoords, setCurrentCoords] = useState<{ lat?: number; lng?: number }>({
    lat: latitude,
    lng: longitude,
  });

  // Close search dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Initial center calculation
  const initialCenter = useMemo<[number, number]>(() => {
    if (latitude && longitude) {
      return [latitude, longitude];
    }
    const cleanCity = cityName?.toLowerCase().trim();
    if (cleanCity && CITY_COORDINATES[cleanCity]) {
      return CITY_COORDINATES[cleanCity];
    }
    return [11.0168, 76.9558]; // Coimbatore default or Mumbai
  }, [latitude, longitude, cityName]);

  // Marker helper
  const updateMarkerPosition = useCallback(
    (lat: number, lng: number, label?: string) => {
      if (!mapInstanceRef.current) return;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(createGoogleMapsPinIcon(label || venueName));
      } else {
        const marker = L.marker([lat, lng], {
          icon: createGoogleMapsPinIcon(label || venueName),
          draggable: !readOnly,
        }).addTo(mapInstanceRef.current);

        if (!readOnly) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setCurrentCoords({ lat: pos.lat, lng: pos.lng });
            reverseGeocode(pos.lat, pos.lng);
          });
        }

        markerRef.current = marker;
      }
    },
    [readOnly, venueName]
  );

  // Reverse geocode when pin is placed by clicking map (does NOT change map zoom or center)
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      isMapInitiatedChangeRef.current = true;
      const nearbyPreset = findNearbyExhibitionVenue(lat, lng);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (!res.ok) throw new Error('Geocoding service unavailable');
        const data = await res.json();
        const addr = data.address || {};

        const detectedCentreName =
          nearbyPreset?.name ||
          data.name ||
          addr.amenity ||
          addr.building ||
          addr.exhibition_centre ||
          addr.convention_center ||
          addr.commercial ||
          addr.suburb ||
          addr.road ||
          addr.city ||
          'Selected Venue';

        const detectedCity =
          nearbyPreset?.city ||
          addr.city ||
          addr.town ||
          cityName ||
          '';

        const detectedState = nearbyPreset?.state || addr.state || stateName || '';

        const addrParts: string[] = [];
        if (nearbyPreset?.address) {
          addrParts.push(nearbyPreset.address);
        } else {
          if (addr.road && addr.road !== detectedCentreName) addrParts.push(addr.road);
          if (addr.suburb && addr.suburb !== detectedCentreName) addrParts.push(addr.suburb);
          if (addr.city && addr.city !== detectedCity) addrParts.push(addr.city);
        }

        const detectedFullAddress = addrParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || detectedCentreName;

        prevVenueInputRef.current = detectedCentreName;
        prevCityInputRef.current = detectedCity;

        if (onSyncAddressRef.current && !readOnly) {
          onSyncAddressRef.current({
            venue: detectedCentreName,
            address: detectedFullAddress,
            city: detectedCity,
            state: detectedState,
          });
        }

        if (onChangeCoordinatesRef.current && !readOnly) {
          onChangeCoordinatesRef.current(lat, lng);
        }
      } catch (err) {
        if (nearbyPreset && onSyncAddressRef.current && !readOnly) {
          onSyncAddressRef.current({
            venue: nearbyPreset.name,
            address: nearbyPreset.address,
            city: nearbyPreset.city,
            state: nearbyPreset.state,
          });
        }

        if (onChangeCoordinatesRef.current && !readOnly) {
          onChangeCoordinatesRef.current(lat, lng);
        }
      } finally {
        setTimeout(() => {
          isMapInitiatedChangeRef.current = false;
        }, 500);
      }
    },
    [readOnly, cityName, stateName]
  );

  // Initialize Map with full zooming and panning enabled
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startCenter: [number, number] =
      latitude && longitude ? [latitude, longitude] : initialCenter;

    const map = L.map(mapContainerRef.current, {
      center: startCenter,
      zoom: latitude && longitude ? 16 : 13,
      minZoom: 3,
      maxZoom: 20,
      zoomControl: false, // We render clean zoom buttons in header
      scrollWheelZoom: true, // Allow mousewheel zoom
      dragging: true, // Allow panning/moving map
      doubleClickZoom: true,
      boxZoom: true,
      touchZoom: true,
      keyboard: true,
    });

    const activeLayerConfig = GOOGLE_TILE_LAYERS[mapType];
    const tiles = L.tileLayer(activeLayerConfig.url, {
      subdomains: activeLayerConfig.subdomains,
      minZoom: activeLayerConfig.minZoom,
      maxZoom: activeLayerConfig.maxZoom,
      attribution: '&copy; Google Maps',
    }).addTo(map);
    tileLayerRef.current = tiles;

    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], {
        icon: createGoogleMapsPinIcon(venueName),
        draggable: !readOnly,
      }).addTo(map);

      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setCurrentCoords({ lat: pos.lat, lng: pos.lng });
          reverseGeocode(pos.lat, pos.lng);
        });
      }

      markerRef.current = marker;
    }

    // Direct click anywhere on map drops pin (DOES NOT reset map zoom or camera)
    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCurrentCoords({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          markerRef.current.setIcon(createGoogleMapsPinIcon(venueName));
        } else {
          const marker = L.marker([lat, lng], {
            icon: createGoogleMapsPinIcon(venueName),
            draggable: true,
          }).addTo(map);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setCurrentCoords({ lat: pos.lat, lng: pos.lng });
            reverseGeocode(pos.lat, pos.lng);
          });

          markerRef.current = marker;
        }

        reverseGeocode(lat, lng);
      });
    }

    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change Google layer (Roadmap vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const activeLayerConfig = GOOGLE_TILE_LAYERS[mapType];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTiles = L.tileLayer(activeLayerConfig.url, {
      subdomains: activeLayerConfig.subdomains,
      minZoom: activeLayerConfig.minZoom,
      maxZoom: activeLayerConfig.maxZoom,
      attribution: '&copy; Google Maps',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTiles;
  }, [mapType]);

  // Update marker position and label when coords change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (currentCoords.lat && currentCoords.lng) {
      updateMarkerPosition(currentCoords.lat, currentCoords.lng, venueName);
    }
  }, [currentCoords.lat, currentCoords.lng, venueName, updateMarkerPosition]);

  // ONLY move the map when the user genuinely changes venueName or cityName in the form inputs
  useEffect(() => {
    // If the change came from the map click/pin, do NOT snap or reset the camera!
    if (isMapInitiatedChangeRef.current) {
      prevVenueInputRef.current = venueName;
      prevCityInputRef.current = cityName;
      return;
    }

    // If venueName and cityName did not change, DO NOT touch the map camera!
    const venueChanged = venueName !== prevVenueInputRef.current;
    const cityChanged = cityName !== prevCityInputRef.current;

    prevVenueInputRef.current = venueName;
    prevCityInputRef.current = cityName;

    if (!venueChanged && !cityChanged) {
      return;
    }

    const cleanVenue = venueName?.trim() || '';
    const cleanCity = cityName?.trim() || '';

    if (!cleanVenue && !cleanCity) return;

    // Check curated preset (e.g. "codisa", "codissia", "bec", "biec")
    if (cleanVenue && cleanVenue.length >= 2) {
      const matchedPreset = findPresetByText(cleanVenue);
      if (matchedPreset) {
        const { lat, lng, name, city: pCity, state: pState, address: pAddr } = matchedPreset;
        setCurrentCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        updateMarkerPosition(lat, lng, cleanVenue || name);
        if (onChangeCoordinatesRef.current && !readOnly) {
          onChangeCoordinatesRef.current(lat, lng);
        }

        if (onSyncAddressRef.current && !readOnly && (!cleanCity || cleanCity.toLowerCase() !== pCity.toLowerCase())) {
          onSyncAddressRef.current({
            venue: cleanVenue,
            address: address || pAddr,
            city: pCity,
            state: pState,
          });
        }
        return;
      }
    }

    // If only city changed
    if (!cleanVenue && cleanCity) {
      const cityKey = cleanCity.toLowerCase();
      if (CITY_COORDINATES[cityKey]) {
        const [cLat, cLng] = CITY_COORDINATES[cityKey];
        setCurrentCoords({ lat: cLat, lng: cLng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([cLat, cLng], 13);
        }
        updateMarkerPosition(cLat, cLng, cleanCity);
        if (onChangeCoordinatesRef.current && !readOnly) {
          onChangeCoordinatesRef.current(cLat, cLng);
        }
        return;
      }
    }

    // Forward geocode lookup
    const fullQuery = [cleanVenue, cleanCity].filter(Boolean).join(', ');
    if (fullQuery.length < 3) return;

    const timer = setTimeout(async () => {
      try {
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(fullQuery)}&limit=1`);
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          const feat = photonData.features?.[0];
          if (feat && feat.geometry?.coordinates) {
            const [fLng, fLat] = feat.geometry.coordinates;
            setCurrentCoords({ lat: fLat, lng: fLng });
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([fLat, fLng], 16);
            }
            updateMarkerPosition(fLat, fLng, cleanVenue || feat.properties?.name || cleanCity);
            if (onChangeCoordinatesRef.current && !readOnly) {
              onChangeCoordinatesRef.current(fLat, fLng);
            }
          }
        }
      } catch (err) {
        // silent
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [venueName, cityName, address, readOnly, updateMarkerPosition]);

  // In-map search suggestions
  useEffect(() => {
    const q = searchInput.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    const curatedMatches = searchCuratedVenuesAndHalls(q, cityName);
    if (curatedMatches.length > 0) {
      setSearchResults(curatedMatches);
      setShowDropdown(true);
    }

    const timer = setTimeout(async () => {
      try {
        const combinedResults: SearchResultItem[] = [...curatedMatches];
        const seenIds = new Set(curatedMatches.map((m) => m.id));

        const photonQuery = cityName ? `${q}, ${cityName}` : q;
        const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=5`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.features) {
            for (const f of pData.features) {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates;
              if (!coords || coords.length < 2) continue;
              const fLng = coords[0];
              const fLat = coords[1];
              const fTitle = props.name || props.street || q;
              const fCity = props.city || props.county || cityName || '';
              const fState = props.state || stateName || '';
              const fAddress = [props.street, props.district, props.city].filter(Boolean).join(', ');

              const itemKey = `${fTitle}_${fLat.toFixed(3)}_${fLng.toFixed(3)}`;
              if (!seenIds.has(itemKey)) {
                seenIds.add(itemKey);
                combinedResults.push({
                  id: itemKey,
                  title: fTitle,
                  subtitle: [fAddress, fCity, fState].filter(Boolean).join(' • '),
                  category: props.osm_value || 'Landmark',
                  badge: 'Place',
                  lat: fLat,
                  lng: fLng,
                  venueName: fTitle,
                  address: fAddress || `${fTitle}, ${fCity}`,
                  city: fCity,
                  state: fState,
                  isCurated: false,
                });
              }
            }
          }
        }

        setSearchResults(combinedResults);
        if (combinedResults.length > 0) {
          setShowDropdown(true);
        }
      } catch (err) {
        // silent
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchInput, cityName, stateName]);

  // Select search result
  const handleSelectSearchResult = (item: SearchResultItem) => {
    const { lat, lng, venueName: vName, address: vAddr, city: vCity, state: vState } = item;

    setCurrentCoords({ lat, lng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }

    updateMarkerPosition(lat, lng, vName);

    prevVenueInputRef.current = vName;
    prevCityInputRef.current = vCity;

    if (onSyncAddressRef.current && !readOnly) {
      onSyncAddressRef.current({
        venue: vName,
        address: vAddr,
        city: vCity,
        state: vState,
      });
    }

    if (onChangeCoordinatesRef.current && !readOnly) {
      onChangeCoordinatesRef.current(lat, lng);
    }

    setSearchInput('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Select on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectSearchResult(searchResults[0]);
      }
    }
  };

  // Dedicated zoom button handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Device GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        reverseGeocode(lat, lng);
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const googleDirectionsUrl = useMemo(() => {
    if (currentCoords.lat && currentCoords.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${currentCoords.lat},${currentCoords.lng}`;
    }
    const query = [venueName, address, cityName, stateName].filter(Boolean).join(', ');
    if (query) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    }
    return '';
  }, [currentCoords.lat, currentCoords.lng, venueName, address, cityName, stateName]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h4>
            {venueName && (
              <span className="text-xs text-red-600 dark:text-red-400 font-semibold truncate">
                • {venueName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Drag map to pan • Scroll to zoom in/out • Click anywhere to drop pin
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons (+ / -) */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-1 rounded font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-1 rounded font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Map Type Switcher */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                mapType === 'roadmap'
                  ? 'bg-white dark:bg-slate-900 text-red-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-white dark:bg-slate-900 text-red-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Satellite
            </button>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              title="Use current location"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-500" />
              <span>My Location</span>
            </button>
          )}

          {googleDirectionsUrl && (
            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              <Navigation className="w-3 h-3" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}
        </div>
      </div>

      {/* In-Map Search Bar */}
      {!readOnly && (
        <div ref={searchContainerRef} className="relative px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search venue or hall (e.g. 'codisa', 'codissia hall a', 'nesco', 'biec'). Press Enter to select"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[1000] max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-red-50 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                    {item.isCurated ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Canvas */}
      <div className={`w-full ${heightClass} relative bg-slate-100 dark:bg-slate-950 z-0`}>
        <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
};
