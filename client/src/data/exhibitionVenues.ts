export interface ExhibitionHall {
  id: string;
  name: string;
  category?: 'Hall' | 'Auditorium' | 'Open Grounds' | 'Convention Centre';
  description?: string;
  latOffset?: number; // small offset if hall is at specific point in complex
  lngOffset?: number;
}

export interface ExhibitionVenuePreset {
  id: string;
  name: string;
  shortName: string;
  aliases: string[];
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  halls?: ExhibitionHall[];
}

export const FAMOUS_EXHIBITION_VENUES: ExhibitionVenuePreset[] = [
  {
    id: 'codissia-coimbatore',
    name: 'CODISSIA Trade Fair Complex',
    shortName: 'CODISSIA',
    aliases: [
      'codissia',
      'codisa',
      'codissa',
      'codissia trade fair',
      'codisa trade fair',
      'codissia trade fair complex',
      'codisa trade fair complex',
      'codissia hall',
      'codisa hall',
      'codissa hall',
      'codissia complex',
      'codisa complex',
      'codissia coimbatore',
      'codisa coimbatore',
      'codissia g.d. naidu',
      'peelamedu codissia',
    ],
    lat: 11.0422285,
    lng: 77.0264632,
    address: 'GV Fair Grounds, Avinashi Road, Civil Aerodrome Post, Peelamedu',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641014',
    halls: [
      { id: 'codissia-hall-a', name: 'CODISSIA Hall A', category: 'Hall', description: 'Main Heavy Machinery & Industrial Hall' },
      { id: 'codissia-hall-b', name: 'CODISSIA Hall B', category: 'Hall', description: 'Engineering, Manufacturing & Auto Components Hall' },
      { id: 'codissia-hall-c', name: 'CODISSIA Hall C', category: 'Hall', description: 'Electrical, Electronics & Automation Hall' },
      { id: 'codissia-hall-d', name: 'CODISSIA Hall D', category: 'Hall', description: 'Textiles, Pumps & General Machinery Hall' },
      { id: 'codissia-hall-e', name: 'CODISSIA Hall E', category: 'Hall', description: 'Special Pavilions, B2B & Startup Hall' },
      { id: 'codissia-conf', name: 'CODISSIA Convention Hall', category: 'Convention Centre', description: 'Air-conditioned Conference & Seminar Auditorium' },
      { id: 'codissia-grounds', name: 'CODISSIA Open Exhibition Grounds', category: 'Open Grounds', description: 'Outdoor heavy machinery & demo area' },
    ],
  },
  {
    id: 'bec-mumbai',
    name: 'Bombay Exhibition Centre (NESCO)',
    shortName: 'BEC NESCO',
    aliases: [
      'bec',
      'nesco',
      'bombay exhibition centre',
      'bombay exhibition center',
      'nesco center',
      'nesco centre',
      'bec goregaon',
      'nesco complex',
      'nesco exhibition centre',
      'bombay expo',
    ],
    lat: 19.1501,
    lng: 72.8552,
    address: 'Nesco Complex, Off Western Express Highway, Goregaon East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400063',
    halls: [
      { id: 'bec-hall-1', name: 'Bombay Exhibition Centre - Hall 1', category: 'Hall', description: 'Hall 1 (Main Hall)' },
      { id: 'bec-hall-2', name: 'Bombay Exhibition Centre - Hall 2', category: 'Hall', description: 'Hall 2 (Central Pavilion)' },
      { id: 'bec-hall-3', name: 'Bombay Exhibition Centre - Hall 3', category: 'Hall', description: 'Hall 3' },
      { id: 'bec-hall-4', name: 'Bombay Exhibition Centre - Hall 4', category: 'Hall', description: 'Hall 4' },
      { id: 'bec-grande', name: 'Bombay Exhibition Centre - Grande Hall', category: 'Hall', description: 'Grande Hall' },
    ],
  },
  {
    id: 'jwcc-mumbai',
    name: 'Jio World Convention Centre',
    shortName: 'JWCC',
    aliases: [
      'jio world',
      'jwcc',
      'jio world convention centre',
      'jio convention centre',
      'jio convention',
      'bkc convention',
      'jio world bkc',
      'jio world garden',
    ],
    lat: 19.0654,
    lng: 72.8687,
    address: 'G Block, Bandra Kurla Complex, Bandra East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    halls: [
      { id: 'jwcc-pav-1', name: 'Jio World - Pavilion 1', category: 'Hall', description: 'Ground Level Exhibition Pavilion 1' },
      { id: 'jwcc-pav-2', name: 'Jio World - Pavilion 2', category: 'Hall', description: 'Exhibition Pavilion 2' },
      { id: 'jwcc-pav-3', name: 'Jio World - Pavilion 3', category: 'Hall', description: 'Exhibition Pavilion 3' },
      { id: 'jwcc-ballroom', name: 'Jio World - Grand Ballroom', category: 'Auditorium', description: 'Grand Ballroom & Conference Suites' },
    ],
  },
  {
    id: 'biec-bengaluru',
    name: 'Bangalore International Exhibition Centre (BIEC)',
    shortName: 'BIEC',
    aliases: [
      'biec',
      'biec bangalore',
      'biec bengaluru',
      'bangalore international exhibition centre',
      'bangalore international exhibition center',
      'tumkur road exhibition',
      'biec hall',
    ],
    lat: 13.0641,
    lng: 77.4727,
    address: '10th Mile, Tumkur Road, Madavara Post, Dasanapura Hobli',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '562123',
    halls: [
      { id: 'biec-hall-1', name: 'BIEC - Hall 1', category: 'Hall', description: 'Exhibition Hall 1' },
      { id: 'biec-hall-2', name: 'BIEC - Hall 2', category: 'Hall', description: 'Exhibition Hall 2' },
      { id: 'biec-hall-3', name: 'BIEC - Hall 3', category: 'Hall', description: 'Exhibition Hall 3' },
      { id: 'biec-hall-4', name: 'BIEC - Hall 4', category: 'Hall', description: 'Exhibition Hall 4' },
      { id: 'biec-hall-5', name: 'BIEC - Hall 5', category: 'Hall', description: 'Exhibition Hall 5' },
      { id: 'biec-conf', name: 'BIEC - Conference Centre', category: 'Convention Centre', description: 'Conference Centre & Meeting Rooms' },
    ],
  },
  {
    id: 'pragati-maidan-delhi',
    name: 'Bharat Mandapam & Pragati Maidan (ITPO)',
    shortName: 'Bharat Mandapam',
    aliases: [
      'pragati maidan',
      'bharat mandapam',
      'itpo',
      'pragati maidan delhi',
      'bharat mandapam delhi',
      'itpo pragati maidan',
      'delhi exhibition centre',
    ],
    lat: 28.6186,
    lng: 77.2407,
    address: 'Bharat Mandapam, Pragati Maidan, Mathura Road',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    halls: [
      { id: 'bm-plenary', name: 'Bharat Mandapam - Plenary Hall', category: 'Auditorium', description: 'Plenary Hall (G20 Summit venue)' },
      { id: 'pm-hall-1', name: 'Pragati Maidan - Hall 1', category: 'Hall', description: 'Hall 1 (New Complex)' },
      { id: 'pm-hall-2', name: 'Pragati Maidan - Hall 2', category: 'Hall', description: 'Hall 2' },
      { id: 'pm-hall-3', name: 'Pragati Maidan - Hall 3', category: 'Hall', description: 'Hall 3' },
      { id: 'pm-hall-4', name: 'Pragati Maidan - Hall 4', category: 'Hall', description: 'Hall 4' },
      { id: 'pm-hall-5', name: 'Pragati Maidan - Hall 5', category: 'Hall', description: 'Hall 5' },
      { id: 'pm-hall-14', name: 'Pragati Maidan - Hall 14', category: 'Hall', description: 'Hall 14' },
    ],
  },
  {
    id: 'yashobhoomi-delhi',
    name: 'Yashobhoomi (IICC Dwarka)',
    shortName: 'Yashobhoomi',
    aliases: [
      'yashobhoomi',
      'yashobhumi',
      'iicc',
      'iicc dwarka',
      'yashobhoomi dwarka',
      'india international convention and expo centre',
      'dwarka convention centre',
    ],
    lat: 28.5529,
    lng: 77.0163,
    address: 'Sector 25, Dwarka',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110077',
    halls: [
      { id: 'yb-hall-1', name: 'Yashobhoomi - Exhibition Hall 1', category: 'Hall', description: 'Exhibition Hall 1' },
      { id: 'yb-hall-2', name: 'Yashobhoomi - Exhibition Hall 2', category: 'Hall', description: 'Exhibition Hall 2' },
      { id: 'yb-ballroom', name: 'Yashobhoomi - Grand Ballroom', category: 'Auditorium', description: 'Main Convention & Ballroom' },
    ],
  },
  {
    id: 'india-expo-mart-noida',
    name: 'India Expo Centre & Mart',
    shortName: 'India Expo Mart',
    aliases: [
      'india expo centre',
      'india expo mart',
      'ieml',
      'greater noida expo',
      'greater noida expo mart',
      'knowledge park expo',
    ],
    lat: 28.4608,
    lng: 77.4988,
    address: 'Plot No. 23-25 & 27-29, Knowledge Park II',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    pincode: '201306',
    halls: [
      { id: 'ieml-hall-1', name: 'India Expo Centre - Hall 1', category: 'Hall', description: 'Exhibition Hall 1' },
      { id: 'ieml-hall-3', name: 'India Expo Centre - Hall 3', category: 'Hall', description: 'Exhibition Hall 3' },
      { id: 'ieml-hall-5', name: 'India Expo Centre - Hall 5', category: 'Hall', description: 'Exhibition Hall 5' },
      { id: 'ieml-hall-7', name: 'India Expo Centre - Hall 7', category: 'Hall', description: 'Exhibition Hall 7' },
    ],
  },
  {
    id: 'hitex-hyderabad',
    name: 'Hitex Exhibition Center',
    shortName: 'HITEX',
    aliases: [
      'hitex',
      'hitex hyderabad',
      'hitex exhibition center',
      'hitex exhibition centre',
      'hitec city exhibition',
      'madhapur expo',
      'hicc hitex',
    ],
    lat: 17.4724,
    lng: 78.3752,
    address: 'Trade Fair Office Building, IZZAT Nagar, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500084',
    halls: [
      { id: 'hitex-hall-1', name: 'Hitex Exhibition Center - Hall 1', category: 'Hall', description: 'Hall 1' },
      { id: 'hitex-hall-2', name: 'Hitex Exhibition Center - Hall 2', category: 'Hall', description: 'Hall 2' },
      { id: 'hitex-hall-3', name: 'Hitex Exhibition Center - Hall 3', category: 'Hall', description: 'Hall 3' },
      { id: 'hitex-hall-4', name: 'Hitex Exhibition Center - Hall 4', category: 'Hall', description: 'Hall 4' },
      { id: 'hitex-open', name: 'Hitex Open Arena Grounds', category: 'Open Grounds', description: 'Outdoor Exhibition Grounds' },
    ],
  },
  {
    id: 'chennai-trade-centre',
    name: 'Chennai Trade Centre (CTC)',
    shortName: 'CTC Chennai',
    aliases: [
      'chennai trade centre',
      'chennai trade center',
      'ctc',
      'ctc chennai',
      'nandambakkam trade centre',
      'chennai trade fair ground',
    ],
    lat: 13.0152,
    lng: 80.1906,
    address: 'CTC Complex, Mount Poonamallee Road, Nandambakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600089',
    halls: [
      { id: 'ctc-hall-1', name: 'Chennai Trade Centre - Hall 1', category: 'Hall', description: 'Exhibition Hall 1' },
      { id: 'ctc-hall-2', name: 'Chennai Trade Centre - Hall 2', category: 'Hall', description: 'Exhibition Hall 2' },
      { id: 'ctc-hall-3', name: 'Chennai Trade Centre - Hall 3', category: 'Hall', description: 'Exhibition Hall 3' },
      { id: 'ctc-convention', name: 'Chennai Trade Centre - Convention Hall', category: 'Convention Centre', description: 'Air-conditioned Convention Hall' },
    ],
  },
  {
    id: 'mahatma-mandir-gandhinagar',
    name: 'Mahatma Mandir Convention and Exhibition Centre',
    shortName: 'Mahatma Mandir',
    aliases: [
      'mahatma mandir',
      'mahatma mandir gandhinagar',
      'gandhinagar convention centre',
      'vibrant gujarat venue',
    ],
    lat: 23.2156,
    lng: 72.6369,
    address: 'Sector 13C, Gandhinagar',
    city: 'Gandhinagar',
    state: 'Gujarat',
    pincode: '382016',
    halls: [
      { id: 'mm-hall-1', name: 'Mahatma Mandir - Exhibition Hall 1', category: 'Hall', description: 'Exhibition Hall 1' },
      { id: 'mm-hall-2', name: 'Mahatma Mandir - Exhibition Hall 2', category: 'Hall', description: 'Exhibition Hall 2' },
      { id: 'mm-convention', name: 'Mahatma Mandir - Main Convention Hall', category: 'Convention Centre', description: 'Main Convention Hall' },
    ],
  },
  {
    id: 'biswa-bangla-kolkata',
    name: 'Biswa Bangla Mela Prangan',
    shortName: 'Biswa Bangla',
    aliases: [
      'biswa bangla',
      'mela prangan',
      'biswa bangla mela prangan',
      'kolkata trade fair ground',
      'milan mela',
      'science city exhibition ground',
    ],
    lat: 22.5441,
    lng: 88.3976,
    address: 'JBS Haldane Avenue, Science City Area',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700046',
    halls: [
      { id: 'bb-pavilion-a', name: 'Biswa Bangla - Pavilion A', category: 'Hall', description: 'Pavilion A' },
      { id: 'bb-pavilion-b', name: 'Biswa Bangla - Pavilion B', category: 'Hall', description: 'Pavilion B' },
      { id: 'bb-open', name: 'Biswa Bangla Open Grounds', category: 'Open Grounds', description: 'Open Fair Grounds' },
    ],
  },
  {
    id: 'auto-cluster-pune',
    name: 'Auto Cluster Exhibition Center',
    shortName: 'Auto Cluster',
    aliases: [
      'auto cluster',
      'auto cluster pune',
      'auto cluster exhibition center',
      'auto cluster chinchwad',
      'pune exhibition centre',
    ],
    lat: 18.6471,
    lng: 73.8058,
    address: 'H-Block, Chinchwad East, Old Mumbai-Pune Highway',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411019',
    halls: [
      { id: 'ac-hall-a', name: 'Auto Cluster - Hall A', category: 'Hall', description: 'Main Exhibition Hall' },
      { id: 'ac-hall-b', name: 'Auto Cluster - Hall B', category: 'Hall', description: 'Secondary Pavilion' },
      { id: 'ac-auditorium', name: 'Auto Cluster Auditorium', category: 'Auditorium', description: 'Conference & Seminar Hall' },
    ],
  },
  {
    id: 'cidco-navi-mumbai',
    name: 'CIDCO Exhibition Centre',
    shortName: 'CIDCO Vashi',
    aliases: [
      'cidco',
      'cidco exhibition centre',
      'cidco vashi',
      'cidco navi mumbai',
      'vashi exhibition centre',
    ],
    lat: 19.0625,
    lng: 73.0033,
    address: 'Sector 30A, Vashi, Opposite Joyalukkas',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    pincode: '400703',
    halls: [
      { id: 'cidco-hall-1', name: 'CIDCO Exhibition - Hall 1', category: 'Hall', description: 'Hall 1' },
      { id: 'cidco-hall-2', name: 'CIDCO Exhibition - Hall 2', category: 'Hall', description: 'Hall 2' },
    ],
  },
];

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  lat: number;
  lng: number;
  venueName: string;
  address: string;
  city: string;
  state: string;
  isCurated: boolean;
}

// Normalize strings for typo-tolerant matching (e.g. "codisa" -> "codissia")
export const normalizeQuery = (q: string): string => {
  return q
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
};

// Check if query is an alias or typo for a known venue
export const findPresetByText = (text: string): ExhibitionVenuePreset | null => {
  if (!text || text.trim().length < 2) return null;
  const normalized = normalizeQuery(text);

  for (const venue of FAMOUS_EXHIBITION_VENUES) {
    if (normalizeQuery(venue.name).includes(normalized)) return venue;
    if (normalizeQuery(venue.shortName).includes(normalized)) return venue;
    for (const alias of venue.aliases) {
      const normAlias = normalizeQuery(alias);
      if (normAlias === normalized || normalized.startsWith(normAlias) || normAlias.startsWith(normalized)) {
        return venue;
      }
    }
  }
  return null;
};

// Search curated venues and halls based on user query
export const searchCuratedVenuesAndHalls = (query: string, cityName?: string): SearchResultItem[] => {
  if (!query || query.trim().length < 2) return [];
  const normalized = normalizeQuery(query);
  const results: SearchResultItem[] = [];

  const cleanCity = cityName ? normalizeQuery(cityName) : '';

  for (const venue of FAMOUS_EXHIBITION_VENUES) {
    const venueMatches =
      normalizeQuery(venue.name).includes(normalized) ||
      normalizeQuery(venue.shortName).includes(normalized) ||
      venue.aliases.some((a) => {
        const na = normalizeQuery(a);
        return na.includes(normalized) || normalized.includes(na);
      });

    const cityMatches = !cleanCity || normalizeQuery(venue.city).includes(cleanCity) || cleanCity.includes(normalizeQuery(venue.city));

    if (venueMatches) {
      // Add the main venue itself
      results.push({
        id: venue.id,
        title: venue.name,
        subtitle: `${venue.address}, ${venue.city}, ${venue.state}`,
        category: 'Exhibition Complex',
        badge: 'Premier Venue',
        lat: venue.lat,
        lng: venue.lng,
        venueName: venue.name,
        address: `${venue.address}, ${venue.city}${venue.pincode ? ' - ' + venue.pincode : ''}`,
        city: venue.city,
        state: venue.state,
        isCurated: true,
      });

      // Also add individual halls/pavilions!
      if (venue.halls && venue.halls.length > 0) {
        for (const hall of venue.halls) {
          results.push({
            id: hall.id,
            title: hall.name,
            subtitle: `${venue.name} • ${hall.description || venue.city}`,
            category: hall.category || 'Hall',
            badge: hall.category || 'Hall',
            lat: venue.lat + (hall.latOffset || 0),
            lng: venue.lng + (hall.lngOffset || 0),
            venueName: hall.name,
            address: `${venue.address}, ${venue.city}${venue.pincode ? ' - ' + venue.pincode : ''}`,
            city: venue.city,
            state: venue.state,
            isCurated: true,
          });
        }
      }
    } else if (venue.halls) {
      // Check if specific hall name matches
      for (const hall of venue.halls) {
        if (normalizeQuery(hall.name).includes(normalized)) {
          results.push({
            id: hall.id,
            title: hall.name,
            subtitle: `${venue.name} • ${venue.city}, ${venue.state}`,
            category: hall.category || 'Hall',
            badge: hall.category || 'Hall',
            lat: venue.lat + (hall.latOffset || 0),
            lng: venue.lng + (hall.lngOffset || 0),
            venueName: hall.name,
            address: `${venue.address}, ${venue.city}${venue.pincode ? ' - ' + venue.pincode : ''}`,
            city: venue.city,
            state: venue.state,
            isCurated: true,
          });
        }
      }
    }
  }

  // If city matches, prioritize results in that city
  if (cleanCity) {
    results.sort((a, b) => {
      const aInCity = normalizeQuery(a.city).includes(cleanCity) ? 0 : 1;
      const bInCity = normalizeQuery(b.city).includes(cleanCity) ? 0 : 1;
      return aInCity - bInCity;
    });
  }

  return results;
};

// Check if clicked coordinates are within an exhibition centre (~600m radius)
export const findNearbyExhibitionVenue = (lat: number, lng: number): ExhibitionVenuePreset | null => {
  for (const venue of FAMOUS_EXHIBITION_VENUES) {
    // approx distance calculation: 1 deg lat ~ 111 km
    const dLat = (lat - venue.lat) * 111000;
    const dLng = (lng - venue.lng) * 111000 * Math.cos((lat * Math.PI) / 180);
    const distMeters = Math.hypot(dLat, dLng);
    if (distMeters <= 700) {
      return venue;
    }
  }
  return null;
};
